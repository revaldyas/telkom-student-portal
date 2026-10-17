import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import { groupCount } from '../../../../../lib/dbCounts'

const idOf = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return undefined
}

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const requestedLimit = Number(new URL(request.url).searchParams.get('limit') || 6)
  const limit = Number.isFinite(requestedLimit) ? Math.min(1000, Math.max(1, Math.floor(requestedLimit))) : 6
  const [works, awardResponse, openAwards, projectResponse, opportunityResponse, bannerResponse, testimonialResponse, likeTotals, commentTotals, projectLikeTotals, projectCommentTotals] = await Promise.all([
    payload.find({ collection: 'portfolios', where: { status: { equals: 'published' } }, depth: 2, limit, sort: '-createdAt', overrideAccess: true }),
    payload.find({ collection: 'awards', where: { status: { not_equals: 'draft' } }, depth: 0, limit: 1000, sort: 'opensAt', overrideAccess: true, pagination: false }),
    payload.find({ collection: 'awards', where: { status: { equals: 'open' } }, depth: 2, limit: 10, sort: 'opensAt', overrideAccess: true, pagination: false }),
    payload.find({ collection: 'projects', where: { status: { equals: 'published' } }, depth: 2, limit: 20, sort: '-createdAt', overrideAccess: true }),
    payload.find({ collection: 'opportunities', where: { status: { equals: 'open' } }, depth: 1, limit: 20, sort: '-createdAt', overrideAccess: true }),
    payload.find({ collection: 'home-banners', where: { status: { equals: 'published' } }, depth: 1, limit: 20, sort: 'sortOrder', overrideAccess: true, pagination: false }).catch(() => null),
    payload.find({ collection: 'testimonials', where: { status: { equals: 'published' } }, depth: 0, limit: 30, sort: 'sortOrder', overrideAccess: true, pagination: false }).catch(() => null),
    // Jumlah suka/komentar dihitung di database (agregat kecil) dan ikut gelombang query yang sama.
    groupCount(payload, 'portfolio_likes', 'portfolio_id'),
    groupCount(payload, 'portfolio_comments', 'portfolio_id'),
    groupCount(payload, 'project_likes', 'project_id').catch(() => new Map<number, number>()),
    groupCount(payload, 'project_comments', 'project_id').catch(() => new Map<number, number>()),
  ])
  const likeCounts = new Map([...likeTotals].map(([id, total]) => [String(id), total]))
  const commentCounts = new Map([...commentTotals].map(([id, total]) => [String(id), total]))

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
  const projectStats = { likes: projectLikeTotals, comments: projectCommentTotals }
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
      likes: projectStats.likes.get(project.id) || 0,
      comments: projectStats.comments.get(project.id) || 0,
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
  const testimonials = (testimonialResponse?.docs || []).map((testimonial) => ({
    id: testimonial.id,
    quote: testimonial.quote,
    name: testimonial.name,
    role: testimonial.role,
    program: testimonial.program || null,
    isSample: Boolean(testimonial.isSample),
  }))
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
  const totals = { portfolios: works.totalDocs, projects: projectResponse.totalDocs, opportunities: opportunityResponse.totalDocs, awards: awards.length }
  return NextResponse.json({ portfolios, projects, opportunities, awards, testimonials, heroSlides, totals }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' } })
}
