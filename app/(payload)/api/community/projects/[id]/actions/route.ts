import config from '@payload-config'
import { authenticateWebsiteRequest } from '../../../../../../../lib/websiteAuth'
import { isCMSAdmin } from '../../../../../../../lib/isCMSAdmin'
import { isStudentUser } from '../../../../../../../lib/isStudentUser'
import { isTeacherUser } from '../../../../../../../lib/isTeacherUser'
import { createLocalReq, getPayload, type TypedUser } from 'payload'
import { NextResponse } from 'next/server'

const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return relationID((value as { id: unknown }).id)
  return undefined
}

type Assignment = { mentor?: unknown; assignmentRole?: string; response?: string }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await authenticateWebsiteRequest(payload, request)
  if (!user || (!isTeacherUser(user) && !isStudentUser(user) && !isCMSAdmin(user))) return NextResponse.json({ message: 'Silakan masuk untuk melanjutkan.' }, { status: 401 })
  const { id } = await params
  const projectID = Number(id)
  if (!Number.isInteger(projectID) || projectID < 1) return NextResponse.json({ message: 'Proyek tidak valid.' }, { status: 400 })
  const project = await payload.findByID({ collection: 'projects', id: projectID, depth: 0, overrideAccess: true })
  const body = await request.json().catch(() => null) as { action?: string; response?: string; decision?: string; feedback?: string } | null
  if (!body?.action) return NextResponse.json({ message: 'Tindakan belum dipilih.' }, { status: 400 })
  const assignments = (Array.isArray(project.mentorAssignments) ? project.mentorAssignments : []) as Assignment[]
  const assignment = assignments.find((item) => String(relationID(item.mentor)) === String(user.id))
  const userIsAdmin = isCMSAdmin(user)
  const projectOwner = String(relationID(project.createdBy)) === String(user.id)
  let data: Record<string, unknown>
  let context: Record<string, unknown> | undefined

  if (body.action === 'respond') {
    if (!isTeacherUser(user) || !assignment || assignment.response !== 'invited' || !['accepted', 'declined'].includes(String(body.response))) return NextResponse.json({ message: 'Undangan Guru tidak ditemukan atau sudah ditanggapi.' }, { status: 403 })
    data = { mentorAssignments: assignments.map((item) => String(relationID(item.mentor)) === String(user.id) ? { ...item, mentor: relationID(item.mentor), response: body.response } : { ...item, mentor: relationID(item.mentor) }) }
  } else if (body.action === 'submit') {
    if ((!isStudentUser(user) || !projectOwner) && !userIsAdmin) return NextResponse.json({ message: 'Hanya pengelola proyek yang dapat mengajukan verifikasi.' }, { status: 403 })
    const primary = assignments.find((item) => item.assignmentRole === 'primary')
    if (!primary || primary.response !== 'accepted') return NextResponse.json({ message: 'Undang dan tunggu persetujuan mentor utama sebelum mengajukan proyek.' }, { status: 400 })
    data = { verificationStatus: 'submitted', status: 'draft' }
    context = { projectAction: 'submit' }
  } else if (body.action === 'review') {
    if (!isTeacherUser(user) || !assignment || assignment.response !== 'accepted') return NextResponse.json({ message: 'Hanya Guru pembimbing yang sudah menerima undangan dapat meninjau proyek.' }, { status: 403 })
    const feedback = String(body.feedback || '').trim()
    const decision = String(body.decision || '')
    if (feedback.length < 5 || feedback.length > 3000 || !['comment', 'verified', 'revision-requested'].includes(decision)) return NextResponse.json({ message: 'Tulis masukan minimal 5 karakter dan pilih tindakan.' }, { status: 400 })
    if (decision !== 'comment' && assignment.assignmentRole !== 'primary') return NextResponse.json({ message: 'Hanya mentor utama yang dapat menyetujui atau meminta revisi.' }, { status: 403 })
    if (decision !== 'comment' && project.verificationStatus !== 'submitted') return NextResponse.json({ message: 'Proyek belum diajukan untuk verifikasi.' }, { status: 409 })
    const history = Array.isArray(project.reviewHistory) ? project.reviewHistory : []
    const review = { reviewer: user.id, reviewerRole: assignment.assignmentRole || 'supporting', decision, feedback, reviewedAt: new Date().toISOString() }
    data = {
      reviewHistory: [...history, review],
      reviewFeedback: feedback,
      ...(decision === 'verified' ? { verificationStatus: 'verified', status: 'published', verifiedBy: user.id, verifiedAt: new Date().toISOString() } : {}),
      ...(decision === 'revision-requested' ? { verificationStatus: 'revision-requested', status: 'draft', verifiedBy: null, verifiedAt: null } : {}),
    }
  } else {
    return NextResponse.json({ message: 'Tindakan tidak dikenal.' }, { status: 400 })
  }

  const req = await createLocalReq({ user: user as TypedUser, ...(context ? { context } : {}) }, payload)
  const updated = await payload.update({ collection: 'projects', id: projectID, data, depth: 2, overrideAccess: true, req })
  return NextResponse.json({ doc: updated })
}
