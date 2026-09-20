import csv
import io
import json
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook, load_workbook

from database import db, clean, now_iso, write_audit
from security import require_roles, hash_password
from calc import recompute_collection_incentives
from storage import put_object

router = APIRouter(prefix="/data", tags=["data-management"])
admin_only = require_roles("Admin")

BACKUP_COLLECTIONS = [
    "users", "targets", "lending_achievement_details", "funding_achievement_details",
    "recovery_achievement_details", "incentive_settings", "collection_activity",
    "collection_activity_photos", "role_history", "user_management_requests", "audit_logs",
]

# jenis -> (collection, schema)
# schema field: (type, required)  type in: str,num,date,periode,int,bool,kol
IMPORT_SCHEMAS = {
    "pencapaian_pembiayaan": ("lending_achievement_details", {
        "nomor_kontrak": ("str", True), "jenis_akad": ("str", True), "nama_nasabah": ("str", True),
        "jumlah_pencairan": ("num", True), "tanggal_pencairan": ("date", True), "kode_marketing": ("str", True),
    }, ["AO Pembiayaan"]),
    "pencapaian_funding": ("funding_achievement_details", {
        "nama_nasabah": ("str", True), "jenis_simpanan": ("str", True),
        "jumlah_simpanan": ("num", True), "tanggal": ("date", True), "kode_marketing": ("str", True),
    }, ["AO Pembiayaan", "AO Funding"]),
    "recovery": ("recovery_achievement_details", {
        "nomor_kontrak": ("str", True), "nama_nasabah": ("str", True), "jumlah_recovery": ("num", True),
        "tanggal": ("date", True), "kolektibilitas": ("kol", True), "denda_dibayar_penuh": ("bool", False),
        "is_write_off": ("bool", False), "kode_marketing": ("str", True),
    }, ["Collection & Remedial", "AO Pembiayaan"]),
    "target": ("targets", {
        "kode_marketing": ("str", True), "periode": ("periode", True),
        "target_pencairan": ("num", False), "target_funding": ("num", False), "target_recovery": ("num", False),
    }, ["AO Pembiayaan", "AO Funding", "Collection & Remedial"]),
}


# ---------------- EXPORT ----------------
@router.get("/export/{jenis}")
async def export_data(jenis: str, periode: Optional[str] = None, user=Depends(admin_only)):
    mapping = {
        "pencapaian_pembiayaan": ("lending_achievement_details", ["nomor_kontrak", "jenis_akad", "nama_nasabah", "jumlah_pencairan", "tanggal_pencairan", "ao_id", "periode"]),
        "pencapaian_funding": ("funding_achievement_details", ["nama_nasabah", "jenis_simpanan", "jumlah_simpanan", "tanggal", "ao_id", "periode"]),
        "recovery": ("recovery_achievement_details", ["nomor_kontrak", "nama_nasabah", "jumlah_recovery", "tanggal", "kolektibilitas", "denda_dibayar_penuh", "is_write_off", "pic_id", "periode"]),
        "collection": ("collection_activity", ["nomor_kontrak", "nama_nasabah", "outstanding_pokok", "status_penagihan", "source", "status_kunjungan", "periode"]),
    }
    if jenis not in mapping:
        raise HTTPException(status_code=400, detail="Jenis export tidak dikenal")
    coll, cols = mapping[jenis]
    q = {"periode": periode} if periode else {}
    docs = await db[coll].find(q).to_list(10000)
    wb = Workbook()
    ws = wb.active
    ws.title = jenis[:30]
    ws.append(cols)
    for d in docs:
        ws.append([d.get(c) for c in cols])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    await write_audit(user, f"Export data: {jenis}")
    fname = f"{jenis}_{periode or 'all'}.xlsx"
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": f"attachment; filename={fname}"})


# ---------------- BACKUP ----------------
async def _dump_db(exclude_password=True):
    dump = {"created_at": now_iso(), "collections": {}}
    for coll in BACKUP_COLLECTIONS:
        docs = await db[coll].find().to_list(100000)
        cleaned = []
        for d in docs:
            c = dict(d)
            c["id"] = str(c.pop("_id"))
            if coll == "users" and exclude_password:
                c.pop("password_hash", None)
            cleaned.append(c)
        dump["collections"][coll] = cleaned
    return dump


@router.get("/backup")
async def backup(user=Depends(admin_only)):
    dump = await _dump_db(exclude_password=True)
    await write_audit(user, "Backup database")
    buf = io.BytesIO(json.dumps(dump, default=str, indent=2).encode("utf-8"))
    fname = f"ao360_backup_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
    return StreamingResponse(buf, media_type="application/json",
                             headers={"Content-Disposition": f"attachment; filename={fname}"})


