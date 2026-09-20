# AO-360 — Test Credentials

**Login uses `Kode Marketing` (NOT email) + Password.**
Endpoint: `POST /api/auth/login` body `{ "kode_marketing": "...", "password": "..." }`

## Default password (all 18/19 fixed accounts)
`BprsHM2026`

> IMPORTANT: Every fixed account has `requires_password_reset = true`. On first login the app
> redirects to `/change-password`. To continue, call `POST /api/auth/change-password`
> `{ "old_password": "BprsHM2026", "new_password": "<NewPass8+letters+digits>" }` (min 8 chars,
> must contain letters AND numbers). After that, login with the new password.
> If a test run already changed a password, run the reset snippet at the bottom to restore all
> accounts to `BprsHM2026` + force-reset state.

## Key accounts by role
| Kode | Nama | Jabatan | Password |
|------|------|---------|----------|
| 001 | HENDRI KAMAL | Direktur | BprsHM2026 |
| 002 | RINTO | Admin | BprsHM2026 |
| 003 | RIDWAN | AO Pembiayaan | BprsHM2026 |
| 008 | DEFI ROSI | AO Funding | BprsHM2026 |
| 013 | DEFI ROSI | Collection & Remedial | BprsHM2026 |
| 086 | TAUFIK CHANI | Collection & Remedial | BprsHM2026 |

All other AO Pembiayaan: 042, 050, 059, 072, 074, 077, 083, 085
Other AO Funding: 020, 028, 049, 056, 078

## Auth endpoints
- POST /api/auth/login
- GET  /api/auth/me
- POST /api/auth/change-password
- POST /api/auth/logout
- PUT  /api/auth/session-config (Admin)

## Reset all accounts to pristine state (run from /app/backend)
```
/root/.venv/bin/python -c "
import asyncio
from dotenv import load_dotenv; load_dotenv()
from database import db
from security import hash_password
async def main():
    h = hash_password('BprsHM2026')
    await db.users.update_many({}, {'\$set': {'password_hash': h, 'requires_password_reset': True, 'failed_login_attempts':0, 'locked_until': None}})
asyncio.run(main())"
```
