import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, ok } from '../../../../../../lib/chat'
import { loadTeam, projectAccess, serializeActivity, serializeTask } from '../../../../../../lib/tracker'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const projectID = Number((await params).id)
  const access = await projectAccess(payload, user, projectID)
  if (!access) return fail('Proyek tidak ditemukan atau kamu bukan anggota tim.', 404)
  const { project, role, canManage } = access
  const [team, tasks, activity] = await Promise.all([
    loadTeam(payload, project),
    payload.find({ collection: 'project-tasks', where: { project: { equals: projectID } }, depth: 0, limit: 1000, pagination: false, sort: 'position', overrideAccess: true }),
    payload.find({ collection: 'project-activity', where: { project: { equals: projectID } }, depth: 1, limit: 30, sort: '-id', overrideAccess: true, pagination: false }),
  ])
  const taskIDs = tasks.docs.map((task) => task.id)
  const counts = new Map<number, number>()
  if (taskIDs.length) {
    const comments = await payload.find({ collection: 'project-task-comments', where: { task: { in: taskIDs } }, depth: 0, limit: 3000, pagination: false, overrideAccess: true })
    for (const comment of comments.docs) { const key = typeof comment.task === 'object' ? (comment.task as { id: number }).id : comment.task; counts.set(key, (counts.get(key) || 0) + 1) }
  }
  return ok({
    project: {
      id: project.id, title: project.title, slug: project.slug, summary: project.summary || '', year: project.year ?? null, published: project.status === 'published',
      category: typeof project.categoryRef === 'object' && project.categoryRef ? project.categoryRef.name : null,
      cover: typeof project.coverImage === 'object' && project.coverImage ? project.coverImage.url || null : null,
    },
    me: { id: Number(user.id), role, canManage },
    team,
    tasks: tasks.docs.map((task) => serializeTask(task, counts.get(task.id) || 0)),
    activity: activity.docs.map(serializeActivity),
  })
}
