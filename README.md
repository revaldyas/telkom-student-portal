# Telkom Student Creation

Portal publik untuk karya siswa SMK Telkom. Siswa dapat mengelola portofolio dan profil, sementara pengunjung dapat menjelajahi karya, memberi suka dan komentar, mengikuti penghargaan, serta melihat papan peringkat.

## Fitur

- Beranda dengan karya terbaru, nominasi, penghargaan aktif, dan leaderboard.
- Halaman katalog dan detail portofolio, kategori, serta profil publik siswa.
- Registrasi dan login akun website dengan role Siswa atau Guru. Registrasi siswa memerlukan NIS yang sudah terdaftar di Data Siswa.
- Dashboard siswa untuk mengelola karya sendiri.
- Portal Guru dan siswa dengan navigasi serta halaman kerja terpisah dari halaman publik.
- Suka, komentar, voting penghargaan, badge, dan riwayat achievement.
- Profil kompetensi siswa dengan minat, keterampilan, pengalaman proyek, program keahlian, dan pencapaian.
- Galeri karya dengan sampul gambar, video atau PDF pendukung, tautan, dan status verifikasi Guru.
- Ruang Guru untuk meninjau karya, memberi umpan balik, meminta revisi, menerbitkan karya, dan mengelola peluang.
- Proyek kolaborasi dengan beberapa Guru pembimbing, undangan Guru, satu mentor utama, dan riwayat tinjauan.
- Notifikasi portal untuk tindak lanjut karya, proyek, aktivitas komunitas, penghargaan, peluang, dan minat siswa.
- Ringkasan dampak sekolah di dashboard Guru: partisipasi, kategori proyek, status verifikasi, publikasi, dan peluang.
- Kanal peluang untuk kompetisi, pameran, tantangan proyek, mentoring, dan kolaborasi industri.
- Pencarian global untuk konten publik.
- Panel admin Payload CMS untuk mengelola data sekolah, karya, pengguna, penghargaan, dan media.
- Upload gambar yang dikompresi ke WebP sebelum disimpan.

## Teknologi

- Next.js 16 App Router dan React 19
- Payload CMS 3.90
- PostgreSQL di Supabase, melalui adapter Payload berbasis Drizzle dan `node-postgres`
- Vercel Blob untuk file upload di deployment Vercel
- TypeScript dan Sharp untuk pemrosesan gambar

## Menjalankan secara lokal

Persyaratan: Node.js 20.9 atau lebih baru dan akses ke database PostgreSQL.

1. Pasang dependensi:

   ```bash
   npm ci
   ```

2. Salin `.env.example` menjadi `.env.local`, lalu isi variabel yang dibutuhkan.

3. Jalankan server pengembangan:

   ```bash
   npm run dev
   ```

4. Buka `http://localhost:3000`. Panel CMS tersedia di `/admin`.

### Environment variables

| Variabel | Kegunaan |
| --- | --- |
| `DATABASE_URL` | URL koneksi PostgreSQL. Untuk lokal, gunakan Supabase Session Pooler port `5432`; untuk serverless Vercel, gunakan Shared Transaction Pooler port `6543`. Encode karakter khusus pada password sebagai percent-encoding. |
| `DATABASE_POOL_MAX` | Batas koneksi `node-postgres` per fungsi. Default aplikasi `5`; deployment Vercel saat ini juga memakai `5`. |
| `PAYLOAD_SECRET` | Secret acak panjang untuk token dan fungsi keamanan Payload. |
| `NEXT_PUBLIC_SERVER_URL` | URL dasar aplikasi, misalnya `http://localhost:3000` saat lokal. |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob untuk penyimpanan upload persisten. Diperlukan pada Vercel dan tersedia setelah Blob Store dihubungkan. |
| `CMS_ADMIN_EMAIL` | Email untuk membuat akun admin CMS melalui seed. |
| `CMS_ADMIN_PASSWORD` | Password admin CMS melalui seed; script mensyaratkan minimal 12 karakter. |
| `CMS_ADMIN_NAME` | Nama tampilan admin CMS; opsional. |

Jangan commit `.env`, `.env.local`, atau nilai secret lainnya. `.env.example` berisi template tanpa kredensial.

## Akun dan sesi

Autentikasi website dan CMS dipisahkan:

- Pengguna website tersimpan di collection `users` dan masuk melalui `/login`. Cookie sesi website bernama `karyakita-session`.
- Admin CMS tersimpan terpisah di collection `admins` dan masuk melalui `/admin/login` menggunakan autentikasi Payload.
- Siswa dan Guru tidak menggunakan akun website untuk masuk ke CMS.
- Untuk akun siswa, NIS harus cocok dengan NIS pada collection `students`.

Buat admin CMS pertama melalui environment variables di atas, lalu jalankan `npm run seed:cms-admin`. Seed ini tidak mengganti password jika akun dengan email tersebut sudah ada. Jangan menaruh password admin di source code atau Git.

## Portal siswa dan Guru

