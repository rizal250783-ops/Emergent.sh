from database import db, now_iso

# Fixed incentive percentages (Bagian 8.1)
INCENTIVE_RATES = {
    "kolektibilitas_3": 0.01,
    "kol4_denda_penuh": 0.05,
    "kol4_denda_tidak": 0.025,
    "kol5_denda_penuh": 0.10,
    "kol5_denda_tidak": 0.05,
    "write_off": 0.15,
}

STATUS_LABELS = {
    "excellent": "Sangat Baik",
    "good": "Baik",
    "need_attention": "Perlu Perhatian",
    "critical": "Kritis",
    "na": "N/A",
}


def status_from_achievement(ach):
    if ach is None:
        return "na"
    if ach >= 100:
        return "excellent"
    if ach >= 85:
        return "good"
    if ach >= 70:
        return "need_attention"
    return "critical"


def compute_achievement(realisasi: float, target: float):
    """Return dict: achievement(%), status, note. Applies zero-divisor rules."""
    if not target or target == 0:
        if not realisasi:
            return {"achievement": None, "status": "na", "note": "N/A"}
        return {"achievement": None, "status": "na", "note": "N/A (tidak ada target)"}
    ach = round(realisasi / target * 100, 2)
    return {"achievement": ach, "status": status_from_achievement(ach), "note": None}


async def sum_lending(ao_id, periode):
    cur = db.lending_achievement_details.aggregate([
        {"$match": {"ao_id": ao_id, "periode": periode}},
        {"$group": {"_id": None, "total": {"$sum": "$jumlah_pencairan"}}},
    ])
    docs = await cur.to_list(1)
    return docs[0]["total"] if docs else 0


async def sum_funding(ao_id, periode):
    cur = db.funding_achievement_details.aggregate([
        {"$match": {"ao_id": ao_id, "periode": periode}},
        {"$group": {"_id": None, "total": {"$sum": "$jumlah_simpanan"}}},
    ])
    docs = await cur.to_list(1)
    return docs[0]["total"] if docs else 0


async def sum_recovery_kol3(pic_id, periode):
    cur = db.recovery_achievement_details.aggregate([
        {"$match": {"pic_id": pic_id, "periode": periode, "kolektibilitas": 3, "is_write_off": {"$ne": True}}},
        {"$group": {"_id": None, "total": {"$sum": "$jumlah_recovery"}}},
    ])
    docs = await cur.to_list(1)
    return docs[0]["total"] if docs else 0


async def get_target(ao_id, periode):
    return await db.targets.find_one({"ao_id": ao_id, "periode": periode}) or {}


async def build_kpis(user, periode):
    """Return list of KPI dicts for a given user based on jabatan."""
    ao_id = str(user["_id"])
    jabatan = user["jabatan"]
    t = await get_target(ao_id, periode)
    kpis = []
    if jabatan == "AO Pembiayaan":
        real_p = await sum_lending(ao_id, periode)
        res_p = compute_achievement(real_p, t.get("target_pencairan", 0))
        kpis.append({"komponen": "Pembiayaan", "realisasi": real_p, "target": t.get("target_pencairan", 0), **res_p})
        real_f = await sum_funding(ao_id, periode)
        res_f = compute_achievement(real_f, t.get("target_funding", 0))
        kpis.append({"komponen": "Funding", "realisasi": real_f, "target": t.get("target_funding", 0), **res_f})
    elif jabatan == "AO Funding":
        real_f = await sum_funding(ao_id, periode)
        res_f = compute_achievement(real_f, t.get("target_funding", 0))
        kpis.append({"komponen": "Funding", "realisasi": real_f, "target": t.get("target_funding", 0), **res_f})
    elif jabatan == "Collection & Remedial":
        real_r = await sum_recovery_kol3(ao_id, periode)
        res_r = compute_achievement(real_r, t.get("target_recovery", 0))
        kpis.append({"komponen": "Recovery (Kol.3)", "realisasi": real_r, "target": t.get("target_recovery", 0), **res_r})
    return kpis


async def build_leaderboard(komponen, periode):
    """komponen: Pembiayaan | Funding | Recovery"""
    if komponen == "Pembiayaan":
        jabatans = ["AO Pembiayaan"]
        sumfn, tkey = sum_lending, "target_pencairan"
    elif komponen == "Funding":
        jabatans = ["AO Pembiayaan", "AO Funding"]
        sumfn, tkey = sum_funding, "target_funding"
    else:
        jabatans = ["Collection & Remedial"]
        sumfn, tkey = sum_recovery_kol3, "target_recovery"

    users = await db.users.find({"jabatan": {"$in": jabatans}, "status": "aktif"}).to_list(200)
    rows = []
    for u in users:
        ao_id = str(u["_id"])
        real = await sumfn(ao_id, periode)
        t = await get_target(ao_id, periode)
        res = compute_achievement(real, t.get(tkey, 0))
        rows.append({
            "nama": u["nama"], "kode_marketing": u["kode_marketing"],
            "target": t.get(tkey, 0), "realisasi": real,
            "achievement": res["achievement"], "status": res["status"], "note": res["note"],
        })
    ranked = [r for r in rows if r["achievement"] is not None]
    na = [r for r in rows if r["achievement"] is None]
    ranked.sort(key=lambda r: (r["achievement"], r["realisasi"]), reverse=True)
    for i, r in enumerate(ranked):
        r["ranking"] = i + 1
    return ranked + na


