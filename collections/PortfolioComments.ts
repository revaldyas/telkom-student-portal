import { isCMSAdmin } from '../lib/isCMSAdmin'
import { isStudentUser } from '../lib/isStudentUser'
import { isTeacherUser } from '../lib/isTeacherUser'

// Siswa dan guru dapat berinteraksi (suka/komentar); voting penghargaan tetap khusus siswa.
const canEngage = (user: unknown): user is { id: string | number; role: 'student' | 'teacher' } => isStudentUser(user) || isTeacherUser(user)
import { APIError, type CollectionConfig, type Where } from 'payload'

const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return undefined
}

export const PortfolioComments: CollectionConfig = {
  slug: 'portfolio-comments',
  labels: { singular: 'Komentar Karya', plural: 'Komentar Karya' },
  admin: { hidden: true, useAsTitle: 'content', defaultColumns: ['portfolio', 'student', 'createdAt'] },
  access: {
    read: ({ req }) => isCMSAdmin(req.user),
    create: ({ req }) => canEngage(req.user),
    // Penulis dapat mengubah isi komentarnya sendiri (hook di bawah mengunci karya dan penulis).
    update: ({ req }) => isCMSAdmin(req.user)
      ? true
      : canEngage(req.user)
        ? { student: { equals: req.user.id } }
        : false,
    // Penulis dan pemilik karya dapat menghapus komentar.
    delete: ({ req }) => isCMSAdmin(req.user)
      ? true
      : canEngage(req.user)
        ? { or: [{ student: { equals: req.user.id } } as Where, { 'portfolio.student': { equals: req.user.id } } as Where] }
        : false,
  },
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      // Saat mengedit, hanya isi komentar yang berubah; karya dan penulis tetap seperti semula.
      if (operation === 'update' && originalDoc) {
        return { ...data, portfolio: relationID(originalDoc.portfolio), student: relationID(originalDoc.student) }
      }
      if (!canEngage(req.user)) throw new APIError('Hanya akun siswa atau guru yang dapat berkomentar.', 403)
      const portfolioID = relationID(data.portfolio) ?? relationID(originalDoc?.portfolio)
      if (portfolioID === undefined) throw new APIError('Karya yang dikomentari wajib dipilih.', 400)
      const portfolio = await req.payload.findByID({
        collection: 'portfolios', id: portfolioID, depth: 0, overrideAccess: true, req,
      })
      if (portfolio.status !== 'published') throw new APIError('Karya ini belum diterbitkan.', 400)
      return { ...data, portfolio: portfolioID, student: req.user.id }
    }],
  },
  fields: [
    { name: 'portfolio', label: 'Karya', type: 'relationship', relationTo: 'portfolios', required: true, index: true },
    { name: 'student', label: 'Siswa', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { hidden: true } },
    {
      name: 'content', label: 'Komentar', type: 'textarea', required: true, maxLength: 1200,
      // Validator kustom menggantikan pemeriksaan maxLength bawaan, jadi batasnya dicek di sini.
      validate: (value) => {
        if (typeof value !== 'string' || value.trim().length < 2) return 'Komentar minimal 2 karakter.'
        return value.length > 1200 ? 'Komentar maksimal 1200 karakter.' : true
      },
    },
  ],
}