Portal akun website memakai layout terpisah dari halaman publik. Siswa mengakses `/portal/siswa`, sedangkan Guru mengakses `/portal/guru`. Sidebar menyediakan tautan ke dashboard, karya atau verifikasi, proyek, peluang, dan profil publik sesuai jenis akun.

Ikon lonceng pada header membuka notifikasi yang dapat diklik untuk menuju pekerjaan terkait. Badge menghitung notifikasi yang belum dibaca; status baca disimpan di `localStorage` browser per akun. Daftar dibuat dari status data saat ini, jadi tidak memerlukan collection notifikasi tersendiri. Daftar dimuat ulang saat portal dibuka, berpindah halaman, atau menu notifikasi dibuka.

Jenis notifikasi siswa:

- Karya yang diminta revisi, menuju halaman detail karya.
- Respons Guru atas undangan membimbing proyek, menuju halaman proyek.
- Komentar dan suka baru pada karya siswa, menuju halaman karya terkait.
- Penghargaan atau achievement baru, menuju profil publik siswa.
- Tenggat peluang atau voting penghargaan yang tinggal tujuh hari atau kurang, menuju halaman peluang atau penghargaan.

Jenis notifikasi Guru:

- Karya baru yang menunggu verifikasi dalam cakupan kelas atau program keahlian Guru, menuju detail karya.
- Undangan pembimbingan dan proyek yang sudah diajukan untuk ditinjau, menuju detail proyek.
- Minat siswa pada peluang dalam cakupan bimbingan Guru, menuju halaman pengelolaan peluang.

## Proyek kolaborasi

Collection `projects` menyimpan proyek bersama siswa, termasuk anggota dan kontribusinya, detail, media, perangkat dan teknologi, status publikasi, serta verifikasi. Pengelola proyek dapat mengundang beberapa Guru berdasarkan keahlian dan minat yang tercantum pada profil Guru. Satu undangan ditetapkan sebagai mentor utama, sedangkan undangan lain dapat menjadi mentor pendamping.

Guru menerima atau menolak undangan dari halaman detail proyek. Proyek hanya dapat diajukan untuk tinjauan setelah mentor utama menerima undangan. Mentor pendamping dapat memberi masukan; hanya mentor utama yang dapat meminta revisi atau menyetujui dan menerbitkan proyek. Respons undangan, komentar tinjauan, keputusan, dan tanggalnya tercatat pada riwayat proyek. Proyek draf hanya dapat dilihat pengelola dan Guru yang diundang.

## Model data Payload

| Collection | Isi dan relasi utama |
| --- | --- |
| `admins` | Akun khusus untuk panel CMS Payload. |
| `users` | Akun website Siswa/Guru, profil kompetensi, NIS, kelas, program keahlian, dan foto profil. |
| `students` | Daftar siswa sekolah dan NIS resmi; terpisah dari akun login. Terhubung ke `classes`. |
| `programs` | Program keahlian. |
| `classes` | Kelas yang terhubung ke satu program keahlian. Tidak memiliki field tahun ajaran. |
| `portfolios` | Karya siswa; terhubung ke pengguna siswa, kategori, sampul, dan berkas bukti. Slug dibuat dari judul dan harus unik; karya dapat diverifikasi Guru sebelum diterbitkan. |
| `portfolio-reviews` | Keputusan verifikasi atau revisi dan umpan balik Guru pada karya. |
| `projects` | Proyek kolaborasi siswa, anggota dan kontribusi, undangan mentor, status verifikasi/publikasi, dan riwayat tinjauan. |
| `opportunities` | Kompetisi, pameran, tantangan proyek, mentoring, dan kolaborasi yang dikelola Guru atau admin. |
| `opportunity-interests` | Minat siswa pada peluang yang sedang dibuka. |
| `portfolio-categories` | Kategori karya yang dapat dikelola admin. |
| `uploads` | Metadata dan file gambar yang digunakan profil maupun karya. |
| `portfolio-likes` | Relasi siswa dan karya yang disukai. Satu siswa hanya dapat menyukai karya yang sama sekali. |
| `portfolio-comments` | Komentar siswa pada karya. |
| `awards` | Penghargaan, periode voting, status, dan nominasi portofolio. |
| `award-votes` | Suara untuk penghargaan, terhubung ke award, karya, dan pemilih. Kunci unik membatasi satu suara per siswa untuk setiap award. |
| `student-records` | Riwayat achievement dan penghargaan siswa untuk timeline profil. |

Mayoritas collection sekolah dan konten dapat dikelola admin CMS. Suara voting tidak dapat dihapus melalui CMS; likes dan komentar tidak dapat diedit. Aturan akses lengkap berada di masing-masing file `collections/`.

## Struktur kode

```text
app/
  (site)/                 Halaman publik, profil, dashboard, login, dan registrasi
  (payload)/admin/        UI admin Payload
  (payload)/api/          REST Payload dan API website
collections/              Definisi collection, field, hook, dan access control
components/                Komponen UI, navigasi, pencarian, skeleton, dan admin nav
lib/                       Helper sesi, akses, format, dan fetch
migrations/                Migrasi database Payload
public/demo-avatars/       Sumber avatar contoh
public/demo-covers/        Sumber cover untuk seed portofolio
public/media/              Aset media demo lokal
scripts/                   Script seed data demo dan admin CMS
```

