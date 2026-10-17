# Referensi API

Semua endpoint ada di `app/(payload)/api/` dan berjalan di bawah `/api`. Selain itu, REST bawaan Payload tersedia lewat catch-all `app/(payload)/api/[...slug]/route.ts` (membaca cookie sesi website dan admin, dengan pembatasan laju).

## Konvensi

- **Autentikasi website**: cookie `karyakita-session` (httpOnly), dibaca oleh `authenticateWebsiteRequest` (`lib/websiteAuth.ts`). Hanya akun `users` dengan role `student` atau `teacher` yang dianggap login. Admin CMS memakai `payload-token`.
- **Request**: JSON. Endpoint `POST` auth memeriksa header `Origin` sama dengan origin server.
- **Error**: `{ "message": "..." }` dengan status HTTP yang sesuai (400 validasi, 401 belum masuk, 403 tidak berhak, 404 tidak ada, 409 konflik status, 429 terlalu cepat).
- **ID relasi** yang dikirim klien harus berupa angka, bukan string.
- **Cache**: endpoint publik baca-saja memakai `Cache-Control: public, s-maxage=30, stale-while-revalidate=300`; endpoint yang bergantung pada sesi memakai `no-store`.
- Peran: **Publik** = tanpa login; **Login** = siswa atau guru; **Siswa**, **Guru**, **Admin** sebagai disebut.

---

## Autentikasi dan akun

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| POST | `/api/register` | Publik | Buat akun siswa. Body: nama, email, kata sandi (min. 8), NIS. Role selalu `student`; NIS harus ada di `students` dan belum dipakai; email unik |
| POST | `/api/auth/login` | Publik | Body: email (tidak peka huruf besar), kata sandi. Mengatur cookie sesi. Pesan error sama untuk email salah dan kata sandi salah |
| POST | `/api/auth/logout` | Login | Menghapus cookie sesi |
| GET | `/api/auth/session` | Publik | Mengembalikan pengguna saat ini atau kosong |

## Konten publik

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/community/feed?limit=` | Publik | Data beranda: karya terbit (+ suka, komentar, penanda nominasi), proyek, peluang terbuka, award terbuka, testimoni, hero banner, total. `limit` 1-1000 (bawaan 6) |
| GET | `/api/community/search?q=` | Publik | Min. 2 karakter, maks 12 hasil: karya, proyek, peluang, award, siswa, guru, kelas, program, halaman |
| GET | `/api/community/leaderboard` | Publik | `topOverall`, `topLikes`, `trending`, `topProjects`, `trendingProjects`. Cache 30 detik |
| GET | `/api/community/portfolios/slug/[slug]` | Publik; sesi opsional | Detail karya. Draf hanya untuk pemilik atau guru sekelas/seprogram yang karyanya sudah diajukan; selain itu 404. `accessLevel`: `owner`, `mentor`, `public` |
| GET | `/api/community/students/[id]` | Publik | Profil siswa: karya terbit, total suka/komentar, pencapaian, tampilan, karya semat. 404 untuk bukan siswa |
| GET | `/api/community/mentors/[id]` | Publik | Profil guru: jumlah tinjauan, karya diverifikasi. 404 untuk bukan guru |
| GET | `/api/awards/[id]/stats` | Publik | Jumlah partisipasi award |
| GET | `/api/awards/[id]/results` | Publik | Jumlah suara per nominasi; 403 sebelum diumumkan |

## Suka dan komentar

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/community/portfolios/[id]/stats` | Publik; sesi opsional | Jumlah suka, komentar, dan status suka pengguna. 404 jika belum terbit |
| GET | `/api/community/portfolios/[id]/comments` | Publik | Komentar urut terlama, memuat nama penulis |
| GET | `/api/community/projects/[id]/stats` | Publik; sesi opsional | Jumlah suka dan komentar proyek |
| POST | `/api/community/projects/[id]/like` | Siswa/Guru | Toggle suka. Anggota tim tidak dapat menyukai proyeknya sendiri |
| GET / POST / DELETE | `/api/community/projects/[id]/comments` | GET publik; POST/DELETE login | POST body `{ body }`; DELETE `?commentID=` hanya komentar sendiri. Dibatasi laju |

Suka/komentar karya dibuat lewat REST Payload (`portfolio-likes`, `portfolio-comments`) dengan aturan akses di collection: siswa dan guru boleh, tidak bisa menyukai karya sendiri, tidak bisa dua kali, komentar tidak bisa diedit.

