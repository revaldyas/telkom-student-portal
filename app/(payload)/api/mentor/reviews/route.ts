import config from '@payload-config'
import { authenticateWebsiteRequest } from '../../../../../lib/websiteAuth'
import { isCMSAdmin } from '../../../../../lib/isCMSAdmin'
import { isTeacherUser } from '../../../../../lib/isTeacherUser'
import { createLocalReq, getPayload, type TypedUser } from 'payload'
import { NextResponse } from 'next/server'

const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return relationID((value as { id: unknown }).id)
  return undefined
}

function inScope(user: Record<string, unknown>, portfolio: Record<string, unknown>) {
  if (user.collection === 'admins') return true
  const owner = portfolio.student && typeof portfolio.student === 'object' ? portfolio.student as Record<string, unknown> : null
  if (!owner) return false
  const teacherClass = relationID(user.class)
  const teacherProgram = relationID(user.program)
  const ownerClass = owner.class && typeof owner.class === 'object' ? owner.class as Record<string, unknown> : null
  const studentProgram = relationID(owner.program) ?? relationID(ownerClass?.program)
  return Boolean((teacherClass && String(teacherClass) === String(relationID(owner.class))) || (teacherProgram && String(teacherProgram) === String(studentProgram)))
}

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const sessionUser = await authenticateWebsiteRequest(payload, request)
  if (!sessionUser || (!isTeacherUser(sessionUser) && !isCMSAdmin(sessionUser))) return NextResponse.json({ message: 'Akses khusus Guru dan admin.' }, { status: 403 })
  const user = isTeacherUser(sessionUser)
    ? { ...await payload.findByID({ collection: 'users', id: sessionUser.id, depth: 1, overrideAccess: true }), collection: 'users' as const }
    : sessionUser
  const result = await payload.find({
    collection: 'portfolios',
    where: { and: [{ status: { equals: 'draft' } }, { verificationStatus: { in: ['submitted', 'revision-requested'] } }] },
    depth: 3,
    limit: 200,
    sort: '-updatedAt',
    overrideAccess: true,
  })
  const docs = result.docs.filter((doc) => inScope(user as unknown as Record<string, unknown>, doc as unknown as Record<string, unknown>))
  const reviews = await Promise.all(docs.map(async (doc) => {
    const reviewResult = await payload.find({ collection: 'portfolio-reviews', where: { portfolio: { equals: doc.id } }, depth: 1, limit: 1, sort: '-createdAt', overrideAccess: true })
    const review = reviewResult.docs[0]
    const student = doc.student && typeof doc.student === 'object' ? doc.student : null
    const studentClass = student?.class && typeof student.class === 'object' ? student.class.name : null
    const studentClassData = student?.class && typeof student.class === 'object' ? student.class : null
    const studentProgram = student?.program && typeof student.program === 'object'
      ? student.program.name
      : studentClassData && typeof studentClassData.program === 'object' ? studentClassData.program.name : null
    const cover = doc.coverImage && typeof doc.coverImage === 'object' ? doc.coverImage : null
    const projectFile = doc.projectFile && typeof doc.projectFile === 'object' ? doc.projectFile : null
    return {
      id: doc.id, title: doc.title, slug: doc.slug, summary: doc.summary, year: doc.year, tools: doc.tools,
      status: doc.status, verificationStatus: doc.verificationStatus,
      student: student ? { id: student.id, name: student.name, class: studentClass, program: studentProgram } : null,
      category: typeof doc.categoryRef === 'object' && doc.categoryRef ? doc.categoryRef.name : null,
      coverImage: cover?.url || null,
      projectFile: projectFile ? { url: projectFile.url, mimeType: projectFile.mimeType, filename: projectFile.filename } : null,
      review: review ? { id: review.id, decision: review.decision, feedback: review.feedback } : null,
    }
  }))
  const projectResponse = await payload.find({ collection: 'projects', where: { or: [{ verificationStatus: { equals: 'submitted' } }, { status: { equals: 'draft' } }] }, depth: 3, limit: 500, sort: '-updatedAt', overrideAccess: true })
  const assignedProjects = isTeacherUser(sessionUser) ? projectResponse.docs.flatMap((project) => {
    const entries = Array.isArray(project.mentorAssignments) ? project.mentorAssignments : []
    const assignment = entries.find((entry) => String(relationID(entry.mentor)) === String(user.id))
    if (!assignment) return []
    const owner = typeof project.createdBy === 'object' && project.createdBy ? project.createdBy : null
    const cover = typeof project.coverImage === 'object' && project.coverImage ? project.coverImage : null
    const category = typeof project.categoryRef === 'object' && project.categoryRef ? project.categoryRef : null
    return [{ kind: 'project' as const, id: project.id, title: project.title, slug: project.slug, summary: project.summary, year: project.year, tools: project.tools || [], status: project.status, verificationStatus: project.verificationStatus, student: owner ? { id: owner.id, name: owner.name } : null, category: category?.name || 'Proyek kolaborasi', coverImage: cover?.url || null, projectFile: null, review: null, mentorResponse: assignment.response, mentorRole: assignment.assignmentRole }]
  }) : []
  return NextResponse.json({ docs: [...assignedProjects, ...reviews.map((review) => ({ kind: 'portfolio' as const, ...review }))] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const sessionUser = await authenticateWebsiteRequest(payload, request)
  if (!sessionUser || (!isTeacherUser(sessionUser) && !isCMSAdmin(sessionUser))) return NextResponse.json({ message: 'Akses khusus Guru dan admin.' }, { status: 403 })
  const user = isTeacherUser(sessionUser)
    ? { ...await payload.findByID({ collection: 'users', id: sessionUser.id, depth: 1, overrideAccess: true }), collection: 'users' as const }
    : sessionUser
  const body = await request.json().catch(() => null) as { portfolio?: string | number; decision?: string; feedback?: string } | null
  const portfolioID = Number(body?.portfolio)
  const feedback = body?.feedback?.trim()
  if (!Number.isInteger(portfolioID) || portfolioID < 1 || !feedback || feedback.length < 5 || feedback.length > 3000 || !['verified', 'revision-requested'].includes(String(body?.decision))) {
    return NextResponse.json({ message: 'Pilih keputusan dan tulis umpan balik minimal 5 karakter.' }, { status: 400 })
  }
  const portfolio = await payload.findByID({ collection: 'portfolios', id: portfolioID, depth: 3, overrideAccess: true })
  if (!inScope(user as unknown as Record<string, unknown>, portfolio as unknown as Record<string, unknown>)) return NextResponse.json({ message: 'Karya ini berada di luar kelas atau program keahlian yang menjadi tanggung jawabmu.' }, { status: 403 })
  if (portfolio.status === 'draft' && (portfolio.verificationStatus ?? 'unreviewed') === 'unreviewed') {
    return NextResponse.json({ message: 'Karya ini masih draf dan belum diajukan oleh siswa.' }, { status: 409 })
  }
  const localReq = await createLocalReq({ user: user as TypedUser }, payload)
  const decision = body!.decision as 'verified' | 'revision-requested'
  const data = { portfolio: portfolioID, reviewer: user.id, reviewKey: String(portfolioID), decision, feedback }
  const review = await payload.create({ collection: 'portfolio-reviews', data, req: localReq, overrideAccess: true, draft: false })
  return NextResponse.json({ doc: review }, { status: 200 })
}