async def build_riwayat(ao_id, jabatan):
    """Monthly history from Januari 2026 to now for the user's primary component."""
    months = []
    y, m = 2026, 1
    from datetime import date
    today = date.today()
    while (y, m) <= (today.year, today.month):
        months.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            m = 1
            y += 1
    result = []
    for periode in months:
        t = await get_target(ao_id, periode)
        if jabatan == "AO Pembiayaan":
            real = await sum_lending(ao_id, periode)
            res = compute_achievement(real, t.get("target_pencairan", 0))
            real_f = await sum_funding(ao_id, periode)
            res_f = compute_achievement(real_f, t.get("target_funding", 0))
            result.append({"bulan": periode, "target": t.get("target_pencairan", 0), "realisasi": real, **res,
                           "target_funding": t.get("target_funding", 0), "realisasi_funding": real_f,
                           "achievement_funding": res_f["achievement"], "status_funding": res_f["status"]})
        elif jabatan == "AO Funding":
            real = await sum_funding(ao_id, periode)
            res = compute_achievement(real, t.get("target_funding", 0))
            result.append({"bulan": periode, "target": t.get("target_funding", 0), "realisasi": real, **res})
        elif jabatan == "Collection & Remedial":
            real = await sum_recovery_kol3(ao_id, periode)
            res = compute_achievement(real, t.get("target_recovery", 0))
            result.append({"bulan": periode, "target": t.get("target_recovery", 0), "realisasi": real, **res})
    return result


async def recompute_collection_incentives(pic_id, periode, actor):
    """Auto-generate pending category-B incentives from recovery transactions.
    Preserves approved/rejected rows; refreshes pending ones."""
    # Remove existing PENDING category-B incentives for this pic+periode, keep approved/rejected
    catB = ["kolektibilitas_3", "kolektibilitas_4", "kolektibilitas_5", "write_off"]
    await db.incentive_settings.delete_many({
        "ao_id": pic_id, "periode": periode, "kategori": {"$in": catB}, "status_approval": "pending",
    })
    kept = await db.incentive_settings.find({
        "ao_id": pic_id, "periode": periode, "kategori": {"$in": catB},
        "status_approval": {"$in": ["approved", "rejected"]},
    }).to_list(1000)
    kept_txn = {k.get("sumber_transaksi_id") for k in kept}

    txns = await db.recovery_achievement_details.find({"pic_id": pic_id, "periode": periode}).to_list(2000)
    new_rows = []
    for tx in txns:
        txid = str(tx["_id"])
        cash = tx.get("jumlah_recovery", 0)
        if tx.get("is_write_off"):
            if txid in kept_txn:
                continue
            new_rows.append(_mk_inc(pic_id, periode, "write_off", txid, INCENTIVE_RATES["write_off"], cash, actor))
            continue
        kol = tx.get("kolektibilitas")
        if kol == 4:
            rate = INCENTIVE_RATES["kol4_denda_penuh"] if tx.get("denda_dibayar_penuh") else INCENTIVE_RATES["kol4_denda_tidak"]
            if txid not in kept_txn:
                new_rows.append(_mk_inc(pic_id, periode, "kolektibilitas_4", txid, rate, cash, actor))
        elif kol == 5:
            rate = INCENTIVE_RATES["kol5_denda_penuh"] if tx.get("denda_dibayar_penuh") else INCENTIVE_RATES["kol5_denda_tidak"]
            if txid not in kept_txn:
                new_rows.append(_mk_inc(pic_id, periode, "kolektibilitas_5", txid, rate, cash, actor))

    # Kolektibilitas 3 aggregate incentive (needs target reached)
    kol3_kept = any(k["kategori"] == "kolektibilitas_3" for k in kept)
    if not kol3_kept:
        total_k3 = await sum_recovery_kol3(pic_id, periode)
        t = await get_target(pic_id, periode)
        target_r = t.get("target_recovery", 0)
        if target_r and total_k3 >= target_r:
            new_rows.append(_mk_inc(pic_id, periode, "kolektibilitas_3", None, INCENTIVE_RATES["kolektibilitas_3"], total_k3, actor))

    if new_rows:
        await db.incentive_settings.insert_many(new_rows)


def _mk_inc(ao_id, periode, kategori, txid, rate, base, actor):
    return {
        "ao_id": ao_id, "periode": periode, "kategori": kategori,
        "sumber_transaksi_id": txid,
        "jenis_perhitungan": "persentase", "nilai_persen": round(rate * 100, 2),
        "nilai_manual": None, "nominal_terhitung": round(rate * base, 2),
        "base_perhitungan": base,
        "status_approval": "pending", "diajukan_oleh": actor,
        "approved_by": None, "approved_at": None, "tanggal": now_iso(),
    }
