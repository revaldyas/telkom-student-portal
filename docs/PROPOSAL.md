# Proposal: Telkom Student Creation

**Platform portofolio, kolaborasi proyek, dan jembatan menuju dunia kerja bagi siswa SMK Telkom**

| | |
| --- | --- |
| **Diajukan kepada** | Kepala Sekolah dan Pimpinan Sekolah |
| **Diajukan oleh** | Tim Pengembang Telkom Student Creation |
| **Periode** | Oktober 2026 |
| **Jenis permohonan** | Persetujuan anggaran dan penugasan untuk tahap MVP (peluncuran ke seluruh sekolah) |

---

## 1. Ringkasan satu halaman

**Apa ini?** Telkom Student Creation adalah platform tempat siswa menampilkan karya dan proyek yang **divalidasi guru pembimbing**, bekerja dalam tim memakai papan tugas seperti di industri, berkomunikasi, dan menemukan peluang (lomba, magang, kolaborasi). Hasilnya menjadi **portofolio terverifikasi** yang dapat dilampirkan untuk PKL, kuliah, dan melamar kerja.

**Masalah yang diselesaikan.** Karya siswa hilang setelah penilaian, kemampuan sulit dibuktikan ke pihak luar, kerja kelompok tidak terpantau, dan informasi peluang tersebar.

**Sudah sampai di mana?** Platform inti **sudah berjalan dan teruji** (16 modul fitur, 409 uji otomatis lulus): karya dan verifikasi guru, proyek tim dengan mentor, tracker tugas, chat antar siswa, penghargaan, leaderboard, peluang, dan profil publik. Yang tersisa adalah tahap **MVP peluncuran**: pendaftaran otomatis dari data sekolah, keamanan, dan hal-hal wajib untuk pengguna siswa di bawah umur.

**Yang dimohonkan sekarang:**

| | |
| --- | --- |
| **Anggaran** | **Rp 9.750.000** (sekali, untuk tahap MVP) |
| **Waktu** | **2 minggu**: 1 minggu pengerjaan + 1 minggu testing dan Quality Assurance (QA) |
| **Isi** | Pendaftaran guru dan siswa tervalidasi data sekolah, lupa kata sandi, perlindungan anti-bot dan keamanan, kebijakan privasi, notifikasi tersimpan di server, moderasi konten |
| **Hasil** | Platform siap dipakai seluruh siswa dan guru, dengan keamanan yang layak untuk pengguna di bawah umur |
| **Di luar anggaran ini** | Biaya layanan berjalan (server, domain, email), ditanggung sekolah; perkiraan di bagian 7 |

**Mengapa layak disetujui?**

1. **Risiko rendah:** fondasi sudah berjalan; yang diminta hanya tahap akhir, dengan hasil jelas dan dapat diuji.
2. **Biaya kecil:** Rp 9,75 juta, sekitar sepertiga sampai separuh dari acuan harga pasar untuk pekerjaan serupa (±Rp 24 juta).
3. **Komitmen bertahap:** hanya MVP yang diminta sekarang. Tahap lanjutan diputuskan setelah hasil MVP dan percontohan terlihat.
4. **Manfaat terukur:** target dan indikator keberhasilan sudah ditetapkan (bagian 8).
5. **Aset milik sekolah:** kode, data, dan dokumentasi lengkap sehingga tidak bergantung pada satu orang atau satu vendor.

**Keputusan yang diminta:** persetujuan anggaran Rp 9,75 juta, penunjukan koordinator sekolah, dan akses data siswa/guru (lihat bagian 11 dan formulir persetujuan di bagian 12).

---

## 2. Latar belakang dan masalah

| Masalah | Dampak |
| --- | --- |
| Karya siswa tidak terdokumentasi terpusat | Hasil belajar hilang setelah penilaian; sulit dipamerkan |
| Tidak ada validasi yang dapat ditunjukkan ke pihak luar | Klaim kemampuan sulit dibuktikan kepada perusahaan PKL |
| Kerja kelompok tidak terpantau | Guru tidak tahu kontribusi tiap anggota; anggota pasif tidak terlihat |
| Siswa belum terbiasa alur kerja tim profesional | Lulusan kaget dengan pembagian tugas, tenggat, dan tinjauan di industri |
| Informasi peluang tersebar | Siswa terlewat lomba, magang, atau program kolaborasi |
| Komunikasi proyek lewat aplikasi umum | Tercampur obrolan pribadi, tanpa moderasi sekolah |
| Pengakuan prestasi tidak merata | Hanya pemenang lomba besar yang terlihat |
| Sulit menunjukkan hasil pembelajaran berbasis proyek | Bahan promosi dan akreditasi bergantung dokumentasi manual |

