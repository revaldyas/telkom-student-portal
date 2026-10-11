import { isCMSAdmin } from '../lib/isCMSAdmin'
import type { CollectionConfig } from 'payload'

const validButtonURL = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return false
  const url = value.trim()
  if (url.startsWith('/') && !url.startsWith('//')) return true
  try { return new URL(url).protocol === 'https:' }
  catch { return false }
}

export const HomeBanners: CollectionConfig = {
  slug: 'home-banners',
  labels: { singular: 'Banner Beranda', plural: 'Banner Beranda' },
  admin: { group: 'Beranda', useAsTitle: 'title', defaultColumns: ['title', 'status', 'sortOrder', 'updatedAt'] },
  access: {
    read: ({ req }) => isCMSAdmin(req.user) ? true : { status: { equals: 'published' } },
    create: ({ req }) => isCMSAdmin(req.user),
    update: ({ req }) => isCMSAdmin(req.user),
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  fields: [
    { name: 'eyebrow', label: 'Label kecil', type: 'text', required: true, defaultValue: 'SOROTAN TEL-CREATION' },
    { name: 'title', label: 'Judul banner', type: 'text', required: true, maxLength: 120 },
    { name: 'description', label: 'Deskripsi', type: 'textarea', required: true, maxLength: 260 },
    { name: 'image', label: 'Gambar banner', type: 'upload', relationTo: 'uploads', admin: { description: 'Opsional. Banner tanpa gambar akan menampilkan placeholder skeleton.' } },
    { name: 'primaryButtonLabel', label: 'Teks tombol utama', dbName: 'primary_button_label', type: 'text', required: true, maxLength: 32 },
    {
      name: 'primaryButtonUrl', label: 'Tautan tombol utama', type: 'text', required: true,
      validate: (value: unknown) => validButtonURL(value) ? true : 'Masukkan path internal (contoh: /karya) atau URL HTTPS.',
    },
    { name: 'secondaryButtonLabel', label: 'Teks tombol kedua', dbName: 'secondary_button_label', type: 'text', maxLength: 32 },
    {
      name: 'secondaryButtonUrl', label: 'Tautan tombol kedua', type: 'text',
      validate: (value: unknown) => !value || validButtonURL(value) ? true : 'Masukkan path internal (contoh: /awards) atau URL HTTPS.',
    },
    { name: 'sortOrder', label: 'Urutan tampil', type: 'number', required: true, defaultValue: 0, min: 0, admin: { description: 'Angka lebih kecil ditampilkan lebih dahulu.' } },
    {
      name: 'status', label: 'Status banner', type: 'select', required: true, defaultValue: 'draft',
      options: [{ label: 'Draf', value: 'draft' }, { label: 'Tayang', value: 'published' }],
    },
  ],
}
