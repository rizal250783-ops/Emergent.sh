"""BSI Asset Deal - Iteration 14 tests.
Coverage:
  1) Public catalog radius filter (nearest branch) with radius_km=5/25/none
  2) RCG deleted-assets returns days_left/retention_days (30-day retention)
  3) RCG restore within retention still restores (PUBLISHED)
  4) Regression: /rcg/assets/{id}/sold + /unsold both 200; /assets/mine 200
Cleanup: restores the test-deleted MA asset so catalog returns to 45.
"""
import os
import pytest
import requests

BASE = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://emergent-setup-34.preview.emergentagent.com').rstrip('/')
API = f"{BASE}/api"

MA_U, MA_P = "2190020284", "BSI@2026"
ACRM_U, ACRM_P = "2188009250", "BSI@2026"
RCG_U, RCG_P = "2183008345", "BSI@2026"


def H(t):
    return {"Authorization": f"Bearer {t}"}


def _login(u, p):
    r = requests.post(f"{API}/auth/login", json={"username": u, "password": p}, timeout=30)
    assert r.status_code == 200, f"login {u} failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def ma_token():
    return _login(MA_U, MA_P)["access_token"]


@pytest.fixture(scope="module")
def acrm_token():
    return _login(ACRM_U, ACRM_P)["access_token"]


@pytest.fixture(scope="module")
def rcg_token():
    return _login(RCG_U, RCG_P)["access_token"]


# ==========================================================================
# 1) Public catalog radius filter
# ==========================================================================
class TestRadiusFilter:
    def test_no_radius_returns_all_45(self):
        r = requests.get(f"{API}/public/catalog", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 45, f"expected 45 total, got {d['total']}"

    def test_nearest_no_radius_returns_all(self):
        r = requests.get(f"{API}/public/catalog?sort=nearest&lat=-6.19&lng=106.82", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 45, f"nearest without radius should still list all 45, got {d['total']}"
        # distance_km present on nearest items
        assert "distance_km" in d["items"][0]

    def test_radius_5_filters(self):
        r = requests.get(f"{API}/public/catalog?sort=nearest&lat=-6.19&lng=106.82&radius_km=5", timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] < 45, f"radius 5km should shrink list, got {d['total']}"
        for it in d["items"]:
            assert it.get("distance_km") is not None
            assert it["distance_km"] <= 5.0 + 1e-6, f"item {it['id']} distance {it['distance_km']} > 5"

    def test_radius_25_returns_more_than_5(self):
        r5 = requests.get(f"{API}/public/catalog?sort=nearest&lat=-6.19&lng=106.82&radius_km=5", timeout=20).json()
        r25 = requests.get(f"{API}/public/catalog?sort=nearest&lat=-6.19&lng=106.82&radius_km=25", timeout=20).json()
        assert r25["total"] > r5["total"], f"25km ({r25['total']}) should be > 5km ({r5['total']})"
        for it in r25["items"]:
            assert it["distance_km"] <= 25.0 + 1e-6


# ==========================================================================
# 2) Deleted-assets retention (create -> approve-delete -> verify -> restore)
# ==========================================================================
class TestDeletedAssetsRetention:
    state = {"asset_id": None}

    def test_setup_delete_flow(self, ma_token, acrm_token):
        # Find one of MA's PUBLISHED assets to delete
        r = requests.get(f"{API}/assets/mine", headers=H(ma_token), timeout=20)
        assert r.status_code == 200, f"assets/mine failed: {r.status_code} {r.text}"
        published = [a for a in r.json() if a["status"] == "PUBLISHED"]
        assert len(published) > 0, "MA needs at least one PUBLISHED asset"
        aid = published[0]["id"]
        TestDeletedAssetsRetention.state["asset_id"] = aid

        # MA request-delete
        r = requests.post(f"{API}/assets/{aid}/request-delete", headers=H(ma_token),
                          json={"reason": "UITEST_ITER14 retention"}, timeout=20)
        assert r.status_code == 200, f"request-delete failed: {r.status_code} {r.text}"

        # ACRM approve-delete
        r = requests.post(f"{API}/acrm/assets/{aid}/approve-delete", headers=H(acrm_token), timeout=20)
        assert r.status_code == 200, f"approve-delete failed: {r.status_code} {r.text}"

    def test_deleted_assets_list_has_retention_fields(self, rcg_token):
        r = requests.get(f"{API}/rcg/deleted-assets", headers=H(rcg_token), timeout=20)
        assert r.status_code == 200, f"deleted-assets failed: {r.status_code} {r.text}"
        items = r.json()
        assert len(items) > 0, "expected at least one deleted asset"
        aid = TestDeletedAssetsRetention.state["asset_id"]
        found = next((x for x in items if x["id"] == aid), None)
        assert found is not None, f"deleted asset {aid} not found in list"
        assert "retention_days" in found, "missing retention_days"
        assert found["retention_days"] == 30, f"retention_days={found['retention_days']}"
        assert "days_left" in found, "missing days_left"
        assert 0 < found["days_left"] <= 30, f"days_left out of range: {found['days_left']}"

    def test_restore_within_retention(self, rcg_token):
        aid = TestDeletedAssetsRetention.state["asset_id"]
        r = requests.post(f"{API}/rcg/assets/{aid}/restore", headers=H(rcg_token), timeout=20)
        assert r.status_code == 200, f"restore failed: {r.status_code} {r.text}"
        d = r.json()
        # Accept either shape {status:...} or {ok:True, status:...}
        status = d.get("status") if isinstance(d.get("status"), str) else (d.get("status") or {}).get("status")
        assert status in ("PUBLISHED", None) or d.get("ok"), f"restore response: {d}"

        # Verify public catalog back to 45
        r = requests.get(f"{API}/public/catalog", timeout=20)
        assert r.json()["total"] == 45, "catalog should be back to 45 after restore"


# ==========================================================================
# 3) Regressions: rcg sold/unsold, assets/mine
# ==========================================================================
class TestRegressions:
    def test_assets_mine(self, ma_token):
        r = requests.get(f"{API}/assets/mine", headers=H(ma_token), timeout=20)
        assert r.status_code == 200, f"/assets/mine broken: {r.status_code} {r.text}"
        assert isinstance(r.json(), list)

    def test_rcg_sold_and_unsold(self, ma_token, rcg_token):
        # pick a PUBLISHED asset owned by MA
        r = requests.get(f"{API}/assets/mine", headers=H(ma_token), timeout=20)
        published = [a for a in r.json() if a["status"] == "PUBLISHED"]
        assert published, "need a PUBLISHED asset for sold/unsold test"
        aid = published[0]["id"]

        r = requests.post(f"{API}/rcg/assets/{aid}/sold", headers=H(rcg_token),
                          json={"notes": "UITEST_ITER14 sold"}, timeout=20)
        assert r.status_code == 200, f"/rcg/sold failed: {r.status_code} {r.text}"

        r = requests.post(f"{API}/rcg/assets/{aid}/unsold", headers=H(rcg_token),
                          json={"notes": "UITEST_ITER14 unsold"}, timeout=20)
        assert r.status_code == 200, f"/rcg/unsold failed: {r.status_code} {r.text}"

        # Final catalog should be 45
        r = requests.get(f"{API}/public/catalog", timeout=20)
        assert r.json()["total"] == 45, "catalog not 45 after sold/unsold"