---

## 3. Solusi

### 3.1 Yang sudah tersedia

| Bidang | Fitur |
| --- | --- |
| **Etalase karya dan proyek** | Unggah karya (sampul, galeri, perangkat, tautan), katalog dengan filter jurusan dan kategori, pencarian, profil publik siswa dengan kartu bagikan QR, karya semat |
| **Validasi guru** | Karya diajukan, guru dalam cakupan kelas/program menyetujui atau meminta revisi dengan catatan; tanda "Terverifikasi oleh [nama guru]"; riwayat tinjauan tersimpan |
| **Proyek kolaborasi** | Tim dengan peran masing-masing, mentor utama dan pendamping, alur undangan dan persetujuan, halaman proyek bergaya poster |
| **Tracker proyek** | Papan kanban (rencana, dikerjakan, review, selesai), tenggat, prioritas, label, daftar periksa, penanggung jawab, komentar, riwayat aktivitas |
| **Komunikasi** | Pesan langsung, grup, ruang kelas dan ruang proyek, status online (dapat disembunyikan), blokir dan laporan pesan |
| **Peluang dan penghargaan** | Kanal peluang dikelola guru, minat siswa, penghargaan dengan nominasi dan voting, leaderboard, Most Valuable Student, pencapaian otomatis |
| **Interaksi** | Suka dan komentar (siswa dan guru) pada karya dan proyek, dengan edit dan hapus oleh penulis |
| **Alat guru dan sekolah** | Antrean verifikasi, notifikasi, dashboard dampak, panel admin untuk data sekolah |

Rincian: [FEATURES.md](FEATURES.md). Arsitektur dan keamanan: [ARCHITECTURE.md](ARCHITECTURE.md).

### 3.2 Yang dikerjakan pada tahap MVP

| Pekerjaan | Manfaat |
| --- | --- |
| **Pendaftaran tervalidasi data sekolah** (NIS/NISN siswa, NIP/NUPTK guru; peran ditentukan oleh data sekolah) | Admin tidak lagi membuat akun satu per satu; hanya orang terdaftar yang dapat masuk |
| **Lupa kata sandi dan verifikasi email** | Pengguna dapat memulihkan akun sendiri |
| **Perlindungan keamanan**: pembatasan percobaan login, CAPTCHA anti-bot, header keamanan, validasi unggahan, audit data publik | Melindungi akun siswa dari penyalahgunaan dan bot |
| **Kebijakan privasi dan aturan komunitas** | Dasar hukum dan etika untuk pengguna di bawah umur |
| **Notifikasi tersimpan di server** | Status "sudah dibaca" konsisten di semua perangkat |
| **Moderasi konten dan log audit** | Laporan konten ditinjau admin; jejak perubahan tercatat |

---

## 4. Manfaat

### Bagi siswa

- **Portofolio yang diakui:** karya terverifikasi guru, dibuka lewat satu tautan atau QR.
- **Siap PKL dan kerja:** rekam jejak proyek, peran, dan hasil untuk dilampirkan saat melamar.
- **Belajar kerja tim profesional:** tracker, tenggat, tinjauan, dan komunikasi tertulis sebelum masuk industri.
- **Umpan balik nyata** dan **pengakuan** (suka, penghargaan, leaderboard, pencapaian).
- **Akses peluang** (lomba, magang, kolaborasi) di satu tempat.

### Bagi guru

- **Verifikasi terstruktur:** satu antrean, catatan revisi tersimpan.
- **Pemantauan proyek** tanpa rapat berulang: kemajuan, tenggat, dan kontribusi anggota terlihat.
- **Dokumentasi pembimbingan** otomatis; nama guru tampil pada karya yang diverifikasi.
- **Penyaluran peluang** dan tindak lanjut siswa yang berminat.

