# Rincian Biaya Pengembangan (Harga Sekolah)

Biaya pengembangan Telkom Student Creation dalam bentuk paket bertingkat, **dirancang untuk proyek sekolah yang dikerjakan tim 2 orang** dan disusun agar realistis untuk anggaran sekolah. Nilai pasar ditampilkan hanya sebagai pembanding untuk menunjukkan nilai yang diterima sekolah.

> **Ini estimasi, bukan penawaran mengikat.** Rincian usaha dihitung bottom-up per modul dan dapat dihitung ulang lewat [`scripts/estimate-cost.py`](../scripts/estimate-cost.py). Dokumen terkait: [PROPOSAL.md](PROPOSAL.md), [REKOMENDASI-FITUR.md](REKOMENDASI-FITUR.md), [SIMULASI.md](SIMULASI.md).

## 1. Ringkasan

Anggaran jangkar: **MVP (prioritas tinggi) = Rp 10 juta** untuk biaya coding, UI/UX, pengujian, dan dokumentasi oleh dua orang pengembang. Paket lain memakai tarif harian yang sama (±Rp 123 ribu per hari-orang, diturunkan dari angka itu).

| Paket | Isi singkat | Harga sekolah | Kumulatif | Nilai pasar (acuan)* |
| --- | --- | ---: | ---: | ---: |
| **Prioritas tinggi – MVP (Fase 2)** | Keamanan, registrasi via data sekolah, lupa kata sandi, notifikasi di server, moderasi, privasi, audit | **Rp 10 juta** | Rp 10 juta | Rp 177 juta |
| **Prioritas sedang – pasca-MVP** | Rubrik + lencana, realtime, ekspor PDF, laporan proyek, analitik, impor CSV | **Rp 10 juta** | Rp 20 juta | Rp 177 juta |
| **Prioritas kecil – penyempurnaan** | PWA + mode gelap + aksesibilitas, pencarian, riwayat revisi, tracker lanjutan | **Rp 7 juta** | Rp 27 juta | Rp 122 juta |
| **Ekosistem (non-AI)** | Mentor industri/alumni, pencocokan peluang, juri, integrasi GitHub | **Rp 9,5 juta** | Rp 36,5 juta | Rp 166 juta |
| **Fitur AI** | AI untuk guru, siswa, admin (belum termasuk biaya API) | **Rp 12,5 juta** | Rp 49 juta | Rp 220 juta |
| **Infrastruktur (opsional)** | Pindah ke hosting sendiri (jika dipilih) | **Rp 2,5 juta** | Rp 51,5 juta | Rp 41 juta |
| *Sudah dibangun (tersedia sekarang)* | 16 modul, 409 test | *Rp 32 juta* | - | Rp 522 juta |

\* Nilai pasar acuan = tarif gabungan freelancer + tim kecil (Rp 1,5 juta per hari-orang) dengan overhead desain, manajemen proyek, dan QA. Perhitungan lengkap di bagian 6.

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

**Pesan utama untuk pengambil keputusan:** MVP diajukan dengan harga Rp 10 juta, sedangkan nilai pasarnya sekitar Rp 177 juta; fitur yang sudah tersedia bernilai ±Rp 522 juta bila dibangun konvensional.

## 2. Dasar penetapan harga

| Hal | Keterangan |
| --- | --- |
| Tim | 2 orang (pengembang utama dan rekan); desain UI/UX, pengembangan, pengujian, dan dokumentasi oleh tim yang sama |
| Jangkar | Rp 10 juta untuk MVP = 81 hari-orang (termasuk test dan dokumentasi) → ±Rp 123 ribu per hari-orang |
| Cakupan harga | Coding, UI/UX, pengujian otomatis, dokumentasi, dan dukungan peluncuran |
| **Tidak termasuk** | API model AI, langganan server/database/storage, domain, layanan email dan CAPTCHA, audit keamanan pihak ketiga, pelatihan pengguna, dan PPN (lihat bagian 5) |
| Bukan harga pasar | Sengaja jauh di bawah tarif pasar karena ini proyek sekolah; selisihnya adalah kontribusi tim |
| Ketidakpastian | ±30%. Terbesar pada registrasi via API sekolah dan fitur AI |

## 3. Paket dan waktu pengerjaan

