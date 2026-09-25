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

## Backlog / Remaining
- P1: Full cascading location filters (Provinsi->Kab->Kec->Kelurahan dependent dropdowns) using administrative-region reference data; currently provinsi + keyword.
- P1: Private legal document upload with signed-URL access (photos done).
- P2: Web desktop sidebar layout & responsive breakpoints polish.
- P2: SOLD status transition UI; category edit rename UI.
- P2: Confirm/refresh placeholder (NOPE) data before go-live.
