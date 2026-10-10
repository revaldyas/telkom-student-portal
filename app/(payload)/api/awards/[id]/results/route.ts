import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  const award = await payload.findByID({
    collection: 'awards',
    id,
    depth: 1,
    overrideAccess: true,
  })

  if (award.status !== 'announced') {
    return NextResponse.json({ message: 'Hasil voting belum diumumkan.' }, { status: 403 })
  }

  const nominees = Array.isArray(award.nominees) ? award.nominees : []
  const results = await Promise.all(nominees.map(async (nominee) => {
    const portfolio = typeof nominee === 'object' ? nominee : await payload.findByID({
      collection: 'portfolios',
      id: nominee,
      depth: 1,
      overrideAccess: true,
    })
    const { totalDocs } = await payload.count({
      collection: 'award-votes',
      where: {
        and: [
          { award: { equals: award.id } },
          { portfolio: { equals: portfolio.id } },
        ],
      },
    })

    const student = typeof portfolio.student === 'object' ? portfolio.student : null
    const cover = typeof portfolio.coverImage === 'object' ? portfolio.coverImage : null
    return {
      portfolio: {
        id: portfolio.id,
        slug: portfolio.slug,
        title: portfolio.title,
        summary: portfolio.summary,
        coverImage: cover ? { url: cover.url, alt: cover.alt } : null,
        student: student ? { id: student.id, name: student.name } : null,
      },
      votes: totalDocs,
    }
  }))

  return NextResponse.json({ award: award.title, results }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
