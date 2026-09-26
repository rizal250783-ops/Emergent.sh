"""Backend tests for iteration 7/8: two-tier RCG RBAC, MA fixups, nearest search."""
import os
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")


def _login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"username": username, "password": password}, timeout=30)
    return r


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def controller_token():
    r = _login("2183008345", "BSI@2026")
    assert r.status_code == 200, f"controller login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def rcg_admin_token():
    r = _login("2186005002", "BSI@2026")
    assert r.status_code == 200, f"rcg_admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


# =========== AUTH / ROLE ===========
class TestAuthAndRoles:
    def test_controller_login(self):
        r = _login("2183008345", "BSI@2026")
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["role"] == "rcg_controller"

    def test_rcg_admin_login(self):
        r = _login("2186005002", "BSI@2026")
        assert r.status_code == 200
        body = r.json()
        assert body["user"]["role"] == "rcg_admin"

    def test_legacy_admin_login_fails(self):
        r = _login("admin", "Admin@2026")
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"

    def test_legacy_admin2_login_fails(self):
        r = _login("admin2", "Admin@2026")
        assert r.status_code == 401

    def test_ma_manado_login(self):
        r = _login("tad2310129981", "BSI@2026")
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "marketing_asset"

    def test_ma_jakarta_thamrin_login(self):
        r = _login("tad24040100322", "BSI@2026")
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "marketing_asset"


# =========== RCG USER MANAGEMENT ===========
class TestRcgUserManagement:
    def test_list_rcg_users_as_controller(self, controller_token):
        r = requests.get(f"{BASE_URL}/api/admin/rcg-users",
                         headers=_auth_headers(controller_token), timeout=30)
        assert r.status_code == 200
        data = r.json()
        roles = [u["role"] for u in data]
        assert roles.count("rcg_controller") == 1
        assert roles.count("rcg_admin") >= 4, f"expected >=4 admins, got roles={roles}"

    def test_list_rcg_users_as_admin_allowed(self, rcg_admin_token):
        # rcg_admin can view list (backend uses RCG_ROLES for GET)
        r = requests.get(f"{BASE_URL}/api/admin/rcg-users",
                         headers=_auth_headers(rcg_admin_token), timeout=30)
        assert r.status_code == 200

    def test_admin_cannot_create_rcg(self, rcg_admin_token):
        r = requests.post(f"{BASE_URL}/api/admin/rcg-users",
                          json={"nama": "TEST_should_fail", "nip": "test_forbid_1"},
                          headers=_auth_headers(rcg_admin_token), timeout=30)
        assert r.status_code == 403

    def test_controller_full_lifecycle(self, controller_token):
        import uuid
        nip = f"test_iter7_{uuid.uuid4().hex[:8]}"
        # cleanup if lingering
        # create
        r = requests.post(f"{BASE_URL}/api/admin/rcg-users",
                          json={"nama": "TEST_iter7_user", "nip": nip},
                          headers=_auth_headers(controller_token), timeout=30)
        # if already exists from a previous failed run, delete & recreate
        if r.status_code == 409:
            lst = requests.get(f"{BASE_URL}/api/admin/rcg-users",
                               headers=_auth_headers(controller_token)).json()
            existing = next((u for u in lst if u["username"] == nip), None)
            if existing:
                requests.delete(f"{BASE_URL}/api/admin/rcg-users/{existing['id']}",
                                headers=_auth_headers(controller_token))
            r = requests.post(f"{BASE_URL}/api/admin/rcg-users",
                              json={"nama": "TEST_iter7_user", "nip": nip},
                              headers=_auth_headers(controller_token), timeout=30)
        assert r.status_code == 200, f"create failed: {r.status_code} {r.text}"
        uid = r.json()["id"]

        # verify appears in list
        lst = requests.get(f"{BASE_URL}/api/admin/rcg-users",
                           headers=_auth_headers(controller_token)).json()
        assert any(u["id"] == uid and u["role"] == "rcg_admin" for u in lst)

        # newly created user can login
        login_r = _login(nip, "BSI@2026")
        assert login_r.status_code == 200
        assert login_r.json()["user"]["role"] == "rcg_admin"

        # toggle (deactivate)
        t = requests.post(f"{BASE_URL}/api/admin/rcg-users/{uid}/toggle",
                          headers=_auth_headers(controller_token), timeout=30)
        assert t.status_code == 200
        assert t.json()["status"] == "inactive"

        # delete
        d = requests.delete(f"{BASE_URL}/api/admin/rcg-users/{uid}",
                            headers=_auth_headers(controller_token), timeout=30)
        assert d.status_code == 200

        # deleted user cannot login
        login_r2 = _login(nip, "BSI@2026")
        assert login_r2.status_code == 401

    def test_admin_cannot_toggle_or_delete(self, rcg_admin_token, controller_token):
        # find any rcg_admin id
        lst = requests.get(f"{BASE_URL}/api/admin/rcg-users",
                           headers=_auth_headers(controller_token)).json()
        admin_user = next(u for u in lst if u["role"] == "rcg_admin")
        r1 = requests.post(f"{BASE_URL}/api/admin/rcg-users/{admin_user['id']}/toggle",
                           headers=_auth_headers(rcg_admin_token), timeout=30)
        assert r1.status_code == 403
        r2 = requests.delete(f"{BASE_URL}/api/admin/rcg-users/{admin_user['id']}",
                             headers=_auth_headers(rcg_admin_token), timeout=30)
        assert r2.status_code == 403

    def test_controller_cannot_delete_controller(self, controller_token):
        lst = requests.get(f"{BASE_URL}/api/admin/rcg-users",
                           headers=_auth_headers(controller_token)).json()
        ctrl = next(u for u in lst if u["role"] == "rcg_controller")
        rt = requests.post(f"{BASE_URL}/api/admin/rcg-users/{ctrl['id']}/toggle",
                           headers=_auth_headers(controller_token), timeout=30)
        assert rt.status_code == 403
        rd = requests.delete(f"{BASE_URL}/api/admin/rcg-users/{ctrl['id']}",
                             headers=_auth_headers(controller_token), timeout=30)
        assert rd.status_code == 403


