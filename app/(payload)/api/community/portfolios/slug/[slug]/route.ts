import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import { authenticateWebsiteRequest } from '../../../../../../../lib/websiteAuth'
import { isTeacherUser } from '../../../../../../../lib/isTeacherUser'

const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return relationID((value as { id: unknown }).id)
  return undefined
}

function teacherCanReview(teacher: Record<string, unknown>, student: Record<string, unknown>) {
  const teacherClass = relationID(teacher.class)
  const teacherProgram = relationID(teacher.program)
  const studentClass = student.class && typeof student.class === 'object' ? student.class as Record<string, unknown> : null
  const studentProgram = relationID(student.program) ?? relationID(studentClass?.program)
  return Boolean(
    (teacherClass && String(teacherClass) === String(relationID(student.class))) ||
    (teacherProgram && String(teacherProgram) === String(studentProgram)),
  )
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'portfolios',
    where: { slug: { equals: slug } },
    depth: 3,
    limit: 1,
    overrideAccess: true,
  })
  const work = result.docs[0]
  if (!work) return NextResponse.json({ message: 'Karya tidak ditemukan.' }, { status: 404 })
  const sessionUser = await authenticateWebsiteRequest(payload, request)
  const student = typeof work.student === 'object' && work.student ? work.student as unknown as Record<string, unknown> : null
  const owner = Boolean(sessionUser && student && String(sessionUser.id) === String(student.id) && !isTeacherUser(sessionUser))
  let mentor = false
  // Draf yang belum diajukan bersifat pribadi: guru baru bisa melihatnya setelah siswa mengajukan.
  if (sessionUser && isTeacherUser(sessionUser) && student && work.status !== 'published' && (work.verificationStatus ?? 'unreviewed') !== 'unreviewed') {
    const teacher = await payload.findByID({ collection: 'users', id: sessionUser.id, depth: 1, overrideAccess: true })
    mentor = teacherCanReview(teacher as unknown as Record<string, unknown>, student)
  }
  if (work.status !== 'published' && !owner && !mentor) {
    return NextResponse.json({ message: 'Karya tidak ditemukan.' }, { status: 404 })
  }
  const awards = await payload.find({
    collection: 'awards',
    where: { status: { not_equals: 'draft' } },
    depth: 0,
    limit: 1000,
    overrideAccess: true,
  })
  const isNominee = awards.docs.some((award) => Array.isArray(award.nominees) && award.nominees.some((nominee) => {
    const nomineeID = nominee && typeof nominee === 'object' && 'id' in nominee ? nominee.id : nominee
    return String(nomineeID) === String(work.id)
  }))
  const reviewHistory = owner || mentor
    ? await payload.find({ collection: 'portfolio-reviews', where: { portfolio: { equals: work.id } }, depth: 1, limit: 100, sort: '-createdAt', overrideAccess: true })
    : null
  const photo = student && typeof student.profilePhoto === 'object' ? student.profilePhoto as Record<string, unknown> : null
  const category = typeof work.categoryRef === 'object' ? work.categoryRef : null
  const cover = typeof work.coverImage === 'object' ? work.coverImage : null
  const galleryImages = Array.isArray(work.galleryImages) ? work.galleryImages.flatMap((image) => {
    if (!image || typeof image !== 'object') return []
    const item = image as unknown as Record<string, unknown>
    return [{ id: item.id, url: item.url, alt: item.alt, filename: item.filename }]
  }) : []
  const projectFile = typeof work.projectFile === 'object' ? work.projectFile : null
  return NextResponse.json({
    id: work.id,
    slug: work.slug,
    title: work.title,
    isNominee,
    summary: work.summary,
    details: work.details || null,
    year: work.year,
    projectUrl: work.projectUrl,
    projectFile: projectFile ? { url: projectFile.url, mimeType: projectFile.mimeType, filename: projectFile.filename } : null,
    tools: work.tools,
    verificationStatus: work.verificationStatus || 'unreviewed',
    status: work.status,
    accessLevel: owner ? 'owner' : mentor ? 'mentor' : 'public',
    reviewFeedback: owner || mentor ? work.reviewFeedback || null : null,
    reviewHistory: reviewHistory?.docs.map((review) => ({
      id: review.id,
      decision: review.decision,
      feedback: review.feedback,
      createdAt: review.createdAt,
      reviewer: typeof review.reviewer === 'object' && review.reviewer ? { name: review.reviewer.name } : null,
    })) || [],
    verifiedBy: typeof work.verifiedBy === 'object' && work.verifiedBy ? { name: work.verifiedBy.name } : null,
    categoryRef: category ? { name: category.name, code: category.code } : null,
    coverImage: cover ? { url: cover.url, alt: cover.alt } : null,
    galleryImages,
    student: student ? { id: student.id, name: student.name, profilePhoto: photo?.url || null } : null,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
