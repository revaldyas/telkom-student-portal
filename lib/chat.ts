import type { BasePayload, TypedUser } from 'payload'
import { NextResponse } from 'next/server'
import { authenticateWebsiteRequest } from './websiteAuth'

export type Person = { id: number; name: string; photo: string | null; subtitle: string | null; role: string }
export type ChatUser = TypedUser & { id: number; role?: string }

export const num = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  if (value && typeof value === 'object' && 'id' in value) return num((value as { id: unknown }).id)
  return undefined
}

export const fail = (message: string, status = 400) => NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } })
export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

export async function chatUser(payload: BasePayload, request: Request): Promise<ChatUser | null> {
  const user = await authenticateWebsiteRequest(payload, request)
  return user ? user as unknown as ChatUser : null
}

export function personOf(user: unknown): Person | null {
  if (!user || typeof user !== 'object') return null
  const doc = user as { id?: unknown; name?: string; role?: string; profilePhoto?: unknown; class?: unknown; program?: unknown }
  const id = num(doc.id)
  if (id === undefined) return null
  const photo = doc.profilePhoto && typeof doc.profilePhoto === 'object' ? (doc.profilePhoto as { url?: string }).url || null : null
  const cls = doc.class && typeof doc.class === 'object' ? (doc.class as { name?: string }).name : null
  const subtitle = doc.role === 'teacher' ? 'Guru' : cls || null
  return { id, name: doc.name || 'Pengguna', photo, subtitle, role: doc.role || 'student' }
}

export async function isBlocked(payload: BasePayload, a: number, b: number) {
  const result = await payload.count({
    collection: 'chat-blocks', overrideAccess: true,
    where: { or: [{ and: [{ blocker: { equals: a } }, { blocked: { equals: b } }] }, { and: [{ blocker: { equals: b } }, { blocked: { equals: a } }] }] },
  })
  return result.totalDocs > 0
}

export async function ensureRoom(payload: BasePayload, kind: string, refKey: string, title: string) {
  const found = await payload.find({ collection: 'chat-conversations', where: { refKey: { equals: refKey } }, limit: 1, depth: 0, overrideAccess: true, pagination: false })
  if (found.docs[0]) return found.docs[0]
  return payload.create({ collection: 'chat-conversations', data: { kind, refKey, title }, overrideAccess: true })
}

export async function ensureMember(payload: BasePayload, conversation: number, user: number, data: { role?: string; status?: string; invitedBy?: number } = {}) {
  const found = await payload.find({ collection: 'chat-members', where: { and: [{ conversation: { equals: conversation } }, { user: { equals: user } }] }, limit: 1, depth: 0, overrideAccess: true, pagination: false })
  if (found.docs[0]) return found.docs[0]
  return payload.create({ collection: 'chat-members', data: { conversation, user, role: data.role || 'member', status: data.status || 'active', invitedBy: data.invitedBy, lastReadId: 0 }, overrideAccess: true })
}

/** Apakah pengguna berhak masuk ke ruang kelas/proyek tertentu (anggota diturunkan dari data sekolah). */
export async function roomAccess(payload: BasePayload, user: ChatUser, refKey: string): Promise<{ title: string } | null> {
  const [kind, rawID] = refKey.split(':')
  const id = Number(rawID)
  if (!Number.isInteger(id)) return null
  if (kind === 'class') {
    const classID = num((user as { class?: unknown }).class)
    if (classID !== id) return null
    const cls = await payload.findByID({ collection: 'classes', id, depth: 0, overrideAccess: true }).catch(() => null)
    return cls ? { title: `Kelas ${cls.name}` } : null
  }
  if (kind === 'project') {
    const project = await payload.findByID({ collection: 'projects', id, depth: 0, overrideAccess: true }).catch(() => null)
    if (!project) return null
    const members = (Array.isArray(project.members) ? project.members : []).map((entry) => num(entry.member))
    const mentors = (Array.isArray(project.mentorAssignments) ? project.mentorAssignments : []).filter((entry) => entry.response !== 'declined').map((entry) => num(entry.mentor))
    const allowed = [num(project.createdBy), ...members, ...mentors].includes(Number(user.id))
    return allowed ? { title: project.title } : null
  }
  return null
}

/** Memuat percakapan beserta baris anggota milik pengguna; null jika tidak berhak mengakses. */
export async function loadAccess(payload: BasePayload, user: ChatUser, conversationID: number) {
  const meID = Number(user.id)
  // Percakapan dan keanggotaanmu saling bebas: dibaca bersamaan.
  const [conversation, memberResult] = await Promise.all([
    payload.findByID({ collection: 'chat-conversations', id: conversationID, depth: 0, overrideAccess: true }).catch(() => null),
    payload.find({ collection: 'chat-members', where: { and: [{ conversation: { equals: conversationID } }, { user: { equals: meID } }] }, limit: 1, depth: 0, pagination: false, overrideAccess: true }),
  ])
  if (!conversation) return null
  let member = memberResult.docs[0] || null
  if (conversation.kind === 'class' || conversation.kind === 'project') {
    const room = await roomAccess(payload, user, conversation.refKey)
    if (!room) return null
    if (!member) member = await ensureMember(payload, conversationID, meID, { role: 'member', status: 'active' })
    return { conversation, member }
  }
  if (!member || member.status !== 'active') return null
  return { conversation, member }
}

export const previewOf = (body: string) => body.replace(/\s+/g, ' ').trim().slice(0, 140)
