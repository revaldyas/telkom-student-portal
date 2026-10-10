import { isCMSAdmin } from '../lib/isCMSAdmin'
import type { CollectionConfig } from 'payload'

export const PortfolioCategories: CollectionConfig = {
  slug: 'portfolio-categories',
  labels: { singular: 'Kategori Portofolio', plural: 'Kategori Portofolio' },
  admin: { group: 'Portofolio', useAsTitle: 'name', defaultColumns: ['name', 'code'] },
  access: {
    read: () => true,
    create: ({ req }) => isCMSAdmin(req.user),
    update: ({ req }) => isCMSAdmin(req.user),
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  fields: [
    { name: 'name', label: 'Nama Kategori', type: 'text', required: true, unique: true },
    { name: 'code', label: 'Kode Kategori', type: 'text', required: true, unique: true },
    { name: 'description', label: 'Deskripsi', type: 'textarea' },
  ],
}
