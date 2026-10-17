import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, loadAccess, num, ok } from '../../../../../../../lib/chat'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const access = await loadAccess(payload, user, Number((await params).id))
  if (!access?.member) return fail('Percakapan tidak ditemukan.', 404)
  const { lastID } = await request.json().catch(() => ({})) as { lastID?: unknown }
  const last = num(lastID)
  if (last !== undefined && last > Number(access.member.lastReadId || 0)) await payload.update({ collection: 'chat-members', id: access.member.id, data: { lastReadId: last }, overrideAccess: true })
  return ok({ ok: true })
}
