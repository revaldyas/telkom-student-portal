import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const coverDirectory = fileURLToPath(new URL('../public/demo-covers/', import.meta.url))
const categories = [
  { name: 'Produk Digital · UI/UX', code: 'UI/UX', prefix: '01', cover: 'ui-ux.webp', tools: ['Figma', 'FigJam'] },
  { name: 'Web & Aplikasi', code: 'Web Development', prefix: '02', cover: 'web-app.webp', tools: ['Figma', 'Next.js'] },
  { name: 'Brand Identity', code: 'Branding', prefix: '03', cover: 'brand-identity.webp', tools: ['Illustrator', 'Photoshop'] },
  { name: 'Graphic Design', code: 'Graphic Design', prefix: '04', cover: 'graphic-design.webp', tools: ['Illustrator', 'Photoshop'] },
  { name: 'Fotografi', code: 'Photography', prefix: '05', cover: 'photography.webp', tools: ['Kamera digital', 'Lightroom'] },
  { name: 'Motion & Animasi', code: 'Motion', prefix: '06', cover: 'motion-design.webp', tools: ['After Effects', 'Illustrator'] },
]

const titleSets = [
  ['RuangRasa', 'Teman Belajar', 'Langkah Sehat', 'Jelajah Kota', 'Kantin Kita', 'Baca Bareng', 'Ruang Musik', 'TemuKarya', 'Pilah Yuk', 'Cerita Nusantara'],
  ['Katalog Karya Lokal', 'Dashboard Peminjaman Lab', 'Portal Klub Kreatif', 'Website Jelajah Bandung', 'Aplikasi Jadwal Belajar', 'Toko Roti Sore', 'Portal Info Sekolah', 'Sistem Reservasi Studio', 'Katalog Buku Digital', 'Aplikasi Teman Nabung'],
  ['Identitas Kopi Senja', 'Rona Botanika', 'Saku Studio', 'Laras Skincare', 'Kelana Outdoor', 'Bumi Rempah', 'Nadi Creative', 'Sore Ceria', 'Ruang Bercerita', 'Satu Arah'],
  ['Poster Festival Suara', 'Kampanye Bawa Tumbler', 'Sampul Cerita Kota', 'Tipografi Hari Bahasa', 'Poster Pasar Kreatif', 'Seri Ilustrasi Flora', 'Infografik Aman Digital', 'Zine Ruang Muda', 'Kalender Budaya', 'Kemasan Jajan Pasar'],
  ['Senja di Braga', 'Wajah Pagi', 'Ruang dan Cahaya', 'Pasar Setelah Hujan', 'Cerita di Halte', 'Teduh di Taman', 'Ritme Kota', 'Rumah yang Hangat', 'Langit dari Jendela', 'Gerak dan Hening'],
  ['Logo yang Menari', 'Rona Bergerak', 'Satu Menit di Kota', 'Pola Nusantara', 'Kopi dalam Gerak', 'Festival Cahaya', 'Cerita dalam 15 Detik', 'Bentuk dan Bunyi', 'Animasi Teman Bumi', 'Intro Karya Kita'],
]

const summaries = [
  'Rancangan pengalaman digital yang membantu pengguna menemukan informasi dengan lebih mudah. Proyek ini berangkat dari riset sederhana, dilanjutkan dengan wireframe, uji alur, dan perapian antarmuka.',
  'Konsep situs dan aplikasi responsif untuk kebutuhan sehari-hari. Proyek mencakup pemetaan halaman, rancangan antarmuka, serta komponen yang konsisten di perangkat desktop dan ponsel.',
  'Eksplorasi identitas visual untuk brand lokal dengan karakter yang ramah dan mudah dikenali. Sistemnya mencakup logo, warna, tipografi, dan contoh penerapan pada media pilihan.',
  'Seri desain grafis yang menggabungkan ilustrasi, warna, dan tipografi untuk menyampaikan pesan secara jelas. Karya ini disiapkan sebagai materi kampanye dan publikasi.',
  'Seri fotografi yang merekam suasana, detail, dan cerita dari lingkungan sekitar. Pemilihan cahaya dan komposisi dibuat untuk menjaga nuansa tiap foto tetap terasa alami.',
  'Eksperimen animasi singkat yang menggabungkan bentuk, tipografi, dan transisi. Proyek ini mengeksplorasi ritme visual agar pesan tetap mudah diikuti dalam durasi pendek.',
]

