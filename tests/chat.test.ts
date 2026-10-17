import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DELETE as unblockUser, GET as listBlocks, POST as blockUser } from '../app/(payload)/api/chat/blocks/route'
import { GET as inbox, POST as createConversation } from '../app/(payload)/api/chat/conversations/route'
import { GET as conversationInfo, PATCH as editConversation } from '../app/(payload)/api/chat/conversations/[id]/route'
import { POST as invite } from '../app/(payload)/api/chat/conversations/[id]/members/route'
import { DELETE as removeMember } from '../app/(payload)/api/chat/conversations/[id]/members/[userID]/route'
import { GET as listMessages, POST as sendMessage } from '../app/(payload)/api/chat/conversations/[id]/messages/route'
import { POST as markRead } from '../app/(payload)/api/chat/conversations/[id]/read/route'
import { POST as respond } from '../app/(payload)/api/chat/conversations/[id]/respond/route'
import { POST as report } from '../app/(payload)/api/chat/reports/route'
import { GET as unreadCount } from '../app/(payload)/api/chat/unread/route'
import { GET as searchUsers } from '../app/(payload)/api/chat/users/route'
import { as, begin, createWorld, makeRequest, params, rollback, type World } from './world'

let w: World
beforeAll(async () => { await begin(); w = await createWorld() })
afterAll(rollback)

type Doc = { id: number; [key: string]: unknown }
type Handler = (request: Request, ctx: { params: Promise<never> }) => Promise<Response>
const call = async (handler: unknown, path: string, options: { method?: string; body?: unknown; user?: Doc | null; p?: Record<string, string> } = {}) => {
  const { method = 'GET', body, user = null, p = {} } = options
  const response = await (handler as Handler)(makeRequest(path, { method, body, user: user ?? undefined }), params(p) as never)
  const data = await response.json().catch(() => ({}))
  return { status: response.status, data }
}

let counter = 0
const unique = (label: string) => `${label} ${w.suffix} ${++counter}`
const dm = async (from: Doc, to: Doc) => (await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'dm', userID: to.id }, user: from })).data.id as number
const say = (conversation: number, user: Doc, text: string) => call(sendMessage, `/api/chat/conversations/${conversation}/messages`, { method: 'POST', body: { text }, user, p: { id: String(conversation) } })
const messages = (conversation: number, user: Doc, query = '') => call(listMessages, `/api/chat/conversations/${conversation}/messages${query}`, { user, p: { id: String(conversation) } })
const group = async (owner: Doc, members: Doc[] = [], title = unique('Grup')) =>
  (await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'group', title, memberIDs: members.map((member) => member.id) }, user: owner })).data.id as number
const rowOf = async (conversation: number, user: Doc) => (await w.payload.find({ collection: 'chat-members', where: { and: [{ conversation: { equals: conversation } }, { user: { equals: user.id } }] }, limit: 1, depth: 0, overrideAccess: true })).docs[0] as unknown as Doc & { status: string; role: string; lastReadId: number }
const accept = (conversation: number, user: Doc) => call(respond, `/api/chat/conversations/${conversation}/respond`, { method: 'POST', body: { action: 'accept' }, user, p: { id: String(conversation) } })
const newProject = async () => (await w.payload.create({
  collection: 'projects', depth: 0, ...as(w.studentA),
  data: { title: unique('Proyek chat'), summary: 'Ringkasan', members: [{ member: w.studentA.id, contribution: 'Inisiator' }, { member: w.studentB.id, contribution: 'Anggota' }], mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary' }] } as never,
})) as unknown as Doc

describe('Chat: akses dasar', () => {
  it('tanpa sesi → 401 pada kotak masuk, kirim, dan pencarian pengguna', async () => {
    expect((await call(inbox, '/api/chat/conversations')).status).toBe(401)
    expect((await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'dm', userID: w.studentB.id } })).status).toBe(401)
    expect((await call(searchUsers, '/api/chat/users')).status).toBe(401)
  })
  it('jumlah belum dibaca tanpa sesi bernilai nol, bukan error', async () => {
    const { status, data } = await call(unreadCount, '/api/chat/unread')
    expect(status).toBe(200)
    expect(data).toEqual({ unread: 0, invites: 0 })
  })
  it('jenis permintaan yang tidak dikenal ditolak (400)', async () => {
    expect((await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'lainnya' }, user: w.studentA })).status).toBe(400)
  })
})

