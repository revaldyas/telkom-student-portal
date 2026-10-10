import type { CollectionConfig } from 'payload'
import { isCMSAdmin } from '../lib/isCMSAdmin'

export const Admins: CollectionConfig = {
  slug: 'admins',
  labels: { singular: 'Admin CMS', plural: 'Admin CMS' },
  auth: { tokenExpiration: 60 * 60 * 24 * 30 },
  admin: { group: 'Administrasi', useAsTitle: 'name', defaultColumns: ['name', 'email', 'createdAt'] },
  access: {
    read: ({ req }) => isCMSAdmin(req.user),
    create: ({ req }) => isCMSAdmin(req.user),
    update: ({ req }) => isCMSAdmin(req.user),
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  fields: [
    { name: 'name', label: 'Nama lengkap', type: 'text', required: true },
  ],
}