# =========== SELF-PROFILE UPDATE ===========
class TestControllerSelfUpdate:
    def test_controller_can_update_self(self, controller_token):
        original_nip = "2183008345"
        temp_nip = "2183008345tmp"
        # rename
        r = requests.put(f"{BASE_URL}/api/admin/rcg/self",
                        json={"nama": "SYAMSU RIZAL", "nip": temp_nip},
                        headers=_auth_headers(controller_token), timeout=30)
        assert r.status_code == 200, r.text

        # login with new nip works
        lg = _login(temp_nip, "BSI@2026")
        assert lg.status_code == 200
        new_token = lg.json()["access_token"]

        # revert
        r2 = requests.put(f"{BASE_URL}/api/admin/rcg/self",
                        json={"nama": "SYAMSU RIZAL", "nip": original_nip},
                        headers=_auth_headers(new_token), timeout=30)
        assert r2.status_code == 200

        # login again with original nip
        lg2 = _login(original_nip, "BSI@2026")
        assert lg2.status_code == 200

    def test_rcg_admin_cannot_self_update_via_controller_endpoint(self, rcg_admin_token):
        r = requests.put(f"{BASE_URL}/api/admin/rcg/self",
                        json={"nama": "hack", "nip": "hacknip"},
                        headers=_auth_headers(rcg_admin_token), timeout=30)
        assert r.status_code == 403


# =========== RCG_ADMIN OPERATIONAL RIGHTS ===========
class TestRcgAdminOperationalAccess:
    def test_pending(self, rcg_admin_token):
        r = requests.get(f"{BASE_URL}/api/rcg/pending",
                         headers=_auth_headers(rcg_admin_token), timeout=30)
        assert r.status_code == 200

    def test_dashboard(self, rcg_admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/rcg",
                         headers=_auth_headers(rcg_admin_token), timeout=30)
        assert r.status_code == 200

    def test_admin_users(self, rcg_admin_token):
        r = requests.get(f"{BASE_URL}/api/admin/users",
                         headers=_auth_headers(rcg_admin_token), timeout=30)
        assert r.status_code == 200


# =========== NEAREST SEARCH ===========
class TestNearestSearch:
    def test_nearest_sort_returns_distance(self):
        r = requests.get(
            f"{BASE_URL}/api/public/catalog",
            params={"sort": "nearest", "lat": -6.19, "lng": 106.82, "limit": 5},
            timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert "items" in body
        items = body["items"]
        assert len(items) > 0, "no items returned by nearest search"
        # distance_km field present
        for it in items:
            assert "distance_km" in it, f"missing distance_km: {it}"
        # ascending order among non-SOLD prefix
        non_sold = [it for it in items if it.get("status") != "SOLD"]
        dists = [it["distance_km"] for it in non_sold]
        assert dists == sorted(dists), f"non-SOLD not asc-sorted by distance: {dists}"