### API website

- `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`
- `POST /api/register`
- `GET /api/community/feed`
- `GET /api/community/leaderboard`
- `GET /api/community/search`
- `GET /api/community/students/:id`
- `GET /api/portal/notifications` (khusus sesi website siswa/Guru; notifikasi dibuat dari aktivitas dan status terbaru)
- `POST /api/community/projects/:id/actions` (respons undangan Guru, pengajuan tinjauan, dan masukan/keputusan mentor)
- `GET /api/mentor/reviews`, `POST /api/mentor/reviews` (khusus Guru; cakupan dibatasi ke kelas/program yang ditugaskan)
- `GET /api/community/portfolios/slug/:slug`
- `GET` dan `POST /api/community/portfolios/:id/comments`
- `GET` dan `POST /api/community/portfolios/:id/stats` untuk statistik dan interaksi suka
- `GET /api/awards/:id/results`
- Endpoint REST Payload tersedia di `/api/:collection` melalui route catch-all.

## Data contoh

> Jalankan seed hanya pada database development/demo. Script mengubah database dan beberapa di antaranya membuat atau memperbarui record contoh.

Jalankan dalam urutan berikut:

```bash
npm run seed:school
npm run seed:students
npm run seed:categories
npm run seed:portfolios
npm run seed:avatars
npm run seed:bios
npm run seed:community
npm run seed:awards
```

`seed:portfolios` membuat akun siswa demo dari 25 data siswa dan menghasilkan contoh karya untuk kategori yang tersedia. `seed:community` memerlukan akun demo serta portofolio terbit. `seed:awards` membuat atau memperbarui dua award demo yang sedang dibuka. Buat admin CMS secara terpisah dengan `npm run seed:cms-admin`.

## Database dan migrasi

Payload mengelola schema PostgreSQL melalui adapter Drizzle. Deployment Vercel menggunakan Shared Transaction Pooler Supabase karena fungsi serverless membuka koneksi singkat dan deployment Vercel memerlukan jalur IPv4. Direct connection Supabase pada konfigurasi standar dapat hanya menyediakan IPv6. Session Pooler lebih cocok untuk server lokal yang berjalan lama.

Schema push otomatis Payload dinonaktifkan agar schema lokal tanpa plugin Vercel Blob tidak menghapus kolom internal Blob pada database bersama. Setiap perubahan collection perlu disertai migrasi dan dicatat di `migrations/index.ts`. Schema Proyek, penyesuaian nama kolom anggota proyek, undangan mentor, status pengajuan tinjauan, dan riwayat tinjauan dicatat pada migrasi `20261011_150000_projects`, `20261011_160000_fix_project_members_columns`, dan `20261011_170000_project_mentors_and_reviews`.

Jalankan perintah CLI Payload melalui script npm:

```bash
npm run payload -- generate:types
npm run payload -- generate:importmap
npm run payload -- migrate:status
npm run payload -- migrate
```

Periksa isi migrasi sebelum menerapkannya pada database bersama/produksi. Migrasi yang ada mencakup kolom `_objectkey` pada `uploads` dan schema untuk modul kompetensi, verifikasi karya, dan peluang; migrasi ini bukan baseline schema lengkap untuk database kosong. Database baru memerlukan proses inisialisasi schema awal yang terencana sebelum migrasi tambahan diterapkan.

Saat mengubah collection atau field, perbarui konfigurasi di `collections/` dan daftarkan collection baru di `payload.config.ts`. Setelah itu, regenerasi tipe dan import map Payload, tinjau perubahan schema, lalu buat dan periksa migrasi sebelum menerapkannya.

## Deployment Vercel

Project menggunakan region fungsi `hnd1` melalui `vercel.json`. Environment produksi perlu memuat `DATABASE_URL`, `DATABASE_POOL_MAX`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL`, dan `BLOB_READ_WRITE_TOKEN`. Jangan memasukkan nilainya ke dokumentasi atau Git.

Langkah deployment:

1. Hubungkan repository ke project Vercel.
2. Atur environment variables produksi menggunakan dashboard atau CLI Vercel.
3. Hubungkan Vercel Blob Store agar `BLOB_READ_WRITE_TOKEN` tersedia.
4. Pastikan URL database memakai Transaction Pooler Supabase port `6543` dan region database sesuai konfigurasi.
5. Deploy melalui Git push atau `vercel --prod`.
6. Verifikasi homepage, `/admin/login`, feed, leaderboard, dan file upload.

Build produksi dijalankan dengan:

```bash
npm run build
```

## Pemrosesan gambar

Upload JPG, PNG, dan WebP diputar sesuai metadata orientasi, dibatasi hingga 2400 × 2400 piksel tanpa pembesaran, lalu dikompresi ke WebP quality 82. Integrasi Vercel Blob aktif saat aplikasi berjalan di Vercel dan `BLOB_READ_WRITE_TOKEN` tersedia.
