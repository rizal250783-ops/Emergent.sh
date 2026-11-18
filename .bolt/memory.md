# Project memory

## Product intent & audience

- Aplikasi Lelang BSI — platform lelang aset (BSI auction application)
- Diimpor dari GitHub `rizal250783-ops/Emergent.sh`, branch `conflict_Aplikasi-Lelang-BSI`

## Brand personality & voice

- Belum cukup konteks untuk disimpulkan

## Visual design & UX direction

- Frontend: Expo / React Native dengan TypeScript
- 2 error type-check pre-existing di `toast.tsx` dan `theme.ts` (tidak menghalangi runtime)

## Decisions, constraints & rationale

- **Frontend**: dikelola dengan **yarn** (bukan npm, meski ada npm lockfile di root); `yarn.lock` dihasilkan setelah instalasi
- **Backend**: **FastAPI** (Python), berjalan di port **8001**
- **Database**: **MongoDB 8.0** — repositori resmi MongoDB ditambahkan manual karena tidak ada di repositori bawaan
- **Paket dihapus**: `emergentintegrations` dihapus dari `requirements.txt` backend — tidak tersedia di registry dan tidak pernah dipakai di kode
- **Virtualenv**: `python3-venv` tidak tersedia; solusi = `virtualenv` dari pip user + `get-pip` (tanpa `ensurepip`)
- **Tes backend**: 172 tes; membaca env dari path legacy `/app/frontend/.env` → symlink dibuat agar tes menemukan file env
- **Seed data**: 45 aset lelang terisi otomatis saat startup
- **Guard scripts**: izin eksekusi skrip guard instalasi frontend diperbaiki
- **`.env`** dibuat untuk backend & frontend (URL MongoDB lokal, URL backend lokal)
- **Arsitektur**: MongoDB + FastAPI sendiri (pola Emergent), **bukan Supabase** — dipertahankan sesuai desain asli

## Open questions & assumptions

- 2 error type-check di `toast.tsx` & `theme.ts` belum diperbaiki — menunggu konfirmasi user
- Key/value spesifik `.env` tidak didokumentasikan di sini; lihat file aktual jika perlu
- Struktur akun uji / kredensial login belum didokumentasikan