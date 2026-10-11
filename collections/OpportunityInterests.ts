import { isCMSAdmin } from '../lib/isCMSAdmin'
import { isStudentUser } from '../lib/isStudentUser'
import { isTeacherUser } from '../lib/isTeacherUser'
import { APIError, type CollectionConfig } from 'payload'

const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return undefined
}

export const OpportunityInterests: CollectionConfig = {
  slug: 'opportunity-interests',
  labels: { singular: 'Minat Peluang', plural: 'Peminat Peluang' },
  admin: { group: 'Peluang & Dampak', useAsTitle: 'interestKey', defaultColumns: ['opportunity', 'student', 'status', 'createdAt'] },
  access: {
    read: ({ req }) => isCMSAdmin(req.user) || isTeacherUser(req.user) ? true : isStudentUser(req.user) ? { student: { equals: req.user.id } } : false,
    create: ({ req }) => isStudentUser(req.user),
    update: ({ req }) => isCMSAdmin(req.user) || isTeacherUser(req.user),
    delete: ({ req }) => isCMSAdmin(req.user) ? true : isStudentUser(req.user) ? { student: { equals: req.user.id } } : false,
  },
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      if (isTeacherUser(req.user)) {
        const interestID = originalDoc?.id
        const status = data.status
        if (interestID === undefined || !['contacted', 'completed', 'interested'].includes(String(status))) {
          throw new APIError('Status minat tidak valid.', 400)
        }
        const interest = await req.payload.findByID({ collection: 'opportunity-interests', id: interestID, depth: 2, overrideAccess: true, req })
        const student = typeof interest.student === 'object' ? interest.student : null
        const teacher = req.user as unknown as { class?: unknown; program?: unknown }
        const sameClass = relationID(teacher.class) !== undefined && String(relationID(teacher.class)) === String(relationID(student?.class))
        const sameProgram = relationID(teacher.program) !== undefined && String(relationID(teacher.program)) === String(relationID(student?.program))
        if (!sameClass && !sameProgram) throw new APIError('Minat siswa ini berada di luar tanggung jawabmu.', 403)
        return { status }
      }
      if (!isStudentUser(req.user)) throw new APIError('Peluang hanya dapat diikuti oleh akun siswa.', 403)
      const opportunityID = relationID(data.opportunity) ?? relationID(originalDoc?.opportunity)
      if (opportunityID === undefined) throw new APIError('Peluang wajib dipilih.', 400)
      const opportunity = await req.payload.findByID({ collection: 'opportunities', id: opportunityID, depth: 0, overrideAccess: true, req })
      if (opportunity.status !== 'open') throw new APIError('Pendaftaran peluang ini sedang tidak dibuka.', 400)
      const now = Date.now()
      if (opportunity.opensAt && new Date(opportunity.opensAt).getTime() > now) throw new APIError('Pendaftaran peluang ini belum dibuka.', 400)
      if (opportunity.deadline && new Date(opportunity.deadline).getTime() < now) throw new APIError('Batas pendaftaran peluang ini sudah lewat.', 400)
      const student = await req.payload.findByID({ collection: 'users', id: req.user.id, depth: 1, overrideAccess: true, req })
      const targets = Array.isArray(opportunity.targetPrograms) ? opportunity.targetPrograms : []
      if (targets.length && !targets.some((target) => String(relationID(target)) === String(relationID(student.program)))) {
        throw new APIError('Peluang ini tidak ditujukan untuk program keahlianmu.', 403)
      }
      return { ...data, opportunity: opportunityID, student: req.user.id, interestKey: `${opportunityID}:${req.user.id}`, status: 'interested' }
    }],
  },
  fields: [
    { name: 'opportunity', label: 'Peluang', type: 'relationship', relationTo: 'opportunities', required: true, index: true },
    { name: 'student', label: 'Siswa', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { readOnly: true } },
    { name: 'interestKey', label: 'Kunci Minat', type: 'text', required: true, unique: true, admin: { hidden: true } },
    { name: 'note', label: 'Catatan Siswa', type: 'textarea', maxLength: 800 },
    { name: 'status', label: 'Status Minat', type: 'select', defaultValue: 'interested', options: [{ label: 'Tertarik', value: 'interested' }, { label: 'Dihubungi', value: 'contacted' }, { label: 'Selesai', value: 'completed' }] },
  ],
}
