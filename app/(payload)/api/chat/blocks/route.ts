import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, num, ok, personOf } from '../../../../../lib/chat'

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const rows = await payload.find({ collection: 'chat-blocks', where: { blocker: { equals: Number(user.id) } }, depth: 1, limit: 200, overrideAccess: true, pagination: false })
  return ok({ blocked: rows.docs.map((row) => personOf(row.blocked)).filter(Boolean) })
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const { userID } = await request.json().catch(() => ({})) as { userID?: unknown }
  const targetID = num(userID)
  if (targetID === undefined || targetID === Number(user.id)) return fail('Pengguna tidak valid.')
  const existing = await payload.count({ collection: 'chat-blocks', where: { and: [{ blocker: { equals: Number(user.id) } }, { blocked: { equals: targetID } }] }, overrideAccess: true })
  if (!existing.totalDocs) await payload.create({ collection: 'chat-blocks', data: { blocker: Number(user.id), blocked: targetID }, overrideAccess: true })
  return ok({ ok: true })
}

export async function DELETE(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const targetID = num(new URL(request.url).searchParams.get('userID'))
  if (targetID === undefined) return fail('Pengguna tidak valid.')
  await payload.delete({ collection: 'chat-blocks', where: { and: [{ blocker: { equals: Number(user.id) } }, { blocked: { equals: targetID } }] }, overrideAccess: true })
  return ok({ ok: true })
}
