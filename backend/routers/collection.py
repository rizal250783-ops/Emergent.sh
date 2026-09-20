from typing import Optional, List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header, Query
from fastapi.responses import Response
from pydantic import BaseModel

from database import db, clean, now_iso, write_audit
from security import get_current_user, require_roles, JWT_SECRET, JWT_ALGORITHM
from storage import upload_collection_photo, get_object

router = APIRouter(prefix="/collection", tags=["collection"])

STATUS_OPTIONS = ["Dikunjungi", "Berkomunikasi", "Janji Bayar", "Pembayaran Masuk",
                  "Tidak Ditemui", "Restrukturisasi", "Eskalasi"]


class AssignBody(BaseModel):
    nomor_kontrak: str
    nama_nasabah: str
    outstanding_pokok: float
    assigned_to: str  # user id
    periode: str


class SelfInputBody(BaseModel):
    nomor_kontrak: str
    nama_nasabah: str
    outstanding_pokok: float
    status_penagihan: str
    catatan: Optional[str] = None
    periode: str


class UpdateStatusBody(BaseModel):
    status_penagihan: str
    catatan: Optional[str] = None


async def _enrich_activity(docs):
    users = {str(u["_id"]): u for u in await db.users.find().to_list(500)}
    out = []
    for d in docs:
        c = clean(d)
        at = users.get(d.get("assigned_to"))
        c["assigned_to_nama"] = at["nama"] if at else None
        photos = await db.collection_activity_photos.find({"collection_activity_id": str(d["_id"])}).to_list(20)
        c["photos"] = [clean(p) for p in photos]
        out.append(c)
    return out


@router.get("")
async def list_activity(periode: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if periode:
        q["periode"] = periode
    if user["jabatan"] in ("AO Pembiayaan", "Collection & Remedial"):
        uid = str(user["_id"])
        q["$or"] = [{"assigned_to": uid}, {"created_by": user["kode_marketing"], "source": "self_input"}]
    docs = await db.collection_activity.find(q).sort("created_at", -1).to_list(1000)
    return await _enrich_activity(docs)


@router.post("/assign")
async def assign_activity(body: AssignBody, user=Depends(require_roles("Admin"))):
    doc = body.model_dump()
    doc.update({
        "status_penagihan": None, "catatan": None, "source": "admin_assigned",
        "assigned_by": user["kode_marketing"], "status_kunjungan": "Ditugaskan",
        "created_by": user["kode_marketing"], "created_at": now_iso(),
    })
    res = await db.collection_activity.insert_one(doc)
    await write_audit(user, "Assign collection activity", sesudah={"nomor_kontrak": body.nomor_kontrak, "assigned_to": body.assigned_to})
    return {"id": str(res.inserted_id)}


@router.post("/self")
async def self_input(body: SelfInputBody, user=Depends(require_roles("AO Pembiayaan", "Collection & Remedial"))):
    if body.status_penagihan not in STATUS_OPTIONS:
        raise HTTPException(status_code=400, detail="Status penagihan tidak valid")
    doc = body.model_dump()
    doc.update({
        "source": "self_input", "assigned_by": None, "assigned_to": str(user["_id"]),
        "status_kunjungan": "Selesai", "created_by": user["kode_marketing"], "created_at": now_iso(),
    })
    res = await db.collection_activity.insert_one(doc)
    await write_audit(user, "Input mandiri collection activity", sesudah={"nomor_kontrak": body.nomor_kontrak})
    return {"id": str(res.inserted_id)}


@router.put("/{aid}/status")
async def update_status(aid: str, body: UpdateStatusBody, user=Depends(get_current_user)):
    act = await db.collection_activity.find_one({"_id": ObjectId(aid)})
    if not act:
        raise HTTPException(status_code=404, detail="Aktivitas tidak ditemukan")
    if body.status_penagihan not in STATUS_OPTIONS:
        raise HTTPException(status_code=400, detail="Status penagihan tidak valid")
    await db.collection_activity.update_one({"_id": ObjectId(aid)}, {"$set": {
        "status_penagihan": body.status_penagihan, "catatan": body.catatan, "status_kunjungan": "Selesai",
    }})
    await write_audit(user, "Update status collection activity", sesudah={"id": aid, "status": body.status_penagihan})
    return {"message": "Status diperbarui"}


@router.post("/{aid}/photos")
async def upload_photos(aid: str, files: List[UploadFile] = File(...),
                        activity_date: str = Form(...), user=Depends(get_current_user)):
    act = await db.collection_activity.find_one({"_id": ObjectId(aid)})
    if not act:
        raise HTTPException(status_code=404, detail="Aktivitas tidak ditemukan")
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Maksimal 5 foto per aktivitas")
    saved = []
    for f in files:
        data = await f.read()
        if len(data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"{f.filename} melebihi 10MB")
        meta = upload_collection_photo(data, f.filename, str(user["_id"]), user["nama"], activity_date)
        doc = {"collection_activity_id": aid, "foto_url": meta["storage_path"], **meta,
               "uploaded_by": user["kode_marketing"], "created_at": now_iso()}
        res = await db.collection_activity_photos.insert_one(doc)
        c = clean(doc)
        c["id"] = str(res.inserted_id)
        saved.append(c)
    await write_audit(user, "Upload foto collection activity", sesudah={"aktivitas": aid, "jumlah": len(saved)})
    return {"photos": saved}


@router.get("/photo")
async def get_photo(path: str = Query(...), auth: str = Query(None), authorization: str = Header(None)):
    import jwt
    token = auth or (authorization[7:] if authorization and authorization.startswith("Bearer ") else None)
    if not token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    rec = await db.collection_activity_photos.find_one({"foto_url": path})
    if not rec:
        raise HTTPException(status_code=404, detail="Foto tidak ditemukan")
    data, ctype = get_object(path)
    return Response(content=data, media_type=ctype)


class VerifyPhotoBody(BaseModel):
    status_validasi: str


@router.put("/photo/{pid}/verify")
async def verify_photo(pid: str, body: VerifyPhotoBody, user=Depends(require_roles("Admin"))):
    await db.collection_activity_photos.update_one({"_id": ObjectId(pid)}, {"$set": {"status_validasi": body.status_validasi}})
    await write_audit(user, "Verifikasi foto collection", sesudah={"id": pid, "status": body.status_validasi})
    return {"message": "Status validasi diperbarui"}
