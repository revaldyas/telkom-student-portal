import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  try {
    const portfolio = await payload.findByID({ collection: 'portfolios', id, depth: 0, overrideAccess: true })
    if (portfolio.status !== 'published') return NextResponse.json({ message: 'Karya tidak ditemukan.' }, { status: 404 })
    const comments = await payload.find({
      collection: 'portfolio-comments',
      where: { portfolio: { equals: portfolio.id } },
      depth: 1,
      limit: 100,
      sort: 'createdAt',
      overrideAccess: true, pagination: false })
    return NextResponse.json({
      docs: comments.docs.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        student: typeof comment.student === 'object' ? {
          id: comment.student.id,
          name: comment.student.name,
        } : null,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'Karya tidak ditemukan.' }, { status: 404 })
  }
}
