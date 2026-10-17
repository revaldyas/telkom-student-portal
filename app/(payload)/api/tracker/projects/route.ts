import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, num, ok } from '../../../../../lib/chat'
import { idList, serializeActivity } from '../../../../../lib/tracker'

/** Daftar proyek milik pengguna beserta ringkasan tugas, dan "tugas saya" lintas proyek. */
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const meID = Number(user.id)
  const projects = await payload.find({
    collection: 'projects', depth: 1, limit: 100, sort: '-updatedAt', overrideAccess: true,
    where: { or: [{ createdBy: { equals: meID } }, { 'members.member': { equals: meID } }, { 'mentorAssignments.mentor': { equals: meID } }] }, pagination: false })
  const visible = projects.docs.filter((project) => !(Array.isArray(project.mentorAssignments) ? project.mentorAssignments : []).some((entry) => num(entry.mentor) === meID && entry.response === 'declined' && num(project.createdBy) !== meID))
  const ids = visible.map((project) => project.id)
  const tasks = ids.length ? await payload.find({ collection: 'project-tasks', where: { project: { in: ids } }, depth: 0, limit: 3000, pagination: false, overrideAccess: true }) : { docs: [] }
  const now = Date.now()
  const stats = new Map<number, { total: number; done: number; doing: number; review: number; todo: number; overdue: number; mine: number; dueSoon: number }>()
  const mine: { id: number; title: string; status: string; priority: string; dueDate: string | null; projectID: number; projectTitle: string }[] = []
  const titles = new Map(visible.map((project) => [project.id, project.title]))
  for (const task of tasks.docs) {
    const projectID = num(task.project)!
    const entry = stats.get(projectID) || { total: 0, done: 0, doing: 0, review: 0, todo: 0, overdue: 0, mine: 0, dueSoon: 0 }
    entry.total += 1
    if (task.status === 'done') entry.done += 1
    if (task.status === 'doing') entry.doing += 1
    if (task.status === 'review') entry.review += 1
    if (!task.status || task.status === 'todo') entry.todo += 1
    if (task.status !== 'done' && task.dueDate && new Date(task.dueDate).getTime() >= now && new Date(task.dueDate).getTime() <= now + 7 * 86400000) entry.dueSoon += 1
    if (task.status !== 'done' && task.dueDate && new Date(task.dueDate).getTime() < now) entry.overdue += 1
    if (task.status !== 'done' && idList(task.assignees).includes(meID)) {
      entry.mine += 1
      mine.push({ id: task.id, title: task.title, status: task.status || 'todo', priority: task.priority || 'medium', dueDate: task.dueDate || null, projectID, projectTitle: titles.get(projectID) || 'Proyek' })
    }
    stats.set(projectID, entry)
  }
  mine.sort((a, b) => (a.dueDate ? Date.parse(a.dueDate) : Infinity) - (b.dueDate ? Date.parse(b.dueDate) : Infinity))
  const recent = ids.length ? await payload.find({ collection: 'project-activity', where: { project: { in: ids } }, depth: 1, limit: 14, sort: '-id', overrideAccess: true, pagination: false }) : { docs: [] }
  return ok({
    activity: recent.docs.map((entry) => ({ ...serializeActivity(entry), projectID: num(entry.project)!, projectTitle: titles.get(num(entry.project)!) || 'Proyek' })),
    projects: visible.map((project) => ({
      id: project.id, title: project.title, slug: project.slug, published: project.status === 'published',
      category: typeof project.categoryRef === 'object' && project.categoryRef ? project.categoryRef.name : null,
      cover: typeof project.coverImage === 'object' && project.coverImage ? project.coverImage.url || null : null,
      memberCount: (Array.isArray(project.members) ? project.members.length : 0),
      stats: stats.get(project.id) || { total: 0, done: 0, doing: 0, review: 0, todo: 0, overdue: 0, mine: 0, dueSoon: 0 },
    })),
    myTasks: mine.slice(0, 60),
  })
}
