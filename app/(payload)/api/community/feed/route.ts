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
  const [works, awardResponse, openAwards, projectResponse, opportunityResponse, bannerResponse] = await Promise.all([
    payload.find({ collection: 'portfolios', where: { status: { equals: 'published' } }, depth: 2, limit, sort: '-createdAt', overrideAccess: true }),
    payload.find({ collection: 'awards', where: { status: { not_equals: 'draft' } }, depth: 0, limit: 1000, sort: 'opensAt', overrideAccess: true }),
    payload.find({ collection: 'awards', where: { status: { equals: 'open' } }, depth: 2, limit: 10, sort: 'opensAt', overrideAccess: true }),
    payload.find({ collection: 'projects', where: { status: { equals: 'published' } }, depth: 2, limit: 20, sort: '-createdAt', overrideAccess: true }),
    payload.find({ collection: 'opportunities', where: { status: { equals: 'open' } }, depth: 1, limit: 20, sort: '-createdAt', overrideAccess: true }),
    payload.find({ collection: 'home-banners', where: { status: { equals: 'published' } }, depth: 1, limit: 20, sort: 'sortOrder', overrideAccess: true }).catch(() => null),
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
        program: studentProgram ? { id: studentProgram.id, name: studentProgram.name, code: studentProgram.code } : null,
      } : null,
      isNominee: nomineeIDs.has(String(work.id)),
      likes: likeCounts.get(String(work.id)) || 0,
      comments: commentCounts.get(String(work.id)) || 0,
    }
  })
  const projects = projectResponse.docs.map((project) => {
    const cover = typeof project.coverImage === 'object' ? project.coverImage : null
    const category = typeof project.categoryRef === 'object' ? project.categoryRef : null
    const members = Array.isArray(project.members) ? project.members.flatMap((entry) => {
      const member = entry && typeof entry.member === 'object' ? entry.member : null
      if (!member) return []
      const photo = typeof member.profilePhoto === 'object' ? member.profilePhoto : null
      return [{ id: member.id, name: member.name, profilePhoto: photo?.url || null }]
    }) : []
    return {
      id: project.id,
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      year: project.year,
      category: category?.name || null,
      coverImage: cover?.url || null,
      coverAlt: cover?.alt || null,
      members,
    }
  })
  const opportunities = opportunityResponse.docs.map((opportunity) => {
    const cover = typeof opportunity.coverImage === 'object' ? opportunity.coverImage : null
    return {
      id: opportunity.id,
      title: opportunity.title,
      type: opportunity.type,
      organizer: opportunity.organizer,
      summary: opportunity.summary,
      deadline: opportunity.deadline,
      coverImage: cover?.url || null,
      coverAlt: cover?.alt || null,
    }
  })
  const heroSlides = (bannerResponse?.docs || []).flatMap((banner) => {
    const image = typeof banner.image === 'object' ? banner.image : null
    return [{
      key: String(banner.id),
      eyebrow: banner.eyebrow,
      title: banner.title,
      description: banner.description,
      image: image?.url || null,
      href: banner.primaryButtonUrl,
      action: banner.primaryButtonLabel,
      secondaryHref: banner.secondaryButtonUrl || null,
      secondaryAction: banner.secondaryButtonLabel || null,
    }]
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
  return NextResponse.json({ portfolios, projects, opportunities, awards, heroSlides }, { headers: { 'Cache-Control': 'no-store' } })
}
