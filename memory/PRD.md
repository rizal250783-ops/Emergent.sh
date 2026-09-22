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

## Iteration 6c (2026-09-21) — Kompresi adaptif watermark klien
- geotag.js: hasil canvas mulai JPEG q0.85; bila ukuran > 1MB, kualitas diturunkan bertahap (0.75→0.5)

## Iteration 6d (2026-09-21) — Indikator ukuran file + uji E2E portrait HP
- Preview foto kini menampilkan ukuran hasil kompresi (mis. "831 KB (terkompresi)", data-testid foto-size-{i}).
- Uji E2E Playwright meniru unggahan HP: JPEG noisy 2735 KB dengan EXIF orientation 6 → preview portrait
  1125x1500 (orientasi benar), terkompresi ke 831 KB, unggah sukses status "Valid" (4 kartu foto di modal).

## Iteration 6e (2026-09-21) — Tombol Hapus pada preview foto
- Setiap kartu preview (sebelum unggah) punya tombol X merah (data-testid foto-remove-{i}) untuk membuang
  foto salah pilih tanpa menutup modal; nonaktif saat uploading. Teruji E2E: 2 preview → hapus 1 → sisa 1,

## Iteration 6f (2026-09-21) — Lightbox preview watermark
- Klik gambar preview (foto-zoom-{i}, cursor-zoom-in) membuka lightbox fullscreen (foto-lightbox) agar AO bisa
  memastikan teks watermark terbaca sebelum unggah; tutup via tombol X (foto-lightbox-close) atau klik overlay.
- Teruji E2E: lightbox terbuka, gambar ter-render 693x924 (portrait), tertutup normal.

## Iteration 7 (2026-09-21) — Persiapan deploy
- Semua 19 user di-set ke password standar `BprsHM2026` dengan `requires_password_reset=false` (tanpa paksaan
  ganti password saat login; akan diganti saat publish).
- Database dikosongkan kecuali `users` (kredensial) & `settings` (session config): dibersihkan
  lending/funding/recovery_achievement_details, targets, incentive_settings, collection_activity(+photos),
  audit_logs — untuk percobaan input.
- `demo_seed.seed_demo()` DINONAKTIFKAN di server.py startup (import + call dihapus) agar DB tidak terisi ulang
  saat restart/deploy. Startup kini hanya seed_users + seed_settings (idempoten).
