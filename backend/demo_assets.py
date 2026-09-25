"""Seed realistic demo assets across Indonesia for early testing. Run: python demo_assets.py"""
import asyncio, os, uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
now = lambda: datetime.now(timezone.utc).isoformat()
nid = lambda: str(uuid.uuid4())
U = lambda i: f"https://images.unsplash.com/photo-{i}?w=900"

IMGS = {
    "rumah1": [U("1580587771525-78b9dba3b914"), U("1568605114967-8130f3a36994"), U("1600585154340-be6161a56a0c"), U("1600566753190-17f0baa2a6c3"), U("1600607687939-ce8a6c25118c")],
    "rumah2": [U("1564013799919-ab600027ffc6"), U("1570129477492-45c003edd2be"), U("1600596542815-ffad4c1539a9"), U("1583608205776-bfd35f0d9f83")],
    "rumah3": [U("1512917774080-9991f1c4c750"), U("1605276374104-dee2a0ed3cd6"), U("1576941089067-2de3c901e126"), U("1600607687939-ce8a6c25118c")],
    "villa": [U("1613490493576-7fde63acd811"), U("1600047509807-ba8f99d2cdde"), U("1600210492486-724fe5c67fb0"), U("1512917774080-9991f1c4c750")],
    "ruko1": [U("1497366811353-6870744d04b2"), U("1524758631624-e2822e304c36"), U("1497366216548-37526070297c"), U("1486406146926-c627a92ad1ab")],
    "ruko2": [U("1517248135467-4c7edcad34c4"), U("1441986300917-64674bd600d8"), U("1555529669-e69e7aa0ba9a"), U("1497366216548-37526070297c")],
    "gedung": [U("1486406146926-c627a92ad1ab"), U("1497366811353-6870744d04b2"), U("1524758631624-e2822e304c36")],
    "gudang": [U("1586528116311-ad8dd3c8310d"), U("1553413077-190dd305871c"), U("1565610222536-ef125c59da2e"), U("1601598851547-4302969d0614")],
    "tanah1": [U("1500382017468-9049fed747ef"), U("1464822759023-fed622ff2c3b"), U("1470071459604-3b5ec3a7fe05"), U("1500530855697-b586d89ba3ee")],
    "tanah2": [U("1500382017468-9049fed747ef"), U("1470071459604-3b5ec3a7fe05"), U("1464822759023-fed622ff2c3b")],
    "kavling": [U("1500382017468-9049fed747ef"), U("1500530855697-b586d89ba3ee"), U("1464822759023-fed622ff2c3b"), U("1470071459604-3b5ec3a7fe05")],
    "sawah": [U("1555400038-63f5ba517a47"), U("1500937386664-56d1dfef3854"), U("1625246333195-78d9c38ad449"), U("1470071459604-3b5ec3a7fe05")],
    "kebun": [U("1536657464919-892534f60d6e"), U("1523348837708-15d4a09cfac2"), U("1500076656116-558758c991c1"), U("1555400038-63f5ba517a47")],
    "industri": [U("1553413077-190dd305871c"), U("1565610222536-ef125c59da2e"), U("1586528116311-ad8dd3c8310d")],
    "mpv": [U("1541899481282-d53bffe3c35d"), U("1550355291-bbee04a92027"), U("1552519507-da3b142c6e3d"), U("1494976388531-d1058494cdd8")],
    "suv": [U("1519641471654-76ce0107ad1b"), U("1533473359331-0135ef1b58bf"), U("1563720223185-11003d516935"), U("1502877338535-766e1452684a")],
    "sedan": [U("1616455579100-2ceaa4eb2d37"), U("1621007947382-bb3c3994e3fb"), U("1603386329225-868f9b1ee6c9"), U("1502877338535-766e1452684a")],
    "pickup": [U("1605893477799-b99e3b8b93fe"), U("1563720223185-11003d516935"), U("1519641471654-76ce0107ad1b")],
    "truck": [U("1591768793355-74d04bb6608f"), U("1605893477799-b99e3b8b93fe"), U("1553413077-190dd305871c")],
    "motor1": [U("1558981403-c5f9899a28bc"), U("1591637333184-19aa84b3e01f"), U("1568772585407-9361f9bf3a87"), U("1558981285-6f0c94958bb6")],
    "motor2": [U("1609630875171-b1321377ee65"), U("1591637333184-19aa84b3e01f"), U("1558981285-6f0c94958bb6")],
    "apart": [U("1545324418-cc1a3fa10c00"), U("1502672260266-1c1ef2d93688"), U("1522708323590-d24dbb6b0267"), U("1484154218962-a197022b5858"), U("1493809842364-78817add7ffb")],
    "apart2": [U("1560448204-e02f11c3d0e2"), U("1493809842364-78817add7ffb"), U("1502672260266-1c1ef2d93688"), U("1522708323590-d24dbb6b0267")],
}

