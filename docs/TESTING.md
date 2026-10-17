# Pengujian

## Menjalankan

```bash
npm test                              # semua test (vitest run)
npx vitest run tests/auth.test.ts     # satu file
npx vitest run -t "voting"            # berdasarkan nama
npx tsc --noEmit                      # pemeriksaan tipe
```

Persyaratan: `.env` berisi `DATABASE_URL` dan `PAYLOAD_SECRET`. **Test berjalan pada database sungguhan** (yang ada di `DATABASE_URL`), tetapi setiap test dibungkus transaksi yang di-rollback sehingga tidak ada data tersimpan. Untuk jaga-jaga, jangan arahkan ke database produksi.

## Cara kerja harness

| File | Peran |
| --- | --- |
| `vitest.config.ts` | Alias `@payload-config` dan `@`, `include: tests/**/*.test.ts`, timeout 120 detik, `fileParallelism: false` (satu database, satu file pada satu waktu) |
| `tests/setup.ts` | Memuat env, memock `getPayload` agar semua operasi (termasuk dari handler route) memakai transaksi test, dan memock `lib/websiteAuth` agar pemanggil ditentukan lewat header `x-test-user` |
| `tests/harness.ts` | `txState`, `withTx`, `guardTransaction`. Mengabaikan rollback yang dipicu Payload (`killTransaction`) supaya transaksi test tidak putus, dan membungkus tulis dengan SAVEPOINT agar error database (mis. pelanggaran unique) tidak membuat transaksi "aborted" |
| `tests/world.ts` | `begin`/`rollback`, `createWorld` (program, kelas, siswa, guru, kategori), `createPublishedWork`, `makeRequest`, `params`, `as` |

Catatan: karena transaksi dibagi, test baru sebaiknya memakai pembantu dari `world.ts` dan tidak membuat koneksi database terpisah.

## Cakupan (259 test, 10 file)

| File | Test | Yang diuji |
| --- | --- | --- |
| `auth.test.ts` | 24 | Register (NIS, email unik, kata sandi min. 8, cek origin, role selalu siswa), login (cookie httpOnly, email tidak peka huruf besar, pesan error seragam), aturan akun (siswa tidak bisa mengubah role/NIS/kelas/program, tidak bisa membaca akun lain), form "Profil saya" |
| `portfolio-form.test.ts` | 33 | Membuat/mengedit/menghapus karya, slug otomatis dan unik, kategori harus ID angka, draf vs diajukan, siswa tidak bisa menerbitkan/memverifikasi sendiri, visibilitas draf |
| `portfolio-review.test.ts` | 17 | `POST/GET /api/mentor/reviews`: setujui, minta revisi, cakupan kelas/program, draf tidak bisa ditinjau (409), antrean guru |
| `project-form.test.ts` | 29 | Form proyek: validasi, anggota (inisiator otomatis, tanpa duplikat), guru pembimbing (status awal `invited`, satu mentor utama), batasan hak, edit/hapus |
| `project-flow.test.ts` | 28 | `POST /api/community/projects/[id]/actions`: undangan mentor, pengajuan verifikasi, tinjauan dan persetujuan, hak mentor utama vs pendamping, validasi endpoint |
| `opportunities.test.ts` | 34 | Form peluang guru (draf, terbit, tutup), minat siswa (jendela pendaftaran, program sasaran, unik, batal), tindak lanjut guru (`/api/mentor/interests`) |
| `awards.test.ts` | 22 | Pengaturan award oleh admin, alur voting (satu suara per award, tidak boleh karya sendiri, ganti pilihan selama terbuka), hasil `GET /api/awards/[id]/results` |
| `social.test.ts` | 26 | Suka dan komentar karya (aturan akses, batas 2-1200 karakter, tidak bisa dipalsukan), stats dan daftar komentar |
| `public-routes.test.ts` | 33 | Feed beranda, pencarian, detail karya per tingkat akses, profil siswa/guru, leaderboard, notifikasi portal |
| `uploads.test.ts` | 13 | Konversi WebP, batas 2400px, teks alt otomatis, tipe berkas, crop dan titik fokus, hak akses |

## Belum ada test

Fitur berikut dibuat setelah rangkaian test di atas dan **belum punya test otomatis**:

- Chat: percakapan DM/grup/ruang, pesan, batas laju, blokir, laporan, hitungan belum dibaca
- Tracker proyek: izin `projectAccess`, CRUD tugas, log aktivitas, badge
- Suka dan komentar proyek (`/api/community/projects/[id]/like|comments|stats`), leaderboard proyek
- Presence dan `/api/portal/pulse`
- Profil: karya semat (maks 3, validasi hook), pengaturan tampilan
- Testimoni dan hero banner
- Login/register di sisi UI dan semua komponen React (tidak ada test komponen atau E2E)
- Optimasi query (`lib/dbCounts.ts`) hanya teruji tidak langsung lewat route publik

Prioritas penambahan: chat (akses dan blokir), tracker (izin), suka/komentar proyek.

## Menambah test

1. Buat `tests/<nama>.test.ts`. Pola yang dipakai file lain: `beforeAll(async () => { await begin(); w = await createWorld() })` dan `afterAll(rollback)` (lihat `tests/social.test.ts`).
2. Untuk endpoint, impor handler dan panggil dengan `makeRequest(path, { method, body, user })` dari `world.ts`; `user` meniru sesi login. Parameter rute dibuat dengan `params({ id: '1' })`. Opsi `origin: null` menguji penolakan origin.
3. Untuk collection, gunakan `payload.create/update/delete` dengan `user` dan `overrideAccess: false` agar aturan akses ikut diuji.
4. Kolom baru pada collection memerlukan migrasi; `push` dimatikan sehingga test gagal bila skema database belum dimigrasi.
