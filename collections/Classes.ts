import { isCMSAdmin } from '../lib/isCMSAdmin'
import type { CollectionConfig } from 'payload'

export const Classes: CollectionConfig = {
  slug: 'classes',
  labels: { singular: 'Kelas', plural: 'Kelas' },
  admin: { group: 'Akademik', useAsTitle: 'name', defaultColumns: ['name', 'program'] },
  access: {
    create: ({ req }) => isCMSAdmin(req.user),
    update: ({ req }) => isCMSAdmin(req.user),
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  fields: [
    { name: 'name', label: 'Nama Kelas', type: 'text', required: true, unique: true },
    { name: 'program', label: 'Program Keahlian', type: 'relationship', relationTo: 'programs', required: true },
  ],
}
