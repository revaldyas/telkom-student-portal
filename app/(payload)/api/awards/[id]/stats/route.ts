import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

// Hitungan partisipasi saja. Perolehan suara per nominasi tetap rahasia sampai hasil diumumkan.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  const award = await payload.findByID({ collection: 'awards', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!award || award.status === 'draft') return NextResponse.json({ message: 'Penghargaan tidak ditemukan.' }, { status: 404 })

  const [votes, students] = await Promise.all([
    payload.count({ collection: 'award-votes', where: { award: { equals: award.id } }, overrideAccess: true }),
    payload.count({ collection: 'users', where: { role: { equals: 'student' } }, overrideAccess: true }),
  ])
  return NextResponse.json({ totalVotes: votes.totalDocs, eligibleVoters: students.totalDocs }, { headers: { 'Cache-Control': 'no-store' } })
}
