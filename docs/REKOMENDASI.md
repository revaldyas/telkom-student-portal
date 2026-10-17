# Rekomendasi dan Usulan Pengembangan

Kumpulan dokumen usulan (belum diimplementasikan) untuk tahap berikutnya. Setiap dokumen menyebut kondisi saat ini, usulan, prioritas, dan dampak pada kode.

| Dokumen | Isi |
| --- | --- |
| [REKOMENDASI-IDENTITAS.md](REKOMENDASI-IDENTITAS.md) | Registrasi guru dan siswa tervalidasi lewat NIP/NUPTK dan NIS/NISN, integrasi API portal siswa sekolah, sinkronisasi data tanpa input manual admin |
| [REKOMENDASI-MIGRASI.md](REKOMENDASI-MIGRASI.md) | Pindah hosting (VPS / server sekolah), storage, kompresi gambar, dan migrasi database |
| [REKOMENDASI-REALTIME.md](REKOMENDASI-REALTIME.md) | Notifikasi realtime (SSE/WebSocket) dan penyimpanan status baca di server tanpa localStorage |
| [REKOMENDASI-KEAMANAN.md](REKOMENDASI-KEAMANAN.md) | Keamanan tambahan, anti-bot, rate limit, CAPTCHA, header, privasi |
| [REKOMENDASI-FITUR.md](REKOMENDASI-FITUR.md) | Fitur lanjutan dan fitur AI beserta urutan implementasi |

## Urutan yang disarankan lintas dokumen

1. Konfirmasi ke sekolah: sumber data identitas dan ketersediaan API (identitas).
2. Keamanan P1: rate limit, CAPTCHA, header, lupa kata sandi (keamanan).
3. Tabel notifikasi dan status baca di server (realtime bagian 2).
4. Keputusan hosting (migrasi): menentukan apakah SSE/WebSocket dapat dipakai.
5. Registrasi guru via data sekolah (identitas).
6. Fitur kualitas dan AI bantu guru (fitur).