describe('Chat: pesan langsung (DM)', () => {
  it('membuat DM; membuka DM yang sama dua kali menghasilkan percakapan yang sama, dari sisi mana pun', async () => {
    const first = await dm(w.studentA, w.studentB)
    expect(first).toBeTypeOf('number')
    expect(await dm(w.studentA, w.studentB)).toBe(first)
    expect(await dm(w.studentB, w.studentA)).toBe(first)
  })
  it('tidak bisa mengirim DM ke diri sendiri atau pengguna yang tidak ada', async () => {
    expect((await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'dm', userID: w.studentA.id }, user: w.studentA })).status).toBe(400)
    expect((await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'dm', userID: 99999999 }, user: w.studentA })).status).toBe(404)
  })
  it('DM muncul di kotak masuk kedua pihak dengan lawan bicara yang benar', async () => {
    const id = await dm(w.studentA, w.studentC)
    const mine = (await call(inbox, '/api/chat/conversations', { user: w.studentA })).data.conversations.find((item: Doc) => item.id === id)
    expect(mine.kind).toBe('dm')
    expect((mine.other as Doc).id).toBe(w.studentC.id)
    const theirs = (await call(inbox, '/api/chat/conversations', { user: w.studentC })).data.conversations.find((item: Doc) => item.id === id)
    expect((theirs.other as Doc).id).toBe(w.studentA.id)
  })
  it('guru dan siswa dapat saling mengirim DM', async () => {
    const id = await dm(w.teacher, w.studentA)
    expect((await say(id, w.teacher, 'Selamat pagi')).status).toBe(201)
    expect((await messages(id, w.studentA)).data.messages.map((item: Doc) => item.body)).toContain('Selamat pagi')
  })
})

describe('Chat: pesan', () => {
  it('mengirim pesan, membacanya berurutan lama → baru, dan memperbarui pratinjau percakapan', async () => {
    const id = await dm(w.studentA, w.studentB)
    const one = unique('pesan satu'), two = unique('pesan dua')
    expect((await say(id, w.studentA, one)).status).toBe(201)
    expect((await say(id, w.studentB, two)).status).toBe(201)
    const bodies = (await messages(id, w.studentA)).data.messages.map((item: Doc) => item.body)
    expect(bodies.indexOf(one)).toBeLessThan(bodies.indexOf(two))
    const item = (await call(inbox, '/api/chat/conversations', { user: w.studentA })).data.conversations.find((entry: Doc) => entry.id === id)
    expect(item.preview).toBe(two)
    expect(item.lastSender).toBe('Siswa B')
  })
  it('pesan kosong dan pesan lebih dari 2000 karakter ditolak; tepat 2000 diterima', async () => {
    const id = await dm(w.studentA, w.studentB)
    expect((await say(id, w.studentA, '   ')).status).toBe(400)
    expect((await say(id, w.studentA, 'x'.repeat(2001))).status).toBe(400)
    expect((await say(id, w.studentA, 'x'.repeat(2000))).status).toBe(201)
  })
  it('orang di luar percakapan tidak bisa membaca atau mengirim (404)', async () => {
    const id = await dm(w.studentA, w.studentB)
    expect((await messages(id, w.studentC)).status).toBe(404)
    expect((await say(id, w.studentC, 'menyusup')).status).toBe(404)
    expect((await call(conversationInfo, `/api/chat/conversations/${id}`, { user: w.studentC, p: { id: String(id) } })).status).toBe(404)
  })
  it('?after= hanya memuat pesan yang lebih baru (untuk polling)', async () => {
    const id = await dm(w.studentA, w.studentB)
    const first = (await say(id, w.studentA, unique('lama'))).data.message.id as number
    const newer = unique('baru')
    await say(id, w.studentB, newer)
    const result = (await messages(id, w.studentA, `?after=${first}`)).data.messages
    expect(result.map((item: Doc) => item.body)).toEqual([newer])
  })
  it('pesan memuat pengirim dengan nama dan peran', async () => {
    const id = await dm(w.teacher, w.studentA)
    const { data } = await say(id, w.teacher, unique('halo'))
    expect(data.message.sender).toMatchObject({ id: w.teacher.id, name: 'Guru A', role: 'teacher' })
  })
})

