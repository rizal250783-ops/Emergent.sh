# BSI ASSET DEAL — PRD

## Original Problem Statement
Enterprise mobile app for PT Bank Syariah Indonesia (RCG division) to manage, review, approve and publish a public catalog of auction assets. Built per the "MASTER PROMPT BSI ASSET DEAL v2.0" docx (23 sections). Tagline: "Connecting Buyers with BSI Assets".

## Architecture
- Frontend: Expo Router (React Native), @tanstack/react-query, Feather icons, theme from src/theme.ts (BSI teal #00A0A0 + gold #F0B43C).
- Backend: FastAPI (/api prefix), MongoDB (motor), JWT auth (bcrypt), uuid string ids, soft delete pattern.
- Storage: Emergent Managed Object Storage for asset photos.

## User Personas / Roles (Maker-Checker-Controller)
- Marketing Asset (Maker): inputs/edits assets, NO approval rights. Login via NIP.
- ACRM (Checker): reviews assets only for their own ACR. Login via NIP.
- Admin RCG (Controller): final approval + publish, user management, master data, audit. Login admin/admin2.

## Core Requirements (static)
- Strict 3-stage approval; MA never approves; ACRM scoped to their ACR; no Region entity.
- No "No. CIF" / "Nama Debitur" fields anywhere.
- Auto-generated unique nomor_asset: BLC-[YEAR]-[ACRIDENT]-[000001] via DB counter.
- KPKNL chosen from master dropdown only (71 seeded); jadwal lelang optional.
- Public catalog without login; WhatsApp deep link to PIC (normalized 62xxx).
- Versioning: updates to published assets re-enter ACRM->RCG before going public.
- Audit trail (append-only), approval logs, user mutation history, soft delete.
- Placeholder (NOPE / dummy) rows flagged PERLU_KONFIRMASI_DATA, not published publicly.

## Implemented (2026-06)
- JWT auth + RBAC per endpoint; change password; force-change flag.
- Seed: 45 ACR, 45 ACRM, 60 Marketing Asset, 71 KPKNL, category tree, 2 admin users, 6 demo published assets.
- Public catalog: search, category + provinsi filters (combinable, reset), infinite scroll, detail with gallery + WhatsApp.
- MA: dashboard, context auto-fill, 6-step Add Asset wizard (Info/Lokasi/Detail/Foto/Jadwal/Review), photo upload, my assets, submit/edit/update-after-publish.
- ACRM: dashboard, review queue, approve/return (mandatory note).
- RCG: national dashboard + per-ACR table, approval queue, publish/return, user management (edit/toggle/mutasi), category management, audit trail, mutation history.
- Notifications in-app per event matrix; toasts; confirm dialogs; loading/empty/error states.
- Concurrency: 409 on stale approval; optimistic status checks.
- Validated by testing agent: 37/37 backend tests + frontend smoke passed.

## Implemented (Iteration 2, 2026-06)
- Cascading location filter (Provinsi->Kab/Kota->Kecamatan->Kelurahan) in public catalog; options derived from published assets (GET /api/public/locations). Location pill to clear.
- Wilayah reference data proxy (emsifa, cached in Mongo `wilayah_cache`): /api/wilayah/*; Add Asset wizard Lokasi step uses searchable cascading Selects (LocationPicker).
- Asset map: Leaflet/OpenStreetMap (WebView native, iframe web) on public + internal detail with "Buka di Google Maps"; wizard has tap/drag map picker, lat/lng fields, GPS button (expo-location, permission flow + open settings).
- Share asset: native OS share sheet; web sheet with WhatsApp / copy link (expo-clipboard). Buttons on catalog cards, public detail, internal detail (published assets). Link = <backend>/asset/<id>.
- Private legal documents: asset_documents collection, stored under `<app>/private/` in Object Storage; upload/list/delete by MA, view by MA owner/ACRM same ACR/RCG via signed URL (10 min JWT) at /api/files/private/{doc}?token=. Public file route rejects /private/ paths. Wizard step "Dokumen" (7 steps now). Internal detail lists documents with lock badge.
- Demo assets: coordinates + 4-5 photos each (swipeable gallery).
- Validated by testing agent: 26/26 backend tests + frontend flows passed.

## Implemented (Iteration 3, 2026-06)
- SOLD: RCG marks PUBLISHED -> SOLD (/rcg/assets/{id}/sold, /unsold). Public: TERJUAL overlay/badge, pic_wa hidden, sold sorted last; MA+ACRM notified.
- Favorites: on-device (AsyncStorage) hearts on cards/detail, /favorites screen, batch endpoint /public/catalog/batch.
- Similar assets: /public/catalog/{id}/similar (location/category/price scoring); horizontal "Asset Serupa" on public detail.
- Excel report: Kelola -> Laporan tab -> /rcg/reports/assets/link (signed 10-min) -> .xlsx (Ringkasan per ACR, Detail Asset, Ringkasan Status). openpyxl added.
- Branding: official BSI logo image (assets/images/bsi-logo.png) in header & login; Lato font (assets/fonts, expo-font) applied globally via makeStyles weight mapping + font() helper.
- Home location bar Provinsi -> Kab/Kota -> Kecamatan (optional lower levels) + filter modal kept for kelurahan/category.
- Badge text "Sudah Ada Jadwal Lelang"; "Belum ada jadwal lelang" label. 25 demo assets across 18 provinces (2 SOLD, 9 without schedule), realistic photos.
- Validated by testing agent: 15/15 backend + all frontend flows.

## Implemented (Iteration 3b, 2026-06 — UX feedback)
- Live search (debounce 400ms) tanpa tombol cari; chip kategori wrap (semua terlihat); jarak header diperlonggar.
- Footer institusi di layar publik (beranda, favorit, detail): PT. Bank Syariah Indonesia, Tbk / RCG / 2026.
- Sisa teks Inggris di UI diterjemahkan (tagline, Published, Submit/Publish).
- Kartu grid berlebar tetap (kartu terakhir ganjil tidak melebar).

## Backlog / Remaining
- P2: Web desktop sidebar layout & responsive breakpoints polish.
- P2: Category edit rename UI.
- P2: Confirm/refresh placeholder (NOPE) data before go-live.
- P3: Split server.py into routers; align demo KPKNL with each asset's province.
