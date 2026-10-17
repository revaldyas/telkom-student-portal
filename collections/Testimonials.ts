import { isCMSAdmin } from '../lib/isCMSAdmin'
import type { CollectionConfig } from 'payload'

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: { singular: 'Testimoni', plural: 'Testimoni' },
  admin: { group: 'Beranda', useAsTitle: 'name', defaultColumns: ['name', 'role', 'status', 'sortOrder'] },
  access: {
    read: ({ req }) => isCMSAdmin(req.user) ? true : { status: { equals: 'published' } },
    create: ({ req }) => isCMSAdmin(req.user),
    update: ({ req }) => isCMSAdmin(req.user),
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  fields: [
    { name: 'seedKey', label: 'Kunci Seeder', type: 'text', required: true, unique: true, admin: { hidden: true } },
    { name: 'quote', label: 'Testimoni', type: 'textarea', required: true, maxLength: 600 },
    { name: 'name', label: 'Nama', type: 'text', required: true, maxLength: 80 },
    { name: 'role', label: 'Peran', type: 'text', required: true, maxLength: 80 },
    { name: 'program', label: 'Program Keahlian', type: 'text', maxLength: 100 },
    { name: 'isSample', label: 'Data Contoh', type: 'checkbox', defaultValue: false, admin: { description: 'Tandai testimoni demonstrasi agar tidak disalahartikan sebagai kutipan asli.' } },
    { name: 'sortOrder', label: 'Urutan Tampil', type: 'number', required: true, defaultValue: 0, min: 0 },
    { name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'draft', options: [{ label: 'Draf', value: 'draft' }, { label: 'Tayang', value: 'published' }] },
  ],
}
