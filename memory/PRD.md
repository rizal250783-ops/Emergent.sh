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

## Backlog / Next
- P1: Per-jenis schema validation + preview/error-report for Data Import.
- P1: Collection photo HEIC auto-convert edge cases; multi-photo compression >3MB.
- P2: Restore Database flow; Import History detail view; role_history UI.
- P2: Notifications to Admin on incentive reject.
- Phase II (not built): AO Productivity Monitor, multi-cabang.
