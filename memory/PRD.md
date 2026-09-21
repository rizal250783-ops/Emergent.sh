# PRD — AO-360 (AO Achievement Dashboard)
**Client:** PT BPRS Haji Miskin · **Direktur:** Hendri Kamal · **Phase:** I (Simplified)

## Problem Statement
Web app to monitor achievement of Account Officers (Pembiayaan, Funding) and Collection & Remedial.
Admin inputs per-nasabah transactions; system auto-computes achievement, ranking, monthly history, and
incentives (with Direktur approval). Green-dominant professional banking UI, logo included, mobile-friendly.

## Architecture
- **Backend:** FastAPI + MongoDB (motor). Bearer-token JWT auth (kode_marketing + password). Modular routers
  (auth, admin, incentive, collection, views, data_mgmt). Calculation engine in calc.py. Object storage
  (Emergent) for collection photos + Pillow watermark/EXIF.
- **Frontend:** React 18 (CRA) + Tailwind + Recharts + lucide-react + sonner. Role-based routing & sidebar.
- **Env:** MONGO_URL/DB_NAME, JWT_SECRET, DEFAULT_USER_PASSWORD, EMERGENT_LLM_KEY (storage), REACT_APP_BACKEND_URL.

## Roles
Direktur (read-only + approver), Admin (input/target/incentive/user/data), AO Pembiayaan (2 targets),
AO Funding (1 target), Collection & Remedial (recovery Kol.3 target).

## Implemented (2026-06-20)
- Login by Kode Marketing + password; 5x-fail 15-min lockout; force password change on first login; Admin reset.
- 18/19 fixed users seeded (default password BprsHM2026). Demo data for 2026-01..2026-06.
- Admin input pencapaian: lending, funding, recovery (Kol.3/4/5 + denda + Write Off) per nasabah.
- Target management (per AO per periode). Achievement auto = SUM/target*100 with zero-divisor rules.
- Incentives: category B auto (Kol3 1%, Kol4 5%/2.5%, Kol5 10%/5%, WO 15%); category A (target %of realisasi/manual).
  ALL incentives require Direktur approval before showing in AO Insentif tab.
- Approval Center (Direktur): Approval Insentif (single/bulk) + Approval User Management (add/deactivate/delete).
- Collection Activity: admin-assigned & self-input; photo upload with watermark + EXIF/GPS validation fallback.
- Executive dashboard, personal dashboards, leaderboard (Pembiayaan/Funding/Recovery), riwayat bulanan (charts),
  audit log, data management (export XLSX, backup JSON, import JSON).
- Period picker defaults to latest month with data. Photo access scoped to owner/Admin/Direktur.

## Testing
- Backend 26/26 pytest passing. Frontend Playwright flows 100% passing (iteration_1.json).

## Iteration 2 (2026-06-20) — 4 features added
- **Import Wizard:** /data/import-preview + /data/import-commit. Accepts .xlsx/.csv/.json; per-row schema
  validation with clear error messages; preview modal shows valid/error badges + counts; only valid rows commit.
  Commit re-validates server-side (ignores client-sent resolved ids).
- **Notifikasi Insentif:** notifications collection + bell in topbar (unread badge, mark-read). Rejecting an
  incentive (Direktur) auto-creates an Admin notification with AO/period/amount + reason.
- **Restore Database:** /data/restore uploads a backup JSON, auto-snapshots current DB to object storage first,
  then replaces collections; user passwords preserved (match by _id then kode_marketing).
- **Ekspor PDF Rekap:** /reports/ao-pdf/{ao_id} (reportlab) — branded per-AO PDF with KPI + monthly history.
  Buttons on Personal Dashboard and Riwayat (managers pick any AO; AO gets own).
- Tested: backend 8/8 new + regression, frontend 5/5 features (iteration_2.json).

## Iteration 3 (2026-06-20) — 4 features added
- **Notifikasi Multi-Peran:** incentive approve/reject also notifies the affected AO (recipient_kode); Admin still
  notified on reject. Notifications keyed by recipient_role and/or recipient_kode; bell shows for all roles.
  Approve/reject now skips already-decided incentives to avoid duplicate notifications.
- **Riwayat Import:** Data Management shows an import-history table (waktu/oleh/jenis/jumlah baris) from audit logs.
- **Grafik PDF:** ao-pdf now embeds reportlab charts (achievement line + realisasi bar) above the history table.
- **Perbandingan Antar-AO:** new /compare page (Direktur & Admin) — pick 2-3 AOs, side-by-side KPI cards +
  combined achievement trend line chart. Backend /compare de-duplicates ids, caps at 3. Chart Y-axis clamped to 300%.
- Tested: backend 11/11 new (44/45 combined; 1 pre-existing dup-user legacy test), frontend 4/4 (iteration_3.json).

## Iteration 4 (2026-06-20) — 4 features added
- **Export PDF Tim:** /reports/team-pdf — bank-wide summary + full rankings (Pembiayaan/Funding/Recovery) in one
  management PDF; button on Executive Dashboard (Direktur & Admin). Periode format validated.
- **Notifikasi Target:** calc.check_target_notifications notifies the AO when a component crosses 90% (mendekati)
  or 100% (tercapai); dedup via target_notify_state per (ao_id, periode, komponen). Triggered on transaction
  create, target edit, and import commit. Message clamps display when achievement > 200%.
