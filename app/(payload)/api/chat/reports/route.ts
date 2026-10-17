import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, loadAccess, num, ok } from '../../../../../lib/chat'

const reasons = ['Spam', 'Pelecehan atau perundungan', 'Konten tidak pantas', 'Informasi pribadi', 'Lainnya']

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const { messageID, reason, note } = await request.json().catch(() => ({})) as { messageID?: unknown; reason?: string; note?: string }
  const id = num(messageID)
  if (id === undefined || !reason || !reasons.includes(reason)) return fail('Pilih alasan laporan.')
  const message = await payload.findByID({ collection: 'chat-messages', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!message) return fail('Pesan tidak ditemukan.', 404)
  // Hanya anggota percakapan yang dapat melaporkan pesannya.
  if (!await loadAccess(payload, user, num(message.conversation) ?? -1)) return fail('Pesan tidak ditemukan.', 404)
  if (num(message.sender) === Number(user.id)) return fail('Kamu tidak dapat melaporkan pesanmu sendiri.')
  const duplicate = await payload.count({ collection: 'chat-reports', where: { and: [{ message: { equals: id } }, { reporter: { equals: Number(user.id) } }] }, overrideAccess: true })
  if (!duplicate.totalDocs) await payload.create({ collection: 'chat-reports', data: { message: id, reporter: Number(user.id), reason, note: String(note || '').slice(0, 500) }, overrideAccess: true })
  return ok({ ok: true })
}
