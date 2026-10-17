import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, loadAccess, num, ok, personOf } from '../../../../../../lib/chat'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const access = await loadAccess(payload, user, Number((await params).id))
  if (!access) return fail('Percakapan tidak ditemukan.', 404)
  const { conversation, member } = access
  const meID = Number(user.id)

  let people: { person: ReturnType<typeof personOf>; role: string; status: string; note?: string | null }[] = []
  let projectInfo: { title: string; summary: string; year: number | null; slug: string; category: string | null; cover: string | null; published: boolean } | null = null
  if (conversation.kind === 'class' || conversation.kind === 'project') {
    const [kind, rawID] = conversation.refKey.split(':')
    const ids = new Set<number>()
    if (kind === 'class') {
      const classmates = await payload.find({ collection: 'users', where: { and: [{ class: { equals: Number(rawID) } }, { role: { in: ['student', 'teacher'] } }] }, depth: 1, limit: 200, overrideAccess: true, pagination: false })
      people = classmates.docs.map((doc) => ({ person: personOf(doc), role: doc.role === 'teacher' ? 'teacher' : 'member', status: 'active' }))
    } else {
      const project = await payload.findByID({ collection: 'projects', id: Number(rawID), depth: 1, overrideAccess: true })
      const owner = num(project.createdBy)
      if (owner !== undefined) ids.add(owner)
      const roles = new Map<number, string>()
      for (const entry of Array.isArray(project.members) ? project.members : []) { const id = num(entry.member); if (id !== undefined) { ids.add(id); if (entry.contribution) roles.set(id, entry.contribution) } }
      const mentorRoles = new Map<number, string>()
      for (const entry of (Array.isArray(project.mentorAssignments) ? project.mentorAssignments : []).filter((item) => item.response !== 'declined')) { const id = num(entry.mentor); if (id !== undefined) { ids.add(id); mentorRoles.set(id, entry.assignmentRole === 'primary' ? 'Mentor utama' : 'Mentor pendamping') } }
      const users = ids.size ? await payload.find({ collection: 'users', where: { id: { in: [...ids] } }, depth: 1, limit: 100, overrideAccess: true, pagination: false }) : { docs: [] }
      people = users.docs.map((doc) => ({ person: personOf(doc), role: mentorRoles.has(Number(doc.id)) ? 'teacher' : 'member', status: 'active', note: mentorRoles.get(Number(doc.id)) || roles.get(Number(doc.id)) || (Number(doc.id) === owner ? 'Pengelola proyek' : null) }))
      projectInfo = {
        title: project.title, summary: project.summary || '', year: project.year ?? null, slug: project.slug,
        category: typeof project.categoryRef === 'object' && project.categoryRef ? project.categoryRef.name : null,
        cover: typeof project.coverImage === 'object' && project.coverImage ? project.coverImage.url || null : null,
        published: project.status === 'published',
      }
    }
  } else {
    const rows = await payload.find({ collection: 'chat-members', where: { and: [{ conversation: { equals: conversation.id } }, { status: { in: ['active', 'invited'] } }] }, depth: 1, limit: 100, overrideAccess: true, pagination: false })
    people = rows.docs.map((row) => ({ person: personOf(row.user), role: row.role || 'member', status: row.status || 'active' }))
  }
  const blockedByMe = conversation.kind === 'dm'
    ? (await payload.count({ collection: 'chat-blocks', overrideAccess: true, where: { and: [{ blocker: { equals: meID } }, { blocked: { equals: num(people.find((entry) => entry.person?.id !== meID)?.person?.id) ?? -1 } }] } })).totalDocs > 0
    : false
  const full = await payload.findByID({ collection: 'chat-conversations', id: conversation.id, depth: 1, overrideAccess: true })
  const photo = full.photo && typeof full.photo === 'object' ? full.photo.url || null : null
  const isManager = ['owner', 'admin'].includes(String(member?.role))
  let href: string | null = null
  if (conversation.kind === 'project') {
    const project = await payload.findByID({ collection: 'projects', id: Number(conversation.refKey.split(':')[1]), depth: 0, overrideAccess: true }).catch(() => null)
    href = project ? `/proyek/${project.slug}` : null
  } else if (conversation.kind === 'dm') {
    const other = people.find((entry) => entry.person?.id !== meID)?.person
    href = other ? `/${other.role === 'teacher' ? 'guru' : 'siswa'}/${other.id}` : null
  }
  return ok({
    id: conversation.id, kind: conversation.kind, title: conversation.title, myRole: member?.role || 'member', photo, href, project: projectInfo,
    // Grup: pemilik/admin dapat mengganti nama dan foto. Proyek: anggota tim dapat mengganti foto.
    canEdit: (conversation.kind === 'group' && isManager) || conversation.kind === 'project',
    canRename: conversation.kind === 'group' && isManager,
    canInvite: conversation.kind === 'group' && isManager,
    blockedByMe, people: people.filter((entry) => entry.person),
  })
}

/** Mengubah nama (grup) dan/atau foto (grup dan proyek). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const access = await loadAccess(payload, user, Number((await params).id))
  if (!access) return fail('Percakapan tidak ditemukan.', 404)
  const { conversation, member } = access
  const isManager = ['owner', 'admin'].includes(String(member?.role))
  const canEdit = (conversation.kind === 'group' && isManager) || conversation.kind === 'project'
  if (!canEdit) return fail('Kamu tidak dapat mengubah percakapan ini.', 403)
  const body = await request.json().catch(() => ({})) as { title?: string; photoID?: unknown }
  const data: { title?: string; photo?: number | null } = {}
  if (body.title !== undefined) {
    if (conversation.kind !== 'group') return fail('Nama ruang ini mengikuti data sekolah dan tidak dapat diubah.', 403)
    const title = String(body.title).trim().slice(0, 60)
    if (title.length < 2) return fail('Nama grup minimal 2 karakter.')
    data.title = title
  }
  if (body.photoID !== undefined) {
    if (body.photoID === null) data.photo = null
    else {
      const photoID = num(body.photoID)
      const upload = photoID === undefined ? null : await payload.findByID({ collection: 'uploads', id: photoID, depth: 0, overrideAccess: true }).catch(() => null)
      if (!upload || !String(upload.mimeType || '').startsWith('image/')) return fail('Foto tidak valid.')
      data.photo = photoID
    }
  }
  if (!Object.keys(data).length) return fail('Tidak ada perubahan.')
  await payload.update({ collection: 'chat-conversations', id: conversation.id, data, overrideAccess: true })
  return ok({ ok: true })
}
