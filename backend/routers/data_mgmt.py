import io
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from openpyxl import Workbook

from database import db, clean, now_iso, write_audit
from security import require_roles

router = APIRouter(prefix="/data", tags=["data-management"])
admin_only = require_roles("Admin")

BACKUP_COLLECTIONS = [
    "users", "targets", "lending_achievement_details", "funding_achievement_details",
    "recovery_achievement_details", "incentive_settings", "collection_activity",
    "collection_activity_photos", "role_history", "user_management_requests", "audit_logs",
]


@router.get("/export/{jenis}")
async def export_data(jenis: str, periode: Optional[str] = None, user=Depends(admin_only)):
    mapping = {
        "pencapaian_pembiayaan": ("lending_achievement_details", ["nomor_kontrak", "jenis_akad", "nama_nasabah", "jumlah_pencairan", "tanggal_pencairan", "ao_id", "periode"]),
        "pencapaian_funding": ("funding_achievement_details", ["nama_nasabah", "jenis_simpanan", "jumlah_simpanan", "tanggal", "ao_id", "periode"]),
        "recovery": ("recovery_achievement_details", ["nomor_kontrak", "nama_nasabah", "jumlah_recovery", "tanggal", "kolektibilitas", "denda_dibayar_penuh", "is_write_off", "pic_id", "periode"]),
        "collection": ("collection_activity", ["nomor_kontrak", "nama_nasabah", "outstanding_pokok", "status_penagihan", "source", "status_kunjungan", "periode"]),
    }
    if jenis not in mapping:
        from fastapi import HTTPException
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


@router.get("/backup")
async def backup(user=Depends(admin_only)):
    dump = {"created_at": now_iso(), "collections": {}}
    for coll in BACKUP_COLLECTIONS:
        docs = await db[coll].find().to_list(100000)
        cleaned = []
        for d in docs:
            c = clean(d)  # removes password_hash
            if coll == "users":
                c["requires_password_reset"] = True
                c.pop("password_hash", None)
            cleaned.append(c)
        dump["collections"][coll] = cleaned
    await write_audit(user, "Backup database")
    buf = io.BytesIO(json.dumps(dump, default=str, indent=2).encode("utf-8"))
    fname = f"ao360_backup_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
    return StreamingResponse(buf, media_type="application/json",
                             headers={"Content-Disposition": f"attachment; filename={fname}"})


@router.post("/import/{jenis}")
async def import_data(jenis: str, file: UploadFile = File(...), user=Depends(admin_only)):
    """Import JSON array of rows. Returns validation errors per row (no commit on error)."""
    from fastapi import HTTPException
    content = await file.read()
    try:
        rows = json.loads(content)
        assert isinstance(rows, list)
    except Exception:
        raise HTTPException(status_code=400, detail="File harus berupa JSON array")
    coll_map = {
        "pencapaian_pembiayaan": "lending_achievement_details",
        "pencapaian_funding": "funding_achievement_details",
        "recovery": "recovery_achievement_details",
        "target": "targets",
    }
    if jenis not in coll_map:
        raise HTTPException(status_code=400, detail="Jenis import tidak dikenal")
    errors = []
    valid = []
    kodes = {u["kode_marketing"]: str(u["_id"]) for u in await db.users.find().to_list(500)}
    for i, r in enumerate(rows):
        if not isinstance(r, dict):
            errors.append({"row": i + 1, "error": "Bukan objek"})
            continue
        r["input_by"] = user["kode_marketing"]
        r["created_at"] = now_iso()
        valid.append(r)
    if errors:
        return {"success": False, "errors": errors, "total": len(rows)}
    if valid:
        await db[coll_map[jenis]].insert_many(valid)
    await write_audit(user, f"Import data: {jenis}", sesudah={"jumlah": len(valid)})
    return {"success": True, "imported": len(valid)}


@router.get("/import-history")
async def import_history(user=Depends(admin_only)):
    docs = await db.audit_logs.find({"aktivitas": {"$regex": "Import data"}}).sort("waktu", -1).to_list(100)
    return [clean(d) for d in docs]