describe('Chat: belum dibaca', () => {
  it('pesan dari lawan bicara dihitung belum dibaca, pesan sendiri tidak', async () => {
    const id = await dm(w.studentA, w.studentC)
    await say(id, w.studentA, unique('satu'))
    await say(id, w.studentA, unique('dua'))
    const unread = (user: Doc) => call(inbox, '/api/chat/conversations', { user }).then((result) => result.data.conversations.find((item: Doc) => item.id === id).unread)
    expect(await unread(w.studentC)).toBe(2)
    expect(await unread(w.studentA)).toBe(0)
  })
  it('menandai terbaca sampai pesan tertentu menurunkan hitungan; lastReadId tidak mundur', async () => {
    const id = await dm(w.studentA, w.studentC)
    const last = (await say(id, w.studentA, unique('terakhir'))).data.message.id as number
    expect((await call(markRead, `/api/chat/conversations/${id}/read`, { method: 'POST', body: { lastID: last }, user: w.studentC, p: { id: String(id) } })).status).toBe(200)
    const after = (await call(inbox, '/api/chat/conversations', { user: w.studentC })).data.conversations.find((item: Doc) => item.id === id)
    expect(after.unread).toBe(0)
    await call(markRead, `/api/chat/conversations/${id}/read`, { method: 'POST', body: { lastID: 1 }, user: w.studentC, p: { id: String(id) } })
    expect((await rowOf(id, w.studentC)).lastReadId).toBe(last)
  })
  it('endpoint /unread menjumlahkan pesan belum dibaca dan undangan grup yang menunggu', async () => {
    const before = (await call(unreadCount, '/api/chat/unread', { user: w.studentC })).data
    const id = await dm(w.studentA, w.studentC)
    await say(id, w.studentA, unique('notif'))
    const groupID = await group(w.studentA, [w.studentC])
    expect(groupID).toBeTypeOf('number')
    const after = (await call(unreadCount, '/api/chat/unread', { user: w.studentC })).data
    expect(after.unread).toBe(before.unread + 1)
    expect(after.invites).toBe(before.invites + 1)
  })
})

