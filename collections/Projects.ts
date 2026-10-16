import { APIError, type AccessResult, type CollectionConfig, type PayloadRequest } from 'payload'
import { isCMSAdmin } from '../lib/isCMSAdmin'
import { isStudentUser } from '../lib/isStudentUser'
import { isTeacherUser } from '../lib/isTeacherUser'

const idOf = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return undefined
}

const slugify = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const canReadPrivateProjectFields = (user: unknown, doc: Record<string, unknown> | undefined) => {
  if (isCMSAdmin(user)) return true
  if (!user || typeof user !== 'object' || !('id' in user)) return false
  const viewerID = String((user as { id: string | number }).id)
  if (isStudentUser(user) && String(idOf(doc?.createdBy)) === viewerID) return true
  if (isTeacherUser(user) && Array.isArray(doc?.mentorAssignments)) {
    return doc.mentorAssignments.some((entry) => entry && typeof entry === 'object' && String(idOf((entry as Record<string, unknown>).mentor)) === viewerID)
  }
  return false
}

export const Projects: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Proyek', plural: 'Proyek' },
  admin: { group: 'Portofolio', useAsTitle: 'title', defaultColumns: ['title', 'createdBy', 'status', 'updatedAt'] },
  access: {
    read: ({ req }): AccessResult => {
      if (isCMSAdmin(req.user)) return true
      if (!req.user) return { status: { equals: 'published' } }
      if (isStudentUser(req.user)) return { or: [{ status: { equals: 'published' } }, { createdBy: { equals: req.user.id } }] }
      return { status: { equals: 'published' } }
    },
    create: ({ req }) => isCMSAdmin(req.user) || isStudentUser(req.user),
    update: ({ req }) => isCMSAdmin(req.user) ? true : isStudentUser(req.user) ? { createdBy: { equals: req.user.id } } : false,
    delete: ({ req }) => isCMSAdmin(req.user) ? true : isStudentUser(req.user) ? { createdBy: { equals: req.user.id } } : false,
  },
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      const nextData = { ...data }
      if (isStudentUser(req.user)) {
        nextData.createdBy = req.user.id
        nextData.status = 'draft'
        nextData.verificationStatus = req.context?.projectAction === 'submit'
          ? 'submitted'
          : originalDoc?.status === 'published' || originalDoc?.verificationStatus === 'verified' || originalDoc?.verificationStatus === 'submitted' || originalDoc?.verificationStatus === 'revision-requested'
            ? 'unreviewed'
            : originalDoc?.verificationStatus || 'unreviewed'
        nextData.verifiedBy = originalDoc?.status === 'published' ? null : idOf(originalDoc?.verifiedBy) || null
        nextData.verifiedAt = originalDoc?.status === 'published' ? null : originalDoc?.verifiedAt || null
        nextData.reviewFeedback = originalDoc?.status === 'published' ? null : originalDoc?.reviewFeedback || null
      }

      const creatorID = idOf(nextData.createdBy) ?? idOf(originalDoc?.createdBy)
      const existingAssignments = Array.isArray(originalDoc?.mentorAssignments) ? originalDoc.mentorAssignments : []
      const submittedAssignments = Array.isArray(nextData.mentorAssignments) ? nextData.mentorAssignments : existingAssignments
      const assignments = submittedAssignments.map((entry: Record<string, unknown>) => {
        const mentor = idOf(entry.mentor)
        const previous = existingAssignments.find((candidate: Record<string, unknown>) => String(idOf(candidate.mentor)) === String(mentor)) as Record<string, unknown> | undefined
        return { mentor, assignmentRole: entry.assignmentRole === 'primary' ? 'primary' : 'supporting', response: isStudentUser(req.user) ? previous?.response || 'invited' : entry.response || 'invited' }
      }).filter((entry: { mentor?: string | number }) => entry.mentor !== undefined)
      const assignedIDs = new Set<string>()
      for (const entry of assignments as Array<{ mentor: string | number; assignmentRole: string }>) {
        if (assignedIDs.has(String(entry.mentor))) throw new APIError('Guru yang sama tidak dapat diundang lebih dari satu kali.', 400)
        assignedIDs.add(String(entry.mentor))
        const mentor = await req.payload.findByID({ collection: 'users', id: entry.mentor, depth: 0, overrideAccess: true, req })
        if (mentor.role !== 'teacher') throw new APIError('Pembimbing proyek harus memiliki akun Guru.', 400)
      }
      if (assignments.filter((entry: { assignmentRole: string }) => entry.assignmentRole === 'primary').length > 1) throw new APIError('Pilih satu Guru sebagai mentor utama.', 400)
      if (assignments.length && !assignments.some((entry: { assignmentRole: string }) => entry.assignmentRole === 'primary')) assignments[0].assignmentRole = 'primary'
      const submittedMembers = Array.isArray(nextData.members) ? nextData.members : Array.isArray(originalDoc?.members) ? originalDoc.members : []
      const members = submittedMembers.map((entry: Record<string, unknown>) => ({ ...entry, member: idOf(entry.member) })).filter((entry: { member?: string | number }) => entry.member !== undefined)
      if (isStudentUser(req.user)) {
        if (!members.some((entry: { member?: string | number }) => String(entry.member) === String(req.user?.id))) {
          members.unshift({ member: req.user.id, contribution: 'Inisiator' })
        }
      }
      if (members.length === 0) throw new APIError('Tambahkan minimal satu siswa sebagai anggota proyek.', 400)
      const uniqueIDs = new Set<string>()
      for (const entry of members as Array<{ member: string | number }>) {
        const key = String(entry.member)
        if (uniqueIDs.has(key)) throw new APIError('Siswa yang sama tidak dapat ditambahkan lebih dari satu kali.', 400)
        uniqueIDs.add(key)
        const member = await req.payload.findByID({ collection: 'users', id: entry.member, depth: 0, overrideAccess: true, req })
        if (member.role !== 'student') throw new APIError('Anggota proyek harus memiliki akun siswa.', 400)
      }
      if (creatorID !== undefined) nextData.createdBy = creatorID
      nextData.members = members
      nextData.mentorAssignments = assignments
      return nextData
    }],
  },
  fields: [
    { name: 'title', label: 'Nama Proyek', type: 'text', required: true, maxLength: 160 },
    {
      name: 'slug', label: 'Slug URL', type: 'text', required: true, unique: true, index: true,
      admin: { readOnly: true, description: 'Dibuat otomatis dari nama proyek.' },
      hooks: { beforeValidate: [({ siblingData }) => slugify(String(siblingData?.title ?? ''))] },
      validate: async (value: unknown, { id, req }: { id?: string | number; req: PayloadRequest }) => {
        if (typeof value !== 'string' || !value) return 'Slug proyek tidak dapat dibuat dari nama ini.'
        const duplicate = await req.payload.find({ collection: 'projects', where: id === undefined ? { slug: { equals: value } } : { and: [{ slug: { equals: value } }, { id: { not_equals: id } }] }, limit: 1, overrideAccess: true, req })
        return duplicate.docs.length ? 'Slug proyek sudah digunakan. Ubah nama proyek agar slug berbeda.' : true
      },
    },
    // Tidak wajib di level field agar draf bisa disimpan; wajib saat proyek diajukan (lihat route actions) dan diterbitkan.
    { name: 'summary', label: 'Ringkasan Proyek', type: 'textarea', maxLength: 800 },
    { name: 'details', label: 'Detail Proyek', type: 'richText', admin: { description: 'Jelaskan tujuan, proses kolaborasi, dan hasil proyek.' } },
    { name: 'categoryRef', label: 'Kategori', type: 'relationship', relationTo: 'portfolio-categories' },
    { name: 'members', label: 'Anggota Proyek', type: 'array', minRows: 1, labels: { singular: 'Anggota', plural: 'Anggota Proyek' }, fields: [
      // Tanpa filterOptions: validasinya berjalan dengan hak akses siswa yang login, dan siswa hanya boleh membaca akunnya sendiri,
      // sehingga rekan tim dan guru selalu dianggap tidak valid. Peran anggota/pembimbing dicek di hook beforeChange.
      { name: 'member', label: 'Siswa', type: 'relationship', relationTo: 'users', required: true },
      { name: 'contribution', label: 'Kontribusi atau Peran', type: 'text', required: true, maxLength: 120 },
    ] },
    { name: 'mentorAssignments', label: 'Guru Pembimbing', type: 'array', access: { read: ({ req, doc }) => canReadPrivateProjectFields(req.user, doc as Record<string, unknown> | undefined) }, labels: { singular: 'Guru pembimbing', plural: 'Guru pembimbing' }, admin: { description: 'Satu mentor utama mengambil keputusan akhir. Mentor pendamping dapat memberi masukan.' }, fields: [
      { name: 'mentor', label: 'Guru', type: 'relationship', relationTo: 'users', required: true },
      { name: 'assignmentRole', label: 'Peran', type: 'select', required: true, defaultValue: 'supporting', options: [{ label: 'Mentor utama', value: 'primary' }, { label: 'Mentor pendamping', value: 'supporting' }] },
      { name: 'response', label: 'Respons undangan', type: 'select', required: true, defaultValue: 'invited', options: [{ label: 'Menunggu jawaban', value: 'invited' }, { label: 'Diterima', value: 'accepted' }, { label: 'Ditolak', value: 'declined' }] },
    ] },
    { name: 'reviewHistory', label: 'Riwayat Tinjauan', type: 'array', access: { read: ({ req, doc }) => canReadPrivateProjectFields(req.user, doc as Record<string, unknown> | undefined) }, admin: { readOnly: true }, fields: [
      { name: 'reviewer', label: 'Guru', type: 'relationship', relationTo: 'users', required: true },
      { name: 'reviewerRole', label: 'Peran', type: 'select', required: true, options: [{ label: 'Mentor utama', value: 'primary' }, { label: 'Mentor pendamping', value: 'supporting' }] },
      { name: 'decision', label: 'Tindakan', type: 'select', required: true, options: [{ label: 'Masukan', value: 'comment' }, { label: 'Disetujui dan diterbitkan', value: 'verified' }, { label: 'Perlu revisi', value: 'revision-requested' }] },
      { name: 'feedback', label: 'Pesan', type: 'textarea', required: true },
      { name: 'reviewedAt', label: 'Waktu', type: 'date', required: true },
    ] },
    { name: 'createdBy', label: 'Pengelola Proyek', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'coverImage', label: 'Gambar Sampul', type: 'upload', relationTo: 'uploads' },
    { name: 'galleryImages', label: 'Galeri Proyek', type: 'upload', relationTo: 'uploads', hasMany: true },
    { name: 'year', label: 'Tahun', type: 'number', defaultValue: new Date().getFullYear() },
    { name: 'tools', label: 'Perangkat & teknologi yang digunakan', type: 'text', hasMany: true },
    { name: 'projectUrl', label: 'Tautan Proyek', type: 'text', validate: (value: unknown) => {
      if (!value) return true
      try { return ['http:', 'https:'].includes(new URL(String(value)).protocol) ? true : 'Tautan proyek harus memakai HTTP atau HTTPS.' }
      catch { return 'Masukkan tautan proyek yang valid.' }
    } },
    { name: 'verificationStatus', label: 'Status Verifikasi', type: 'select', defaultValue: 'unreviewed', access: { create: ({ req }) => isCMSAdmin(req.user), update: ({ req }) => isCMSAdmin(req.user) }, options: [{ label: 'Belum ditinjau', value: 'unreviewed' }, { label: 'Menunggu verifikasi', value: 'submitted' }, { label: 'Terverifikasi', value: 'verified' }, { label: 'Perlu revisi', value: 'revision-requested' }], admin: { position: 'sidebar', readOnly: true } },
    { name: 'verifiedBy', label: 'Diverifikasi oleh', type: 'relationship', relationTo: 'users', access: { create: ({ req }) => isCMSAdmin(req.user), update: ({ req }) => isCMSAdmin(req.user) }, admin: { position: 'sidebar', readOnly: true } },
    { name: 'verifiedAt', label: 'Tanggal Verifikasi', type: 'date', access: { create: ({ req }) => isCMSAdmin(req.user), update: ({ req }) => isCMSAdmin(req.user) }, admin: { position: 'sidebar', readOnly: true } },
    { name: 'reviewFeedback', label: 'Umpan Balik Guru', type: 'textarea', maxLength: 3000, access: { create: ({ req }) => isCMSAdmin(req.user), update: ({ req }) => isCMSAdmin(req.user) }, admin: { readOnly: true } },
    { name: 'status', label: 'Status Publikasi', type: 'select', required: true, defaultValue: 'draft', access: { create: ({ req }) => isCMSAdmin(req.user), update: ({ req }) => isCMSAdmin(req.user) }, options: [{ label: 'Draf', value: 'draft' }, { label: 'Terbit', value: 'published' }] },
  ],
}
