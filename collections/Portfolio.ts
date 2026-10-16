import { isCMSAdmin } from '../lib/isCMSAdmin'
import { isStudentUser } from '../lib/isStudentUser'
import { isTeacherUser } from '../lib/isTeacherUser'
import { ValidationError, type AccessResult, type CollectionConfig, type PayloadRequest } from 'payload'

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
      // Penanda niat dari form ("Ajukan verifikasi"); bukan kolom database.
      const submitForReview = nextData.submitForReview === true
      delete nextData.submitForReview

      if (isStudentUser(req.user)) {
        nextData.student = req.user.id
        nextData.status = 'draft'
        if (submitForReview) {
          // Diajukan ke Guru (juga untuk pengajuan ulang setelah revisi atau setelah mengedit karya terbit).
          nextData.verificationStatus = 'submitted'
          nextData.verifiedBy = null
          nextData.verifiedAt = null
          if (originalDoc?.status === 'published') nextData.reviewFeedback = null
          else nextData.reviewFeedback = originalDoc?.reviewFeedback ?? null
        } else if (originalDoc?.status === 'published') {
          // Mengedit karya terbit tanpa mengajukan: kembali menjadi draf yang belum ditinjau.
          nextData.verificationStatus = 'unreviewed'
          nextData.verifiedBy = null
          nextData.verifiedAt = null
          nextData.reviewFeedback = null
        } else if (originalDoc) {
          // Menyimpan perubahan tidak mengubah status tinjauan (draf tetap draf, yang diajukan tetap diajukan).
          nextData.verificationStatus = originalDoc.verificationStatus
          nextData.verifiedBy = originalDoc.verifiedBy
          nextData.verifiedAt = originalDoc.verifiedAt
          nextData.reviewFeedback = originalDoc.reviewFeedback
        } else {
          nextData.verificationStatus = 'unreviewed'
        }
      }

      // Draf cukup berjudul. Karya yang diajukan atau diterbitkan harus lengkap.
      const effective = (key: 'summary' | 'categoryRef') => key in nextData ? nextData[key] : originalDoc?.[key]
      const verificationStatus = 'verificationStatus' in nextData ? nextData.verificationStatus : originalDoc?.verificationStatus
      const status = 'status' in nextData ? nextData.status : originalDoc?.status
      if (status === 'published' || verificationStatus === 'submitted') {
        const missing = [
          ...(String(effective('summary') ?? '').trim() ? [] : [{ label: 'Ringkasan Karya', message: 'Isian ini wajib diisi.', path: 'summary' }]),
          ...(effective('categoryRef') ? [] : [{ label: 'Kategori', message: 'Isian ini wajib diisi.', path: 'categoryRef' }]),
        ]
        if (missing.length) throw new ValidationError({ collection: 'portfolios', errors: missing }, req.t)
      }

      const categoryRef = effective('categoryRef')
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
      // Tidak wajib di level field agar draf bisa disimpan; dicek hook saat diajukan/diterbitkan.
    },
    {
      name: 'category',
      label: 'Kategori Lama',
      type: 'select',
      options: [
        'UI/UX', 'Web Development', 'Branding', 'Graphic Design', 'Photography', 'Motion',
        'TR-TRANSMISI', 'TR-OPTIK', 'TR-SINYAL', 'TR-TELEKOM',
        'TJKT-TOPOLOGI', 'TJKT-SERVER', 'TJKT-KEAMANAN', 'TJKT-HARDWARE',
        'TJA-FTTH', 'TJA-ODP', 'TJA-WIRELESS', 'TJA-LAYANAN',
        'PPLG-WEB', 'PPLG-MOBILE', 'PPLG-GAME', 'PPLG-UIUX',
        'DKV-BRAND', 'DKV-GRAFIS', 'DKV-FOTO', 'DKV-MOTION',
      ],
      admin: { hidden: true },
    },
    // Tidak wajib di level field agar draf bisa disimpan; kelengkapannya dicek hook saat diajukan/diterbitkan.
    { name: 'summary', label: 'Ringkasan Karya', type: 'textarea' },
    {
      name: 'details',
      label: 'Detail Karya',
      type: 'richText',
      admin: { description: 'Penjelasan lengkap proses, tujuan, dan hasil karya. Format teks dapat diatur melalui editor.' },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'uploads',
      label: 'Gambar Sampul',
      admin: { description: 'Unggah gambar sampul dalam format JPG, PNG, atau WebP.' },
    },
    {
      name: 'galleryImages',
      type: 'upload',
      relationTo: 'uploads',
      hasMany: true,
      label: 'Galeri Karya',
      admin: { description: 'Unggah gambar tambahan untuk ditampilkan pada halaman detail karya.' },
    },
    { name: 'year', label: 'Tahun', type: 'number', defaultValue: new Date().getFullYear() },
    { name: 'tools', label: 'Perangkat & teknologi yang digunakan', type: 'text', hasMany: true },
    {
      name: 'projectUrl', label: 'Tautan Karya', type: 'text',
      validate: (value: unknown) => {
        if (!value) return true
        try { return ['http:', 'https:'].includes(new URL(String(value)).protocol) ? true : 'Tautan karya harus memakai HTTP atau HTTPS.' }
        catch { return 'Masukkan tautan karya yang valid.' }
      },
    },
    { name: 'projectFile', label: 'Video atau Dokumen Pendukung', type: 'upload', relationTo: 'uploads', admin: { description: 'Opsional. Unggah video MP4/WebM atau dokumen PDF sebagai bukti karya.' } },
    // Bukan kolom database: form siswa mengirim true untuk "Ajukan verifikasi" (lihat hook beforeChange).
    { name: 'submitForReview', type: 'checkbox', virtual: true, admin: { hidden: true } },
    {
      name: 'verificationStatus', label: 'Status Verifikasi', type: 'select', defaultValue: 'unreviewed',
      access: { create: ({ req }) => isCMSAdmin(req.user), update: ({ req }) => isCMSAdmin(req.user) || isTeacherUser(req.user) || isStudentUser(req.user) },
      options: [
        { label: 'Draf (belum diajukan)', value: 'unreviewed' },
        { label: 'Menunggu verifikasi', value: 'submitted' },
        { label: 'Terverifikasi', value: 'verified' },
        { label: 'Perlu revisi', value: 'revision-requested' },
      ],
      admin: { readOnly: true, position: 'sidebar' },
    },
    { name: 'verifiedBy', label: 'Diverifikasi oleh', type: 'relationship', relationTo: 'users', access: { create: ({ req }) => isCMSAdmin(req.user), update: ({ req }) => isCMSAdmin(req.user) || isTeacherUser(req.user) || isStudentUser(req.user) }, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'verifiedAt', label: 'Tanggal Verifikasi', type: 'date', access: { create: ({ req }) => isCMSAdmin(req.user), update: ({ req }) => isCMSAdmin(req.user) || isTeacherUser(req.user) || isStudentUser(req.user) }, admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'reviewFeedback', label: 'Umpan Balik Guru', type: 'textarea', maxLength: 3000,
      access: {
        create: ({ req }) => isCMSAdmin(req.user),
        update: ({ req }) => isCMSAdmin(req.user) || isTeacherUser(req.user) || isStudentUser(req.user),
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
        update: ({ req }) => isCMSAdmin(req.user) || isStudentUser(req.user),
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
