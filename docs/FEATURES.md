# Daftar Fitur

Ringkasan fitur Telkom Student Creation per area. Untuk endpoint lihat [API.md](API.md), untuk pengujian lihat [TESTING.md](TESTING.md).

Peran pengguna:

| Peran | Akun | Masuk lewat |
| --- | --- | --- |
| Pengunjung | tanpa akun | - |
| Siswa | `users` (role `student`), NIS harus ada di `students` | `/login` |
| Guru | `users` (role `teacher`) | `/login` |
| Admin CMS | `admins` | `/admin/login` |

---

## 1. Area publik

| Halaman | Rute | Isi |
| --- | --- | --- |
| Beranda | `/` | Hero banner (slider), karya terbaru (grid 4), proyek terbaru, peluang terbaru, penghargaan aktif, leaderboard ringkas (Most Valuable Student + podium), testimoni |
| Katalog karya | `/karya` | Filter jurusan dan kategori (tombol), pencarian, urutan, header ringkas |
| Detail karya | `/karya/[slug]` | Sampul + lightbox, ringkasan, galeri, perangkat, lencana "Terverifikasi oleh guru pembimbing" dengan nama guru, suka, komentar. Pemilik/guru pembimbing dapat melihat draf, umpan balik dan riwayat tinjauan |
| Proyek | `/proyek`, `/proyek/[slug]` | Listing bergaya sama dengan karya; detail bergaya poster: tim, mentor, galeri, riwayat tinjauan, suka dan komentar, tautan ke tracker/chat untuk tim |
| Peluang | `/peluang` | Kompetisi, pameran, tantangan, mentoring, kolaborasi; siswa dapat menyatakan minat |
| Penghargaan | `/awards` | Daftar award, periode voting, nominasi, hitungan partisipasi, hasil setelah diumumkan |
| Leaderboard | `/leaderboard` | Podium MVS, peringkat karya (suka/komentar), peringkat proyek, peringkat siswa |
| Profil siswa | `/siswa/[id]` | Cover banner, tab (karya, proyek, pencapaian, tentang), karya semat (maks 3), kartu bagikan + QR, tombol DM, status online |
| Profil guru | `/guru/[id]` | Profil keahlian, jumlah tinjauan, karya yang diverifikasi |
| Pencarian global | navbar | Karya, proyek, peluang, award, siswa, guru, kelas, program (maks 12 hasil) |
| Login / Register | `/login`, `/register` | Layar penuh dengan panel merek; registrasi siswa wajib NIS terdaftar |
| Skeleton loading | semua halaman | Skeleton per bagian, shimmer gambar |

Navbar berurutan: Karya, Proyek Siswa, Peluang Kolaborasi, Awards, Leaderboard.

---

## 2. Portal siswa (`/portal/siswa`)

| Fitur | Rute | Keterangan |
| --- | --- | --- |
| Dashboard | `/portal/siswa` | Ringkasan karya/proyek, aktivitas, pintasan |
| Karya saya | `/portal/siswa/karya`, `/baru`, `/[id]/edit` | Wizard dengan pratinjau langsung. Draf hanya perlu judul; mengajukan butuh kategori dan ringkasan. Karya terbit yang diedit kembali ke draf dan perlu ditinjau ulang |
| Proyek saya | `/portal/siswa/proyek`, `/baru`, `/[id]/edit` | Anggota + kontribusi, undang guru pembimbing (guru pertama = mentor utama), ajukan verifikasi setelah mentor utama menerima |
| Tracker | `/portal/siswa/tracker`, `/[id]` | Lihat bagian 5 |
| Pesan | `/portal/siswa/pesan` | Lihat bagian 4 |
| Profil | `/portal/siswa/profil` | Nama, bio, minat, keterampilan, pengalaman, foto, karya semat |
| Tampilan | `/portal/siswa/tampilan` | Cover banner, tema/aksen profil, tampilkan status online |
| Suka & komentar | di halaman karya/proyek | Siswa tidak boleh menyukai karya sendiri; komentar 2-1200 karakter. Penulis dapat **mengedit** (ditandai "diedit") dan **menghapus** komentarnya; pemilik karya dapat menghapus komentar orang lain di karyanya, begitu pula pengelola proyek di proyeknya (pengelola tidak dapat mengedit komentar orang lain) |
| Voting award | `/awards` | Satu suara per award, tidak boleh memilih karya sendiri, dapat diganti selama voting terbuka |
| Minat peluang | `/peluang` | Daftar/batalkan minat, catatan maks 800 karakter, hanya program sasaran dan dalam jendela pendaftaran |
| Notifikasi | lonceng header | Revisi karya, respons undangan, suka/komentar baru, pencapaian, tenggat peluang/voting |

## 3. Portal guru (`/portal/guru`)

