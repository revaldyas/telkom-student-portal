# Arsitektur

Dokumen ini menjelaskan topologi sistem, alur data, model data (ERD), deployment, dan keputusan teknis utama. Diagram memakai [Mermaid](https://mermaid.js.org/) sehingga tampil langsung di GitHub, VS Code (dengan ekstensi Mermaid), dan sebagian besar penampil Markdown.

Dokumen terkait: [FEATURES.md](FEATURES.md), [API.md](API.md), [TESTING.md](TESTING.md).

## Daftar isi

1. [Gambaran umum](#1-gambaran-umum)
2. [Topologi sistem](#2-topologi-sistem)
3. [Lapisan aplikasi](#3-lapisan-aplikasi)
4. [Autentikasi dan otorisasi](#4-autentikasi-dan-otorisasi)
5. [Model data dan ERD](#5-model-data-dan-erd)
6. [Alur status](#6-alur-status)
7. [Alur data penting](#7-alur-data-penting)
8. [Performa dan caching](#8-performa-dan-caching)
9. [Deployment](#9-deployment)
10. [Migrasi database](#10-migrasi-database)
11. [Keamanan](#11-keamanan)
12. [Batasan dan hal yang perlu diketahui](#12-batasan-dan-hal-yang-perlu-diketahui)

---

## 1. Gambaran umum

Satu aplikasi **Next.js 16 (App Router)** yang menjalankan tiga hal sekaligus dalam satu deployment:

| Bagian | Lokasi | Fungsi |
| --- | --- | --- |
| Website | `app/(site)/` | Halaman publik, portal siswa, portal guru (React 19, client-side fetch ke `/api`) |
| Admin CMS | `app/(payload)/admin/` | Panel Payload CMS 3.90 untuk admin sekolah |
| API | `app/(payload)/api/` | REST Payload (catch-all) dan endpoint khusus website |

Data disimpan di **PostgreSQL (Supabase)** melalui adapter Payload (Drizzle + `node-postgres`). Berkas upload disimpan di **Vercel Blob**. Tidak ada layanan terpisah (tanpa message queue, Redis, atau WebSocket); pembaruan "real-time" memakai polling.

| Lapisan | Teknologi |
| --- | --- |
| Framework | Next.js 16, React 19, TypeScript |
| CMS dan ORM | Payload CMS 3.90, adapter `@payloadcms/db-postgres` (Drizzle) |
| Database | PostgreSQL di Supabase (lewat Supavisor pooler) |
| Penyimpanan berkas | Vercel Blob (`@payloadcms/storage-vercel-blob`), pemrosesan gambar dengan Sharp |
| Editor teks | Lexical (admin dan editor detail karya) |
| Hosting | Vercel (Serverless Functions, region `hnd1`) |
| Test | Vitest (database sungguhan, transaksi di-rollback) |

---

## 2. Topologi sistem

```mermaid
flowchart LR
    subgraph Client["Browser"]
        V["Pengunjung"]
        S["Siswa"]
        G["Guru"]
        A["Admin CMS"]
    end

    subgraph Vercel["Vercel (region hnd1)"]
        CDN["Edge / CDN<br/>cache s-maxage=30"]
        subgraph Next["Aplikasi Next.js 16 (serverless)"]
            SITE["app/(site)<br/>halaman React"]
            ADMIN["app/(payload)/admin<br/>UI Payload"]
            API["app/(payload)/api<br/>endpoint khusus + REST Payload"]
            PAY["Payload (local API)<br/>collections, access, hooks"]
        end
    end

    subgraph Supabase["Supabase"]
        POOL["Supavisor pooler<br/>transaction mode :6543"]
        PG[("PostgreSQL")]
    end

    BLOB[("Vercel Blob<br/>gambar WebP, berkas")]

    V & S & G --> CDN --> SITE
    SITE -- "fetch /api/*" --> API
    A --> ADMIN --> PAY
    API --> PAY
    PAY -- "node-postgres<br/>pool max 10" --> POOL --> PG
    PAY -- "upload / URL publik" --> BLOB
    V & S & G -. "gambar" .-> BLOB
```

Poin penting:

- Semua akses data lewat Payload, baik dari admin maupun dari endpoint `/api`. Endpoint khusus memanggil Payload **local API** (`getPayload`) langsung di server, bukan lewat HTTP.
- Hitungan besar (suka, komentar, suara, belum dibaca) memakai SQL agregat langsung lewat `payload.db.drizzle` (`lib/dbCounts.ts`) untuk menghindari N+1 query.
- Browser memuat gambar langsung dari Vercel Blob, tidak lewat aplikasi.

### Komunikasi real-time (polling)

```mermaid
sequenceDiagram
    participant B as Browser (portal)
    participant P as POST /api/portal/pulse
    participant DB as PostgreSQL

    loop berkala saat portal terbuka
        B->>P: { seen } (+ cookie sesi)
        P->>DB: presence (touch lastSeenAt)
        par satu gelombang query paralel
            P->>DB: notifikasi turunan
            P->>DB: jumlah chat belum dibaca (SQL group-by)
            P->>DB: badge aktivitas tracker
        end
        P-->>B: { notifications, chatUnread, trackerBadge }
    end
    Note over B: Halaman chat memakai GET messages?after=ID<br/>untuk pesan baru, suara Web Audio saat ada pesan masuk
```

---

## 3. Lapisan aplikasi

```mermaid
flowchart TB
    UI["Komponen UI<br/>components/, app/(site)/**/page.tsx"]
    ROUTES["Route handlers<br/>app/(payload)/api/**/route.ts"]
    LIB["Helper domain<br/>lib/ (websiteAuth, chat, tracker,<br/>presence, projectSocial, dbCounts, ...)"]
    COLL["Collections Payload<br/>collections/*.ts<br/>field, validasi, access control, hooks"]
    DRIZZLE["Adapter Postgres (Drizzle)"]
    DB[("PostgreSQL")]

    UI -- "fetch + cookie sesi" --> ROUTES
    UI -- "REST Payload (formulir portal)" --> COLL
    ROUTES --> LIB
    ROUTES --> COLL
    LIB --> COLL
    LIB -- "SQL agregat" --> DRIZZLE
    COLL --> DRIZZLE --> DB
```

Pembagian tanggung jawab:

| Lapisan | Tanggung jawab | Contoh |
| --- | --- | --- |
| Collection | Skema, validasi, aturan akses, hook (mis. batasi field yang boleh diubah siswa, hitung slug) | `collections/Portfolio.ts` |
| `lib/` | Logika lintas endpoint: sesi website, akses chat/tracker, presence, hitungan | `lib/tracker.ts` `projectAccess` |
| Route handler | Alur khusus yang tidak cocok untuk REST generik: feed, leaderboard, chat, tracker, tindakan proyek | `community/projects/[id]/actions` |
| UI | Render, state klien, polling | `components/chat/*`, `components/tracker/*` |

Pola akses data: **collection yang sensitif dikunci hanya untuk admin**, dan klien hanya bisa lewat route khusus yang menegakkan keanggotaan (chat, tracker, suka/komentar proyek). Collection yang aman dipakai langsung lewat REST (karya, proyek, peluang, profil) memakai access control per peran.

### Struktur direktori

```text
app/
  (site)/            halaman publik dan portal (siswa/guru), CSS per area
  (payload)/admin/   UI admin Payload
  (payload)/api/     endpoint (lihat API.md)
collections/         definisi collection Payload
components/          komponen UI (chat/, tracker/, payload/ untuk admin)
lib/                 helper server dan klien
migrations/          migrasi SQL manual + index.ts
scripts/             seed data
tests/               Vitest + harness
docs/                dokumentasi
```

---

## 4. Autentikasi dan otorisasi

Ada **dua sistem login terpisah**:

| | Website (siswa/guru) | Admin CMS |
| --- | --- | --- |
| Collection | `users` | `admins` |
| Halaman login | `/login` | `/admin/login` |
| Cookie | `karyakita-session` (httpOnly) | `payload-token` |
| Pemeriksaan | `authenticateWebsiteRequest` (`lib/websiteAuth.ts`) | Autentikasi Payload bawaan |

```mermaid
sequenceDiagram
    participant B as Browser
    participant L as POST /api/auth/login
    participant P as Payload
    participant R as route lain /api/*

    B->>L: email + kata sandi (header Origin diperiksa)
    L->>P: login collection users
    P-->>L: JWT
    L-->>B: Set-Cookie karyakita-session (httpOnly, sameSite=lax)
    B->>R: request + cookie
    R->>P: payload.auth(JWT)
    P-->>R: user (hanya role student/teacher diterima)
    R-->>B: data sesuai peran
```

Catch-all `/api/[...slug]` menerjemahkan cookie `karyakita-session` menjadi header otorisasi Payload sehingga formulir portal dapat memakai REST Payload dengan aturan akses collection.

### Matriks peran (ringkas)

| Sumber daya | Pengunjung | Siswa | Guru | Admin |
| --- | --- | --- | --- | --- |
| Karya/proyek terbit | baca | baca | baca | semua |
| Karya sendiri (draf) | - | CRUD, tidak bisa menerbitkan | - | semua |
| Verifikasi karya | - | - | dalam cakupan kelas/program | semua |
| Proyek | baca (terbit) | CRUD sebagai pengelola | tinjau bila diundang | semua |
| Suka/komentar | - | ya (tidak karya sendiri) | ya | moderasi |
| Voting award | - | ya (1 suara/award) | - | atur award |
| Peluang | baca (terbuka) | minat | CRUD | semua |
| Chat, tracker | - | anggota | anggota/mentor | via CMS |

Aturan rinci ada di `access` tiap file `collections/*.ts` dan di route handler.

---

## 5. Model data dan ERD

Semua tabel dikelola Payload (nama tabel snake_case dari slug). Field `array` dan `hasMany` menghasilkan tabel anak (`projects_members`, `users_interests`, dst.). Beberapa data ringan disimpan sebagai kolom `jsonb` (`project_tasks.assignees/labels/checklist`, `users.pinned_works`, `project_activity.meta`) agar tidak perlu tabel relasi tambahan.

### 5.1 Akademik, pengguna, dan karya

```mermaid
erDiagram
    PROGRAMS ||--o{ CLASSES : "memiliki"
    CLASSES ||--o{ STUDENTS : "berisi (data NIS resmi)"
    PROGRAMS ||--o{ USERS : "program"
    CLASSES ||--o{ USERS : "kelas"
    UPLOADS ||--o{ USERS : "foto profil, cover"
    USERS ||--o{ PORTFOLIOS : "siswa pemilik"
    USERS ||--o{ PORTFOLIOS : "diverifikasi oleh (guru)"
    PORTFOLIO_CATEGORIES ||--o{ PORTFOLIOS : "kategori"
    UPLOADS ||--o{ PORTFOLIOS : "sampul, galeri, berkas"
    PORTFOLIOS ||--o{ PORTFOLIO_REVIEWS : "tinjauan"
    USERS ||--o{ PORTFOLIO_REVIEWS : "guru peninjau"
    PORTFOLIOS ||--o{ PORTFOLIO_LIKES : ""
    PORTFOLIOS ||--o{ PORTFOLIO_COMMENTS : ""
    USERS ||--o{ PORTFOLIO_LIKES : ""
    USERS ||--o{ PORTFOLIO_COMMENTS : ""

    USERS {
        int id PK
        string email UK
        string role "student | teacher"
        string name
        string nis UK "siswa; harus ada di STUDENTS"
        int class_id FK
        int program_id FK
        jsonb pinned_works "maks 3 karya"
        timestamp last_seen_at
        bool show_presence
    }
    STUDENTS {
        int id PK
        string nis UK
        string name
        int class_id FK
    }
    PORTFOLIOS {
        int id PK
        string slug UK
        string title
        string status "draft | published"
        string verification_status "unreviewed | submitted | revision-requested | verified"
        int student_id FK
        int category_ref_id FK
        int verified_by_id FK
    }
    PORTFOLIO_LIKES {
        int id PK
        string like_key UK "karya:siswa"
    }
```

`USERS` menyimpan akun siswa dan guru dalam satu tabel (dibedakan `role`). `STUDENTS` adalah daftar resmi sekolah, terpisah dari akun; registrasi siswa memeriksa NIS di sini.

### 5.2 Proyek kolaborasi, penghargaan, dan peluang

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : "pengelola (created_by)"
    PROJECTS ||--o{ PROJECTS_MEMBERS : "anggota + kontribusi"
    USERS ||--o{ PROJECTS_MEMBERS : ""
    PROJECTS ||--o{ PROJECTS_MENTOR_ASSIGNMENTS : "undangan pembimbing"
    USERS ||--o{ PROJECTS_MENTOR_ASSIGNMENTS : "guru"
    PROJECTS ||--o{ PROJECTS_REVIEW_HISTORY : "riwayat tinjauan"
    PORTFOLIO_CATEGORIES ||--o{ PROJECTS : ""
    PROJECTS ||--o{ PROJECT_LIKES : ""
    PROJECTS ||--o{ PROJECT_COMMENTS : ""
    USERS ||--o{ PROJECT_LIKES : ""
    USERS ||--o{ PROJECT_COMMENTS : "penulis"

    AWARDS }o--o{ PORTFOLIOS : "nominasi"
    AWARDS ||--o{ AWARD_VOTES : ""
    PORTFOLIOS ||--o{ AWARD_VOTES : ""
    USERS ||--o{ AWARD_VOTES : "pemilih"
    USERS ||--o{ STUDENT_RECORDS : "pencapaian"
    PORTFOLIOS ||--o{ STUDENT_RECORDS : ""
    AWARDS ||--o{ STUDENT_RECORDS : ""

    PROGRAMS }o--o{ OPPORTUNITIES : "program sasaran"
    OPPORTUNITIES ||--o{ OPPORTUNITY_INTERESTS : ""
    USERS ||--o{ OPPORTUNITY_INTERESTS : "siswa"

    PROJECTS {
        int id PK
        string slug UK
        string status "draft | published"
        string verification_status
        int created_by_id FK
    }
    PROJECTS_MENTOR_ASSIGNMENTS {
        int mentor_id FK
        string assignment_role "primary | supporting"
        string response "invited | accepted | declined"
    }
    AWARDS {
        int id PK
        string status "draft | open | closed | announced"
        timestamp opens_at
        timestamp closes_at
    }
    AWARD_VOTES {
        string vote_key UK "satu suara per siswa per award"
    }
    OPPORTUNITY_INTERESTS {
        string interest_key UK
        string status "interested | contacted | completed"
    }
    STUDENT_RECORDS {
        string record_key UK "mencegah duplikat"
    }
```

### 5.3 Pesan (chat)

```mermaid
erDiagram
    CHAT_CONVERSATIONS ||--o{ CHAT_MEMBERS : "anggota"
    CHAT_CONVERSATIONS ||--o{ CHAT_MESSAGES : "pesan"
    USERS ||--o{ CHAT_MEMBERS : ""
    USERS ||--o{ CHAT_MESSAGES : "pengirim"
    USERS ||--o{ CHAT_CONVERSATIONS : "pembuat"
    UPLOADS ||--o{ CHAT_CONVERSATIONS : "foto grup/proyek"
    USERS ||--o{ CHAT_BLOCKS : "pemblokir"
    USERS ||--o{ CHAT_BLOCKS : "diblokir"
    CHAT_MESSAGES ||--o{ CHAT_REPORTS : ""
    USERS ||--o{ CHAT_REPORTS : "pelapor"

    CHAT_CONVERSATIONS {
        int id PK
        string ref_key UK "dm:1:2 | class:ID | project:ID | group:UUID"
        string kind "dm | group | class | project"
        string title
    }
    CHAT_MEMBERS {
        string role "owner | member"
        string status "invited | active | left"
        int last_read_id
    }
    CHAT_MESSAGES {
        int id PK
        string body "maks 2000 karakter"
        bool deleted
    }
```

Ruang `class:ID` dan `project:ID` dibuat lazily (`ensureRoom`); keanggotaannya diturunkan dari kelas pengguna atau tim proyek, bukan disimpan manual.

### 5.4 Tracker proyek

```mermaid
erDiagram
    PROJECTS ||--o{ PROJECT_TASKS : "tugas"
    USERS ||--o{ PROJECT_TASKS : "pembuat"
    PROJECT_TASKS ||--o{ PROJECT_TASK_COMMENTS : ""
    USERS ||--o{ PROJECT_TASK_COMMENTS : "penulis"
    PROJECTS ||--o{ PROJECT_ACTIVITY : "log"
    USERS ||--o{ PROJECT_ACTIVITY : "pelaku"
    PROJECT_TASKS ||--o{ PROJECT_ACTIVITY : "ref (meta)"

    PROJECT_TASKS {
        int id PK
        string title
        string status "todo | doing | review | done"
        string priority "low | medium | high | urgent"
        timestamp due_date
        int position
        jsonb assignees "ID pengguna"
        jsonb labels
        jsonb checklist
    }
    PROJECT_ACTIVITY {
        string action "task.created | task.updated | ..."
        string summary
        jsonb meta
    }
```

### 5.5 Konten beranda dan media

| Tabel | Isi | Relasi |
| --- | --- | --- |
| `home_banners` | Slide hero (`status`, `sort_order`) | `image_id` -> `uploads` |
| `testimonials` | Testimoni beranda | tanpa relasi |
| `uploads` | Metadata berkas (WebP, ukuran, titik fokus, `alt`) | direferensikan banyak tabel |
| `admins` | Akun CMS | terpisah dari `users` |

---

## 6. Alur status

### Karya

```mermaid
stateDiagram-v2
    [*] --> Draf: siswa menyimpan
    Draf --> MenungguVerifikasi: siswa mengajukan (butuh kategori + ringkasan)
    MenungguVerifikasi --> PerluRevisi: guru meminta revisi
    PerluRevisi --> MenungguVerifikasi: siswa memperbaiki dan mengajukan ulang
    MenungguVerifikasi --> Terbit: guru menyetujui (terverifikasi)
    Terbit --> Draf: siswa mengedit (perlu ditinjau ulang)
```

Draf yang belum diajukan bersifat pribadi: guru tidak melihatnya dan tidak bisa meninjau (409).

### Proyek (pembimbing dan verifikasi)

```mermaid
stateDiagram-v2
    [*] --> Draf
    Draf --> Draf: undang guru (invited)
    Draf --> Diajukan: pengelola mengajukan<br/>(mentor utama sudah accepted + ringkasan terisi)
    Diajukan --> Terbit: mentor utama "verified"
    Diajukan --> Draf: mentor utama "revision-requested"
    Terbit --> Draf: siswa mengedit
```

Mentor pendamping hanya dapat memberi komentar. Respons undangan (`accepted`/`declined`) hanya sekali.

### Award

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> open: admin membuka
    open --> closed: batas waktu / admin menutup
    closed --> announced: admin mengumumkan
```

Hasil suara (`/api/awards/[id]/results`) hanya terbuka setelah `announced`.

---

## 7. Alur data penting

### Memuat beranda

```mermaid
sequenceDiagram
    participant B as Browser
    participant F as GET /api/community/feed
    participant L as GET /api/community/leaderboard
    participant DB as PostgreSQL
    B->>F: (paralel)
    B->>L: (paralel)
    par feed: satu gelombang
        F->>DB: karya, award, proyek, peluang, banner, testimoni
        F->>DB: group-by suka dan komentar (karya + proyek)
    end
    F-->>B: JSON + Cache-Control s-maxage=30
    L->>L: cache memori 30 dtk + dedupe permintaan
    L->>DB: (hanya bila kedaluwarsa) agregat
    L-->>B: papan peringkat
```

### Mengajukan dan memverifikasi karya

```mermaid
sequenceDiagram
    participant S as Siswa
    participant R as REST /api/portfolios
    participant T as Guru
    participant M as POST /api/mentor/reviews
    participant DB as PostgreSQL
    S->>R: PATCH verificationStatus=submitted
    R->>DB: validasi hook (kategori + ringkasan wajib)
    T->>M: { portfolio, decision, feedback }
    M->>DB: cek cakupan kelas/program guru
    alt verified
        M->>DB: status=published, verifiedBy, simpan tinjauan
    else revision-requested
        M->>DB: status tetap draf, simpan umpan balik
    end
    Note over S: notifikasi turunan dari status saat ini<br/>(tanpa tabel notifikasi)
```

### Upload gambar

```mermaid
flowchart LR
    U["Upload (JPG/PNG/WebP)"] --> O["Putar sesuai EXIF"] --> R["Perkecil maks 2400px<br/>tanpa memperbesar"] --> W["Konversi WebP q82"] --> A["Alt otomatis<br/>bila kosong"] --> B[("Vercel Blob")]
```

---

## 8. Performa dan caching

Biaya utama di lingkungan serverless adalah **round trip ke database**, bukan CPU. Pola yang dipakai:

| Teknik | Tempat | Efek |
| --- | --- | --- |
| Query independen dijalankan paralel (`Promise.all`) | semua route baca | satu "gelombang" round trip |
| `pagination: false` | daftar yang tidak butuh total | melewati query `count` |
| SQL group-by | `lib/dbCounts.ts` (`groupCount`, `awardVoteCounts`, `unreadByConversation`) | hitungan suka/komentar/belum dibaca dalam satu query |
| Cache memori + dedupe | `/api/community/leaderboard` | hitung ulang paling cepat tiap 30 dtk, permintaan bersamaan berbagi satu perhitungan |
| `Cache-Control: public, s-maxage=30, stale-while-revalidate=300` | endpoint publik | CDN menyajikan cache |
| Polling gabungan | `/api/portal/pulse` | satu request menggantikan tiga polling |
| Pooler transaction mode | `DATABASE_URL` port 6543 | banyak fungsi serverless berbagi koneksi |

Catatan: cache memori bersifat per instance serverless, jadi hanya mengurangi beban, bukan jaminan konsistensi global.

---

## 9. Deployment

```mermaid
flowchart LR
    DEV["Developer<br/>git push"] --> GH["Repository Git"]
    GH --> VB["Vercel build<br/>next build"]
    VB --> FN["Serverless Functions<br/>region hnd1"]
    VB --> ST["Aset statis / CDN"]
    ENV["Environment variables<br/>(Vercel)"] --> FN
    FN --> POOL["Supabase pooler :6543"] --> PG[("PostgreSQL")]
    FN --> BLOB[("Vercel Blob")]
    MIG["Migrasi manual<br/>npm run payload -- migrate<br/>(session pooler :5432, dari mesin lokal)"] --> PG
```

### Environment variables

| Variabel | Kegunaan |
| --- | --- |
| `DATABASE_URL` | Koneksi PostgreSQL. **Vercel: Transaction Pooler port 6543.** Lokal / menjalankan migrasi: Session Pooler port 5432 |
| `DATABASE_POOL_MAX` | Batas koneksi per fungsi (Vercel: 10; bawaan 5) |
| `PAYLOAD_SECRET` | Secret token dan keamanan Payload |
| `NEXT_PUBLIC_SERVER_URL` | URL dasar aplikasi |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob (mengaktifkan penyimpanan Blob) |
| `CMS_ADMIN_EMAIL` / `CMS_ADMIN_PASSWORD` / `CMS_ADMIN_NAME` | Hanya untuk `seed:cms-admin` |

Nilai secret tidak boleh masuk Git; `.env.example` hanya berisi templat.

### Lingkungan

| | Lokal | Produksi (Vercel) |
| --- | --- | --- |
| Perintah | `npm run dev` | build `next build` |
| Database | pooler :5432 (session) | pooler :6543 (transaction) |
| Upload | Blob bila token diisi, jika tidak URL `/media` | Vercel Blob |
| Region fungsi | lokal | `hnd1` (`vercel.json`) |

Region fungsi sebaiknya dekat dengan region project Supabase; jarak antar keduanya langsung menambah latensi setiap query.

### Urutan rilis yang aman

1. Terapkan migrasi baru ke database (`migrate:status` lalu `migrate`) **sebelum** kode yang memakainya dideploy. Migrasi bersifat aditif (tabel/kolom baru) sehingga kode lama tetap berjalan.
2. Pastikan environment variables Vercel sudah benar.
3. Push ke branch yang terhubung; Vercel membangun dan mendeploy.
4. Verifikasi beranda, `/admin/login`, feed, leaderboard, dan upload.

---

## 10. Migrasi database

- **Schema push dimatikan** (`push: false` di `payload.config.ts`). Alasannya: skema lokal tanpa plugin Blob tidak memuat kolom internal `_objectkey`, sehingga push otomatis bisa menghapusnya dari database bersama.
- Setiap perubahan collection **harus** disertai file migrasi di `migrations/` dan entri di `migrations/index.ts` (urutan menurut nama berkas).
- Collection baru juga menambah kolom `<slug>_id` (dengan FK dan indeks) pada `payload_locked_documents_rels`; jika terlupa, halaman admin collection itu error "column ... does not exist".
- Migrasi yang ada **bukan baseline lengkap** untuk database kosong; database baru memerlukan inisialisasi skema awal yang direncanakan.
- Jalankan migrasi lewat Session Pooler (port 5432). Perintah `migrate` di mode dev dapat menampilkan prompt konfirmasi "data loss" dari push dev; jangan dijawab otomatis, periksa penyebabnya lebih dulu.

Kronologi migrasi (kelompok): Blob key, review portofolio, detail dan galeri portofolio, proyek dan mentor, home banner, kategori, draf, testimoni, tampilan profil, karya semat, chat, tracker, sosial proyek.

---

## 11. Keamanan

| Aspek | Penerapan |
| --- | --- |
| Pemisahan login | `users` (website) dan `admins` (CMS) terpisah; siswa/guru tidak bisa masuk CMS |
| Sesi | JWT di cookie httpOnly, `sameSite=lax`, `secure` di produksi |
| CSRF | login/register memeriksa header `Origin` sama dengan origin server |
| Otorisasi | access control per collection + pemeriksaan keanggotaan di route khusus |
| Pembatasan field | hook mencegah siswa mengubah role, NIS, kelas/program, status verifikasi/penerbitan, dan identitas penulis/pemilik |
| Data privat | draf karya/proyek, umpan balik, riwayat tinjauan hanya untuk pemilik dan guru yang berwenang |
| Pembatasan laju | chat 25 pesan/menit, komentar proyek 8/menit, catch-all REST |
| Privasi presence | pengguna dapat menyembunyikan status online |
| Moderasi chat | blokir pengguna dan laporan pesan |
| Rahasia | disimpan di environment variables, bukan di kode |
| Integritas | kunci unik (`like_key`, `vote_key`, `interest_key`, `record_key`, `ref_key`) mencegah duplikat meski ada permintaan bersamaan |

---

## 12. Batasan dan hal yang perlu diketahui

- **Polling, bukan WebSocket.** Pesan dan notifikasi tertunda sesuai interval polling; beban database naik seiring jumlah pengguna online.
- **Notifikasi tidak disimpan.** Daftar dibuat dari status data saat ini; status "sudah dibaca" hanya di `localStorage` per browser.
- **Cache memori per instance.** Leaderboard dapat berbeda sedikit antar instance dalam jendela 30 detik.
- **Satu database untuk semua lingkungan** bila `DATABASE_URL` yang sama dipakai. Test berjalan di database itu (dibungkus transaksi yang di-rollback); jangan arahkan ke produksi tanpa pertimbangan.
- **Hitungan SQL mentah di test.** `lib/dbCounts.ts` memakai `payload.db.drizzle` langsung; harness test mengarahkannya ke transaksi test aktif (lihat [TESTING.md](TESTING.md)). Query SQL baru di luar API Payload perlu memakai jalur yang sama agar teruji.
- **Skema awal belum dapat dibuat dari nol** hanya dengan migrasi yang ada.
- **Kapasitas koneksi.** `DATABASE_POOL_MAX` dikalikan jumlah instance serverless aktif harus tetap di bawah batas pooler Supabase.
