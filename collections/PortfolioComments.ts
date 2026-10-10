import { isCMSAdmin } from '../lib/isCMSAdmin'
import { isStudentUser } from '../lib/isStudentUser'
import { APIError, type CollectionConfig } from 'payload'

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
    create: ({ req }) => isStudentUser(req.user),
    update: () => false,
    delete: ({ req }) => isCMSAdmin(req.user)
      ? true
      : isStudentUser(req.user)
        ? { student: { equals: req.user.id } }
        : false,
  },
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      if (!isStudentUser(req.user)) throw new APIError('Hanya akun siswa yang dapat berkomentar.', 403)
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
      validate: (value) => typeof value === 'string' && value.trim().length >= 2
        ? true
        : 'Komentar minimal 2 karakter.',
    },
  ],
}
