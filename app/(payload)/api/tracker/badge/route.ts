import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, ok } from '../../../../../lib/chat'
import { trackerBadge } from '../../../../../lib/tracker'

/** Aktivitas proyek baru sejak terakhir dibuka. Body: { seen: { [projectID]: ISO } }. */
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const { seen = {} } = await request.json().catch(() => ({})) as { seen?: Record<string, string> }
  return ok(await trackerBadge(payload, Number(user.id), seen))
}
