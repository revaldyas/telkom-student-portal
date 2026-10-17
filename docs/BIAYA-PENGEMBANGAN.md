# Rincian Biaya Pengembangan

Estimasi biaya untuk (A) seluruh yang sudah dibangun di Telkom Student Creation dan (B) seluruh rekomendasi pengembangan lanjutan. Dokumen ini melengkapi [PROPOSAL.md](PROPOSAL.md) bagian 10, [REKOMENDASI-FITUR.md](REKOMENDASI-FITUR.md), dan [SIMULASI.md](SIMULASI.md).

> **Ini estimasi perencanaan, bukan penawaran.** Usaha dihitung bottom-up per modul dari lingkup kode yang ada dan dari dokumen rekomendasi; tarif adalah asumsi pasar Indonesia yang perlu diverifikasi. Gunakan sebagai dasar diskusi anggaran, lalu minta penawaran resmi. Perhitungan dapat diulang dan diubah lewat [`scripts/estimate-cost.py`](../scripts/estimate-cost.py).

## 1. Ringkasan

| Pos | Usaha | Estimasi biaya (rentang tarif) |
| --- | --- | --- |
| **A. Nilai pengganti yang sudah dibangun** | 258 hari-orang murni (≈ 11,7 bulan-orang); 348 dengan overhead | **Rp 313 juta – Rp 766 juta** (acuan tarif gabungan: Rp 522 juta) |
| **B1. Paket minimum layak** (Fase 2: identitas sekolah, keamanan, lupa kata sandi, notifikasi server, moderasi) | 65 → 118 hari-orang | Rp 106 juta – Rp 259 juta |
| **B2. Paket direkomendasikan** (Fase 2 + 3) | 175 → 317 hari-orang | Rp 285 juta – Rp 698 juta |
| **B3. Paket penuh** (semua rekomendasi + migrasi hosting) | 332 → 602 hari-orang | Rp 542 juta – Rp 1,32 miliar |
| Biaya berjalan per tahun (hosting, pemeliharaan, audit keamanan, pelatihan) | ±72 hari pemeliharaan + layanan | lihat bagian 6 |

Catatan penting: bagian A adalah **nilai pengganti** (berapa biaya membangun ulang dengan cara konvensional), bukan uang yang telah dikeluarkan. Aplikasi ini dikembangkan dengan bantuan AI, sehingga waktu dan biaya yang benar-benar dikeluarkan dapat jauh lebih rendah daripada estimasi konvensional ini. Nilai pengganti berguna untuk menggambarkan nilai aset yang dimiliki sekolah dan untuk membandingkan bila pengembangan lanjutan dikerjakan pihak lain.

## 2. Metode dan asumsi

| Asumsi | Nilai |
| --- | --- |
| Satuan | hari-orang (8 jam kerja), pengembang tingkat menengah; 1 bulan-orang = 22 hari |
| Tarif per hari-orang | Internal/freelancer: **Rp 900 rb**; gabungan (freelancer + tim kecil): **Rp 1,5 juta**; software house: **Rp 2,2 juta** |
| Pengali overhead, bagian A | ×1,35 = desain UI/UX 15% + manajemen proyek 10% + QA/UAT 10% |
| Pengali overhead, bagian B | ×1,45 (lebih tinggi karena integrasi eksternal dan ketidakpastian) |
| Test dan dokumentasi fitur baru | +25% di atas usaha pengembangan (pada bagian A pengujian dan dokumentasi dihitung sebagai modul tersendiri) |
| Ketidakpastian | ±30% pada usaha; lebih besar pada integrasi API sekolah dan fitur AI |
| Belum termasuk | PPN, lisensi berbayar, biaya layanan pihak ketiga selain yang tercantum di bagian 6, gaji staf internal yang menjalankan platform, dan konten/moderasi harian |

Ukuran basis kode sebagai gambaran lingkup: ±96 berkas halaman/CSS situs, 43 berkas route API, 22 collection, 24 migrasi database, ±3.100 baris komponen, ±2.900 baris test, dan ±2.000 baris dokumentasi (baris kode padat; angka ini hanya konteks, bukan dasar perhitungan).

## 3. Bagian A – Yang sudah dibangun

