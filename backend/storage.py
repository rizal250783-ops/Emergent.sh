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


def _dms_to_deg(dms, ref):
    try:
        deg = dms[0][0] / dms[0][1] + dms[1][0] / dms[1][1] / 60 + dms[2][0] / dms[2][1] / 3600
        if ref in ["S", "W"]:
            deg = -deg
        return round(deg, 6)
    except Exception:
        try:
            deg = float(dms[0]) + float(dms[1]) / 60 + float(dms[2]) / 3600
            return round(-deg if ref in ["S", "W"] else deg, 6)
        except Exception:
            return None


def extract_exif(img: Image.Image):
    """Return (exif_datetime_str_or_None, latitude, longitude)."""
    lat = lon = None
    dt = None
    try:
        raw = img._getexif() or {}
    except Exception:
        raw = {}
    tags = {ExifTags.TAGS.get(k, k): v for k, v in raw.items()}
    dt_val = tags.get("DateTimeOriginal") or tags.get("DateTime")
    if dt_val:
        dt = str(dt_val)
    gps = tags.get("GPSInfo")
    if gps:
        g = {ExifTags.GPSTAGS.get(k, k): v for k, v in gps.items()}
        if "GPSLatitude" in g and "GPSLongitude" in g:
            lat = _dms_to_deg(g["GPSLatitude"], g.get("GPSLatitudeRef", "N"))
            lon = _dms_to_deg(g["GPSLongitude"], g.get("GPSLongitudeRef", "E"))
    return dt, lat, lon


def process_photo(data: bytes, pic_name: str, lat, lon, timestamp_str: str):
    """Add watermark, return (jpeg_bytes)."""
    img = Image.open(io.BytesIO(data)).convert("RGB")
    max_w = 1600
    if img.width > max_w:
        ratio = max_w / img.width
        img = img.resize((max_w, int(img.height * ratio)))
    draw = ImageDraw.Draw(img, "RGBA")
    lines = [
        "PT BPRS HAJI MISKIN",
        "Collection Activity",
        timestamp_str,
        f"PIC: {pic_name}",
        f"Lokasi: {lat}, {lon}" if lat is not None and lon is not None else "Lokasi: Tidak tersedia",
    ]
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except Exception:
        font = ImageFont.load_default()
    pad = 12
    line_h = 30
    box_h = line_h * len(lines) + pad
    draw.rectangle([(0, img.height - box_h), (img.width, img.height)], fill=(4, 78, 87, 190))
    y = img.height - box_h + pad // 2
    for ln in lines:
        draw.text((pad, y), ln, fill=(255, 255, 255, 255), font=font)
        y += line_h
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=82)
    return out.getvalue()


def upload_collection_photo(data: bytes, filename: str, user_id: str, pic_name: str,
                            activity_date: str):
    """Process one collection photo. Returns dict with storage_path + validation metadata."""
    try:
        src = Image.open(io.BytesIO(data))
        exif_dt, lat, lon = extract_exif(src)
    except Exception:
        exif_dt, lat, lon = None, None, None

    exif_available = exif_dt is not None
    if exif_dt:
        norm = exif_dt.replace(":", "-", 2)
        photo_date = norm.split(" ")[0]
        timestamp_foto = exif_dt
    else:
        photo_date = activity_date
        timestamp_foto = datetime.now().strftime("%Y:%m:%d %H:%M:%S")

    if lat is None or lon is None:
        status = "Lokasi Tidak Tersedia"
    elif exif_available and photo_date != activity_date:
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
