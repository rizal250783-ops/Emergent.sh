"""AO-360 Backend API pytest suite."""
import os
import io
import time
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

DEFAULT_PW = "BprsHM2026"
NEW_PW = "NewPass2026"

# Fixed accounts (from test_credentials.md)
KODE_DIREKTUR = "001"
KODE_ADMIN = "002"
KODE_AO_PEMBIAYAAN = "003"
KODE_AO_FUNDING = "008"
KODE_COLLECTION = "013"


# ------------- helpers -------------
def _reset_all_passwords():
    """Reset all accounts to pristine default password + force reset flag."""
    import subprocess
    subprocess.run(
        ["/root/.venv/bin/python", "/app/backend/tests/_reset_pw.py"],
        cwd="/app/backend", check=True
    )


def _login_and_change(kode):
    """Login with default password, then change to NEW_PW. Returns bearer token (post-change)."""
    r = requests.post(f"{API}/auth/login", json={"kode_marketing": kode, "password": DEFAULT_PW})
    assert r.status_code == 200, f"login {kode} failed: {r.status_code} {r.text}"
    d = r.json()
    assert d.get("requires_password_reset") is True
    token = d["token"]
    r2 = requests.post(f"{API}/auth/change-password",
                       headers={"Authorization": f"Bearer {token}"},
                       json={"old_password": DEFAULT_PW, "new_password": NEW_PW})
    assert r2.status_code == 200, f"change-pw failed: {r2.text}"
    r3 = requests.post(f"{API}/auth/login", json={"kode_marketing": kode, "password": NEW_PW})
    assert r3.status_code == 200
    return r3.json()["token"], r3.json()["user"]


@pytest.fixture(scope="session", autouse=True)
def _pristine_state():
    _reset_all_passwords()
    yield
    _reset_all_passwords()


@pytest.fixture(scope="session")
def tokens():
    """Return dict role_kode -> (token, user_dict)"""
    out = {}
    for kode in [KODE_DIREKTUR, KODE_ADMIN, KODE_AO_PEMBIAYAAN, KODE_AO_FUNDING, KODE_COLLECTION]:
        out[kode] = _login_and_change(kode)
    return out


def H(token):
    return {"Authorization": f"Bearer {token}"}


# ============== TESTS ==============

# --- Auth ---
class TestAuth:
    def test_login_wrong_password_generic_error(self):
        r = requests.post(f"{API}/auth/login", json={"kode_marketing": "999", "password": "bogus"})
        assert r.status_code == 401
        assert "salah" in r.json().get("detail", "").lower()

    def test_login_flow_and_change_password(self, tokens):
        token, user = tokens[KODE_DIREKTUR]
        assert user["jabatan"] == "Direktur"
        assert user["kode_marketing"] == KODE_DIREKTUR
        me = requests.get(f"{API}/auth/me", headers=H(token))
        assert me.status_code == 200
        assert me.json()["requires_password_reset"] is False


