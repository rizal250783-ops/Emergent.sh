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
    # Iteration 9: verified realistic photos for new asset types
    "kos": [U("1523217582562-09d0def993a6"), U("1605146769289-440113cc3d00"), U("1574362848149-11496d93a7c7"), U("1554995207-c18c203602cb")],
    "toko": [U("1567958451986-2de427a4a0be"), U("1571902943202-507ec2618e8f"), U("1524758631624-e2822e304c36"), U("1497366216548-37526070297c")],
    "sawit": [U("1560493676-04071c5f467b"), U("1592982537447-7440770cbfc9"), U("1500382017468-9049fed747ef"), U("1470071459604-3b5ec3a7fe05")],
    "kopi": [U("1595981267035-7b04ca84a82d"), U("1500937386664-56d1dfef3854"), U("1625246333195-78d9c38ad449")],
    "gudang2": [U("1578575437130-527eed3abbec"), U("1620200423727-8127f75d7f53"), U("1553413077-190dd305871c"), U("1586528116311-ad8dd3c8310d")],
    "bus": [U("1570125909232-eb263c188f7e"), U("1544620347-c4fd4a3d5957")],
    "motorbebek": [U("1568772585407-9361f9bf3a87"), U("1558981359-219d6364c9c8")],
    "motorsport": [U("1558981403-c5f9899a28bc"), U("1591637333184-19aa84b3e01f"), U("1609630875171-b1321377ee65")],
    "mpv2": [U("1592805144716-feeccccef5ac"), U("1533473359331-0135ef1b58bf"), U("1502877338535-766e1452684a")],
    "sedan2": [U("1494976388531-d1058494cdd8"), U("1552519507-da3b142c6e3d"), U("1603386329225-868f9b1ee6c9")],
    "rumah4": [U("1600585154340-be6161a56a0c"), U("1600607687939-ce8a6c25118c"), U("1600566753190-17f0baa2a6c3")],
    "tanah3": [U("1500530855697-b586d89ba3ee"), U("1500076656116-558758c991c1"), U("1500382017468-9049fed747ef")],
    "apart3": [U("1522708323590-d24dbb6b0267"), U("1545324418-cc1a3fa10c00"), U("1493809842364-78817add7ffb")],
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
    # Iteration 9: +20 assets so all 45 ACR are represented, varied types / schedule / sold
    ("Toko Kelontong & ATK Pasar Cunda", "toko", "PROPERTI", "Ruko", "Jl. Medan-Banda Aceh No. 45", "Aceh", "Kota Lhokseumawe", "Banda Sakti", "Kota Hulu", 540_000_000, 96, 120, "Baik", "ACR LHOKSEUMAWE", "KPKNL Lhokseumawe", 5.1801, 97.1507, "PUBLISHED", "2026-08-08"),
    ("Kos-Kosan 12 Kamar Dekat Kampus", "kos", "PROPERTI", "Rumah", "Jl. Cumpleng Gampong Paya", "Aceh", "Kabupaten Aceh Barat", "Johan Pahlawan", "Suak Sigadeng", 1_150_000_000, 400, 280, "Baik", "ACR MEULABOH", None, 4.1440, 96.1269, "PUBLISHED", None),
    ("Ruko 2 Lantai Nagoya Business Center", "ruko2", "PROPERTI", "Ruko", "Komplek Nagoya Business Center Blok F", "Kepulauan Riau", "Kota Batam", "Lubuk Baja", "Lubuk Baja Kota", 2_300_000_000, 80, 160, "Baik", "ACR BATAM", "KPKNL Batam", 1.1301, 104.0529, "PUBLISHED", "2026-07-27"),
    ("Gudang Bekas Bengkel Tembung", "gudang2", "PROPERTI", "Gudang", "Jl. Letda Sujono No. 210", "Sumatera Utara", "Kota Medan", "Medan Tembung", "Tembung", 980_000_000, 850, 620, "Cukup", "ACR MEDAN RAYA", None, 3.6290, 98.7180, "PUBLISHED", None),
    ("Rumah Tinggal Asri Siantar Utara", "rumah4", "PROPERTI", "Rumah", "Jl. Melanthon Siregar No. 18", "Sumatera Utara", "Kota Pematangsiantar", "Siantar Utara", "Kahean", 465_000_000, 210, 150, "Baik", "ACR PEMATANGSIANTAR", "KPKNL Pematang Siantar", 2.9594, 99.0600, "PUBLISHED", "2026-08-14"),
    ("Kebun Sawit Produktif 5 Hektar", "sawit", "TANAH", "Tanah Kosong", "Jl. Lintas Bengkulu-Mukomuko KM 12", "Bengkulu", "Kota Bengkulu", "Kampung Melayu", "Sawah Lebar Baru", 875_000_000, 50000, None, "Baik", "ACR BENGKULU", "KPKNL Bengkulu", -3.8004, 102.2655, "PUBLISHED", "2026-08-10"),
    ("Suzuki Ertiga GL 2021", "mpv2", "KENDARAAN - Roda Empat", "MPV", "Kantor ACR Jambi", "Jambi", "Kota Jambi", "Pasar Jambi", "Sungai Asam", 168_000_000, None, None, "Baik", "ACR JAMBI", None, -1.6101, 103.6131, "PUBLISHED", None),
    ("Rumah Tropis Minimalis Serang Utara", "rumah3", "PROPERTI", "Rumah", "Jl. Raya Cilegon KM 4 No. 33", "Banten", "Kota Serang", "Serang", "Cimuncang", 890_000_000, 180, 160, "Baik", "ACR BANTEN", "KPKNL Serang", -6.1214, 106.2003, "PUBLISHED", "2026-07-24"),
    ("Apartemen 2BR Dekat Kampus UI", "apart3", "PROPERTI", "Apartemen", "Jl. KH Agus Salim No. 10", "Jawa Barat", "Kota Depok", "Beji", "Kemiri Muka", 610_000_000, None, 48, "Baik", "ACR DEPOK", None, -6.4025, 106.7942, "PUBLISHED", None),
    ("Tanah Pekarangan Siap Bangun Bintaro", "tanah3", "TANAH", "Tanah Kosong", "Jl. Bintaro Raya Sektor 3", "Banten", "Kota Tangerang Selatan", "Pondok Aren", "Pondok Karya", 1_600_000_000, 320, None, "Baik", "ACR TANGERANG SELATAN", "KPKNL Tangerang II", -6.2885, 106.7177, "PUBLISHED", "2026-08-18"),
    ("Kebun Kopi Arabika 3 Hektar Cikajang", "kopi", "TANAH", "Tanah Kosong", "Kampung Cipicung, Desa Cikajang", "Jawa Barat", "Kabupaten Garut", "Cikajang", "Margamulya", 1_900_000_000, 30000, None, "Baik", "ACR BANDUNG RAYA", None, -7.3862, 107.7070, "PUBLISHED", None),
    ("Isuzu Elf Minibus 2018 (TERJUAL)", "bus", "KENDARAAN - Roda Empat", "Bus", "Pool Kendaraan BSI Cirebon", "Jawa Barat", "Kota Cirebon", "Harjamukti", "Kalijaga", 210_000_000, None, None, "Cukup", "ACR CIREBON", "KPKNL Cirebon", -6.7320, 108.5523, "SOLD", "2026-06-15"),
    ("Tanah Kavling Hook Perumahan Pekalongan", "kavling", "TANAH", "Tanah Kavling", "Jl. Pangeran Diponegoro No. 51", "Jawa Tengah", "Kota Pekalongan", "Pekalongan Utara", "Krapyak", 425_000_000, 190, None, "Baik", "ACR PEKALONGAN", "KPKNL Pekalongan", -6.8886, 109.6753, "PUBLISHED", "2026-08-01"),
    ("Rumah 1.5 Lantai Purbalingga", "rumah1", "PROPERTI", "Rumah", "Jl. A. Yani No. 77", "Jawa Tengah", "Kabupaten Purbalingga", "Purbalingga", "Penambongan", 375_000_000, 140, 110, "Baik", "ACR PURWOKERTO", None, -7.3906, 109.3638, "PUBLISHED", None),
    ("Gudang Distribusi Banjaran Kediri", "gudang", "PROPERTI", "Gudang", "Jl. Erlangga No. 5", "Jawa Timur", "Kota Kediri", "Kediri Kota", "Banjaran", 1_150_000_000, 950, 700, "Baik", "ACR KEDIRI", None, -7.8166, 112.0118, "PUBLISHED", None),
    ("Honda Supra X 125 2020", "motorbebek", "KENDARAAN - Roda Dua", "Motor Bebek", "Kantor ACR Surabaya Raya", "Jawa Timur", "Kota Surabaya", "Tegalsari", "Dr. Sutomo", 16_500_000, None, None, "Baik", "ACR SURABAYA RAYA", "KPKNL Surabaya", -7.2742, 112.7400, "PUBLISHED", "2026-07-21"),
    ("Toko Sembako Jl. Tanjungpura", "toko", "PROPERTI", "Ruko", "Jl. Tanjungpura No. 201", "Kalimantan Barat", "Kota Pontianak", "Pontianak Selatan", "Benua Melayu Darat", 760_000_000, 120, 180, "Baik", "ACR PONTIANAK", None, -0.0263, 109.3425, "PUBLISHED", None),
    ("Kos-Kosan Mahasiswa Dekat Untad", "kos", "PROPERTI", "Rumah", "Jl. Soekarno Hatta No. 112", "Sulawesi Tengah", "Kota Palu", "Palu Timur", "Besusu Barat", 1_400_000_000, 600, 450, "Baik", "ACR PALU", "KPKNL Palu", -0.8917, 119.8707, "PUBLISHED", "2026-08-07"),
    ("Mitsubishi Xpander Cross 2022", "suv", "KENDARAAN - Roda Empat", "SUV", "Pool Kendaraan BSI Rawamangun", "DKI Jakarta", "Kota Jakarta Timur", "Pulogadung", "Jati", 265_000_000, None, None, "Baik", "ACR JAKARTA RAWAMANGUN", None, -6.1915, 106.9028, "PUBLISHED", None),
    ("Yamaha R15 V4 2023 (TERJUAL)", "motorsport", "KENDARAAN - Roda Dua", "Motor Sport", "Kantor ACR Saharjo", "DKI Jakarta", "Kota Jakarta Selatan", "Tebet", "Tebet Barat", 32_000_000, None, None, "Baik", "ACR JAKARTA SAHARJO", "KPKNL Jakarta I", -6.2296, 106.8538, "SOLD", "2026-06-28"),
]

