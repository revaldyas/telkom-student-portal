# Rincian Biaya Pengembangan (Harga Sekolah)

Biaya pengembangan Telkom Student Creation dalam bentuk paket bertingkat, **dirancang untuk proyek sekolah yang dikerjakan tim 2 orang** dan disusun agar realistis untuk anggaran sekolah. Nilai pasar ditampilkan hanya sebagai pembanding untuk menunjukkan nilai yang diterima sekolah.

> **Ini estimasi, bukan penawaran mengikat.** Rincian usaha dihitung bottom-up per modul dan dapat dihitung ulang lewat [`scripts/estimate-cost.py`](../scripts/estimate-cost.py) (dokumen ini dibuat oleh [`scripts/build-cost-doc.py`](../scripts/build-cost-doc.py)). Dokumen terkait: [PROPOSAL.md](PROPOSAL.md), [REKOMENDASI-FITUR.md](REKOMENDASI-FITUR.md), [SIMULASI.md](SIMULASI.md).

## 1. Ringkasan

Anggaran jangkar: **MVP (prioritas tinggi) = Rp 10 juta** untuk biaya coding, UI/UX, pengujian, dan dokumentasi oleh dua orang pengembang. Paket lain memakai tarif harian yang sama (±Rp 123 ribu per hari-orang, diturunkan dari angka itu).

| Paket | Isi singkat | Harga sekolah | Kumulatif | Nilai pasar (acuan)* |
| --- | --- | ---: | ---: | ---: |
| **Prioritas tinggi – MVP (Fase 2)** | Keamanan, registrasi via data sekolah, lupa kata sandi, notifikasi di server, moderasi, privasi, audit | **Rp 10 juta** | Rp 10 juta | Rp 88 juta |
| **Prioritas sedang – pasca-MVP** | Rubrik + lencana, realtime, ekspor PDF, laporan proyek, analitik, impor CSV | **Rp 10 juta** | Rp 20 juta | Rp 88 juta |
| **Prioritas kecil – penyempurnaan** | PWA + mode gelap + aksesibilitas, pencarian, riwayat revisi, tracker lanjutan | **Rp 7 juta** | Rp 27 juta | Rp 61 juta |
| **Ekosistem (non-AI)** | Mentor industri/alumni, pencocokan peluang, juri, integrasi GitHub | **Rp 9,5 juta** | Rp 36,5 juta | Rp 83 juta |
| **Fitur AI** | AI untuk guru, siswa, admin (belum termasuk biaya API) | **Rp 12,5 juta** | Rp 49 juta | Rp 110 juta |
| **Infrastruktur (opsional)** | Pindah ke hosting sendiri (jika dipilih) | **Rp 2,5 juta** | Rp 51,5 juta | Rp 20 juta |
| *Sudah dibangun (tersedia sekarang)* | 16 modul, 409 test | *Rp 32 juta* | - | Rp 261 juta |

\* Nilai pasar acuan = tarif gabungan freelancer + tim kecil (Rp 0,75 juta per hari-orang, sudah diturunkan 50% dari acuan lama karena harga jasa pengembangan di Indonesia melemah sejak maraknya AI) dengan overhead desain, manajemen proyek, dan QA. Perhitungan lengkap di bagian 6.

Gambaran total:

| Jalur | Biaya (harga sekolah) |
| --- | ---: |
| MVP saja | **Rp 10 juta** |
| MVP + prioritas sedang (fitur berdampak tinggi setelah peluncuran) | **Rp 20 juta** |
| + prioritas kecil (penyempurnaan) | Rp 27 juta |
| + ekosistem (non-AI) | Rp 36,5 juta |
| + fitur AI | Rp 49 juta |
| Seluruh rekomendasi + migrasi hosting | **Rp 51,5 juta** |
| Seluruh rekomendasi + nilai fitur yang sudah ada (Rp 32 juta) | Rp 83,5 juta |

**Pesan utama untuk pengambil keputusan:** MVP diajukan dengan harga Rp 10 juta, sedangkan nilai pasarnya sekitar Rp 88 juta; fitur yang sudah tersedia bernilai ±Rp 261 juta bila dibangun konvensional.

## 2. Dasar penetapan harga