| # | Modul | Hari-orang | Keterangan |
| --- | --- | ---: | --- |
| 1 | Fondasi: Next.js + Payload, autentikasi website dan CMS, access control, migrasi, konfigurasi deploy, skrip seed | 15 | users/admins, sesi, 22 collection, 24 migrasi |
| 2 | Data akademik dan admin CMS: program, kelas, data siswa, upload dengan kompresi WebP, navigasi admin | 10 | editor gambar, grup menu admin |
| 3 | Karya: collection, validasi/slug, alur draf-ajukan-verifikasi, wizard portal, katalog, detail, antrean verifikasi guru | 28 | inti produk |
| 4 | Proyek kolaborasi: anggota, undangan mentor, alur tinjauan, wizard, halaman detail, listing | 25 | mentor utama/pendamping |
| 5 | Sosial: suka dan komentar karya dan proyek (termasuk edit/hapus), statistik, notifikasi turunan | 12 |  |
| 6 | Penghargaan, voting, leaderboard, Most Valuable Student, pencapaian otomatis | 15 | halaman awards + leaderboard |
| 7 | Peluang dan minat siswa: collection, editor, pengelolaan guru, tindak lanjut | 12 |  |
| 8 | Beranda dan situs publik: hero slider, seksi beranda, navbar, pencarian global, kontrol listing, skeleton loading | 22 | banyak iterasi desain |
| 9 | Profil publik: cover, tampilan, karya semat, kartu bagikan QR, profil guru | 14 |  |
| 10 | Halaman login/register layar penuh | 5 |  |
| 11 | Shell portal: sidebar bertingkat, dashboard siswa/guru, panel notifikasi, polling gabungan | 14 |  |
| 12 | Chat: DM, grup, ruang kelas/proyek, foto, blokir/laporan, presence, suara | 28 | 16 endpoint |
| 13 | Tracker proyek: kanban, drawer tugas, beranda, riwayat, badge | 24 | 7 endpoint |
| 14 | Audit dan optimasi performa database (SQL agregat, cache, paralelisasi, pooler) | 6 |  |
| 15 | Pengujian otomatis: harness transaksi + 409 test | 18 | 13 file test |
| 16 | Dokumentasi: fitur, API, arsitektur, pengujian, rekomendasi, proposal, simulasi | 10 |  |
| | **Total usaha pengembangan** | **258** | ≈ 11,7 bulan-orang |

Dengan pengali overhead ×1,35 (desain UI/UX, manajemen proyek, QA/UAT): **348 hari-orang**.

| Skenario tarif | Tarif / hari | Pengembangan murni | Dengan overhead |
| --- | ---: | ---: | ---: |
| Internal / freelancer | Rp 900 rb | Rp 232 juta | **Rp 313 juta** |
| Gabungan (freelancer + tim kecil) | Rp 1.500 rb | Rp 387 juta | **Rp 522 juta** |
| Software house | Rp 2.200 rb | Rp 568 juta | **Rp 766 juta** |

## 4. Bagian B – Rekomendasi pengembangan

Lingkup dan alasan tiap butir ada di [REKOMENDASI-FITUR.md](REKOMENDASI-FITUR.md), [REKOMENDASI-IDENTITAS.md](REKOMENDASI-IDENTITAS.md), [REKOMENDASI-REALTIME.md](REKOMENDASI-REALTIME.md), [REKOMENDASI-KEAMANAN.md](REKOMENDASI-KEAMANAN.md), dan [REKOMENDASI-MIGRASI.md](REKOMENDASI-MIGRASI.md).

**Fase 2 – Peluncuran**

| Modul | Hari-orang (murni) | Dengan test dan dokumentasi (×1,25) |
| --- | ---: | ---: |
| Registrasi tervalidasi data sekolah (identity provider, tabel staff, sinkron terjadwal, status akun) | 25 | 31 |
| Lupa/ubah kata sandi + verifikasi email (termasuk layanan email) | 6 | 8 |
| Paket keamanan P1: rate limit, CAPTCHA, header keamanan, kuota/validasi unggahan, audit data publik | 10 | 12 |
| Kebijakan privasi, aturan komunitas, persetujuan | 3 | 4 |
| Tabel notifikasi + status baca di server (menggantikan localStorage) | 10 | 12 |
| Moderasi konten (laporan komentar/karya, antrean admin) | 8 | 10 |
| Log audit admin | 3 | 4 |
| **Subtotal** | **65** | **81** |

