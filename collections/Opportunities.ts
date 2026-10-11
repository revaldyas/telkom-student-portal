import { isCMSAdmin } from '../lib/isCMSAdmin'
import { isTeacherUser } from '../lib/isTeacherUser'
import type { CollectionConfig } from 'payload'

const canManage = (user: unknown) => isCMSAdmin(user) || isTeacherUser(user)

export const Opportunities: CollectionConfig = {
  slug: 'opportunities',
  labels: { singular: 'Peluang', plural: 'Peluang & Kolaborasi' },
  admin: { group: 'Peluang & Dampak', useAsTitle: 'title', defaultColumns: ['title', 'type', 'status', 'deadline'] },
  access: {
    read: ({ req }) => canManage(req.user) ? true : { status: { not_equals: 'draft' } },
    create: ({ req }) => canManage(req.user),
    update: ({ req }) => canManage(req.user),
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  fields: [
    { name: 'title', label: 'Nama Peluang', type: 'text', required: true },
    { name: 'type', label: 'Jenis Peluang', type: 'select', required: true, options: [
      { label: 'Kompetisi', value: 'competition' }, { label: 'Pameran', value: 'exhibition' },
      { label: 'Tantangan Proyek', value: 'challenge' }, { label: 'Mentoring', value: 'mentoring' },
      { label: 'Kolaborasi Industri', value: 'collaboration' }, { label: 'Lainnya', value: 'other' },
    ] },
    { name: 'organizer', label: 'Penyelenggara', type: 'text', required: true },
    { name: 'summary', label: 'Deskripsi', type: 'textarea', required: true },
    { name: 'requirements', label: 'Syarat dan Informasi', type: 'textarea' },
    { name: 'coverImage', label: 'Gambar Sampul', type: 'upload', relationTo: 'uploads' },
    { name: 'targetPrograms', label: 'Program Keahlian Sasaran', type: 'relationship', relationTo: 'programs', hasMany: true },
    { name: 'opensAt', label: 'Mulai', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'deadline', label: 'Batas Pendaftaran', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    {
      name: 'url', label: 'Tautan Informasi atau Pendaftaran', type: 'text',
      validate: (value: unknown) => {
        if (!value) return true
        try { return ['http:', 'https:'].includes(new URL(String(value)).protocol) ? true : 'Tautan harus memakai HTTP atau HTTPS.' }
        catch { return 'Masukkan tautan yang valid.' }
      },
    },
    { name: 'contact', label: 'Kontak', type: 'text' },
    { name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'draft', options: [
      { label: 'Draf', value: 'draft' }, { label: 'Dibuka', value: 'open' }, { label: 'Ditutup', value: 'closed' },
    ] },
  ],
}
