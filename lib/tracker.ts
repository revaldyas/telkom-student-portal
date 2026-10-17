import type { BasePayload } from 'payload'
import { num, personOf, type ChatUser } from './chat'

export const STATUSES = ['todo', 'doing', 'review', 'done'] as const
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export type Status = (typeof STATUSES)[number]
export type Priority = (typeof PRIORITIES)[number]
export const statusLabel: Record<Status, string> = { todo: 'Direncanakan', doing: 'Dikerjakan', review: 'Review', done: 'Selesai' }
export const priorityLabel: Record<Priority, string> = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi', urgent: 'Mendesak' }

export type Role = 'owner' | 'member' | 'mentor'
export type ChecklistItem = { id: string; text: string; done: boolean }

/** Online jika terlihat dalam 100 detik terakhir (heartbeat tiap ~45 detik). */
export const ONLINE_WINDOW_MS = 100_000
export const presenceOf = (doc: { lastSeenAt?: string | null; showPresence?: boolean | null }) => {
  if (doc.showPresence === false || !doc.lastSeenAt) return { online: false, lastSeen: null as string | null }
  const seen = new Date(doc.lastSeenAt).getTime()
  return { online: Date.now() - seen < ONLINE_WINDOW_MS, lastSeen: doc.lastSeenAt }
}

/** Anggota proyek: pengelola, anggota tim, dan guru pembimbing yang belum menolak undangan. */
export async function projectAccess(payload: BasePayload, user: ChatUser, projectID: number) {
  const project = await payload.findByID({ collection: 'projects', id: projectID, depth: 0, overrideAccess: true }).catch(() => null)
  if (!project) return null
  const meID = Number(user.id)
  const ownerID = num(project.createdBy)
  const memberIDs = (Array.isArray(project.members) ? project.members : []).map((entry) => num(entry.member))
  const mentors = (Array.isArray(project.mentorAssignments) ? project.mentorAssignments : []).filter((entry) => entry.response !== 'declined')
  const myMentor = mentors.find((entry) => num(entry.mentor) === meID)
  let role: Role | null = null
  if (ownerID === meID) role = 'owner'
  else if (memberIDs.includes(meID)) role = 'member'
  else if (myMentor) role = 'mentor'
  if (!role) return null
  const canManage = role === 'owner' || (role === 'mentor' && myMentor?.assignmentRole === 'primary')
  return { project, role, canManage }
}

type ProjectDoc = Awaited<ReturnType<BasePayload['findByID']>> & { createdBy?: unknown; members?: { member?: unknown; contribution?: string | null }[] | null; mentorAssignments?: { mentor?: unknown; response?: string | null; assignmentRole?: string | null }[] | null }
export async function loadTeam(payload: BasePayload, project: ProjectDoc) {
  const ids = new Set<number>()
  const roles = new Map<number, { role: Role; note: string | null }>()
  const ownerID = num(project.createdBy)
  if (ownerID !== undefined) { ids.add(ownerID); roles.set(ownerID, { role: 'owner', note: 'Pengelola proyek' }) }
  for (const entry of Array.isArray(project.members) ? project.members : []) {
    const id = num(entry.member)
    if (id === undefined) continue
    ids.add(id)
    if (!roles.has(id)) roles.set(id, { role: 'member', note: entry.contribution || null })
    else if (entry.contribution) roles.set(id, { role: 'owner', note: entry.contribution })
  }
  for (const entry of (Array.isArray(project.mentorAssignments) ? project.mentorAssignments : []).filter((item) => item.response !== 'declined')) {
    const id = num(entry.mentor)
    if (id === undefined) continue
    ids.add(id); roles.set(id, { role: 'mentor', note: entry.assignmentRole === 'primary' ? 'Mentor utama' : 'Mentor pendamping' })
  }
  const users = ids.size ? await payload.find({ collection: 'users', where: { id: { in: [...ids] } }, depth: 1, limit: 100, overrideAccess: true, pagination: false }) : { docs: [] }
  return users.docs.map((doc) => {
    const person = personOf(doc)!
    const meta = roles.get(Number(doc.id)) || { role: 'member' as Role, note: null }
    return { ...person, role: meta.role, note: meta.note, ...presenceOf(doc) }
  })
}

