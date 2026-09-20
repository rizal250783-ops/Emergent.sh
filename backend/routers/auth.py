from datetime import datetime, timedelta, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import db, clean, now_iso, write_audit
from security import (create_access_token, get_current_user, hash_password,
                      require_roles, validate_password_policy, verify_password)

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_ATTEMPTS = 5
LOCK_MINUTES = 15


class LoginBody(BaseModel):
    kode_marketing: str
    password: str


class ChangePasswordBody(BaseModel):
    old_password: str
    new_password: str


@router.post("/login")
async def login(body: LoginBody):
    generic = HTTPException(status_code=401, detail="Kode marketing atau password salah")
    user = await db.users.find_one({"kode_marketing": body.kode_marketing.strip()})
    if not user:
        raise generic
    now = datetime.now(timezone.utc)
    locked_until = user.get("locked_until")
    if locked_until:
        lu = datetime.fromisoformat(locked_until)
        if lu > now:
            await write_audit(user, "Login diblokir (akun terkunci)")
            raise HTTPException(status_code=423, detail="Akun terkunci sementara. Coba lagi dalam 15 menit.")
    if user.get("status") == "nonaktif":
        raise HTTPException(status_code=403, detail="Akun nonaktif. Hubungi Admin.")
    if not verify_password(body.password, user["password_hash"]):
        attempts = user.get("failed_login_attempts", 0) + 1
        update = {"failed_login_attempts": attempts}
        if attempts >= MAX_ATTEMPTS:
            update["locked_until"] = (now + timedelta(minutes=LOCK_MINUTES)).isoformat()
            update["failed_login_attempts"] = 0
            await write_audit(user, "Akun terkunci setelah 5x gagal login")
        else:
            await write_audit(user, f"Login gagal ({attempts}x)")
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
        raise generic
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"failed_login_attempts": 0, "locked_until": None}})
    token = await create_access_token(user)
    await write_audit(user, "Login berhasil")
    return {"token": token, "user": clean(user), "requires_password_reset": user.get("requires_password_reset", False)}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": clean(user), "requires_password_reset": user.get("requires_password_reset", False)}


@router.post("/change-password")
async def change_password(body: ChangePasswordBody, user: dict = Depends(get_current_user)):
    if not verify_password(body.old_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Password lama salah")
    validate_password_policy(body.new_password)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {
        "password_hash": hash_password(body.new_password), "requires_password_reset": False,
    }})
    await write_audit(user, "Ganti password")
    return {"message": "Password berhasil diperbarui"}


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    await write_audit(user, "Logout")
    return {"message": "Logout berhasil"}


class SessionBody(BaseModel):
    minutes: int


@router.put("/session-config")
async def session_config(body: SessionBody, user: dict = Depends(require_roles("Admin"))):
    await db.settings.update_one({"key": "session_minutes"}, {"$set": {"value": body.minutes}}, upsert=True)
    await write_audit(user, "Ubah durasi sesi", sesudah={"minutes": body.minutes})
    return {"message": "Durasi sesi diperbarui", "minutes": body.minutes}
