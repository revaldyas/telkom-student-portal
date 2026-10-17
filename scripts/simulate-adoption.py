#!/usr/bin/env python3
"""
Simulasi adopsi dan kebutuhan sumber daya Telkom Student Creation untuk sekolah berskala SMK Telkom.

Model deterministik per bulan (24 bulan ajaran) + Monte Carlo atas parameter yang tidak pasti.
Hanya memakai pustaka standar. Jalankan:  python3 scripts/simulate-adoption.py [--json]

Semua parameter adalah ASUMSI perencanaan (lihat docs/SIMULASI.md); ganti dengan data sekolah.
"""
import json
import math
import random
import statistics
import sys

SEED = 20261018
RUNS = 2000
MONTHS = 24

# Skala sekolah (siswa, rombel). Tidak ada angka publik terverifikasi; tiga skenario ukuran.
SCHOOLS = {
    'kecil': {'students': 800, 'classes': 24, 'teachers': 60},
    'sedang': {'students': 1200, 'classes': 36, 'teachers': 90},
    'besar': {'students': 1800, 'classes': 54, 'teachers': 130},
}

# Faktor aktivitas per bulan ajaran (1 = penuh). Bulan ke-6 dan ke-12 dianggap libur panjang/ujian.
def activity(month):
    return 0.35 if month % 12 in (6, 0) else 1.0

def logistic(x):
    return 1 / (1 + math.exp(-x))

def tri(rng, low, mode, high):
    return rng.triangular(low, high, mode)

def draw_params(rng):
    return {
        'amax_y1': tri(rng, 0.35, 0.50, 0.65),         # porsi siswa yang punya >=1 karya terverifikasi, akhir tahun 1
        'amax_y2': tri(rng, 0.50, 0.70, 0.85),         # akhir tahun 2
        'adopt_center': tri(rng, 4.5, 6.0, 8.5),        # bulan titik tengah kurva adopsi
        'karya_per_year': tri(rng, 0.8, 1.5, 2.5),      # karya per siswa aktif per tahun
        'verified_ratio': tri(rng, 0.75, 0.88, 0.95),   # karya yang akhirnya terverifikasi
        'mentor_share': tri(rng, 0.30, 0.50, 0.70),     # porsi guru yang aktif memverifikasi
        'team_share': tri(rng, 0.10, 0.20, 0.30),       # siswa aktif yang ikut proyek tim
        'img_per_work': tri(rng, 3, 5, 8),
        'img_mb': rng.lognormvariate(math.log(0.5), 0.45),  # median 0,5 MB setelah kompresi WebP
        'video_share': tri(rng, 0.03, 0.10, 0.20),
        'video_mb': tri(rng, 15, 35, 50),
        'pdf_share': tri(rng, 0.03, 0.10, 0.20),
        'pdf_mb': tri(rng, 1, 4, 10),
        'chat_share': tri(rng, 0.15, 0.30, 0.50),       # siswa terdaftar yang aktif mengirim pesan
        'chat_msgs_day': tri(rng, 5, 15, 30),
        'likes_per_work': tri(rng, 2, 6, 12),
        'comments_per_work': tri(rng, 0.5, 2, 5),
        'peak_concurrent': tri(rng, 0.05, 0.10, 0.16),  # porsi pengguna terdaftar online saat jam puncak
        'req_per_user_s': tri(rng, 0.06, 0.10, 0.16),   # permintaan per detik per pengguna online (polling + halaman)
    }

