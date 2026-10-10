# Telkom Student Creation — SMK Telkom

Portal portofolio siswa dengan Next.js App Router, Payload CMS, dan PostgreSQL di Supabase.

## Menjalankan lokal

1. Gunakan Node.js 20.9 atau lebih baru.
2. Salin `.env.example` menjadi `.env.local`.
3. Isi `DATABASE_URL` dengan URL Session pooler dari Supabase (port `5432`), `PAYLOAD_SECRET` dengan secret acak panjang, dan `NEXT_PUBLIC_SERVER_URL`.
4. Jalankan `npm install`, lalu `npm run dev`.
5. Buka `/admin` untuk membuat akun admin pertama. Admin dapat membuat akun siswa melalui koleksi Users.

Payload akan membuat tabel yang diperlukan di database PostgreSQL saat pertama dijalankan. Untuk Vercel, gunakan Shared Transaction Pooler Supabase pada port `6543`, yang dirancang untuk koneksi singkat dari fungsi serverless. Koneksi direct Supabase hanya menyediakan IPv6 tanpa add-on IPv4, sedangkan fungsi Vercel menggunakan IPv4. Gunakan pool maksimum kecil melalui `DATABASE_POOL_MAX` agar setiap fungsi tidak membuka banyak koneksi. Untuk pengembangan lokal, Session Pooler pada port `5432` dapat digunakan. Hubungkan Vercel Blob ke proyek untuk penyimpanan berkas yang persisten; Vercel akan menyediakan `BLOB_READ_WRITE_TOKEN`.

## Arsitektur

- `app/page.tsx`: etalase publik; menampilkan portofolio berstatus Terbit dari API Payload. Karya contoh hanya tampil sebagai preview saat database belum berisi karya terbit.
- `app/login` dan `app/dashboard`: login siswa dan pengelolaan draft portofolio.
- `app/(payload)/admin` dan `app/(payload)/api`: panel admin dan REST API Payload.
- `collections/Users.ts`: akun admin/siswa, program keahlian, kelas.
- `collections/Portfolio.ts`: data proyek, akses publik untuk karya terbit, akses siswa untuk karya miliknya.

Payload menangani autentikasi dan admin CMS; Supabase menyediakan PostgreSQL. `.env.local` jangan dimasukkan ke Git.
