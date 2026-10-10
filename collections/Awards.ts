import { isCMSAdmin } from '../lib/isCMSAdmin'
import type { CollectionConfig } from 'payload'

export const Awards: CollectionConfig = {
  slug: 'awards',
  labels: { singular: 'Penghargaan', plural: 'Penghargaan' },
  admin: { group: 'Penghargaan', useAsTitle: 'title', defaultColumns: ['title', 'status', 'opensAt', 'closesAt'] },
  access: {
    read: ({ req }) => isCMSAdmin(req.user) ? true : { status: { not_equals: 'draft' } },
    create: ({ req }) => isCMSAdmin(req.user),
    update: ({ req }) => isCMSAdmin(req.user),
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  fields: [
    { name: 'title', label: 'Nama Penghargaan', type: 'text', required: true },
    { name: 'description', label: 'Deskripsi', type: 'textarea', required: true },
    { name: 'opensAt', label: 'Voting Dibuka', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    {
      name: 'closesAt',
      label: 'Voting Ditutup',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
      validate: (value, { siblingData }) => {
        const opensAt = (siblingData as { opensAt?: string } | undefined)?.opensAt
        if (!value || !opensAt) return true
        return new Date(value).getTime() > new Date(opensAt).getTime()
          ? true
          : 'Waktu penutupan harus setelah waktu pembukaan voting.'
      },
    },
    {
      name: 'status',
      label: 'Status Penghargaan',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draf', value: 'draft' },
        { label: 'Dibuka', value: 'open' },
        { label: 'Ditutup', value: 'closed' },
        { label: 'Hasil Diumumkan', value: 'announced' },
      ],
    },
    {
      name: 'nominees',
      label: 'Nominasi Portofolio',
      type: 'relationship',
      relationTo: 'portfolios',
      hasMany: true,
      required: true,
      filterOptions: { status: { equals: 'published' } },
      admin: { description: 'Pilih karya yang akan menjadi nominasi award ini.' },
    },
  ],
}
