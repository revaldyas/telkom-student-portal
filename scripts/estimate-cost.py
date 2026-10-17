#!/usr/bin/env python3
"""
Rincian estimasi biaya pengembangan Telkom Student Creation (yang sudah dibangun dan seluruh rekomendasi).

Estimasi bottom-up per modul dalam hari-orang (pengembang menengah), dikalikan tarif dan pengali overhead.
Semua angka adalah ASUMSI perencanaan; ubah tabel di bawah lalu jalankan ulang:
    python3 scripts/estimate-cost.py          # cetak tabel Markdown
"""

# Tarif per hari-orang (Rp juta), 8 jam kerja. Perkiraan; sesuaikan dengan kondisi sekolah/mitra.
RATES = {'Internal / freelancer': 0.9, 'Gabungan (freelancer + tim kecil)': 1.5, 'Software house': 2.2}
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

# (fase, modul, hari-orang) — usaha pengembangan murni sebelum pengali
FUTURE = [
    ('Fase 2 – Peluncuran', 'Registrasi tervalidasi data sekolah (identity provider, tabel staff, sinkron terjadwal, status akun)', 25),
    ('Fase 2 – Peluncuran', 'Lupa/ubah kata sandi + verifikasi email (termasuk layanan email)', 6),
    ('Fase 2 – Peluncuran', 'Paket keamanan P1: rate limit, CAPTCHA, header keamanan, kuota/validasi unggahan, audit data publik', 10),
    ('Fase 2 – Peluncuran', 'Kebijakan privasi, aturan komunitas, persetujuan', 3),
    ('Fase 2 – Peluncuran', 'Tabel notifikasi + status baca di server (menggantikan localStorage)', 10),
    ('Fase 2 – Peluncuran', 'Moderasi konten (laporan komentar/karya, antrean admin)', 8),
    ('Fase 2 – Peluncuran', 'Log audit admin', 3),
    ('Fase 3 – Penguatan', 'Rubrik penilaian dan lencana keahlian', 16),
    ('Fase 3 – Penguatan', 'Notifikasi realtime (SSE/WebSocket) + Web Push', 18),
    ('Fase 3 – Penguatan', 'Ekspor portofolio/CV PDF', 8),
    ('Fase 3 – Penguatan', 'Laporan kemajuan proyek mingguan + email ringkasan', 8),
    ('Fase 3 – Penguatan', 'Analitik sekolah (dasbor pimpinan)', 10),
    ('Fase 3 – Penguatan', 'Impor/ekspor CSV massal dan kenaikan kelas', 5),
    ('Fase 3 – Penguatan', 'PWA, mode gelap, audit aksesibilitas (WCAG AA)', 14),
    ('Fase 3 – Penguatan', 'Pencarian teks penuh yang lebih baik', 5),
    ('Fase 3 – Penguatan', 'Riwayat revisi karya', 8),
    ('Fase 3 – Penguatan', 'Penyempurnaan tracker: template, lampiran, @mention, kalender, peer review kontribusi', 18),
    ('Fase 4 – Ekosistem', 'Mentor industri/alumni (peran baru, alur akses) + profil alumni', 26),
    ('Fase 4 – Ekosistem', 'Pencocokan peluang + pendaftaran peluang dengan berkas', 12),
    ('Fase 4 – Ekosistem', 'Penghargaan berbasis juri', 8),
    ('Fase 4 – Ekosistem', 'Integrasi GitHub/GitLab', 15),
    ('Fase 4 – Ekosistem', 'Fondasi AI: modul penyedia, kuota, filter data pribadi, log penggunaan', 8),
    ('Fase 4 – Ekosistem', 'AI untuk guru: draf umpan balik, ringkasan, pemeriksaan kelengkapan, ringkasan proyek', 18),
    ('Fase 4 – Ekosistem', 'AI untuk siswa: asisten penulisan, pemeriksaan sebelum ajukan, saran kategori, teks alt, rekomendasi, CV, rencana tugas', 37),
    ('Fase 4 – Ekosistem', 'AI untuk admin: moderasi otomatis + pencarian semantik (pgvector)', 18),
    ('Infrastruktur (opsional)', 'Migrasi ke hosting sendiri: Docker, storage S3, database, backup, pemantauan, cutover', 15),
]

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

if __name__ == '__main__' and '--packages' not in __import__('sys').argv:
    print(render()[0])


def packages():
    """Paket implementasi dan biayanya (dengan test, dokumentasi, dan overhead) untuk tiap skenario tarif."""
    by_phase = {}
    for phase, _, days in FUTURE:
        by_phase[phase] = by_phase.get(phase, 0) + days
    f2, f3, f4, infra = (by_phase[k] for k in ('Fase 2 – Peluncuran', 'Fase 3 – Penguatan', 'Fase 4 – Ekosistem', 'Infrastruktur (opsional)'))
    sets = {
        'Minimum layak (Fase 2)': f2,
        'Direkomendasikan (Fase 2 + 3)': f2 + f3,
        'Penuh (Fase 2 + 3 + 4 + migrasi hosting)': f2 + f3 + f4 + infra,
    }
    rows = []
    for name, raw in sets.items():
        days = raw * TEST_UPLIFT * OVERHEAD_FUTURE
        rows.append((name, raw, days, {rate_name: days * rate for rate_name, rate in RATES.items()}))
    return rows

if __name__ == '__main__' and '--packages' in __import__('sys').argv:
    print('| Paket | Hari-orang (murni) | Hari-orang (total) | ' + ' | '.join(RATES) + ' |')
    print('| --- | ---: | ---: | ' + ' | '.join('---:' for _ in RATES) + ' |')
    for name, raw, days, costs in packages():
        print(f'| {name} | {raw} | {days:.0f} | ' + ' | '.join(rp(costs[r]) for r in RATES) + ' |')
