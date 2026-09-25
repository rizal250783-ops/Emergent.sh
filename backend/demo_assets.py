import asyncio, os, uuid, re
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv('.env')

db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]

def now(): return datetime.now(timezone.utc).isoformat()
def nid(): return str(uuid.uuid4())

IMGS = {
    "rumah": ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900", "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900"],
    "ruko": ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=900"],
    "tanah": ["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=900"],
    "mobil": ["https://images.unsplash.com/photo-1550355291-bbee04a92027?w=900", "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=900"],
    "motor": ["https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=900"],
    "apart": ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900"],
}

DEMO = [
    ("Rumah 2 Lantai Siap Huni", "rumah", "PROPERTI", "Rumah", "Jl. Teuku Umar No. 12", "Nangroe Aceh Darussalam", "Kota Banda Aceh", "Baiturrahman", "Ateuk Pahlawan", 450000000, 120, 90, "Baik", "ACR BANDA ACEH", True),
    ("Ruko Strategis Pusat Kota", "ruko", "PROPERTI", "Ruko", "Jl. Perintis Kemerdekaan No. 8", "Sumatera Barat", "Kota Padang", "Padang Timur", "Simpang Haru", 780000000, 150, 200, "Baik", "ACR PADANG", True),
    ("Tanah Kavling Siap Bangun", "tanah", "TANAH", "Tanah Kavling", "Jl. Soekarno Hatta KM 5", "Jawa Barat", "Kota Bandung", "Kiaracondong", "Babakan Surabaya", 620000000, 300, None, "Baik", "ACR BANDUNG KOTA", True),
    ("Toyota Avanza 2019 Terawat", "mobil", "KENDARAAN - Roda Empat", "MPV", "Gudang Lelang Balikpapan", "Kalimantan Timur", "Kota Balikpapan", "Balikpapan Kota", "Klandasan", 145000000, None, None, "Baik", "ACR BALIKPAPAN", True),
    ("Apartemen Full Furnished", "apart", "PROPERTI", "Apartemen", "Jl. Kelapa Gading Boulevard", "DKI Jakarta", "Kota Jakarta Utara", "Kelapa Gading", "Kelapa Gading Barat", 950000000, None, 42, "Baik", "ACR JAKARTA KELAPA GADING", True),
    ("Honda Vario 150 2021", "motor", "KENDARAAN - Roda Dua", "Motor Matic", "Kantor ACR Makassar", "Sulawesi Selatan", "Kota Makassar", "Panakkukang", "Masale", 18500000, None, None, "Baik", "ACR MAKASSAR", True),
]

async def main():
    # clear previous demo
    await db.assets.delete_many({"demo": True})
    await db.asset_images.delete_many({"demo": True})
    kpknl = await db.master_kpknl.find_one({"nama_kpknl": "KPKNL Banda Aceh"})
    for i, (judul, imgkey, cat, sub, alamat, prov, kab, kec, kel, harga, lt, lb, kondisi, acr_nama, sched) in enumerate(DEMO, 1):
        acr = await db.master_acr.find_one({"nama_acr": acr_nama})
        acrm = await db.master_acrm.find_one({"id_acr": acr["id"]})
        ma = await db.master_marketing_asset.find_one({"id_acr": acr["id"], "data_flag": "OK"})
        catdoc = await db.master_asset_category.find_one({"nama_category": cat, "parent_category_id": None})
        subdoc = await db.master_asset_category.find_one({"nama_category": sub, "parent_category_id": catdoc["id"]})
        aid = nid()
        num = f"BLC-2026-{acr['identifier']}-{str(i).zfill(6)}"
        schedule = {}
        if sched:
            schedule = {"tanggal_lelang": "2026-07-15", "id_kpknl": kpknl["id"], "status_jadwal": "SUDAH ADA JADWAL"}
        await db.assets.insert_one({
            "id": aid, "nomor_asset": num, "id_marketing_asset": ma["id"], "id_acr": acr["id"],
            "id_acrm": acrm["id"], "acr_nama": acr["nama_acr"], "acrm_nama": acrm["nama_acrm"],
            "pic_nama": ma["nama_marketing_asset"], "pic_hp": ma["nomor_hp"],
            "judul_asset": judul, "deskripsi": f"{judul}. Aset lelang milik BSI dalam kondisi {kondisi}. Lokasi strategis dan mudah dijangkau. Hubungi PIC untuk informasi lebih lanjut dan jadwal survey.",
            "id_category": catdoc["id"], "id_subcategory": subdoc["id"],
            "alamat": alamat, "provinsi": prov, "kabupaten_kota": kab, "kecamatan": kec,
            "wilayah_level_4": kel, "tipe_wilayah": "Kelurahan",
            "luas_tanah": lt, "luas_bangunan": lb, "kondisi_asset": kondisi,
            "harga_limit": harga, "nilai_appraisal": harga * 1.1 if harga else None, "extra": {},
            "status": "PUBLISHED", "public_ready": True, "current_version_no": 1,
            "schedule": schedule, "correction_notes": None, "published_at": now(),
            "demo": True, "created_at": now(), "updated_at": now(), "deleted_at": None})
        for url in IMGS[imgkey]:
            await db.asset_images.insert_one({"id": nid(), "id_asset": aid, "url": url,
                "storage_path": None, "jenis_foto": "utama", "is_public": True,
                "uploaded_by": None, "demo": True, "created_at": now(), "deleted_at": None})
    print("demo assets:", await db.assets.count_documents({"demo": True}))

asyncio.run(main())