| Hal | Keterangan |
| --- | --- |
| Tim | 2 orang (pengembang utama dan rekan); desain UI/UX, pengembangan, pengujian, dan dokumentasi oleh tim yang sama |
| Jangkar | Rp 10 juta untuk MVP = 81 hari-orang (termasuk test dan dokumentasi) → ±Rp 123 ribu per hari-orang |
| Cakupan harga | Coding, UI/UX, pengujian otomatis, dokumentasi, dan dukungan peluncuran |
| **Tidak termasuk** | API model AI, langganan server/database/storage, domain, layanan email dan CAPTCHA, audit keamanan pihak ketiga, pelatihan pengguna, dan PPN (lihat bagian 5) |
| Bukan harga pasar | Sengaja jauh di bawah tarif pasar karena ini proyek sekolah; selisihnya adalah kontribusi tim |
| Tarif pasar acuan | Internal/freelancer Rp 0,45 juta; gabungan Rp 0,75 juta; software house Rp 1,10 juta per hari-orang. Sudah diturunkan 50% dari tarif dasar (Rp 0,9 / 1,5 / 2,2 juta) karena pasar jasa pengembangan melemah sejak maraknya AI. Untuk potongan 60%, ubah `MARKET_DISCOUNT` di skrip |
| Ketidakpastian | ±30%. Terbesar pada registrasi via API sekolah dan fitur AI |

## 3. Paket dan jadwal pengerjaan

Setiap paket dikerjakan **paling lama 2 minggu**: pengerjaan, lalu testing dan Quality Assurance (QA) pada paket yang sama. Contoh MVP: 1 minggu pengerjaan + 1 minggu testing dan QA.

| Paket | Pengerjaan | Testing dan QA | **Total** | Usaha konvensional | Jadwal nyata (2 orang) | Percepatan yang diasumsikan |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Prioritas tinggi – MVP (Fase 2) | 1,0 minggu | 1,0 minggu | **2,0 minggu** | 81 hari-orang | 20 hari-orang | ±4,1× |
| Prioritas sedang – pasca-MVP | 1,0 minggu | 1,0 minggu | **2,0 minggu** | 81 hari-orang | 20 hari-orang | ±4,1× |
| Prioritas kecil – penyempurnaan | 1,0 minggu | 0,5 minggu | **1,5 minggu** | 56 hari-orang | 15 hari-orang | ±3,8× |
| Ekosistem (non-AI) | 1,0 minggu | 1,0 minggu | **2,0 minggu** | 76 hari-orang | 20 hari-orang | ±3,8× |
| Fitur AI | 1,5 minggu | 0,5 minggu | **2,0 minggu** | 101 hari-orang | 20 hari-orang | ±5,1× |
| Infrastruktur (opsional) | 1,0 minggu | 0,0 minggu | **1,0 minggu** | 19 hari-orang | 10 hari-orang | ±1,9× |

Total jika semua paket dikerjakan berurutan: **±10,5 minggu** (≈ 2,4 bulan), tanpa jeda antarpaket. Tiap paket dapat dihentikan tanpa merusak paket sebelumnya, dan paket berikutnya baru dimulai setelah QA paket sebelumnya selesai.

Apa yang dilakukan di minggu testing dan QA: menjalankan seluruh suite test otomatis (sekarang 409 test) plus test fitur baru, uji manual alur utama per peran (siswa, guru, admin), uji keamanan dasar (rate limit, akses lintas peran, input berbahaya), uji di perangkat dan peramban umum, perbaikan temuan, pembaruan dokumentasi, dan uji penerimaan di sekolah.

**Syarat agar jadwal ini realistis:**

- **Percepatan.** Usaha konvensional (81 hari-orang untuk MVP) tidak mungkin dikejar dalam 1 minggu oleh 2 orang tanpa bantuan; jadwal ini mengasumsikan pengembangan dibantu AI seperti yang dilakukan pada fitur yang sudah ada, dengan percepatan ±4× dari ukuran konvensional. Pada paket AI, percepatan yang diminta paling tinggi (±5×); bila terasa mepet, pecah menjadi dua paket 2 minggu (AI guru + fondasi, lalu AI siswa + admin) tanpa mengubah harga.
- **Tim bekerja penuh pada jadwal itu** (±8 jam per hari, 5 hari per minggu) dan tidak bertabrakan dengan kegiatan sekolah lain.
- **Ketergantungan sudah jelas sebelum minggu pertama:** akses API atau CSV data siswa/guru sekolah untuk MVP, layanan email dan CAPTCHA, keputusan hosting (untuk realtime), kebijakan privasi (untuk AI), dan keputusan bisnis (untuk mentor industri). Ketergantungan yang terlambat menggeser jadwal.
- **Risiko terbesar di MVP:** registrasi via API sekolah. Bila API belum siap, kerjakan lewat impor CSV terlebih dahulu agar tetap dalam 2 minggu.

