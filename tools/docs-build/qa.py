#!/usr/bin/env python3
"""Pemeriksaan kualitas PDF: halaman hampir kosong, konten melewati margin, dan lembar kontak untuk ditinjau.
Pemakaian: python3 qa.py dist/Proposal-Telkom-Student-Creation.pdf  -> hasil di tools/docs-build/.build/qa/<nama>/"""
import subprocess, sys, pathlib
from PIL import Image

pdf = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(__file__).parent / '.build' / 'qa' / pdf.stem
out.mkdir(parents=True, exist_ok=True)
for old in out.glob('*.png'): old.unlink()
subprocess.run(['pdftoppm', '-r', '60', '-png', str(pdf), str(out / 'p')], check=True)
pages = sorted(out.glob('p-*.png'))
print(f'{pdf.name}: {len(pages)} halaman')
issues = []
for index, path in enumerate(pages, 1):
    im = Image.open(path).convert('L')
    w, h = im.size
    px = im.load()
    # Area isi (tanpa header/footer): 14% atas dan bawah dikecualikan.
    top, bottom = int(h * 0.12), int(h * 0.90)
    dark = 0; total = 0
    for y in range(top, bottom, 2):
        for x in range(0, w, 2):
            total += 1
            if px[x, y] < 235: dark += 1
    ratio = dark / total
    # Konten di margin kanan/kiri (kurang dari 6 mm dari tepi) selain halaman penuh (cover).
    edge = int(w * 6 / 210)
    edge_dark = sum(1 for y in range(top, bottom, 3) for x in list(range(0, edge)) + list(range(w - edge, w)) if px[x, y] < 200)
    flag = ''
    if index > 1 and ratio < 0.012: flag += ' KOSONG?'
    if index > 1 and edge_dark > 20: flag += ' MELEWATI-MARGIN?'
    if flag: issues.append((index, flag, round(ratio, 4)))
    print(f'  hal {index:>3}: terisi {ratio * 100:5.1f}%{flag}')
# Lembar kontak: 4 kolom x 2 baris per lembar.
thumb_w = 300
for sheet, start in enumerate(range(0, len(pages), 8), 1):
    group = pages[start:start + 8]
    ims = [Image.open(p) for p in group]
    tw = thumb_w; th = int(ims[0].height * tw / ims[0].width)
    canvas = Image.new('RGB', (tw * 4 + 10 * 5, th * 2 + 10 * 3), (200, 205, 215))
    for i, im in enumerate(ims):
        canvas.paste(im.resize((tw, th)), (10 + (i % 4) * (tw + 10), 10 + (i // 4) * (th + 10)))
    canvas.save(out / f'sheet-{sheet:02d}.png')
print('ISU:', issues or 'tidak ada')
print('lembar kontak:', out)
