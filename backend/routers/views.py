from datetime import date
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import db, clean, now_iso, write_audit
from security import get_current_user, require_roles
from calc import (build_kpis, build_leaderboard, build_riwayat, sum_lending,
                  sum_funding, sum_recovery_kol3, get_target, compute_achievement)

router = APIRouter(tags=["views"])


def current_periode() -> str:
    t = date.today()
    return f"{t.year:04d}-{t.month:02d}"


# ---------- personal dashboard ----------
@router.get("/dashboard/me")
async def dashboard_me(periode: Optional[str] = None, user=Depends(get_current_user)):
    periode = periode or current_periode()
    kpis = await build_kpis(user, periode)
    return {"periode": periode, "user": clean(user), "kpis": kpis}


@router.get("/dashboard/rekap")
async def dashboard_rekap(periode: Optional[str] = None, user=Depends(get_current_user)):
    periode = periode or current_periode()
    uid = str(user["_id"])
    out = {}
    if user["jabatan"] == "AO Pembiayaan":
        out["pencairan"] = [clean(d) for d in await db.lending_achievement_details.find({"ao_id": uid, "periode": periode}).to_list(1000)]
        out["simpanan"] = [clean(d) for d in await db.funding_achievement_details.find({"ao_id": uid, "periode": periode}).to_list(1000)]
    elif user["jabatan"] == "AO Funding":
        out["simpanan"] = [clean(d) for d in await db.funding_achievement_details.find({"ao_id": uid, "periode": periode}).to_list(1000)]
    elif user["jabatan"] == "Collection & Remedial":
        out["recovery"] = [clean(d) for d in await db.recovery_achievement_details.find({"pic_id": uid, "periode": periode}).to_list(1000)]
    return out


# ---------- riwayat bulanan ----------
@router.get("/riwayat/me")
async def riwayat_me(user=Depends(get_current_user)):
    return await build_riwayat(str(user["_id"]), user["jabatan"])


@router.get("/riwayat/user/{uid}")
async def riwayat_user(uid: str, user=Depends(require_roles("Admin", "Direktur"))):
    target = await db.users.find_one({"_id": ObjectId(uid)})
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    return await build_riwayat(uid, target["jabatan"])


# ---------- leaderboard ----------
@router.get("/leaderboard")
async def leaderboard(komponen: str = "Pembiayaan", periode: Optional[str] = None, user=Depends(get_current_user)):
    periode = periode or current_periode()
    if komponen not in ("Pembiayaan", "Funding", "Recovery"):
        raise HTTPException(status_code=400, detail="Komponen tidak valid")
    rows = await build_leaderboard(komponen, periode)
    return {"komponen": komponen, "periode": periode, "rows": rows}


# ---------- executive / admin summary ----------
@router.get("/dashboard/executive")
async def executive(periode: Optional[str] = None, user=Depends(require_roles("Direktur", "Admin"))):
    periode = periode or current_periode()
    total_pencairan = sum(d["jumlah_pencairan"] for d in await db.lending_achievement_details.find({"periode": periode}).to_list(5000))
    total_funding = sum(d["jumlah_simpanan"] for d in await db.funding_achievement_details.find({"periode": periode}).to_list(5000))
    recovery_docs = await db.recovery_achievement_details.find({"periode": periode}).to_list(5000)
    total_recovery_k3 = sum(d["jumlah_recovery"] for d in recovery_docs if d.get("kolektibilitas") == 3 and not d.get("is_write_off"))

    targets = await db.targets.find({"periode": periode}).to_list(500)
    tt_pencairan = sum(t.get("target_pencairan", 0) or 0 for t in targets)
    tt_funding = sum(t.get("target_funding", 0) or 0 for t in targets)
    tt_recovery = sum(t.get("target_recovery", 0) or 0 for t in targets)

    counts = {}
    for j in ["AO Pembiayaan", "AO Funding", "Collection & Remedial"]:
        counts[j] = await db.users.count_documents({"jabatan": j, "status": "aktif"})

    pending_inc = await db.incentive_settings.count_documents({"status_approval": "pending"})
    pending_um = await db.user_management_requests.count_documents({"status": "pending"})

    return {
        "periode": periode,
        "pembiayaan": {"realisasi": total_pencairan, "target": tt_pencairan, **compute_achievement(total_pencairan, tt_pencairan)},
        "funding": {"realisasi": total_funding, "target": tt_funding, **compute_achievement(total_funding, tt_funding)},
        "recovery": {"realisasi": total_recovery_k3, "target": tt_recovery, **compute_achievement(total_recovery_k3, tt_recovery)},
        "jumlah_ao": counts,
        "pending_insentif": pending_inc,
        "pending_user_request": pending_um,
        "top_pembiayaan": (await build_leaderboard("Pembiayaan", periode))[:5],
        "top_funding": (await build_leaderboard("Funding", periode))[:5],
        "top_recovery": (await build_leaderboard("Recovery", periode))[:5],
    }


