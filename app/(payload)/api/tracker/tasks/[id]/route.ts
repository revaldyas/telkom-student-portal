import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, num, ok } from '../../../../../../lib/chat'
import { PRIORITIES, STATUSES, checklistOf, idList, loadTeam, logActivity, priorityLabel, projectAccess, serializeActivity, serializeTask, statusLabel, stringList, type Priority, type Status } from '../../../../../../lib/tracker'

async function load(request: Request, rawID: string) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return { payload, error: fail('Masuk terlebih dahulu.', 401) } as const
  const task = await payload.findByID({ collection: 'project-tasks', id: Number(rawID), depth: 0, overrideAccess: true }).catch(() => null)
  if (!task) return { payload, error: fail('Tugas tidak ditemukan.', 404) } as const
  const access = await projectAccess(payload, user, num(task.project)!)
  if (!access) return { payload, error: fail('Tugas tidak ditemukan.', 404) } as const
  return { payload, user, task, access } as const
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await load(request, (await params).id)
  if ('error' in ctx) return ctx.error
  const { payload, task } = ctx
  const [comments, activity] = await Promise.all([
    payload.find({ collection: 'project-task-comments', where: { task: { equals: task.id } }, depth: 1, limit: 200, sort: 'createdAt', overrideAccess: true }),
    payload.find({ collection: 'project-activity', where: { task: { equals: task.id } }, depth: 1, limit: 50, sort: '-id', overrideAccess: true, pagination: false }),
  ])
  const { personOf } = await import('../../../../../../lib/chat')
  return ok({
    task: serializeTask(task, comments.totalDocs),
    comments: comments.docs.map((comment) => ({ id: comment.id, body: comment.body, createdAt: comment.createdAt, author: personOf(comment.author) })),
    activity: activity.docs.map(serializeActivity),
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await load(request, (await params).id)
  if ('error' in ctx) return ctx.error
  const { payload, user, task, access } = ctx
  const projectID = num(task.project)!
  const actor = Number(user.id)
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const team = await loadTeam(payload, access.project)
  const teamByID = new Map(team.map((member) => [member.id, member]))
  const data: Record<string, unknown> = {}
  const logs: { action: string; summary: string; meta?: Record<string, unknown> }[] = []
  const title = task.title

  if (body.title !== undefined) {
    const next = String(body.title).trim().slice(0, 160)
    if (!next) return fail('Judul tugas tidak boleh kosong.')
    if (next !== task.title) { data.title = next; logs.push({ action: 'task.updated', summary: `mengubah judul “${task.title}” menjadi “${next}”` }) }
  }
  if (body.description !== undefined) {
    const next = String(body.description).slice(0, 4000)
    if (next !== (task.description || '')) { data.description = next; logs.push({ action: 'task.updated', summary: `memperbarui deskripsi “${title}”` }) }
  }
  if (body.status !== undefined && (STATUSES as readonly string[]).includes(String(body.status)) && body.status !== task.status) {
    const from = (task.status || 'todo') as Status, to = String(body.status) as Status
    data.status = to
    data.completedAt = to === 'done' ? new Date().toISOString() : null
    logs.push({ action: 'task.moved', summary: `memindahkan “${title}” dari ${statusLabel[from]} ke ${statusLabel[to]}`, meta: { from, to } })
  }
  if (body.position !== undefined && Number.isFinite(Number(body.position))) data.position = Number(body.position)
  if (body.priority !== undefined && (PRIORITIES as readonly string[]).includes(String(body.priority)) && body.priority !== task.priority) {
    data.priority = body.priority
    logs.push({ action: 'task.updated', summary: `mengubah prioritas “${title}” menjadi ${priorityLabel[body.priority as Priority]}`, meta: { priority: body.priority } })
  }
  if (body.dueDate !== undefined) {
    const next = body.dueDate ? new Date(String(body.dueDate)) : null
    const iso = next && !Number.isNaN(next.getTime()) ? next.toISOString() : null
    if ((iso || null) !== (task.dueDate ? new Date(task.dueDate).toISOString() : null)) {
      data.dueDate = iso
      logs.push({ action: 'task.updated', summary: iso ? `mengatur tenggat “${title}” ke ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))}` : `menghapus tenggat “${title}”`, meta: { dueDate: iso } })
    }
  }
  if (body.assignees !== undefined) {
    const next = idList(body.assignees).filter((id) => teamByID.has(id))
    const previous = idList(task.assignees)
    const added = next.filter((id) => !previous.includes(id)), removed = previous.filter((id) => !next.includes(id))
    if (added.length || removed.length) {
      data.assignees = next
      const names = (ids: number[]) => ids.map((id) => teamByID.get(id)?.name || 'Anggota').join(', ')
      if (added.length) logs.push({ action: 'task.assigned', summary: `menugaskan “${title}” kepada ${names(added)}`, meta: { added, removed } })
      if (removed.length) logs.push({ action: 'task.unassigned', summary: `melepas ${names(removed)} dari “${title}”`, meta: { added, removed } })
    }
  }
  if (body.labels !== undefined) {
    const next = stringList(body.labels), previous = stringList(task.labels)
    if (JSON.stringify(next) !== JSON.stringify(previous)) { data.labels = next; logs.push({ action: 'task.updated', summary: `memperbarui label “${title}”` }) }
  }
  if (body.checklist !== undefined) {
    const next = checklistOf(body.checklist), previous = checklistOf(task.checklist)
    if (JSON.stringify(next) !== JSON.stringify(previous)) {
      data.checklist = next
      const finished = next.filter((item) => item.done && !previous.find((old) => old.id === item.id)?.done)
      if (finished.length) logs.push({ action: 'task.checklist', summary: `menyelesaikan butir “${finished[0].text}” di “${title}”` })
      else if (next.length > previous.length) logs.push({ action: 'task.checklist', summary: `menambah butir daftar periksa di “${title}”` })
    }
  }
  if (!Object.keys(data).length) return ok({ task: serializeTask(task) })
  const updated = await payload.update({ collection: 'project-tasks', id: task.id, data, overrideAccess: true })
  for (const entry of logs) await logActivity(payload, { project: projectID, task: task.id, actor, ...entry })
  return ok({ task: serializeTask(updated) })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await load(request, (await params).id)
  if ('error' in ctx) return ctx.error
  const { payload, user, task, access } = ctx
  if (!(access.canManage || num(task.createdBy) === Number(user.id))) return fail('Hanya pembuat tugas atau pengelola proyek yang dapat menghapus.', 403)
  await payload.delete({ collection: 'project-tasks', id: task.id, overrideAccess: true })
  await logActivity(payload, { project: num(task.project)!, task: task.id, actor: Number(user.id), action: 'task.deleted', summary: `menghapus tugas “${task.title}”` })
  return ok({ ok: true })
}
