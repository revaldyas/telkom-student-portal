#!/usr/bin/env python3
"""
Rincian estimasi biaya pengembangan Telkom Student Creation (yang sudah dibangun dan seluruh rekomendasi).

Estimasi bottom-up per modul dalam hari-orang (pengembang menengah), dikalikan tarif dan pengali overhead.
Semua angka adalah ASUMSI perencanaan; ubah tabel di bawah lalu jalankan ulang:
    python3 scripts/estimate-cost.py          # cetak tabel Markdown
"""

# Tarif pasar acuan per hari-orang (Rp juta), 8 jam kerja. Nilai dasar diturunkan karena harga pasar jasa pengembangan
# di Indonesia melemah sejak maraknya AI; MARKET_DISCOUNT adalah potongan atas tarif dasar (0,5 = turun 50%, 0,6 = turun 60%).
BASE_RATES = {'Internal / freelancer': 0.9, 'Gabungan (freelancer + tim kecil)': 1.5, 'Software house': 2.2}
MARKET_DISCOUNT = 0.5
RATES = {name: round(rate * (1 - MARKET_DISCOUNT), 3) for name, rate in BASE_RATES.items()}
HARI_PER_BULAN = 22

# Pengali di atas usaha pengembangan murni
OVERHEAD_BUILT = 1.35   # desain UI/UX, manajemen proyek, QA/UAT, perbaikan (15 + 10 + 10 %)
OVERHEAD_FUTURE = 1.45  # sama + risiko integrasi/ketidakpastian lebih tinggi
TEST_UPLIFT = 1.25      # fitur masa depan: ditambah 25% untuk test otomatis dan dokumentasi

# (modul, hari-orang, keterangan)
BUILT = [
    ('Fondasi: Next.js + Payload, autentikasi website dan CMS, access control, migrasi, konfigurasi deploy, skrip seed', 15, 'users/admins, sesi, 22 collection, 24 migrasi'),
    ('Data akademik dan admin CMS: program, kelas, data siswa, upload dengan kompresi WebP, navigasi admin', 10, 'editor gambar, grup menu admin'),
    ('Karya: collection, validasi/slug, alur draf-ajukan-verifikasi, wizard portal, katalog, detail, antrean verifikasi guru', 28, 'inti produk'),
    ('Proyek kolaborasi: anggota, undangan mentor, alur tinjauan, wizard, halaman detail, listing', 25, 'mentor utama/pendamping'),
    ('Sosial: suka dan komentar karya dan proyek (termasuk edit/hapus), statistik, notifikasi turunan', 12, ''),
    ('Penghargaan, voting, leaderboard, Most Valuable Student, pencapaian otomatis', 15, 'halaman awards + leaderboard'),
    ('Peluang dan minat siswa: collection, editor, pengelolaan guru, tindak lanjut', 12, ''),
    ('Beranda dan situs publik: hero slider, seksi beranda, navbar, pencarian global, kontrol listing, skeleton loading', 22, 'banyak iterasi desain'),
    ('Profil publik: cover, tampilan, karya semat, kartu bagikan QR, profil guru', 14, ''),
    ('Halaman login/register layar penuh', 5, ''),
    ('Shell portal: sidebar bertingkat, dashboard siswa/guru, panel notifikasi, polling gabungan', 14, ''),
    ('Chat: DM, grup, ruang kelas/proyek, foto, blokir/laporan, presence, suara', 28, '16 endpoint'),
    ('Tracker proyek: kanban, drawer tugas, beranda, riwayat, badge', 24, '7 endpoint'),
    ('Audit dan optimasi performa database (SQL agregat, cache, paralelisasi, pooler)', 6, ''),
    ('Pengujian otomatis: harness transaksi + 409 test', 18, '13 file test'),
    ('Dokumentasi: fitur, API, arsitektur, pengujian, rekomendasi, proposal, simulasi', 10, ''),
]

