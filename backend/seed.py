import os

from database import db, now_iso
from security import hash_password

DEFAULT_PASSWORD = os.environ.get("DEFAULT_USER_PASSWORD", "BprsHM2026")

FIXED_USERS = [
    ("001", "HENDRI KAMAL", "Direktur"),
    ("002", "RINTO", "Admin"),
    ("003", "RIDWAN", "AO Pembiayaan"),
    ("042", "GUSRIL", "AO Pembiayaan"),
    ("050", "RIKI SABRIPINTO", "AO Pembiayaan"),
    ("059", "RIKO WIRMAN", "AO Pembiayaan"),
    ("072", "WILDA FAKHRIZA", "AO Pembiayaan"),
    ("074", "EKO YUNUS HARDANA", "AO Pembiayaan"),
    ("077", "SYAFITRI IRAYANI", "AO Pembiayaan"),
    ("083", "SRI WAHYUNI", "AO Pembiayaan"),
    ("085", "GITA LESTARI", "AO Pembiayaan"),
    ("008", "DEFI ROSI", "AO Funding"),
    ("020", "MISRINA", "AO Funding"),
    ("028", "RICI NOVIKA", "AO Funding"),
    ("049", "RISKI RISKA FERI", "AO Funding"),
    ("056", "GEMA WAHYU RIZAL", "AO Funding"),
    ("078", "ELVA NOVIA", "AO Funding"),
    ("013", "DEFI ROSI", "Collection & Remedial"),
    ("086", "TAUFIK CHANI", "Collection & Remedial"),
]


async def seed_users():
    await db.users.create_index("kode_marketing", unique=True)
    hashed = hash_password(DEFAULT_PASSWORD)
    for kode, nama, jabatan in FIXED_USERS:
        existing = await db.users.find_one({"kode_marketing": kode})
        if existing:
            continue
        await db.users.insert_one({
            "kode_marketing": kode, "nama": nama, "jabatan": jabatan,
            "password_hash": hashed, "requires_password_reset": True,
            "failed_login_attempts": 0, "locked_until": None,
            "status": "aktif", "created_at": now_iso(),
        })


async def seed_settings():
    if not await db.settings.find_one({"key": "session_minutes"}):
        await db.settings.insert_one({"key": "session_minutes", "value": 60})
