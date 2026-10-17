# docs-build

Membuat PDF siap bagikan dari Markdown di `docs/`: proposal, dokumentasi teknis, dan pitch deck. Hasil ada di `dist/` (diabaikan Git).

| Perintah | Hasil |
| --- | --- |
| `npm run docs` | `dist/Proposal-Telkom-Student-Creation.pdf` dan `dist/Dokumentasi-Teknis-Telkom-Student-Creation.pdf` |
| `node build-docs.mjs proposal` | hanya proposal (`dokumentasi` untuk dokumentasi teknis) |
| `npm run deck` | `dist/Pitch-Deck-Telkom-Student-Creation.pdf` |
| `npm run screens` | mengambil ulang tangkapan layar produk ke `assets/screens/` |
| `python3 qa.py <file.pdf>` | pemeriksaan halaman kosong dan konten melewati margin, plus lembar kontak di `.build/qa/` |

Persiapan: `npm install` di folder ini. Butuh Google Chrome di `/usr/bin/google-chrome` (dipakai headless) dan `pdftoppm` untuk `qa.py`.

## Cara kerja

- **Dokumen:** markdown-it → HTML → diagram Mermaid dirender menjadi SVG → paged.js (daftar isi dengan nomor halaman, header dan footer, pemotongan halaman) → Chrome headless. Tema ada di `theme/print.css` (font Inter dan Source Serif 4 ditanam dari paket `@fontsource`).
- **Deck:** `docs/PITCH-DECK.md` (Marp) + `theme/deck.css`. `deck-layout.json` mengatur kelas slide, gambar, dan kartu statistik per judul slide tanpa mengotori naskah.
- **Pemeriksaan kualitas:** `build-docs.mjs` melaporkan diagram yang gagal, `debug-pages.mjs` mendeteksi judul yatim, dan `qa.py` mendeteksi halaman kosong dan konten yang melewati margin.

## Tangkapan layar

`capture-screens.mjs` membuka aplikasi yang sedang berjalan (`BASE_URL`, bawaan `http://localhost:3000`) dan masuk dengan akun demo lewat variabel lingkungan: `DEMO_STUDENT_EMAIL`, `DEMO_STUDENT_PASSWORD`, `DEMO_TEACHER_EMAIL`, `DEMO_TEACHER_PASSWORD`. Kata sandi tidak disimpan di repositori. Skrip hanya membuka halaman (membaca); membuka beberapa halaman portal dapat memperbarui status online dan membuat ruang chat kelas/proyek secara otomatis.
