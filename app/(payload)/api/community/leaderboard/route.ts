import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

type StudentTotal = {
  id: string
  name: string
  profilePhoto: string | null
  likes: number
  comments: number
  karya: number
}

const idOf = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return undefined
}

export async function GET() {
  const payload = await getPayload({ config })
  const portfolios = await payload.find({
    collection: 'portfolios',
    where: { status: { equals: 'published' } },
    depth: 2,
    limit: 1000,
    overrideAccess: true,
  })

  const portfolioIDs = portfolios.docs.map((portfolio) => portfolio.id)
  const collectCounts = async (collection: 'portfolio-likes' | 'portfolio-comments') => {
    const counts = new Map<string, number>()
    if (!portfolioIDs.length) return counts
    let page = 1
    let hasNextPage = true
    while (hasNextPage) {
      const result = await payload.find({
        collection,
        where: { portfolio: { in: portfolioIDs } },
        depth: 0,
        limit: 1000,
        page,
        overrideAccess: true,
      })
      for (const item of result.docs) {
        const portfolioID = idOf(item.portfolio)
        if (portfolioID) counts.set(portfolioID, (counts.get(portfolioID) || 0) + 1)
      }
      hasNextPage = result.hasNextPage
      page += 1
    }
    return counts
  }
  const [likeCounts, commentCounts] = await Promise.all([
    collectCounts('portfolio-likes'),
    collectCounts('portfolio-comments'),
  ])
  const awards = await payload.find({
    collection: 'awards',
    where: { status: { not_equals: 'draft' } },
    depth: 0,
    limit: 1000,
    overrideAccess: true,
  })
  const nomineePortfolioIDs = new Set(awards.docs.flatMap((award) =>
    Array.isArray(award.nominees) ? award.nominees.map(idOf).filter((id): id is string => Boolean(id)) : [],
  ))

  const totals = new Map<string, StudentTotal>()
  for (const portfolio of portfolios.docs) {
    const studentID = idOf(portfolio.student)
    if (!studentID) continue
    let student = totals.get(studentID)
    if (!student) {
      const studentDoc = typeof portfolio.student === 'object' ? portfolio.student : null
      const photo = studentDoc && typeof studentDoc.profilePhoto === 'object' ? studentDoc.profilePhoto : null
      student = {
        id: studentID,
        name: studentDoc?.name || 'Siswa',
        profilePhoto: photo?.url || null,
        likes: 0,
        comments: 0,
        karya: 0,
      }
      totals.set(studentID, student)
    }
    student.likes += likeCounts.get(String(portfolio.id)) || 0
    student.comments += commentCounts.get(String(portfolio.id)) || 0
    student.karya += 1
  }

  const students = [...totals.values()]
  const sortTop = (key: 'likes' | 'comments' | 'score') => [...students]
    .sort((a, b) => (key === 'score' ? b.likes + b.comments - a.likes - a.comments : b[key] - a[key]) || a.name.localeCompare(b.name, 'id'))
    .slice(0, 10)

  const portfolioRankings = portfolios.docs
    .map((portfolio) => {
      const studentID = idOf(portfolio.student)
      const student = typeof portfolio.student === 'object' ? portfolio.student : null
      const profilePhoto = student && typeof student.profilePhoto === 'object' ? student.profilePhoto : null
      const coverImage = typeof portfolio.coverImage === 'object' ? portfolio.coverImage : null
      return {
        id: String(portfolio.id),
        slug: portfolio.slug,
        title: portfolio.title || 'Tanpa Judul',
        isNominee: nomineePortfolioIDs.has(String(portfolio.id)),
        studentID,
        studentName: student?.name || 'Siswa',
        profilePhoto: profilePhoto?.url || null,
        coverImage: coverImage?.url || null,
        likes: likeCounts.get(String(portfolio.id)) || 0,
        comments: commentCounts.get(String(portfolio.id)) || 0,
      }
    })

  const topLikedPortfolios = portfolioRankings
    .filter((portfolio) => portfolio.likes > 0)
    .sort((a, b) => b.likes - a.likes || a.title.localeCompare(b.title, 'id'))
    .slice(0, 10)
  const trendingPortfolios = portfolioRankings
    .filter((portfolio) => portfolio.comments > 0)
    .sort((a, b) => b.comments - a.comments || a.title.localeCompare(b.title, 'id'))
    .slice(0, 10)

  const topOverall = sortTop('score').map((student) => ({ ...student, score: student.likes + student.comments }))
  const portfolioByID = new Map(portfolios.docs.map((portfolio) => [String(portfolio.id), portfolio]))
  const saveRecord = async (record: {
    recordKey: string
    student: string
    recordType: 'achievement' | 'award'
    code: string
    title: string
    description: string
    rank?: number
    portfolio?: string
    award?: string | number
    earnedAt?: string
  }) => {
    const existing = await payload.find({
      collection: 'student-records',
      where: { recordKey: { equals: record.recordKey } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (existing.docs.length) return
    try {
      await payload.create({
        collection: 'student-records',
        data: {
          ...record,
          student: Number(record.student),
          portfolio: record.portfolio === undefined ? undefined : Number(record.portfolio),
          award: record.award === undefined ? undefined : Number(record.award),
          earnedAt: record.earnedAt || new Date().toISOString(),
        },
        overrideAccess: true,
      })
    } catch (error) {
      // Concurrent homepage/profile requests can discover the same achievement.
      // The unique recordKey keeps the first persisted record as the source of truth.
      const raced = await payload.find({
        collection: 'student-records',
        where: { recordKey: { equals: record.recordKey } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (!raced.docs.length) throw error
    }
  }

  const topLiked = topLikedPortfolios[0]
  if (topLiked?.studentID) {
    await saveRecord({
      recordKey: `top-likes:${topLiked.id}`,
      student: topLiked.studentID,
      recordType: 'achievement',
      code: 'top-likes',
      title: 'Karya Paling Disukai',
      description: `${topLiked.title} pernah menjadi karya dengan suka terbanyak.`,
      rank: 1,
      portfolio: topLiked.id,
    })
  }
  const topCommented = trendingPortfolios[0]
  if (topCommented?.studentID) {
    await saveRecord({
      recordKey: `top-comments:${topCommented.id}`,
      student: topCommented.studentID,
      recordType: 'achievement',
      code: 'top-comments',
      title: 'Karya Paling Ramai',
      description: `${topCommented.title} pernah menjadi karya dengan komentar terbanyak.`,
      rank: 1,
      portfolio: topCommented.id,
    })
  }
  for (const [index, student] of topOverall.slice(0, 3).entries()) {
    if (student.score <= 0) continue
    await saveRecord({
      recordKey: `mvs:${student.id}:${index + 1}`,
      student: student.id,
      recordType: 'achievement',
      code: 'mvs',
      title: `Most Valuable Student #${index + 1}`,
      description: `Pernah berada di peringkat ${index + 1} Most Valuable Student.`,
      rank: index + 1,
    })
  }

  for (const award of awards.docs.filter((item) => item.status !== 'draft')) {
    const nominees = Array.isArray(award.nominees) ? award.nominees.map(idOf).filter((id): id is string => Boolean(id)) : []
    for (const portfolioID of nominees) {
      const portfolio = portfolioByID.get(portfolioID)
      const studentID = portfolio ? idOf(portfolio.student) : undefined
      if (!studentID) continue
      await saveRecord({
        recordKey: `award-nominee:${award.id}:${portfolioID}`,
        student: studentID,
        recordType: 'award',
        code: 'award-nominee',
        title: award.title,
        description: `Masuk nominasi penghargaan melalui karya ${portfolio?.title || 'portofolio siswa'}.`,
        portfolio: portfolioID,
        award: award.id,
        earnedAt: award.updatedAt,
      })
    }
    if (award.status !== 'announced') continue
    const results = await Promise.all(nominees.map(async (portfolioID) => {
      const portfolio = portfolioByID.get(portfolioID)
      const studentID = portfolio ? idOf(portfolio.student) : undefined
      if (!studentID) return null
      const votes = await payload.count({
        collection: 'award-votes',
        where: { and: [{ award: { equals: award.id } }, { portfolio: { equals: portfolioID } }] },
        overrideAccess: true,
      })
      return { portfolioID, studentID, votes: votes.totalDocs }
    }))
    const validResults = results.filter((result): result is NonNullable<typeof result> => result !== null)
    const winningVotes = Math.max(0, ...validResults.map((result) => result.votes))
    if (winningVotes === 0) continue
    for (const winner of validResults.filter((result) => result.votes === winningVotes)) {
      await saveRecord({
        recordKey: `award:${award.id}:${winner.studentID}`,
        student: winner.studentID,
        recordType: 'award',
        code: 'award-winner',
        title: award.title,
        description: `Pemenang penghargaan melalui karya ${portfolioByID.get(winner.portfolioID)?.title || 'portofolio siswa'}.`,
        portfolio: winner.portfolioID,
        award: award.id,
        earnedAt: award.updatedAt,
      })
    }
  }

  return NextResponse.json({
    topLikes: topLikedPortfolios,
    trending: trendingPortfolios,
    topOverall,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