# --- Admin transactions ---
class TestAdminTransactions:
    def test_add_lending_transaction(self, tokens):
        token, _ = tokens[KODE_ADMIN]
        ao_token, ao_user = tokens[KODE_AO_PEMBIAYAAN]
        payload = {
            "nomor_kontrak": "TEST-L-001",
            "jenis_akad": "Murabahah",
            "nama_nasabah": "TEST Nasabah A",
            "jumlah_pencairan": 50000000,
            "tanggal_pencairan": "2026-03-05",
            "ao_id": ao_user["id"],
        }
        r = requests.post(f"{API}/transactions/lending", headers=H(token), json=payload)
        assert r.status_code == 200, r.text
        # verify via GET
        r2 = requests.get(f"{API}/transactions/lending?periode=2026-03&ao_id={ao_user['id']}", headers=H(token))
        assert r2.status_code == 200
        assert any(x["nomor_kontrak"] == "TEST-L-001" for x in r2.json())

    def test_add_funding_transaction(self, tokens):
        token, _ = tokens[KODE_ADMIN]
        _, ao_user = tokens[KODE_AO_PEMBIAYAAN]
        payload = {
            "nama_nasabah": "TEST Funder B",
            "jenis_simpanan": "Deposito",
            "jumlah_simpanan": 25000000,
            "tanggal": "2026-03-06",
            "ao_id": ao_user["id"],
        }
        r = requests.post(f"{API}/transactions/funding", headers=H(token), json=payload)
        assert r.status_code == 200, r.text
        r2 = requests.get(f"{API}/transactions/funding?periode=2026-03&ao_id={ao_user['id']}", headers=H(token))
        assert any(x["nama_nasabah"] == "TEST Funder B" for x in r2.json())

    def test_add_recovery_kol4_denda(self, tokens):
        token, _ = tokens[KODE_ADMIN]
        _, col_user = tokens[KODE_COLLECTION]
        payload = {
            "nomor_kontrak": "TEST-R-K4",
            "nama_nasabah": "TEST Recovery K4",
            "jumlah_recovery": 8000000,
            "tanggal": "2026-03-07",
            "kolektibilitas": 4,
            "denda_dibayar_penuh": True,
            "is_write_off": False,
            "pic_id": col_user["id"],
        }
        r = requests.post(f"{API}/transactions/recovery", headers=H(token), json=payload)
        assert r.status_code == 200, r.text

    def test_add_recovery_write_off(self, tokens):
        token, _ = tokens[KODE_ADMIN]
        _, col_user = tokens[KODE_COLLECTION]
        payload = {
            "nomor_kontrak": "TEST-R-WO",
            "nama_nasabah": "TEST Recovery WO",
            "jumlah_recovery": 3000000,
            "tanggal": "2026-03-08",
            "kolektibilitas": 5,
            "is_write_off": True,
            "pic_id": col_user["id"],
        }
        r = requests.post(f"{API}/transactions/recovery", headers=H(token), json=payload)
        assert r.status_code == 200, r.text

    def test_recovery_invalid_kol(self, tokens):
        token, _ = tokens[KODE_ADMIN]
        _, col_user = tokens[KODE_COLLECTION]
        payload = {
            "nomor_kontrak": "TEST-R-BAD",
            "nama_nasabah": "X",
            "jumlah_recovery": 1000,
            "tanggal": "2026-03-08",
            "kolektibilitas": 2,
            "pic_id": col_user["id"],
        }
        r = requests.post(f"{API}/transactions/recovery", headers=H(token), json=payload)
        assert r.status_code == 400


# --- Targets ---
class TestTargets:
    def test_set_target(self, tokens):
        token, _ = tokens[KODE_ADMIN]
        _, ao_user = tokens[KODE_AO_PEMBIAYAAN]
        payload = {
            "ao_id": ao_user["id"],
            "periode": "2026-03",
            "target_pencairan": 100000000,
            "target_funding": 30000000,
            "target_recovery": 0,
        }
        r = requests.post(f"{API}/targets", headers=H(token), json=payload)
        assert r.status_code == 200
        r2 = requests.get(f"{API}/targets?periode=2026-03&ao_id={ao_user['id']}", headers=H(token))
        docs = r2.json()
        assert len(docs) >= 1
        assert docs[0]["target_pencairan"] == 100000000