Isi tiap paket:

**Prioritas tinggi – MVP (Fase 2)**

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

**Prioritas sedang – pasca-MVP**

| Modul | Hari-orang (murni) | Dengan test dan dokumentasi (×1,25) |
| --- | ---: | ---: |
| Rubrik penilaian dan lencana keahlian | 16 | 20 |
| Notifikasi realtime (SSE/WebSocket) + Web Push | 18 | 22 |
| Ekspor portofolio/CV PDF | 8 | 10 |
| Laporan kemajuan proyek mingguan + email ringkasan | 8 | 10 |
| Analitik sekolah (dasbor pimpinan) | 10 | 12 |
| Impor/ekspor CSV massal dan kenaikan kelas | 5 | 6 |
| **Subtotal** | **65** | **81** |

**Prioritas kecil – penyempurnaan**

| Modul | Hari-orang (murni) | Dengan test dan dokumentasi (×1,25) |
| --- | ---: | ---: |
| PWA, mode gelap, audit aksesibilitas (WCAG AA) | 14 | 18 |
| Pencarian teks penuh yang lebih baik | 5 | 6 |
| Riwayat revisi karya | 8 | 10 |
| Penyempurnaan tracker: template, lampiran, @mention, kalender, peer review kontribusi | 18 | 22 |
| **Subtotal** | **45** | **56** |

**Ekosistem (non-AI)**

| Modul | Hari-orang (murni) | Dengan test dan dokumentasi (×1,25) |
| --- | ---: | ---: |
| Mentor industri/alumni (peran baru, alur akses) + profil alumni | 26 | 32 |
| Pencocokan peluang + pendaftaran peluang dengan berkas | 12 | 15 |
| Penghargaan berbasis juri | 8 | 10 |
| Integrasi GitHub/GitLab | 15 | 19 |
| **Subtotal** | **61** | **76** |

**Fitur AI**

| Modul | Hari-orang (murni) | Dengan test dan dokumentasi (×1,25) |
| --- | ---: | ---: |
| Fondasi AI: modul penyedia, kuota, filter data pribadi, log penggunaan | 8 | 10 |
| AI untuk guru: draf umpan balik, ringkasan, pemeriksaan kelengkapan, ringkasan proyek | 18 | 22 |
| AI untuk siswa: asisten penulisan, pemeriksaan sebelum ajukan, saran kategori, teks alt, rekomendasi, CV, rencana tugas | 37 | 46 |
| AI untuk admin: moderasi otomatis + pencarian semantik (pgvector) | 18 | 22 |
| **Subtotal** | **81** | **101** |

**Infrastruktur (opsional)**

| Modul | Hari-orang (murni) | Dengan test dan dokumentasi (×1,25) |
| --- | ---: | ---: |
| Migrasi ke hosting sendiri: Docker, storage S3, database, backup, pemantauan, cutover | 15 | 19 |
| **Subtotal** | **15** | **19** |

## 4. Fitur yang sudah tersedia

Seluruh 16 modul yang sudah berjalan (karya, proyek, verifikasi guru, chat, tracker, penghargaan, peluang, profil, dashboard, dan lainnya, beserta 409 test dan dokumentasinya) bernilai ±258 hari-orang.

| Cara menilai | Biaya |
| --- | ---: |
| **Harga sekolah** (tarif yang sama dengan paket di atas) | **Rp 32 juta** |
| Nilai pasar: internal/freelancer | Rp 157 juta |
| Nilai pasar: gabungan | Rp 261 juta |
| Nilai pasar: software house | Rp 383 juta |

