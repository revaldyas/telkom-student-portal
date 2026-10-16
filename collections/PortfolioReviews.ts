import { isCMSAdmin } from '../lib/isCMSAdmin'
import { isTeacherUser } from '../lib/isTeacherUser'
import { APIError, type CollectionConfig } from 'payload'

const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return undefined
}

export const PortfolioReviews: CollectionConfig = {
  slug: 'portfolio-reviews',
  labels: { singular: 'Tinjauan Karya', plural: 'Tinjauan Karya' },
  admin: { group: 'Pembimbingan & Verifikasi', useAsTitle: 'reviewKey', defaultColumns: ['portfolio', 'reviewer', 'decision', 'updatedAt'] },
  access: {
    read: ({ req }) => {
      if (isCMSAdmin(req.user)) return true
      const user = req.user
      return isTeacherUser(user) ? { reviewer: { equals: user.id } } : false
    },
    create: ({ req }) => isCMSAdmin(req.user) || isTeacherUser(req.user),
    update: ({ req }) => {
      if (isCMSAdmin(req.user)) return true
      const user = req.user
      return isTeacherUser(user) ? { reviewer: { equals: user.id } } : false
    },
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      if (!isTeacherUser(req.user) && !isCMSAdmin(req.user)) throw new APIError('Hanya Guru atau admin yang dapat meninjau karya.', 403)
      const portfolioID = relationID(data.portfolio) ?? relationID(originalDoc?.portfolio)
      if (portfolioID === undefined) throw new APIError('Karya yang ditinjau wajib dipilih.', 400)
      const portfolio = await req.payload.findByID({ collection: 'portfolios', id: portfolioID, depth: 3, overrideAccess: true, req })
      if (portfolio.status === 'draft' && (portfolio.verificationStatus ?? 'unreviewed') === 'unreviewed') {
        throw new APIError('Karya ini masih draf dan belum diajukan oleh siswa.', 409)
      }
      const student = portfolio.student && typeof portfolio.student === 'object' ? portfolio.student : null
      if (!student) throw new APIError('Data siswa pada karya tidak ditemukan.', 404)

      if (isTeacherUser(req.user)) {
        const teacher = req.user as unknown as { id: string | number; class?: unknown; program?: unknown }
        const teacherClass = relationID(teacher.class)
        const teacherProgram = relationID(teacher.program)
        const studentClass = relationID(student.class)
        const classData = student.class && typeof student.class === 'object' ? student.class as unknown as Record<string, unknown> : null
        const studentProgram = relationID(student.program) ?? relationID(classData?.program)
        const inScope = Boolean((teacherClass && String(teacherClass) === String(studentClass)) || (teacherProgram && String(teacherProgram) === String(studentProgram)))
        if (!inScope) throw new APIError('Karya ini berada di luar kelas atau program keahlian yang menjadi tanggung jawabmu.', 403)
        return { ...data, portfolio: portfolioID, reviewer: teacher.id, reviewKey: String(portfolioID) }
      }
      return { ...data, portfolio: portfolioID, reviewKey: String(portfolioID) }
    }],
    afterChange: [async ({ doc, req }) => {
      if (!doc.portfolio) return doc
      const portfolioValue = relationID(doc.portfolio)
      const portfolioID = typeof portfolioValue === 'string' ? Number(portfolioValue) : portfolioValue
      if (typeof portfolioID !== 'number' || !Number.isInteger(portfolioID)) return doc
      const verified = doc.decision === 'verified'
      await req.payload.update({
        collection: 'portfolios', id: portfolioID, overrideAccess: true, req,
        data: {
          verificationStatus: verified ? 'verified' : 'revision-requested',
          verifiedBy: verified ? Number(relationID(doc.reviewer)) : null,
          verifiedAt: verified ? new Date().toISOString() : null,
          reviewFeedback: doc.feedback,
          status: verified ? 'published' : 'draft',
        },
      })
      return doc
    }],
  },
  fields: [
    { name: 'portfolio', label: 'Karya', type: 'relationship', relationTo: 'portfolios', required: true, index: true },
    { name: 'reviewer', label: 'Guru Pembimbing', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { readOnly: true } },
    { name: 'reviewKey', label: 'Kunci Tinjauan', type: 'text', required: true, index: true, admin: { hidden: true } },
    { name: 'decision', label: 'Keputusan', type: 'select', required: true, defaultValue: 'revision-requested', options: [{ label: 'Terverifikasi dan diterbitkan', value: 'verified' }, { label: 'Perlu revisi', value: 'revision-requested' }] },
    { name: 'feedback', label: 'Umpan Balik', type: 'textarea', required: true, maxLength: 3000 },
  ],
}