# --- Views ---
class TestViews:
    def test_dashboard_me_ao_pembiayaan(self, tokens):
        token, _ = tokens[KODE_AO_PEMBIAYAAN]
        r = requests.get(f"{API}/dashboard/me?periode=2026-03", headers=H(token))
        assert r.status_code == 200
        data = r.json()
        assert "kpis" in data
        assert len(data["kpis"]) == 2  # Pembiayaan + Funding

    def test_dashboard_me_ao_funding(self, tokens):
        token, _ = tokens[KODE_AO_FUNDING]
        r = requests.get(f"{API}/dashboard/me?periode=2026-03", headers=H(token))
        assert r.status_code == 200
        assert len(r.json()["kpis"]) == 1

    def test_dashboard_me_collection(self, tokens):
        token, _ = tokens[KODE_COLLECTION]
        r = requests.get(f"{API}/dashboard/me?periode=2026-03", headers=H(token))
        assert r.status_code == 200
        assert len(r.json()["kpis"]) >= 1

    def test_executive(self, tokens):
        token, _ = tokens[KODE_DIREKTUR]
        r = requests.get(f"{API}/dashboard/executive?periode=2026-03", headers=H(token))
        assert r.status_code == 200
        d = r.json()
        for k in ("pembiayaan", "funding", "recovery", "jumlah_ao", "top_pembiayaan"):
            assert k in d

    def test_leaderboard(self, tokens):
        token, _ = tokens[KODE_ADMIN]
        for komp in ("Pembiayaan", "Funding", "Recovery"):
            r = requests.get(f"{API}/leaderboard?komponen={komp}&periode=2026-03", headers=H(token))
            assert r.status_code == 200
            assert "rows" in r.json()

    def test_riwayat_me(self, tokens):
        token, _ = tokens[KODE_AO_PEMBIAYAAN]
        r = requests.get(f"{API}/riwayat/me", headers=H(token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_rekap(self, tokens):
        token, _ = tokens[KODE_AO_PEMBIAYAAN]
        r = requests.get(f"{API}/dashboard/rekap?periode=2026-03", headers=H(token))
        assert r.status_code == 200
        d = r.json()
        assert "pencairan" in d and "simpanan" in d


# --- Incentives ---
class TestIncentives:
    def test_recovery_generates_pending_incentives(self, tokens):
        # After adding K4/WO recovery, incentives should exist as pending
        token, _ = tokens[KODE_ADMIN]
        _, col_user = tokens[KODE_COLLECTION]
        r = requests.get(f"{API}/incentives?periode=2026-03&status=pending", headers=H(token))
        assert r.status_code == 200
        ids = [x for x in r.json() if x.get("ao_id") == col_user["id"]]
        assert len(ids) > 0, "expected auto-generated incentives for collection user"

    def test_submit_target_incentive_under_100_fails(self, tokens):
        token, _ = tokens[KODE_ADMIN]
        _, ao_user = tokens[KODE_AO_FUNDING]
        # Set a huge unreachable target for AO Funding user
        requests.post(f"{API}/targets", headers=H(token), json={
            "ao_id": ao_user["id"], "periode": "2026-03",
            "target_pencairan": 0, "target_funding": 999999999999, "target_recovery": 0,
        })
        r = requests.post(f"{API}/incentives/target", headers=H(token), json={
            "ao_id": ao_user["id"], "periode": "2026-03", "kategori": "target_funding",
            "jenis_perhitungan": "persentase", "nilai_persen": 1.0,
        })
        assert r.status_code == 400

    def test_submit_target_incentive_success_after_boosting_realisasi(self, tokens):
        token, _ = tokens[KODE_ADMIN]
        _, ao_user = tokens[KODE_AO_PEMBIAYAAN]
        # Add lending to bring realisasi >= target
        requests.post(f"{API}/transactions/lending", headers=H(token), json={
            "nomor_kontrak": "TEST-L-BOOST",
            "jenis_akad": "Murabahah",
            "nama_nasabah": "TEST Boost",
            "jumlah_pencairan": 60000000,  # existing 50M + 60M = 110M >= 100M target
            "tanggal_pencairan": "2026-03-10",
            "ao_id": ao_user["id"],
        })
        r = requests.post(f"{API}/incentives/target", headers=H(token), json={
            "ao_id": ao_user["id"], "periode": "2026-03", "kategori": "target_pembiayaan",
            "jenis_perhitungan": "persentase", "nilai_persen": 0.5,
        })
        assert r.status_code == 200, r.text
        pytest.shared_target_inc_id = r.json()["id"]

    def test_direktur_approve_and_reject(self, tokens):
        token_dir, _ = tokens[KODE_DIREKTUR]
        token_adm, _ = tokens[KODE_ADMIN]
        # get 2 pending
        r = requests.get(f"{API}/incentives?status=pending", headers=H(token_adm))
        pending = r.json()
        assert len(pending) >= 2
        approve_id = pending[0]["id"]
        reject_id = pending[1]["id"]
        r1 = requests.post(f"{API}/incentives/approve", headers=H(token_dir),
                           json={"ids": [approve_id], "action": "approve"})
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/incentives/approve", headers=H(token_dir),
                           json={"ids": [reject_id], "action": "reject", "reason": "test reject"})
        assert r2.status_code == 200
        # verify statuses
        all_inc = requests.get(f"{API}/incentives", headers=H(token_adm)).json()
        by_id = {x["id"]: x for x in all_inc}
        assert by_id[approve_id]["status_approval"] == "approved"
        assert by_id[reject_id]["status_approval"] == "rejected"

    def test_ao_sees_only_approved(self, tokens):
        token_col, _ = tokens[KODE_COLLECTION]
        r = requests.get(f"{API}/incentives/mine", headers=H(token_col))
        assert r.status_code == 200
        for x in r.json():
            assert x["status_approval"] == "approved"


# --- User management requests ---
class TestUserManagement:
    def test_add_user_request_and_approve(self, tokens):
        token_adm, _ = tokens[KODE_ADMIN]
        token_dir, _ = tokens[KODE_DIREKTUR]
        payload = {"kode_marketing": "T99", "nama": "TEST User", "jabatan": "AO Pembiayaan"}
        r = requests.post(f"{API}/users/request-add", headers=H(token_adm), json=payload)
        assert r.status_code == 200
        # list pending
        r2 = requests.get(f"{API}/user-requests?status=pending", headers=H(token_dir))
        assert r2.status_code == 200
        req = next((x for x in r2.json() if x.get("payload", {}).get("kode_marketing") == "T99"), None)
        assert req is not None
        # approve
        r3 = requests.post(f"{API}/user-requests/{req['id']}/decide", headers=H(token_dir),
                           json={"action": "approve"})
        assert r3.status_code == 200
        # verify user created
        users = requests.get(f"{API}/users", headers=H(token_adm)).json()
        assert any(u["kode_marketing"] == "T99" for u in users)


# --- Collection ---
class TestCollection:
    def test_self_input_and_photo_upload(self, tokens):
        token_col, col_user = tokens[KODE_COLLECTION]
        body = {
            "nomor_kontrak": "TEST-COL-01", "nama_nasabah": "TEST Kunjungan",
            "outstanding_pokok": 5000000, "status_penagihan": "Dikunjungi",
            "catatan": "test", "periode": "2026-03",
        }
        r = requests.post(f"{API}/collection/self", headers=H(token_col), json=body)
        assert r.status_code == 200, r.text
        aid = r.json()["id"]
        # 1x1 PNG bytes
        png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
               b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xff\xff\x3f"
               b"\x00\x05\xfe\x02\xfe\xdc\xccY\xe7\x00\x00\x00\x00IEND\xaeB`\x82")
        files = {"files": ("test.png", png, "image/png")}
        data = {"activity_date": "2026-03-08"}
        r2 = requests.post(f"{API}/collection/{aid}/photos", headers=H(token_col), files=files, data=data)
        assert r2.status_code == 200, r2.text
        assert len(r2.json()["photos"]) == 1

    def test_admin_assign_task(self, tokens):
        token_adm, _ = tokens[KODE_ADMIN]
        _, col_user = tokens[KODE_COLLECTION]
        r = requests.post(f"{API}/collection/assign", headers=H(token_adm), json={
            "nomor_kontrak": "TEST-ASSIGN-01", "nama_nasabah": "TEST Assign",
            "outstanding_pokok": 2000000, "assigned_to": col_user["id"], "periode": "2026-03",
        })
        assert r.status_code == 200


# --- Data management ---
class TestDataManagement:
    def test_export_xlsx(self, tokens):
        token, _ = tokens[KODE_ADMIN]
        r = requests.get(f"{API}/data/export/pencapaian_pembiayaan?periode=2026-03", headers=H(token))
        assert r.status_code == 200
        assert "spreadsheetml" in r.headers.get("content-type", "")
        assert len(r.content) > 100

    def test_backup_json(self, tokens):
        token, _ = tokens[KODE_ADMIN]
        r = requests.get(f"{API}/data/backup", headers=H(token))
        assert r.status_code == 200
        import json as _j
        d = _j.loads(r.content)
        assert "collections" in d
        assert "users" in d["collections"]


# --- Audit log ---
class TestAudit:
    def test_audit_logs_accessible(self, tokens):
        token_adm, _ = tokens[KODE_ADMIN]
        token_dir, _ = tokens[KODE_DIREKTUR]
        for tok in (token_adm, token_dir):
            r = requests.get(f"{API}/admin/audit-logs" if False else f"{API}/audit-logs", headers=H(tok))
            assert r.status_code == 200
            assert isinstance(r.json(), list)
            assert len(r.json()) > 0
