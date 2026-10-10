import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'

const awards = [
  {
    title: 'Web Portofolio Terbaik 2026',
    description: 'Apresiasi untuk karya web dengan pengalaman pengguna, visual, dan implementasi paling matang. Pilih satu karya favoritmu.',
  },
  {
    title: 'Pilihan Komunitas 2026',
    description: 'Penghargaan untuk karya yang paling menarik perhatian dan menginspirasi komunitas siswa. Dukung karya pilihanmu lewat voting.',
  },
]

async function main() {
  loadEnv()
  const config = (await import('../payload.config.ts')).default
  const payload = await getPayload({ config })

  try {
    const portfolioResponse = await payload.find({
      collection: 'portfolios',
      where: { status: { equals: 'published' } },
      depth: 0,
      limit: 1000,
      pagination: false,
      overrideAccess: true,
    })
    const nominees = portfolioResponse.docs.slice(0, 5).map((portfolio) => portfolio.id)
    if (nominees.length < 2) {
      throw new Error(`Dibutuhkan minimal 2 karya terbit sebagai nominasi; ditemukan ${nominees.length}.`)
    }

    const now = Date.now()
    const opensAt = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
    const closesAt = new Date(now + 21 * 24 * 60 * 60 * 1000).toISOString()

    for (const [index, award] of awards.entries()) {
      const existing = await payload.find({
        collection: 'awards',
        where: { title: { equals: award.title } },
        limit: 1,
        overrideAccess: true,
      })
      const data = {
        ...award,
        opensAt,
        closesAt,
        status: 'open' as const,
        nominees: index === 0 ? nominees : [...nominees].reverse(),
      }

      if (existing.docs[0]) {
        await payload.update({ collection: 'awards', id: existing.docs[0].id, data, overrideAccess: true })
      } else {
        await payload.create({ collection: 'awards', data, overrideAccess: true })
      }
    }

    console.info(`Seeding selesai: ${awards.length} penghargaan aktif dengan ${nominees.length} nominasi masing-masing.`)
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
