import { isCMSAdmin } from '../lib/isCMSAdmin'
import type { CollectionConfig } from 'payload'

export const Students: CollectionConfig = {
  slug: 'students',
  labels: { singular: 'Data Siswa', plural: 'Data Siswa' },
  admin: { group: 'Pengguna', useAsTitle: 'name', defaultColumns: ['nis', 'name', 'class'] },
  access: {
    read: ({ req }) => isCMSAdmin(req.user),
    create: ({ req }) => isCMSAdmin(req.user),
    update: ({ req }) => isCMSAdmin(req.user),
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  fields: [
    { name: 'nis', label: 'NIS', type: 'text', required: true, unique: true },
    { name: 'name', label: 'Nama Siswa', type: 'text', required: true },
    { name: 'class', label: 'Kelas', type: 'relationship', relationTo: 'classes', required: true },
  ],
}