type TaskDoc = {
  id: number; project: unknown; title: string; description?: string | null; status?: string | null; priority?: string | null
  assignees?: unknown; dueDate?: string | null; position?: number | null; labels?: unknown; checklist?: unknown
  createdBy?: unknown; completedAt?: string | null; createdAt: string; updatedAt: string
}
export const idList = (value: unknown): number[] => Array.isArray(value) ? Array.from(new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0))) : []
export const stringList = (value: unknown, max = 8, length = 24): string[] => Array.isArray(value) ? Array.from(new Set(value.map((item) => String(item).trim().slice(0, length)).filter(Boolean))).slice(0, max) : []
export function checklistOf(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return []
  return value.slice(0, 30).flatMap((item) => {
    const entry = item as Partial<ChecklistItem>
    const text = String(entry?.text || '').trim().slice(0, 140)
    return text ? [{ id: String(entry.id || '').slice(0, 40) || Math.random().toString(36).slice(2, 10), text, done: Boolean(entry.done) }] : []
  })
}
export const serializeTask = (doc: TaskDoc, commentCount = 0) => ({
  id: doc.id, projectID: num(doc.project), title: doc.title, description: doc.description || '',
  status: (STATUSES as readonly string[]).includes(String(doc.status)) ? doc.status as Status : 'todo',
  priority: (PRIORITIES as readonly string[]).includes(String(doc.priority)) ? doc.priority as Priority : 'medium',
  assignees: idList(doc.assignees), dueDate: doc.dueDate || null, position: Number(doc.position || 0),
  labels: stringList(doc.labels), checklist: checklistOf(doc.checklist), createdBy: num(doc.createdBy) ?? null,
  completedAt: doc.completedAt || null, createdAt: doc.createdAt, updatedAt: doc.updatedAt, commentCount,
})

export async function logActivity(payload: BasePayload, entry: { project: number; task?: number; actor: number; action: string; summary: string; meta?: Record<string, unknown> }) {
  await payload.create({ collection: 'project-activity', data: { project: entry.project, task: entry.task, actor: entry.actor, action: entry.action, summary: entry.summary.slice(0, 400), meta: entry.meta }, overrideAccess: true })
}

export const serializeActivity = (doc: { id: number; task?: number | null; action: string; summary: string; createdAt: string; actor?: unknown; meta?: unknown }) => ({
  id: doc.id, taskID: doc.task ?? null, action: doc.action, summary: doc.summary, createdAt: doc.createdAt, actor: personOf(doc.actor), meta: (doc.meta && typeof doc.meta === 'object' ? doc.meta : {}) as Record<string, unknown>,
})

/** Aktivitas proyek baru dari orang lain sejak proyek itu terakhir dibuka (per proyek, 7 hari terakhir). */
export async function trackerBadge(payload: BasePayload, meID: number, seen: Record<string, string> = {}) {
  const projects = await payload.find({
    collection: 'projects', depth: 0, limit: 100, pagination: false, overrideAccess: true,
    where: { or: [{ createdBy: { equals: meID } }, { 'members.member': { equals: meID } }, { 'mentorAssignments.mentor': { equals: meID } }] },
  })
  const ids = projects.docs.map((project) => project.id)
  const result: Record<number, { activity: number; assigned: number }> = {}
  if (!ids.length) return { projects: result, total: 0, assigned: 0 }
  const weekAgo = Date.now() - 7 * 86400000
  const activity = await payload.find({
    collection: 'project-activity', depth: 0, limit: 1000, pagination: false, sort: '-id', overrideAccess: true,
    where: { and: [{ project: { in: ids } }, { actor: { not_equals: meID } }, { createdAt: { greater_than: new Date(weekAgo).toISOString() } }] },
  })
  let total = 0, assignedTotal = 0
  for (const entry of activity.docs) {
    const projectID = num(entry.project)!
    const since = Math.max(weekAgo, Date.parse(seen[String(projectID)] || '') || 0)
    if (Date.parse(entry.createdAt) <= since) continue
    const row = result[projectID] || (result[projectID] = { activity: 0, assigned: 0 })
    row.activity += 1; total += 1
    const meta = (entry.meta && typeof entry.meta === 'object' ? entry.meta : {}) as { added?: unknown[] }
    if (entry.action === 'task.assigned' && Array.isArray(meta.added) && meta.added.map(Number).includes(meID)) { row.assigned += 1; assignedTotal += 1 }
  }
  return { projects: result, total, assigned: assignedTotal }
}
