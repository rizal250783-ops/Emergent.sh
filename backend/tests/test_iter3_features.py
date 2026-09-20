"""Iter-3 backend tests:
- Notifikasi Multi-Peran (AO gets notified on approve AND reject; Admin still on reject)
- Riwayat Import (audit_logs surfaced via /data/import-history)
- Grafik PDF (per-AO PDF still returns application/pdf, larger due to charts)
- Perbandingan Antar-AO (/compare endpoint: min 2, max 3, role-guarded)
"""
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

KODE = {"dir": "001", "adm": "002", "ao": "003", "ao2": "042", "ao3": "050", "aof": "008"}


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


def _seed_incentive(tok_adm, ao_id, periode="2026-03", nominal=500000):
    """Set target + add lending exceeding target + admin submits an incentive; returns id."""
    requests.post(f"{API}/targets", headers=H(tok_adm), json={
        "ao_id": ao_id, "periode": periode,
        "target_pencairan": 10000000, "target_funding": 0, "target_recovery": 0,
    })
    requests.post(f"{API}/transactions/lending", headers=H(tok_adm), json={
        "nomor_kontrak": f"NTF-{ao_id[-4:]}-{nominal}",
        "jenis_akad": "Murabahah", "nama_nasabah": "TEST NTF",
        "jumlah_pencairan": 20000000, "tanggal_pencairan": f"{periode}-05",
        "ao_id": ao_id,
    })
    r = requests.post(f"{API}/incentives/target", headers=H(tok_adm), json={
        "ao_id": ao_id, "periode": periode, "kategori": "target_pembiayaan",
        "jenis_perhitungan": "manual", "nilai_manual": nominal,
    })
    assert r.status_code == 200, r.text
    return r.json()["id"]


# ============ NOTIFIKASI MULTI-PERAN ============
class TestNotifikasiMultiPeran:
    def test_approve_notifies_ao_only(self, toks):
        tok_adm, _ = toks["adm"]
        tok_dir, _ = toks["dir"]
        tok_ao, ao = toks["ao"]

        inc_id = _seed_incentive(tok_adm, ao["id"], "2026-03", 510000)

        # baselines
        base_ao = requests.get(f"{API}/notifications/unread-count", headers=H(tok_ao)).json()["count"]
        base_adm = requests.get(f"{API}/notifications/unread-count", headers=H(tok_adm)).json()["count"]

        r = requests.post(f"{API}/incentives/approve", headers=H(tok_dir),
                          json={"ids": [inc_id], "action": "approve"})
        assert r.status_code == 200, r.text

        # AO should receive a new unread notif titled 'Insentif Anda disetujui'
        ao_list = requests.get(f"{API}/notifications", headers=H(tok_ao)).json()
        approved = [n for n in ao_list
                    if n.get("tipe") == "insentif_disetujui"
                    and (n.get("ref") or {}).get("incentive_id") == inc_id]
        assert len(approved) == 1, f"AO didn't get approval notification: {ao_list[:3]}"
        assert "disetujui" in approved[0]["judul"].lower()
        assert approved[0]["is_read"] is False
        assert approved[0].get("recipient_kode") == "003"

        after_ao = requests.get(f"{API}/notifications/unread-count", headers=H(tok_ao)).json()["count"]
        assert after_ao >= base_ao + 1

        # Admin should NOT get any 'insentif_disetujui' referencing this id
        adm_list = requests.get(f"{API}/notifications", headers=H(tok_adm)).json()
        adm_hit = [n for n in adm_list
                   if (n.get("ref") or {}).get("incentive_id") == inc_id
                   and n.get("tipe") == "insentif_disetujui"]
        assert adm_hit == [], "Admin should not receive approval notifications"

    def test_reject_notifies_both_admin_and_ao(self, toks):
        tok_adm, _ = toks["adm"]
        tok_dir, _ = toks["dir"]
        tok_ao, ao = toks["ao"]

        inc_id = _seed_incentive(tok_adm, ao["id"], "2026-03", 520000)
        base_ao = requests.get(f"{API}/notifications/unread-count", headers=H(tok_ao)).json()["count"]
        base_adm = requests.get(f"{API}/notifications/unread-count", headers=H(tok_adm)).json()["count"]

        r = requests.post(f"{API}/incentives/approve", headers=H(tok_dir),
                          json={"ids": [inc_id], "action": "reject", "reason": "salah kategori"})
        assert r.status_code == 200

        # Admin gets 'Insentif ditolak Direktur'
        adm_list = requests.get(f"{API}/notifications", headers=H(tok_adm)).json()
        adm_hit = [n for n in adm_list
                   if n.get("tipe") == "insentif_ditolak"
                   and (n.get("ref") or {}).get("incentive_id") == inc_id
                   and n.get("recipient_role") == "Admin"]
        assert len(adm_hit) == 1
        assert "ditolak direktur" in adm_hit[0]["judul"].lower()

        # AO gets 'Insentif Anda ditolak'
        ao_list = requests.get(f"{API}/notifications", headers=H(tok_ao)).json()
        ao_hit = [n for n in ao_list
                  if n.get("tipe") == "insentif_ditolak"
                  and (n.get("ref") or {}).get("incentive_id") == inc_id
                  and n.get("recipient_kode") == "003"]
        assert len(ao_hit) == 1
        assert "anda ditolak" in ao_hit[0]["judul"].lower()

        assert requests.get(f"{API}/notifications/unread-count", headers=H(tok_ao)).json()["count"] >= base_ao + 1
        assert requests.get(f"{API}/notifications/unread-count", headers=H(tok_adm)).json()["count"] >= base_adm + 1