# (tingkat prioritas, modul, hari-orang) — usaha pengembangan murni sebelum pengali test/dokumentasi
T1 = 'Prioritas tinggi – MVP (Fase 2)'
T2 = 'Prioritas sedang – pasca-MVP'
T3 = 'Prioritas kecil – penyempurnaan'
T4 = 'Ekosistem (non-AI)'
T5 = 'Fitur AI'
T6 = 'Infrastruktur (opsional)'
FUTURE = [
    (T1, 'Registrasi tervalidasi data sekolah (identity provider, tabel staff, sinkron terjadwal, status akun)', 25),
    (T1, 'Lupa/ubah kata sandi + verifikasi email (termasuk layanan email)', 6),
    (T1, 'Paket keamanan P1: rate limit, CAPTCHA, header keamanan, kuota/validasi unggahan, audit data publik', 10),
    (T1, 'Kebijakan privasi, aturan komunitas, persetujuan', 3),
    (T1, 'Tabel notifikasi + status baca di server (menggantikan localStorage)', 10),
    (T1, 'Moderasi konten (laporan komentar/karya, antrean admin)', 8),
    (T1, 'Log audit admin', 3),
    (T2, 'Rubrik penilaian dan lencana keahlian', 16),
    (T2, 'Notifikasi realtime (SSE/WebSocket) + Web Push', 18),
    (T2, 'Ekspor portofolio/CV PDF', 8),
    (T2, 'Laporan kemajuan proyek mingguan + email ringkasan', 8),
    (T2, 'Analitik sekolah (dasbor pimpinan)', 10),
    (T2, 'Impor/ekspor CSV massal dan kenaikan kelas', 5),
    (T3, 'PWA, mode gelap, audit aksesibilitas (WCAG AA)', 14),
    (T3, 'Pencarian teks penuh yang lebih baik', 5),
    (T3, 'Riwayat revisi karya', 8),
    (T3, 'Penyempurnaan tracker: template, lampiran, @mention, kalender, peer review kontribusi', 18),
    (T4, 'Mentor industri/alumni (peran baru, alur akses) + profil alumni', 26),
    (T4, 'Pencocokan peluang + pendaftaran peluang dengan berkas', 12),
    (T4, 'Penghargaan berbasis juri', 8),
    (T4, 'Integrasi GitHub/GitLab', 15),
    (T5, 'Fondasi AI: modul penyedia, kuota, filter data pribadi, log penggunaan', 8),
    (T5, 'AI untuk guru: draf umpan balik, ringkasan, pemeriksaan kelengkapan, ringkasan proyek', 18),
    (T5, 'AI untuk siswa: asisten penulisan, pemeriksaan sebelum ajukan, saran kategori, teks alt, rekomendasi, CV, rencana tugas', 37),
    (T5, 'AI untuk admin: moderasi otomatis + pencarian semantik (pgvector)', 18),
    (T6, 'Migrasi ke hosting sendiri: Docker, storage S3, database, backup, pemantauan, cutover', 15),
]

# Harga sekolah: diturunkan dari anggaran yang disepakati untuk MVP (Rp 10 juta untuk tim 2 orang, di luar biaya layanan).
# Tarif dihitung dari usaha MVP termasuk test dan dokumentasi; tidak ada pengali overhead karena desain dan manajemen dikerjakan tim yang sama.
# Jadwal kerja nyata per paket: (minggu pengerjaan, minggu testing dan QA). Tim 2 orang, 5 hari kerja per minggu.
# Usaha di atas (hari-orang) adalah ukuran konvensional; jadwal ini mengasumsikan pengembangan dibantu AI dan bekerja paralel.
SCHEDULE = {
    T1: (1.0, 1.0),
    T2: (1.0, 1.0),
    T3: (1.0, 0.5),
    T4: (1.0, 1.0),
    T5: (1.5, 0.5),
    T6: (1.0, 0.0),
}
WORK_DAYS_PER_WEEK = 5

MVP_BUDGET_JUTA = 10.0
TEAM_SIZE = 2

def rp(million):
    if million >= 1000:
        return f"Rp {million / 1000:.2f} miliar".replace('.', ',')
    return f"Rp {million:,.0f} juta".replace(',', '.')

def nf(value, digits=1):
    return f"{value:.{digits}f}".replace('.', ',')

def table_costs(days, overhead):
    rows = []
    for name, rate in RATES.items():
        base = days * rate
        rows.append((name, rate, base, base * overhead))
    return rows

