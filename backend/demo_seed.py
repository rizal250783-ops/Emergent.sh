import random
from datetime import datetime

from database import db, now_iso
from calc import recompute_collection_incentives

AKAD = ["Murabahah", "Musyarakah", "MMQ", "Rahn"]
SIMPANAN = ["Tabungan", "Deposito"]
NAMES = ["Andi", "Budi", "Citra", "Dewi", "Eka", "Fajar", "Gita", "Hadi", "Indra", "Joko",
         "Kartika", "Lestari", "Maya", "Nanda", "Oscar", "Putri", "Qori", "Rina", "Sari", "Tono"]
PERIODES = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]


async def seed_demo():
    if await db.lending_achievement_details.count_documents({}) > 0:
        return
    users = await db.users.find().to_list(100)
    pembiayaan = [u for u in users if u["jabatan"] == "AO Pembiayaan"]
    funding = [u for u in users if u["jabatan"] == "AO Funding"]
    collection = [u for u in users if u["jabatan"] == "Collection & Remedial"]

    admin = next((u for u in users if u["jabatan"] == "Admin"), None)
    admin_kode = admin["kode_marketing"] if admin else "002"

    targets, lend, fund, rec = [], [], [], []

    def day(periode):
        return f"{periode}-{random.randint(1, 28):02d}"

    for p in PERIODES:
        for u in pembiayaan:
            uid = str(u["_id"])
            tp = random.choice([300, 400, 500, 600]) * 1_000_000
            tf = random.choice([150, 200, 250]) * 1_000_000
            targets.append({"ao_id": uid, "periode": p, "target_pencairan": tp, "target_funding": tf,
                            "target_recovery": 0, "updated_by": admin_kode, "updated_at": now_iso()})
            for _ in range(random.randint(2, 5)):
                lend.append({"nomor_kontrak": f"PBY-{p[:4]}{p[5:]}-{random.randint(1000,9999)}",
                             "jenis_akad": random.choice(AKAD), "nama_nasabah": random.choice(NAMES) + " " + random.choice(NAMES),
                             "jumlah_pencairan": random.choice([80, 100, 120, 150, 200]) * 1_000_000,
                             "tanggal_pencairan": day(p), "ao_id": uid, "periode": p, "input_by": admin_kode, "created_at": now_iso()})
            for _ in range(random.randint(1, 4)):
                fund.append({"nama_nasabah": random.choice(NAMES) + " " + random.choice(NAMES), "jenis_simpanan": random.choice(SIMPANAN),
                             "jumlah_simpanan": random.choice([50, 60, 80, 100]) * 1_000_000, "tanggal": day(p),
                             "ao_id": uid, "periode": p, "input_by": admin_kode, "created_at": now_iso()})
        for u in funding:
            uid = str(u["_id"])
            tf = random.choice([300, 400, 500]) * 1_000_000
            targets.append({"ao_id": uid, "periode": p, "target_pencairan": 0, "target_funding": tf,
                            "target_recovery": 0, "updated_by": admin_kode, "updated_at": now_iso()})
            for _ in range(random.randint(3, 6)):
                fund.append({"nama_nasabah": random.choice(NAMES) + " " + random.choice(NAMES), "jenis_simpanan": random.choice(SIMPANAN),
                             "jumlah_simpanan": random.choice([60, 80, 100, 150]) * 1_000_000, "tanggal": day(p),
                             "ao_id": uid, "periode": p, "input_by": admin_kode, "created_at": now_iso()})
        for u in collection:
            uid = str(u["_id"])
            tr = random.choice([100, 150, 200]) * 1_000_000
            targets.append({"ao_id": uid, "periode": p, "target_pencairan": 0, "target_funding": 0,
                            "target_recovery": tr, "updated_by": admin_kode, "updated_at": now_iso()})
            for _ in range(random.randint(2, 4)):
                kol = random.choice([3, 3, 4, 5])
                wo = random.random() < 0.12
                rec.append({"nomor_kontrak": f"REC-{p[:4]}{p[5:]}-{random.randint(1000,9999)}",
                            "nama_nasabah": random.choice(NAMES) + " " + random.choice(NAMES),
                            "jumlah_recovery": random.choice([20, 30, 40, 50, 70]) * 1_000_000, "tanggal": day(p),
                            "kolektibilitas": kol, "denda_dibayar_penuh": (random.random() < 0.5) if kol in (4, 5) and not wo else None,
                            "is_write_off": wo, "pic_id": uid, "periode": p, "input_by": admin_kode, "created_at": now_iso()})

    if targets:
        await db.targets.insert_many(targets)
    if lend:
        await db.lending_achievement_details.insert_many(lend)
    if fund:
        await db.funding_achievement_details.insert_many(fund)
    if rec:
        await db.recovery_achievement_details.insert_many(rec)

    # recompute incentives for each collection PIC per periode
    for p in PERIODES:
        for u in collection:
            await recompute_collection_incentives(str(u["_id"]), p, admin_kode)
