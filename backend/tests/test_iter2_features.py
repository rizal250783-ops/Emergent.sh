"""Iter-2 backend tests: Import Wizard, Notifikasi Insentif, Restore DB, PDF Rekap."""
import io
import json
import os
import subprocess
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"

DEFAULT_PW = "BprsHM2026"
NEW_PW = "NewPass2026"

KODE = {"dir": "001", "adm": "002", "ao": "003"}


def _reset():
    subprocess.run(["/root/.venv/bin/python", "/app/backend/tests/_reset_pw.py"],
                   cwd="/app/backend", check=True)


def _login_change(kode):
    r = requests.post(f"{API}/auth/login", json={"kode_marketing": kode, "password": DEFAULT_PW})
    assert r.status_code == 200, r.text
    if r.json().get("requires_password_reset"):
        tok = r.json()["token"]
        r2 = requests.post(f"{API}/auth/change-password",
                           headers={"Authorization": f"Bearer {tok}"},
                           json={"old_password": DEFAULT_PW, "new_password": NEW_PW})
        assert r2.status_code == 200, r2.text
        r = requests.post(f"{API}/auth/login", json={"kode_marketing": kode, "password": NEW_PW})
    return r.json()["token"], r.json()["user"]


@pytest.fixture(scope="module", autouse=True)
def _state():
    _reset()
    yield
    _reset()


@pytest.fixture(scope="module")
def toks():
    return {k: _login_change(v) for k, v in KODE.items()}


def H(t):
    return {"Authorization": f"Bearer {t}"}


# ================= IMPORT WIZARD =================
class TestImportWizard:
    def test_import_preview_mixed_rows(self, toks):
        tok, _ = toks["adm"]
        payload = [
            {"nomor_kontrak": "IMP-1", "jenis_akad": "Murabahah", "nama_nasabah": "Uji Import",
             "jumlah_pencairan": "90000000", "tanggal_pencairan": "2026-03-10", "kode_marketing": "003"},
            {"nomor_kontrak": "IMP-2", "jenis_akad": "Murabahah", "nama_nasabah": "",
             "jumlah_pencairan": "abc", "tanggal_pencairan": "10-03-2026", "kode_marketing": "999"},
        ]
        files = {"file": ("imp.json", json.dumps(payload).encode(), "application/json")}
        r = requests.post(f"{API}/data/import-preview/pencapaian_pembiayaan",
                          headers=H(tok), files=files)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["total"] == 2
        assert d["valid_count"] == 1
        assert d["error_count"] == 1
        rows = d["rows"]
        assert rows[0]["valid"] is True
        assert rows[1]["valid"] is False
        errs = " ".join(rows[1]["errors"])
        assert "nama_nasabah" in errs
        assert "jumlah_pencairan" in errs
        # save valid row for commit
        pytest.shared_valid_row = rows[0]["data"]

    def test_import_commit_only_valid(self, toks):
        tok, _ = toks["adm"]
        row = pytest.shared_valid_row
        r = requests.post(f"{API}/data/import-commit/pencapaian_pembiayaan",
                          headers=H(tok), json={"rows": [row]})
        assert r.status_code == 200, r.text
        assert r.json()["imported"] == 1
        # verify persisted
        _, ao = toks["ao"]
        r2 = requests.get(f"{API}/transactions/lending?periode=2026-03&ao_id={ao['id']}", headers=H(tok))
        assert r2.status_code == 200
        assert any(x["nomor_kontrak"] == "IMP-1" for x in r2.json())


