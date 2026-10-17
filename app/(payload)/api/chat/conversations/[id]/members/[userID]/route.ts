import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, loadAccess, num, ok } from '../../../../../../../../lib/chat'

/** Keluar dari grup (diri sendiri) atau mengeluarkan anggota (pemilik/admin). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; userID: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const { id: rawID, userID: rawUser } = await params
  const id = Number(rawID)
  const access = await loadAccess(payload, user, id)
  if (!access || access.conversation.kind !== 'group') return fail('Percakapan tidak ditemukan.', 404)
  const meID = Number(user.id)
  const targetID = rawUser === 'me' ? meID : num(rawUser)
  if (targetID === undefined) return fail('Anggota tidak ditemukan.', 404)
  const isManager = ['owner', 'admin'].includes(String(access.member?.role))
  if (targetID !== meID && !isManager) return fail('Hanya pemilik grup yang dapat mengeluarkan anggota.', 403)
  const targetRows = await payload.find({ collection: 'chat-members', where: { and: [{ conversation: { equals: id } }, { user: { equals: targetID } }] }, limit: 1, depth: 0, overrideAccess: true, pagination: false })
  const target = targetRows.docs[0]
  if (!target) return fail('Anggota tidak ditemukan.', 404)
  if (target.role === 'owner' && targetID !== meID) return fail('Pemilik grup tidak dapat dikeluarkan.', 403)

  if (target.role === 'owner') {
    // Pemilik keluar: serahkan kepemilikan ke anggota aktif tertua, atau hapus grup bila kosong.
    const successor = await payload.find({ collection: 'chat-members', where: { and: [{ conversation: { equals: id } }, { status: { equals: 'active' } }, { user: { not_equals: meID } }] }, sort: 'createdAt', limit: 1, depth: 0, overrideAccess: true, pagination: false })
    if (successor.docs[0]) await payload.update({ collection: 'chat-members', id: successor.docs[0].id, data: { role: 'owner' }, overrideAccess: true })
    else { await payload.delete({ collection: 'chat-conversations', id, overrideAccess: true }); return ok({ ok: true, deleted: true }) }
  }
  await payload.update({ collection: 'chat-members', id: target.id, data: { status: 'left', role: 'member' }, overrideAccess: true })
  return ok({ ok: true })
}