### Bagi sekolah

- **Bukti capaian pembelajaran berbasis proyek** per kelas dan jurusan untuk evaluasi dan akreditasi.
- **Etalase publik** yang selalu diperbarui untuk promosi dan PPDB.
- **Keputusan berbasis data:** statistik partisipasi dan verifikasi.
- **Hubungan industri:** mitra melihat kualitas lulusan dan menawarkan peluang.
- **Kepemilikan data dan aset** di sistem sekolah.

### Bagi orang tua dan industri

- Orang tua melihat perkembangan keterampilan anak lewat karya nyata (bila siswa mengizinkan profil publik).
- Mitra PKL dan industri meninjau portofolio terverifikasi sebelum menerima peserta atau merekrut.

---

## 5. Perbandingan dengan alternatif

| Alternatif | Keterbatasan | Telkom Student Creation |
| --- | --- | --- |
| Grup chat umum | Tidak terstruktur, tanpa moderasi sekolah | Chat terikat kelas/proyek dengan blokir dan laporan |
| Drive / folder berbagi | Tanpa validasi, tampilan, atau interaksi | Etalase publik dengan verifikasi guru |
| Media sosial umum | Risiko privasi, tidak fokus kompetensi | Akun terverifikasi sekolah, konten fokus karya |
| Platform portofolio global | Tidak mengenal kelas dan guru pembimbing | Cakupan kelas/program, pembimbing, penghargaan sekolah |
| LMS | Fokus tugas dan nilai | Melengkapi LMS: etalase, tracker, dan peluang |

---

## 6. Rencana dan jadwal

### 6.1 Peta jalan

| Tahap | Isi | Durasi | Yang diputuskan sekolah |
| --- | --- | --- | --- |
| **Persiapan** | Penunjukan koordinator, penyediaan data siswa/guru, keputusan hosting, persetujuan kebijakan privasi | menyesuaikan sekolah | Persetujuan proposal ini |
| **MVP** | Pekerjaan pada bagian 3.2 | **2 minggu** (1 pengerjaan + 1 testing dan QA) | - |
| **Percontohan** | Sepertiga sekolah (2 program keahlian), pelatihan guru dan siswa, pengumpulan umpan balik | ±3 bulan | Lanjut ke seluruh sekolah |
| **Peluncuran sekolah** | Pembukaan untuk seluruh siswa dan guru | mengikuti hasil percontohan | - |
| **Penguatan (opsional)** | Rubrik penilaian, notifikasi realtime, ekspor portofolio PDF, laporan proyek, analitik | 2 minggu per paket | Disetujui terpisah |
| **Ekosistem (opsional)** | Mentor industri/alumni, pencocokan peluang, dan lainnya | 2 minggu per paket | Disetujui terpisah |

### 6.2 Jadwal MVP

| Minggu | Kegiatan | Hasil |
| --- | --- | --- |
| **1 – Pengerjaan** | Pendaftaran tervalidasi data sekolah, lupa kata sandi dan verifikasi email, perlindungan keamanan dan anti-bot, kebijakan privasi, notifikasi di server, moderasi dan log audit | Seluruh fitur MVP berjalan di lingkungan uji |
| **2 – Testing dan QA** | Seluruh uji otomatis (409 uji yang ada ditambah uji fitur baru), uji manual per peran (siswa, guru, admin), uji keamanan dasar, uji perangkat dan peramban, perbaikan temuan, pembaruan dokumentasi, uji penerimaan oleh perwakilan guru dan siswa | Platform lolos kriteria penerimaan dan siap dibuka |

### 6.3 Kriteria penerimaan MVP

- Seluruh uji otomatis lulus.
- Pendaftaran siswa dan guru hanya berhasil untuk identitas yang ada di data sekolah; peran ditentukan oleh data sekolah.
- Pengguna dapat memulihkan kata sandi; email terverifikasi.
- Percobaan login berulang dan pendaftaran massal dibatasi; CAPTCHA aktif.
- Tidak ada data pribadi (email, NIS, kontak) pada respons halaman publik.
- Kebijakan privasi dan aturan komunitas tampil dan wajib disetujui saat mendaftar.
- Laporan konten sampai ke antrean admin; perubahan penting tercatat di log audit.
- Dokumentasi diperbarui dan disetujui oleh koordinator sekolah.

