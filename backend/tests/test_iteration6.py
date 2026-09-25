"""Iteration 6 tests: GET /api/public/catalog/map — pin data and filters."""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def s():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# --- Map catalog: baseline ---
class TestMapBaseline:
    def test_map_total_and_shape(self, s):
        r = s.get(f"{BASE_URL}/api/public/catalog/map", timeout=30)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "total" in j and "pins" in j
        assert j["total"] == 25, f"expected 25 pins, got {j['total']}"
        assert len(j["pins"]) == 25
        # shape checks on a sample
        p = j["pins"][0]
        for k in ["id", "judul_asset", "latitude", "longitude", "harga_limit",
                  "kategori", "image", "is_sold", "has_schedule", "penurunan_persen"]:
            assert k in p, f"pin missing key {k}"
        assert isinstance(p["latitude"], (int, float))
        assert isinstance(p["longitude"], (int, float))

    def test_map_only_published_with_coords(self, s):
        j = s.get(f"{BASE_URL}/api/public/catalog/map").json()
        for p in j["pins"]:
            assert p["latitude"] is not None
            assert p["longitude"] is not None


# --- Filters ---
class TestMapFilters:
    def test_filter_provinsi_dki(self, s):
        j = s.get(f"{BASE_URL}/api/public/catalog/map", params={"provinsi": "DKI Jakarta"}).json()
        assert j["total"] == 5, f"expected 5 DKI pins, got {j['total']}"

    def test_filter_price_drop(self, s):
        j = s.get(f"{BASE_URL}/api/public/catalog/map", params={"price_drop": "true"}).json()
        assert j["total"] >= 1
        for p in j["pins"]:
            assert p["penurunan_persen"] > 0, f"non-drop pin included: {p}"

    def test_filter_keyword_vario(self, s):
        j = s.get(f"{BASE_URL}/api/public/catalog/map", params={"keyword": "Vario"}).json()
        assert j["total"] == 1, f"expected 1 Vario pin, got {j['total']}"

    def test_filter_keyword_none(self, s):
        j = s.get(f"{BASE_URL}/api/public/catalog/map", params={"keyword": "zzzz"}).json()
        assert j["total"] == 0
        assert j["pins"] == []

    def test_filter_category_tanah(self, s):
        cats = s.get(f"{BASE_URL}/api/master/categories").json()
        tanah = next((c for c in cats if c.get("nama_category", "").upper() == "TANAH"), None)
        assert tanah, f"no TANAH category found in {cats}"
        j = s.get(f"{BASE_URL}/api/public/catalog/map", params={"category_id": tanah["id"]}).json()
        assert j["total"] >= 1
        for p in j["pins"]:
            assert (p.get("kategori") or "").upper() == "TANAH", f"non-TANAH pin returned: {p}"