describe('Chat: blokir', () => {
  it('memblokir mencegah pengiriman pesan dari kedua arah dan membuat DM baru', async () => {
    const id = await dm(w.studentB, w.studentC)
    expect((await call(blockUser, '/api/chat/blocks', { method: 'POST', body: { userID: w.studentC.id }, user: w.studentB })).status).toBe(200)
    expect((await say(id, w.studentB, 'dari pemblokir')).status).toBe(403)
    expect((await say(id, w.studentC, 'dari yang diblokir')).status).toBe(403)
    expect((await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'dm', userID: w.studentC.id }, user: w.studentB })).status).toBe(403)
  })
  it('daftar blokir hanya memuat yang diblokir pengguna itu; memblokir dua kali tidak membuat duplikat', async () => {
    await call(blockUser, '/api/chat/blocks', { method: 'POST', body: { userID: w.studentC.id }, user: w.studentB })
    const list = (await call(listBlocks, '/api/chat/blocks', { user: w.studentB })).data.blocked
    expect(list.filter((person: Doc) => person.id === w.studentC.id)).toHaveLength(1)
    expect((await call(listBlocks, '/api/chat/blocks', { user: w.studentC })).data.blocked.map((person: Doc) => person.id)).not.toContain(w.studentB.id)
  })
  it('pengguna yang saling blokir tidak muncul di pencarian pengguna', async () => {
    const names = (await call(searchUsers, '/api/chat/users?q=Siswa', { user: w.studentB })).data.users.map((person: Doc) => person.id)
    expect(names).not.toContain(w.studentC.id)
    expect(names).not.toContain(w.studentB.id)
    const reverse = (await call(searchUsers, '/api/chat/users?q=Siswa', { user: w.studentC })).data.users.map((person: Doc) => person.id)
    expect(reverse).not.toContain(w.studentB.id)
  })
  it('membuka blokir memulihkan percakapan', async () => {
    expect((await call(unblockUser, `/api/chat/blocks?userID=${w.studentC.id}`, { method: 'DELETE', user: w.studentB })).status).toBe(200)
    const id = await dm(w.studentB, w.studentC)
    expect((await say(id, w.studentB, unique('kembali normal'))).status).toBe(201)
  })
  it('tidak bisa memblokir diri sendiri', async () => {
    expect((await call(blockUser, '/api/chat/blocks', { method: 'POST', body: { userID: w.studentA.id }, user: w.studentA })).status).toBe(400)
  })
})