- **Filter Perbandingan:** /compare accepts optional komponen (Pembiayaan/Funding/Recovery); Compare page has a
  component selector — shows a single-component KPI + component trend per AO.
- **Ekspor Excel Rekap AO:** /reports/ao-excel/{ao_id} — 2-sheet xlsx (Ringkasan + Riwayat); Excel buttons next to
  PDF on Personal Dashboard and Riwayat.
- Tested: backend 17/17 new, frontend 4/4 (iteration_4.json).

## Iteration 5 (2026-09-21) — Bug fix: Collection GPS → Google Maps
- Root cause: fragile EXIF DMS parsing (mixed IFDRational vs (num,den) tuples) producing None/wrong coords,
  non-canonical maps URL (maps.google.com/?q=), and only a tiny text link clickable.
- Fix: extract_exif now uses img.getexif().get_ifd(0x8825) (GPS sub-IFD) + reads DateTimeOriginal from Exif
  sub-IFD (0x8769); _dms_to_deg robustly coerces IFDRational/(num,den)/floats with 0-60 sanity guards.
- Frontend: canonical URL https://www.google.com/maps/search/?api=1&query={lat},{lon}; whole photo card is
  clickable (photo-map-{i}) with hover 'Buka di Google Maps' overlay; text link shows coordinates.
- Non-image upload now returns clean 400 instead of 500.
- Verified by testing agent: 7/7 backend + Playwright popup navigates to the canonical Maps URL (iteration_5.json).

## Setup Verification (2026-09-21)
- Repo re-confirmed: /app already synced with origin (rizal250783-ops/Emergent.sh), branch
  AO-360_BPRS_Haji_Miskin @ a9d2bec (remote branch `conflict_AO-360_BPRS_Haji_Miskin` does not exist;
  content lives on AO-360_BPRS_Haji_Miskin).
- Deps: frontend `yarn install` up-to-date; backend all app imports OK (requirements.txt has a known
  pip resolver conflict on litellm hash-fragment vs emergentintegrations — env already has both, app
  does not import them, no action needed).
- Verified: GET /api -> 200 {"app":"AO-360","status":"ok"}; login 001/BprsHM2026 returns JWT + user;
  frontend login page renders (desktop + mobile).

## Iteration 6 (2026-09-21) — Collection Activity: GPS geotagging + canvas watermark (koreksi form kunjungan)
- Spec user (referensi PHP+SQLite) diadaptasi ke stack React/FastAPI: form_collection→Collection.js PhotoModal,
  script/app.js→src/lib/geotag.js, collection.php (watermarkGd/prosesFoto/validasi)→routers/collection.py + storage.py.
- GPS: tombol "Ambil Lokasi Saya" (getCurrentPosition highAccuracy/12s/15s), 6 desimal; status default/sukses
  (hijau)/gagal (merah) sesuai teks spec; lokasi WAJIB bila ada foto — diblokir di klien (toast) DAN 400 di server.
- Foto: input image/* TANPA capture (kamera/galeri); watermark canvas: strip gradient emerald + garis emas, 3 baris
  (PT BPRS HAJI MISKIN — COLLECTION ACTIVITY / Tanggal dd Bulan yyyy · Jam HH:MM WIB · PIC / Lokasi), maks sisi
  1500px, JPEG q0.85; dikirim base64 (foto_b64) ke POST /collection/{aid}/photos-b64; server simpan ke object
  storage (hanya path di DB). Fallback file mentah: endpoint multipart lama tetap jalan, watermark digambar ulang
  via Pillow dengan gaya baru (max side 1500, q85).
- Cek tanggal: file.lastModified → tanggal_foto; beda hari → peringatan kuning di preview, submit tetap boleh,
  status_validasi "Perlu Verifikasi Admin". Preview hasil watermark + guard submit bila base64 belum siap.
- Riwayat: tombol "Lokasi" (toggle koordinat) & "Buka Google Maps" → https://maps.google.com/?q=<lat>,<lng>
  (URL pendek sesuai spec baru, menggantikan URL kanonik iter-5).
- Tested: backend 7/7 pytest (regresi multipart), 4/4 skenario curl photos-b64; frontend 5/5 Playwright

## Iteration 6b (2026-09-21) — Koreksi orientasi EXIF pada watermark
- Klien: geotag.js memuat foto via createImageBitmap({imageOrientation:'from-image'}) dengan fallback elemen
  <img>, sehingga foto portrait HP tidak lagi miring di preview/hasil watermark.
- Server: storage.process_photo memakai ImageOps.exif_transpose sebelum resize/watermark.
- Verified: JPEG landscape dgn EXIF orientation 6 → output portrait 600x800; tanpa EXIF tetap 800x600;
  frontend compiled successfully.
  (iteration_6.json). piexif ditambahkan ke requirements.txt.

## Backlog / Next
- P1: Per-jenis schema validation + preview/error-report for Data Import.
- P1: Collection photo HEIC auto-convert edge cases; multi-photo compression >3MB.
- P2: Restore Database flow; Import History detail view; role_history UI.
- P2: Notifications to Admin on incentive reject.
- Phase II (not built): AO Productivity Monitor, multi-cabang.
