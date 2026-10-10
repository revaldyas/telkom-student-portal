import { getPayload } from 'payload'
import { loadEnv } from 'payload/node'

const samplePrefix = 'SAMPLE-'

const commentTemplates = [
  'Palet warnanya terasa pas dan mendukung suasana karya ini.',
  'Detailnya rapi, terutama cara elemen visualnya disusun.',
  'Idenya menarik dan penyampaiannya mudah dipahami.',
  'Bagian favoritku ada di komposisi dan pilihan tipografinya.',
  'Karyanya terasa matang. Proses eksplorasinya terlihat.',
  'Transisi dan ritmenya enak diikuti sampai akhir.',
  'Tampilannya sederhana, tapi pesannya tetap kuat.',
]

const idOf = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return undefined
}

async function main() {
  loadEnv()
  const config = (await import('../payload.config.ts')).default
  const payload = await getPayload({ config })

  try {
    const userResponse = await payload.find({
      collection: 'users',
      where: { and: [{ role: { equals: 'student' } }, { nis: { like: `${samplePrefix}%` } }] },
      limit: 1000,
      pagination: false,
      overrideAccess: true,
    })
    const demoUsers = userResponse.docs
      .filter((user) => user.nis?.startsWith(samplePrefix))
      .sort((a, b) => a.nis.localeCompare(b.nis))

    if (demoUsers.length !== 25) {
      throw new Error(`Dibutuhkan 25 akun siswa demo dengan NIS SAMPLE-; ditemukan ${demoUsers.length}.`)
    }

    const demoUserIDs = new Set(demoUsers.map((user) => String(user.id)))
    const portfolioResponse = await payload.find({
      collection: 'portfolios',
      where: { status: { equals: 'published' } },
      depth: 1,
      limit: 1000,
      pagination: false,
      overrideAccess: true,
    })
    const demoPortfolios = portfolioResponse.docs
      .filter((portfolio) => demoUserIDs.has(idOf(portfolio.student) || ''))
      .sort((a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true }))

    if (demoPortfolios.length < 10) {
      throw new Error(`Dibutuhkan minimal 10 karya demo yang sudah terbit; ditemukan ${demoPortfolios.length}. Jalankan seed:portfolios terlebih dahulu.`)
    }

    const portfolioIDs = demoPortfolios.map((portfolio) => portfolio.id)
    const [likeResponse, commentResponse] = await Promise.all([
      payload.find({
        collection: 'portfolio-likes',
        where: { portfolio: { in: portfolioIDs } },
        limit: 10000,
        pagination: false,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'portfolio-comments',
        where: { portfolio: { in: portfolioIDs } },
        limit: 10000,
        pagination: false,
        overrideAccess: true,
      }),
    ])

    const existingLikes = new Set(likeResponse.docs.flatMap((like) => [
      `${idOf(like.portfolio)}:${idOf(like.student)}`,
      like.likeKey,
    ].filter((key): key is string => typeof key === 'string' && key.length > 0)))
    const existingComments = new Set(commentResponse.docs.map((comment) => `${idOf(comment.portfolio)}:${idOf(comment.student)}:${comment.content}`))
    let likesCreated = 0
    let commentsCreated = 0

    for (let userIndex = 0; userIndex < demoUsers.length; userIndex += 1) {
      const user = demoUsers[userIndex]
      const userID = String(user.id)
      const actor = { ...user, collection: 'users' }
      const ownPortfolioIDs = new Set(demoPortfolios
        .filter((portfolio) => idOf(portfolio.student) === userID)
        .map((portfolio) => String(portfolio.id)))

      // Jumlah berbeda per siswa membuat posisi leaderboard terlihat bertingkat.
      const likeTarget = 3 + (userIndex % 7) * 2
      let likesForUser = 0
      for (let offset = 0; offset < demoPortfolios.length && likesForUser < likeTarget; offset += 1) {
        const portfolio = demoPortfolios[(userIndex * 17 + offset * 11) % demoPortfolios.length]
        const portfolioID = String(portfolio.id)
        const likeKey = `${portfolioID}:${userID}`
        if (ownPortfolioIDs.has(portfolioID) || existingLikes.has(likeKey)) continue

        const existingLike = await payload.find({
          collection: 'portfolio-likes',
          where: { likeKey: { equals: likeKey } },
          limit: 1,
          overrideAccess: true,
        })
        if (existingLike.docs.length) {
          existingLikes.add(likeKey)
          continue
        }

        await payload.create({
          collection: 'portfolio-likes',
          data: { portfolio: portfolio.id, student: user.id, likeKey },
          user: actor,
          overrideAccess: true,
        })
        existingLikes.add(likeKey)
        likesForUser += 1
        likesCreated += 1
      }

      const commentTarget = 1 + ((userIndex * 3) % 7)
      let commentsForUser = 0
      for (let offset = 0; offset < demoPortfolios.length && commentsForUser < commentTarget; offset += 1) {
        const portfolio = demoPortfolios[(userIndex * 13 + offset * 7) % demoPortfolios.length]
        const portfolioID = String(portfolio.id)
        if (ownPortfolioIDs.has(portfolioID)) continue

        const content = `${commentTemplates[(userIndex + offset) % commentTemplates.length]} (${portfolio.title})`
        const commentKey = `${portfolioID}:${userID}:${content}`
        if (existingComments.has(commentKey)) continue

        await payload.create({
          collection: 'portfolio-comments',
          data: { portfolio: portfolio.id, student: user.id, content },
          user: actor,
          overrideAccess: true,
        })
        existingComments.add(commentKey)
        commentsForUser += 1
        commentsCreated += 1
      }
    }

    console.info(`Seed interaksi selesai: ${likesCreated} suka dan ${commentsCreated} komentar baru untuk ${demoUsers.length} akun siswa demo.`)
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
