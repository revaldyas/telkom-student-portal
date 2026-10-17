import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, ok } from '../../../../../../../lib/chat'

/** Menjawab undangan grup: accept atau decline. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const id = Number((await params).id)
  const { action } = await request.json().catch(() => ({})) as { action?: string }
  const rows = await payload.find({ collection: 'chat-members', where: { and: [{ conversation: { equals: id } }, { user: { equals: Number(user.id) } }, { status: { equals: 'invited' } }] }, limit: 1, depth: 0, overrideAccess: true, pagination: false })
  const row = rows.docs[0]
  if (!row) return fail('Undangan tidak ditemukan.', 404)
  if (action === 'accept') await payload.update({ collection: 'chat-members', id: row.id, data: { status: 'active' }, overrideAccess: true })
  else if (action === 'decline') await payload.update({ collection: 'chat-members', id: row.id, data: { status: 'left' }, overrideAccess: true })
  else return fail('Tindakan tidak dikenali.')
  return ok({ ok: true })
}