# ---------- director: user management approval ----------
async def _enrich_requests(docs):
    users = {str(u["_id"]): u for u in await db.users.find().to_list(500)}
    out = []
    for d in docs:
        c = clean(d)
        tu = users.get(d.get("target_user_id"))
        c["target_nama"] = tu["nama"] if tu else (d.get("payload", {}) or {}).get("nama")
        c["target_kode"] = tu["kode_marketing"] if tu else (d.get("payload", {}) or {}).get("kode_marketing")
        out.append(c)
    return out


@router.get("/user-requests")
async def list_user_requests(status: Optional[str] = None, user=Depends(require_roles("Direktur", "Admin"))):
    q = {}
    if status:
        q["status"] = status
    docs = await db.user_management_requests.find(q).sort("created_at", -1).to_list(500)
    return await _enrich_requests(docs)


class RequestDecisionBody(BaseModel):
    action: str  # approve | reject
    reason: Optional[str] = None


@router.post("/user-requests/{rid}/decide")
async def decide_request(rid: str, body: RequestDecisionBody, user=Depends(require_roles("Direktur"))):
    from security import hash_password
    import os
    req = await db.user_management_requests.find_one({"_id": ObjectId(rid)})
    if not req or req["status"] != "pending":
        raise HTTPException(status_code=404, detail="Request tidak ditemukan / sudah diproses")
    if body.action == "reject":
        await db.user_management_requests.update_one({"_id": ObjectId(rid)}, {"$set": {
            "status": "rejected", "approved_by": user["kode_marketing"], "approved_at": now_iso(), "reason": body.reason,
        }})
        await write_audit(user, "Reject request user management", sesudah={"id": rid})
        return {"message": "Request ditolak"}

    # approve → apply
    if req["action_type"] == "tambah":
        p = req["payload"]
        await db.users.insert_one({
            "kode_marketing": p["kode_marketing"], "nama": p["nama"], "jabatan": p["jabatan"],
            "password_hash": hash_password(os.environ.get("DEFAULT_USER_PASSWORD", "BprsHM2026")),
            "requires_password_reset": True, "failed_login_attempts": 0, "locked_until": None,
            "status": "aktif", "created_at": now_iso(),
        })
    elif req["action_type"] == "nonaktifkan":
        await db.users.update_one({"_id": ObjectId(req["target_user_id"])}, {"$set": {"status": "nonaktif"}})
    elif req["action_type"] == "hapus":
        await db.users.delete_one({"_id": ObjectId(req["target_user_id"])})
    await db.user_management_requests.update_one({"_id": ObjectId(rid)}, {"$set": {
        "status": "approved", "approved_by": user["kode_marketing"], "approved_at": now_iso(),
    }})
    await write_audit(user, f"Approve request user ({req['action_type']})", sesudah={"id": rid})
    return {"message": "Request disetujui & diterapkan"}
