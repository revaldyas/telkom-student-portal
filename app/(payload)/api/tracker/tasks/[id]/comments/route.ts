import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, num, ok, personOf } from '../../../../../../../lib/chat'
import { logActivity, projectAccess } from '../../../../../../../lib/tracker'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const task = await payload.findByID({ collection: 'project-tasks', id: Number((await params).id), depth: 0, overrideAccess: true }).catch(() => null)
  if (!task || !await projectAccess(payload, user, num(task.project)!)) return fail('Tugas tidak ditemukan.', 404)
  const { body } = await request.json().catch(() => ({})) as { body?: string }
  const text = String(body || '').trim().slice(0, 2000)
  if (!text) return fail('Komentar tidak boleh kosong.')
  const comment = await payload.create({ collection: 'project-task-comments', data: { task: task.id, author: Number(user.id), body: text }, depth: 1, overrideAccess: true })
  await logActivity(payload, { project: num(task.project)!, task: task.id, actor: Number(user.id), action: 'task.commented', summary: `mengomentari “${task.title}”`, meta: { excerpt: text.slice(0, 120) } })
  return ok({ comment: { id: comment.id, body: comment.body, createdAt: comment.createdAt, author: personOf(comment.author) } }, 201)
}
