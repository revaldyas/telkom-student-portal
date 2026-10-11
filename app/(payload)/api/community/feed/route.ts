import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

const idOf = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return undefined
}

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const requestedLimit = Number(new URL(request.url).searchParams.get('limit') || 6)
  const limit = Number.isFinite(requestedLimit) ? Math.min(1000, Math.max(1, Math.floor(requestedLimit))) : 6
  const [works, awardResponse, openAwards] = await Promise.all([
    payload.find({ collection: 'portfolios', where: { status: { equals: 'published' } }, depth: 2, limit, sort: '-createdAt', overrideAccess: true }),
    payload.find({ collection: 'awards', where: { status: { not_equals: 'draft' } }, depth: 0, limit: 1000, sort: 'opensAt', overrideAccess: true }),
    payload.find({ collection: 'awards', where: { status: { equals: 'open' } }, depth: 2, limit: 10, sort: 'opensAt', overrideAccess: true }),
  ])
  const collectCounts = async (collection: 'portfolio-likes' | 'portfolio-comments') => {
    const counts = new Map<string, number>()
    const portfolioIDs = works.docs.map((work) => work.id)
    if (portfolioIDs.length === 0) return counts
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
  const [likeCounts, commentCounts] = await Promise.all([collectCounts('portfolio-likes'), collectCounts('portfolio-comments')])

  const nomineeIDs = new Set(awardResponse.docs.flatMap((award) =>
    Array.isArray(award.nominees) ? award.nominees.map(idOf).filter((id): id is string => Boolean(id)) : [],
  ))
  const portfolios = works.docs.map((work) => {
    const student = typeof work.student === 'object' ? work.student : null
    const photo = student && typeof student.profilePhoto === 'object' ? student.profilePhoto : null
    const studentClass = student && typeof student.class === 'object' ? student.class : null
    const studentProgram = student && typeof student.program === 'object' ? student.program : null
    const category = typeof work.categoryRef === 'object' ? work.categoryRef : null
    const cover = typeof work.coverImage === 'object' ? work.coverImage : null
    return {
      id: work.id,
      slug: work.slug,
      title: work.title,
      summary: work.summary,
      year: work.year,
      verificationStatus: work.verificationStatus || 'unreviewed',
      categoryRef: category ? { id: category.id, name: category.name, code: category.code } : null,
      coverImage: cover ? { url: cover.url, alt: cover.alt } : null,
      student: student ? {
        id: student.id, name: student.name, profilePhoto: photo?.url || null,
        class: studentClass ? { id: studentClass.id, name: studentClass.name } : null,
        program: studentProgram ? { id: studentProgram.id, name: studentProgram.name } : null,
      } : null,
      isNominee: nomineeIDs.has(String(work.id)),
      likes: likeCounts.get(String(work.id)) || 0,
      comments: commentCounts.get(String(work.id)) || 0,
    }
  })
  const now = Date.now()
  const awards = openAwards.docs
    .filter((award) => Date.parse(award.closesAt) >= now)
    .map((award) => ({
      id: award.id,
      title: award.title,
      description: award.description,
      opensAt: award.opensAt,
      closesAt: award.closesAt,
      nominees: Array.isArray(award.nominees) ? award.nominees.flatMap((nominee) => {
        if (!nominee || typeof nominee !== 'object') return []
        const coverImage = nominee.coverImage && typeof nominee.coverImage === 'object' ? nominee.coverImage : null
        return [{ id: nominee.id, title: nominee.title, slug: nominee.slug, coverImage: coverImage?.url || null }]
      }) : [],
    }))
  return NextResponse.json({ portfolios, awards }, { headers: { 'Cache-Control': 'no-store' } })
}
