import config from '@payload-config'
import { getPayload } from 'payload'
import { unreadByConversation } from '../../../../../lib/dbCounts'
import { chatUser, ensureMember, ensureRoom, fail, isBlocked, num, ok, personOf, roomAccess, type Person } from '../../../../../lib/chat'

type InboxItem = {
  id: number; kind: string; refKey: string; title: string; photo: string | null; subtitle: string | null
  lastMessageAt: string | null; preview: string | null; lastSender: string | null; unread: number
  status: string; role: string; invitedBy: string | null; memberCount: number | null; other: Person | null
}

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const meID = Number(user.id)

  const loadMembers = () => payload.find({ collection: 'chat-members', where: { and: [{ user: { equals: meID } }, { status: { in: ['active', 'invited'] } }] }, depth: 2, limit: 300, overrideAccess: true, pagination: false })
  const classID = num((user as { class?: unknown }).class)
  // Keanggotaan dan daftar proyek saling bebas: dibaca bersamaan.
  const [initialRows, projects] = await Promise.all([
    loadMembers(),
    payload.find({
      collection: 'projects', depth: 0, limit: 100, overrideAccess: true,
      where: { or: [{ createdBy: { equals: meID } }, { 'members.member': { equals: meID } }, { 'mentorAssignments.mentor': { equals: meID } }] }, pagination: false }),
  ])
  let rows = initialRows
  const have = new Set(rows.docs.map((row) => (typeof row.conversation === 'object' && row.conversation ? row.conversation.refKey : '')))

  // Ruang kelas dan proyek dibuat otomatis dari data sekolah.
  const wanted: { refKey: string }[] = []
  if (classID !== undefined) wanted.push({ refKey: `class:${classID}` })
  for (const project of projects.docs) wanted.push({ refKey: `project:${project.id}` })
  let created = false
  for (const item of wanted) {
    if (have.has(item.refKey)) continue
    const access = await roomAccess(payload, user, item.refKey)
    if (!access) continue
    const room = await ensureRoom(payload, item.refKey.split(':')[0], item.refKey, access.title)
    await ensureMember(payload, room.id, meID, { role: 'member', status: 'active' })
    created = true
  }
  if (created) rows = await loadMembers()

  const convIDs = rows.docs.map((row) => num(row.conversation)).filter((id): id is number => id !== undefined)
  const [others, unreadMap] = await Promise.all([
    convIDs.length ? payload.find({ collection: 'chat-members', where: { and: [{ conversation: { in: convIDs } }, { user: { not_equals: meID } }, { status: { equals: 'active' } }] }, depth: 1, limit: 1000, overrideAccess: true, pagination: false }) : Promise.resolve({ docs: [] }),
    unreadByConversation(payload, meID),
  ])

  const items: InboxItem[] = []
  for (const row of rows.docs) {
    const conversation = typeof row.conversation === 'object' && row.conversation ? row.conversation : null
    if (!conversation) continue
    const peers = others.docs.filter((entry) => num(entry.conversation) === conversation.id)
    const other = conversation.kind === 'dm' ? personOf(peers[0]?.user) : null
    const unread = row.status === 'active' ? unreadMap.get(conversation.id) || 0 : 0
    const inviter = row.invitedBy && typeof row.invitedBy === 'object' ? (row.invitedBy as { name?: string }).name || null : null
    items.push({
      id: conversation.id, kind: conversation.kind, refKey: conversation.refKey,
      title: conversation.kind === 'dm' ? other?.name || 'Pesan pribadi' : conversation.title || 'Percakapan',
      photo: conversation.kind === 'dm' ? other?.photo || null : (conversation.photo && typeof conversation.photo === 'object' ? conversation.photo.url || null : null), subtitle: conversation.kind === 'dm' ? other?.subtitle || null : null,
      lastMessageAt: conversation.lastMessageAt || null, preview: conversation.lastMessagePreview || null, lastSender: conversation.lastMessageSender || null,
      unread, status: row.status || 'active', role: row.role || 'member', invitedBy: inviter,
      memberCount: conversation.kind === 'dm' ? null : peers.length + 1, other,
    })
  }
  items.sort((a, b) => (a.status === 'invited' ? -1 : 0) - (b.status === 'invited' ? -1 : 0) || Date.parse(b.lastMessageAt || '1970') - Date.parse(a.lastMessageAt || '1970'))
  return ok({ conversations: items })
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const meID = Number(user.id)
  const body = await request.json().catch(() => ({})) as { type?: string; userID?: unknown; title?: string; memberIDs?: unknown[]; refKey?: string }

  if (body.type === 'dm') {
    const targetID = num(body.userID)
    if (targetID === undefined || targetID === meID) return fail('Pilih pengguna lain untuk dikirimi pesan.')
    const target = await payload.findByID({ collection: 'users', id: targetID, depth: 0, overrideAccess: true }).catch(() => null)
    if (!target || !['student', 'teacher'].includes(String(target.role))) return fail('Pengguna tidak ditemukan.', 404)
    if (await isBlocked(payload, meID, targetID)) return fail('Tidak dapat mengirim pesan ke pengguna ini.', 403)
    const [low, high] = [Math.min(meID, targetID), Math.max(meID, targetID)]
    const room = await ensureRoom(payload, 'dm', `dm:${low}:${high}`, 'Pesan pribadi')
    await ensureMember(payload, room.id, meID, { role: 'member', status: 'active' })
    await ensureMember(payload, room.id, targetID, { role: 'member', status: 'active' })
    return ok({ id: room.id })
  }

  if (body.type === 'group') {
    const title = String(body.title || '').trim().slice(0, 60)
    if (title.length < 2) return fail('Beri nama grup minimal 2 karakter.')
    const ids = Array.from(new Set((body.memberIDs || []).map(num).filter((id): id is number => id !== undefined && id !== meID))).slice(0, 30)
    const room = await payload.create({ collection: 'chat-conversations', data: { kind: 'group', refKey: `group:${crypto.randomUUID()}`, title, createdBy: meID }, overrideAccess: true })
    await ensureMember(payload, room.id, meID, { role: 'owner', status: 'active' })
    for (const id of ids) {
      const target = await payload.findByID({ collection: 'users', id, depth: 0, overrideAccess: true }).catch(() => null)
      if (!target || !['student', 'teacher'].includes(String(target.role)) || await isBlocked(payload, meID, id)) continue
      await ensureMember(payload, room.id, id, { role: 'member', status: 'invited', invitedBy: meID })
    }
    return ok({ id: room.id }, 201)
  }

  if (body.type === 'room' && body.refKey) {
    const access = await roomAccess(payload, user, body.refKey)
    if (!access) return fail('Kamu tidak memiliki akses ke ruang ini.', 403)
    const room = await ensureRoom(payload, body.refKey.split(':')[0], body.refKey, access.title)
    await ensureMember(payload, room.id, meID, { role: 'member', status: 'active' })
    return ok({ id: room.id })
  }
  return fail('Permintaan tidak dikenali.')
}