| Fitur | Rute | Keterangan |
| --- | --- | --- |
| Dashboard | `/portal/guru` | Antrean verifikasi, dampak sekolah: partisipasi, kategori proyek, status verifikasi, publikasi, peluang |
| Verifikasi karya | `/portal/guru/verifikasi` | Antrean karya yang sudah diajukan siswa di kelas/program guru; setujui (terbit + terverifikasi) atau minta revisi dengan umpan balik (min. 5 karakter) |
| Verifikasi proyek | halaman detail proyek | Terima/tolak undangan; mentor utama menyetujui atau meminta revisi, mentor pendamping hanya memberi masukan |
| Peluang | `/portal/guru/peluang`, `/baru`, `/[id]/edit` | Buat draf/terbitkan/tutup peluang; tindak lanjut peminat (`interested` → `contacted` → `completed`) hanya untuk siswa dalam cakupan |
| Suka & komentar | karya/proyek siswa | Guru dapat menyukai dan berkomentar di semua karya dan proyek, serta mengedit dan menghapus komentarnya sendiri |
| Tracker, Pesan | `/portal/guru/tracker`, `/pesan` | Sama seperti siswa; akses tracker hanya untuk proyek tempat guru menjadi pembimbing yang menerima |
| Profil, Tampilan | `/portal/guru/profil`, `/tampilan` | Keahlian dan minat dipakai saat siswa mengundang pembimbing |

## 4. Pesan (chat)

- Jenis percakapan: pesan langsung (DM), grup, ruang kelas, ruang proyek. Ruang kelas/proyek dibuat otomatis saat pertama dibuka dan keanggotaannya mengikuti kelas atau tim proyek.
- Grup: undang dengan persetujuan, ganti nama, ganti foto, keluar, keluarkan anggota (pemilik). Ruang proyek dapat memiliki foto.
- Pesan maks 2000 karakter, 25 pesan/menit per pengguna, hapus pesan sendiri.
- Blokir pengguna, laporkan pesan (alasan + catatan).
- UI: tiga panel, tab, pencarian, pemisah hari, bubble berkelompok, emoji, panel info (anggota, kartu proyek).
- Pembaruan lewat polling; nada notifikasi (Web Audio) dengan tombol senyap; jumlah belum dibaca di judul tab dan sidebar.
- Status online: titik hijau di avatar dan chat, dapat dimatikan pengguna.

## 5. Tracker proyek

- Papan kanban (drag & drop), tampilan daftar, riwayat aktivitas, ringkasan (distribusi status, beban per anggota, tenggat dekat).
- Tugas: judul, deskripsi, status (`todo`, `doing`, `review`, `done`), prioritas, tenggat, label, checklist, banyak penanggung jawab, komentar. Setiap perubahan dicatat di log aktivitas.
- Beranda tracker: "Fokus saya" dikelompokkan menurut tenggat, progres per proyek, feed lintas proyek.
- Badge aktivitas baru di sidebar (waktu terakhir dilihat disimpan di browser).
- Izin: pemilik, anggota, dan mentor yang menerima dapat mengubah; hapus hanya pembuat tugas atau pemilik/mentor utama.

## 6. Shell portal

Sidebar bertingkat dengan ikon (link anak hanya bergaris bawah saat aktif), badge pesan dan tracker, menu akun, panel notifikasi yang dapat difilter, polling gabungan `/api/portal/pulse` (notifikasi + pesan + tracker dalam satu panggilan), tampilan responsif.

## 7. Admin CMS (`/admin`)

Login terpisah memakai collection `admins`. Navigasi dikelompokkan:

| Grup | Collection |
| --- | --- |
| Beranda | `home-banners`, `testimonials` |
| Akademik | `programs`, `classes` |
| Pengguna | `users`, `students` |
| Portofolio | `portfolios`, `projects`, `portfolio-categories` |
| Pembimbingan & Verifikasi | `portfolio-reviews` |
| Penghargaan | `awards`, `award-votes` |
| Peluang & Dampak | `opportunities`, `opportunity-interests` |
| Komunitas | `student-records` |
| Proyek | `project-likes`, `project-comments` |
| Tracker | `project-tasks`, `project-task-comments`, `project-activity` |
| Pesan | `chat-conversations`, `chat-members`, `chat-messages`, `chat-blocks`, `chat-reports` |
| Media | `uploads` |
| Administrasi | `admins` |

Catatan: `portfolio-likes` dan `portfolio-comments` tidak ditampilkan dalam grup. Editor gambar (crop, titik fokus) tersedia pada `uploads`. Suara award tidak dapat dihapus; suka tidak dapat diedit; komentar hanya dapat diedit oleh penulisnya. Collection pesan, tracker, dan sosial dikunci hanya untuk admin; klien memakai `/api/*` yang menegakkan keanggotaan.

## 8. Fitur lintas bagian

- **Upload gambar**: dikonversi ke WebP, sisi terpanjang maks 2400px, tanpa memperbesar gambar kecil, teks alt otomatis, simpan di Vercel Blob. Hanya admin (dan alur terkait) yang dapat mengubah/menghapus.
- **Penghargaan**: award `draft` → `open` → `closed` → `announced`. Nominasi hanya karya terbit. Hasil disembunyikan sampai diumumkan.
- **Achievement** (`student-records`): karya paling disukai, karya paling ramai, MVS #1-3, nominasi dan pemenang award; dibuat otomatis saat leaderboard dihitung.
- **Leaderboard** untuk karya dan proyek, di-cache 30 detik dengan deduplikasi permintaan.
- **Performa**: hitungan memakai SQL group-by (`lib/dbCounts.ts`), query independen dijalankan paralel, `Cache-Control: s-maxage=30, stale-while-revalidate=300` untuk endpoint publik, koneksi lewat pooler Supabase port 6543 di Vercel.
- **Keamanan**: cek origin pada login/register, cookie sesi `karyakita-session` httpOnly, collection sensitif dikunci admin, ID relasi harus angka.
- **Seed**: skrip `npm run seed:*` untuk data sekolah, siswa, kategori, karya, avatar, bio, komunitas, award, banner, testimoni, dan admin CMS.