---

## 7. Anggaran

### 7.1 Permohonan

| Pos | Nilai |
| --- | ---: |
| **Pengembangan tahap MVP** (pengerjaan, UI/UX, testing dan QA, dokumentasi) | **Rp 9.750.000** |
| Biaya layanan berjalan (ditanggung sekolah, bukan bagian permohonan ini) | Rp 0,3-1,5 juta per bulan |

Harga pengembangan sudah mencakup UI/UX, pengujian otomatis, dokumentasi, dan dukungan peluncuran. Acuan harga pasar untuk pekerjaan serupa sekitar 2–3 kali lipat (±Rp 24 juta); harga yang diajukan adalah harga khusus sekolah.

### 7.2 Biaya layanan berjalan (perkiraan untuk sekolah ±1.200 siswa)

| Komponen | Perkiraan | Catatan |
| --- | --- | --- |
| Hosting, database, penyimpanan berkas | Rp 0,3-1,5 juta per bulan | Bergantung pilihan: server sendiri sampai layanan cloud terkelola |
| Domain | ±Rp 0,3 juta per tahun | |
| Email transaksional dan CAPTCHA | Rp 0-0,3 juta per bulan | Banyak yang memiliki paket gratis |
| Pelatihan guru dan siswa | Rp 3-10 juta (sekali) | Honor narasumber dan materi |
| Audit keamanan pihak ketiga | Rp 15-40 juta per tahun | Opsional untuk tahap awal |

Kebutuhan teknis diperkirakan kecil: penyimpanan ±3-4 GB pada tahun pertama, database di bawah 0,5 GB, dan beban puncak ±12 permintaan per detik, cukup untuk satu server kecil (lihat [SIMULASI.md](SIMULASI.md)).

### 7.3 Opsi pengembangan lanjutan (tidak diminta sekarang)

Diputuskan di akhir tiap tahap berdasarkan hasil. Setiap paket dikerjakan **paling lama 2 minggu**, termasuk testing dan QA.

| Paket | Isi | Harga | Jadwal |
| --- | --- | ---: | --- |
| Prioritas sedang | Rubrik penilaian dan lencana keahlian, notifikasi realtime, ekspor portofolio PDF, laporan proyek mingguan, analitik sekolah, impor CSV dan kenaikan kelas | Rp 9,85 juta | 2 minggu |
| Prioritas kecil | PWA dan mode gelap, aksesibilitas, pencarian lebih baik, riwayat revisi karya, tracker lanjutan | Rp 6,85 juta | 1,5 minggu |
| Ekosistem | Mentor industri/alumni, pencocokan peluang, penghargaan berbasis juri, integrasi GitHub | Rp 9,35 juta | 2 minggu |
| Fitur AI | Bantuan AI untuk guru (draf umpan balik), siswa (asisten penulisan), dan admin (moderasi); belum termasuk biaya pemakaian model AI | Rp 12,45 juta | 2 minggu |
| Migrasi hosting sendiri | Server, penyimpanan, dan database milik sekolah | Rp 2,45 juta | 1 minggu |

Total seluruh opsi lanjutan Rp 40,95 juta; bersama MVP Rp 50,7 juta. Dasar perhitungan: [BIAYA-PENGEMBANGAN.md](BIAYA-PENGEMBANGAN.md).

---

## 8. Dampak dan indikator keberhasilan

Target berikut berasal dari simulasi untuk sekolah berskala SMK Telkom (acuan 1.200 siswa, 36 rombel, 90 guru); metode dan rentang ketidakpastian di [SIMULASI.md](SIMULASI.md). Nilai yang ditampilkan adalah median simulasi.