# (judul, img, kategori, sub, alamat, provinsi, kab/kota, kecamatan, kelurahan, harga, LT, LB, kondisi, ACR, KPKNL|None, lat, lng, status, tanggal_lelang)
DEMO = [
    ("Rumah 2 Lantai Siap Huni", "rumah1", "PROPERTI", "Rumah", "Jl. Teuku Umar No. 12", "Aceh", "Kota Banda Aceh", "Baiturrahman", "Ateuk Pahlawan", 450_000_000, 120, 90, "Baik", "ACR BANDA ACEH", "KPKNL Banda Aceh", 5.5483, 95.3171, "PUBLISHED", "2026-07-15"),
    ("Rumah Minimalis Komplek Setia Budi", "rumah2", "PROPERTI", "Rumah", "Jl. Setia Budi Blok C No. 7", "Sumatera Utara", "Kota Medan", "Medan Selayang", "Tanjung Sari", 685_000_000, 150, 110, "Baik", "ACR MEDAN KOTA", "KPKNL Medan", 3.5586, 98.6300, "PUBLISHED", "2026-07-22"),
    ("Ruko Strategis Pusat Kota", "ruko1", "PROPERTI", "Ruko", "Jl. Perintis Kemerdekaan No. 8", "Sumatera Barat", "Kota Padang", "Padang Timur", "Simpang Haru", 780_000_000, 150, 200, "Baik", "ACR PADANG", "KPKNL Padang", -0.9492, 100.3743, "PUBLISHED", "2026-07-18"),
    ("Toyota Hilux Double Cabin 2020", "pickup", "KENDARAAN - Roda Empat", "Pickup", "Pool Kendaraan BSI Pekanbaru", "Riau", "Kota Pekanbaru", "Sukajadi", "Kampung Melayu", 285_000_000, None, None, "Baik", "ACR PEKANBARU", None, 0.5203, 101.4413, "PUBLISHED", None),
    ("Gudang Distribusi Akses Tol", "gudang", "PROPERTI", "Gudang", "Jl. Soekarno Hatta KM 9", "Sumatera Selatan", "Kota Palembang", "Sukarami", "Talang Betutu", 3_200_000_000, 1800, 1200, "Baik", "ACR PALEMBANG", "KPKNL Palembang", -2.9067, 104.7000, "PUBLISHED", "2026-08-05"),
    ("Sawah Produktif 2 Hektar", "sawah", "TANAH", "Sawah", "Dusun Rejomulyo, Jl. Raya Metro", "Lampung", "Kabupaten Lampung Tengah", "Trimurjo", "Simbarwaringin", 950_000_000, 20000, None, "Baik", "ACR BANDAR LAMPUNG", None, -5.0770, 105.2280, "PUBLISHED", None),
    ("Apartemen Full Furnished Kelapa Gading", "apart", "PROPERTI", "Apartemen", "Jl. Kelapa Gading Boulevard", "DKI Jakarta", "Kota Jakarta Utara", "Kelapa Gading", "Kelapa Gading Barat", 950_000_000, None, 42, "Baik", "ACR JAKARTA KELAPA GADING", "KPKNL Jakarta III", -6.1580, 106.9058, "PUBLISHED", "2026-07-30"),
    ("Rumah Mewah Pondok Indah", "villa", "PROPERTI", "Rumah", "Jl. Metro Pondok Indah Kav. 5", "DKI Jakarta", "Kota Jakarta Selatan", "Kebayoran Lama", "Pondok Pinang", 8_500_000_000, 450, 380, "Baik", "ACR JAKARTA PONDOK INDAH", "KPKNL Jakarta II", -6.2650, 106.7830, "PUBLISHED", "2026-08-12"),
    ("Honda CR-V Turbo 2021", "suv", "KENDARAAN - Roda Empat", "SUV", "Pool Kendaraan BSI Thamrin", "DKI Jakarta", "Kota Jakarta Pusat", "Menteng", "Gondangdia", 395_000_000, None, None, "Baik", "ACR JAKARTA THAMRIN", None, -6.1900, 106.8300, "PUBLISHED", None),
    ("Tanah Kavling Siap Bangun", "kavling", "TANAH", "Tanah Kavling", "Jl. Soekarno Hatta KM 5", "Jawa Barat", "Kota Bandung", "Kiaracondong", "Babakan Surabaya", 620_000_000, 300, None, "Baik", "ACR BANDUNG KOTA", "KPKNL Bandung", -6.9276, 107.6470, "PUBLISHED", "2026-07-25"),
    ("Ruko 3 Lantai Harapan Indah", "ruko2", "PROPERTI", "Ruko", "Jl. Boulevard Harapan Indah Blok A2", "Jawa Barat", "Kota Bekasi", "Medan Satria", "Pejuang", 1_450_000_000, 90, 240, "Baik", "ACR BEKASI", None, -6.1750, 106.9800, "PUBLISHED", None),
    ("Tanah Kosong Pinggir Jalan Raya", "tanah1", "TANAH", "Tanah Kosong", "Jl. Raya Puncak KM 72", "Jawa Barat", "Kabupaten Bogor", "Cisarua", "Tugu Utara", 1_100_000_000, 1500, None, "Baik", "ACR BOGOR", "KPKNL Bogor", -6.6980, 106.9400, "PUBLISHED", "2026-08-20"),
    ("Rumah Klasik Candi Baru", "rumah3", "PROPERTI", "Rumah", "Jl. Sultan Agung No. 21", "Jawa Tengah", "Kota Semarang", "Gajahmungkur", "Gajahmungkur", 1_750_000_000, 320, 250, "Cukup", "ACR SEMARANG KOTA", None, -7.0100, 110.4100, "PUBLISHED", None),
    ("Yamaha NMAX 155 2022", "motor2", "KENDARAAN - Roda Dua", "Motor Matic", "Kantor ACR Solo", "Jawa Tengah", "Kota Surakarta", "Laweyan", "Sondakan", 24_500_000, None, None, "Baik", "ACR SOLO", "KPKNL Surakarta", -7.5650, 110.7950, "PUBLISHED", "2026-07-10"),
    ("Tanah Kavling Perumahan Sleman", "tanah2", "TANAH", "Tanah Kavling", "Jl. Kaliurang KM 10", "DI Yogyakarta", "Kabupaten Sleman", "Ngaglik", "Sardonoharjo", 480_000_000, 250, None, "Baik", "ACR YOGYAKARTA", None, -7.7100, 110.4000, "PUBLISHED", None),
    ("Gedung Kantor 4 Lantai Darmo", "gedung", "PROPERTI", "Gedung", "Jl. Raya Darmo No. 88", "Jawa Timur", "Kota Surabaya", "Wonokromo", "Darmo", 12_000_000_000, 800, 2400, "Baik", "ACR SURABAYA KOTA", "KPKNL Surabaya", -7.2900, 112.7380, "PUBLISHED", "2026-09-02"),
    ("Kebun Jeruk Produktif Dau", "kebun", "TANAH", "Tanah Kosong", "Desa Selorejo, Dau", "Jawa Timur", "Kabupaten Malang", "Dau", "Selorejo", 1_350_000_000, 15000, None, "Baik", "ACR MALANG", None, -7.9200, 112.5600, "PUBLISHED", None),
    ("Mitsubishi Fuso Canter 2019", "truck", "KENDARAAN - Roda Empat", "Truck", "Pool Kendaraan BSI Jember", "Jawa Timur", "Kabupaten Jember", "Kaliwates", "Kepatihan", 265_000_000, None, None, "Cukup", "ACR JEMBER", "KPKNL Jember", -8.1720, 113.6990, "PUBLISHED", "2026-07-28"),
    ("Villa View Sawah Canggu", "villa", "PROPERTI", "Rumah", "Jl. Pantai Berawa No. 45", "Bali", "Kabupaten Badung", "Kuta Utara", "Tibubeneng", 4_750_000_000, 500, 320, "Baik", "ACR DENPASAR", "KPKNL Denpasar", -8.6480, 115.1380, "PUBLISHED", "2026-08-15"),
    ("Toyota Avanza 2019 Terawat", "mpv", "KENDARAAN - Roda Empat", "MPV", "Gudang Lelang Balikpapan", "Kalimantan Timur", "Kota Balikpapan", "Balikpapan Kota", "Klandasan Ulu", 145_000_000, None, None, "Baik", "ACR BALIKPAPAN", "KPKNL Balikpapan", -1.2675, 116.8289, "PUBLISHED", "2026-07-15"),
    ("Tanah Industri Kawasan Liang Anggang", "industri", "TANAH", "Tanah Industri", "Jl. A. Yani KM 23", "Kalimantan Selatan", "Kota Banjarbaru", "Liang Anggang", "Landasan Ulin Barat", 2_600_000_000, 8000, None, "Baik", "ACR BANJARMASIN", None, -3.4400, 114.7600, "PUBLISHED", None),
    ("Honda Vario 150 2021", "motor1", "KENDARAAN - Roda Dua", "Motor Matic", "Kantor ACR Makassar", "Sulawesi Selatan", "Kota Makassar", "Panakkukang", "Masale", 18_500_000, None, None, "Baik", "ACR MAKASSAR", "KPKNL Makassar", -5.1447, 119.4459, "PUBLISHED", "2026-07-20"),
    ("Apartemen Studio Tamansari Manado", "apart2", "PROPERTI", "Apartemen", "Jl. Piere Tendean Boulevard", "Sulawesi Utara", "Kota Manado", "Wenang", "Wenang Selatan", 520_000_000, None, 28, "Baik", "ACR MANADO", None, 1.4850, 124.8400, "PUBLISHED", None),
    ("Honda Civic Turbo 2020 (TERJUAL)", "sedan", "KENDARAAN - Roda Empat", "Sedan", "Pool Kendaraan BSI Fatmawati", "DKI Jakarta", "Kota Jakarta Selatan", "Cilandak", "Cilandak Barat", 385_000_000, None, None, "Baik", "ACR JAKARTA FATMAWATI", "KPKNL Jakarta II", -6.2900, 106.7970, "SOLD", "2026-05-20"),
    ("Rumah Cluster Citra Garden (TERJUAL)", "rumah2", "PROPERTI", "Rumah", "Jl. Citra Garden 6 Blok D5", "DKI Jakarta", "Kota Jakarta Barat", "Kalideres", "Tegal Alur", 1_250_000_000, 120, 140, "Baik", "ACR JAKARTA BARAT", "KPKNL Jakarta I", -6.1300, 106.7100, "SOLD", "2026-06-03"),
]

