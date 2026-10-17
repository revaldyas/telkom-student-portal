#!/usr/bin/env python3
"""Membuat docs/BIAYA-PENGEMBANGAN.md dari scripts/estimate-cost.py. Jalankan: python3 scripts/build-cost-doc.py"""
import importlib.util
import pathlib

root = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('est', root / 'scripts' / 'estimate-cost.py')
est = importlib.util.module_from_spec(spec)
spec.loader.exec_module(est)

body, built_days, total_future, uplifted, loaded_days = est.render()
rp, nf = est.rp, est.nf
rate, rows, built = est.school_pricing()
names = list(est.RATES)
R = est.RATES
G = R[names[1]]
disc = round(est.MARKET_DISCOUNT * 100)

def j(x):
    return (f"{x:.1f}" if x % 1 else f"{x:.0f}").replace('.', ',')

def rb(million):
    return f"Rp {million * 1000:,.0f} rb".replace(',', '.') if million < 1 else f"Rp {nf(million, 2)} juta"

cum_price = 0
cum_rows = []
for tier, raw, days, price, market, per_person in rows:
    cum_price += price
    cum_rows.append((tier, raw, days, price, cum_price, market, per_person))

built_days_, built_price, built_market = built
built_low = built_days * est.OVERHEAD_BUILT * R[names[0]]
built_high = built_days * est.OVERHEAD_BUILT * R[names[2]]
mvp_alt_raw = 65 - 25 + 12
alt_days = mvp_alt_raw * est.TEST_UPLIFT
alt_price = round(alt_days * rate * 2) / 2

isi = {
    est.T1: 'Keamanan, registrasi via data sekolah, lupa kata sandi, notifikasi di server, moderasi, privasi, audit',
    est.T2: 'Rubrik + lencana, realtime, ekspor PDF, laporan proyek, analitik, impor CSV',
    est.T3: 'PWA + mode gelap + aksesibilitas, pencarian, riwayat revisi, tracker lanjutan',
    est.T4: 'Mentor industri/alumni, pencocokan peluang, juri, integrasi GitHub',
    est.T5: 'AI untuk guru, siswa, admin (belum termasuk biaya API)',
    est.T6: 'Pindah ke hosting sendiri (jika dipilih)',
}
summary = "| Paket | Isi singkat | Harga sekolah | Kumulatif | Nilai pasar (acuan)* |\n| --- | --- | ---: | ---: | ---: |\n"
for tier, raw, days, price, cum, market, per in cum_rows:
    summary += f"| **{tier}** | {isi[tier]} | **Rp {j(price)} juta** | Rp {j(cum)} juta | {rp(market)} |\n"
summary += f"| *Sudah dibangun (tersedia sekarang)* | 16 modul, 409 test | *Rp {j(built_price)} juta* | - | {rp(built_market)} |\n"

dur = "| Paket | Hari-orang | Per orang (tim 2) | Waktu bila penuh waktu | Waktu bila paruh waktu (50%) |\n| --- | ---: | ---: | ---: | ---: |\n"
for tier, raw, days, price, cum, market, per in cum_rows:
    dur += f"| {tier} | {days:.0f} | {per:.0f} hari | ±{nf(per / est.HARI_PER_BULAN)} bulan | ±{nf(per * 2 / est.HARI_PER_BULAN)} bulan |\n"

mod = body.split('### Rincian rekomendasi (belum dibangun)')[1].split('**Seluruh rekomendasi:**')[0].strip()
built_table = body.split('### Rincian rekomendasi (belum dibangun)')[0].replace('### Rincian usaha yang sudah dibangun', '').strip()

compare = "| Paket | Hari-orang (total) | Harga sekolah | Nilai pasar (gabungan) | Hemat bagi sekolah |\n| --- | ---: | ---: | ---: | ---: |\n"
for tier, raw, days, price, cum, market, per in cum_rows:
    compare += f"| {tier} | {days:.0f} | Rp {j(price)} juta | {rp(market)} | {100 * (1 - price / market):.0f}% |\n"
compare += f"| Sudah dibangun | {built_days} | Rp {j(built_price)} juta | {rp(built_market)} | {100 * (1 - built_price / built_market):.0f}% |\n"