def render():
    out = []
    built_days = sum(d for _, d, _ in BUILT)
    out.append('### Rincian usaha yang sudah dibangun\n')
    out.append('| # | Modul | Hari-orang | Keterangan |\n| --- | --- | ---: | --- |')
    for index, (name, days, note) in enumerate(BUILT, 1):
        out.append(f'| {index} | {name} | {days} | {note} |')
    out.append(f'| | **Total usaha pengembangan** | **{built_days}** | ≈ {nf(built_days / HARI_PER_BULAN)} bulan-orang |\n')
    out.append(f'Dengan pengali overhead ×{nf(OVERHEAD_BUILT, 2)} (desain UI/UX, manajemen proyek, QA/UAT): **{built_days * OVERHEAD_BUILT:.0f} hari-orang**.\n')
    out.append('| Skenario tarif | Tarif / hari | Pengembangan murni | Dengan overhead |\n| --- | ---: | ---: | ---: |')
    for name, rate, base, loaded in table_costs(built_days, OVERHEAD_BUILT):
        out.append(f'| {name} | Rp {rate * 1000:,.0f} rb | {rp(base)} | **{rp(loaded)}** |'.replace(',', '.'))
    out.append('')

    phases = {}
    for phase, name, days in FUTURE:
        phases.setdefault(phase, []).append((name, days))
    total_future = 0
    out.append('### Rincian rekomendasi (belum dibangun)\n')
    for phase, items in phases.items():
        subtotal = sum(d for _, d in items)
        total_future += subtotal
        out.append(f'**{phase}**\n')
        out.append('| Modul | Hari-orang (murni) | Dengan test dan dokumentasi (×%s) |\n| --- | ---: | ---: |' % nf(TEST_UPLIFT, 2))
        for name, days in items:
            out.append(f'| {name} | {days} | {days * TEST_UPLIFT:.0f} |')
        out.append(f'| **Subtotal** | **{subtotal}** | **{subtotal * TEST_UPLIFT:.0f}** |\n')
    uplifted = total_future * TEST_UPLIFT
    loaded_days = uplifted * OVERHEAD_FUTURE
    out.append(f'**Seluruh rekomendasi:** {total_future} hari-orang murni → {uplifted:.0f} dengan test dan dokumentasi → **{loaded_days:.0f} hari-orang** dengan overhead ×{nf(OVERHEAD_FUTURE, 2)} (≈ {nf(loaded_days / HARI_PER_BULAN)} bulan-orang).\n')
    out.append('| Skenario tarif | Tarif / hari | Per fase (dengan overhead) | Total seluruh rekomendasi |\n| --- | ---: | --- | ---: |')
    for name, rate in RATES.items():
        per_phase = '; '.join(f"{phase.split(' – ')[0]}: {rp(sum(d for _, d in items) * TEST_UPLIFT * OVERHEAD_FUTURE * rate)}" for phase, items in phases.items())
        out.append(f'| {name} | Rp {rate * 1000:,.0f} rb | {per_phase} | **{rp(loaded_days * rate)}** |'.replace(',', '.'))
    out.append('')
    return '\n'.join(out), built_days, total_future, uplifted, loaded_days



def school_pricing():
    """Harga sekolah per tingkat, tarif turunan dari anggaran MVP, dibulatkan ke Rp 0,5 juta."""
    by_tier = {}
    for tier, _, days in FUTURE:
        by_tier[tier] = by_tier.get(tier, 0) + days
    mvp_days = by_tier[T1] * TEST_UPLIFT
    rate = MVP_BUDGET_JUTA / mvp_days  # juta per hari-orang
    rows = []
    for tier, raw in by_tier.items():
        days = raw * TEST_UPLIFT
        rows.append((tier, raw, days, round(days * rate * 2) / 2, days * RATES['Gabungan (freelancer + tim kecil)'] * OVERHEAD_FUTURE, days / TEAM_SIZE))
    built_days = sum(d for _, d, _ in BUILT)
    built = (built_days, round(built_days * rate * 2) / 2, built_days * RATES['Gabungan (freelancer + tim kecil)'] * OVERHEAD_BUILT)
    return rate, rows, built

def packages():
    """Paket implementasi (kumulatif per tingkat) dengan harga pasar acuan untuk tiap skenario tarif."""
    by_tier = {}
    for tier, _, days in FUTURE:
        by_tier[tier] = by_tier.get(tier, 0) + days
    order = [T1, T2, T3, T4, T5, T6]
    rows, running = [], 0
    for tier in order:
        running += by_tier[tier]
        days = running * TEST_UPLIFT * OVERHEAD_FUTURE
        rows.append((tier, running, days, {rate_name: days * rate for rate_name, rate in RATES.items()}))
    return rows

if __name__ == '__main__' and '--packages' in __import__('sys').argv:
    print('| Kumulatif sampai | Hari-orang (murni) | Hari-orang (total) | ' + ' | '.join(RATES) + ' |')
    print('| --- | ---: | ---: | ' + ' | '.join('---:' for _ in RATES) + ' |')
    for name, raw, days, costs in packages():
        print(f'| {name} | {raw} | {days:.0f} | ' + ' | '.join(rp(costs[r]) for r in RATES) + ' |')

if __name__ == '__main__' and '--school' in __import__('sys').argv:
    rate, rows, built = school_pricing()
    print(f'Tarif turunan: Rp {rate * 1000:.0f} rb per hari-orang; tim {TEAM_SIZE} orang')
    for tier, raw, days, price, market, per_person in rows:
        print(f'{tier}: {raw} murni -> {days:.0f} hari; harga sekolah Rp {price:.1f} jt; pasar (gabungan) Rp {market:.0f} jt; {per_person:.0f} hari/orang')
    print('Sudah dibangun:', built)

if __name__ == '__main__' and not any(a in __import__('sys').argv for a in ('--packages', '--school')):
    print(render()[0])