describe('Chat: grup', () => {
  it('nama grup minimal 2 karakter; pembuat menjadi pemilik, anggota lain berstatus diundang', async () => {
    expect((await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'group', title: 'x' }, user: w.studentA })).status).toBe(400)
    const id = await group(w.studentA, [w.studentB])
    expect((await rowOf(id, w.studentA))).toMatchObject({ role: 'owner', status: 'active' })
    expect((await rowOf(id, w.studentB))).toMatchObject({ role: 'member', status: 'invited' })
  })
  it('yang baru diundang belum bisa membaca; setelah menerima baru bisa', async () => {
    const id = await group(w.studentA, [w.studentB])
    expect((await messages(id, w.studentB)).status).toBe(404)
    expect((await accept(id, w.studentB)).status).toBe(200)
    expect((await say(id, w.studentB, unique('sudah gabung'))).status).toBe(201)
  })
  it('menolak undangan membuat anggota berstatus left; undangan tidak ada → 404; tindakan asing → 400', async () => {
    const id = await group(w.studentA, [w.studentB])
    expect((await call(respond, `/api/chat/conversations/${id}/respond`, { method: 'POST', body: { action: 'foo' }, user: w.studentB, p: { id: String(id) } })).status).toBe(400)
    expect((await call(respond, `/api/chat/conversations/${id}/respond`, { method: 'POST', body: { action: 'decline' }, user: w.studentB, p: { id: String(id) } })).status).toBe(200)
    expect((await rowOf(id, w.studentB)).status).toBe('left')
    expect((await call(respond, `/api/chat/conversations/${id}/respond`, { method: 'POST', body: { action: 'accept' }, user: w.studentB, p: { id: String(id) } })).status).toBe(404)
  })
  it('pemblokir tidak bisa diundang ke grup oleh pengguna yang diblokir', async () => {
    await call(blockUser, '/api/chat/blocks', { method: 'POST', body: { userID: w.studentA.id }, user: w.outsiderTeacher })
    const id = await group(w.studentA, [w.outsiderTeacher])
    expect(await rowOf(id, w.outsiderTeacher)).toBeUndefined()
  })
  it('hanya pemilik yang dapat mengundang; undangan ke yang sudah anggota diabaikan', async () => {
    const id = await group(w.studentA, [w.studentB])
    await accept(id, w.studentB)
    const asMember = await call(invite, `/api/chat/conversations/${id}/members`, { method: 'POST', body: { userIDs: [w.studentC.id] }, user: w.studentB, p: { id: String(id) } })
    expect(asMember.status).toBe(403)
    const asOwner = await call(invite, `/api/chat/conversations/${id}/members`, { method: 'POST', body: { userIDs: [w.studentC.id, w.studentB.id] }, user: w.studentA, p: { id: String(id) } })
    expect(asOwner.data.invited).toBe(1)
  })
  it('anggota yang sudah keluar dapat diundang lagi', async () => {
    const id = await group(w.studentA, [w.studentB])
    await accept(id, w.studentB)
    await call(removeMember, `/api/chat/conversations/${id}/members/me`, { method: 'DELETE', user: w.studentB, p: { id: String(id), userID: 'me' } })
    expect((await rowOf(id, w.studentB)).status).toBe('left')
    const result = await call(invite, `/api/chat/conversations/${id}/members`, { method: 'POST', body: { userIDs: [w.studentB.id] }, user: w.studentA, p: { id: String(id) } })
    expect(result.data.invited).toBe(1)
    expect((await rowOf(id, w.studentB)).status).toBe('invited')
  })
  it('pemilik dapat mengeluarkan anggota; anggota biasa tidak; pemilik tidak bisa dikeluarkan orang lain', async () => {
    const id = await group(w.studentA, [w.studentB, w.studentC])
    await accept(id, w.studentB); await accept(id, w.studentC)
    const byMember = await call(removeMember, `/api/chat/conversations/${id}/members/${w.studentC.id}`, { method: 'DELETE', user: w.studentB, p: { id: String(id), userID: String(w.studentC.id) } })
    expect(byMember.status).toBe(403)
    const owner = await call(removeMember, `/api/chat/conversations/${id}/members/${w.studentA.id}`, { method: 'DELETE', user: w.studentB, p: { id: String(id), userID: String(w.studentA.id) } })
    expect(owner.status).toBe(403)
    const byOwner = await call(removeMember, `/api/chat/conversations/${id}/members/${w.studentC.id}`, { method: 'DELETE', user: w.studentA, p: { id: String(id), userID: String(w.studentC.id) } })
    expect(byOwner.status).toBe(200)
    expect((await messages(id, w.studentC)).status).toBe(404)
  })
  it('pemilik keluar: kepemilikan pindah ke anggota aktif; bila tidak ada, grup dihapus', async () => {
    const id = await group(w.studentA, [w.studentB])
    await accept(id, w.studentB)
    await call(removeMember, `/api/chat/conversations/${id}/members/me`, { method: 'DELETE', user: w.studentA, p: { id: String(id), userID: 'me' } })
    expect((await rowOf(id, w.studentB)).role).toBe('owner')
    const solo = await group(w.studentA)
    const result = await call(removeMember, `/api/chat/conversations/${solo}/members/me`, { method: 'DELETE', user: w.studentA, p: { id: String(solo), userID: 'me' } })
    expect(result.data.deleted).toBe(true)
    expect((await messages(solo, w.studentA)).status).toBe(404)
  })
  it('hanya pemilik yang dapat mengganti nama grup; nama baru minimal 2 karakter', async () => {
    const id = await group(w.studentA, [w.studentB])
    await accept(id, w.studentB)
    const byMember = await call(editConversation, `/api/chat/conversations/${id}`, { method: 'PATCH', body: { title: 'Nama baru' }, user: w.studentB, p: { id: String(id) } })
    expect(byMember.status).toBe(403)
    expect((await call(editConversation, `/api/chat/conversations/${id}`, { method: 'PATCH', body: { title: 'x' }, user: w.studentA, p: { id: String(id) } })).status).toBe(400)
    expect((await call(editConversation, `/api/chat/conversations/${id}`, { method: 'PATCH', body: { title: 'Nama baru' }, user: w.studentA, p: { id: String(id) } })).status).toBe(200)
    const info = (await call(conversationInfo, `/api/chat/conversations/${id}`, { user: w.studentA, p: { id: String(id) } })).data
    expect(info).toMatchObject({ title: 'Nama baru', canRename: true, canInvite: true })
    const asMember = (await call(conversationInfo, `/api/chat/conversations/${id}`, { user: w.studentB, p: { id: String(id) } })).data
    expect(asMember).toMatchObject({ canRename: false, canInvite: false })
  })
  it('foto grup harus berkas gambar yang ada; null menghapus foto; tanpa perubahan → 400', async () => {
    const id = await group(w.studentA)
    expect((await call(editConversation, `/api/chat/conversations/${id}`, { method: 'PATCH', body: { photoID: 99999999 }, user: w.studentA, p: { id: String(id) } })).status).toBe(400)
    expect((await call(editConversation, `/api/chat/conversations/${id}`, { method: 'PATCH', body: { photoID: null }, user: w.studentA, p: { id: String(id) } })).status).toBe(200)
    expect((await call(editConversation, `/api/chat/conversations/${id}`, { method: 'PATCH', body: {}, user: w.studentA, p: { id: String(id) } })).status).toBe(400)
  })
})

