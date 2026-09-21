import io
import os
import uuid
from datetime import datetime

import requests
from PIL import Image, ImageDraw, ImageFont, ExifTags

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "ao360"

_storage_key = None

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "heic": "image/jpeg", "heif": "image/jpeg", "webp": "image/webp",
}


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def _to_float(v):
    """Coerce EXIF value: IFDRational, (num, den) tuple, or plain number."""
    if isinstance(v, (tuple, list)) and len(v) >= 2:
        den = float(v[1])
        return float(v[0]) / den if den else 0.0
    return float(v)


def _dms_to_deg(dms, ref):
    """Convert GPS DMS (any EXIF representation) to decimal degrees. None if invalid."""
    try:
        vals = [_to_float(v) for v in list(dms)[:3]]
        while len(vals) < 3:
            vals.append(0.0)
        deg_v, min_v, sec_v = vals
        # sanity: minutes/seconds must be within range (tolerate 60.0 from rounding)
        if deg_v < 0 or not (0 <= min_v <= 60) or not (0 <= sec_v <= 60):
            return None
        deg = deg_v + min_v / 60 + sec_v / 3600
        if deg > 180:
            return None
        if ref in ("S", "W", b"S", b"W"):
            deg = -deg
        return round(deg, 6)
    except Exception:
        return None


def extract_exif(img: Image.Image):
    """Return (exif_datetime_str_or_None, latitude, longitude)."""
    lat = lon = None
    dt = None
    try:
        exif = img.getexif()
    except Exception:
        exif = {}
    try:
        dt_val = exif.get(36867) or exif.get(306)  # DateTimeOriginal / DateTime
        if not dt_val:
            try:
                sub = exif.get_ifd(0x8769)  # Exif sub-IFD (most cameras store DateTimeOriginal here)
                dt_val = sub.get(36867)
            except Exception:
                dt_val = None
        if dt_val:
            dt = str(dt_val)
        gps = exif.get_ifd(0x8825)  # GPS IFD
    except Exception:
        gps = {}
    if gps:
        lat_v = gps.get(2)
        lon_v = gps.get(4)
        if lat_v is not None and lon_v is not None:
            lat = _dms_to_deg(lat_v, gps.get(1, "N"))
            lon = _dms_to_deg(lon_v, gps.get(3, "E"))
    return dt, lat, lon


BULAN_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli",
            "Agustus", "September", "Oktober", "November", "Desember"]


def _fmt_tanggal_wib(timestamp_str: str):
    try:
        dt = datetime.strptime(str(timestamp_str), "%Y:%m:%d %H:%M:%S")
    except Exception:
        dt = datetime.now()
    return f"{dt.day} {BULAN_ID[dt.month - 1]} {dt.year}", f"{dt.hour:02d}:{dt.minute:02d}"


def process_photo(data: bytes, pic_name: str, lat, lon, timestamp_str: str):
    """Fallback watermark server-side: strip gradient emerald + garis emas, 3 baris."""
    img = Image.open(io.BytesIO(data)).convert("RGB")
    max_side = 1500
    if max(img.width, img.height) > max_side:
        ratio = max_side / max(img.width, img.height)
        img = img.resize((max(1, int(img.width * ratio)), max(1, int(img.height * ratio))))
    tgl, jam = _fmt_tanggal_wib(timestamp_str)
    lines = [
        "PT BPRS HAJI MISKIN — COLLECTION ACTIVITY",
        f"Tanggal: {tgl}   Jam: {jam} WIB   PIC: {pic_name}",
        f"Lokasi: {lat}, {lon}" if lat is not None and lon is not None else "Lokasi: (tidak tersedia)",
    ]
    font_size = max(14, img.width // 48)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()
    line_h = int(font_size * 1.6)
    pad = int(font_size * 0.9)
    strip_h = line_h * len(lines) + pad
    gold_h = max(3, font_size // 4)
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    a0, a1 = 115, 235
    for yy in range(strip_h):
        alpha = max(0, min(255, int(a0 + (a1 - a0) * (yy / max(1, strip_h - 1)))))
        od.line([(0, img.height - strip_h + yy), (img.width, img.height - strip_h + yy)],
                fill=(6, 78, 59, alpha))
    od.rectangle([(0, img.height - strip_h - gold_h), (img.width, img.height - strip_h)],
                 fill=(212, 175, 55, 255))
    img = Image.alpha_composite(img.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(img)
    y = img.height - strip_h + pad // 2
    for ln in lines:
        draw.text((pad, y), ln, fill=(255, 255, 255, 255), font=font)
        y += line_h
    out = io.BytesIO()
    img.convert("RGB").save(out, format="JPEG", quality=85)
    return out.getvalue()


def store_processed_photo(data: bytes, user_id: str) -> str:
    """Simpan foto yang sudah di-watermark (client-side) ke object storage, return path."""
    path = f"{APP_NAME}/collection/{user_id}/{uuid.uuid4()}.jpg"
    put_object(path, data, "image/jpeg")
    return path


def upload_collection_photo(data: bytes, filename: str, user_id: str, pic_name: str,
                            activity_date: str, lat_override=None, lon_override=None,
                            tanggal_foto=None):
    """Process one raw collection photo (fallback). Returns storage_path + validation metadata."""
    try:
        src = Image.open(io.BytesIO(data))
        exif_dt, lat, lon = extract_exif(src)
    except Exception:
        exif_dt, lat, lon = None, None, None

    if lat_override is not None and lon_override is not None:
        lat, lon = round(float(lat_override), 6), round(float(lon_override), 6)

    exif_available = exif_dt is not None
    if tanggal_foto:
        photo_date = tanggal_foto
    elif exif_dt:
        photo_date = exif_dt.replace(":", "-", 2).split(" ")[0]
    else:
        photo_date = activity_date
    timestamp_foto = exif_dt or datetime.now().strftime("%Y:%m:%d %H:%M:%S")

    if lat is None or lon is None:
        status = "Lokasi Tidak Tersedia"
    elif photo_date != activity_date:
        status = "Perlu Verifikasi Admin"
    else:
        status = "Valid"

    processed = process_photo(data, pic_name, lat, lon, timestamp_foto)
    path = f"{APP_NAME}/collection/{user_id}/{uuid.uuid4()}.jpg"
    put_object(path, processed, "image/jpeg")
    return {
        "storage_path": path,
        "tanggal_foto": photo_date,
        "timestamp_foto": timestamp_foto,
        "latitude": lat,
        "longitude": lon,
        "exif_available": exif_available,
        "status_validasi": status,
    }
