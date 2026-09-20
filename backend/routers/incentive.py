from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from database import db, clean, now_iso, write_audit
from security import require_roles, get_current_user

router = APIRouter(prefix="/incentives", tags=["incentives"])

KATEGORI_LABEL = {
    "target_pembiayaan": "Target Pembiayaan",
    "target_funding": "Target Funding",
    "kolektibilitas_3": "Kolektibilitas 3",
    "kolektibilitas_4": "Kolektibilitas 4",
    "kolektibilitas_5": "Kolektibilitas 5",
    "write_off": "Write Off",
}


async def _enrich(docs):
    users = {str(u["_id"]): u for u in await db.users.find().to_list(500)}
    out = []
    for d in docs:
        c = clean(d)
        u = users.get(d.get("ao_id"))
        c["nama"] = u["nama"] if u else "-"
        c["kode_marketing"] = u["kode_marketing"] if u else "-"
        c["jabatan"] = u["jabatan"] if u else "-"
        c["kategori_label"] = KATEGORI_LABEL.get(d.get("kategori"), d.get("kategori"))
        out.append(c)
    return out


# ----------- ADMIN: list all + submit category A -----------
@router.get("")
async def list_incentives(periode: Optional[str] = None, jabatan: Optional[str] = None,
                          kategori: Optional[str] = None, status: Optional[str] = None,
                          user=Depends(require_roles("Admin", "Direktur"))):
    q = {}
    if periode:
        q["periode"] = periode
    if kategori:
        q["kategori"] = kategori
    if status:
        q["status_approval"] = status
    docs = await db.incentive_settings.find(q).sort("tanggal", -1).to_list(2000)
    enriched = await _enrich(docs)
    if jabatan:
        enriched = [e for e in enriched if e["jabatan"] == jabatan]
    return enriched


class TargetIncentiveBody(BaseModel):
    ao_id: str
    periode: str
    kategori: str  # target_pembiayaan | target_funding
    jenis_perhitungan: str  # persentase | manual
    nilai_persen: Optional[float] = None
    nilai_manual: Optional[float] = None


@router.post("/target")
async def submit_target_incentive(body: TargetIncentiveBody, user=Depends(require_roles("Admin"))):
    from calc import sum_lending, sum_funding, compute_achievement, get_target
    if body.kategori not in ("target_pembiayaan", "target_funding"):
        raise HTTPException(status_code=400, detail="Kategori tidak valid")
    t = await get_target(body.ao_id, body.periode)
    if body.kategori == "target_pembiayaan":
        realisasi = await sum_lending(body.ao_id, body.periode)
        target = t.get("target_pencairan", 0)
    else:
        realisasi = await sum_funding(body.ao_id, body.periode)
        target = t.get("target_funding", 0)
    res = compute_achievement(realisasi, target)
    if res["achievement"] is None or res["achievement"] < 100:
        raise HTTPException(status_code=400, detail="Insentif target hanya untuk pencapaian ≥100%")
    if body.jenis_perhitungan == "persentase":
        if body.nilai_persen is None:
            raise HTTPException(status_code=400, detail="Nilai persen wajib diisi")
        nominal = round(realisasi * body.nilai_persen / 100, 2)
    else:
        if body.nilai_manual is None:
            raise HTTPException(status_code=400, detail="Nilai manual wajib diisi")
        nominal = round(body.nilai_manual, 2)
    doc = {
        "ao_id": body.ao_id, "periode": body.periode, "kategori": body.kategori,
        "sumber_transaksi_id": None, "jenis_perhitungan": body.jenis_perhitungan,
        "nilai_persen": body.nilai_persen, "nilai_manual": body.nilai_manual,
        "nominal_terhitung": nominal, "base_perhitungan": realisasi,
        "status_approval": "pending", "diajukan_oleh": user["kode_marketing"],
        "approved_by": None, "approved_at": None, "tanggal": now_iso(),
    }
    res_ins = await db.incentive_settings.insert_one(doc)
    await write_audit(user, "Ajukan insentif target", sesudah={"ao_id": body.ao_id, "kategori": body.kategori, "nominal": nominal})
    return {"id": str(res_ins.inserted_id), "nominal_terhitung": nominal}


# ----------- DIREKTUR: approve/reject -----------
class ApprovalBody(BaseModel):
    ids: List[str]
    action: str  # approve | reject
    reason: Optional[str] = None


@router.post("/approve")
async def approve_incentives(body: ApprovalBody, user=Depends(require_roles("Direktur"))):
    status = "approved" if body.action == "approve" else "rejected"
    for iid in body.ids:
        await db.incentive_settings.update_one({"_id": ObjectId(iid)}, {"$set": {
            "status_approval": status, "approved_by": user["kode_marketing"],
            "approved_at": now_iso(), "reject_reason": body.reason,
        }})
    await write_audit(user, f"{'Approve' if status=='approved' else 'Reject'} insentif oleh Direktur", sesudah={"ids": body.ids})
    return {"message": f"{len(body.ids)} insentif di-{status}"}


# ----------- AO/COLLECTION: approved only (own) -----------
@router.get("/mine")
async def my_incentives(periode: Optional[str] = None, user=Depends(get_current_user)):
    q = {"ao_id": str(user["_id"]), "status_approval": "approved"}
    if periode:
        q["periode"] = periode
    docs = await db.incentive_settings.find(q).sort("tanggal", -1).to_list(2000)
    return await _enrich(docs)