import random
from datetime import timedelta
PRICE_DROPS = {"Rumah 2 Lantai Siap Huni": 0.12, "Toyota Hilux Double Cabin 2020": 0.08, "Ruko 3 Lantai Harapan Indah": 0.15,
               "Tanah Kavling Perumahan Sleman": 0.10, "Villa View Sawah Canggu": 0.06, "Honda CR-V Turbo 2021": 0.07,
               "Rumah Tropis Minimalis Serang Utara": 0.09, "Kos-Kosan Mahasiswa Dekat Untad": 0.11, "Tanah Pekarangan Siap Bangun Bintaro": 0.05}

def seed_history(judul, harga):
    t = datetime.now(timezone.utc)
    if judul in PRICE_DROPS:
        old = round(harga / (1 - PRICE_DROPS[judul]), -6)
        return [{"harga": old, "at": (t - timedelta(days=35)).isoformat()}, {"harga": harga, "at": (t - timedelta(days=random.randint(1, 6))).isoformat()}]
    return [{"harga": harga, "at": (t - timedelta(days=40)).isoformat()}]

async def seed_demo_assets(db, force=False):
    """Idempotent: seed demo assets only when none exist (or force=True)."""
    if not force and await db.assets.count_documents({"demo": True, "deleted_at": None}) > 0:
        return 0
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
    n = await db.assets.count_documents({"demo": True})
    print("demo assets:", n)
    return n

if __name__ == "__main__":
    asyncio.run(seed_demo_assets(db, force=True))
