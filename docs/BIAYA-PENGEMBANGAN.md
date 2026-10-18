# Biaya dan Waktu Pengerjaan

Rincian biaya pengembangan Telkom Student Creation per paket, beserta lama pengerjaannya. Biaya yang diajukan adalah **harga khusus sekolah**; sebagai pembanding, acuan harga pasar untuk pekerjaan serupa sekitar **2–3 kali lipat** (dipakai ±2,5×).

Dokumen terkait: [PROPOSAL.md](PROPOSAL.md), [REKOMENDASI-FITUR.md](REKOMENDASI-FITUR.md), [SIMULASI.md](SIMULASI.md).

## 1. Ringkasan

Tim pengembang terdiri dari 2 orang. Tahap pertama yang diminta adalah **MVP: Rp 10 juta, dikerjakan dalam 2 minggu** (1 minggu pengerjaan + 1 minggu testing dan Quality Assurance).

| Paket | Isi singkat | Waktu | Biaya yang diajukan | Acuan pasar (±2,5×) |
| --- | --- | --- | ---: | ---: |
| **MVP (diminta sekarang)** | Keamanan, pendaftaran via data sekolah, lupa kata sandi, notifikasi di server, moderasi | **2 minggu** | **Rp 10 juta** | Rp 25 juta |
| Prioritas sedang | Rubrik penilaian, realtime, ekspor PDF, laporan proyek, analitik, impor CSV | 2 minggu | Rp 10 juta | Rp 25 juta |
| Prioritas kecil | PWA, aksesibilitas, pencarian, riwayat revisi, tracker lanjutan | 1,5 minggu | Rp 7 juta | Rp 17,5 juta |
| Ekosistem | Mentor industri, pencocokan peluang, juri, integrasi GitHub | 2 minggu | Rp 9,5 juta | Rp 24 juta |
| Fitur AI | Bantuan AI untuk guru, siswa, dan admin | 2 minggu | Rp 12,5 juta | Rp 31 juta |
| Migrasi hosting (opsional) | Pindah ke server milik sekolah | 1 minggu | Rp 2,5 juta | Rp 6 juta |

Jika dijalankan berurutan, total waktunya **±10,5 minggu** dan total biayanya **Rp 51,5 juta** (acuan pasar ±Rp 129 juta).

### Jalur bertahap

| Sampai paket | Total biaya | Acuan pasar | Total waktu |
| --- | ---: | ---: | ---: |
| MVP | **Rp 10 juta** | Rp 25 juta | 2 minggu |
| + Prioritas sedang | Rp 20 juta | Rp 50 juta | 4 minggu |
| + Prioritas kecil | Rp 27 juta | Rp 68 juta | 5,5 minggu |
| + Ekosistem | Rp 36,5 juta | Rp 91 juta | 7,5 minggu |
| + Fitur AI | Rp 49 juta | Rp 123 juta | 9,5 minggu |
| + Migrasi hosting | Rp 51,5 juta | Rp 129 juta | 10,5 minggu |

Setiap paket dikerjakan **paling lama 2 minggu**, sudah termasuk testing dan QA. Paket berikutnya baru dimulai setelah paket sebelumnya selesai diuji, dan setiap paket dapat dihentikan tanpa merusak paket sebelumnya.

## 2. Yang sudah tersedia

Seluruh fitur yang sudah berjalan (karya dan verifikasi guru, proyek tim, tracker, chat, penghargaan, peluang, profil, dashboard, dan lainnya, beserta 409 uji otomatis dan dokumentasinya) **tidak termasuk** dalam biaya di atas. Sebagai gambaran nilainya, harga khusus sekolah ±Rp 32 juta (acuan pasar ±Rp 80 juta).

## 3. Jadwal pengerjaan

Contoh MVP: **minggu 1** untuk pengerjaan fitur, **minggu 2** untuk testing dan QA.

