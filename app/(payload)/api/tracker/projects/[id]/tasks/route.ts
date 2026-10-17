import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, ok } from '../../../../../../../lib/chat'
import { PRIORITIES, STATUSES, checklistOf, idList, loadTeam, logActivity, projectAccess, serializeTask, stringList, statusLabel, type Status } from '../../../../../../../lib/tracker'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const projectID = Number((await params).id)
  const access = await projectAccess(payload, user, projectID)
  if (!access) return fail('Proyek tidak ditemukan atau kamu bukan anggota tim.', 404)
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const title = String(body.title || '').trim().slice(0, 160)
  if (!title) return fail('Judul tugas tidak boleh kosong.')
  const status = (STATUSES as readonly string[]).includes(String(body.status)) ? String(body.status) as Status : 'todo'
  const priority = (PRIORITIES as readonly string[]).includes(String(body.priority)) ? String(body.priority) : 'medium'
  const team = await loadTeam(payload, access.project)
  const teamIDs = new Set(team.map((member) => member.id))
  const assignees = idList(body.assignees).filter((id) => teamIDs.has(id))
  const dueDate = body.dueDate ? new Date(String(body.dueDate)) : null
  const last = await payload.find({ collection: 'project-tasks', where: { and: [{ project: { equals: projectID } }, { status: { equals: status } }] }, sort: '-position', limit: 1, depth: 0, overrideAccess: true, pagination: false })
  const position = Number(last.docs[0]?.position || 0) + 1000
  const task = await payload.create({
    collection: 'project-tasks', overrideAccess: true,
    data: {
      project: projectID, title, description: String(body.description || '').slice(0, 4000), status, priority, assignees, position,
      dueDate: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.toISOString() : null, labels: stringList(body.labels), checklist: checklistOf(body.checklist),
      createdBy: Number(user.id), completedAt: status === 'done' ? new Date().toISOString() : null,
    },
  })
  const names = team.filter((member) => assignees.includes(member.id)).map((member) => member.name)
  await logActivity(payload, { project: projectID, task: task.id, actor: Number(user.id), action: 'task.created', summary: `membuat tugas “${title}” di ${statusLabel[status]}${names.length ? ` untuk ${names.join(', ')}` : ''}`, meta: { title, status, assignees } })
  return ok({ task: serializeTask(task) }, 201)
}
