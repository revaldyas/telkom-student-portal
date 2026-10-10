import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  try {
    const portfolio = await payload.findByID({ collection: 'portfolios', id, depth: 0, overrideAccess: true })
    if (portfolio.status !== 'published') return NextResponse.json({ message: 'Karya tidak ditemukan.' }, { status: 404 })
    const [likes, comments] = await Promise.all([
      payload.count({ collection: 'portfolio-likes', where: { portfolio: { equals: portfolio.id } }, overrideAccess: true }),
      payload.count({ collection: 'portfolio-comments', where: { portfolio: { equals: portfolio.id } }, overrideAccess: true }),
    ])
    return NextResponse.json({ likes: likes.totalDocs, comments: comments.totalDocs }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'Karya tidak ditemukan.' }, { status: 404 })
  }
}