import random
from datetime import timedelta
PRICE_DROPS = {"Rumah 2 Lantai Siap Huni": 0.12, "Toyota Hilux Double Cabin 2020": 0.08, "Ruko 3 Lantai Harapan Indah": 0.15,
               "Tanah Kavling Perumahan Sleman": 0.10, "Villa View Sawah Canggu": 0.06, "Honda CR-V Turbo 2021": 0.07}

def seed_history(judul, harga):
    t = datetime.now(timezone.utc)
    if judul in PRICE_DROPS:
        old = round(harga / (1 - PRICE_DROPS[judul]), -6)
        return [{"harga": old, "at": (t - timedelta(days=35)).isoformat()}, {"harga": harga, "at": (t - timedelta(days=random.randint(1, 6))).isoformat()}]
    return [{"harga": harga, "at": (t - timedelta(days=40)).isoformat()}]

async def main():
    await db.assets.delete_many({"demo": True})
    await db.asset_images.delete_many({"demo": True})
    await db.master_asset_category.delete_many({"nama_category": "TEST_KATEGORI"})
    for i, (judul, imgkey, cat, sub, alamat, prov, kab, kec, kel, harga, lt, lb, kondisi, acr_nama, kpknl_nama, lat, lng, status, tgl) in enumerate(DEMO, 1):
        acr = await db.master_acr.find_one({"nama_acr": acr_nama})
        acrm = await db.master_acrm.find_one({"id_acr": acr["id"]})
        ma = await db.master_marketing_asset.find_one({"id_acr": acr["id"], "data_flag": "OK"}) or await db.master_marketing_asset.find_one({"id_acr": acr["id"]})
        catdoc = await db.master_asset_category.find_one({"nama_category": cat, "parent_category_id": None})
        subdoc = await db.master_asset_category.find_one({"nama_category": sub, "parent_category_id": catdoc["id"]})
        aid = nid()
        num = f"BLC-2026-{acr['identifier']}-{str(i).zfill(6)}"
        schedule = {}
        if kpknl_nama:
            kpknl = await db.master_kpknl.find_one({"nama_kpknl": kpknl_nama})
            schedule = {"tanggal_lelang": tgl, "id_kpknl": kpknl["id"], "status_jadwal": "SUDAH ADA JADWAL"}
        judul_clean = judul.replace(" (TERJUAL)", "")
        await db.assets.insert_one({
            "id": aid, "nomor_asset": num, "id_marketing_asset": ma["id"], "id_acr": acr["id"],
            "id_acrm": acrm["id"], "acr_nama": acr["nama_acr"], "acrm_nama": acrm["nama_acrm"],
            "pic_nama": ma["nama_marketing_asset"], "pic_hp": ma["nomor_hp"],
            "judul_asset": judul_clean,
            "deskripsi": f"{judul_clean}. Aset lelang milik BSI dalam kondisi {kondisi.lower()}. Berlokasi di {kec}, {kab}, {prov}. Lokasi strategis dan mudah dijangkau. Hubungi PIC untuk informasi lebih lanjut dan jadwal survey.",
            "id_category": catdoc["id"], "id_subcategory": subdoc["id"],
            "alamat": alamat, "provinsi": prov, "kabupaten_kota": kab, "kecamatan": kec,
            "wilayah_level_4": kel, "tipe_wilayah": "Kelurahan", "latitude": lat, "longitude": lng,
            "luas_tanah": lt, "luas_bangunan": lb, "kondisi_asset": kondisi,
            "harga_limit": harga, "nilai_appraisal": harga * 1.1 if harga else None, "extra": {},
            "status": status, "public_ready": True, "current_version_no": 1,
            "schedule": schedule, "correction_notes": None, "published_at": now(),
            "sold_at": now() if status == "SOLD" else None,
            "price_history": seed_history(judul_clean, harga),
            "stats": {"views": random.randint(20, 400), "wa_clicks": random.randint(0, 25)},
            "demo": True, "created_at": now(), "updated_at": now(), "deleted_at": None})
        for url in IMGS[imgkey]:
            await db.asset_images.insert_one({"id": nid(), "id_asset": aid, "url": url,
                "storage_path": None, "jenis_foto": "utama", "is_public": True,
                "uploaded_by": None, "demo": True, "created_at": now(), "deleted_at": None})
    print("demo assets:", await db.assets.count_documents({"demo": True}))

asyncio.run(main())