describe('Chat: ruang kelas dan proyek', () => {
  it('siswa dapat membuka ruang kelasnya sendiri, siswa kelas lain tidak (403)', async () => {
    const refKey = `class:${w.classroom.id}`
    const own = await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'room', refKey }, user: w.studentA })
    expect(own.status).toBe(200)
    expect((await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'room', refKey }, user: w.studentC })).status).toBe(403)
  })
  it('teman sekelas berbagi satu ruang dan saling melihat pesan; kotak masuk membuat ruang kelas otomatis', async () => {
    const refKey = `class:${w.classroom.id}`
    const a = (await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'room', refKey }, user: w.studentA })).data.id
    const b = (await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'room', refKey }, user: w.studentB })).data.id
    expect(b).toBe(a)
    const text = unique('info kelas')
    await say(a, w.studentA, text)
    expect((await messages(a, w.studentB)).data.messages.map((item: Doc) => item.body)).toContain(text)
    const rooms = (await call(inbox, '/api/chat/conversations', { user: w.teacher })).data.conversations
    expect(rooms.some((item: Doc) => item.refKey === refKey)).toBe(true)
  })
  it('ruang proyek terbuka untuk tim dan mentor, tertutup untuk orang luar', async () => {
    const project = await newProject()
    const refKey = `project:${project.id}`
    const open = (user: Doc) => call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'room', refKey }, user })
    expect((await open(w.studentA)).status).toBe(200)
    expect((await open(w.studentB)).status).toBe(200)
    expect((await open(w.teacher)).status).toBe(200)
    expect((await open(w.studentC)).status).toBe(403)
    expect((await open(w.outsiderTeacher)).status).toBe(403)
  })
  it('mentor yang menolak undangan kehilangan akses ke ruang proyek', async () => {
    const project = await newProject()
    const refKey = `project:${project.id}`
    await w.payload.update({ collection: 'projects', id: project.id, overrideAccess: true, data: { mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary', response: 'declined' }] } as never })
    expect((await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'room', refKey }, user: w.teacher })).status).toBe(403)
  })
  it('nama ruang proyek mengikuti data proyek (tidak bisa diganti), tetapi foto boleh dihapus; info memuat kartu proyek', async () => {
    const project = await newProject()
    const id = (await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'room', refKey: `project:${project.id}` }, user: w.studentA })).data.id as number
    expect((await call(editConversation, `/api/chat/conversations/${id}`, { method: 'PATCH', body: { title: 'Nama lain' }, user: w.studentA, p: { id: String(id) } })).status).toBe(403)
    expect((await call(editConversation, `/api/chat/conversations/${id}`, { method: 'PATCH', body: { photoID: null }, user: w.studentB, p: { id: String(id) } })).status).toBe(200)
    const info = (await call(conversationInfo, `/api/chat/conversations/${id}`, { user: w.studentA, p: { id: String(id) } })).data
    expect(info.project.title).toBe(project.title)
    expect(info.people.map((entry: { person: Doc }) => entry.person.id).sort()).toEqual([w.studentA.id, w.studentB.id, w.teacher.id].sort())
  })
  it('ruang kelas tidak bisa diganti namanya', async () => {
    const id = (await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'room', refKey: `class:${w.classroom.id}` }, user: w.studentA })).data.id as number
    expect((await call(editConversation, `/api/chat/conversations/${id}`, { method: 'PATCH', body: { title: 'Nama lain' }, user: w.studentA, p: { id: String(id) } })).status).toBe(403)
  })
  it('refKey tidak valid atau jenis tidak dikenal ditolak', async () => {
    expect((await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'room', refKey: 'class:abc' }, user: w.studentA })).status).toBe(403)
    expect((await call(createConversation, '/api/chat/conversations', { method: 'POST', body: { type: 'room', refKey: 'dm:1:2' }, user: w.studentA })).status).toBe(403)
  })
})

