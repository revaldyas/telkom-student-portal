import { isCMSAdmin } from '../lib/isCMSAdmin'
import type { PayloadRequest } from 'payload'
import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Pengguna', plural: 'Pengguna' },
  auth: { tokenExpiration: 60 * 60 * 24 * 30, depth: 1 },
  admin: { group: 'Pengguna', useAsTitle: 'name', defaultColumns: ['name', 'email', 'role'] },
  access: {
    read: ({ req }) => isCMSAdmin(req.user)
      ? true
      : req.user
        ? { id: { equals: req.user.id } }
        : false,
    create: ({ req }) => isCMSAdmin(req.user),
    update: ({ req }) => isCMSAdmin(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false,
    delete: ({ req }) => isCMSAdmin(req.user),
  },
  fields: [
    { name: 'name', label: 'Nama lengkap', type: 'text', required: true },
    {
      name: 'bio',
      label: 'Bio',
      type: 'textarea',
      admin: {
        condition: (_, siblingData) => ['student', 'teacher'].includes(String(siblingData?.role)),
        description: 'Opsional. Tampil pada profil publik.',
      },
    },
    {
      name: 'interests',
      label: 'Minat',
      type: 'text',
      hasMany: true,
      admin: { condition: (_, siblingData) => ['student', 'teacher'].includes(String(siblingData?.role)), description: 'Bidang yang ingin dipelajari atau dikembangkan.' },
    },
    {
      name: 'skills',
      label: 'Keterampilan',
      type: 'text',
      hasMany: true,
      admin: { condition: (_, siblingData) => ['student', 'teacher'].includes(String(siblingData?.role)) },
    },
    {
      name: 'experiences',
      label: 'Pengalaman Proyek',
      type: 'text',
      hasMany: true,
      admin: { condition: (_, siblingData) => ['student', 'teacher'].includes(String(siblingData?.role)), description: 'Satu pengalaman per baris, misalnya: Proyek Aplikasi — pembimbing, 2025.' },
    },
    {
      name: 'role',
      label: 'Jenis Akun',
      type: 'select',
      required: true,
      saveToJWT: true,
      access: {
        create: ({ req }) => isCMSAdmin(req.user),
        update: ({ req }) => isCMSAdmin(req.user),
      },
      defaultValue: 'student',
      options: [
        { label: 'Siswa', value: 'student' },
        { label: 'Guru', value: 'teacher' },
      ],
    },
    {
      name: 'nis',
      label: 'NIS (Nomor Induk Siswa)',
      type: 'text',
      unique: true,
      access: { update: ({ req }) => isCMSAdmin(req.user) },
      hooks: {
        beforeValidate: [({ value }) => typeof value === 'string' ? value.trim() : value],
      },
      admin: {
        condition: (_, siblingData) => siblingData?.role === 'student',
        description: 'Wajib diisi dan harus terdaftar pada Data Siswa.',
      },
      validate: async (value: unknown, { operation, previousValue, req, siblingData }: {
        operation?: string
        previousValue?: unknown
        req: PayloadRequest
        siblingData: unknown
      }) => {
        const role = siblingData && typeof siblingData === 'object' && 'role' in siblingData
          ? siblingData.role
          : undefined
        if (role !== 'student') return true
        if (typeof value !== 'string' || !value.trim()) return 'NIS wajib diisi untuk akun siswa.'
        if (operation === 'update' && value === previousValue) return true

        const matchingStudents = await req.payload.find({
          collection: 'students',
          where: { nis: { equals: value.trim() } },
          limit: 1,
          overrideAccess: true,
          req,
        })

        return matchingStudents.docs.length > 0
          ? true
          : 'NIS tidak ditemukan pada Data Siswa. Periksa NIS atau tambahkan datanya terlebih dahulu.'
      },
    },
    {
      name: 'class',
      label: 'Kelas',
      type: 'relationship',
      relationTo: 'classes',
      access: { update: ({ req }) => isCMSAdmin(req.user) },
      admin: { condition: (_, siblingData) => ['student', 'teacher'].includes(String(siblingData?.role)) },
    },
    {
      name: 'program',
      label: 'Program Keahlian',
      type: 'relationship',
      relationTo: 'programs',
      access: { update: ({ req }) => isCMSAdmin(req.user) },
      admin: { condition: (_, siblingData) => ['student', 'teacher'].includes(String(siblingData?.role)) },
    },
    { name: 'lastSeenAt', label: 'Terakhir terlihat', type: 'date', admin: { hidden: true, readOnly: true } },
    { name: 'showPresence', label: 'Tampilkan status online', type: 'checkbox', defaultValue: true, admin: { description: 'Jika dimatikan, kamu selalu tampil offline bagi pengguna lain.' } },
    {
      name: 'pinnedWorks',
      label: 'Karya Disematkan',
      type: 'json',
      admin: { description: 'ID karya terbit yang disematkan di profil (maksimal 3, urutan = urutan tampil).' },
      hooks: {
        // Hanya karya terbit milik sendiri; unik; maksimal 3.
        beforeValidate: [async ({ value, req, originalDoc }) => {
          if (value === undefined || value === null) return value
          const list = Array.isArray(value) ? value : []
          const ids = Array.from(new Set(list.map(Number).filter((id) => Number.isInteger(id) && id > 0))).slice(0, 3)
          const ownerID = (originalDoc as { id?: number | string } | undefined)?.id
          if (!ids.length || ownerID === undefined) return []
          const owned = await req.payload.find({
            collection: 'portfolios', where: { and: [{ id: { in: ids } }, { student: { equals: ownerID } }, { status: { equals: 'published' } }] },
            depth: 0, limit: 3, pagination: false, overrideAccess: true, req,
          })
          const allowed = new Set(owned.docs.map((doc) => Number(doc.id)))
          return ids.filter((id) => allowed.has(id))
        }],
      },
    },
    {
      name: 'appearance',
      label: 'Tampilan Profil',
      type: 'group',
      admin: { description: 'Personalisasi profil publik. Siswa dan guru mengaturnya dari portal.' },
      fields: [
        { name: 'coverMode', label: 'Jenis cover', type: 'select', defaultValue: 'gradient', options: [{ label: 'Gradien', value: 'gradient' }, { label: 'Gambar', value: 'image' }] },
        { name: 'gradient', label: 'Gradien', type: 'text', defaultValue: 'telkom', maxLength: 24 },
        { name: 'pattern', label: 'Pola', type: 'text', defaultValue: 'dots', maxLength: 24 },
        { name: 'accent', label: 'Warna aksen', type: 'text', defaultValue: '#e50914', maxLength: 7, validate: (value: unknown) => !value || /^#[0-9a-fA-F]{6}$/.test(String(value)) || 'Gunakan format warna heksadesimal, misalnya #e50914.' },
        { name: 'avatarShape', label: 'Bentuk foto', type: 'select', defaultValue: 'circle', options: [{ label: 'Lingkaran', value: 'circle' }, { label: 'Kotak membulat', value: 'rounded' }] },
        { name: 'tagline', label: 'Tagline', type: 'text', maxLength: 80 },
        { name: 'coverImage', label: 'Gambar cover', type: 'upload', relationTo: 'uploads' },
      ],
    },
    {
      name: 'profilePhoto',
      label: 'Foto Profil',
      type: 'upload',
      relationTo: 'uploads',
      admin: { description: 'Unggah foto profil (JPG, PNG, atau WebP).' },
    },
  ],
}
