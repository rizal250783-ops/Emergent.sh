"""Iteration 9: 45 demo assets (45 ACR, varied types, SOLD mix, schedule mix),
tagline/typography regression, nearest search + login regression."""
import os
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://emergent-setup-34.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _get(path, **kw):
    return requests.get(f"{API}{path}", timeout=30, **kw)


def _login(username, password):
    return requests.post(f"{API}/auth/login", json={"username": username, "password": password}, timeout=30)


def _all_catalog_items():
    items, page = [], 1
    while True:
        r = _get(f"/public/catalog?limit=20&page={page}")
        assert r.status_code == 200
        d = r.json()
        items.extend(d["items"])
        if len(items) >= d["total"]:
            return items, d["total"]
        page += 1


class TestCatalog45:
    """Catalog must contain exactly 45 demo assets spanning 45 distinct ACR."""

    def test_total_is_45(self):
        r = _get("/public/catalog?limit=5")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 45, f"expected total=45, got {d['total']}"
        assert len(d["items"]) == 5

    def test_45_distinct_acr_via_nomor_asset(self):
        items, total = _all_catalog_items()
        assert total == 45
        assert len(items) == 45
        # nomor_asset format: BLC-2026-{ACR_IDENTIFIER}-{seq}
        acrs = {it["nomor_asset"].split("-")[2] for it in items}
        assert len(acrs) == 45, f"expected 45 distinct ACR identifiers, got {len(acrs)}: {sorted(acrs)}"

    def test_locations_has_about_22_provinsi(self):
        r = _get("/public/locations")
        assert r.status_code == 200
        d = r.json()
        assert d["level"] == "provinsi"
        assert len(d["options"]) >= 20, f"expected ~22 provinsi, got {len(d['options'])}"

    def test_varied_kabupaten_kota(self):
        items, _ = _all_catalog_items()
        kabs = {it["kabupaten_kota"] for it in items}
        assert len(kabs) >= 30, f"expected varied kabupaten_kota, got {len(kabs)}"

    def test_sold_and_schedule_mix(self):
        items, _ = _all_catalog_items()
        sold = [it for it in items if it["status"] == "SOLD"]
        sched = [it for it in items if it.get("has_schedule")]
        no_sched = [it for it in items if not it.get("has_schedule") and it["status"] != "SOLD"]
        assert len(sold) == 4, f"expected 4 SOLD, got {len(sold)}"
        assert all(it.get("is_sold") for it in sold), "SOLD items must have is_sold=True"
        assert len(sched) > 0 and len(no_sched) > 0, "need mix of items with/without tanggal_lelang"
        # SOLD items appear at the end of default sort
        statuses = [it["status"] for it in items]
        first_sold = statuses.index("SOLD")
        assert all(s == "SOLD" for s in statuses[first_sold:]), "SOLD items must be at the end"

    def test_new_asset_types_present(self):
        items, _ = _all_catalog_items()
        titles = [it["judul_asset"] for it in items]
        joined = " | ".join(titles)
        for needle in ["Kos-Kosan Mahasiswa Dekat Untad", "Yamaha R15 V4 2023", "Toko Sembako Jl. Tanjungpura", "Kebun Sawit", "Kebun Kopi"]:
            assert needle in joined, f"missing asset: {needle}"
        subs = {it["subkategori"] for it in items}
        for sub in ["Apartemen", "Gudang", "Rumah", "Ruko", "Tanah Kavling", "Motor Sport", "Motor Bebek", "Sawah"]:
            assert sub in subs, f"missing subkategori: {sub}"

    def test_items_have_images(self):
        items, _ = _all_catalog_items()
        no_img = [it["judul_asset"] for it in items if not it.get("images")]
        assert not no_img, f"assets without images: {no_img}"


class TestNearestSearch:
    """Regression: nearest sort must return distance_km ascending."""

    def test_nearest_ascending(self):
        r = _get("/public/catalog?sort=nearest&lat=-6.19&lng=106.82&limit=3")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) == 3
        dists = [it["distance_km"] for it in items]
        assert dists == sorted(dists), f"distance_km not ascending: {dists}"


class TestLoginRegression:
    """RCG logins still work; legacy admin fails."""

    def test_rcg_controller_login(self):
        r = _login("2183008345", "BSI@2026")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("access_token")
        assert d["user"]["role"] == "rcg_controller"

    def test_rcg_admin_login(self):
        r = _login("2186005002", "BSI@2026")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("access_token")
        assert d["user"]["role"] == "rcg_admin"

    def test_legacy_admin_fails(self):
        r = _login("admin", "BSI@2026")
        assert r.status_code == 401, f"legacy admin should fail, got {r.status_code}"