# ============ RIWAYAT IMPORT ============
class TestRiwayatImport:
    def test_import_appears_in_history(self, toks):
        tok, _ = toks["adm"]
        payload = [{
            "nomor_kontrak": "HIST-1", "jenis_akad": "Murabahah",
            "nama_nasabah": "Uji Riwayat", "jumlah_pencairan": "70000000",
            "tanggal_pencairan": "2026-03-08", "kode_marketing": "003",
        }]
        files = {"file": ("hist.json", json.dumps(payload).encode(), "application/json")}
        r = requests.post(f"{API}/data/import-preview/pencapaian_pembiayaan",
                          headers=H(tok), files=files)
        assert r.status_code == 200
        rows = [x["data"] for x in r.json()["rows"] if x["valid"]]
        r2 = requests.post(f"{API}/data/import-commit/pencapaian_pembiayaan",
                           headers=H(tok), json={"rows": rows})
        assert r2.status_code == 200
        assert r2.json()["imported"] == 1

        # verify history endpoint
        h = requests.get(f"{API}/data/import-history", headers=H(tok))
        assert h.status_code == 200
        items = h.json()
        matches = [x for x in items
                   if "pencapaian_pembiayaan" in (x.get("aktivitas") or "")
                   and (x.get("data_sesudah") or {}).get("jumlah") == 1]
        assert matches, f"no matching import-history row; items[:3]={items[:3]}"
        # audit fields required by the table (waktu, oleh siapa, jenis, jumlah baris)
        top = matches[0]
        assert top.get("user_nama")
        assert top.get("waktu")
        assert isinstance(top.get("data_sesudah", {}).get("jumlah"), int)

    def test_import_history_admin_only(self, toks):
        tok_ao, _ = toks["ao"]
        r = requests.get(f"{API}/data/import-history", headers=H(tok_ao))
        assert r.status_code == 403


# ============ GRAFIK PDF ============
class TestGrafikPdf:
    def test_ao_pdf_contains_charts(self, toks):
        tok, user = toks["ao"]
        r = requests.get(f"{API}/reports/ao-pdf/{user['id']}?periode=2026-03", headers=H(tok))
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content.startswith(b"%PDF")
        # With charts embedded, size should be reasonably large (>10KB)
        assert len(r.content) > 10000, f"PDF too small ({len(r.content)} bytes) — charts likely missing"

    def test_ao_pdf_admin_can_download(self, toks):
        tok_adm, _ = toks["adm"]
        _, ao = toks["ao"]
        r = requests.get(f"{API}/reports/ao-pdf/{ao['id']}?periode=2026-03", headers=H(tok_adm))
        assert r.status_code == 200
        assert r.content.startswith(b"%PDF")
        assert len(r.content) > 10000


# ============ PERBANDINGAN ANTAR-AO ============
class TestCompare:
    def test_compare_two_aos_success(self, toks):
        tok_dir, _ = toks["dir"]
        _, ao1 = toks["ao"]
        _, ao2 = toks["ao2"]
        r = requests.get(f"{API}/compare?ao_ids={ao1['id']},{ao2['id']}&periode=2026-03",
                         headers=H(tok_dir))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["periode"] == "2026-03"
        assert len(d["items"]) == 2
        for item in d["items"]:
            assert "user" in item and "kpis" in item and "riwayat" in item
            assert item["user"].get("kode_marketing")
            # no mongo _id leak
            assert "_id" not in item["user"]

    def test_compare_three_aos(self, toks):
        tok_adm, _ = toks["adm"]
        ids = ",".join([toks["ao"][1]["id"], toks["ao2"][1]["id"], toks["ao3"][1]["id"]])
        r = requests.get(f"{API}/compare?ao_ids={ids}&periode=2026-03", headers=H(tok_adm))
        assert r.status_code == 200
        assert len(r.json()["items"]) == 3

    def test_compare_min_two_required(self, toks):
        tok_dir, _ = toks["dir"]
        _, ao = toks["ao"]
        r = requests.get(f"{API}/compare?ao_ids={ao['id']}&periode=2026-03", headers=H(tok_dir))
        assert r.status_code == 400
        assert "minimal 2" in r.text.lower() or "min" in r.text.lower()

    def test_compare_caps_at_three(self, toks):
        tok_dir, _ = toks["dir"]
        # send 4 ids; endpoint should slice to 3
        ids = ",".join([toks["ao"][1]["id"], toks["ao2"][1]["id"],
                        toks["ao3"][1]["id"], toks["aof"][1]["id"]])
        r = requests.get(f"{API}/compare?ao_ids={ids}&periode=2026-03", headers=H(tok_dir))
        assert r.status_code == 200
        assert len(r.json()["items"]) == 3

    def test_compare_role_guarded(self, toks):
        tok_ao, _ = toks["ao"]
        _, ao2 = toks["ao2"]
        _, ao3 = toks["ao3"]
        r = requests.get(f"{API}/compare?ao_ids={ao2['id']},{ao3['id']}&periode=2026-03",
                         headers=H(tok_ao))
        assert r.status_code == 403
