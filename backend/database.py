import os
from datetime import datetime, timezone
from typing import Annotated, Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


def _validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str):
        return v
    raise ValueError("Invalid ObjectId")


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc: Optional[dict]):
        if not doc:
            return None
        return cls(**doc)

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean(doc: dict) -> dict:
    """Convert a mongo doc into a JSON-serializable dict (str id, no password)."""
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc


async def write_audit(user: dict, aktivitas: str, sebelum=None, sesudah=None):
    await db.audit_logs.insert_one({
        "user_kode": user.get("kode_marketing") if user else "system",
        "user_nama": user.get("nama") if user else "System",
        "aktivitas": aktivitas,
        "data_sebelum": sebelum,
        "data_sesudah": sesudah,
        "waktu": now_iso(),
    })


async def write_notification(tipe: str, judul: str, pesan: str, recipient_role: str = None,
                             recipient_kode: str = None, ref: dict = None):
    await db.notifications.insert_one({
        "recipient_role": recipient_role,
        "recipient_kode": recipient_kode,
        "tipe": tipe,
        "judul": judul,
        "pesan": pesan,
        "ref": ref,
        "is_read": False,
        "created_at": now_iso(),
    })
