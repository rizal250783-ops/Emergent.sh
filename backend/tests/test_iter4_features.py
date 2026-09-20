"""Iter-4 backend tests:
- Export PDF Tim (/reports/team-pdf)
- Notifikasi Target 90% & 100% (check_target_notifications, dedup)
- Filter Perbandingan (/compare?komponen=Pembiayaan/Funding/Recovery)
- Ekspor Excel Rekap AO (/reports/ao-excel/{id})
"""
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

KODE = {"dir": "001", "adm": "002", "ao": "003", "aof": "008", "ao2": "042"}


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


# ================= EXPORT PDF TIM =================
class TestTeamPdf:
    def test_direktur_download(self, toks):
        tok, _ = toks["dir"]
        r = requests.get(f"{API}/reports/team-pdf?periode=2026-03", headers=H(tok))
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content.startswith(b"%PDF")
        assert len(r.content) > 3000, f"team PDF too small ({len(r.content)} bytes)"

    def test_admin_download(self, toks):
        tok, _ = toks["adm"]
        r = requests.get(f"{API}/reports/team-pdf?periode=2026-03", headers=H(tok))
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF")

    def test_ao_forbidden(self, toks):
        tok, _ = toks["ao"]
        r = requests.get(f"{API}/reports/team-pdf?periode=2026-03", headers=H(tok))
        assert r.status_code == 403


