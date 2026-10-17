import config from '@payload-config'
import { getPayload, type Where } from 'payload'
import { chatUser, fail, isBlocked, loadAccess, num, ok, personOf, previewOf } from '../../../../../../../lib/chat'

const serialize = (doc: { id: number; body: string; createdAt: string; deleted?: boolean | null; sender: unknown }) => ({
  id: doc.id, body: doc.deleted ? '' : doc.body, deleted: Boolean(doc.deleted), createdAt: doc.createdAt, sender: personOf(doc.sender),
})

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const id = Number((await params).id)
  const query = new URL(request.url).searchParams
  const after = num(query.get('after')), before = num(query.get('before'))
  const filters: Where[] = [{ conversation: { equals: id } }]
  if (after !== undefined) filters.push({ id: { greater_than: after } })
  if (before !== undefined) filters.push({ id: { less_than: before } })
  // Pemeriksaan akses dan pengambilan pesan dijalankan bersamaan (polling tiap beberapa detik: hemat satu round trip).
  const [access, result] = await Promise.all([
    loadAccess(payload, user, id),
    payload.find({ collection: 'chat-messages', where: { and: filters }, depth: 1, limit: after !== undefined ? 100 : 40, sort: after !== undefined ? 'id' : '-id', overrideAccess: true }),
  ])
  if (!access) return fail('Percakapan tidak ditemukan.', 404)
  const docs = after !== undefined ? result.docs : [...result.docs].reverse()
  return ok({ messages: docs.map(serialize), hasMore: after === undefined && result.hasNextPage })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const id = Number((await params).id)
  const access = await loadAccess(payload, user, id)
  if (!access) return fail('Percakapan tidak ditemukan.', 404)
  const meID = Number(user.id)
  const { text } = await request.json().catch(() => ({ text: '' })) as { text?: string }
  const body = String(text || '').trim()
  if (!body) return fail('Pesan tidak boleh kosong.')
  if (body.length > 2000) return fail('Pesan maksimal 2000 karakter.')

  const isDM = access.conversation.kind === 'dm'
  const [peer, recent] = await Promise.all([
    isDM ? payload.find({ collection: 'chat-members', where: { and: [{ conversation: { equals: id } }, { user: { not_equals: meID } }] }, limit: 1, depth: 0, pagination: false, overrideAccess: true }) : Promise.resolve(null),
    // Batas kecepatan sederhana: maksimal 25 pesan per menit per pengguna.
    payload.count({ collection: 'chat-messages', overrideAccess: true, where: { and: [{ sender: { equals: meID } }, { createdAt: { greater_than: new Date(Date.now() - 60000).toISOString() } }] } }),
  ])
  const peerID = num(peer?.docs[0]?.user)
  if (isDM && peerID !== undefined && await isBlocked(payload, meID, peerID)) return fail('Pesan tidak dapat dikirim ke pengguna ini.', 403)
  if (recent.totalDocs >= 25) return fail('Terlalu cepat. Tunggu sebentar sebelum mengirim lagi.', 429)

  const message = await payload.create({ collection: 'chat-messages', data: { conversation: id, sender: meID, body }, depth: 1, overrideAccess: true })
  await Promise.all([
    payload.update({ collection: 'chat-conversations', id, overrideAccess: true, data: { lastMessageAt: message.createdAt, lastMessagePreview: previewOf(body), lastMessageSender: user.name as string } }),
    payload.update({ collection: 'chat-members', id: access.member!.id, overrideAccess: true, data: { lastReadId: message.id } }),
  ])
  return ok({ message: serialize(message) }, 201)
}