const slugify = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function main() {
  loadEnv()
  const config = (await import('../payload.config.ts')).default
  const payload = await getPayload({ config })

  try {
    const studentResponse = await payload.find({ collection: 'students', limit: 1000, pagination: false, overrideAccess: true })
    const students = studentResponse.docs
      .filter((student) => student.nis.startsWith('SAMPLE-'))
      .sort((a, b) => a.nis.localeCompare(b.nis))
    if (students.length !== 25) throw new Error(`Dibutuhkan tepat 25 data siswa contoh; ditemukan ${students.length}. Jalankan seed:students terlebih dahulu.`)

    const categoryResponse = await payload.find({ collection: 'portfolio-categories', limit: 100, pagination: false, overrideAccess: true })
    const categoryIDs = new Map(categoryResponse.docs.map((category) => [category.code, category.id]))
    for (const category of categories) {
      if (!categoryIDs.has(category.code)) throw new Error(`Kategori ${category.name} belum ada. Jalankan seed:categories terlebih dahulu.`)
      for (let sampleIndex = 0; sampleIndex < 10; sampleIndex += 1) {
        const imageName = sampleIndex === 0 ? category.cover : `${category.prefix}-${String(sampleIndex + 1).padStart(2, '0')}.webp`
        if (!existsSync(`${coverDirectory}${imageName}`)) throw new Error(`Gambar demo tidak ditemukan: ${coverDirectory}${imageName}`)
      }
    }

    const userIDs = new Map<string, string | number>()
    let usersCreated = 0
    for (const student of students) {
      const existingUser = await payload.find({
        collection: 'users',
        where: { nis: { equals: student.nis } },
        limit: 1,
        overrideAccess: true,
      })
      if (existingUser.docs[0]) {
        if (existingUser.docs[0].role !== 'student') throw new Error(`NIS ${student.nis} sudah digunakan akun selain siswa.`)
        userIDs.set(student.nis, existingUser.docs[0].id)
        continue
      }

      const classID = typeof student.class === 'object' ? student.class.id : student.class
      const user = await payload.create({
        collection: 'users',
        data: {
          name: student.name,
          email: `demo.${student.nis.toLowerCase()}@karyakita.local`,
          password: 'KaryaDemo!2026',
          role: 'student',
          nis: student.nis,
          class: classID,
        },
        overrideAccess: true,
      })
      userIDs.set(student.nis, user.id)
      usersCreated += 1
    }

    let created = 0
    let updated = 0
    let uploadCount = 0
    for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex += 1) {
      const category = categories[categoryIndex]
      const categoryID = categoryIDs.get(category.code)!
      for (let sampleIndex = 0; sampleIndex < 10; sampleIndex += 1) {
        const student = students[(categoryIndex * 10 + sampleIndex) % students.length]
        const userID = userIDs.get(student.nis)
        if (userID === undefined) throw new Error(`Akun demo untuk ${student.nis} belum tersedia.`)
        const title = `${titleSets[categoryIndex][sampleIndex]} — ${student.name}`
        const slug = slugify(title)
        const imageName = sampleIndex === 0 ? category.cover : `${category.prefix}-${String(sampleIndex + 1).padStart(2, '0')}.webp`
        const filePath = `${coverDirectory}${imageName}`
        const existingUpload = await payload.find({
          collection: 'uploads',
          where: { alt: { equals: `Sampul demo: ${title}` } },
          limit: 1,
          overrideAccess: true,
        })
        const upload = existingUpload.docs[0] ?? await payload.create({
          collection: 'uploads',
          data: { alt: `Sampul demo: ${title}` },
          filePath,
          overrideAccess: true,
        })
        if (!existingUpload.docs[0]) uploadCount += 1

        const existingPortfolio = await payload.find({
          collection: 'portfolios',
          where: { slug: { equals: slug } },
          limit: 1,
          overrideAccess: true,
        })
        const data = {
          title,
          slug,
          student: userID,
          categoryRef: categoryID,
          category: category.code,
          summary: summaries[categoryIndex],
          coverImage: upload.id,
          year: new Date().getFullYear(),
          tools: category.tools,
          status: 'published' as const,
          featured: sampleIndex === 0,
        }
        if (existingPortfolio.docs[0]) {
          await payload.update({ collection: 'portfolios', id: existingPortfolio.docs[0].id, data, overrideAccess: true })
          updated += 1
        } else {
          await payload.create({ collection: 'portfolios', data, overrideAccess: true })
          created += 1
        }
      }
    }

    console.info(`Seeding selesai: ${usersCreated} akun siswa demo dibuat, 60 portofolio (${created} baru, ${updated} diperbarui), ${uploadCount} gambar diunggah.`)
  } finally {
    await Promise.race([
      payload.destroy(),
      new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 2500)
        timeout.unref()
      }),
    ])
  }
}

void main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error)
    process.exit(1)
  },
)
