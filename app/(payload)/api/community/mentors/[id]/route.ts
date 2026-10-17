import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import { projectCounts } from '../../../../../../lib/projectSocial'
import { appearanceFromUser } from '../../../../../../lib/appearanceFromUser'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })

  try {
    const mentor = await payload.findByID({ collection: 'users', id, depth: 1, overrideAccess: true })
    if (mentor.role !== 'teacher') return NextResponse.json({ message: 'Profil Guru tidak ditemukan.' }, { status: 404 })

    const [reviewResult, verifiedResult] = await Promise.all([
      payload.find({ collection: 'portfolio-reviews', where: { reviewer: { equals: mentor.id } }, depth: 0, limit: 1000, sort: '-updatedAt', overrideAccess: true }),
      payload.find({
        collection: 'portfolios',
        where: { and: [
          { verifiedBy: { equals: mentor.id } },
          { verificationStatus: { equals: 'verified' } },
          { status: { equals: 'published' } },
        ] },
        depth: 2,
        limit: 100,
        sort: '-verifiedAt',
        overrideAccess: true,
      }),
    ])

    const works = verifiedResult.docs.map((work) => {
      const author = typeof work.student === 'object' && work.student ? work.student : null
      const category = typeof work.categoryRef === 'object' && work.categoryRef ? work.categoryRef : null
      const cover = typeof work.coverImage === 'object' && work.coverImage ? work.coverImage : null
      return {
        id: work.id,
        title: work.title,
        slug: work.slug,
        year: work.year,
        verifiedAt: work.verifiedAt,
        category: category?.name || null,
        coverImage: cover?.url || null,
        student: author ? { id: author.id, name: author.name } : null,
      }
    })

    const [projectResult, awardResult] = await Promise.all([
      payload.find({ collection: 'projects', where: { and: [{ 'mentorAssignments.mentor': { equals: mentor.id } }, { status: { equals: 'published' } }] }, depth: 2, limit: 100, sort: '-createdAt', overrideAccess: true, pagination: false }),
      payload.find({ collection: 'awards', where: { status: { not_equals: 'draft' } }, depth: 0, limit: 200, overrideAccess: true, pagination: false }),
    ])
    const projectStats = await projectCounts(payload, projectResult.docs.map((project) => project.id))
    const projects = projectResult.docs.map((project) => ({
      likes: projectStats.likes.get(project.id) || 0,
      comments: projectStats.comments.get(project.id) || 0,
      id: project.id,
      slug: project.slug,
      title: project.title,
      year: project.year,
      category: typeof project.categoryRef === 'object' && project.categoryRef ? project.categoryRef.name : null,
      coverImage: typeof project.coverImage === 'object' && project.coverImage ? project.coverImage.url || null : null,
      members: Array.isArray(project.members) ? project.members.flatMap((entry) => typeof entry.member === 'object' && entry.member ? [entry.member.name as string] : []) : [],
    }))
    // Penghargaan yang diraih karya bimbingan guru (karya yang ia verifikasi).
    const mentoredIDs = new Map(works.map((work) => [String(work.id), work.title]))
    const awards: { id: string | number; title: string; work: string; winner: boolean; date: string }[] = []
    for (const award of awardResult.docs) {
      const nominees = (Array.isArray(award.nominees) ? award.nominees : []).map((nominee) => String(typeof nominee === 'object' && nominee ? nominee.id : nominee))
      const mine = nominees.filter((nomineeID) => mentoredIDs.has(nomineeID))
      if (!mine.length) continue
      let winners = new Set<string>()
      if (award.status === 'announced') {
        const totals = await Promise.all(nominees.map(async (nomineeID) => ({ nomineeID, votes: (await payload.count({ collection: 'award-votes', where: { and: [{ award: { equals: award.id } }, { portfolio: { equals: nomineeID } }] }, overrideAccess: true })).totalDocs })))
        const top = Math.max(0, ...totals.map((entry) => entry.votes))
        if (top > 0) winners = new Set(totals.filter((entry) => entry.votes === top).map((entry) => entry.nomineeID))
      }
      for (const nomineeID of mine) awards.push({ id: award.id, title: award.title, work: mentoredIDs.get(nomineeID) || '', winner: winners.has(nomineeID), date: award.closesAt })
    }

    const profilePhoto = typeof mentor.profilePhoto === 'object' && mentor.profilePhoto ? mentor.profilePhoto.url || null : null
    const className = typeof mentor.class === 'object' && mentor.class ? mentor.class.name : null
    const programName = typeof mentor.program === 'object' && mentor.program ? mentor.program.name : null
    const verifiedCount = reviewResult.docs.filter((review) => review.decision === 'verified').length
    const revisionCount = reviewResult.docs.filter((review) => review.decision === 'revision-requested').length

    return NextResponse.json({
      mentor: {
        id: mentor.id,
        name: mentor.name,
        bio: mentor.bio || null,
        interests: mentor.interests || [],
        skills: mentor.skills || [],
        experiences: mentor.experiences || [],
        profilePhoto,
        class: className,
        program: programName,
        appearance: appearanceFromUser(mentor),
      },
      impact: {
        reviews: reviewResult.totalDocs,
        verified: verifiedCount,
        revisions: revisionCount,
        works: verifiedResult.totalDocs,
      },
      works,
      projects,
      awards,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'Profil Guru tidak ditemukan.' }, { status: 404 })
  }
}