# ============ NOTIFIKASI TARGET ============
class TestTargetNotifications:
    def _clear_target_state(self, ao_id, periode, komponen):
        # remove any prior milestone state so re-runs are deterministic
        import pymongo, os as _os
        from dotenv import load_dotenv as _ld
        _ld("/app/backend/.env")
        cli = pymongo.MongoClient(_os.environ["MONGO_URL"])
        dbn = _os.environ["DB_NAME"]
        cli[dbn]["target_notify_state"].delete_many(
            {"ao_id": ao_id, "periode": periode, "komponen": komponen})
        cli[dbn]["notifications"].delete_many(
            {"tipe": "target_progress", "ref.periode": periode, "ref.komponen": komponen})

    def test_100_percent_triggers_notif_on_lending(self, toks):
        from dotenv import load_dotenv
        load_dotenv("/app/backend/.env")
        tok_adm, _ = toks["adm"]
        tok_ao, ao = toks["ao"]
        periode = "2026-04"
        self._clear_target_state(ao["id"], periode, "Pembiayaan")

        # Set small target
        r = requests.post(f"{API}/targets", headers=H(tok_adm), json={
            "ao_id": ao["id"], "periode": periode,
            "target_pencairan": 50000000, "target_funding": 0, "target_recovery": 0,
        })
        assert r.status_code == 200, r.text

        # Add lending >= target (60jt >= 50jt => 120%)
        r = requests.post(f"{API}/transactions/lending", headers=H(tok_adm), json={
            "nomor_kontrak": f"TGT-100-{periode}",
            "jenis_akad": "Murabahah", "nama_nasabah": "TEST TGT100",
            "jumlah_pencairan": 60000000, "tanggal_pencairan": f"{periode}-05",
            "ao_id": ao["id"],
        })
        assert r.status_code == 200, r.text

        # AO should get "Target Pembiayaan tercapai!"
        nots = requests.get(f"{API}/notifications", headers=H(tok_ao)).json()
        hit = [n for n in nots if n.get("tipe") == "target_progress"
               and (n.get("ref") or {}).get("periode") == periode
               and (n.get("ref") or {}).get("komponen") == "Pembiayaan"]
        assert hit, f"No target notif for AO. notes[:3]={nots[:3]}"
        assert "tercapai" in hit[0]["judul"].lower()
        assert hit[0].get("recipient_kode") == "003"
        assert hit[0]["is_read"] is False

    def test_90_percent_triggers_mendekati(self, toks):
        tok_adm, _ = toks["adm"]
        tok_ao, ao = toks["ao"]
        periode = "2026-05"
        self._clear_target_state(ao["id"], periode, "Pembiayaan")

        # Wipe any pre-existing lending for this AO+periode so we control the total
        import pymongo, os as _os
        cli = pymongo.MongoClient(_os.environ.get("MONGO_URL") or _os.environ["MONGO_URL"])
        dbn = _os.environ.get("DB_NAME") or "test_database"
        # Load from backend .env if needed
        if not _os.environ.get("MONGO_URL"):
            from dotenv import load_dotenv as _ld
            _ld("/app/backend/.env")
            cli = pymongo.MongoClient(_os.environ["MONGO_URL"])
            dbn = _os.environ["DB_NAME"]
        cli[dbn]["lending_achievement_details"].delete_many(
            {"ao_id": ao["id"], "periode": periode})

        # Set a high target so 92jt is only ~92% (mendekati)
        r = requests.post(f"{API}/targets", headers=H(tok_adm), json={
            "ao_id": ao["id"], "periode": periode,
            "target_pencairan": 100000000, "target_funding": 0, "target_recovery": 0,
        })
        assert r.status_code == 200

        r = requests.post(f"{API}/transactions/lending", headers=H(tok_adm), json={
            "nomor_kontrak": f"TGT-90-{periode}",
            "jenis_akad": "Murabahah", "nama_nasabah": "TEST TGT90",
            "jumlah_pencairan": 92000000, "tanggal_pencairan": f"{periode}-05",
            "ao_id": ao["id"],
        })
        assert r.status_code == 200

        nots = requests.get(f"{API}/notifications", headers=H(tok_ao)).json()
        hit = [n for n in nots if n.get("tipe") == "target_progress"
               and (n.get("ref") or {}).get("periode") == periode
               and (n.get("ref") or {}).get("komponen") == "Pembiayaan"]
        assert hit, "No mendekati notif"
        assert "hampir" in hit[0]["judul"].lower() or "mendekati" in hit[0]["judul"].lower()

    def test_dedup_no_duplicate_on_same_milestone(self, toks):
        """Adding more transactions at same milestone level should NOT create duplicate notif."""
        tok_adm, _ = toks["adm"]
        tok_ao, ao = toks["ao"]
        periode = "2026-04"  # already at 'tercapai' from earlier test
        before = requests.get(f"{API}/notifications", headers=H(tok_ao)).json()
        before_ct = len([n for n in before if n.get("tipe") == "target_progress"
                         and (n.get("ref") or {}).get("periode") == periode
                         and (n.get("ref") or {}).get("komponen") == "Pembiayaan"])
        # Add another lending — still tercapai
        r = requests.post(f"{API}/transactions/lending", headers=H(tok_adm), json={
            "nomor_kontrak": f"TGT-100b-{periode}",
            "jenis_akad": "Murabahah", "nama_nasabah": "TEST TGT100b",
            "jumlah_pencairan": 10000000, "tanggal_pencairan": f"{periode}-06",
            "ao_id": ao["id"],
        })
        assert r.status_code == 200
        after = requests.get(f"{API}/notifications", headers=H(tok_ao)).json()
        after_ct = len([n for n in after if n.get("tipe") == "target_progress"
                        and (n.get("ref") or {}).get("periode") == periode
                        and (n.get("ref") or {}).get("komponen") == "Pembiayaan"])
        assert after_ct == before_ct, f"dedup failed: {before_ct} -> {after_ct}"