**Fase 3 – Penguatan**

| Modul | Hari-orang (murni) | Dengan test dan dokumentasi (×1,25) |
| --- | ---: | ---: |
| Rubrik penilaian dan lencana keahlian | 16 | 20 |
| Notifikasi realtime (SSE/WebSocket) + Web Push | 18 | 22 |
| Ekspor portofolio/CV PDF | 8 | 10 |
| Laporan kemajuan proyek mingguan + email ringkasan | 8 | 10 |
| Analitik sekolah (dasbor pimpinan) | 10 | 12 |
| Impor/ekspor CSV massal dan kenaikan kelas | 5 | 6 |
| PWA, mode gelap, audit aksesibilitas (WCAG AA) | 14 | 18 |
| Pencarian teks penuh yang lebih baik | 5 | 6 |
| Riwayat revisi karya | 8 | 10 |
| Penyempurnaan tracker: template, lampiran, @mention, kalender, peer review kontribusi | 18 | 22 |
| **Subtotal** | **110** | **138** |

**Fase 4 – Ekosistem**

| Modul | Hari-orang (murni) | Dengan test dan dokumentasi (×1,25) |
| --- | ---: | ---: |
| Mentor industri/alumni (peran baru, alur akses) + profil alumni | 26 | 32 |
| Pencocokan peluang + pendaftaran peluang dengan berkas | 12 | 15 |
| Penghargaan berbasis juri | 8 | 10 |
| Integrasi GitHub/GitLab | 15 | 19 |
| Fondasi AI: modul penyedia, kuota, filter data pribadi, log penggunaan | 8 | 10 |
| AI untuk guru: draf umpan balik, ringkasan, pemeriksaan kelengkapan, ringkasan proyek | 18 | 22 |
| AI untuk siswa: asisten penulisan, pemeriksaan sebelum ajukan, saran kategori, teks alt, rekomendasi, CV, rencana tugas | 37 | 46 |
| AI untuk admin: moderasi otomatis + pencarian semantik (pgvector) | 18 | 22 |
| **Subtotal** | **142** | **178** |

**Infrastruktur (opsional)**

| Modul | Hari-orang (murni) | Dengan test dan dokumentasi (×1,25) |
| --- | ---: | ---: |
| Migrasi ke hosting sendiri: Docker, storage S3, database, backup, pemantauan, cutover | 15 | 19 |
| **Subtotal** | **15** | **19** |

**Seluruh rekomendasi:** 332 hari-orang murni → 415 dengan test dan dokumentasi → **602 hari-orang** dengan overhead ×1,45 (≈ 27,4 bulan-orang).

| Skenario tarif | Tarif / hari | Per fase (dengan overhead) | Total seluruh rekomendasi |
| --- | ---: | --- | ---: |
| Internal / freelancer | Rp 900 rb | Fase 2: Rp 106 juta; Fase 3: Rp 179 juta; Fase 4: Rp 232 juta; Infrastruktur (opsional): Rp 24 juta | **Rp 542 juta** |
| Gabungan (freelancer + tim kecil) | Rp 1.500 rb | Fase 2: Rp 177 juta; Fase 3: Rp 299 juta; Fase 4: Rp 386 juta; Infrastruktur (opsional): Rp 41 juta | **Rp 903 juta** |
| Software house | Rp 2.200 rb | Fase 2: Rp 259 juta; Fase 3: Rp 439 juta; Fase 4: Rp 566 juta; Infrastruktur (opsional): Rp 60 juta | **Rp 1.32 miliar** |

Beberapa butir bergantung pada hal di luar kendali tim:

- **Registrasi via data sekolah (25 hari):** rentang 15-35 hari bergantung pada kualitas dan akses API sekolah; bila hanya ekspor CSV, lebih murah.
- **Notifikasi realtime (18 hari):** mengasumsikan hosting yang mendukung koneksi persisten; bila tetap di serverless, diganti layanan terkelola (biaya bulanan tambahan).
- **Fitur AI (73 hari di luar fondasi):** belum termasuk biaya pemakaian model (bagian 6) dan keputusan kebijakan privasi.