describe('Chat: laporan pesan', () => {
  it('anggota dapat melaporkan pesan orang lain; laporan ganda tidak menambah baris', async () => {
    const id = await dm(w.studentA, w.studentB)
    const messageID = (await say(id, w.studentA, unique('pesan bermasalah'))).data.message.id as number
    const send = () => call(report, '/api/chat/reports', { method: 'POST', body: { messageID, reason: 'Spam', note: 'iklan' }, user: w.studentB })
    expect((await send()).status).toBe(200)
    expect((await send()).status).toBe(200)
    const rows = await w.payload.count({ collection: 'chat-reports', where: { message: { equals: messageID } }, overrideAccess: true })
    expect(rows.totalDocs).toBe(1)
  })
  it('tidak bisa melaporkan pesan sendiri, alasan tidak valid, atau pesan dari percakapan yang bukan miliknya', async () => {
    const id = await dm(w.studentA, w.studentB)
    const messageID = (await say(id, w.studentA, unique('laporan'))).data.message.id as number
    expect((await call(report, '/api/chat/reports', { method: 'POST', body: { messageID, reason: 'Spam' }, user: w.studentA })).status).toBe(400)
    expect((await call(report, '/api/chat/reports', { method: 'POST', body: { messageID, reason: 'Karena iseng' }, user: w.studentB })).status).toBe(400)
    expect((await call(report, '/api/chat/reports', { method: 'POST', body: { messageID, reason: 'Spam' }, user: w.studentC })).status).toBe(404)
    expect((await call(report, '/api/chat/reports', { method: 'POST', body: { messageID: 99999999, reason: 'Spam' }, user: w.studentB })).status).toBe(404)
  })
})

describe('Chat: pencarian pengguna', () => {
  it('mencari menurut nama, tidak memuat diri sendiri, dan membatasi hasil', async () => {
    const result = (await call(searchUsers, '/api/chat/users?q=Siswa', { user: w.studentA })).data.users
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThanOrEqual(12)
    expect(result.map((person: Doc) => person.id)).not.toContain(w.studentA.id)
    const guru = (await call(searchUsers, '/api/chat/users?q=Guru', { user: w.studentA })).data.users
    expect(guru.some((person: Doc) => person.id === w.teacher.id)).toBe(true)
  })
})

describe('Chat: batas kecepatan', () => {
  it('pesan ke-26 dalam satu menit ditolak (429)', async () => {
    const id = await group(w.outsiderTeacher)
    for (let index = 0; index < 25; index += 1) {
      await w.payload.create({ collection: 'chat-messages', data: { conversation: id, sender: w.outsiderTeacher.id, body: `cepat ${index}` }, overrideAccess: true })
    }
    expect((await say(id, w.outsiderTeacher, 'terlalu banyak')).status).toBe(429)
  })
})
