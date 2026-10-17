import config from '@payload-config'
import { authenticateWebsiteRequest } from '../../../../../lib/websiteAuth'
import { isTeacherUser } from '../../../../../lib/isTeacherUser'
import { createLocalReq, getPayload, type TypedUser } from 'payload'
import { NextResponse } from 'next/server'

const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return relationID((value as { id: unknown }).id)
  return undefined
}

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const sessionUser = await authenticateWebsiteRequest(payload, request)
  if (!isTeacherUser(sessionUser)) return NextResponse.json({ message: 'Akses khusus Guru pembimbing.' }, { status: 403 })
  const teacher = await payload.findByID({ collection: 'users', id: sessionUser.id, depth: 1, overrideAccess: true })
  const interests = await payload.find({ collection: 'opportunity-interests', depth: 2, limit: 500, sort: '-createdAt', overrideAccess: true, pagination: false })
  const docs = interests.docs.flatMap((interest) => {
    const student = typeof interest.student === 'object' ? interest.student : null
    const opportunity = typeof interest.opportunity === 'object' ? interest.opportunity : null
    if (!student || !opportunity) return []
    const sameClass = teacher.class && typeof teacher.class === 'object' && student.class && typeof student.class === 'object' && String(teacher.class.id) === String(student.class.id)
    const sameProgram = teacher.program && typeof teacher.program === 'object' && student.program && typeof student.program === 'object' && String(teacher.program.id) === String(student.program.id)
    if (!sameClass && !sameProgram) return []
    return [{
      id: interest.id,
      note: interest.note || '',
      status: interest.status,
      createdAt: interest.createdAt,
      opportunity: { id: opportunity.id, title: opportunity.title, organizer: opportunity.organizer },
      student: {
        id: student.id, name: student.name,
        class: typeof student.class === 'object' ? student.class?.name : null,
        program: typeof student.program === 'object' ? student.program?.name : null,
        profilePhoto: typeof student.profilePhoto === 'object' && student.profilePhoto ? student.profilePhoto.url : null,
      },
    }]
  })
  return NextResponse.json({ docs }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(request: Request) {
  const payload = await getPayload({ config })
  const sessionUser = await authenticateWebsiteRequest(payload, request)
  if (!isTeacherUser(sessionUser)) return NextResponse.json({ message: 'Akses khusus Guru pembimbing.' }, { status: 403 })
  const teacher = await payload.findByID({ collection: 'users', id: sessionUser.id, depth: 1, overrideAccess: true })
  const body = await request.json().catch(() => null) as { id?: string | number; status?: string } | null
  if (!body?.id || !['interested', 'contacted', 'completed'].includes(String(body.status))) return NextResponse.json({ message: 'Minat dan status yang valid wajib dipilih.' }, { status: 400 })
  const interest = await payload.findByID({ collection: 'opportunity-interests', id: body.id, depth: 2, overrideAccess: true })
  const student = typeof interest.student === 'object' ? interest.student : null
  const sameClass = relationID(teacher.class) !== undefined && String(relationID(teacher.class)) === String(relationID(student?.class))
  const sameProgram = relationID(teacher.program) !== undefined && String(relationID(teacher.program)) === String(relationID(student?.program))
  if (!sameClass && !sameProgram) return NextResponse.json({ message: 'Minat siswa ini berada di luar tanggung jawabmu.' }, { status: 403 })
  const localReq = await createLocalReq({ user: { ...teacher, collection: 'users' } as TypedUser }, payload)
  const updated = await payload.update({ collection: 'opportunity-interests', id: body.id, data: { status: body.status as 'interested' | 'contacted' | 'completed' }, req: localReq, overrideAccess: true })
  return NextResponse.json({ doc: updated })
}
