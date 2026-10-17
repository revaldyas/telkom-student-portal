import { isCMSAdmin } from '../lib/isCMSAdmin'
import { isStudentUser } from '../lib/isStudentUser'
import { isTeacherUser } from '../lib/isTeacherUser'

// Siswa dan guru dapat berinteraksi (suka/komentar); voting penghargaan tetap khusus siswa.
const canEngage = (user: unknown): user is { id: string | number; role: 'student' | 'teacher' } => isStudentUser(user) || isTeacherUser(user)
import { APIError, type CollectionConfig } from 'payload'
import type { PayloadRequest } from 'payload'

const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return undefined
}

export const PortfolioLikes: CollectionConfig = {
  slug: 'portfolio-likes',
  labels: { singular: 'Suka Karya', plural: 'Suka Karya' },
  admin: { hidden: true, useAsTitle: 'likeKey' },
  access: {
    read: ({ req }) => isCMSAdmin(req.user)
      ? true
      : canEngage(req.user)
        ? { student: { equals: req.user.id } }
        : false,
    create: ({ req }) => canEngage(req.user),
    update: () => false,
    delete: ({ req }) => isCMSAdmin(req.user)
      ? true
      : canEngage(req.user)
        ? { student: { equals: req.user.id } }
        : false,
  },
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      if (!canEngage(req.user)) throw new APIError('Hanya akun siswa atau guru yang dapat menyukai karya.', 403)
      const portfolioID = relationID(data.portfolio) ?? relationID(originalDoc?.portfolio)
      if (portfolioID === undefined) throw new APIError('Karya yang disukai wajib dipilih.', 400)
      const portfolio = await req.payload.findByID({
        collection: 'portfolios', id: portfolioID, depth: 0, overrideAccess: true, req,
      })
      if (portfolio.status !== 'published') throw new APIError('Karya ini belum diterbitkan.', 400)
      if (String(relationID(portfolio.student)) === String(req.user.id)) {
        throw new APIError('Kamu tidak dapat menyukai karya sendiri.', 400)
      }
      return { ...data, portfolio: portfolioID, student: req.user.id, likeKey: `${portfolioID}:${req.user.id}` }
    }],
  },
  fields: [
    { name: 'portfolio', label: 'Karya', type: 'relationship', relationTo: 'portfolios', required: true, index: true },
    { name: 'student', label: 'Siswa', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { hidden: true } },
    {
      name: 'likeKey', label: 'Kunci Suka', type: 'text', required: true, unique: true, admin: { hidden: true },
      hooks: { beforeValidate: [({ req, siblingData, value }) => {
        const portfolioID = relationID(siblingData?.portfolio)
        return req.user && portfolioID !== undefined ? `${portfolioID}:${req.user.id}` : value
      }] },
      validate: async (value: unknown, { id, req }: { id?: string | number; req: PayloadRequest }) => {
        if (typeof value !== 'string' || !value) return 'Suka karya tidak dapat disimpan.'
        const existing = await req.payload.find({
          collection: 'portfolio-likes',
          where: id === undefined
            ? { likeKey: { equals: value } }
            : { and: [{ likeKey: { equals: value } }, { id: { not_equals: id } }] },
          limit: 1, overrideAccess: true, req,
        })
        return existing.docs.length ? 'Kamu sudah menyukai karya ini.' : true
      },
    },
  ],
}
