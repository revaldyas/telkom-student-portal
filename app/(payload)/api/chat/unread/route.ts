import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, ok } from '../../../../../lib/chat'
import { unreadByConversation } from '../../../../../lib/dbCounts'

/** Jumlah pesan belum dibaca + undangan grup yang menunggu (untuk lencana di sidebar): dua query paralel. */
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return ok({ unread: 0, invites: 0 })
  const meID = Number(user.id)
  const [byConversation, invites] = await Promise.all([
    unreadByConversation(payload, meID),
    payload.count({ collection: 'chat-members', where: { and: [{ user: { equals: meID } }, { status: { equals: 'invited' } }] }, overrideAccess: true }),
  ])
  let unread = 0
  for (const total of byConversation.values()) unread += total
  return ok({ unread, invites: invites.totalDocs })
}