| Paket | Hari-orang | Per orang (tim 2) | Waktu bila penuh waktu | Waktu bila paruh waktu (50%) |
| --- | ---: | ---: | ---: | ---: |
| Prioritas tinggi – MVP (Fase 2) | 81 | 41 hari | ±1,8 bulan | ±3,7 bulan |
| Prioritas sedang – pasca-MVP | 81 | 41 hari | ±1,8 bulan | ±3,7 bulan |
| Prioritas kecil – penyempurnaan | 56 | 28 hari | ±1,3 bulan | ±2,6 bulan |
| Ekosistem (non-AI) | 76 | 38 hari | ±1,7 bulan | ±3,5 bulan |
| Fitur AI | 101 | 51 hari | ±2,3 bulan | ±4,6 bulan |
| Infrastruktur (opsional) | 19 | 9 hari | ±0,4 bulan | ±0,9 bulan |

Waktu dihitung dari hari-orang dibagi dua (tim 2 orang) dengan 22 hari kerja per bulan; paruh waktu = separuh jam kerja. Paket dikerjakan berurutan, dan tiap paket dapat dihentikan tanpa merusak paket sebelumnya.

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
| Nilai pasar: internal/freelancer | Rp 313 juta |
| Nilai pasar: gabungan | Rp 522 juta |
| Nilai pasar: software house | Rp 766 juta |

Bagian ini **sudah dikerjakan**. Pilihan untuk sekolah: (a) dicatat sebagai kontribusi tim tanpa tagihan, (b) diajukan penggantian sebagian, atau (c) diajukan penuh Rp 32 juta. Apa pun pilihannya, mencantumkan nilai pasar membantu sekolah memahami aset yang diterimanya. Rincian modul yang sudah dibangun:

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
| Prioritas tinggi – MVP (Fase 2) | 81 | Rp 10 juta | Rp 177 juta | 94% |
| Prioritas sedang – pasca-MVP | 81 | Rp 10 juta | Rp 177 juta | 94% |
| Prioritas kecil – penyempurnaan | 56 | Rp 7 juta | Rp 122 juta | 94% |
| Ekosistem (non-AI) | 76 | Rp 9,5 juta | Rp 166 juta | 94% |
| Fitur AI | 101 | Rp 12,5 juta | Rp 220 juta | 94% |
| Infrastruktur (opsional) | 19 | Rp 2,5 juta | Rp 41 juta | 94% |
| Sudah dibangun | 258 | Rp 32 juta | Rp 522 juta | 94% |

Nilai pasar memakai tarif Rp 1,5 juta per hari-orang dan pengali overhead ×1,45 (paket baru) atau ×1,35 (yang sudah dibangun). Skenario tarif lain (internal Rp 0,9 juta; software house Rp 2,2 juta) tersedia dengan menjalankan `python3 scripts/estimate-cost.py --packages`.

## 7. Catatan untuk tim

- **Tarif efektif rendah.** Rp 10 juta untuk MVP berarti ±Rp 5 juta per orang untuk ±41 hari kerja (±Rp 123 ribu per hari). Itu keputusan wajar bila dipahami sebagai kontribusi untuk sekolah; pastikan kalian nyaman dan alokasi waktunya realistis.
- **Opsi mengurangi lingkup MVP** bila ingin lebih longgar: melakukan registrasi lewat impor CSV dulu (bukan API sekolah) mengurangi usaha registrasi dari 25 menjadi ±12 hari-orang. MVP menjadi ±52 hari murni → ±65 hari total → ±Rp 8 juta pada tarif yang sama, atau tetap Rp 10 juta dengan margin waktu lebih besar. API sekolah masuk sebagai tambahan bila aksesnya sudah jelas.
- **Hindari menurunkan keamanan demi harga.** Rate limit, CAPTCHA, lupa kata sandi, dan privasi adalah syarat peluncuran ke siswa di bawah umur; sebaiknya tetap di MVP.
- **Pembayaran bertahap** mengurangi risiko kedua pihak. Contoh untuk MVP: 30% saat mulai, 40% saat keamanan + registrasi selesai dan lolos test, 30% setelah uji penerimaan di sekolah.
- **Tulis lingkup tiap paket di surat penugasan** supaya perubahan permintaan tidak menambah pekerjaan tanpa penyesuaian.
- **Dokumentasi dan test sudah menjadi bagian harga**, sehingga pemeliharaan lanjutan dapat dilakukan orang lain bila diperlukan.

## 8. Memperbarui perhitungan

1. Ubah `RATES`, `OVERHEAD_*`, `MVP_BUDGET_JUTA`, `BUILT`, dan `FUTURE` di `scripts/estimate-cost.py`.
2. Jalankan `python3 scripts/estimate-cost.py --school` (harga sekolah), `--packages` (nilai pasar kumulatif), atau tanpa argumen (seluruh rincian).
3. Perbarui tabel di dokumen ini dan ringkasannya di [PROPOSAL.md](PROPOSAL.md) bagian 10.5.
