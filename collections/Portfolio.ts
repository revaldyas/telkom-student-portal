import { isCMSAdmin } from '../lib/isCMSAdmin'
import { isStudentUser } from '../lib/isStudentUser'
import { isTeacherUser } from '../lib/isTeacherUser'
import type { AccessResult, CollectionConfig, PayloadRequest } from 'payload'

const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return relationID((value as { id: unknown }).id)
  return undefined
}

const createSlug = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')

export const Portfolio: CollectionConfig = {
  slug: 'portfolios',
  labels: { singular: 'Portofolio', plural: 'Portofolio' },
  admin: { group: 'Portofolio', useAsTitle: 'title', defaultColumns: ['title', 'student', 'categoryRef', 'status'] },
  access: {
    read: ({ req }): AccessResult => {
      if (isCMSAdmin(req.user)) return true
      if (!req.user) return { status: { equals: 'published' } }
      if (isTeacherUser(req.user)) return { status: { equals: 'published' } }
      return { or: [{ status: { equals: 'published' } }, { student: { equals: req.user.id } }] }
    },
    create: ({ req }) => isCMSAdmin(req.user) || isStudentUser(req.user),
    update: ({ req }) => isCMSAdmin(req.user) ? true : isTeacherUser(req.user) ? false : { student: { equals: req.user?.id } },
    delete: ({ req }) => isCMSAdmin(req.user) ? true : { student: { equals: req.user?.id } },
  },
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      const nextData = { ...data }
      if (isStudentUser(req.user)) nextData.student = req.user.id

      const categoryRef = nextData.categoryRef ?? originalDoc?.categoryRef
      if (categoryRef) {
        const categoryID = typeof categoryRef === 'object' ? categoryRef.id : categoryRef
        const category = await req.payload.findByID({
          collection: 'portfolio-categories',
          id: categoryID,
          depth: 0,
          overrideAccess: true,
          req,
        })
        nextData.category = category.code
      }

      return nextData
    }],
  },
  fields: [
    { name: 'title', label: 'Judul Karya', type: 'text', required: true },
    {
      name: 'slug',
      label: 'Slug URL',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Dibuat otomatis dari judul karya.',
      },
      hooks: {
        beforeValidate: [({ siblingData }) => createSlug(String(siblingData?.title ?? ''))],
      },
      validate: async (value: unknown, { id, req }: { id?: string | number; req: PayloadRequest }) => {
        if (typeof value !== 'string' || !value) return 'Slug URL tidak dapat dibuat dari judul ini.'

        const duplicates = await req.payload.find({
          collection: 'portfolios',
          where: id === undefined
            ? { slug: { equals: value } }
            : { and: [{ slug: { equals: value } }, { id: { not_equals: id } }] },
          limit: 1,
          overrideAccess: true,
          req,
        })

        return duplicates.docs.length === 0
          ? true
          : 'Slug URL sudah digunakan. Ubah judul karya agar menghasilkan slug yang berbeda.'
      },
    },
    { name: 'student', label: 'Siswa', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'categoryRef',
      label: 'Kategori',
      type: 'relationship',
      relationTo: 'portfolio-categories',
      required: true,
    },
    {
      name: 'category',
      label: 'Kategori Lama',
      type: 'select',
      options: ['UI/UX', 'Web Development', 'Branding', 'Graphic Design', 'Photography', 'Motion'],
      admin: { hidden: true },
    },
    { name: 'summary', label: 'Ringkasan Karya', type: 'textarea', required: true },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'uploads',
      label: 'Gambar Sampul',
      admin: { description: 'Unggah gambar sampul dalam format JPG, PNG, atau WebP.' },
    },
    { name: 'year', label: 'Tahun', type: 'number', defaultValue: new Date().getFullYear() },
    { name: 'tools', label: 'Perangkat yang Digunakan', type: 'text', hasMany: true },
    {
      name: 'projectUrl', label: 'Tautan Karya', type: 'text',
      validate: (value: unknown) => {
        if (!value) return true
        try { return ['http:', 'https:'].includes(new URL(String(value)).protocol) ? true : 'Tautan karya harus memakai HTTP atau HTTPS.' }
        catch { return 'Masukkan tautan karya yang valid.' }
      },
    },
    { name: 'projectFile', label: 'Video atau Dokumen Pendukung', type: 'upload', relationTo: 'uploads', admin: { description: 'Opsional. Unggah video MP4/WebM atau dokumen PDF sebagai bukti karya.' } },
    {
      name: 'verificationStatus', label: 'Status Verifikasi', type: 'select', defaultValue: 'unreviewed',
      access: { create: ({ req }) => isCMSAdmin(req.user), update: ({ req }) => isCMSAdmin(req.user) || isTeacherUser(req.user) },
      options: [
        { label: 'Belum ditinjau', value: 'unreviewed' },
        { label: 'Terverifikasi', value: 'verified' },
        { label: 'Perlu revisi', value: 'revision-requested' },
      ],
      admin: { readOnly: true, position: 'sidebar' },
    },
    { name: 'verifiedBy', label: 'Diverifikasi oleh', type: 'relationship', relationTo: 'users', access: { create: ({ req }) => isCMSAdmin(req.user), update: ({ req }) => isCMSAdmin(req.user) || isTeacherUser(req.user) }, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'verifiedAt', label: 'Tanggal Verifikasi', type: 'date', access: { create: ({ req }) => isCMSAdmin(req.user), update: ({ req }) => isCMSAdmin(req.user) || isTeacherUser(req.user) }, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'reviewFeedback', label: 'Umpan Balik Guru', type: 'textarea', maxLength: 3000,
      access: {
        create: ({ req }) => isCMSAdmin(req.user),
        update: ({ req }) => isCMSAdmin(req.user) || isTeacherUser(req.user),
        read: ({ req, doc }) => isCMSAdmin(req.user) || (isStudentUser(req.user) && String(relationID(doc?.student)) === String(req.user.id)),
      },
      admin: { readOnly: true },
    },
    {
      name: 'status',
      label: 'Status Publikasi',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      access: {
        create: ({ req }) => isCMSAdmin(req.user),
        update: ({ req }) => isCMSAdmin(req.user),
      },
      options: [{ label: 'Draf', value: 'draft' }, { label: 'Terbit', value: 'published' }],
    },
    {
      name: 'featured',
      label: 'Karya Unggulan',
      type: 'checkbox',
      defaultValue: false,
      access: {
        create: ({ req }) => isCMSAdmin(req.user),
        update: ({ req }) => isCMSAdmin(req.user),
      },
    },
  ],
}
