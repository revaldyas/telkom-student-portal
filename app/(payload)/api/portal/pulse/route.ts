import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, ok } from '../../../../../lib/chat'
import { unreadByConversation } from '../../../../../lib/dbCounts'
import { touchPresence } from '../../../../../lib/presence'
import { trackerBadge } from '../../../../../lib/tracker'

/**
 * Denyut portal: satu permintaan berkala menggantikan tiga (pesan belum dibaca, badge tracker, status online).
 * Sesi diperiksa sekali, lalu semua hitungan berjalan paralel. Body: { seen: { [projectID]: ISO } }.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return ok({ unread: 0, invites: 0, trackerNew: 0 })
  const meID = Number(user.id)
  const { seen = {} } = await request.json().catch(() => ({})) as { seen?: Record<string, string> }
  const [unreadMap, invites, tracker] = await Promise.all([
    unreadByConversation(payload, meID).catch(() => new Map<number, number>()),
    payload.count({ collection: 'chat-members', where: { and: [{ user: { equals: meID } }, { status: { equals: 'invited' } }] }, overrideAccess: true }).catch(() => ({ totalDocs: 0 })),
    trackerBadge(payload, meID, seen).catch(() => ({ total: 0, projects: {}, assigned: 0 })),
    touchPresence(payload, meID).catch(() => null),
  ])
  let unread = 0
  for (const total of unreadMap.values()) unread += total
  return ok({ unread, invites: invites.totalDocs, trackerNew: tracker.total })
}
