"""Iter-5 verification: Collection Activity GPS EXIF extraction + Google Maps link.

Tests:
1. Upload photo WITH GPS EXIF (Padang -0.9471, 100.4172) → response has latitude/longitude ~= expected.
2. Upload photo WITHOUT GPS → latitude/longitude = None, status 'Lokasi Tidak Tersedia'.
3. Regression: login, admin assign, self-input, list endpoints.
"""
import io
import os
import subprocess
import time

import piexif
import pytest
import requests
from PIL import Image

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    # fallback to frontend/.env
    with open("/app/frontend/.env") as f:
        for ln in f:
            if ln.startswith("REACT_APP_BACKEND_URL"):
                BASE = ln.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE}/api"

DEFAULT_PW = "BprsHM2026"
NEW_PW = "NewPass2026"


def _reset_pw():
    subprocess.run(["/root/.venv/bin/python", "/app/backend/tests/_reset_pw.py"],
                   check=False, cwd="/app/backend")


@pytest.fixture(scope="module", autouse=True)
def reset():
    _reset_pw()
    yield
    _reset_pw()


def _login_and_change(kode):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"kode_marketing": kode, "password": DEFAULT_PW})
    assert r.status_code == 200, f"login {kode} failed: {r.status_code} {r.text}"
    tok = r.json()["token"]
    s.headers["Authorization"] = f"Bearer {tok}"
    # change password
    r2 = s.post(f"{API}/auth/change-password",
                json={"old_password": DEFAULT_PW, "new_password": NEW_PW})
    assert r2.status_code == 200, r2.text
    # re-login
    r3 = s.post(f"{API}/auth/login", json={"kode_marketing": kode, "password": NEW_PW})
    assert r3.status_code == 200
    tok = r3.json()["token"]
    s.headers["Authorization"] = f"Bearer {tok}"
    return s


@pytest.fixture(scope="module")
def admin_session():
    return _login_and_change("002")


@pytest.fixture(scope="module")
def collector_session():
    return _login_and_change("013")


def _make_gps_jpeg(lat_ref=b"S", lat_dms=((0, 1), (56, 1), (49560, 1000)),
                   lon_ref=b"E", lon_dms=((100, 1), (25, 1), (192, 100))):
    """Padang GPS: -0.9471, 100.4172"""
    img = Image.new("RGB", (300, 200), (200, 100, 50))
    gps_ifd = {
        piexif.GPSIFD.GPSVersionID: (2, 0, 0, 0),
        piexif.GPSIFD.GPSLatitudeRef: lat_ref,
        piexif.GPSIFD.GPSLatitude: lat_dms,
        piexif.GPSIFD.GPSLongitudeRef: lon_ref,
        piexif.GPSIFD.GPSLongitude: lon_dms,
    }
    exif_dict = {"0th": {}, "Exif": {piexif.ExifIFD.DateTimeOriginal: b"2026:09:21 10:30:00"},
                 "GPS": gps_ifd, "1st": {}, "thumbnail": None}
    exif_bytes = piexif.dump(exif_dict)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif_bytes)
    return buf.getvalue()


def _make_plain_jpeg():
    img = Image.new("RGB", (300, 200), (50, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# ---------- storage.extract_exif direct unit test ----------
def test_storage_extract_exif_gps():
    from PIL import Image as PImg
    from storage import extract_exif
    data = _make_gps_jpeg()
    img = PImg.open(io.BytesIO(data))
    dt, lat, lon = extract_exif(img)
    # DateTimeOriginal may or may not surface via getexif() top-level depending on Pillow version;
    # focus of this test is GPS which is the reported bug.
    assert lat is not None and lon is not None, f"expected GPS, got lat={lat}, lon={lon}, dt={dt}"
    assert abs(lat - (-0.9471)) < 0.001, f"lat {lat}"
    assert abs(lon - 100.4172) < 0.001, f"lon {lon}"


def test_storage_extract_exif_no_gps():
    from PIL import Image as PImg
    from storage import extract_exif
    img = PImg.open(io.BytesIO(_make_plain_jpeg()))
    dt, lat, lon = extract_exif(img)
    assert lat is None and lon is None


# ---------- assign + list + upload flow via API ----------
@pytest.fixture(scope="module")
def collector_user_id(admin_session):
    r = admin_session.get(f"{API}/users")
    assert r.status_code == 200
    for u in r.json():
        if u.get("kode_marketing") == "013":
            return u["id"]
    pytest.fail("user 013 not found")


@pytest.fixture(scope="module")
def activity_id(admin_session, collector_user_id):
    r = admin_session.post(f"{API}/collection/assign", json={
        "nomor_kontrak": "GPS-FIX-1",
        "nama_nasabah": "TEST GPS",
        "outstanding_pokok": 1500000,
        "assigned_to": collector_user_id,
        "periode": "2026-09",
    })
    assert r.status_code == 200, r.text
    return r.json()["id"]


def test_upload_gps_photo(collector_session, activity_id):
    files = {"files": ("gps.jpg", _make_gps_jpeg(), "image/jpeg")}
    r = collector_session.post(f"{API}/collection/{activity_id}/photos",
                               files=files, data={"activity_date": "2026-09-21"})
    assert r.status_code == 200, r.text
    photos = r.json()["photos"]
    assert len(photos) == 1
    p = photos[0]
    assert p["latitude"] is not None and p["longitude"] is not None, f"got {p}"
    assert abs(p["latitude"] - (-0.9471)) < 0.001
    assert abs(p["longitude"] - 100.4172) < 0.001
    assert p["status_validasi"] in ("Valid", "Perlu Verifikasi Admin")


def test_upload_plain_photo(collector_session, activity_id):
    files = {"files": ("plain.jpg", _make_plain_jpeg(), "image/jpeg")}
    r = collector_session.post(f"{API}/collection/{activity_id}/photos",
                               files=files, data={"activity_date": "2026-09-21"})
    assert r.status_code == 200, r.text
    p = r.json()["photos"][0]
    assert p["latitude"] is None and p["longitude"] is None
    assert p["status_validasi"] == "Lokasi Tidak Tersedia"


def test_list_collection_activity_includes_photos(collector_session, activity_id):
    r = collector_session.get(f"{API}/collection")
    assert r.status_code == 200
    acts = r.json()
    target = next((a for a in acts if a.get("id") == activity_id), None)
    assert target is not None, "activity not returned to assignee"
    assert "photos" in target and len(target["photos"]) >= 2
    gps_photos = [ph for ph in target["photos"] if ph.get("latitude") is not None]
    assert len(gps_photos) >= 1


def test_admin_can_list_all(admin_session, activity_id):
    r = admin_session.get(f"{API}/collection")
    assert r.status_code == 200
    ids = [a.get("id") for a in r.json()]
    assert activity_id in ids


def test_self_input_regression(collector_session):
    r = collector_session.post(f"{API}/collection/self", json={
        "nomor_kontrak": "SELF-GPS-1",
        "nama_nasabah": "TEST SELF",
        "outstanding_pokok": 500000,
        "status_penagihan": "Berkomunikasi",
        "catatan": "regression",
        "periode": "2026-09",
    })
    assert r.status_code == 200, r.text
