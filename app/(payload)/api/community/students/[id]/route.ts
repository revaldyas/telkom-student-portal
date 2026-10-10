import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

const idOf = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return undefined
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  try {
    const student = await payload.findByID({ collection: 'users', id, depth: 1, overrideAccess: true })
    if (student.role !== 'student') return NextResponse.json({ message: 'Profil siswa tidak ditemukan.' }, { status: 404 })
    const portfoliosResponse = await payload.find({
      collection: 'portfolios',
      where: { and: [{ student: { equals: student.id } }, { status: { equals: 'published' } }] },
      depth: 2,
      limit: 1000,
      sort: '-createdAt',
      overrideAccess: true,
    })
    const portfolios = await Promise.all(portfoliosResponse.docs.map(async (portfolio) => {
      const [likes, comments] = await Promise.all([
        payload.count({ collection: 'portfolio-likes', where: { portfolio: { equals: portfolio.id } }, overrideAccess: true }),
        payload.count({ collection: 'portfolio-comments', where: { portfolio: { equals: portfolio.id } }, overrideAccess: true }),
      ])
      const author = typeof portfolio.student === 'object' ? portfolio.student : null
      const category = typeof portfolio.categoryRef === 'object' ? portfolio.categoryRef : null
      const cover = typeof portfolio.coverImage === 'object' ? portfolio.coverImage : null
      return {
        id: portfolio.id,
        slug: portfolio.slug,
        title: portfolio.title,
        summary: portfolio.summary,
        year: portfolio.year,
        projectUrl: portfolio.projectUrl,
        tools: portfolio.tools,
        categoryRef: category ? { name: category.name, code: category.code } : null,
        coverImage: cover ? { url: cover.url, alt: cover.alt } : null,
        student: author ? { id: author.id, name: author.name } : null,
        likeCount: likes.totalDocs,
        commentCount: comments.totalDocs,
      }
    }))

    const awardResponse = await payload.find({
      collection: 'awards',
      where: { status: { not_equals: 'draft' } },
      depth: 2,
      limit: 1000,
      overrideAccess: true,
    })
    const ownPortfolioIds = new Set(portfolios.map((portfolio) => String(portfolio.id)))
    const nomineeAwards: { id: string | number; title: string; portfolio: string }[] = []
    const winningAwards: { id: string | number; title: string }[] = []

    for (const award of awardResponse.docs) {
      const nominees = Array.isArray(award.nominees) ? award.nominees : []
      const ownNominees = nominees.filter((nominee) => ownPortfolioIds.has(String(idOf(nominee))))
      ownNominees.forEach((nominee) => nomineeAwards.push({ id: award.id, title: award.title, portfolio: String(idOf(nominee)) }))
      if (award.status !== 'announced' || nominees.length === 0) continue

      const voteTotals = await Promise.all(nominees.map(async (nominee) => {
        const portfolioID = idOf(nominee)
        if (!portfolioID) return { portfolioID: '', votes: 0 }
        const count = await payload.count({
          collection: 'award-votes',
          where: { and: [{ award: { equals: award.id } }, { portfolio: { equals: portfolioID } }] },
          overrideAccess: true,
        })
        return { portfolioID, votes: count.totalDocs }
      }))
      const maxVotes = Math.max(...voteTotals.map((entry) => entry.votes))
      if (maxVotes > 0 && voteTotals.some((entry) => entry.votes === maxVotes && ownPortfolioIds.has(entry.portfolioID))) {
        winningAwards.push({ id: award.id, title: award.title })
      }
    }
    const nomineePortfolioIDs = new Set(nomineeAwards.map((award) => award.portfolio))
    const portfoliosWithNomineeStatus = portfolios.map((portfolio) => ({
      ...portfolio,
      isNominee: nomineePortfolioIDs.has(String(portfolio.id)),
    }))

    const totalLikes = portfolios.reduce((sum, portfolio) => sum + portfolio.likeCount, 0)
    const totalComments = portfolios.reduce((sum, portfolio) => sum + portfolio.commentCount, 0)
    const badges = portfolios.flatMap((portfolio) => [
      ...(portfolio.likeCount > 50 ? [{ id: `likes-${portfolio.id}`, name: 'Api Menyala', description: 'Satu karya menembus 50 suka.', portfolio: portfolio.title }] : []),
      ...(portfolio.likeCount > 200 ? [{ id: `likes-200-${portfolio.id}`, name: 'Orbit Komunitas', description: 'Satu karya menembus 200 suka.', portfolio: portfolio.title }] : []),
      ...(portfolio.commentCount > 25 ? [{ id: `comments-${portfolio.id}`, name: 'Pemantik Diskusi', description: 'Satu karya memicu lebih dari 25 komentar.', portfolio: portfolio.title }] : []),
    ])
    const recordsResponse = await payload.find({
      collection: 'student-records',
      where: { student: { equals: student.id } },
      depth: 1,
      limit: 1000,
      sort: '-earnedAt',
      overrideAccess: true,
    })
    const records = recordsResponse.docs.map((record) => ({
      id: record.id,
      recordType: record.recordType,
      code: record.code,
      title: record.title,
      description: record.description || '',
      rank: record.rank || null,
      earnedAt: record.earnedAt,
      portfolio: typeof record.portfolio === 'object' && record.portfolio ? { id: record.portfolio.id, title: record.portfolio.title } : null,
      award: typeof record.award === 'object' && record.award ? { id: record.award.id, title: record.award.title } : null,
    }))

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        bio: student.bio || null,
        profilePhoto: typeof student.profilePhoto === 'object' ? student.profilePhoto?.url || null : null,
        class: typeof student.class === 'object' ? student.class?.name || null : null,
        program: typeof student.program === 'object' ? student.program?.name || null : null,
      },
      totals: { likes: totalLikes, comments: totalComments, portfolios: portfolios.length },
      portfolios: portfoliosWithNomineeStatus,
      nomineeAwards,
      winningAwards,
      badges,
      records,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'Profil siswa tidak ditemukan.' }, { status: 404 })
  }
}
