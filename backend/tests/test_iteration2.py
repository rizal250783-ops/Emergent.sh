"""BSI ASSET DEAL — Iteration 2 tests.
Covers new features: cascading public/locations, wilayah reference proxy,
private legal documents (upload/list/link/delete + RBAC + signed URL),
coordinates persistence, share/no-documents in public view.
"""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://emergent-setup-34.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


def _login(username, password):
    r = requests.post(f"{API}/auth/login", json={"username": username, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {username} failed: {r.status_code} {r.text}"
    return r.json()


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def ma_login():
    return _login("2190020284", "BSI@2026")  # ACR BANDA ACEH MA


@pytest.fixture(scope="module")
def ma_token(ma_login):
    return ma_login["access_token"]


@pytest.fixture(scope="module")
def acrm_same_token():
    return _login("2188009250", "BSI@2026")["access_token"]  # ACR BANDA ACEH ACRM


@pytest.fixture(scope="module")
def acrm_other_token():
    return _login("2182001667", "BSI@2026")["access_token"]  # ACR PADANG ACRM


@pytest.fixture(scope="module")
def admin_token():
    return _login("admin", "Admin@2026")["access_token"]


# Minimal valid single-page PDF
PDF_BYTES = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 100 100]>>endobj\n"
    b"xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000099 00000 n \n"
    b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n150\n%%EOF"
)