## 5. Paket implementasi yang disarankan

| Paket | Hari-orang (murni) | Hari-orang (total) | Internal / freelancer | Gabungan (freelancer + tim kecil) | Software house |
| --- | ---: | ---: | ---: | ---: | ---: |
| Minimum layak (Fase 2) | 65 | 118 | Rp 106 juta | Rp 177 juta | Rp 259 juta |
| Direkomendasikan (Fase 2 + 3) | 175 | 317 | Rp 285 juta | Rp 476 juta | Rp 698 juta |
| Penuh (Fase 2 + 3 + 4 + migrasi hosting) | 332 | 602 | Rp 542 juta | Rp 903 juta | Rp 1,32 miliar |

| Paket | Isi | Kapan masuk akal |
| --- | --- | --- |
| **Minimum layak** | Registrasi tervalidasi data sekolah, lupa kata sandi + verifikasi email, keamanan P1, kebijakan privasi, notifikasi server, moderasi, log audit | Syarat sebelum diluncurkan ke seluruh siswa |
| **Direkomendasikan** | Minimum + rubrik, realtime, ekspor PDF, laporan proyek, analitik, PWA, tracker lanjutan | Tahun pertama setelah peluncuran |
| **Penuh** | Semua, termasuk mentor industri, AI, integrasi GitHub, dan migrasi ke hosting sendiri | Bila platform menjadi program unggulan sekolah |

Urutan pengerjaan dan ketergantungan antarfase mengikuti peta jalan di [PROPOSAL.md](PROPOSAL.md) bagian 9. Pengerjaan sebaiknya bertahap per fase agar keluaran fase sebelumnya dapat dievaluasi.

## 6. Biaya di luar pengembangan

### 6.1 Biaya berjalan per tahun (acuan 1.200 siswa; lihat [SIMULASI.md](SIMULASI.md))

| Komponen | Per tahun | Dasar |
| --- | --- | --- |
| Hosting, database, storage | Rp 4-18 juta | Opsi VPS (Rp 0,3-0,9 juta/bulan) sampai cloud terkelola (Rp 0,7-1,5 juta/bulan) |
| Domain | ±Rp 0,3 juta | |
| Pemeliharaan teknis (perbaikan, pembaruan dependensi, backup, dukungan) | **72 hari-orang** (6 hari per bulan) → Rp 65 / 108 / 158 juta pada tiga skenario tarif | Perkiraan; mencakup pemeliharaan 0,3 orang |
| Audit keamanan / uji penetrasi ringan | Rp 15-40 juta | Satu kali per tahun; harga bergantung penyedia |
| Pelatihan dan materi | Rp 3-10 juta | Honor narasumber dan materi; waktu guru tidak dihitung |
| Pemakaian model AI (bila Fase 4 dijalankan) | Rp 4-24 juta (Rp 0,3-2 juta/bulan) | Lihat 6.2 |

### 6.2 Biaya pemakaian AI (perkiraan)

Rumus: permintaan per bulan × token per permintaan × harga per juta token. Dengan asumsi ±820 siswa aktif × 8 permintaan/bulan, ±2.000 token masuk dan ±600 token keluar per permintaan, serta harga model kelas menengah ±US$ 3 per juta token masuk dan ±US$ 15 per juta token keluar (**periksa harga terkini penyedia**): sekitar 13 juta token masuk dan 4 juta token keluar per bulan ≈ US$ 100 ≈ Rp 1,6 juta per bulan untuk fitur siswa. Fitur guru dan moderasi menambah sedikit. Model yang lebih kecil, cache hasil, dan kuota per pengguna dapat menurunkannya beberapa kali lipat; model lokal di server sendiri mengganti biaya token dengan biaya perangkat keras (GPU).

### 6.3 Total tahun pertama (pengembangan + biaya berjalan)

