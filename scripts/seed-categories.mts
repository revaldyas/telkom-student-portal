import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'

const categories = [
  { name: 'Produk Digital · UI/UX', code: 'UI/UX' },
  { name: 'Web & Aplikasi', code: 'Web Development' },
  { name: 'Brand Identity', code: 'Branding' },
  { name: 'Graphic Design', code: 'Graphic Design' },
  { name: 'Fotografi', code: 'Photography' },
  { name: 'Motion & Animasi', code: 'Motion' },
]

async function main() {
  loadEnv()
  const config = (await import('../payload.config.ts')).default
  const payload = await getPayload({ config })

  try {
    const categoryIDs = new Map<string, string | number>()

    for (const category of categories) {
      const existing = await payload.find({
        collection: 'portfolio-categories',
        where: { code: { equals: category.code } },
        limit: 1,
        overrideAccess: true,
      })
      const record = existing.docs[0] ?? await payload.create({
        collection: 'portfolio-categories',
        data: category,
        overrideAccess: true,
      })
      categoryIDs.set(category.code, record.id)
    }

    const portfolios = await payload.find({
      collection: 'portfolios',
      limit: 1000,
      pagination: false,
      overrideAccess: true,
    })
    let migrated = 0

    for (const portfolio of portfolios.docs) {
      const categoryRef = portfolio.categoryRef
      const legacyCategory = portfolio.category
      if (categoryRef || typeof legacyCategory !== 'string') continue

      const categoryID = categoryIDs.get(legacyCategory)
      if (categoryID === undefined) continue

      await payload.update({
        collection: 'portfolios',
        id: portfolio.id,
        data: { categoryRef: categoryID },
        overrideAccess: true,
      })
      migrated += 1
    }

    console.info(`Seeding selesai: ${categories.length} kategori, ${migrated} portofolio diperbarui.`)
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
