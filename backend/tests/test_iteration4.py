"""BSI ASSET DEAL — Iteration 4 tests.

Covers:
- Price drop / price_history on public catalog and after MA PUT
- Public /track {view, wa} + validation and stats reflection (dashboard/marketing)
- Admin category CRUD (create/rename/dup/empty/toggle) + master categories filter + MA 403
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


def _login(username, password):
    r = requests.post(f"{API}/auth/login",
                      json={"username": username, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {username}: {r.status_code} {r.text}"
    return r.json()["access_token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def admin_token():
    return _login("admin", "Admin@2026")


@pytest.fixture(scope="module")
def ma_token():
    return _login("2190020284", "BSI@2026")


# ================================================================
# PRICE HISTORY on public catalog
# ================================================================
class TestPriceHistoryCatalog:
    def test_catalog_price_drop_shape(self):
        r = requests.get(f"{API}/public/catalog", params={"limit": 30}, timeout=20)
        assert r.status_code == 200
        items = r.json()["items"]
        with_drop = [it for it in items if (it.get("penurunan_persen") or 0) > 0]
        assert len(with_drop) == 6, f"expected 6 with penurunan_persen>0, got {len(with_drop)}"
        for it in with_drop:
            assert it["harga_sebelumnya"] is not None
            assert it["harga_sebelumnya"] > it["harga_limit"]
            # detail should have price_history length >= 2
            d = requests.get(f"{API}/public/catalog/{it['id']}", timeout=15).json()
            assert len(d.get("price_history") or []) >= 2, f"asset {it['id']} price_history<2"
        others = [it for it in items if (it.get("penurunan_persen") or 0) == 0]
        for it in others:
            assert it.get("harga_sebelumnya") in (None, ""), f"{it['id']} leaked harga_sebelumnya"


# ================================================================
# MA edit -> price_history grows and penurunan == 10%
# ================================================================
class TestMAPriceEdit:
    def test_ma_price_reduce_and_restore(self, ma_token):
        r = requests.get(f"{API}/assets/mine", headers=H(ma_token), timeout=15)
        assert r.status_code == 200, r.text
        mine = r.json()
        target = None
        for a in mine:
            if a.get("status") in ("DRAFT", "PUBLISHED"):
                target = a
                break
        assert target, f"no DRAFT/PUBLISHED asset for MA; got {[a.get('status') for a in mine]}"
        aid = target["id"]

        full = requests.get(f"{API}/assets/{aid}", headers=H(ma_token), timeout=15).json()
        original_price = full["harga_limit"]
        original_hist_len = len(full.get("price_history") or [])

        # Build AssetIn body from GET (only writable fields)
        writable = [
            "id_category", "id_subcategory", "judul_asset", "deskripsi",
            "provinsi", "kabupaten_kota", "kecamatan", "wilayah_level_4",
            "alamat", "latitude", "longitude",
            "luas_tanah", "luas_bangunan", "kondisi_asset", "nilai_appraisal",
            "harga_limit", "tanggal_lelang", "id_kpknl", "images",
        ]
        body = {k: full.get(k) for k in writable if k in full}
        new_price = int(round(original_price * 0.9))
        body["harga_limit"] = new_price

        try:
            up = requests.put(f"{API}/assets/{aid}", headers=H(ma_token),
                              json=body, timeout=20)
            assert up.status_code == 200, f"PUT failed: {up.status_code} {up.text}"
            after = requests.get(f"{API}/assets/{aid}", headers=H(ma_token), timeout=15).json()
            new_hist = after.get("price_history") or []
            assert len(new_hist) == original_hist_len + 1, \
                f"price_history not appended: was {original_hist_len}, now {len(new_hist)}"
            assert after.get("penurunan_persen") == 10, \
                f"penurunan_persen expected 10, got {after.get('penurunan_persen')}"
            assert after.get("harga_sebelumnya") == original_price
        finally:
            # Restore original price (this also adds a new history entry — acceptable)
            body["harga_limit"] = original_price
            restore = requests.put(f"{API}/assets/{aid}", headers=H(ma_token),
                                   json=body, timeout=20)
            assert restore.status_code == 200, f"restore failed: {restore.text}"


# ================================================================
# TRACK view / wa
# ================================================================
class TestPublicTrack:
    @pytest.fixture(scope="class")
    def target_id(self):
        cat = requests.get(f"{API}/public/catalog", params={"limit": 30}, timeout=15).json()
        # first non-sold
        for it in cat["items"]:
            if not it.get("is_sold"):
                return it["id"]
        pytest.skip("no non-sold asset")

    def test_track_invalid_type_400(self, target_id):
        r = requests.post(f"{API}/public/catalog/{target_id}/track",
                          json={"type": "x"}, timeout=10)
        assert r.status_code == 400, r.text

    def test_track_unknown_404(self):
        r = requests.post(f"{API}/public/catalog/nope-does-not-exist/track",
                          json={"type": "view"}, timeout=10)
        assert r.status_code == 404, r.text

    def test_track_view_and_wa_increment(self, target_id, admin_token):
        before = requests.get(f"{API}/assets/{target_id}",
                              headers=H(admin_token), timeout=15).json()
        b_views = (before.get("stats") or {}).get("views", 0)
        b_wa = (before.get("stats") or {}).get("wa_clicks", 0)

        r1 = requests.post(f"{API}/public/catalog/{target_id}/track",
                           json={"type": "view"}, timeout=10)
        assert r1.status_code == 200 and r1.json().get("ok") is True

        r2 = requests.post(f"{API}/public/catalog/{target_id}/track",
                           json={"type": "wa"}, timeout=10)
        assert r2.status_code == 200 and r2.json().get("ok") is True

        after = requests.get(f"{API}/assets/{target_id}",
                             headers=H(admin_token), timeout=15).json()
        a_stats = after.get("stats") or {}
        assert a_stats.get("views", 0) >= b_views + 1
        assert a_stats.get("wa_clicks", 0) >= b_wa + 1
        assert a_stats.get("views_7d", 0) >= 1
        assert a_stats.get("wa_7d", 0) >= 1


# ================================================================
# Marketing dashboard: interest object
# ================================================================
class TestMarketingDashboardInterest:
    def test_dashboard_interest(self, ma_token, admin_token):
        # Ensure at least one tracked view against an MA-owned asset
        mine = requests.get(f"{API}/assets/mine", headers=H(ma_token), timeout=15).json()
        assert mine, "MA has no assets"
        aid = mine[0]["id"]
        requests.post(f"{API}/public/catalog/{aid}/track",
                      json={"type": "view"}, timeout=10)
        requests.post(f"{API}/public/catalog/{aid}/track",
                      json={"type": "wa"}, timeout=10)
        # give backend a moment
        time.sleep(0.5)

        r = requests.get(f"{API}/dashboard/marketing",
                         headers=H(ma_token), timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "interest" in d, f"missing interest: {list(d.keys())}"
        interest = d["interest"]
        for k in ("views", "wa_clicks", "views_7d", "wa_7d", "top"):
            assert k in interest, f"interest missing {k}: {interest}"
        assert isinstance(interest["top"], list)
        assert len(interest["top"]) <= 5
        for row in interest["top"]:
            for k in ("id", "judul_asset", "views", "wa_clicks"):
                assert k in row, f"interest.top row missing {k}: {row}"


# ================================================================
# Admin category CRUD (also tests /master/categories active_only)
# ================================================================
class TestAdminCategory:
    @pytest.fixture(scope="class")
    def created(self, admin_token):
        r = requests.post(f"{API}/admin/category",
                          headers=H(admin_token),
                          json={"nama_category": "TEST_KAT_X"}, timeout=15)
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["nama_category"] == "TEST_KAT_X"
        yield c
        # Final Mongo cleanup
        try:
            import asyncio
            from motor.motor_asyncio import AsyncIOMotorClient
            mu = os.environ["MONGO_URL"]
            dn = os.environ["DB_NAME"]

            async def _cleanup():
                cl = AsyncIOMotorClient(mu)
                await cl[dn].master_asset_category.delete_one({"id": c["id"]})
                cl.close()
            asyncio.get_event_loop().run_until_complete(_cleanup())
        except Exception as e:
            print(f"cleanup warn: {e}")

    def test_rename(self, admin_token, created):
        r = requests.put(f"{API}/admin/category/{created['id']}",
                         headers=H(admin_token),
                         json={"nama_category": "TEST_KAT_Y"}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["nama_category"] == "TEST_KAT_Y"

    def test_rename_duplicate_409(self, admin_token, created):
        r = requests.put(f"{API}/admin/category/{created['id']}",
                         headers=H(admin_token),
                         json={"nama_category": "PROPERTI"}, timeout=15)
        assert r.status_code == 409, r.text

    def test_rename_empty_400(self, admin_token, created):
        r = requests.put(f"{API}/admin/category/{created['id']}",
                         headers=H(admin_token),
                         json={"nama_category": "   "}, timeout=15)
        assert r.status_code == 400, r.text

    def test_ma_rename_forbidden(self, ma_token, created):
        r = requests.put(f"{API}/admin/category/{created['id']}",
                         headers=H(ma_token),
                         json={"nama_category": "MA_TRY"}, timeout=15)
        assert r.status_code == 403, r.text

    def test_toggle_inactive_and_master_filters(self, admin_token, created):
        # toggle -> inactive
        r = requests.post(f"{API}/admin/category/{created['id']}/toggle",
                          headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "inactive"

        # /master/categories default (active only) should not include it
        r_active = requests.get(f"{API}/master/categories", timeout=15)
        assert r_active.status_code == 200
        active_names = [c["nama_category"] for c in r_active.json()]
        assert "TEST_KAT_Y" not in active_names

        # /master/categories?active_only=false includes it with status inactive
        r_all = requests.get(f"{API}/master/categories",
                             params={"active_only": "false"}, timeout=15)
        assert r_all.status_code == 200
        found = [c for c in r_all.json() if c["id"] == created["id"]]
        assert found, "renamed category missing from active_only=false list"
        assert found[0]["status"] == "inactive"

        # toggle back to active for cleanliness
        r2 = requests.post(f"{API}/admin/category/{created['id']}/toggle",
                           headers=H(admin_token), timeout=15)
        assert r2.status_code == 200
        assert r2.json()["status"] == "active"