| Indikator | Akhir tahun 1 | Akhir tahun 2 |
| --- | --- | --- |
| Siswa aktif (punya minimal 1 karya terverifikasi) | **±550 (46%)** | **±820 (69%)** |
| Karya terverifikasi (kumulatif) | **±420** | **±1.440** |
| Proyek tim terbit (kumulatif) | **±23** | **±83** |
| Beban verifikasi per guru pembimbing | **±3 karya per bulan** | sama |
| Waktu verifikasi guru | median ≤ 5 hari kerja, 90% ≤ 10 hari | sama |
| Siswa kelas XI yang memakai portofolio untuk PKL/lamaran | ≥ 50% | sama |
| Peluang aktif per semester | ≥ 8 | sama |
| Keterlibatan: siswa terdaftar membuka platform tiap bulan | ≥ 60% | sama |
| Kepuasan siswa dan guru (survei semester, responden ≥ 50%) | ≥ 4,0 dari 5 | sama |

Indikator diukur dari dashboard platform dan survei; garis dasar ditetapkan pada bulan pertama percontohan. Capaian bergantung pada adopsi: bila siswa aktif hanya mencapai 50% di tahun kedua, hasilnya ±600 siswa aktif; bila 85%, ±1.020. Karena itu pelatihan dan kebijakan penggunaan di sekolah menjadi faktor kunci (bagian 11).

---

## 9. Risiko dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Rendahnya partisipasi | Kebijakan sekolah, pelatihan, duta platform dari guru dan siswa, indikator dipantau tiap bulan |
| Konten tidak pantas atau perundungan | Aturan komunitas, laporan dan blokir (sudah ada), antrean moderasi (MVP) |
| Kebocoran data pribadi | Data publik diminimalkan dan diaudit, kebijakan privasi, keamanan berlapis (MVP) |
| Penyalahgunaan oleh bot atau pihak luar | Pembatasan percobaan, CAPTCHA, header keamanan (MVP) |
| Beban verifikasi guru menumpuk di akhir semester | Cakupan per kelas/program, notifikasi, tenggat bertahap, ringkasan mingguan (paket lanjutan) |
| Akses data sekolah terlambat | Mulai dari impor daftar siswa/guru (CSV); integrasi langsung menyusul |
| Ketergantungan pada satu pengembang | Dokumentasi lengkap, 409 uji otomatis, tim dua orang, kode milik sekolah |
| Ketergantungan layanan pihak ketiga | Tidak terkunci pada vendor; panduan migrasi tersedia ([REKOMENDASI-MIGRASI.md](REKOMENDASI-MIGRASI.md)) |
| Biaya layanan meningkat | Kompresi gambar otomatis, batas ukuran berkas, retensi pesan, opsi server sendiri |
| Plagiarisme atau karya bukan milik siswa | Verifikasi guru, riwayat revisi, laporan konten |

---

## 10. Keamanan, privasi, dan tata kelola

Siswa adalah pengguna di bawah umur sehingga platform dirancang dengan prinsip **minim data, akses terbatas, dan jejak yang jelas**:

- **Akun terverifikasi sekolah:** hanya siswa dan guru yang terdaftar di data sekolah; login siswa/guru dan admin dipisahkan.
- **Hak akses per peran:** siswa tidak dapat menerbitkan atau memverifikasi karyanya sendiri; guru hanya meninjau siswa dalam cakupannya; draf bersifat pribadi.
- **Data publik minimal:** profil menampilkan nama, kelas, dan karya; tidak menampilkan email atau NIS.
- **Kontrol pengguna:** status online dapat disembunyikan, profil dapat dikelola, laporan dan blokir tersedia.
- **Keamanan teknis:** sesi aman, pembatasan laju, perlindungan anti-bot, enkripsi koneksi, dan log audit (MVP); pengujian otomatis menjaga aturan akses tidak rusak.
- **Tata kelola:** koordinator sekolah, admin platform, dan moderator ditunjuk; kebijakan privasi dan aturan komunitas disetujui sekolah.

Rincian teknis: [ARCHITECTURE.md](ARCHITECTURE.md) dan [REKOMENDASI-KEAMANAN.md](REKOMENDASI-KEAMANAN.md).

---

## 11. Dukungan yang dibutuhkan dari sekolah

