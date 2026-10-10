import { isCMSAdmin } from '../lib/isCMSAdmin'
import type { CollectionConfig } from 'payload'

export const Programs: CollectionConfig = {
  slug: 'programs',
  labels: { singular: 'Program Keahlian', plural: 'Program Keahlian' },
  admin: { group: 'Akademik', useAsTitle: 'name', defaultColumns: ['name', 'code'] },
  access: {
    create: ({ req }) => isCMSAdmin(req.user),
    update: ({ req }) => isCMSAdmin(req.user),
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  fields: [
    { name: 'name', label: 'Nama Program Keahlian', type: 'text', required: true, unique: true },
    { name: 'code', label: 'Kode Program', type: 'text', required: true, unique: true },
    { name: 'description', label: 'Deskripsi', type: 'textarea' },
  ],
}
