from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from database import db, clean, now_iso, write_audit
from security import require_roles, get_current_user
from calc import recompute_collection_incentives, check_target_notifications

router = APIRouter(tags=["admin"])
admin_only = require_roles("Admin")


def periode_from_date(d: str) -> str:
    return d[:7]


# ---------------- TRANSAKSI PEMBIAYAAN ----------------
class LendingBody(BaseModel):
    nomor_kontrak: str
    jenis_akad: str
    nama_nasabah: str
    jumlah_pencairan: float
    tanggal_pencairan: str
    ao_id: str


@router.get("/transactions/lending")
async def list_lending(periode: Optional[str] = None, ao_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if periode:
        q["periode"] = periode
    if ao_id:
        q["ao_id"] = ao_id
    docs = await db.lending_achievement_details.find(q).sort("tanggal_pencairan", -1).to_list(2000)
    return [clean(d) for d in docs]


@router.post("/transactions/lending")
async def create_lending(body: LendingBody, user=Depends(admin_only)):
    doc = body.model_dump()
    doc["periode"] = periode_from_date(body.tanggal_pencairan)
    doc["input_by"] = user["kode_marketing"]
    doc["created_at"] = now_iso()
    res = await db.lending_achievement_details.insert_one(doc)
    await check_target_notifications(body.ao_id, doc["periode"])
    await write_audit(user, "Input transaksi pembiayaan", sesudah={"nomor_kontrak": body.nomor_kontrak, "jumlah": body.jumlah_pencairan})
    return {"id": str(res.inserted_id)}


@router.delete("/transactions/lending/{tid}")
async def delete_lending(tid: str, user=Depends(admin_only)):
    old = await db.lending_achievement_details.find_one({"_id": ObjectId(tid)})
    await db.lending_achievement_details.delete_one({"_id": ObjectId(tid)})
    await write_audit(user, "Hapus transaksi pembiayaan", sebelum=clean(old) if old else None)
    return {"message": "Dihapus"}


# ---------------- TRANSAKSI FUNDING ----------------
class FundingBody(BaseModel):
    nama_nasabah: str
    jenis_simpanan: str
    jumlah_simpanan: float
    tanggal: str
    ao_id: str


@router.get("/transactions/funding")
async def list_funding(periode: Optional[str] = None, ao_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if periode:
        q["periode"] = periode
    if ao_id:
        q["ao_id"] = ao_id
    docs = await db.funding_achievement_details.find(q).sort("tanggal", -1).to_list(2000)
    return [clean(d) for d in docs]


@router.post("/transactions/funding")
async def create_funding(body: FundingBody, user=Depends(admin_only)):
    doc = body.model_dump()
    doc["periode"] = periode_from_date(body.tanggal)
    doc["input_by"] = user["kode_marketing"]
    doc["created_at"] = now_iso()
    res = await db.funding_achievement_details.insert_one(doc)
    await check_target_notifications(body.ao_id, doc["periode"])
    await write_audit(user, "Input transaksi funding", sesudah={"nasabah": body.nama_nasabah, "jumlah": body.jumlah_simpanan})
    return {"id": str(res.inserted_id)}


@router.delete("/transactions/funding/{tid}")
async def delete_funding(tid: str, user=Depends(admin_only)):
    old = await db.funding_achievement_details.find_one({"_id": ObjectId(tid)})
    await db.funding_achievement_details.delete_one({"_id": ObjectId(tid)})
    await write_audit(user, "Hapus transaksi funding", sebelum=clean(old) if old else None)
    return {"message": "Dihapus"}


# ---------------- TRANSAKSI RECOVERY ----------------
class RecoveryBody(BaseModel):
    nomor_kontrak: str
    nama_nasabah: str
    jumlah_recovery: float
    tanggal: str
    kolektibilitas: int
    denda_dibayar_penuh: Optional[bool] = None
    is_write_off: bool = False
    pic_id: str


@router.get("/transactions/recovery")
async def list_recovery(periode: Optional[str] = None, pic_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if periode:
        q["periode"] = periode
    if pic_id:
        q["pic_id"] = pic_id
    docs = await db.recovery_achievement_details.find(q).sort("tanggal", -1).to_list(2000)
    return [clean(d) for d in docs]


@router.post("/transactions/recovery")
async def create_recovery(body: RecoveryBody, user=Depends(admin_only)):
    if body.kolektibilitas not in (3, 4, 5):
        raise HTTPException(status_code=400, detail="Kolektibilitas harus 3, 4, atau 5")
    if body.kolektibilitas in (4, 5) and not body.is_write_off and body.denda_dibayar_penuh is None:
        raise HTTPException(status_code=400, detail="Status denda wajib diisi untuk Kolektibilitas 4/5")
    doc = body.model_dump()
    doc["periode"] = periode_from_date(body.tanggal)
    doc["input_by"] = user["kode_marketing"]
    doc["created_at"] = now_iso()
    res = await db.recovery_achievement_details.insert_one(doc)
    await recompute_collection_incentives(body.pic_id, doc["periode"], user["kode_marketing"])
    await check_target_notifications(body.pic_id, doc["periode"])
    await write_audit(user, "Input transaksi recovery", sesudah={"nomor_kontrak": body.nomor_kontrak, "kol": body.kolektibilitas, "wo": body.is_write_off, "jumlah": body.jumlah_recovery})
    return {"id": str(res.inserted_id)}


@router.delete("/transactions/recovery/{tid}")
async def delete_recovery(tid: str, user=Depends(admin_only)):
    old = await db.recovery_achievement_details.find_one({"_id": ObjectId(tid)})
    await db.recovery_achievement_details.delete_one({"_id": ObjectId(tid)})
    if old:
        await recompute_collection_incentives(old["pic_id"], old["periode"], user["kode_marketing"])
    await write_audit(user, "Hapus transaksi recovery", sebelum=clean(old) if old else None)
    return {"message": "Dihapus"}


# ---------------- TARGET MANAGEMENT ----------------
class TargetBody(BaseModel):
    ao_id: str
    periode: str
    target_pencairan: Optional[float] = 0
    target_funding: Optional[float] = 0
    target_recovery: Optional[float] = 0
    target_recovery_kol45: Optional[float] = 0


@router.get("/targets")
async def list_targets(periode: Optional[str] = None, ao_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if periode:
        q["periode"] = periode
    if ao_id:
        q["ao_id"] = ao_id
    docs = await db.targets.find(q).to_list(2000)
    return [clean(d) for d in docs]


@router.post("/targets")
async def upsert_target(body: TargetBody, user=Depends(admin_only)):
    old = await db.targets.find_one({"ao_id": body.ao_id, "periode": body.periode})
    data = body.model_dump()
    data["updated_by"] = user["kode_marketing"]
    data["updated_at"] = now_iso()
    await db.targets.update_one({"ao_id": body.ao_id, "periode": body.periode}, {"$set": data}, upsert=True)
    # recompute kol3 incentive when recovery target changes
    await recompute_collection_incentives(body.ao_id, body.periode, user["kode_marketing"])
    await check_target_notifications(body.ao_id, body.periode)
    await write_audit(user, "Set/Edit target", sebelum=clean(old) if old else None, sesudah=data)
    return {"message": "Target disimpan"}


# ---------------- USER MANAGEMENT ----------------
@router.get("/users")
async def list_users(user=Depends(get_current_user)):
    docs = await db.users.find().sort("kode_marketing", 1).to_list(500)
    return [clean(d) for d in docs]


class UserCreateBody(BaseModel):
    kode_marketing: str
    nama: str
    jabatan: str
    reason: Optional[str] = None


class UserActionBody(BaseModel):
    target_user_id: str
    reason: Optional[str] = None


class UserEditBody(BaseModel):
    nama: Optional[str] = None
    jabatan: Optional[str] = None


class ResetPwBody(BaseModel):
    target_user_id: str


def _request_doc(action, target_user_id, requested_by, reason, payload=None):
    return {
        "action_type": action, "target_user_id": target_user_id,
        "requested_by": requested_by, "status": "pending",
        "approved_by": None, "approved_at": None, "reason": reason,
        "payload": payload, "created_at": now_iso(),
    }


@router.post("/users/request-add")
async def request_add_user(body: UserCreateBody, user=Depends(admin_only)):
    if await db.users.find_one({"kode_marketing": body.kode_marketing}):
        raise HTTPException(status_code=400, detail="Kode marketing sudah ada")
    payload = {"kode_marketing": body.kode_marketing, "nama": body.nama, "jabatan": body.jabatan}
    res = await db.user_management_requests.insert_one(_request_doc("tambah", None, user["kode_marketing"], body.reason, payload))
    await write_audit(user, "Ajukan tambah user (menunggu Direktur)", sesudah=payload)
    return {"id": str(res.inserted_id), "message": "Request menunggu persetujuan Direktur"}


@router.post("/users/request-deactivate")
async def request_deactivate(body: UserActionBody, user=Depends(admin_only)):
    res = await db.user_management_requests.insert_one(_request_doc("nonaktifkan", body.target_user_id, user["kode_marketing"], body.reason))
    await write_audit(user, "Ajukan nonaktifkan user (menunggu Direktur)", sesudah={"target": body.target_user_id})
    return {"id": str(res.inserted_id), "message": "Request menunggu persetujuan Direktur"}


@router.post("/users/request-delete")
async def request_delete(body: UserActionBody, user=Depends(admin_only)):
    res = await db.user_management_requests.insert_one(_request_doc("hapus", body.target_user_id, user["kode_marketing"], body.reason))
    await write_audit(user, "Ajukan hapus user (menunggu Direktur)", sesudah={"target": body.target_user_id})
    return {"id": str(res.inserted_id), "message": "Request menunggu persetujuan Direktur"}


@router.put("/users/{uid}")
async def edit_user(uid: str, body: UserEditBody, user=Depends(admin_only)):
    old = await db.users.find_one({"_id": ObjectId(uid)})
    if not old:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    upd = {}
    if body.nama:
        upd["nama"] = body.nama
    if body.jabatan and body.jabatan != old["jabatan"]:
        upd["jabatan"] = body.jabatan
        await db.role_history.insert_one({
            "user_id": uid, "jabatan_lama": old["jabatan"], "jabatan_baru": body.jabatan,
            "tanggal": now_iso(), "admin": user["kode_marketing"], "approval_ref": None,
        })
    if upd:
        await db.users.update_one({"_id": ObjectId(uid)}, {"$set": upd})
        await write_audit(user, "Edit user (non-kritikal)", sebelum={"nama": old["nama"], "jabatan": old["jabatan"]}, sesudah=upd)
    return {"message": "User diperbarui"}


@router.post("/users/activate/{uid}")
async def activate_user(uid: str, user=Depends(admin_only)):
    await db.users.update_one({"_id": ObjectId(uid)}, {"$set": {"status": "aktif"}})
    await write_audit(user, "Aktifkan kembali user", sesudah={"target": uid})
    return {"message": "User diaktifkan"}


@router.post("/users/reset-password")
async def reset_password(body: ResetPwBody, user=Depends(admin_only)):
    import secrets
    from security import hash_password
    temp = f"Bprs{secrets.randbelow(9000) + 1000}xy"
    await db.users.update_one({"_id": ObjectId(body.target_user_id)}, {"$set": {
        "password_hash": hash_password(temp), "requires_password_reset": True,
        "failed_login_attempts": 0, "locked_until": None,
    }})
    await write_audit(user, "Reset password user", sesudah={"target": body.target_user_id})
    return {"message": "Password sementara dibuat", "temporary_password": temp}


@router.get("/role-history")
async def role_history(user=Depends(get_current_user)):
    docs = await db.role_history.find().sort("tanggal", -1).to_list(500)
    return [clean(d) for d in docs]


# ---------------- AUDIT LOG ----------------
@router.get("/audit-logs")
async def audit_logs(user=Depends(require_roles("Admin", "Direktur")), limit: int = 300):
    docs = await db.audit_logs.find().sort("waktu", -1).to_list(limit)
    return [clean(d) for d in docs]
