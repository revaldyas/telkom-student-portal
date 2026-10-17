import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, num, ok, personOf } from '../../../../../lib/chat'

/** Pencarian pengguna (siswa dan guru) untuk pesan baru atau undangan grup. */
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const meID = Number(user.id)
  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 60)
  const blocks = await payload.find({ collection: 'chat-blocks', where: { or: [{ blocker: { equals: meID } }, { blocked: { equals: meID } }] }, depth: 0, limit: 500, overrideAccess: true, pagination: false })
  const hidden = new Set<number>([meID])
  for (const row of blocks.docs) { const a = num(row.blocker), b = num(row.blocked); if (a !== undefined) hidden.add(a); if (b !== undefined) hidden.add(b) }
  const result = await payload.find({
    collection: 'users', depth: 1, limit: 40, sort: 'name', overrideAccess: true,
    where: { and: [{ role: { in: ['student', 'teacher'] } }, ...(q ? [{ name: { like: q } }] : [])] }, pagination: false })
  return ok({ users: result.docs.filter((doc) => !hidden.has(Number(doc.id))).slice(0, 12).map(personOf).filter(Boolean) })
}
