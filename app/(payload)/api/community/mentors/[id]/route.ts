import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

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
      },
      impact: {
        reviews: reviewResult.totalDocs,
        verified: verifiedCount,
        revisions: revisionCount,
        works: verifiedResult.totalDocs,
      },
      works,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'Profil Guru tidak ditemukan.' }, { status: 404 })
  }
}
