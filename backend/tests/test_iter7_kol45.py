"""Iter-7 regression tests: Recovery (Kol.4+5) new feature for Collection & Remedial.
Does NOT modify passwords (per iter-7 spec: all accounts BprsHM2026, no forced reset)."""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
PW = "BprsHM2026"
PERIODE = "2026-09"


def _login(kode):
    r = requests.post(f"{API}/auth/login", json={"kode_marketing": kode, "password": PW})
    assert r.status_code == 200, f"login {kode}: {r.status_code} {r.text}"
    d = r.json()
    return d["token"], d["user"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def admin():
    return _login("002")


@pytest.fixture(scope="module")
def col013():
    return _login("013")


@pytest.fixture(scope="module")
def col086():
    return _login("086")


class TestKol45Feature:
    def test_set_target_recovery_kol45(self, admin, col013):
        tok, _ = admin
        _, u = col013
        payload = {
            "ao_id": u["id"], "periode": PERIODE,
            "target_pencairan": 0, "target_funding": 0,
            "target_recovery": 50000000, "target_recovery_kol45": 25000000,
        }
        r = requests.post(f"{API}/targets", headers=H(tok), json=payload)
        assert r.status_code == 200, r.text
        r2 = requests.get(f"{API}/targets?periode={PERIODE}&ao_id={u['id']}", headers=H(tok))
        assert r2.status_code == 200
        docs = r2.json()
        assert len(docs) >= 1
        assert docs[0].get("target_recovery_kol45") == 25000000

    def test_dashboard_me_col013_has_two_kpis(self, col013):
        tok, _ = col013
        r = requests.get(f"{API}/dashboard/me?periode={PERIODE}", headers=H(tok))
        assert r.status_code == 200, r.text
        kpis = r.json()["kpis"]
        komponens = [k["komponen"] for k in kpis]
        assert "Recovery (Kol.3)" in komponens
        assert "Recovery (Kol.4+5)" in komponens
        k45 = next(k for k in kpis if k["komponen"] == "Recovery (Kol.4+5)")
        assert k45["realisasi"] == 10000000
        assert k45["target"] == 25000000
        assert 39 <= k45.get("achievement", 0) <= 41  # 40%

    def test_leaderboard_kol45(self, admin, col013, col086):
        tok, _ = admin
        r = requests.get(f"{API}/leaderboard",
                         params={"komponen": "Recovery (Kol.4+5)", "periode": PERIODE},
                         headers=H(tok))
        assert r.status_code == 200, r.text
        rows = r.json()["rows"]
        by_kode = {r["kode_marketing"]: r for r in rows if "kode_marketing" in r}
        # fallback if key is different
        if not by_kode:
            by_kode = {r.get("kode") or r.get("kode_marketing"): r for r in rows}
        assert "013" in by_kode, f"013 missing. rows={rows}"
        assert "086" in by_kode, f"086 missing. rows={rows}"
        # 013 realisasi 10jt, target 25jt → 40%
        row013 = by_kode["013"]
        assert row013.get("realisasi") == 10000000

    def test_executive_has_recovery_kol45(self, admin):
        tok, _ = admin
        r = requests.get(f"{API}/dashboard/executive?periode={PERIODE}", headers=H(tok))
        assert r.status_code == 200
        d = r.json()
        assert "recovery_kol45" in d
        rk = d["recovery_kol45"]
        assert rk["realisasi"] == 10000000
        assert rk["target"] == 25000000

    def test_riwayat_col013_has_kol45(self, admin, col013):
        tok_adm, _ = admin
        _, u = col013
        # Try user-specific riwayat first, fallback to me
        r = requests.get(f"{API}/riwayat/user/{u['id']}", headers=H(tok_adm))
        if r.status_code != 200:
            tok_c, _ = col013
            r = requests.get(f"{API}/riwayat/me", headers=H(tok_c))
        assert r.status_code == 200, r.text
        rows = r.json()
        sep = [x for x in rows if x.get("periode") == PERIODE or x.get("bulan") == PERIODE]
        assert sep, f"no sep row: {rows}"
        row = sep[0]
        assert "realisasi_kol45" in row
        assert row["realisasi_kol45"] == 10000000
        assert row.get("target_kol45") == 25000000

    def test_compare_kol45_component(self, admin, col013, col086):
        tok, _ = admin
        _, u13 = col013
        _, u86 = col086
        r = requests.get(f"{API}/compare",
                         params={"ao_ids": f"{u13['id']},{u86['id']}",
                                 "komponen": "Recovery (Kol.4+5)",
                                 "periode": PERIODE},
                         headers=H(tok))
        assert r.status_code == 200, r.text