## Verifikasi dan pembimbingan

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/mentor/reviews` | Guru, Admin | Antrean karya yang sudah diajukan di kelas/program guru, termasuk yang diminta revisi |
| POST | `/api/mentor/reviews` | Guru, Admin | Body `{ portfolio, decision, feedback }`; `feedback` min. 5 karakter. 403 di luar cakupan, 409 jika masih draf |
| GET / PATCH | `/api/mentor/interests` | Guru | Peminat peluang dalam cakupan; PATCH hanya mengubah status (`interested`, `contacted`, `completed`) |
| POST | `/api/community/projects/[id]/actions` | Login | Body `{ action }`. `respond` (guru: `response` = `accepted`/`declined`, hanya sekali), `submit` (pengelola; butuh ringkasan dan mentor utama sudah menerima), `review` (guru yang menerima; `decision` = `comment`/`verified`/`revision-requested`, `feedback` 5-3000; hanya mentor utama untuk dua keputusan terakhir; 409 jika belum diajukan) |

## Portal

| Method | Path | Akses | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/portal/notifications` | Login | Notifikasi turunan dari status data saat ini (401 tanpa sesi) |
| POST | `/api/portal/pulse` | Login | Polling gabungan. Body `{ seen }` (waktu terakhir dilihat per proyek). Mengembalikan notifikasi, jumlah pesan belum dibaca, dan badge tracker, sekaligus memperbarui presence |
| POST | `/api/presence` | Login | Heartbeat status online (memperbarui `lastSeenAt`) |
| POST | `/api/presence/lookup` | Login | Body `{ ids }`; mengembalikan status online yang menghormati pengaturan privasi |

## Pesan

Semua endpoint pesan memerlukan login dan memeriksa keanggotaan percakapan.

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/chat/conversations` | Kotak masuk: percakapan, pratinjau, jumlah belum dibaca |
| POST | `/api/chat/conversations` | Body `{ type: 'dm', userID }`, `{ type: 'group', title, memberIDs }` (judul maks 60, anggota maks 30), atau `{ type: 'room', refKey }` (`class:ID` / `project:ID`) |
| GET / PATCH | `/api/chat/conversations/[id]` | Detail dan anggota; PATCH `{ title?, photoID? }` (`photoID: null` menghapus foto) |
| GET | `/api/chat/conversations/[id]/messages` | `?after=ID` untuk polling (maks 100), tanpa `after` memuat 40 terakhir |
| POST | `/api/chat/conversations/[id]/messages` | Body `{ text }`, maks 2000 karakter, 25 pesan/menit. Mengembalikan 201 |
| POST | `/api/chat/conversations/[id]/read` | Tandai terbaca |
| POST | `/api/chat/conversations/[id]/respond` | Terima/tolak undangan grup |
| POST | `/api/chat/conversations/[id]/members` | Body `{ userIDs }`, undang anggota |
| DELETE | `/api/chat/conversations/[id]/members/[userID]` | Keluar atau keluarkan anggota |
| GET | `/api/chat/users?q=` | Cari pengguna (maks 60 karakter) |
| GET | `/api/chat/unread` | Total belum dibaca |
| GET / POST / DELETE | `/api/chat/blocks` | Daftar blokir; POST `{ userID }`; DELETE `?userID=` |
| POST | `/api/chat/reports` | Body `{ messageID, reason, note? }`; satu laporan per pelapor per pesan |

## Tracker proyek

Akses: anggota tim, pemilik, dan mentor yang sudah menerima (`projectAccess` di `lib/tracker.ts`).

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/tracker/projects` | Proyek yang dapat diakses beserta progres |
| GET | `/api/tracker/projects/[id]` | Tim, tugas, ringkasan |
| GET | `/api/tracker/projects/[id]/activity` | Riwayat aktivitas |
| POST | `/api/tracker/projects/[id]/tasks` | Buat tugas: `title` (maks 160), `description` (maks 4000), `status`, `priority`, `assignees`, `dueDate`, `labels`, `checklist` |
| GET / PATCH / DELETE | `/api/tracker/tasks/[id]` | PATCH menerima bidang yang sama plus `position`; tiap perubahan dicatat ke log; `assignees` disaring ke anggota tim |
| POST | `/api/tracker/tasks/[id]/comments` | Komentar tugas |
| POST | `/api/tracker/badge` | Body `{ seen }`; jumlah aktivitas baru untuk badge sidebar |

Nilai: status `todo | doing | review | done`; prioritas `low | medium | high | urgent` (lihat `lib/tracker.ts` untuk daftar pasti).

## REST Payload

Catch-all `/api/[...slug]` menyajikan REST Payload standar (`/api/<collection>`, `/api/<collection>/<id>`) dan menerjemahkan cookie `karyakita-session` menjadi autentikasi Payload. Aturan akses ditentukan di tiap collection; collection pesan, tracker, dan sosial proyek hanya dapat dibaca/ditulis admin lewat REST dan wajib melalui endpoint khusus di atas. Formulir portal (karya, proyek, peluang, profil, minat peluang, suara award, upload) memakai REST ini.
