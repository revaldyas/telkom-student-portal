import { isCMSAdmin } from '../lib/isCMSAdmin'
import { isStudentUser } from '../lib/isStudentUser'
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

export const AwardVotes: CollectionConfig = {
  slug: 'award-votes',
  labels: { singular: 'Suara Penghargaan', plural: 'Suara Penghargaan' },
  admin: {
    group: 'Penghargaan',
    useAsTitle: 'voteKey',
    defaultColumns: ['award', 'portfolio', 'createdAt'],
    description: 'Daftar suara yang masuk. Gunakan filter Penghargaan untuk melihat suara pada award tertentu.',
  },
  access: {
    read: ({ req }) => isCMSAdmin(req.user)
      ? true
      : isStudentUser(req.user)
        ? { voter: { equals: req.user.id } }
        : false,
    create: ({ req }) => isStudentUser(req.user),
    update: ({ req }) => isStudentUser(req.user)
      ? { voter: { equals: req.user.id } }
      : false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      if (!isStudentUser(req.user)) throw new APIError('Voting hanya tersedia untuk akun siswa.', 403)

      const awardID = relationID(data.award) ?? relationID(originalDoc?.award)
      const portfolioID = relationID(data.portfolio) ?? relationID(originalDoc?.portfolio)
      if (awardID === undefined || portfolioID === undefined) {
        throw new APIError('Award dan portofolio nominasi wajib dipilih.', 400)
      }

      const award = await req.payload.findByID({
        collection: 'awards',
        id: awardID,
        depth: 0,
        overrideAccess: true,
        req,
      })
      const now = Date.now()
      const opensAt = new Date(award.opensAt).getTime()
      const closesAt = new Date(award.closesAt).getTime()
      if (award.status !== 'open' || now < opensAt || now > closesAt) {
        throw new APIError('Voting untuk award ini sedang tidak dibuka.', 400)
      }

      const nominees = Array.isArray(award.nominees) ? award.nominees.map(relationID) : []
      if (!nominees.some((id) => id !== undefined && String(id) === String(portfolioID))) {
        throw new APIError('Portofolio ini bukan nominasi award tersebut.', 400)
      }
      const portfolio = await req.payload.findByID({
        collection: 'portfolios',
        id: portfolioID,
        depth: 0,
        overrideAccess: true,
        req,
      })
      if (String(relationID(portfolio.student)) === String(req.user.id)) {
        throw new APIError('Kamu tidak dapat memilih karya sendiri.', 400)
      }

      return {
        ...data,
        award: awardID,
        portfolio: portfolioID,
        voter: req.user.id,
        voteKey: `${awardID}:${req.user.id}`,
      }
    }],
  },
  fields: [
    { name: 'award', label: 'Penghargaan', type: 'relationship', relationTo: 'awards', required: true },
    {
      name: 'portfolio',
      label: 'Portofolio Pilihan',
      type: 'relationship',
      relationTo: 'portfolios',
      required: true,
    },
    {
      name: 'voter',
      label: 'Pemilih',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { hidden: true },
      hooks: {
        beforeValidate: [({ req }) => req.user?.id],
      },
    },
    {
      name: 'voteKey',
      label: 'Kunci Suara',
      type: 'text',
      required: true,
      unique: true,
      admin: { hidden: true },
      hooks: {
        beforeValidate: [({ req, siblingData, value }) => {
          const awardID = relationID(siblingData?.award)
          return req.user && awardID !== undefined ? `${awardID}:${req.user.id}` : value
        }],
      },
      validate: async (value: unknown, { id, req }: { id?: string | number; req: PayloadRequest }) => {
        if (typeof value !== 'string' || !value) return 'Suara tidak dapat disimpan.'
        const existingVotes = await req.payload.find({
          collection: 'award-votes',
          where: id === undefined
            ? { voteKey: { equals: value } }
            : { and: [{ voteKey: { equals: value } }, { id: { not_equals: id } }] },
          limit: 1,
          overrideAccess: true,
          req,
        })
        return existingVotes.docs.length === 0
          ? true
          : 'Kamu sudah memberikan suara untuk award ini. Ubah pilihan yang tersimpan.'
      },
    },
  ],
}
