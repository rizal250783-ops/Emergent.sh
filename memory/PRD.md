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

## Backlog / Next
- P1: Per-jenis schema validation + preview/error-report for Data Import.
- P1: Collection photo HEIC auto-convert edge cases; multi-photo compression >3MB.
- P2: Restore Database flow; Import History detail view; role_history UI.
- P2: Notifications to Admin on incentive reject.
- Phase II (not built): AO Productivity Monitor, multi-cabang.