| Kebutuhan | Waktu |
| --- | --- |
| **Koordinator sekolah** (penghubung, pemantauan, pelatihan) dan admin platform | Sebelum pengerjaan |
| **Data siswa dan guru** (NIS/NISN, nama, kelas, program; NIP/NUPTK guru) dalam bentuk CSV atau akses API portal sekolah | Sebelum pengerjaan |
| **Keputusan hosting** (layanan cloud atau server sekolah) dan penyediaan domain serta email pengirim | Sebelum pengerjaan |
| **Persetujuan kebijakan privasi dan aturan komunitas** | Sebelum atau saat minggu testing dan QA |
| **Perwakilan guru dan siswa untuk uji penerimaan** | Minggu 2 |
| **Kebijakan penggunaan:** proyek akhir semester didokumentasikan di platform; guru memakainya untuk bimbingan | Sebelum percontohan |
| **Pelatihan:** sesi guru ±6 jam dan orientasi siswa ±30 menit per kelas | Saat percontohan |

---

## 12. Permintaan persetujuan

Kami memohon persetujuan atas hal berikut:

| No. | Keputusan | Setuju |
| --- | --- | --- |
| 1 | Anggaran pengembangan tahap MVP sebesar **Rp 9.750.000** dengan jadwal **2 minggu** (1 pengerjaan + 1 testing dan QA) | ☐ |
| 2 | Penunjukan koordinator sekolah dan admin platform | ☐ |
| 3 | Penyediaan data siswa dan guru untuk validasi pendaftaran | ☐ |
| 4 | Keputusan hosting dan penyediaan domain/email pengirim | ☐ |
| 5 | Pelaksanaan percontohan pada 2 program keahlian setelah MVP | ☐ |

| Disetujui oleh | |
| --- | --- |
| Nama | |
| Jabatan | |
| Tanda tangan | |
| Tanggal | |

---

## Lampiran

### A. Skenario penggunaan

**Melamar PKL.** Siswa menyematkan 3 karya terbaik di profil, memastikan statusnya "Terverifikasi", lalu membagikan tautan atau QR profil pada surat lamaran. Perusahaan melihat karya, perangkat yang dipakai, nama guru pembimbing, dan riwayat proyek tim.

**Proyek kelompok.** Lima siswa membuat aplikasi. Ketua membuat proyek dan mengundang guru pembimbing, lalu tim memecah pekerjaan di tracker. Guru melihat tugas yang terlambat dan memberi masukan. Setelah selesai, mentor utama menyetujui dan proyek tayang dengan nama seluruh anggota dan perannya.

**Lomba.** Guru memasang peluang lomba. Siswa yang berminat mendaftarkan minat dan guru menindaklanjuti. Hasil lomba dicatat sebagai pencapaian di profil.

**Akhir semester.** Sekolah membuka penghargaan dengan nominasi; siswa memilih; hasil diumumkan dan pemenang tampil di beranda.

### B. Keselarasan dengan tujuan pendidikan vokasi

> Selaraskan istilah dengan kebijakan dan kurikulum yang berlaku di sekolah.

| Tujuan | Cara platform mendukung |
| --- | --- |
| Pembelajaran berbasis proyek | Proyek kolaborasi dengan tahapan, peran, dan tinjauan |
| Kolaborasi, komunikasi, dan berpikir kritis | Tracker, ruang proyek, komentar, dan tinjauan sejawat |
| Kesiapan PKL dan dunia kerja | Portofolio terverifikasi, kebiasaan kerja tim, tenggat |
| Pengakuan kompetensi keahlian | Karya dikategorikan per jurusan dan divalidasi guru program keahlian |
| Penguatan karakter dan literasi digital | Etika komentar, moderasi, privasi, identitas digital |
| Keterhubungan dengan industri | Kanal peluang dan (opsional) mentor industri |

### C. Dokumen pendukung

| Dokumen | Isi |
| --- | --- |
| [FEATURES.md](FEATURES.md) | Daftar fitur lengkap per peran |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arsitektur, diagram, ERD, deployment |
| [API.md](API.md) | Referensi endpoint |
| [TESTING.md](TESTING.md) | Strategi dan cakupan pengujian |
| [SIMULASI.md](SIMULASI.md) | Simulasi adopsi, kapasitas, dan beban |
| [BIAYA-PENGEMBANGAN.md](BIAYA-PENGEMBANGAN.md) | Dasar perhitungan biaya dan jadwal |
| [REKOMENDASI.md](REKOMENDASI.md) | Usulan identitas, migrasi, realtime, keamanan, dan fitur |
