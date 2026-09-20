from bson import ObjectId
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List

from database import db, clean
from security import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(user=Depends(get_current_user)):
    docs = await db.notifications.find({"recipient_role": user["jabatan"]}).sort("created_at", -1).to_list(100)
    return [clean(d) for d in docs]


@router.get("/unread-count")
async def unread_count(user=Depends(get_current_user)):
    n = await db.notifications.count_documents({"recipient_role": user["jabatan"], "is_read": False})
    return {"count": n}


class ReadBody(BaseModel):
    ids: List[str] = []


@router.post("/read")
async def mark_read(body: ReadBody, user=Depends(get_current_user)):
    if body.ids:
        await db.notifications.update_many(
            {"_id": {"$in": [ObjectId(i) for i in body.ids]}, "recipient_role": user["jabatan"]},
            {"$set": {"is_read": True}},
        )
    return {"message": "ok"}


@router.post("/read-all")
async def mark_all_read(user=Depends(get_current_user)):
    await db.notifications.update_many({"recipient_role": user["jabatan"]}, {"$set": {"is_read": True}})
    return {"message": "ok"}