# ================= NOTIFIKASI INSENTIF =================
class TestNotifikasiInsentif:
    def test_reject_incentive_creates_admin_notification(self, toks):
        tok_adm, _ = toks["adm"]
        tok_dir, _ = toks["dir"]
        _, ao = toks["ao"]

        # 1) set target so incentive submit is allowed
        requests.post(f"{API}/targets", headers=H(tok_adm), json={
            "ao_id": ao["id"], "periode": "2026-03",
            "target_pencairan": 10000000, "target_funding": 0, "target_recovery": 0,
        })
        # 2) add lending to exceed target
        requests.post(f"{API}/transactions/lending", headers=H(tok_adm), json={
            "nomor_kontrak": "NTF-L-01", "jenis_akad": "Murabahah",
            "nama_nasabah": "TEST NTF", "jumlah_pencairan": 20000000,
            "tanggal_pencairan": "2026-03-05", "ao_id": ao["id"],
        })
        # 3) admin submit incentive
        r = requests.post(f"{API}/incentives/target", headers=H(tok_adm), json={
            "ao_id": ao["id"], "periode": "2026-03", "kategori": "target_pembiayaan",
            "jenis_perhitungan": "manual", "nilai_manual": 500000,
        })
        assert r.status_code == 200, r.text
        inc_id = r.json()["id"]

        # baseline unread count for admin
        base = requests.get(f"{API}/notifications/unread-count", headers=H(tok_adm)).json()["count"]

        # 4) direktur rejects
        r2 = requests.post(f"{API}/incentives/approve", headers=H(tok_dir),
                           json={"ids": [inc_id], "action": "reject", "reason": "salah kategori"})
        assert r2.status_code == 200

        # 5) admin gets new unread
        after = requests.get(f"{API}/notifications/unread-count", headers=H(tok_adm)).json()["count"]
        assert after >= base + 1

        # 6) list notifications - has one with matching title
        lst = requests.get(f"{API}/notifications", headers=H(tok_adm)).json()
        matched = [n for n in lst if n.get("tipe") == "insentif_ditolak" and (n.get("ref") or {}).get("incentive_id") == inc_id]
        assert len(matched) == 1
        n = matched[0]
        assert "ditolak" in n["judul"].lower()
        assert n["is_read"] is False

        # 7) mark all read → count zero
        r3 = requests.post(f"{API}/notifications/read-all", headers=H(tok_adm))
        assert r3.status_code == 200
        after2 = requests.get(f"{API}/notifications/unread-count", headers=H(tok_adm)).json()["count"]
        assert after2 == 0

    def test_notifications_scoped_to_role(self, toks):
        tok_ao, _ = toks["ao"]
        r = requests.get(f"{API}/notifications", headers=H(tok_ao))
        assert r.status_code == 200
        # AO Pembiayaan should NOT see Admin notifications
        assert all(n.get("recipient_role") != "Admin" for n in r.json()) or r.json() == []


# ================= PDF REKAP =================
class TestPdfExport:
    def test_ao_can_download_own_pdf(self, toks):
        tok, user = toks["ao"]
        r = requests.get(f"{API}/reports/ao-pdf/{user['id']}?periode=2026-03", headers=H(tok))
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content.startswith(b"%PDF"), "response is not a PDF"
        assert len(r.content) > 1000

    def test_admin_can_download_any_ao_pdf(self, toks):
        tok_adm, _ = toks["adm"]
        _, ao = toks["ao"]
        r = requests.get(f"{API}/reports/ao-pdf/{ao['id']}?periode=2026-03", headers=H(tok_adm))
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF")

    def test_ao_forbidden_for_other_ao(self, toks):
        tok, _ = toks["ao"]
        # try direktur id as the target
        _, dir_user = toks["dir"]
        r = requests.get(f"{API}/reports/ao-pdf/{dir_user['id']}?periode=2026-03", headers=H(tok))
        assert r.status_code == 403


# ================= RESTORE DB =================
class TestRestore:
    def test_backup_then_restore_preserves_passwords_and_data(self, toks):
        tok, _ = toks["adm"]
        # 1) backup
        r = requests.get(f"{API}/data/backup", headers=H(tok))
        assert r.status_code == 200
        dump = json.loads(r.content)
        assert "users" in dump["collections"]

        # 2) add a marker lending row after backup so we know restore rolled it back
        _, ao = toks["ao"]
        marker = "TEST-RESTORE-MARKER-XYZ"
        requests.post(f"{API}/transactions/lending", headers=H(tok), json={
            "nomor_kontrak": marker, "jenis_akad": "Murabahah",
            "nama_nasabah": "Marker", "jumlah_pencairan": 1000,
            "tanggal_pencairan": "2026-03-15", "ao_id": ao["id"],
        })
        r_check = requests.get(f"{API}/transactions/lending?periode=2026-03&ao_id={ao['id']}", headers=H(tok))
        assert any(x["nomor_kontrak"] == marker for x in r_check.json())

        # 3) restore
        files = {"file": ("backup.json", json.dumps(dump).encode(), "application/json")}
        r2 = requests.post(f"{API}/data/restore", headers=H(tok), files=files)
        assert r2.status_code == 200, r2.text
        j = r2.json()
        assert j["success"] is True
        assert "users" in j["restored"]

        # 4) marker should be gone
        r3 = requests.get(f"{API}/transactions/lending?periode=2026-03&ao_id={ao['id']}", headers=H(tok))
        assert not any(x["nomor_kontrak"] == marker for x in r3.json())

        # 5) passwords preserved → admin can still login with NEW_PW
        r4 = requests.post(f"{API}/auth/login", json={"kode_marketing": KODE["adm"], "password": NEW_PW})
        assert r4.status_code == 200, r4.text