| Paket | Pengerjaan | Testing dan QA | Total |
| --- | ---: | ---: | ---: |
| MVP | 1 minggu | 1 minggu | **2 minggu** |
| Prioritas sedang | 1 minggu | 1 minggu | 2 minggu |
| Prioritas kecil | 1 minggu | 0,5 minggu | 1,5 minggu |
| Ekosistem | 1 minggu | 1 minggu | 2 minggu |
| Fitur AI | 1,5 minggu | 0,5 minggu | 2 minggu |
| Migrasi hosting | 1 minggu | - | 1 minggu |

Isi minggu testing dan QA: menjalankan seluruh uji otomatis, uji manual per peran (siswa, guru, admin), uji keamanan dasar, uji di berbagai perangkat dan peramban, perbaikan temuan, pembaruan dokumentasi, dan uji penerimaan di sekolah.

**Syarat jadwal:**

- Tim bekerja penuh waktu selama periode itu.
- Data dan akses dari sekolah sudah tersedia sebelum mulai (daftar siswa dan guru, domain dan email pengirim, keputusan hosting).
- Untuk paket Fitur AI, kebijakan privasi sudah disetujui; untuk paket Ekosistem, keputusan kemitraan industri sudah jelas.

Jika data sekolah dalam bentuk API belum siap, pendaftaran dimulai dari impor daftar siswa dan guru (CSV) agar MVP tetap selesai dalam 2 minggu.

## 4. Isi tiap paket

**MVP**

- Pendaftaran guru dan siswa tervalidasi data sekolah
- Lupa kata sandi dan verifikasi email
- Keamanan: pembatasan percobaan login, CAPTCHA anti-bot, header keamanan, validasi unggahan, audit data publik
- Kebijakan privasi dan aturan komunitas
- Notifikasi tersimpan di server (status baca konsisten di semua perangkat)
- Moderasi konten dan log audit admin

**Prioritas sedang**

- Rubrik penilaian dan lencana keahlian
- Notifikasi realtime dan Web Push
- Ekspor portofolio/CV PDF
- Laporan kemajuan proyek mingguan dan email ringkasan
- Analitik sekolah (dasbor pimpinan)
- Impor/ekspor CSV massal dan kenaikan kelas

**Prioritas kecil**

- PWA, mode gelap, dan aksesibilitas
- Pencarian yang lebih baik
- Riwayat revisi karya
- Penyempurnaan tracker (template, lampiran, @mention, kalender, penilaian kontribusi)

**Ekosistem**

- Mentor industri/alumni dan profil alumni
- Pencocokan peluang dan pendaftaran peluang dengan berkas
- Penghargaan berbasis juri
- Integrasi GitHub/GitLab

**Fitur AI**

- Fondasi AI (kuota, penyaring data pribadi, log penggunaan)
- AI untuk guru: draf umpan balik, ringkasan, pemeriksaan kelengkapan
- AI untuk siswa: asisten penulisan, pemeriksaan sebelum mengajukan, rekomendasi
- AI untuk admin: moderasi otomatis dan pencarian semantik

**Migrasi hosting (opsional)**

- Server milik sekolah, penyimpanan berkas, database, backup, pemantauan, dan perpindahan

## 5. Biaya di luar harga pengembangan

Ditanggung sekolah atau dibayar terpisah. Perkiraan untuk sekolah ±1.200 siswa (lihat [SIMULASI.md](SIMULASI.md)); harga layanan perlu diperiksa terkini.

| Komponen | Perkiraan | Catatan |
| --- | --- | --- |
| Hosting, database, penyimpanan | Rp 0,3–1,5 juta per bulan | Dari server sendiri sampai layanan cloud terkelola |
| Domain | ±Rp 0,3 juta per tahun | |
| Email transaksional dan CAPTCHA | Rp 0–0,3 juta per bulan | Banyak yang punya paket gratis |
| Pemakaian model AI (bila fitur AI dijalankan) | Rp 0,3–2 juta per bulan | Ada kontrol kuota |
| Audit keamanan | Rp 15–40 juta per tahun | Opsional untuk tahap awal |
| Pelatihan guru dan siswa | Rp 3–10 juta | Honor narasumber dan materi |
| Pemeliharaan setelah serah terima | ±Rp 0,7 juta per bulan | Perbaikan, pembaruan, dan backup; opsional |

Harga di dokumen ini belum termasuk PPN.
