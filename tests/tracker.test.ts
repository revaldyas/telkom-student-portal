import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { POST as badge } from '../app/(payload)/api/tracker/badge/route'
import { GET as projectDetail } from '../app/(payload)/api/tracker/projects/[id]/route'
import { GET as activityFeed } from '../app/(payload)/api/tracker/projects/[id]/activity/route'
import { POST as createTask } from '../app/(payload)/api/tracker/projects/[id]/tasks/route'
import { GET as listProjects } from '../app/(payload)/api/tracker/projects/route'
import { POST as addComment } from '../app/(payload)/api/tracker/tasks/[id]/comments/route'
import { DELETE as deleteTask, GET as taskDetail, PATCH as updateTask } from '../app/(payload)/api/tracker/tasks/[id]/route'
import { as, begin, createWorld, makeRequest, params, rollback, type World } from './world'

let w: World
beforeAll(async () => { await begin(); w = await createWorld() })
afterAll(rollback)

type Doc = { id: number; [key: string]: unknown }
type Handler = (request: Request, ctx: { params: Promise<never> }) => Promise<Response>
const call = async (handler: unknown, path: string, options: { method?: string; body?: unknown; user?: Doc | null; p?: Record<string, string> } = {}) => {
  const { method = 'GET', body, user = null, p = {} } = options
  const response = await (handler as Handler)(makeRequest(path, { method, body, user: user ?? undefined }), params(p) as never)
  const data = await response.json().catch(() => ({}))
  return { status: response.status, data }
}

