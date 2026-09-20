import os
import re
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, Request

from database import db

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
DEFAULT_SESSION_MINUTES = 60

ROLES = ["Direktur", "Admin", "AO Pembiayaan", "AO Funding", "Collection & Remedial"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def validate_password_policy(password: str):
    if len(password) < 8 or not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Password minimal 8 karakter dan kombinasi huruf & angka")


async def get_session_minutes() -> int:
    s = await db.settings.find_one({"key": "session_minutes"})
    return int(s["value"]) if s else DEFAULT_SESSION_MINUTES


async def create_access_token(user: dict) -> str:
    minutes = await get_session_minutes()
    payload = {
        "sub": str(user["_id"]),
        "kode": user["kode_marketing"],
        "jabatan": user["jabatan"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesi berakhir, silakan login kembali")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user or user.get("status") == "nonaktif":
        raise HTTPException(status_code=401, detail="User tidak ditemukan atau nonaktif")
    return user


def require_roles(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if user["jabatan"] not in roles:
            raise HTTPException(status_code=403, detail="Akses ditolak untuk jabatan Anda")
        return user
    return checker
