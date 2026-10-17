# Rekomendasi: Keamanan dan Perlindungan dari Bot

> **Status: usulan.** Bagian "Sudah ada" menggambarkan kondisi kode saat ini; bagian lain adalah saran. Prioritas diberi label **P1** (segera), **P2** (berikutnya), **P3** (lanjutan).

## 1. Sudah ada

| Kontrol | Keterangan |
| --- | --- |
| Pemisahan login | `users` (website) dan `admins` (CMS) terpisah |
| Cookie sesi | httpOnly, `sameSite=lax`, `secure` di produksi |
| Cek `Origin` | login dan register menolak permintaan lintas origin |
| Access control | per collection + pemeriksaan keanggotaan di route chat/tracker/proyek |
| Pembatasan field | siswa tidak dapat mengubah role, NIS, kelas, status verifikasi/terbit |
| Rate limit sebagian | chat 25 pesan/menit, komentar proyek 8/menit, catch-all REST |
| Kunci unik | mencegah suka/suara/minat ganda meski ada permintaan bersamaan |
| Privasi | presence dapat disembunyikan; EXIF (termasuk GPS) terbuang saat kompresi gambar |
| Moderasi chat | blokir dan laporan pesan |

## 2. Celah dan peningkatan

### 2.1 Autentikasi dan akun

| Prioritas | Saran | Alasan |
| --- | --- | --- |
| **P1** | Batas percobaan **login** per IP dan per akun (mis. 5 gagal/15 menit lalu jeda bertahap) | Tidak ada pembatasan khusus pada `/api/auth/login`; rentan tebak kata sandi |
| **P1** | Batas laju `/api/register` per IP | Cegah pembuatan akun massal |
| **P1** | Verifikasi email (tautan sekali pakai) | Email saat ini tidak dibuktikan kepemilikannya |
| **P1** | Fitur **lupa/ubah kata sandi** (token sekali pakai, kedaluwarsa singkat) | Belum ada alur pemulihan |
| **P2** | Kebijakan kata sandi: minimal 8 sudah ada; tambahkan pemeriksaan kata sandi umum/bocor (daftar teratas atau API k-anonymity HIBP) | Minimal 8 saja tidak cukup |
| **P2** | Daftar sesi aktif dan "keluar dari semua perangkat" (versi token/`sessionVersion` di `users`) | Sesi yang bocor dapat dicabut |
| **P2** | Header respons login yang sama untuk email salah / sandi salah (sudah seragam) + waktu respons seragam | Cegah enumeration akun |
| **P2** | 2FA (TOTP) wajib untuk **admin CMS** dan guru, opsional untuk siswa | Akun dengan hak tinggi |
| **P3** | Passkey/WebAuthn atau SSO akun sekolah (Google Workspace/Microsoft 365) bila sekolah memakainya | Mengurangi kata sandi; sejalan dengan [REKOMENDASI-IDENTITAS.md](REKOMENDASI-IDENTITAS.md) |

### 2.2 Anti-bot dan penyalahgunaan

Ancaman: pendaftaran massal, tebak kata sandi, spam komentar/pesan, scraping data siswa, unggahan berbahaya.

| Prioritas | Saran | Catatan |
| --- | --- | --- |
| **P1** | **CAPTCHA** pada register, login (setelah beberapa gagal), dan lupa kata sandi. Pilihan: Cloudflare Turnstile (gratis, tanpa teka-teki), hCaptcha, reCAPTCHA v3 | Turnstile paling ramah pengguna dan privasi. Verifikasi token **di server** |
| **P1** | **Rate limiting terpusat** (middleware) dengan kunci IP + pengguna, per kelompok endpoint: auth ketat, tulis sedang, baca longgar. Simpan hitungan di Redis atau tabel Postgres (Vercel: Upstash/Vercel KV) | Cache memori per instance tidak cukup di serverless |
| **P1** | Respons `429` dengan `Retry-After`; log pelanggaran | |
| **P2** | **Honeypot** (field tersembunyi) dan pengukuran waktu isi formulir (terlalu cepat = bot) | Murah dan tidak mengganggu pengguna |
| **P2** | **WAF / proteksi DDoS** di depan aplikasi (Cloudflare gratis atau Vercel Firewall); aturan bot-fight, blokir ASN/negara yang tak relevan bila sekolah hanya melayani Indonesia | Pertimbangkan dampak untuk pengunjung luar negeri |
| **P2** | `robots.txt` + `X-Robots-Tag` untuk halaman privat; **tolak crawler agresif** berdasarkan User-Agent/perilaku; API publik (`feed`, `search`, profil) diberi rate limit per IP | Cegah scraping profil siswa |
| **P2** | Batas kuota unggah per pengguna (jumlah dan ukuran per hari) dan validasi tipe berkas sisi server (periksa *magic bytes*, bukan hanya ekstensi/MIME) | Cegah penyalahgunaan storage |
| **P2** | Anti-spam komentar: batas tautan, deteksi duplikat, penundaan untuk akun baru | |
| **P3** | Skor risiko (IP baru, perangkat baru, kecepatan) untuk menentukan kapan menampilkan CAPTCHA/2FA | |
| **P3** | Pemindaian antivirus unggahan (ClamAV) untuk PDF/video | Relevan bila berkas dibagikan luas |

### 2.3 Header dan konfigurasi web