# ============ FILTER PERBANDINGAN ============
class TestCompareFilter:
    def test_compare_komponen_funding(self, toks):
        tok_dir, _ = toks["dir"]
        _, ao1 = toks["ao"]
        _, ao2 = toks["ao2"]
        r = requests.get(
            f"{API}/compare?ao_ids={ao1['id']},{ao2['id']}&periode=2026-03&komponen=Funding",
            headers=H(tok_dir))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["komponen"] == "Funding"
        assert len(d["items"]) == 2
        for it in d["items"]:
            # single KPI when komponen filter present
            assert len(it["kpis"]) == 1
            assert it["kpis"][0]["komponen"] == "Funding"

    def test_compare_komponen_pembiayaan(self, toks):
        tok_dir, _ = toks["dir"]
        _, ao1 = toks["ao"]
        _, ao2 = toks["ao2"]
        r = requests.get(
            f"{API}/compare?ao_ids={ao1['id']},{ao2['id']}&periode=2026-03&komponen=Pembiayaan",
            headers=H(tok_dir))
        assert r.status_code == 200
        d = r.json()
        for it in d["items"]:
            assert it["kpis"][0]["komponen"] == "Pembiayaan"

    def test_compare_komponen_recovery_na_for_ao(self, toks):
        """Recovery komponen for AO Pembiayaan should return 'Tidak berlaku' note."""
        tok_dir, _ = toks["dir"]
        _, ao1 = toks["ao"]
        _, ao2 = toks["ao2"]
        r = requests.get(
            f"{API}/compare?ao_ids={ao1['id']},{ao2['id']}&periode=2026-03&komponen=Recovery",
            headers=H(tok_dir))
        assert r.status_code == 200
        d = r.json()
        for it in d["items"]:
            k = it["kpis"][0]
            assert k["komponen"] == "Recovery"
            assert k["achievement"] is None

    def test_compare_invalid_komponen(self, toks):
        tok_dir, _ = toks["dir"]
        _, ao1 = toks["ao"]
        _, ao2 = toks["ao2"]
        r = requests.get(
            f"{API}/compare?ao_ids={ao1['id']},{ao2['id']}&periode=2026-03&komponen=Bogus",
            headers=H(tok_dir))
        assert r.status_code == 400

    def test_compare_semua_fallback_still_works(self, toks):
        """No komponen param → role-based multi KPIs (regression)."""
        tok_dir, _ = toks["dir"]
        _, ao1 = toks["ao"]
        _, ao2 = toks["ao2"]
        r = requests.get(
            f"{API}/compare?ao_ids={ao1['id']},{ao2['id']}&periode=2026-03",
            headers=H(tok_dir))
        assert r.status_code == 200
        d = r.json()
        # AO Pembiayaan -> Pembiayaan + Funding KPIs (2)
        for it in d["items"]:
            if it["user"]["jabatan"] == "AO Pembiayaan":
                assert len(it["kpis"]) == 2


# ============ EKSPOR EXCEL REKAP AO ============
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


class TestAoExcel:
    def test_ao_downloads_own_excel(self, toks):
        tok, user = toks["ao"]
        r = requests.get(f"{API}/reports/ao-excel/{user['id']}?periode=2026-03", headers=H(tok))
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith(XLSX_MIME)
        # xlsx is a zip → starts with PK
        assert r.content[:2] == b"PK"
        assert len(r.content) > 2000

    def test_admin_can_download_any_ao_excel(self, toks):
        tok_adm, _ = toks["adm"]
        _, ao = toks["ao"]
        r = requests.get(f"{API}/reports/ao-excel/{ao['id']}?periode=2026-03", headers=H(tok_adm))
        assert r.status_code == 200
        assert r.content[:2] == b"PK"

    def test_ao_cannot_download_other_ao(self, toks):
        tok_ao, _ = toks["ao"]
        _, other = toks["ao2"]
        r = requests.get(f"{API}/reports/ao-excel/{other['id']}?periode=2026-03", headers=H(tok_ao))
        assert r.status_code == 403

    def test_invalid_id(self, toks):
        tok, _ = toks["adm"]
        r = requests.get(f"{API}/reports/ao-excel/notanid?periode=2026-03", headers=H(tok))
        assert r.status_code == 400


# ============ REGRESSION: per-AO PDF still works ============
class TestRegressionAoPdf:
    def test_ao_pdf_still_ok(self, toks):
        tok, user = toks["ao"]
        r = requests.get(f"{API}/reports/ao-pdf/{user['id']}?periode=2026-03", headers=H(tok))
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF")

    def test_compare_min_2_still_enforced(self, toks):
        tok_dir, _ = toks["dir"]
        _, ao = toks["ao"]
        r = requests.get(f"{API}/compare?ao_ids={ao['id']}&periode=2026-03", headers=H(tok_dir))
        assert r.status_code == 400
