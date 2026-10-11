import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'

const banners = [
  {
    eyebrow: 'TEL-CREATION · KARYA SISWA',
    title: 'Dari ruang belajar ke panggung karya',
    description: 'Jelajahi ide dan karya siswa Telkom yang tumbuh dari lima program keahlian.',
    primaryButtonLabel: 'Jelajahi karya',
    primaryButtonUrl: '/karya',
    secondaryButtonLabel: 'Lihat proyek bersama',
    secondaryButtonUrl: '/proyek',
  },
  {
    eyebrow: 'TEL-CREATION · INOVASI DIGITAL',
    title: 'Ide teknologi, dampak nyata',
    description: 'Temukan kolaborasi siswa dalam jaringan, aplikasi, gim, desain, dan solusi digital.',
    primaryButtonLabel: 'Lihat proyek',
    primaryButtonUrl: '/proyek',
    secondaryButtonLabel: 'Temukan peluang',
    secondaryButtonUrl: '/peluang',
  },
  {
    eyebrow: 'TEL-CREATION · CERITA KREATOR',
    title: 'Setiap karya punya cerita',
    description: 'Kenali siswa di balik setiap karya dan ikuti perjalanan kompetensi mereka.',
    primaryButtonLabel: 'Lihat kreator pilihan',
    primaryButtonUrl: '/leaderboard',
    secondaryButtonLabel: 'Lihat semua karya',
    secondaryButtonUrl: '/karya',
  },
]

async function main() {
  loadEnv()
  const config = (await import('../payload.config.ts')).default
  const payload = await getPayload({ config })

  try {
    let created = 0
    let updated = 0
    for (const [index, banner] of banners.entries()) {
      const existing = await payload.find({
        collection: 'home-banners',
        where: { title: { equals: banner.title } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const data = { ...banner, sortOrder: index + 1, status: 'published' as const }
      if (existing.docs[0]) {
        await payload.update({ collection: 'home-banners', id: existing.docs[0].id, data, overrideAccess: true })
        updated += 1
      } else {
        await payload.create({ collection: 'home-banners', data, overrideAccess: true })
        created += 1
      }
    }
    console.info(`Seeding banner selesai: ${created} dibuat, ${updated} diperbarui, ${banners.length} tayang. Gambar opsional; banner tanpa gambar menggunakan skeleton.`)
  } finally {
    await Promise.race([
      payload.destroy(),
      new Promise<void>((resolve) => { const timeout = setTimeout(resolve, 2500); timeout.unref() }),
    ])
  }
}

void main().then(() => process.exit(0), (error: unknown) => { console.error(error); process.exit(1) })