| Prioritas | Saran |
| --- | --- |
| **P1** | Header keamanan di `next.config.ts` (`headers()`): `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Frame-Options: DENY` atau `frame-ancestors` |
| **P2** | **Content-Security-Policy** (mulai mode *report-only*, lalu ketatkan): batasi `script-src`, izinkan hanya domain gambar/Blob/CDN yang dipakai |
| **P1** | CORS: pastikan endpoint `/api` tidak mengizinkan origin sembarang |
| **P2** | Cookie: pertimbangkan `sameSite=strict` untuk sesi bila alur login-lintas-situs tidak diperlukan, dan awalan `__Host-` |
| **P2** | Perlindungan CSRF eksplisit (token atau pemeriksaan `Origin` pada **semua** metode tulis `/api`, saat ini terutama login/register) |
| **P2** | Sanitasi keluaran: konten Lexical dan teks pengguna dirender sebagai teks/HTML ter-sanitasi; tidak ada `dangerouslySetInnerHTML` dari input mentah (audit) |

### 2.4 Data dan privasi

| Prioritas | Saran |
| --- | --- |
| **P1** | Pastikan endpoint publik **tidak membocorkan** data pribadi (email, NIS, nomor HP) — audit respons `students/[id]`, `search`, `leaderboard` |
| **P1** | Kebijakan privasi dan persetujuan (siswa di bawah umur): halaman kebijakan, apa yang tampil publik, cara minta penghapusan |
| **P2** | Enkripsi koneksi database (`sslmode=require`) dan enkripsi disk/backup |
| **P2** | Log audit: login admin, perubahan role, penghapusan, keputusan verifikasi (tabel append-only) |
| **P2** | Rotasi secret berkala (`PAYLOAD_SECRET`, kunci API sekolah, token Blob) dan pemisahan secret antar lingkungan |
| **P2** | Retensi data: hapus pesan chat lama sesuai kebijakan, anonimkan akun yang dihapus |
| **P3** | Mode "profil privat" (hanya terlihat oleh sekolah) bagi siswa yang menginginkannya |

### 2.5 Infrastruktur

| Prioritas | Saran |
| --- | --- |
| **P1** | Dependabot/`npm audit` rutin; pembaruan Next.js dan Payload yang aman |
| **P1** | Jangan commit `.env`; pindai riwayat Git dengan `gitleaks` |
| **P2** | Backup terenkripsi yang diuji ([REKOMENDASI-MIGRASI.md](REKOMENDASI-MIGRASI.md) bagian 5.3) |
| **P2** | Pemantauan error (Sentry) dan uptime; peringatan untuk lonjakan 401/429/5xx |
| **P2** | Pisahkan akun database aplikasi dari akun migrasi (hak minimal); database tidak terbuka ke internet |
| **P3** | Uji penetrasi ringan (OWASP ZAP) sebelum rilis besar; checklist OWASP ASVS level 1 |

## 3. Contoh implementasi (sketsa)

### 3.1 Rate limiter sederhana berbasis Postgres/Redis

```ts
// lib/rateLimit.ts  (sketsa)
export async function limit(key: string, max: number, windowSec: number) {
  // Redis: INCR key lalu EXPIRE bila baru; Postgres: tabel rate_hits(key, at) dihitung per jendela
  const count = await counter.incr(`${key}:${Math.floor(Date.now() / 1000 / windowSec)}`, windowSec)
  return { ok: count <= max, remaining: Math.max(0, max - count), retryAfter: windowSec }
}
// pemakaian di route login
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
const hit = await limit(`login:${ip}`, 10, 900)
if (!hit.ok) return NextResponse.json({ message: 'Terlalu banyak percobaan. Coba lagi nanti.' }, { status: 429, headers: { 'Retry-After': String(hit.retryAfter) } })
```

Catatan: ambil IP dari header yang **dipercaya** (di Vercel `x-forwarded-for`/`x-real-ip`; di belakang Cloudflare `cf-connecting-ip`), jangan dari input pengguna.

### 3.2 Verifikasi Turnstile di server

```ts
const form = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET!, response: token, remoteip: ip })
const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
const { success } = await res.json()
if (!success) return NextResponse.json({ message: 'Verifikasi gagal.' }, { status: 400 })
```

### 3.3 Header keamanan

```ts
// next.config.ts
async headers() {
  return [{ source: '/(.*)', headers: [
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ] }]
}
```

Uji dulu: panel admin Payload dan editor tertentu bisa membutuhkan `frame`/skrip inline; terapkan CSP bertahap.

## 4. Urutan pengerjaan yang disarankan

1. **Minggu 1 (P1 dasar):** rate limit login/register, CAPTCHA Turnstile, header keamanan, audit data publik.
2. **Minggu 2:** verifikasi email + lupa kata sandi; kuota unggah dan validasi *magic bytes*.
3. **Minggu 3:** WAF/proteksi DDoS, anti-scraping, log audit, pemantauan error.
4. **Berikutnya:** 2FA admin/guru, CSP, manajemen sesi, kebijakan retensi, uji penetrasi.

## 5. Daftar periksa rilis

- [ ] `npm audit` tanpa temuan kritis; dependensi mutakhir
- [ ] Secret tidak ada di repo; `.env.example` tanpa nilai
- [ ] Rate limit aktif pada auth dan endpoint tulis
- [ ] CAPTCHA aktif di register/login/reset
- [ ] Header keamanan terpasang (cek dengan securityheaders.com)
- [ ] Endpoint publik diaudit untuk kebocoran data pribadi
- [ ] Backup terakhir berhasil diuji pulihkan
- [ ] Kebijakan privasi tersedia