Bagian ini **sudah dikerjakan**. Pilihan untuk sekolah: (a) dicatat sebagai kontribusi tim tanpa tagihan, (b) diajukan penggantian sebagian, atau (c) diajukan penuh Rp 32 juta. Apa pun pilihannya, mencantumkan nilai pasar membantu sekolah memahami aset yang diterimanya. Rincian modul yang sudah dibangun:

| # | Modul | Hari-orang | Keterangan |
| --- | --- | ---: | --- |
| 1 | Fondasi: Next.js + Payload, autentikasi website dan CMS, access control, migrasi, konfigurasi deploy, skrip seed | 15 | users/admins, sesi, 29 collection, 24 migrasi |
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
| Internal / freelancer | Rp 450 rb | Rp 116 juta | **Rp 157 juta** |
| Gabungan (freelancer + tim kecil) | Rp 750 rb | Rp 194 juta | **Rp 261 juta** |
| Software house | Rp 1.100 rb | Rp 284 juta | **Rp 383 juta** |

## 5. Biaya di luar harga pengembangan (ditanggung sekolah / terpisah)

Perkiraan untuk sekolah ±1.200 siswa (lihat [SIMULASI.md](SIMULASI.md)); harga layanan perlu diperiksa terkini.

| Komponen | Perkiraan | Catatan |
| --- | --- | --- |
| Hosting, database, storage | Rp 0,3-1,5 juta per bulan | Opsi VPS sampai cloud terkelola |
| Domain | ±Rp 0,3 juta per tahun | |
| Layanan email transaksional dan CAPTCHA | Rp 0-0,3 juta per bulan | Banyak yang memiliki paket gratis |
| Pemakaian model AI (jika fitur AI dijalankan) | Rp 0,3-2 juta per bulan | Bergantung kuota dan model; ada kontrol kuota |
| Audit keamanan / uji penetrasi ringan | Rp 15-40 juta per tahun | Opsional; bisa dilakukan internal untuk tahap awal |
| Pelatihan guru dan siswa | Rp 3-10 juta | Honor narasumber dan materi |
| Pemeliharaan setelah serah terima (perbaikan, pembaruan, backup, dukungan) | ±6 hari-orang per bulan ≈ Rp 0,7 juta per bulan pada tarif yang sama | Usulan honor ringan; bisa digabung dengan kontrak pengembangan |

## 6. Perbandingan dengan nilai pasar

| Paket | Hari-orang (total) | Harga sekolah | Nilai pasar (gabungan) | Hemat bagi sekolah |
| --- | ---: | ---: | ---: | ---: |
| Prioritas tinggi – MVP (Fase 2) | 81 | Rp 10 juta | Rp 88 juta | 89% |
| Prioritas sedang – pasca-MVP | 81 | Rp 10 juta | Rp 88 juta | 89% |
| Prioritas kecil – penyempurnaan | 56 | Rp 7 juta | Rp 61 juta | 89% |
| Ekosistem (non-AI) | 76 | Rp 9,5 juta | Rp 83 juta | 89% |
| Fitur AI | 101 | Rp 12,5 juta | Rp 110 juta | 89% |
| Infrastruktur (opsional) | 19 | Rp 2,5 juta | Rp 20 juta | 88% |
| Sudah dibangun | 258 | Rp 32 juta | Rp 261 juta | 88% |

Nilai pasar memakai tarif gabungan Rp 0,75 juta per hari-orang (sudah turun 50% dari acuan lama) dan pengali overhead ×1,45 (paket baru) atau ×1,35 (yang sudah dibangun). Skenario tarif lain tersedia dengan menjalankan `python3 scripts/estimate-cost.py --packages`.

## 7. Memperbarui perhitungan

1. Ubah `BASE_RATES`, `MARKET_DISCOUNT`, `OVERHEAD_*`, `MVP_BUDGET_JUTA`, `BUILT`, dan `FUTURE` di `scripts/estimate-cost.py`.
2. Jalankan `python3 scripts/build-cost-doc.py` untuk membuat ulang dokumen ini; `python3 scripts/estimate-cost.py --school` (harga sekolah), `--packages` (nilai pasar kumulatif), atau tanpa argumen untuk seluruh rincian.
3. Perbarui ringkasan di [PROPOSAL.md](PROPOSAL.md) bagian 7.3 dan 8.
