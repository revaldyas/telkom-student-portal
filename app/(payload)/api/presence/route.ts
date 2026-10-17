import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, ok } from '../../../../lib/chat'
import { touchPresence } from '../../../../lib/presence'

/** Heartbeat status online. Dipanggil berkala oleh portal. */
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return ok({ ok: false })
  await touchPresence(payload, Number(user.id)).catch(() => null)
  return ok({ ok: true })
}
