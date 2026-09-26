"""Iteration 13 backend tests: Deleted-assets tab & restore flow (RCG).

Full flow exercised (end-to-end):
  1. MA request-delete (reason)
  2. ACRM approve-delete -> asset becomes DELETED
  3. RCG GET /rcg/deleted-assets -> shows asset with delete_reason,
     requested_by, approved_by, deleted_at
  4. RBAC: MA & ACRM get 403 on /rcg/deleted-assets and /restore
  5. RCG POST /rcg/assets/{id}/restore -> asset back to PUBLISHED
  6. Post-restore: asset gone from /rcg/deleted-assets AND back in
     /public/catalog, catalog total is >=45 again.

Also verifies a regression I noticed while reading server.py:
  /rcg/assets/{id}/sold appears to have lost its @api.post decorator
  because the newly-added /restore endpoint sits directly above
  rcg_mark_sold() (line ~1150). The endpoint should be 404 now if the
  decorator is missing.
"""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") + "/api"

MA = ("2190020284", "BSI@2026")
ACRM = ("2188009250", "BSI@2026")
RCG_CTRL = ("2183008345", "BSI@2026")


def _login(u, p):
    r = requests.post(f"{BASE}/auth/login", json={"username": u, "password": p}, timeout=20)
    assert r.status_code == 200, f"login {u}: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope="module")
def h_ma():
    return _login(*MA)


@pytest.fixture(scope="module")
def h_acrm():
    return _login(*ACRM)


@pytest.fixture(scope="module")
def h_ctrl():
    return _login(*RCG_CTRL)


@pytest.fixture(scope="module")
def deleted_asset(h_ma, h_acrm):
    """Ensure at least one DELETED asset exists (owned by MA, approved by ACRM)."""
    mine = requests.get(f"{BASE}/assets/mine", headers=h_ma, timeout=15).json()
    pub = [a for a in mine if a.get("status") == "PUBLISHED"]
    if not pub:
        pytest.skip("MA has no PUBLISHED asset to delete")
    aid = pub[0]["id"]

    # request-delete
    r = requests.post(f"{BASE}/assets/{aid}/request-delete", headers=h_ma,
                      json={"reason": "TEST_ITER13 pengujian tab Terhapus"}, timeout=15)
    assert r.status_code == 200, r.text

    # approve-delete
    r = requests.post(f"{BASE}/acrm/assets/{aid}/approve-delete",
                      headers=h_acrm, json={}, timeout=15)
    assert r.status_code == 200, r.text
    return aid


class TestDeletedListRBAC:
    def test_ma_forbidden(self, h_ma):
        r = requests.get(f"{BASE}/rcg/deleted-assets", headers=h_ma, timeout=15)
        assert r.status_code == 403, r.text

    def test_acrm_forbidden(self, h_acrm):
        r = requests.get(f"{BASE}/rcg/deleted-assets", headers=h_acrm, timeout=15)
        assert r.status_code == 403, r.text


class TestDeletedListPayload:
    def test_rcg_sees_deleted_asset(self, h_ctrl, deleted_asset):
        r = requests.get(f"{BASE}/rcg/deleted-assets", headers=h_ctrl, timeout=15)
        assert r.status_code == 200, r.text
        rows = r.json()
        assert isinstance(rows, list) and rows, "Expected non-empty deleted asset list"
        row = next((x for x in rows if x["id"] == deleted_asset), None)
        assert row is not None, f"deleted asset {deleted_asset} missing from list"
        # required fields
        assert row.get("delete_reason") and "TEST_ITER13" in row["delete_reason"]
        assert row.get("deleted_at")
        assert row.get("requested_by"), "requested_by should be MA reviewer name"
        assert row.get("approved_by"), "approved_by should be ACRM reviewer name"


class TestRestoreRBAC:
    def test_ma_cannot_restore(self, h_ma, deleted_asset):
        r = requests.post(f"{BASE}/rcg/assets/{deleted_asset}/restore",
                          headers=h_ma, timeout=15)
        assert r.status_code == 403, r.text

    def test_acrm_cannot_restore(self, h_acrm, deleted_asset):
        r = requests.post(f"{BASE}/rcg/assets/{deleted_asset}/restore",
                          headers=h_acrm, timeout=15)
        assert r.status_code == 403, r.text


class TestRestoreFlow:
    def test_restore_returns_asset_to_catalog(self, h_ctrl, deleted_asset):
        r = requests.post(f"{BASE}/rcg/assets/{deleted_asset}/restore",
                          headers=h_ctrl, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("ok") is True
        assert body.get("status") in ("PUBLISHED", "SOLD")

        # No longer in deleted list
        rows = requests.get(f"{BASE}/rcg/deleted-assets", headers=h_ctrl, timeout=15).json()
        assert not any(x["id"] == deleted_asset for x in rows), \
            "restored asset still present in /rcg/deleted-assets"

        # Back in public catalog
        pub = requests.get(f"{BASE}/public/catalog?limit=100", timeout=15).json()
        items = pub if isinstance(pub, list) else pub.get("items", [])
        assert any(x["id"] == deleted_asset for x in items), \
            "restored asset not visible in /public/catalog"

    def test_restore_bad_id_returns_404(self, h_ctrl):
        r = requests.post(f"{BASE}/rcg/assets/does-not-exist-xyz/restore",
                          headers=h_ctrl, timeout=15)
        assert r.status_code == 404, r.text


class TestCatalogTotalPostRestore:
    def test_public_catalog_total_ge_45(self):
        r = requests.get(f"{BASE}/public/catalog?limit=100", timeout=15)
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("items", [])
        total = data.get("total", len(items)) if isinstance(data, dict) else len(items)
        assert total >= 45, f"expected >=45 after restore, got {total}"


class TestSoldEndpointRegression:
    """The /rcg/assets/{id}/sold endpoint appears to have lost its decorator
    because /restore was inserted directly above rcg_mark_sold in server.py.
    If broken, POST returns 404 instead of the expected 409 (asset already
    PUBLISHED and not SOLD, plus 'body' missing is allowed via Optional)."""
    def test_sold_endpoint_exists(self, h_ctrl, deleted_asset):
        # deleted_asset has been restored to PUBLISHED by prior test.
        r = requests.post(f"{BASE}/rcg/assets/{deleted_asset}/sold",
                          headers=h_ctrl, json={"notes": "TEST_ITER13"}, timeout=15)
        # If decorator missing: 404. If wired: 200 (marks SOLD) — either
        # is fine functionally; 404 is the regression signal.
        assert r.status_code != 404, "REGRESSION: /rcg/assets/{id}/sold endpoint missing (@api.post decorator lost when /restore was added)"

        # Cleanup: if it got marked SOLD, unmark it
        if r.status_code == 200 and r.json().get("status") == "SOLD":
            requests.post(f"{BASE}/rcg/assets/{deleted_asset}/unsold",
                          headers=h_ctrl, timeout=15)
