import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, num, ok } from '../../../../../lib/chat'
import { presenceOf } from '../../../../../lib/tracker'

/** Status online sejumlah pengguna (menghormati pengaturan "tampilkan status online"). */
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const { ids } = await request.json().catch(() => ({})) as { ids?: unknown[] }
  const list = Array.from(new Set((ids || []).map(num).filter((id): id is number => id !== undefined))).slice(0, 100)
  if (!list.length) return ok({ presence: {} })
  const users = await payload.find({ collection: 'users', where: { id: { in: list } }, depth: 0, limit: 100, overrideAccess: true, pagination: false })
  const presence: Record<number, { online: boolean; lastSeen: string | null }> = {}
  for (const doc of users.docs) presence[Number(doc.id)] = presenceOf(doc)
  return ok({ presence })
}
