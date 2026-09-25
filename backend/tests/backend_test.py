"""BSI ASSET DEAL - backend integration tests.
Covers: public catalog, auth, marketing asset flow, approval workflow (MA->ACRM->RCG),
RBAC/IDOR, concurrency, admin user mgmt, category, KPKNL, dashboards, notifications, audit.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://mobile-app-build-11274.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def sess():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

def _login(sess, username, password):
    r = sess.post(f"{API}/auth/login", json={"username": username, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {username} failed: {r.status_code} {r.text}"
    return r.json()

@pytest.fixture(scope="session")
def admin_token(sess):
    return _login(sess, "admin", "Admin@2026")["access_token"]

@pytest.fixture(scope="session")
def acrm_login(sess):
    return _login(sess, "2188009250", "BSI@2026")

@pytest.fixture(scope="session")
def acrm_token(acrm_login):
    return acrm_login["access_token"]

@pytest.fixture(scope="session")
def ma_login(sess):
    return _login(sess, "2190020284", "BSI@2026")

@pytest.fixture(scope="session")
def ma_token(ma_login):
    return ma_login["access_token"]

@pytest.fixture(scope="session")
def ma2_token(sess):
    return _login(sess, "2185002222", "BSI@2026")["access_token"]

def H(t):
    return {"Authorization": f"Bearer {t}"}

# ---------- Public Catalog ----------
class TestPublicCatalog:
    def test_filters(self, sess):
        r = sess.get(f"{API}/public/filters", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "provinsi" in d and "categories" in d
        assert isinstance(d["provinsi"], list) and len(d["provinsi"]) > 0
        assert len(d["categories"]) > 0

    def test_catalog_list(self, sess):
        r = sess.get(f"{API}/public/catalog", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 6, f"expected >=6 demo assets, got {d['total']}"
        assert len(d["items"]) > 0
        item = d["items"][0]
        # sensitive fields must NOT appear
        forbidden = ["no_cif", "nama_debitur", "cif", "debitur"]
        for k in item.keys():
            assert k.lower() not in forbidden, f"sensitive field exposed: {k}"

    def test_catalog_keyword_and_filters(self, sess):
        d = sess.get(f"{API}/public/catalog", timeout=15).json()
        item = d["items"][0]
        # keyword filter
        r = sess.get(f"{API}/public/catalog?keyword={item['judul_asset'][:5]}", timeout=15).json()
        assert r["total"] >= 1
        # provinsi filter
        if item.get("provinsi"):
            r = sess.get(f"{API}/public/catalog?provinsi={item['provinsi']}", timeout=15).json()
            assert r["total"] >= 1
            for i in r["items"]:
                assert i["provinsi"] == item["provinsi"]

    def test_catalog_detail(self, sess):
        d = sess.get(f"{API}/public/catalog", timeout=15).json()
        aid = d["items"][0]["id"]
        r = sess.get(f"{API}/public/catalog/{aid}", timeout=15)
        assert r.status_code == 200
        det = r.json()
        assert det["id"] == aid
        assert "pic_wa" in det  # normalized WA
        # sensitive fields absent
        for k in det.keys():
            assert k.lower() not in ["no_cif", "nama_debitur", "cif", "debitur"]

    def test_catalog_detail_404(self, sess):
        r = sess.get(f"{API}/public/catalog/nonexistent-id-xxx", timeout=15)
        assert r.status_code == 404


# ---------- Auth ----------
class TestAuth:
    def test_admin_login(self, sess):
        d = _login(sess, "admin", "Admin@2026")
        assert d["user"]["role"] == "admin_rcg"

    def test_acrm_login(self, acrm_login):
        assert acrm_login["user"]["role"] == "acrm"
        assert acrm_login["user"].get("acr")

    def test_ma_login(self, ma_login):
        assert ma_login["user"]["role"] == "marketing_asset"
        assert ma_login["user"].get("ma")
        assert ma_login["user"].get("acr")
        assert ma_login["user"].get("acrm")

    def test_wrong_password(self, sess):
        r = sess.post(f"{API}/auth/login", json={"username": "admin", "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_me(self, sess, ma_token):
        r = sess.get(f"{API}/auth/me", headers=H(ma_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["role"] == "marketing_asset"


# ---------- Marketing Asset ----------
class TestMarketingFlow:
    def test_marketing_context(self, sess, ma_token):
        r = sess.get(f"{API}/marketing/context", headers=H(ma_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["nama_acr"] and d["nama_marketing_asset"] and d["nama_acrm"]

    def test_kpknl_list(self, sess, ma_token):
        r = sess.get(f"{API}/master/kpknl", headers=H(ma_token), timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 60  # ~71 seeded

    def test_categories(self, sess):
        r = sess.get(f"{API}/master/categories", timeout=15)
        assert r.status_code == 200
        cats = r.json()
        assert any(c["nama_category"] == "PROPERTI" for c in cats)

    def test_create_draft_and_number_format(self, sess, ma_token):
        cats = sess.get(f"{API}/master/categories", timeout=15).json()
        cat = cats[0]
        payload = {
            "judul_asset": "TEST_Rumah Uji Coba",
            "deskripsi": "TEST asset description",
            "id_category": cat["id"],
            "id_subcategory": cat["subcategories"][0]["id"] if cat["subcategories"] else None,
            "alamat": "Jl Test No 1", "provinsi": "Aceh",
            "kabupaten_kota": "Banda Aceh", "kecamatan": "Baiturrahman",
            "wilayah_level_4": "Ateuk", "tipe_wilayah": "Kelurahan",
            "luas_tanah": 100, "luas_bangunan": 80,
            "harga_limit": 500000000, "nilai_appraisal": 550000000,
            "kondisi_asset": "BAIK"
        }
        r = sess.post(f"{API}/assets", headers=H(ma_token), json=payload, timeout=20)
        assert r.status_code == 200, r.text
        a = r.json()
        assert a["status"] == "DRAFT"
        assert a["nomor_asset"].startswith("BLC-"), f"bad number: {a['nomor_asset']}"
        parts = a["nomor_asset"].split("-")
        assert len(parts) == 4 and len(parts[3]) == 6
        pytest.asset_id = a["id"]
        pytest.asset_num = a["nomor_asset"]

    def test_mine(self, sess, ma_token):
        r = sess.get(f"{API}/assets/mine", headers=H(ma_token), timeout=15)
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert pytest.asset_id in ids

    def test_submit_asset(self, sess, ma_token):
        r = sess.post(f"{API}/assets/{pytest.asset_id}/submit", headers=H(ma_token), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "WAITING_ACRM_REVIEW"

    def test_negative_price_rejected(self, sess, ma_token):
        cats = sess.get(f"{API}/master/categories", timeout=15).json()
        cat = cats[0]
        payload = {
            "judul_asset": "TEST_neg", "deskripsi": "x", "id_category": cat["id"],
            "alamat": "a", "provinsi": "b", "kabupaten_kota": "c", "kecamatan": "d",
            "wilayah_level_4": "e", "harga_limit": -1
        }
        r = sess.post(f"{API}/assets", headers=H(ma_token), json=payload, timeout=15)
        assert r.status_code == 400


# ---------- Approval Workflow (single test to preserve state across xdist) ----------
class TestApprovalWorkflow:
    def test_full_workflow_ma_to_acrm_to_rcg(self, sess, ma_token, acrm_token, admin_token, ma2_token):
        # Create fresh asset for the full flow (isolated from state in other classes)
        cats = sess.get(f"{API}/master/categories", timeout=15).json()
        cat = cats[0]
        payload = {
            "judul_asset": "TEST_workflow_full", "deskripsi": "wf",
            "id_category": cat["id"],
            "id_subcategory": cat["subcategories"][0]["id"] if cat["subcategories"] else None,
            "alamat": "Jl WF", "provinsi": "Aceh", "kabupaten_kota": "Banda Aceh",
            "kecamatan": "K", "wilayah_level_4": "W", "harga_limit": 100000000
        }
        a = sess.post(f"{API}/assets", headers=H(ma_token), json=payload, timeout=20).json()
        aid = a["id"]
        assert a["status"] == "DRAFT"

        # RBAC: another MA in same ACR must not access
        r = sess.get(f"{API}/assets/{aid}", headers=H(ma2_token), timeout=15)
        assert r.status_code == 403, "IDOR: other MA should not access this asset"

        # Submit
        r = sess.post(f"{API}/assets/{aid}/submit", headers=H(ma_token), timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "WAITING_ACRM_REVIEW"

        # ACRM (different area) cannot approve
        other = _login(requests.Session(), "2182001667", "BSI@2026")["access_token"]
        r = requests.post(f"{API}/acrm/assets/{aid}/approve", headers=H(other), timeout=15)
        assert r.status_code == 403, "ACRM from another ACR must be blocked"

        # Correct ACRM sees it
        pend = sess.get(f"{API}/acrm/pending", headers=H(acrm_token), timeout=15).json()
        assert aid in [x["id"] for x in pend]

        # Return requires notes
        r = sess.post(f"{API}/acrm/assets/{aid}/return", headers=H(acrm_token),
                      json={"notes": ""}, timeout=15)
        assert r.status_code == 400

        # ACRM approve
        r = sess.post(f"{API}/acrm/assets/{aid}/approve", headers=H(acrm_token), timeout=15)
        assert r.status_code == 200 and r.json()["status"] == "WAITING_RCG_APPROVAL"

        # Concurrency: re-approve returns 409
        r = sess.post(f"{API}/acrm/assets/{aid}/approve", headers=H(acrm_token), timeout=15)
        assert r.status_code == 409

        # RCG sees it
        pend = sess.get(f"{API}/rcg/pending", headers=H(admin_token), timeout=15).json()
        assert aid in [x["id"] for x in pend]

        # RCG approve -> PUBLISHED
        r = sess.post(f"{API}/rcg/assets/{aid}/approve", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "PUBLISHED" and r.json()["public_ready"] is True

        # Public catalog now includes it
        r = sess.get(f"{API}/public/catalog/{aid}", timeout=15)
        assert r.status_code == 200

    def test_rcg_return_flow(self, sess, ma_token, acrm_token, admin_token):
        # create+submit a second asset to test RCG return
        cats = sess.get(f"{API}/master/categories", timeout=15).json()
        cat = cats[0]
        payload = {"judul_asset": "TEST_return", "deskripsi": "x", "id_category": cat["id"],
                   "alamat": "a", "provinsi": "Aceh", "kabupaten_kota": "c",
                   "kecamatan": "d", "wilayah_level_4": "e", "harga_limit": 100000}
        a = sess.post(f"{API}/assets", headers=H(ma_token), json=payload, timeout=15).json()
        aid = a["id"]
        sess.post(f"{API}/assets/{aid}/submit", headers=H(ma_token), timeout=15)
        sess.post(f"{API}/acrm/assets/{aid}/approve", headers=H(acrm_token), timeout=15)
        # RCG return empty notes -> 400
        r = sess.post(f"{API}/rcg/assets/{aid}/return", headers=H(admin_token),
                      json={"notes": ""}, timeout=15)
        assert r.status_code == 400
        # RCG return with notes -> RETURN_FROM_RCG
        r = sess.post(f"{API}/rcg/assets/{aid}/return", headers=H(admin_token),
                      json={"notes": "Perbaiki alamat"}, timeout=15)
        assert r.status_code == 200
        det = sess.get(f"{API}/assets/{aid}", headers=H(ma_token), timeout=15).json()
        assert det["status"] == "RETURN_FROM_RCG"
        assert det["correction_notes"] == "Perbaiki alamat"


# ---------- RBAC/IDOR ----------
class TestRBAC:
    def test_ma_role_rejected_from_acrm_endpoint(self, sess, ma_token):
        r = sess.get(f"{API}/acrm/pending", headers=H(ma_token), timeout=15)
        assert r.status_code == 403

    def test_acrm_cannot_use_marketing_endpoint(self, sess, acrm_token):
        r = sess.get(f"{API}/marketing/context", headers=H(acrm_token), timeout=15)
        assert r.status_code == 403

    def test_admin_rejected_from_marketing_create(self, sess, admin_token):
        r = sess.post(f"{API}/assets", headers=H(admin_token), json={}, timeout=15)
        assert r.status_code == 403


# ---------- Admin User Mgmt ----------
class TestAdmin:
    def test_list_users(self, sess, admin_token):
        r = sess.get(f"{API}/admin/users?role=marketing_asset", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 50

    def test_users_keyword_filter(self, sess, admin_token):
        r = sess.get(f"{API}/admin/users?role=marketing_asset&keyword=Abdul",
                     headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert any("abdul" in (u["nama"] or "").lower() for u in r.json())

    def test_hp_validation(self, sess, admin_token, ma_login):
        ma_id = ma_login["user"]["ma"]["id"]
        # bad hp -> 400
        r = sess.put(f"{API}/admin/marketing-asset/{ma_id}",
                     headers=H(admin_token),
                     json={"nama": "Abdul Hadi AR", "nomor_hp": "1234"}, timeout=15)
        assert r.status_code == 400
        # good hp -> 200
        r = sess.put(f"{API}/admin/marketing-asset/{ma_id}",
                     headers=H(admin_token),
                     json={"nama": "Abdul Hadi AR", "nomor_hp": "081234567890"}, timeout=15)
        assert r.status_code == 200

    def test_mutasi_requires_reason(self, sess, admin_token, ma_login):
        ma_id = ma_login["user"]["ma"]["id"]
        acrs = sess.get(f"{API}/admin/acr", headers=H(admin_token), timeout=15).json()
        target = next(a for a in acrs if a["id"] != ma_login["user"]["acr"]["id"])
        r = sess.post(f"{API}/admin/marketing-asset/{ma_id}/mutasi",
                      headers=H(admin_token),
                      json={"new_acr_id": target["id"], "reason": ""}, timeout=15)
        assert r.status_code == 400

    def test_acrm_mutasi_blocked_if_target_has_active(self, sess, admin_token, acrm_login):
        acrm_id = acrm_login["user"]["acrm"]["id"]
        acrs = sess.get(f"{API}/admin/acr", headers=H(admin_token), timeout=15).json()
        target = next(a for a in acrs if a["id"] != acrm_login["user"]["acr"]["id"])
        r = sess.post(f"{API}/admin/acrm/{acrm_id}/mutasi",
                      headers=H(admin_token),
                      json={"new_acr_id": target["id"], "reason": "TEST mutasi"}, timeout=15)
        # target ACR already has active ACRM -> 400
        assert r.status_code == 400

    def test_add_category(self, sess, admin_token):
        r = sess.post(f"{API}/admin/category", headers=H(admin_token),
                      json={"nama_category": "TEST_KATEGORI"}, timeout=15)
        assert r.status_code == 200
        pytest.cat_id = r.json()["id"]

    def test_toggle_category(self, sess, admin_token):
        r = sess.post(f"{API}/admin/category/{pytest.cat_id}/toggle",
                      headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "inactive"

    def test_audit_logs(self, sess, admin_token):
        r = sess.get(f"{API}/admin/audit-logs", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert len(r.json()) > 0

    def test_mutation_history(self, sess, admin_token):
        r = sess.get(f"{API}/admin/mutation-history", headers=H(admin_token), timeout=15)
        assert r.status_code == 200


# ---------- Schedule ----------
class TestSchedule:
    def test_schedule_requires_valid_kpknl(self, sess, ma_token, admin_token):
        # create fresh asset
        cats = sess.get(f"{API}/master/categories", timeout=15).json()
        payload = {"judul_asset": "TEST_sched", "deskripsi": "x",
                   "id_category": cats[0]["id"], "alamat": "a", "provinsi": "b",
                   "kabupaten_kota": "c", "kecamatan": "d", "wilayah_level_4": "e"}
        a = sess.post(f"{API}/assets", headers=H(ma_token), json=payload, timeout=15).json()
        # invalid kpknl (use fresh requests to send form-encoded)
        r = requests.post(f"{API}/assets/{a['id']}/schedule",
                          headers={"Authorization": f"Bearer {ma_token}"},
                          data={"tanggal_lelang": "2026-06-01", "id_kpknl": "nope"}, timeout=15)
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"
        # valid kpknl
        k = sess.get(f"{API}/master/kpknl", headers=H(ma_token), timeout=15).json()[0]
        r = requests.post(f"{API}/assets/{a['id']}/schedule",
                          headers={"Authorization": f"Bearer {ma_token}"},
                          data={"tanggal_lelang": "2026-06-01", "id_kpknl": k["id"]}, timeout=15)
        assert r.status_code == 200, r.text


# ---------- Dashboards ----------
class TestDashboards:
    def test_ma_dash(self, sess, ma_token):
        r = sess.get(f"{API}/dashboard/marketing", headers=H(ma_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "total" in d and "by_status" in d

    def test_acrm_dash(self, sess, acrm_token):
        r = sess.get(f"{API}/dashboard/acrm", headers=H(acrm_token), timeout=15)
        assert r.status_code == 200

    def test_rcg_dash(self, sess, admin_token):
        r = sess.get(f"{API}/dashboard/rcg", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["totals"]["acr"] >= 40
        assert d["totals"]["marketing_asset"] >= 50
        assert d["totals"]["acrm"] >= 40


# ---------- Notifications ----------
class TestNotifications:
    def test_ma_has_notifications(self, sess, ma_token):
        r = sess.get(f"{API}/notifications", headers=H(ma_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "unread" in d
        assert len(d["items"]) > 0

    def test_mark_read(self, sess, ma_token):
        d = sess.get(f"{API}/notifications", headers=H(ma_token), timeout=15).json()
        nid = d["items"][0]["id"]
        r = sess.post(f"{API}/notifications/{nid}/read", headers=H(ma_token), timeout=15)
        assert r.status_code == 200