let counter = 0
const unique = (label: string) => `${label} ${w.suffix} ${++counter}`
/** Proyek: A pengelola, B anggota, guru A mentor utama, guru B (program lain) bukan bagian dari tim. */
const newProject = async () => (await w.payload.create({
  collection: 'projects', depth: 0, ...as(w.studentA),
  data: { title: unique('Proyek tracker'), summary: 'Ringkasan', members: [{ member: w.studentA.id, contribution: 'Inisiator' }, { member: w.studentB.id, contribution: 'Anggota' }], mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary' }] } as never,
})) as unknown as Doc
const addTask = (project: Doc, user: Doc | null, body: Record<string, unknown> = {}) =>
  call(createTask, `/api/tracker/projects/${project.id}/tasks`, { method: 'POST', body: { title: unique('Tugas'), ...body }, user, p: { id: String(project.id) } })
const patch = (task: Doc, user: Doc | null, body: Record<string, unknown>) =>
  call(updateTask, `/api/tracker/tasks/${task.id}`, { method: 'PATCH', body, user, p: { id: String(task.id) } })
const remove = (task: Doc, user: Doc | null) => call(deleteTask, `/api/tracker/tasks/${task.id}`, { method: 'DELETE', user, p: { id: String(task.id) } })
const detail = (project: Doc, user: Doc | null) => call(projectDetail, `/api/tracker/projects/${project.id}`, { user, p: { id: String(project.id) } })
const activity = async (project: Doc) => (await w.payload.find({ collection: 'project-activity', where: { project: { equals: project.id } }, sort: 'id', limit: 200, depth: 0, overrideAccess: true })).docs as unknown as { action: string; summary: string; actor: number; meta?: Record<string, unknown> }[]
const taskOf = async (project: Doc, user: Doc = w.studentA, body: Record<string, unknown> = {}) => (await addTask(project, user, body)).data.task as Doc & { status: string; priority: string; position: number; assignees: number[]; dueDate: string | null; completedAt: string | null; checklist: { id: string; text: string; done: boolean }[]; labels: string[]; title: string }

describe('Tracker: akses proyek', () => {
  it('tanpa sesi → 401 di semua endpoint', async () => {
    const project = await newProject()
    expect((await call(listProjects, '/api/tracker/projects')).status).toBe(401)
    expect((await detail(project, null)).status).toBe(401)
    expect((await addTask(project, null)).status).toBe(401)
    expect((await call(badge, '/api/tracker/badge', { method: 'POST', body: {} })).status).toBe(401)
  })
  it('pengelola, anggota, dan mentor dapat membuka papan; peran dan hak kelola sesuai', async () => {
    const project = await newProject()
    expect((await detail(project, w.studentA)).data.me).toMatchObject({ role: 'owner', canManage: true })
    expect((await detail(project, w.studentB)).data.me).toMatchObject({ role: 'member', canManage: false })
    expect((await detail(project, w.teacher)).data.me).toMatchObject({ role: 'mentor', canManage: true })
  })
  it('mentor pendamping dapat membuka papan tetapi tidak berhak mengelola', async () => {
    const project = await newProject()
    await w.payload.update({ collection: 'projects', id: project.id, overrideAccess: true, data: { mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary' }, { mentor: w.outsiderTeacher.id, assignmentRole: 'supporting' }] } as never })
    expect((await detail(project, w.outsiderTeacher)).data.me).toMatchObject({ role: 'mentor', canManage: false })
  })
  it('orang di luar tim dan mentor yang menolak undangan mendapat 404', async () => {
    const project = await newProject()
    expect((await detail(project, w.studentC)).status).toBe(404)
    expect((await detail(project, w.outsiderTeacher)).status).toBe(404)
    await w.payload.update({ collection: 'projects', id: project.id, overrideAccess: true, data: { mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary', response: 'declined' }] } as never })
    expect((await detail(project, w.teacher)).status).toBe(404)
    expect((await addTask(project, w.studentC)).status).toBe(404)
  })
  it('proyek yang tidak ada → 404', async () => {
    expect((await call(projectDetail, '/api/tracker/projects/99999999', { user: w.studentA, p: { id: '99999999' } })).status).toBe(404)
  })
  it('detail memuat tim dengan peran/catatan, tugas, dan aktivitas', async () => {
    const project = await newProject()
    await taskOf(project)
    const { team, tasks, activity: feed } = (await detail(project, w.studentA)).data
    const byID = new Map<number, { role: string; note: string }>(team.map((member: Doc & { role: string; note: string }) => [member.id, member]))
    expect(byID.get(w.studentA.id)).toMatchObject({ role: 'owner' })
    expect(byID.get(w.studentB.id)).toMatchObject({ role: 'member', note: 'Anggota' })
    expect(byID.get(w.teacher.id)).toMatchObject({ role: 'mentor', note: 'Mentor utama' })
    expect(tasks).toHaveLength(1)
    expect(feed[0].action).toBe('task.created')
  })
})

describe('Tracker: membuat tugas', () => {
  it('nilai bawaan: status todo, prioritas sedang, tanpa penanggung jawab, tanpa tenggat', async () => {
    const task = await taskOf(await newProject())
    expect(task).toMatchObject({ status: 'todo', priority: 'medium', assignees: [], dueDate: null, completedAt: null })
  })
  it('judul wajib; judul panjang dipotong 160 karakter', async () => {
    const project = await newProject()
    expect((await addTask(project, w.studentA, { title: '   ' })).status).toBe(400)
    expect((await taskOf(project, w.studentA, { title: 'x'.repeat(300) })).title).toHaveLength(160)
  })
  it('status/prioritas tidak dikenal kembali ke bawaan', async () => {
    const task = await taskOf(await newProject(), w.studentA, { status: 'ngawur', priority: 'ngawur' })
    expect(task).toMatchObject({ status: 'todo', priority: 'medium' })
  })
  it('membuat langsung di kolom selesai mengisi completedAt', async () => {
    const task = await taskOf(await newProject(), w.studentA, { status: 'done' })
    expect(task.completedAt).toBeTruthy()
  })
  it('penanggung jawab disaring ke anggota tim saja (siswa luar tim diabaikan)', async () => {
    const task = await taskOf(await newProject(), w.studentA, { assignees: [w.studentB.id, w.studentC.id, 'x', -1] })
    expect(task.assignees).toEqual([w.studentB.id])
  })
  it('tenggat tidak valid menjadi kosong; tenggat valid disimpan', async () => {
    const project = await newProject()
    expect((await taskOf(project, w.studentA, { dueDate: 'bukan tanggal' })).dueDate).toBeNull()
    expect((await taskOf(project, w.studentA, { dueDate: '2030-01-15T00:00:00.000Z' })).dueDate).toBe('2030-01-15T00:00:00.000Z')
  })
  it('label dibersihkan (unik, dipotong, maksimal 8); checklist dibatasi dan diberi id', async () => {
    const labels = Array.from({ length: 12 }, (_, index) => `label${index}`).concat(['label0', '  '])
    const task = await taskOf(await newProject(), w.studentA, { labels, checklist: [{ text: 'a' }, { text: '  ' }, { text: 'b', done: true }] })
    expect(task.labels).toHaveLength(8)
    expect(task.checklist.map((item) => item.text)).toEqual(['a', 'b'])
    expect(task.checklist[1].done).toBe(true)
    expect(task.checklist[0].id).toBeTruthy()
  })
  it('posisi bertambah 1000 di setiap kolom', async () => {
    const project = await newProject()
    const first = await taskOf(project), second = await taskOf(project)
    expect(second.position - first.position).toBe(1000)
  })
  it('mencatat aktivitas task.created', async () => {
    const project = await newProject()
    await taskOf(project, w.studentA, { title: 'Rancang basis data', assignees: [w.studentB.id] })
    const [entry] = await activity(project)
    expect(entry).toMatchObject({ action: 'task.created', actor: w.studentA.id })
    expect(entry.summary).toContain('Rancang basis data')
    expect(entry.summary).toContain('Siswa B')
  })
})

describe('Tracker: mengubah tugas', () => {
  it('memindahkan status mengisi/membersihkan completedAt dan mencatat task.moved', async () => {
    const project = await newProject()
    const task = await taskOf(project)
    const done = (await patch(task, w.studentB, { status: 'done' })).data.task
    expect(done).toMatchObject({ status: 'done' })
    expect(done.completedAt).toBeTruthy()
    const reopened = (await patch(task, w.studentB, { status: 'doing' })).data.task
    expect(reopened.completedAt).toBeNull()
    const moved = (await activity(project)).filter((entry) => entry.action === 'task.moved')
    expect(moved).toHaveLength(2)
    expect(moved[0].meta).toMatchObject({ from: 'todo', to: 'done' })
  })
  it('perubahan yang sama dengan nilai sekarang tidak menulis aktivitas baru', async () => {
    const project = await newProject()
    const task = await taskOf(project, w.studentA, { title: 'Tetap', priority: 'high' })
    const before = (await activity(project)).length
    const result = await patch(task, w.studentA, { title: 'Tetap', priority: 'high', status: 'todo' })
    expect(result.status).toBe(200)
    expect((await activity(project)).length).toBe(before)
  })
  it('judul tidak boleh dikosongkan; judul baru dicatat', async () => {
    const project = await newProject()
    const task = await taskOf(project, w.studentA, { title: 'Lama' })
    expect((await patch(task, w.studentA, { title: '  ' })).status).toBe(400)
    expect((await patch(task, w.studentA, { title: 'Baru' })).data.task.title).toBe('Baru')
    expect((await activity(project)).some((entry) => entry.summary.includes('“Lama”') && entry.summary.includes('“Baru”'))).toBe(true)
  })
  it('prioritas tidak valid diabaikan; prioritas valid disimpan dan dicatat', async () => {
    const project = await newProject()
    const task = await taskOf(project)
    expect((await patch(task, w.studentA, { priority: 'ngawur' })).data.task.priority).toBe('medium')
    expect((await patch(task, w.studentA, { priority: 'urgent' })).data.task.priority).toBe('urgent')
    expect((await activity(project)).some((entry) => entry.summary.includes('prioritas'))).toBe(true)
  })
  it('menugaskan dan melepas anggota mencatat task.assigned dan task.unassigned; luar tim diabaikan', async () => {
    const project = await newProject()
    const task = await taskOf(project)
    const assigned = (await patch(task, w.studentA, { assignees: [w.studentB.id, w.studentC.id] })).data.task
    expect(assigned.assignees).toEqual([w.studentB.id])
    await patch(task, w.studentA, { assignees: [] })
    const actions = (await activity(project)).map((entry) => entry.action)
    expect(actions).toContain('task.assigned')
    expect(actions).toContain('task.unassigned')
  })
  it('tenggat dapat diatur lalu dihapus', async () => {
    const project = await newProject()
    const task = await taskOf(project)
    expect((await patch(task, w.studentA, { dueDate: '2030-06-01T00:00:00.000Z' })).data.task.dueDate).toBe('2030-06-01T00:00:00.000Z')
    expect((await patch(task, w.studentA, { dueDate: null })).data.task.dueDate).toBeNull()
  })
  it('checklist: menyelesaikan butir dicatat task.checklist', async () => {
    const project = await newProject()
    const task = await taskOf(project, w.studentA, { checklist: [{ id: 'x1', text: 'Survei' }] })
    await patch(task, w.studentA, { checklist: [{ id: 'x1', text: 'Survei', done: true }] })
    const entry = (await activity(project)).find((item) => item.action === 'task.checklist')
    expect(entry?.summary).toContain('Survei')
  })
  it('mentor dan anggota dapat mengubah; orang luar tim mendapat 404', async () => {
    const task = await taskOf(await newProject())
    expect((await patch(task, w.teacher, { priority: 'high' })).status).toBe(200)
    expect((await patch(task, w.studentB, { priority: 'low' })).status).toBe(200)
    expect((await patch(task, w.studentC, { priority: 'urgent' })).status).toBe(404)
    expect((await patch(task, null, { priority: 'urgent' })).status).toBe(401)
  })
  it('tugas yang tidak ada → 404', async () => {
    expect((await call(updateTask, '/api/tracker/tasks/99999999', { method: 'PATCH', body: { title: 'x' }, user: w.studentA, p: { id: '99999999' } })).status).toBe(404)
  })
})

describe('Tracker: menghapus tugas', () => {
  it('pembuat tugas dapat menghapus tugasnya sendiri', async () => {
    const project = await newProject()
    const task = await taskOf(project, w.studentB)
    expect((await remove(task, w.studentB)).status).toBe(200)
    expect((await detail(project, w.studentA)).data.tasks).toHaveLength(0)
    expect((await activity(project)).map((entry) => entry.action)).toContain('task.deleted')
  })
  it('anggota biasa tidak bisa menghapus tugas orang lain (403)', async () => {
    const task = await taskOf(await newProject(), w.studentA)
    expect((await remove(task, w.studentB)).status).toBe(403)
  })
  it('pengelola dan mentor utama dapat menghapus tugas anggota', async () => {
    const project = await newProject()
    expect((await remove(await taskOf(project, w.studentB), w.studentA)).status).toBe(200)
    expect((await remove(await taskOf(project, w.studentB), w.teacher)).status).toBe(200)
  })
  it('mentor pendamping tidak bisa menghapus tugas anggota; orang luar 404', async () => {
    const project = await newProject()
    await w.payload.update({ collection: 'projects', id: project.id, overrideAccess: true, data: { mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary' }, { mentor: w.outsiderTeacher.id, assignmentRole: 'supporting' }] } as never })
    const task = await taskOf(project, w.studentB)
    expect((await remove(task, w.outsiderTeacher)).status).toBe(403)
    expect((await remove(task, w.studentC)).status).toBe(404)
  })
})

describe('Tracker: komentar tugas', () => {
  it('anggota dapat berkomentar; komentar muncul di detail tugas dan menambah hitungan di papan', async () => {
    const project = await newProject()
    const task = await taskOf(project)
    const created = await call(addComment, `/api/tracker/tasks/${task.id}/comments`, { method: 'POST', body: { body: 'Sudah dicek' }, user: w.studentB, p: { id: String(task.id) } })
    expect(created.status).toBe(201)
    expect(created.data.comment.author).toMatchObject({ id: w.studentB.id })
    const info = (await call(taskDetail, `/api/tracker/tasks/${task.id}`, { user: w.studentA, p: { id: String(task.id) } })).data
    expect(info.comments.map((comment: Doc) => comment.body)).toEqual(['Sudah dicek'])
    expect(info.task.commentCount).toBe(1)
    expect((await detail(project, w.studentA)).data.tasks[0].commentCount).toBe(1)
    expect((await activity(project)).map((entry) => entry.action)).toContain('task.commented')
  })
  it('komentar kosong ditolak; komentar panjang dipotong 2000 karakter', async () => {
    const task = await taskOf(await newProject())
    const post = (body: string) => call(addComment, `/api/tracker/tasks/${task.id}/comments`, { method: 'POST', body: { body }, user: w.studentA, p: { id: String(task.id) } })
    expect((await post('   ')).status).toBe(400)
    expect((await post('x'.repeat(2500))).data.comment.body).toHaveLength(2000)
  })
  it('orang luar tim tidak bisa membaca atau mengomentari tugas', async () => {
    const task = await taskOf(await newProject())
    expect((await call(addComment, `/api/tracker/tasks/${task.id}/comments`, { method: 'POST', body: { body: 'hai' }, user: w.studentC, p: { id: String(task.id) } })).status).toBe(404)
    expect((await call(taskDetail, `/api/tracker/tasks/${task.id}`, { user: w.studentC, p: { id: String(task.id) } })).status).toBe(404)
  })
})

describe('Tracker: riwayat aktivitas', () => {
  it('memuat aktivitas terbaru lebih dulu dan mendukung paginasi ?before=', async () => {
    const project = await newProject()
    for (let index = 0; index < 32; index += 1) await w.payload.create({ collection: 'project-activity', data: { project: project.id, actor: w.studentA.id, action: 'task.updated', summary: `catatan ${index}` }, overrideAccess: true })
    const page = (before = '') => call(activityFeed, `/api/tracker/projects/${project.id}/activity${before}`, { user: w.studentB, p: { id: String(project.id) } })
    const first = (await page()).data
    expect(first.activity).toHaveLength(30)
    expect(first.hasMore).toBe(true)
    expect(first.activity[0].summary).toBe('catatan 31')
    const second = (await page(`?before=${first.activity[29].id}`)).data
    expect(second.activity.map((entry: Doc) => entry.summary)).toEqual(['catatan 1', 'catatan 0'])
    expect(second.hasMore).toBe(false)
  })
  it('orang luar tim mendapat 404', async () => {
    const project = await newProject()
    expect((await call(activityFeed, `/api/tracker/projects/${project.id}/activity`, { user: w.studentC, p: { id: String(project.id) } })).status).toBe(404)
  })
})

describe('Tracker: daftar proyek dan "tugas saya"', () => {
  it('menghitung ringkasan tugas per status, terlambat, dan tugas milik saya', async () => {
    const project = await newProject()
    const past = new Date(Date.now() - 3 * 86400000).toISOString()
    const soon = new Date(Date.now() + 2 * 86400000).toISOString()
    await taskOf(project, w.studentA, { status: 'todo', assignees: [w.studentB.id], dueDate: past })
    await taskOf(project, w.studentA, { status: 'doing', assignees: [w.studentB.id], dueDate: soon })
    await taskOf(project, w.studentA, { status: 'review' })
    await taskOf(project, w.studentA, { status: 'done', assignees: [w.studentB.id] })
    const { data } = await call(listProjects, '/api/tracker/projects', { user: w.studentB })
    const row = data.projects.find((item: Doc) => item.id === project.id)
    expect(row.stats).toMatchObject({ total: 4, todo: 1, doing: 1, review: 1, done: 1, overdue: 1, dueSoon: 1, mine: 2 })
    const mine = data.myTasks.filter((task: Doc) => task.projectID === project.id)
    expect(mine).toHaveLength(2)
    expect(mine[0].dueDate).toBe(past)
  })
  it('hanya memuat proyek milik pengguna; mentor yang menolak tidak melihat proyek', async () => {
    const project = await newProject()
    const ids = (user: Doc) => call(listProjects, '/api/tracker/projects', { user }).then((result) => result.data.projects.map((item: Doc) => item.id))
    expect(await ids(w.studentA)).toContain(project.id)
    expect(await ids(w.teacher)).toContain(project.id)
    expect(await ids(w.studentC)).not.toContain(project.id)
    await w.payload.update({ collection: 'projects', id: project.id, overrideAccess: true, data: { mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary', response: 'declined' }] } as never })
    expect(await ids(w.teacher)).not.toContain(project.id)
  })
})

describe('Tracker: badge aktivitas baru', () => {
  const badgeFor = (user: Doc, seen: Record<string, string> = {}) => call(badge, '/api/tracker/badge', { method: 'POST', body: { seen }, user })
  it('aktivitas orang lain dihitung baru; aktivitas sendiri tidak', async () => {
    const project = await newProject()
    await taskOf(project, w.studentA)
    const forB = (await badgeFor(w.studentB)).data
    expect(forB.projects[project.id].activity).toBeGreaterThanOrEqual(1)
    const forA = (await badgeFor(w.studentA)).data
    expect(forA.projects[project.id]).toBeUndefined()
  })
  it('sudah dilihat sesudah aktivitas terakhir → tidak dihitung lagi', async () => {
    const project = await newProject()
    await taskOf(project, w.studentA)
    const later = new Date(Date.now() + 60_000).toISOString()
    expect((await badgeFor(w.studentB, { [project.id]: later })).data.projects[project.id]).toBeUndefined()
  })
  it('penugasan kepada saya dihitung terpisah dalam assigned', async () => {
    const project = await newProject()
    const task = await taskOf(project, w.studentA)
    await patch(task, w.studentA, { assignees: [w.studentB.id] })
    const result = (await badgeFor(w.studentB)).data
    expect(result.projects[project.id].assigned).toBe(1)
    expect(result.assigned).toBeGreaterThanOrEqual(1)
    expect(result.total).toBeGreaterThanOrEqual(result.assigned)
  })
  it('pengguna tanpa proyek mendapat total nol', async () => {
    expect((await badgeFor(w.studentC)).data).toEqual({ projects: {}, total: 0, assigned: 0 })
  })
})