- .gitignore: tambah `memory/test_credentials.md`. Deployment readiness: cek kritis lolos (kompilasi, env,

## Iteration 7b (2026-09-21) — Validasi alur perhitungan di DB bersih (via Admin 002)
- Target 2026-09: 003 (pencairan 500jt, funding 250jt), 008 (funding 200jt), 013 (recovery 50jt).
- Input uji: pencairan 150jt+200jt (003), funding 250jt (008), recovery Kol3 25jt+25jt & Kol4 denda penuh 10jt (013).
- Hasil terverifikasi benar: Executive Pembiayaan 70% (350/500jt), Funding 55,56% (250/450jt), Recovery 100%;
  leaderboard ranking benar; insentif otomatis: Kol4 5% = Rp500rb pending, Kol3 1% baru terbit saat target
  recovery tercapai (1% x 50jt = Rp500rb) — gating sesuai desain; notifikasi "tercapai" ke AO 008 (125%) &
  013 (100%); Direktur (001) bulk approve → 2 insentif approved & tampil di /incentives/mine AO 013 +
  notifikasi persetujuan.

## Iteration 8 (2026-09-21) — Droplist Bulan & Tahun terpisah
- Pemilih periode di header dipecah: droplist Bulan (Januari–Desember, data-testid period-month-filter) +
  droplist Tahun (2026–2056, data-testid period-year-filter); state periode tetap "YYYY-MM" sehingga semua
  halaman tidak berubah. periodeOptions() tidak lagi dipakai Layout.

## Iteration 8b (2026-09-21) — Tombol prev/next bulan cepat
- Tombol ◀ (period-prev-btn) dan ▶ (period-next-btn) mengapit droplist Bulan/Tahun untuk pindah bulan tanpa
  membuka dropdown; wrap antar-tahun (Des→Jan); nonaktif di batas rentang (2026-01 & 2056-12).
- Teruji E2E: prev/next berantai benar, wrap 2026-12→2027-01 benar, tombol disabled tepat di kedua batas,

## Iteration 8c (2026-09-21) — Label periode lengkap di mobile
- Di layar <sm: dua droplist disembunyikan, diganti label teks periode lengkap (mis. "September 2026",
  data-testid period-label-mobile) di antara tombol ◀ ▶; layar >=sm tetap menampilkan kedua droplist.
- Teruji mobile 390px nyata (Playwright lokal, viewport 390 — screenshot_tool ternyata selalu render 1920):

## Iteration 8d (2026-09-21) — Bottom-sheet pemilih periode di mobile
- Label periode mobile kini tombol: ketuk membuka bottom-sheet "Pilih Periode" (droplist Bulan + Tahun
  2026-2056 + tombol Selesai; testid period-sheet/-month/-year/-close/-done) agar lompat jauh (mis. 2030)
  tanpa menekan panah berkali-kali. Hanya tampil di <sm.

## Iteration 9 (2026-09-21) — Target Recovery Kol.4+5 (digabung) untuk Collection & Remedial
- Backend: field `target_recovery_kol45` di targets; `sum_recovery_kol45` (kol 4&5, non-WO); KPI kedua
  "Recovery (Kol.4+5)" untuk C&R (build_kpis); riwayat C&R berisi target/realisasi/achievement/status kol45;
  COMPONENT_MAP entry baru sehingga leaderboard, compare, dan notifikasi milestone target otomatis mendukung;
  executive response punya `recovery_kol45`; whitelist komponen di views.py diperluas.
- Frontend: kolom input "Target Recovery (Kol.4+5)" di Target Management (khusus C&R); tab leaderboard ke-4;
  opsi komponen baru di Compare; kartu KPI ke-4 + bar ke-4 di Executive Dashboard; ikon KPI baru di Personal
  Dashboard; kolom Realisasi & Ach. Kol.4+5 kondisional di Riwayat. PDF/Excel rekap otomatis menyertakan KPI baru.
- Bug ditemukan & diperbaiki saat testing: query param komponen tidak di-encodeURIComponent (karakter '+' →

## Iteration 10 (2026-09-21) — Halaman login: Motto/Visi/Misi
- Tiga poin fitur di panel brand login dihapus, diganti: MOTTO "HIDUP BERKAH, TANPA RIBA DENGAN SYARIAH",
  VISI "Menjadikan BPRS Haji Miskin Sebagai Panutan Bank Pembiayaan Rakyat Syariah di Sumatera Barat",
  MISI "Meningkatkan Peran Serta Usaha Kecil dan Menengah Dalam Pembangunan Ekonomi Rakyat Indonesia di Masa

## Iteration 10b (2026-09-21) — Hapus kotak kredensial demo di login
- Kotak hijau "Demo: Direktur 001 · Admin 002 ... Password awal BprsHM2026" dihapus dari formulir login

## Iteration 10c (2026-09-21) — Login: hint lupa password + spasi footer
- Tambah teks kecil "Lupa password? Hubungi Admin" (login-forgot-hint) di bawah tombol Masuk.
- Footer © diberi mt-10 + pt-6 + garis pemisah tipis agar tidak berhimpitan dengan teks MISI.

## Iteration 10d (2026-09-21) — Footer branding di sidebar
- Footer kecil di bawah sidebar desktop & drawer mobile (data-testid sidebar-footer): motto "HIDUP BERKAH,
  TANPA RIBA DENGAN SYARIAH" (emas) + "© 2026 PT BPRS Haji Miskin".
- Sidebar desktop dibuat sticky (lg:sticky top-0 h-screen) sehingga menu, kartu user, tombol Keluar, dan footer
  selalu terlihat tanpa ikut scroll konten (sekaligus memperbaiki perilaku lama di mana blok bawah sidebar
  ikut terscroll keluar viewport pada halaman panjang).

## Iteration 11 (2026-09-21) — Pengosongan data untuk uji coba input (ke-2)
- Semua koleksi dikosongkan kecuali `users` (19 akun, password tetap standar BprsHM2026 tanpa forced change)
  & `settings`: targets, lending/funding/recovery_achievement_details, incentive_settings, notifications,
  target_notify_state, collection_activity(+photos), audit_logs (user_management_requests & role_history juga

## Iteration 12 (2026-09-21) — Target Management: input lebih kontras + format Rupiah
- Kolom input target kini bg-slate-100 + border-slate-300 + font mono tebal (putih saat fokus), menggantikan
  input putih di atas kartu putih yang samar.
- Di bawah setiap input tampil preview format Rupiah live ("= Rp 500.000.000", titik ribuan id-ID,

## Iteration 13 (2026-09-21) — Target Management ringkas + label Nama PIC
- Target Management dipadatkan: header kolom dipersingkat (Pembiayaan/Funding/Recovery Kol.3/Recovery
  Kol.4+5), input w-32 text-xs — tabel muat 962px sehingga tombol Simpan terlihat tanpa scroll horizontal
  di laptop 1366px (teruji: noHScroll=true, tombol di viewport).

## Iteration 14 (2026-09-21) — Target Management: mode kartu mobile
- Layar <lg: tabel diganti kartu per-AO (nama/kode/jabatan + input full-width berlabel + tombol Simpan per
  kartu, testid target-card-{kode}, input -m suffix). Layar >=lg tetap tabel ringkas.
- Teruji Playwright 390px & 1366px: kartu/tabel saling eksklusif, format Rupiah live, simpan dari mobile OK,

## Iteration 15 (2026-09-21) — Input Pencapaian: mode kartu mobile
- Ketiga tab (Pembiayaan/Funding/Recovery): tabel hanya tampil di >=lg; di layar kecil diganti kartu per
  transaksi (TxCards) berisi info kunci + tombol hapus (-m suffix testid). Form modal sudah bertumpuk 1 kolom
  di mobile (grid sm:grid-cols-2).
- Teruji Playwright 390px: siklus tambah→kartu muncul→hapus sukses di ketiga tab, tanpa overflow; data uji
  (UJI-MOBILE-*) terhapus bersih, DB kembali ke kondisi uji coba user (0 transaksi baru tersisa).
  tanpa overflow layout. Dokumen target uji (013, 75jt) dihapus kembali setelah tes.
- Input Pencapaian > tab Recovery > Tambah Transaksi: label "PIC Pemilik" diganti "Nama PIC"
  (data-testid recovery-pic tidak berubah). Teruji Playwright.
  testid target-{key}-fmt-{kode}) saat mengetik maupun setelah simpan.
- Teruji Playwright: preview format benar, kontras unfocused bg slate-100, nilai tersimpan tetap terformat.
  Target uji (003, 500jt) dihapus lagi — DB kembali kosong untuk uji coba user.
  ikut kosong). Data uji iterasi 7/9 ikut terhapus.
- Smoke test pasca-kosong: semua endpoint utama 200, dashboard menampilkan Rp 0/N-A, halaman Targets/
  Leaderboard/Collection/Incentives render tanpa JS error.
- Teruji Playwright desktop 1920 (tanpa & dengan scroll) + drawer mobile 390.
  Terverifikasi via screenshot (jarak MISI→footer 252px di desktop).
  demi keamanan. Terverifikasi via screenshot.
  Depan" (ikon Sparkles/Eye/Flag, label emas; testid login-mvm-motto/-visi/-misi). Terverifikasi via screenshot.
  spasi → HTTP 400) di Leaderboard.js & Compare.js — diperbaiki, direview, dan dipertahankan.
- Tested: backend 6/6 pytest (test_iter7_kol45.py), frontend 5/5 E2E (iteration_7.json).
- Teruji Playwright viewport 390: sheet terbuka, lompat ke Maret 2030 berhasil, label ter-update, sheet
  tertutup, tanpa overflow.
  label tampil, droplist tersembunyi, tombol next mengubah label, tanpa overflow horizontal. Desktop tetap
  menampilkan droplist & menyembunyikan label.
  mobile 390px tanpa overflow.
- Teruji E2E: 12 bulan & 31 tahun (2026..2056) sesuai, ganti ke Januari 2056 tanpa crash, mobile 390px tanpa
  horizontal overflow.
- Data uji berlabel "Uji" (kontrak PBY-UJI-*, RCV-UJI-*) masih ada di DB periode 2026-09; dapat dihapus via UI
  Admin atau minta wipe ulang sebelum percobaan input sendiri.
  CORS, port, supervisor, auth redirect). Restore endpoint delete_many & saran optimasi query bersifat
  non-blocking (fitur admin disengaja / skala kecil).
  label tombol "Unggah 1" ikut menyesuaikan.
- Akun dikembalikan ke kondisi pristine (BprsHM2026 + requires_password_reset) setelah pengujian.
  hingga <= 1MB — upload foto di jaringan lapangan lambat lebih cepat. Frontend compiled successfully.
  frontend compiled successfully.
  (iteration_6.json). piexif ditambahkan ke requirements.txt.

## Backlog / Next
- P1: Per-jenis schema validation + preview/error-report for Data Import.
- P1: Collection photo HEIC auto-convert edge cases; multi-photo compression >3MB.
- P2: Restore Database flow; Import History detail view; role_history UI.
- P2: Notifications to Admin on incentive reject.
- Phase II (not built): AO Productivity Monitor, multi-cabang.