| Paket | Skenario tarif | Biaya pengembangan | Biaya berjalan tahun pertama | Total tahun pertama |
| --- | --- | ---: | ---: | ---: |
| Minimum layak (Fase 2) | Internal / freelancer | Rp 106 juta | Rp 87 juta-133 juta | **Rp 193 juta-239 juta** |
| Minimum layak (Fase 2) | Gabungan (freelancer + tim kecil) | Rp 177 juta | Rp 130 juta-176 juta | **Rp 307 juta-353 juta** |
| Minimum layak (Fase 2) | Software house | Rp 259 juta | Rp 181 juta-227 juta | **Rp 440 juta-486 juta** |
| Direkomendasikan (Fase 2 + 3) | Internal / freelancer | Rp 285 juta | Rp 87 juta-133 juta | **Rp 373 juta-419 juta** |
| Direkomendasikan (Fase 2 + 3) | Gabungan (freelancer + tim kecil) | Rp 476 juta | Rp 130 juta-176 juta | **Rp 606 juta-652 juta** |
| Direkomendasikan (Fase 2 + 3) | Software house | Rp 698 juta | Rp 181 juta-227 juta | **Rp 879 juta-925 juta** |
| Penuh (Fase 2 + 3 + 4 + migrasi hosting) | Internal / freelancer | Rp 542 juta | Rp 91 juta-157 juta | **Rp 633 juta-699 juta** |
| Penuh (Fase 2 + 3 + 4 + migrasi hosting) | Gabungan (freelancer + tim kecil) | Rp 903 juta | Rp 134 juta-200 juta | **Rp 1,04 miliar-1,10 miliar** |
| Penuh (Fase 2 + 3 + 4 + migrasi hosting) | Software house | Rp 1,32 miliar | Rp 185 juta-251 juta | **Rp 1,51 miliar-1,57 miliar** |

## 7. Kontrol biaya

- **Bertahap per fase** dan evaluasi di tiap akhir fase; hentikan fitur yang tidak dipakai.
- **Prioritaskan Fase 2** (syarat peluncuran). Fase 3-4 dapat ditunda tanpa menghambat nilai inti.
- **Gunakan fondasi yang ada.** Aplikasi sudah teruji (409 test) dan terdokumentasi sehingga biaya onboarding pengembang baru rendah.
- **Pilih hosting yang sesuai kemampuan pengelola.** VPS lebih murah tetapi menambah tanggung jawab operasi.
- **Batasi video dan retensi chat** sejak awal untuk menahan biaya storage dan database ([SIMULASI.md](SIMULASI.md)).
- **Kuota dan cache untuk AI** sebelum dibuka ke seluruh siswa.
- **Libatkan guru RPL dan siswa** pada modul kecil (dokumentasi, pengujian, konten) sebagai bagian pembelajaran, mengurangi biaya sekaligus meningkatkan rasa memiliki.

## 8. Risiko estimasi

| Risiko | Dampak pada biaya | Penanganan |
| --- | --- | --- |
| API sekolah tidak tersedia atau sulit diakses | Registrasi otomatis lebih mahal atau jatuh ke CSV | Konfirmasi lebih awal; mulai dari impor CSV |
| Persyaratan privasi/regulasi bertambah | Tambah pekerjaan persetujuan, retensi, dan penghapusan data | Libatkan pihak hukum/yayasan di awal |
| Lingkup bertambah selama proyek | Kenaikan biaya linear | Prioritas per fase dan kontrol perubahan |
| Penyedia AI mengubah harga/kebijakan | Biaya berjalan naik | Modul penyedia yang dapat diganti, kuota |
| Ketergantungan pada satu pengembang | Risiko keberlanjutan | Dokumentasi, test, dan minimal dua pemelihara |
| Adopsi rendah | Nilai dari investasi rendah | Kebijakan sekolah, pelatihan, pemantauan indikator ([PROPOSAL.md](PROPOSAL.md) 8.6) |

## 9. Memperbarui estimasi

1. Ubah `RATES`, `OVERHEAD_*`, `BUILT`, dan `FUTURE` di `scripts/estimate-cost.py` sesuai kondisi nyata.
2. Jalankan `python3 scripts/estimate-cost.py` (rincian) dan `python3 scripts/estimate-cost.py --packages` (paket).
3. Perbarui tabel di dokumen ini dan ringkasannya di [PROPOSAL.md](PROPOSAL.md) bagian 10.