# ---------- Public cascading locations ----------
class TestPublicLocations:
    def test_level_provinsi(self):
        r = requests.get(f"{API}/public/locations", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["level"] == "provinsi"
        assert isinstance(d["options"], list) and len(d["options"]) >= 1
        # options sorted
        assert d["options"] == sorted(d["options"])

    def test_level_kabupaten(self):
        r = requests.get(f"{API}/public/locations", params={"provinsi": "DKI Jakarta"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["level"] == "kabupaten_kota"
        assert len(d["options"]) >= 1

    def test_level_kecamatan(self):
        r = requests.get(f"{API}/public/locations",
                         params={"provinsi": "DKI Jakarta", "kabupaten_kota": "Kota Jakarta Utara"},
                         timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["level"] == "kecamatan"
        assert "Kelapa Gading" in d["options"]

    def test_level_wilayah_level_4(self):
        r = requests.get(f"{API}/public/locations",
                         params={"provinsi": "DKI Jakarta", "kabupaten_kota": "Kota Jakarta Utara",
                                 "kecamatan": "Kelapa Gading"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["level"] == "wilayah_level_4"
        assert "Kelapa Gading Barat" in d["options"]


# ---------- Public catalog with location filters + coordinates ----------
class TestPublicCatalogLocation:
    def test_full_location_filter_and_coords(self):
        r = requests.get(f"{API}/public/catalog",
                         params={"provinsi": "DKI Jakarta",
                                 "kabupaten_kota": "Kota Jakarta Utara",
                                 "kecamatan": "Kelapa Gading",
                                 "wilayah_level_4": "Kelapa Gading Barat"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 1, f"expected >=1 item, got {d['total']}"
        assert len(d["items"]) >= 1
        it = d["items"][0]
        # coordinates present
        assert it.get("latitude") is not None
        assert it.get("longitude") is not None
        # documents must NOT be exposed publicly
        assert "documents" not in it, f"'documents' leaked in public catalog list: {list(it.keys())}"

    def test_public_detail_no_documents_key(self):
        r = requests.get(f"{API}/public/catalog", timeout=15).json()
        aid = r["items"][0]["id"]
        det = requests.get(f"{API}/public/catalog/{aid}", timeout=15).json()
        assert "documents" not in det, f"documents leaked in public detail: {list(det.keys())}"


# ---------- Wilayah reference proxy ----------
class TestWilayah:
    def test_provinces_and_title_case(self):
        r = requests.get(f"{API}/wilayah/provinces", timeout=25)
        assert r.status_code == 200, r.text
        provs = r.json()
        assert isinstance(provs, list)
        assert len(provs) >= 34, f"expected ~38 provinces, got {len(provs)}"
        names = {p["name"] for p in provs}
        # Title-cased
        assert "DKI Jakarta" in names, f"missing 'DKI Jakarta', sample={list(names)[:5]}"
        assert "Jawa Barat" in names, f"missing 'Jawa Barat'"
        for p in provs:
            assert "id" in p and "name" in p

    def test_regencies_31(self):
        r = requests.get(f"{API}/wilayah/regencies/31", timeout=25)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list) and len(d) >= 5
        for x in d:
            assert "id" in x and "name" in x

    def test_districts_3171(self):
        r = requests.get(f"{API}/wilayah/districts/3171", timeout=25)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list) and len(d) >= 5

    def test_villages_3171010(self):
        r = requests.get(f"{API}/wilayah/villages/3171010", timeout=25)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list) and len(d) >= 1

    def test_cache_second_call(self):
        # Second call must still return 200 (and should be faster, but latency-sensitive so just check 200)
        t0 = time.time()
        r = requests.get(f"{API}/wilayah/provinces", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) >= 34
        # Log for context but do not assert strictly on timing
        elapsed = time.time() - t0
        print(f"provinces second-call elapsed={elapsed:.3f}s")


# ---------- Private Legal Documents ----------
class TestPrivateDocuments:
    """Full flow on Banda Aceh MA's first asset."""

    @pytest.fixture(scope="class", autouse=True)
    def asset_id(self, ma_token):
        mine = requests.get(f"{API}/assets/mine", headers=H(ma_token), timeout=15).json()
        assert isinstance(mine, list) and len(mine) > 0, "MA has no assets"
        # prefer the demo published Banda Aceh asset with 4-5 photos if exists
        pref = [a for a in mine if a.get("status") == "PUBLISHED"]
        aid = (pref[0] if pref else mine[0])["id"]
        pytest.aid = aid
        # cleanup existing test documents ('t.pdf' 13 bytes may exist)
        docs = requests.get(f"{API}/assets/{aid}/documents", headers=H(ma_token), timeout=15).json()
        for d in docs:
            requests.delete(f"{API}/assets/{aid}/documents/{d['id']}", headers=H(ma_token), timeout=15)
        return aid

    def test_reject_unsupported_type(self, ma_token):
        files = {"file": ("t.txt", b"hello", "text/plain")}
        data = {"jenis": "Sertifikat (SHM)"}
        r = requests.post(f"{API}/assets/{pytest.aid}/documents",
                          headers=H(ma_token), files=files, data=data, timeout=20)
        assert r.status_code == 400, r.text

    def test_upload_pdf(self, ma_token):
        files = {"file": ("test.pdf", PDF_BYTES, "application/pdf")}
        data = {"jenis": "Sertifikat (SHM)"}
        r = requests.post(f"{API}/assets/{pytest.aid}/documents",
                          headers=H(ma_token), files=files, data=data, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_public"] is False
        assert "storage_path" not in d, f"storage_path leaked: {d}"
        assert d["jenis_dokumen"] == "Sertifikat (SHM)"
        assert d["content_type"] == "application/pdf"
        pytest.doc_id = d["id"]

    def test_list_documents(self, ma_token):
        r = requests.get(f"{API}/assets/{pytest.aid}/documents", headers=H(ma_token), timeout=15)
        assert r.status_code == 200
        docs = r.json()
        assert any(d["id"] == pytest.doc_id for d in docs)
        for d in docs:
            assert "storage_path" not in d

    def test_get_link_and_download(self, ma_token):
        r = requests.get(f"{API}/assets/{pytest.aid}/documents/{pytest.doc_id}/link",
                         headers=H(ma_token), timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["url"].startswith("/api/files/private/"), f"bad url: {j['url']}"
        # follow signed URL
        r2 = requests.get(f"{BASE_URL}{j['url']}", timeout=15)
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("application/pdf")
        assert r2.content[:4] == b"%PDF"

    def test_bad_token_rejected(self):
        r = requests.get(f"{API}/files/private/{pytest.doc_id}?token=bad", timeout=15)
        assert r.status_code == 401

    def test_private_path_via_public_file_route_forbidden(self):
        r = requests.get(f"{API}/files/bsi-asset-deal/private/anything.pdf", timeout=15)
        assert r.status_code == 403

    def test_internal_asset_shows_documents_without_storage_path(self, ma_token):
        r = requests.get(f"{API}/assets/{pytest.aid}", headers=H(ma_token), timeout=15)
        assert r.status_code == 200
        det = r.json()
        assert "documents" in det
        assert any(d["id"] == pytest.doc_id for d in det["documents"])
        for d in det["documents"]:
            assert "storage_path" not in d

    def test_public_detail_no_documents_key(self):
        # Only applies if this asset is PUBLISHED — if DRAFT, 404 expected
        r = requests.get(f"{API}/public/catalog/{pytest.aid}", timeout=15)
        if r.status_code == 200:
            det = r.json()
            assert "documents" not in det

    # ---------- RBAC ----------
    def test_acrm_same_acr_can_list(self, acrm_same_token):
        r = requests.get(f"{API}/assets/{pytest.aid}/documents",
                         headers=H(acrm_same_token), timeout=15)
        assert r.status_code == 200

    def test_acrm_other_acr_forbidden(self, acrm_other_token):
        r = requests.get(f"{API}/assets/{pytest.aid}/documents",
                         headers=H(acrm_other_token), timeout=15)
        assert r.status_code == 403

    def test_admin_can_list(self, admin_token):
        r = requests.get(f"{API}/assets/{pytest.aid}/documents",
                         headers=H(admin_token), timeout=15)
        assert r.status_code == 200

    def test_acrm_cannot_upload(self, acrm_same_token):
        files = {"file": ("z.pdf", PDF_BYTES, "application/pdf")}
        r = requests.post(f"{API}/assets/{pytest.aid}/documents",
                          headers=H(acrm_same_token), files=files,
                          data={"jenis": "Sertifikat (SHM)"}, timeout=20)
        assert r.status_code == 403

    def test_unauth_list_rejected(self):
        r = requests.get(f"{API}/assets/{pytest.aid}/documents", timeout=15)
        assert r.status_code == 401

    def test_delete_and_verify_empty(self, ma_token):
        r = requests.delete(f"{API}/assets/{pytest.aid}/documents/{pytest.doc_id}",
                            headers=H(ma_token), timeout=15)
        assert r.status_code == 200
        docs = requests.get(f"{API}/assets/{pytest.aid}/documents",
                            headers=H(ma_token), timeout=15).json()
        assert not any(d["id"] == pytest.doc_id for d in docs)


# ---------- Coordinates persistence ----------
class TestCoordinatesPersistence:
    def test_put_coordinates_persists(self, ma_token):
        mine = requests.get(f"{API}/assets/mine", headers=H(ma_token), timeout=15).json()
        # Choose asset in a state that MA can still edit (avoid PUBLISHED to prevent revalidation flow)
        editable = [a for a in mine if a.get("status") in
                    ["DRAFT", "RETURN_TO_MARKETING", "RETURN_FROM_RCG", "PUBLISHED"]]
        assert editable, "no editable asset"
        aid = editable[0]["id"]
        det = requests.get(f"{API}/assets/{aid}", headers=H(ma_token), timeout=15).json()
        # Build a minimal PUT payload preserving required fields
        payload = {k: det.get(k) for k in [
            "judul_asset", "deskripsi", "id_category", "id_subcategory",
            "alamat", "provinsi", "kabupaten_kota", "kecamatan",
            "wilayah_level_4", "tipe_wilayah", "luas_tanah", "luas_bangunan",
            "harga_limit", "nilai_appraisal", "kondisi_asset"
        ]}
        payload["latitude"] = -6.2
        payload["longitude"] = 106.8
        r = requests.put(f"{API}/assets/{aid}", headers=H(ma_token), json=payload, timeout=20)
        assert r.status_code == 200, r.text
        det2 = requests.get(f"{API}/assets/{aid}", headers=H(ma_token), timeout=15).json()
        assert det2.get("latitude") == -6.2
        assert det2.get("longitude") == 106.8
        # If asset is PUBLISHED (or update-pending flow doesn't touch it) it may show in public
        # Only assert public reflects if status stays PUBLISHED.
        r3 = requests.get(f"{API}/public/catalog/{aid}", timeout=15)
        if r3.status_code == 200:
            assert r3.json().get("latitude") == -6.2
            assert r3.json().get("longitude") == 106.8
