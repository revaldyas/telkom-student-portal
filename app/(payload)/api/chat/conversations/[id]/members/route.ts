import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, isBlocked, loadAccess, num, ok } from '../../../../../../../lib/chat'

/** Mengundang pengguna ke grup (pemilik atau admin grup). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const id = Number((await params).id)
  const access = await loadAccess(payload, user, id)
  if (!access || access.conversation.kind !== 'group') return fail('Percakapan tidak ditemukan.', 404)
  if (!['owner', 'admin'].includes(String(access.member?.role))) return fail('Hanya pemilik grup yang dapat mengundang.', 403)
  const meID = Number(user.id)
  const { userIDs } = await request.json().catch(() => ({})) as { userIDs?: unknown[] }
  const ids = Array.from(new Set((userIDs || []).map(num).filter((value): value is number => value !== undefined && value !== meID))).slice(0, 30)
  let invited = 0
  for (const targetID of ids) {
    const target = await payload.findByID({ collection: 'users', id: targetID, depth: 0, overrideAccess: true }).catch(() => null)
    if (!target || !['student', 'teacher'].includes(String(target.role)) || await isBlocked(payload, meID, targetID)) continue
    const existing = await payload.find({ collection: 'chat-members', where: { and: [{ conversation: { equals: id } }, { user: { equals: targetID } }] }, limit: 1, depth: 0, overrideAccess: true, pagination: false })
    const row = existing.docs[0]
    if (row && row.status !== 'left') continue
    if (row) await payload.update({ collection: 'chat-members', id: row.id, data: { status: 'invited', invitedBy: meID, role: 'member' }, overrideAccess: true })
    else await payload.create({ collection: 'chat-members', data: { conversation: id, user: targetID, status: 'invited', role: 'member', invitedBy: meID, lastReadId: 0 }, overrideAccess: true })
    invited += 1
  }
  return ok({ invited })
}