def simulate(school, p):
    n, teachers = school['students'], school['teachers']
    mentors = max(1, teachers * p['mentor_share'])
    reg = active = 0.0
    works_total = verified_total = projects_total = 0.0
    storage_mb = db_mb = 0.0
    chat_msgs = 0.0
    rows = []
    for m in range(1, MONTHS + 1):
        # pendaftaran: percontohan (m 1-3, 1/3 sekolah) lalu seluruh sekolah dari bulan 4
        pilot = 0.33 * 0.9 * min(1.0, m / 2)
        full = 0.95 * logistic((m - 5.5) / 1.1) if m >= 4 else 0
        reg = n * max(pilot, full)
        amax = p['amax_y1'] if m <= 12 else p['amax_y1'] + (p['amax_y2'] - p['amax_y1']) * min(1, (m - 12) / 12)
        active_target = amax * n * logistic((m - p['adopt_center']) / 2.2)
        active = min(reg, max(active, active_target))  # tidak turun
        act = activity(m)
        new_works = active * p['karya_per_year'] / 10 * act
        new_verified = new_works * p['verified_ratio']
        works_total += new_works
        verified_total += new_verified
        team_projects = active * p['team_share'] / 4 * p['karya_per_year'] / 10 * act
        projects_total += team_projects
        items = new_works + team_projects
        per_item_mb = p['img_per_work'] * p['img_mb'] + p['video_share'] * p['video_mb'] + p['pdf_share'] * p['pdf_mb']
        storage_mb += items * per_item_mb
        msgs = reg * p['chat_share'] * p['chat_msgs_day'] * 22 * act
        chat_msgs += msgs
        db_mb += (msgs * 0.5 + new_works * (p['likes_per_work'] * 0.25 + p['comments_per_work'] * 1.0 + 6) + reg * 0.0) / 1024
        peak = reg * p['peak_concurrent']
        rows.append({
            'month': m, 'registered': reg, 'active': active, 'works_verified': verified_total, 'projects': projects_total,
            'storage_gb': storage_mb / 1024, 'db_mb': db_mb + 18, 'chat_msgs': chat_msgs,
            'peak_users': peak, 'peak_rps': peak * p['req_per_user_s'],
            'verif_per_teacher_month': new_works / mentors if act == 1 else new_works / mentors,
        })
    return rows

def percentile(values, q):
    values = sorted(values)
    k = (len(values) - 1) * q
    f, c = math.floor(k), math.ceil(k)
    return values[int(k)] if f == c else values[f] + (values[c] - values[f]) * (k - f)

def run():
    rng = random.Random(SEED)
    out = {}
    for name, school in SCHOOLS.items():
        samples = [simulate(school, draw_params(rng)) for _ in range(RUNS)]
        stats = {}
        for month in (3, 6, 12, 18, 24):
            snap = {}
            for key in ('registered', 'active', 'works_verified', 'projects', 'storage_gb', 'db_mb', 'chat_msgs', 'peak_users', 'peak_rps'):
                vals = [s[month - 1][key] for s in samples]
                snap[key] = {'p10': percentile(vals, .1), 'p50': percentile(vals, .5), 'p90': percentile(vals, .9)}
            stats[month] = snap
        # beban verifikasi: bulan aktif penuh (bukan libur), median dan p90 per guru pembimbing per bulan
        loads = [max(row['verif_per_teacher_month'] for row in s if row['month'] % 12 not in (6, 0)) for s in samples]
        avg_loads = [statistics.mean(row['verif_per_teacher_month'] for row in s if 12 < row['month'] <= 24 and row['month'] % 12 not in (6, 0)) for s in samples]
        stats['verif'] = {'peak_month': {'p10': percentile(loads, .1), 'p50': percentile(loads, .5), 'p90': percentile(loads, .9)},
                          'avg_year2': {'p10': percentile(avg_loads, .1), 'p50': percentile(avg_loads, .5), 'p90': percentile(avg_loads, .9)}}
        # lintasan median per bulan (untuk grafik)
        stats['curve'] = [{'month': m, **{key: percentile([s[m - 1][key] for s in samples], .5) for key in ('registered', 'active', 'works_verified', 'storage_gb')}} for m in range(1, MONTHS + 1)]
        out[name] = stats
    return out

if __name__ == '__main__':
    result = run()
    if '--json' in sys.argv:
        print(json.dumps(result, indent=1, default=float))
    else:
        for name, stats in result.items():
            print(f"== {name} ({SCHOOLS[name]['students']} siswa)")
            for month in (3, 6, 12, 24):
                s = stats[month]
                print(f"  bln {month:>2}: terdaftar {s['registered']['p50']:.0f} | aktif {s['active']['p50']:.0f} ({s['active']['p10']:.0f}-{s['active']['p90']:.0f}) | karya {s['works_verified']['p50']:.0f} | storage {s['storage_gb']['p50']:.1f} GB ({s['storage_gb']['p10']:.1f}-{s['storage_gb']['p90']:.1f}) | db {s['db_mb']['p50']:.0f} MB | puncak {s['peak_users']['p50']:.0f} user, {s['peak_rps']['p50']:.1f} rps")
            print(f"  beban verifikasi/guru/bulan (p50, p90 bulan puncak): {stats['verif']['peak_month']['p50']:.1f}, {stats['verif']['peak_month']['p90']:.1f}")