doc = f"""# Rincian Biaya Pengembangan (Harga Sekolah)

Biaya pengembangan Telkom Student Creation dalam bentuk paket bertingkat, **dirancang untuk proyek sekolah yang dikerjakan tim 2 orang** dan disusun agar realistis untuk anggaran sekolah. Nilai pasar ditampilkan hanya sebagai pembanding untuk menunjukkan nilai yang diterima sekolah.

> **Ini estimasi, bukan penawaran mengikat.** Rincian usaha dihitung bottom-up per modul dan dapat dihitung ulang lewat [`scripts/estimate-cost.py`](../scripts/estimate-cost.py) (dokumen ini dibuat oleh [`scripts/build-cost-doc.py`](../scripts/build-cost-doc.py)). Dokumen terkait: [PROPOSAL.md](PROPOSAL.md), [REKOMENDASI-FITUR.md](REKOMENDASI-FITUR.md), [SIMULASI.md](SIMULASI.md).

## 1. Ringkasan

Anggaran jangkar: **MVP (prioritas tinggi) = Rp 10 juta** untuk biaya coding, UI/UX, pengujian, dan dokumentasi oleh dua orang pengembang. Paket lain memakai tarif harian yang sama (±Rp {rate * 1000:.0f} ribu per hari-orang, diturunkan dari angka itu).

{summary}
\\* Nilai pasar acuan = tarif gabungan freelancer + tim kecil (Rp {nf(G, 2)} juta per hari-orang, sudah diturunkan {disc}% dari acuan lama karena harga jasa pengembangan di Indonesia melemah sejak maraknya AI) dengan overhead desain, manajemen proyek, dan QA. Perhitungan lengkap di bagian 6.

Gambaran total:

| Jalur | Biaya (harga sekolah) |
| --- | ---: |
| MVP saja | **Rp {j(cum_rows[0][4])} juta** |
| MVP + prioritas sedang (fitur berdampak tinggi setelah peluncuran) | **Rp {j(cum_rows[1][4])} juta** |
| + prioritas kecil (penyempurnaan) | Rp {j(cum_rows[2][4])} juta |
| + ekosistem (non-AI) | Rp {j(cum_rows[3][4])} juta |
| + fitur AI | Rp {j(cum_rows[4][4])} juta |
| Seluruh rekomendasi + migrasi hosting | **Rp {j(cum_rows[5][4])} juta** |
| Seluruh rekomendasi + nilai fitur yang sudah ada (Rp {j(built_price)} juta) | Rp {j(cum_rows[5][4] + built_price)} juta |

**Pesan utama untuk pengambil keputusan:** MVP diajukan dengan harga Rp 10 juta, sedangkan nilai pasarnya sekitar {rp(cum_rows[0][5])}; fitur yang sudah tersedia bernilai ±{rp(built_market)} bila dibangun konvensional.

## 2. Dasar penetapan harga

| Hal | Keterangan |
| --- | --- |
| Tim | 2 orang (pengembang utama dan rekan); desain UI/UX, pengembangan, pengujian, dan dokumentasi oleh tim yang sama |
| Jangkar | Rp 10 juta untuk MVP = {cum_rows[0][2]:.0f} hari-orang (termasuk test dan dokumentasi) → ±Rp {rate * 1000:.0f} ribu per hari-orang |
| Cakupan harga | Coding, UI/UX, pengujian otomatis, dokumentasi, dan dukungan peluncuran |
| **Tidak termasuk** | API model AI, langganan server/database/storage, domain, layanan email dan CAPTCHA, audit keamanan pihak ketiga, pelatihan pengguna, dan PPN (lihat bagian 5) |
| Bukan harga pasar | Sengaja jauh di bawah tarif pasar karena ini proyek sekolah; selisihnya adalah kontribusi tim |
| Tarif pasar acuan | Internal/freelancer Rp {nf(R[names[0]], 2)} juta; gabungan Rp {nf(G, 2)} juta; software house Rp {nf(R[names[2]], 2)} juta per hari-orang. Sudah diturunkan {disc}% dari tarif dasar (Rp {nf(est.BASE_RATES[names[0]], 1)} / {nf(est.BASE_RATES[names[1]], 1)} / {nf(est.BASE_RATES[names[2]], 1)} juta) karena pasar jasa pengembangan melemah sejak maraknya AI. Untuk potongan 60%, ubah `MARKET_DISCOUNT` di skrip |
| Ketidakpastian | ±30%. Terbesar pada registrasi via API sekolah dan fitur AI |

## 3. Paket dan waktu pengerjaan

{dur}
Waktu dihitung dari hari-orang dibagi dua (tim 2 orang) dengan {est.HARI_PER_BULAN} hari kerja per bulan; paruh waktu = separuh jam kerja. Paket dikerjakan berurutan, dan tiap paket dapat dihentikan tanpa merusak paket sebelumnya.

Isi tiap paket:

{mod}

## 4. Fitur yang sudah tersedia

Seluruh 16 modul yang sudah berjalan (karya, proyek, verifikasi guru, chat, tracker, penghargaan, peluang, profil, dashboard, dan lainnya, beserta 409 test dan dokumentasinya) bernilai ±{built_days} hari-orang.

| Cara menilai | Biaya |
| --- | ---: |
| **Harga sekolah** (tarif yang sama dengan paket di atas) | **Rp {j(built_price)} juta** |
| Nilai pasar: internal/freelancer | {rp(built_low)} |
| Nilai pasar: gabungan | {rp(built_market)} |
| Nilai pasar: software house | {rp(built_high)} |

Bagian ini **sudah dikerjakan**. Pilihan untuk sekolah: (a) dicatat sebagai kontribusi tim tanpa tagihan, (b) diajukan penggantian sebagian, atau (c) diajukan penuh Rp {j(built_price)} juta. Apa pun pilihannya, mencantumkan nilai pasar membantu sekolah memahami aset yang diterimanya. Rincian modul yang sudah dibangun:

{built_table}

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
| Pemeliharaan setelah serah terima (perbaikan, pembaruan, backup, dukungan) | ±6 hari-orang per bulan ≈ Rp {j(6 * rate)} juta per bulan pada tarif yang sama | Usulan honor ringan; bisa digabung dengan kontrak pengembangan |

## 6. Perbandingan dengan nilai pasar

{compare}
Nilai pasar memakai tarif gabungan Rp {nf(G, 2)} juta per hari-orang (sudah turun {disc}% dari acuan lama) dan pengali overhead ×{nf(est.OVERHEAD_FUTURE, 2)} (paket baru) atau ×{nf(est.OVERHEAD_BUILT, 2)} (yang sudah dibangun). Skenario tarif lain tersedia dengan menjalankan `python3 scripts/estimate-cost.py --packages`.

## 7. Catatan untuk tim

- **Tarif efektif rendah.** Rp 10 juta untuk MVP berarti ±Rp 5 juta per orang untuk ±{cum_rows[0][6]:.0f} hari kerja (±Rp {rate * 1000:.0f} ribu per hari). Itu keputusan wajar bila dipahami sebagai kontribusi untuk sekolah; pastikan kalian nyaman dan alokasi waktunya realistis.
- **Opsi mengurangi lingkup MVP** bila ingin lebih longgar: melakukan registrasi lewat impor CSV dulu (bukan API sekolah) mengurangi usaha registrasi dari 25 menjadi ±12 hari-orang. MVP menjadi ±{mvp_alt_raw} hari murni → ±{alt_days:.0f} hari total → ±Rp {j(alt_price)} juta pada tarif yang sama, atau tetap Rp 10 juta dengan margin waktu lebih besar. API sekolah masuk sebagai tambahan bila aksesnya sudah jelas.
- **Hindari menurunkan keamanan demi harga.** Rate limit, CAPTCHA, lupa kata sandi, dan privasi adalah syarat peluncuran ke siswa di bawah umur; sebaiknya tetap di MVP.
- **Pembayaran bertahap** mengurangi risiko kedua pihak. Contoh untuk MVP: 30% saat mulai, 40% saat keamanan + registrasi selesai dan lolos test, 30% setelah uji penerimaan di sekolah.
- **Tulis lingkup tiap paket di surat penugasan** supaya perubahan permintaan tidak menambah pekerjaan tanpa penyesuaian.
- **Dokumentasi dan test sudah menjadi bagian harga**, sehingga pemeliharaan lanjutan dapat dilakukan orang lain bila diperlukan.

## 8. Memperbarui perhitungan

1. Ubah `BASE_RATES`, `MARKET_DISCOUNT`, `OVERHEAD_*`, `MVP_BUDGET_JUTA`, `BUILT`, dan `FUTURE` di `scripts/estimate-cost.py`.
2. Jalankan `python3 scripts/build-cost-doc.py` untuk membuat ulang dokumen ini; `python3 scripts/estimate-cost.py --school` (harga sekolah), `--packages` (nilai pasar kumulatif), atau tanpa argumen untuk seluruh rincian.
3. Perbarui ringkasan di [PROPOSAL.md](PROPOSAL.md) bagian 10.5.
"""
(root / 'docs' / 'BIAYA-PENGEMBANGAN.md').write_text(doc)
print('ok')
