"""Iteration 11 backend tests:
- Public catalog auto-seed (45 assets)
- Marketing Asset delete request flow (needs ACRM approval only)
- ACRM approve-delete / reject-delete
- RCG Category delete: controller direct vs admin pending approval
"""
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") + "/api"

MA = ("2190020284", "BSI@2026")
ACRM = ("2188009250", "BSI@2026")
RCG_CTRL = ("2183008345", "BSI@2026")
RCG_ADMIN = ("2186005002", "BSI@2026")


def _login(u, p):
    r = requests.post(f"{BASE}/auth/login", json={"username": u, "password": p}, timeout=15)
    assert r.status_code == 200, f"login {u} failed: {r.status_code} {r.text}"
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
def h_admin():
    return _login(*RCG_ADMIN)


# ---------- Public catalog auto-seed ----------
class TestCatalogSeed:
    def test_public_catalog_not_empty(self):
        r = requests.get(f"{BASE}/public/catalog?limit=100", timeout=15)
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("items", [])
        total = data.get("total", len(items)) if isinstance(data, dict) else len(items)
        assert total >= 45, f"expected >=45 seeded assets, got total={total}"


# ---------- MA delete request ----------
class TestMADeleteRequest:
    @pytest.fixture(scope="class")
    def target_asset(self, h_ma):
        r = requests.get(f"{BASE}/assets/mine", headers=h_ma, timeout=15)
        assert r.status_code == 200, r.text
        assets = r.json()
        pub = [a for a in assets if a.get("status") == "PUBLISHED"]
        if not pub:
            pytest.skip("No published asset owned by MA to test delete")
        return pub[0]

    def test_empty_reason_400(self, h_ma, target_asset):
        r = requests.post(f"{BASE}/assets/{target_asset['id']}/request-delete",
                          headers=h_ma, json={"reason": "   "}, timeout=15)
        assert r.status_code == 400, r.text

    def test_valid_reason_sets_pending(self, h_ma, target_asset):
        aid = target_asset["id"]
        r = requests.post(f"{BASE}/assets/{aid}/request-delete", headers=h_ma,
                          json={"reason": "TEST_ITER11 pengajuan penghapusan"}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("status") == "DELETE_PENDING_ACRM"

        # Confirm asset disappears from public catalog
        pub = requests.get(f"{BASE}/public/catalog?limit=100", timeout=15).json()
        items = pub if isinstance(pub, list) else pub.get("items", [])
        assert not any(a["id"] == aid for a in items), "asset still in public catalog after request-delete"

        # And still visible via /assets/mine with DELETE_PENDING_ACRM
        mine = requests.get(f"{BASE}/assets/mine", headers=h_ma, timeout=15).json()
        a = next((x for x in mine if x["id"] == aid), None)
        assert a is not None
        assert a["status"] == "DELETE_PENDING_ACRM"


# ---------- ACRM reject then approve ----------
class TestACRMDeleteFlow:
    @pytest.fixture(scope="class")
    def pending_asset(self, h_acrm):
        r = requests.get(f"{BASE}/acrm/pending", headers=h_acrm, timeout=15)
        assert r.status_code == 200, r.text
        pending = [a for a in r.json() if a.get("status") == "DELETE_PENDING_ACRM"]
        if not pending:
            pytest.skip("No DELETE_PENDING_ACRM asset in ACRM queue")
        return pending[0]

    def test_pending_has_delete_reason(self, pending_asset):
        assert pending_asset.get("delete_reason"), "delete_reason missing on pending payload"

    def test_reject_restores_then_approve_deletes(self, h_ma, h_acrm, pending_asset):
        aid = pending_asset["id"]

        # Reject first (restores)
        r = requests.post(f"{BASE}/acrm/assets/{aid}/reject-delete",
                          headers=h_acrm, json={"notes": "TEST_ITER11 tolak"}, timeout=15)
        assert r.status_code == 200, r.text
        mine = requests.get(f"{BASE}/assets/mine", headers=h_ma, timeout=15).json()
        a = next((x for x in mine if x["id"] == aid), None)
        assert a is not None and a["status"] in ("PUBLISHED", "SOLD"), f"status={a and a['status']}"

        # Re-request delete
        r = requests.post(f"{BASE}/assets/{aid}/request-delete", headers=h_ma,
                          json={"reason": "TEST_ITER11 second request"}, timeout=15)
        assert r.status_code == 200, r.text

        # Now approve
        r = requests.post(f"{BASE}/acrm/assets/{aid}/approve-delete",
                          headers=h_acrm, json={}, timeout=15)
        assert r.status_code == 200, r.text

        # Gone from mine + public
        mine = requests.get(f"{BASE}/assets/mine", headers=h_ma, timeout=15).json()
        assert not any(x["id"] == aid for x in mine), "deleted asset still in /assets/mine"
        pub = requests.get(f"{BASE}/public/catalog?limit=100", timeout=15).json()
        items = pub if isinstance(pub, list) else pub.get("items", [])
        assert not any(x["id"] == aid for x in items)


# ---------- RCG Category delete ----------
class TestCategoryDelete:
    def _create_cat(self, headers, name):
        r = requests.post(f"{BASE}/admin/category", headers=headers,
                          json={"nama_category": name, "parent_category_id": None}, timeout=15)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        return d.get("id") or d.get("category", {}).get("id")

    def test_empty_reason_400_and_delete_direct_controller(self, h_ctrl):
        name = f"TEST_ITER11_CTRL_{uuid.uuid4().hex[:6]}"
        cid = self._create_cat(h_ctrl, name)
        assert cid, "category id missing after create"

        # Empty reason
        r = requests.delete(f"{BASE}/admin/category/{cid}", headers=h_ctrl,
                            json={"reason": ""}, timeout=15)
        assert r.status_code == 400, r.text

        # Valid reason -> direct delete
        r = requests.delete(f"{BASE}/admin/category/{cid}", headers=h_ctrl,
                            json={"reason": "TEST_ITER11 hapus langsung"}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("deleted") is True

    def test_admin_delete_is_pending_and_controller_approves(self, h_ctrl, h_admin):
        name = f"TEST_ITER11_ADM_{uuid.uuid4().hex[:6]}"
        cid = self._create_cat(h_ctrl, name)
        assert cid

        # Admin delete -> pending
        r = requests.delete(f"{BASE}/admin/category/{cid}", headers=h_admin,
                            json={"reason": "TEST_ITER11 admin request"}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("deleted") is False and body.get("pending") is True, body

        # Admin cannot approve (403)
        r = requests.post(f"{BASE}/admin/category/{cid}/approve-delete",
                          headers=h_admin, json={}, timeout=15)
        assert r.status_code == 403, r.text

        # Controller sees it in list
        r = requests.get(f"{BASE}/admin/category-delete-requests",
                         headers=h_ctrl, timeout=15)
        assert r.status_code == 200, r.text
        ids = [x["id"] for x in r.json()]
        assert cid in ids, f"category {cid} not in delete requests list"

        # Controller approve
        r = requests.post(f"{BASE}/admin/category/{cid}/approve-delete",
                          headers=h_ctrl, json={}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json().get("deleted") is True