# ---------------- IMPORT: parsing & validation ----------------
def _parse_upload(content: bytes, filename: str):
    name = (filename or "").lower()
    if name.endswith(".json"):
        data = json.loads(content)
        if not isinstance(data, list):
            raise HTTPException(status_code=400, detail="JSON harus berupa array objek")
        return data
    if name.endswith(".csv"):
        text = content.decode("utf-8-sig")
        return list(csv.DictReader(io.StringIO(text)))
    if name.endswith(".xlsx"):
        wb = load_workbook(io.BytesIO(content), read_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return []
        headers = [str(h).strip() if h is not None else "" for h in rows[0]]
        out = []
        for r in rows[1:]:
            if all(v is None for v in r):
                continue
            out.append({headers[i]: r[i] for i in range(len(headers)) if headers[i]})
        return out
    raise HTTPException(status_code=400, detail="Format tidak didukung. Gunakan .json, .csv, atau .xlsx")


def _coerce(field_type, raw):
    """Return (value, error_or_None)."""
    if raw is None or (isinstance(raw, str) and raw.strip() == ""):
        return None, "kosong"
    if field_type == "str":
        return str(raw).strip(), None
    if field_type in ("num", "int"):
        try:
            v = float(str(raw).replace(",", "").replace("Rp", "").strip())
            if v < 0:
                return None, "tidak boleh negatif"
            return (int(v) if field_type == "int" else v), None
        except Exception:
            return None, "bukan angka"
    if field_type == "kol":
        try:
            v = int(float(raw))
        except Exception:
            return None, "bukan angka"
        if v not in (3, 4, 5):
            return None, "harus 3, 4, atau 5"
        return v, None
    if field_type == "bool":
        s = str(raw).strip().lower()
        if s in ("true", "1", "ya", "yes", "y"):
            return True, None
        if s in ("false", "0", "tidak", "no", "n"):
            return False, None
        return None, "harus Ya/Tidak"
    if field_type == "date":
        s = str(raw).strip()[:10]
        try:
            datetime.strptime(s, "%Y-%m-%d")
            return s, None
        except Exception:
            return None, "format harus YYYY-MM-DD"
    if field_type == "periode":
        s = str(raw).strip()[:7]
        try:
            datetime.strptime(s, "%Y-%m")
            return s, None
        except Exception:
            return None, "format harus YYYY-MM"
    return raw, None


async def _validate_rows(jenis, rows):
    coll, schema, allowed_roles = IMPORT_SCHEMAS[jenis]
    users = {u["kode_marketing"]: u for u in await db.users.find().to_list(500)}
    result = []
    for i, raw in enumerate(rows):
        errors = []
        if not isinstance(raw, dict):
            result.append({"row": i + 1, "data": {"_": str(raw)}, "errors": ["Baris bukan objek"], "valid": False})
            continue
        norm = {k.strip(): v for k, v in raw.items()}
        clean_row = {}
        for field, (ftype, required) in schema.items():
            val, err = _coerce(ftype, norm.get(field))
            if err == "kosong":
                if required:
                    errors.append(f"{field}: wajib diisi")
                clean_row[field] = None
            elif err:
                errors.append(f"{field}: {err}")
            else:
                clean_row[field] = val
        # role resolution
        kode = clean_row.get("kode_marketing")
        if kode:
            u = users.get(str(kode))
            if not u:
                errors.append(f"kode_marketing: '{kode}' tidak terdaftar")
            elif u["jabatan"] not in allowed_roles:
                errors.append(f"kode_marketing: {u['jabatan']} tidak valid untuk {jenis}")
            else:
                clean_row["_resolved_user_id"] = str(u["_id"])
                clean_row["_nama_ao"] = u["nama"]
        result.append({"row": i + 1, "data": clean_row, "errors": errors, "valid": len(errors) == 0})
    return result


@router.post("/import-preview/{jenis}")
async def import_preview(jenis: str, file: UploadFile = File(...), user=Depends(admin_only)):
    if jenis not in IMPORT_SCHEMAS:
        raise HTTPException(status_code=400, detail="Jenis import tidak dikenal")
    content = await file.read()
    rows = _parse_upload(content, file.filename)
    if not rows:
        raise HTTPException(status_code=400, detail="File kosong / tidak ada baris data")
    validated = await _validate_rows(jenis, rows)
    valid = sum(1 for r in validated if r["valid"])
    return {
        "jenis": jenis, "filename": file.filename, "total": len(validated),
        "valid_count": valid, "error_count": len(validated) - valid,
        "columns": list(IMPORT_SCHEMAS[jenis][1].keys()),
        "rows": validated,
    }


@router.post("/import-commit/{jenis}")
async def import_commit(jenis: str, payload: dict, user=Depends(admin_only)):
    if jenis not in IMPORT_SCHEMAS:
        raise HTTPException(status_code=400, detail="Jenis import tidak dikenal")
    coll, schema, _ = IMPORT_SCHEMAS[jenis]
    submitted = payload.get("rows", [])
    if not submitted:
        raise HTTPException(status_code=400, detail="Tidak ada baris valid untuk diimpor")
    # Re-validate server-side (never trust client-resolved ids)
    validated = await _validate_rows(jenis, submitted)
    rows = [v["data"] for v in validated if v["valid"]]
    if not rows:
        raise HTTPException(status_code=400, detail="Tidak ada baris yang lolos validasi ulang")
    docs = []
    affected_recovery = set()
    for r in rows:
        d = {k: r.get(k) for k in schema if not k.startswith("_")}
        d.pop("kode_marketing", None)
        uid = r.get("_resolved_user_id")
        if jenis == "pencapaian_pembiayaan":
            d["ao_id"] = uid
            d["periode"] = d["tanggal_pencairan"][:7]
        elif jenis == "pencapaian_funding":
            d["ao_id"] = uid
            d["periode"] = d["tanggal"][:7]
        elif jenis == "recovery":
            d["pic_id"] = uid
            d["periode"] = d["tanggal"][:7]
            d["is_write_off"] = bool(d.get("is_write_off"))
            affected_recovery.add((uid, d["periode"]))
        elif jenis == "target":
            d["ao_id"] = uid
        d["input_by"] = user["kode_marketing"]
        d["created_at"] = now_iso()
        docs.append(d)

    if jenis == "target":
        for d in docs:
            await db.targets.update_one({"ao_id": d["ao_id"], "periode": d["periode"]}, {"$set": d}, upsert=True)
    else:
        await db[coll].insert_many(docs)

    for uid, periode in affected_recovery:
        await recompute_collection_incentives(uid, periode, user["kode_marketing"])

    await write_audit(user, f"Import data: {jenis}", sesudah={"jumlah": len(docs)})
    return {"success": True, "imported": len(docs)}


# ---------------- RESTORE ----------------
@router.post("/restore")
async def restore(file: UploadFile = File(...), user=Depends(admin_only)):
    content = await file.read()
    try:
        dump = json.loads(content)
        collections = dump["collections"]
        assert isinstance(collections, dict)
    except Exception:
        raise HTTPException(status_code=400, detail="File backup tidak valid")

    # 1) Auto-backup current state to object storage before applying
    snapshot = await _dump_db(exclude_password=False)
    snap_path = f"ao360/backups/auto_pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    try:
        put_object(snap_path, json.dumps(snapshot, default=str).encode("utf-8"), "application/json")
    except Exception:
        snap_path = None

    # preserve current user passwords by _id and by kode_marketing (cross-env fallback)
    cur_users = await db.users.find().to_list(500)
    current_pw = {str(u["_id"]): (u.get("password_hash"), u.get("requires_password_reset", True)) for u in cur_users}
    current_pw_by_kode = {u.get("kode_marketing"): (u.get("password_hash"), u.get("requires_password_reset", True)) for u in cur_users}
    default_pw = hash_password(__import__("os").environ.get("DEFAULT_USER_PASSWORD", "BprsHM2026"))

    restored = {}
    for coll, docs in collections.items():
        if coll not in BACKUP_COLLECTIONS:
            continue
        prepared = []
        for d in docs:
            d = dict(d)
            _id = d.pop("id", None) or d.pop("_id", None)
            if _id:
                try:
                    d["_id"] = ObjectId(_id)
                except Exception:
                    pass
            if coll == "users":
                key = str(d.get("_id"))
                pw, req = current_pw.get(key, (None, None))
                if pw is None:
                    pw, req = current_pw_by_kode.get(d.get("kode_marketing"), (None, True))
                d["password_hash"] = pw or default_pw
                if "requires_password_reset" not in d:
                    d["requires_password_reset"] = req if req is not None else True
            prepared.append(d)
        await db[coll].delete_many({})
        if prepared:
            await db[coll].insert_many(prepared)
        restored[coll] = len(prepared)

    await write_audit(user, "Restore database", sesudah={"restored": restored, "auto_backup": snap_path})
    return {"success": True, "restored": restored, "auto_backup_saved": snap_path is not None}


@router.get("/import-history")
async def import_history(user=Depends(admin_only)):
    docs = await db.audit_logs.find({"aktivitas": {"$regex": "Import data"}}).sort("waktu", -1).to_list(100)
    return [clean(d) for d in docs]
