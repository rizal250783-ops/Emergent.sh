"""Iteration 16 tests:
- Bug 1: Marketing Asset can create/update DRAFT asset with nilai_appraisal=null (field removed on frontend).
- Confirm the created draft appears in /assets/mine.
- Public catalog detail available for gallery testing.
"""
import os
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
MA_USER = "2190020284"
PWD = "BSI@2026"


@pytest.fixture(scope="module")
def ma_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": MA_USER, "password": PWD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(ma_token):
    return {"Authorization": f"Bearer {ma_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def category_ids():
    r = requests.get(f"{BASE_URL}/api/master/categories", timeout=30)
    assert r.status_code == 200
    cats = r.json()
    parent = next(c for c in cats if c["nama_category"] == "PROPERTI")
    sub = parent["subcategories"][0]
    return parent["id"], sub["id"]


# --- Create draft with nilai_appraisal=null ---
def test_create_draft_no_appraisal(headers, category_ids):
    cat_id, sub_id = category_ids
    payload = {
        "judul_asset": "TEST_iter16 no appraisal",
        "deskripsi": "Draft asset without nilai_appraisal",
        "id_category": cat_id, "id_subcategory": sub_id,
        "alamat": "TEST alamat", "provinsi": "DKI JAKARTA", "kabupaten_kota": "JAKARTA PUSAT",
        "kecamatan": "MENTENG", "wilayah_level_4": "MENTENG", "tipe_wilayah": "Kelurahan",
        "latitude": -6.2, "longitude": 106.8166,
        "luas_tanah": 100, "luas_bangunan": 80,
        "kondisi_asset": "Baik",
        "nilai_appraisal": None,
        "harga_limit": 500000000,
        "extra": {},
    }
    r = requests.post(f"{BASE_URL}/api/assets", headers=headers, json=payload, timeout=30)
    assert r.status_code in (200, 201), r.text
    created = r.json()
    assert created.get("id")
    assert created.get("nilai_appraisal") in (None, 0)
    assert created.get("harga_limit") == 500000000
    pytest.asset_id = created["id"]


def test_get_created_asset(headers):
    aid = pytest.asset_id
    r = requests.get(f"{BASE_URL}/api/assets/{aid}", headers=headers, timeout=30)
    assert r.status_code == 200
    a = r.json()
    assert a["id"] == aid
    assert a.get("nilai_appraisal") in (None, 0)
    assert a["status"] == "DRAFT"


def test_update_asset_still_null_appraisal(headers):
    aid = pytest.asset_id
    r = requests.get(f"{BASE_URL}/api/assets/{aid}", headers=headers, timeout=30)
    body = r.json()
    payload = {
        "judul_asset": body["judul_asset"] + " (upd)",
        "deskripsi": body["deskripsi"],
        "id_category": body["id_category"], "id_subcategory": body.get("id_subcategory"),
        "alamat": body["alamat"], "provinsi": body["provinsi"], "kabupaten_kota": body["kabupaten_kota"],
        "kecamatan": body["kecamatan"], "wilayah_level_4": body["wilayah_level_4"], "tipe_wilayah": body["tipe_wilayah"],
        "latitude": body["latitude"], "longitude": body["longitude"],
        "luas_tanah": body["luas_tanah"], "luas_bangunan": body["luas_bangunan"],
        "kondisi_asset": body["kondisi_asset"],
        "nilai_appraisal": None,
        "harga_limit": 480000000,
        "extra": body.get("extra") or {},
    }
    r = requests.put(f"{BASE_URL}/api/assets/{aid}", headers=headers, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    r2 = requests.get(f"{BASE_URL}/api/assets/{aid}", headers=headers, timeout=30)
    a = r2.json()
    assert a["harga_limit"] == 480000000
    assert a.get("nilai_appraisal") in (None, 0)


def test_appears_in_mine(headers):
    r = requests.get(f"{BASE_URL}/api/assets/mine", headers=headers, timeout=30)
    assert r.status_code == 200
    ids = [x["id"] for x in r.json()]
    assert pytest.asset_id in ids


# --- Public catalog: fetch an asset with images for gallery testing ---
def test_public_catalog_has_images():
    r = requests.get(f"{BASE_URL}/api/public/catalog", timeout=30)
    assert r.status_code == 200
    payload = r.json()
    items = payload if isinstance(payload, list) else payload.get("items", [])
    assert len(items) > 0
    # Find one with multiple images
    for it in items:
        r2 = requests.get(f"{BASE_URL}/api/public/catalog/{it['id']}", timeout=30)
        if r2.status_code == 200:
            d = r2.json()
            if d.get("images") and len(d["images"]) >= 2:
                pytest.public_asset_id = it["id"]
                pytest.public_image_count = len(d["images"])
                return
    pytest.skip("No public asset with 2+ images found")


# --- Cleanup: request delete then approve? MA can only request delete on PUBLISHED.
# For DRAFT, marketing does not have a direct delete route. Leave TEST_ draft; harmless. ---
