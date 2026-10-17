import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DELETE as removeComment, GET as listComments, PATCH as editComment, POST as postComment } from '../app/(payload)/api/community/projects/[id]/comments/route'
import { as, begin, createWorld, makeRequest, params, rollback, type World } from './world'

let w: World
beforeAll(async () => { await begin(); w = await createWorld() })
afterAll(rollback)

type Doc = { id: number; [key: string]: unknown }
let counter = 0
const newProject = async (published = true) => (await w.payload.create({
  collection: 'projects', depth: 0, ...as(w.studentA),
  data: { title: `Komentar proyek ${w.suffix} ${++counter}`, summary: 'Ringkasan', members: [{ member: w.studentA.id, contribution: 'Inisiator' }], ...(published ? { status: 'published' } : {}) } as never,
}).then(async (doc) => published ? w.payload.update({ collection: 'projects', id: doc.id, data: { status: 'published' } as never, depth: 0, overrideAccess: true }) : doc)) as unknown as Doc

const url = (project: Doc, commentID?: number) => `/api/community/projects/${project.id}/comments${commentID ? `?commentID=${commentID}` : ''}`
const post = (project: Doc, user: Doc | undefined, body: string) => postComment(makeRequest(url(project), { method: 'POST', body: { body }, user }), params({ id: String(project.id) }))
const patch = (project: Doc, commentID: number, user: Doc | undefined, body: string) => editComment(makeRequest(url(project, commentID), { method: 'PATCH', body: { body }, user }), params({ id: String(project.id) }))
const del = (project: Doc, commentID: number, user: Doc | undefined) => removeComment(makeRequest(url(project, commentID), { method: 'DELETE', user }), params({ id: String(project.id) }))
const created = async (project: Doc, user: Doc, body = 'Komentar awal') => ((await (await post(project, user, body)).json()).comment as { id: number })

describe('Komentar proyek: edit', () => {
  it('penulis dapat mengedit komentarnya dan komentar ditandai diedit', async () => {
    const project = await newProject()
    const comment = await created(project, w.studentB)
    const response = await patch(project, comment.id, w.studentB, 'Isi baru')
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.comment.body).toBe('Isi baru')
    expect(data.comment.edited).toBe(true)
  })
  it('guru juga dapat mengedit komentarnya sendiri', async () => {
    const project = await newProject()
    const comment = await created(project, w.teacher)
    expect((await patch(project, comment.id, w.teacher, 'Masukan baru')).status).toBe(200)
  })
  it('orang lain, termasuk pengelola proyek, tidak bisa mengedit komentar (403)', async () => {
    const project = await newProject()
    const comment = await created(project, w.studentB)
    expect((await patch(project, comment.id, w.studentC, 'Diubah')).status).toBe(403)
    expect((await patch(project, comment.id, w.studentA, 'Diubah')).status).toBe(403)
  })
  it('tanpa sesi → 401; isi terlalu pendek atau panjang → 400; komentar proyek lain → 404', async () => {
    const project = await newProject()
    const other = await newProject()
    const comment = await created(project, w.studentB)
    expect((await patch(project, comment.id, undefined, 'Isi baru')).status).toBe(401)
    expect((await patch(project, comment.id, w.studentB, 'x')).status).toBe(400)
    expect((await patch(project, comment.id, w.studentB, 'x'.repeat(1201))).status).toBe(400)
    expect((await patch(other, comment.id, w.studentB, 'Isi baru')).status).toBe(404)
  })
})

describe('Komentar proyek: hapus', () => {
  it('penulis dapat menghapus komentarnya sendiri', async () => {
    const project = await newProject()
    const comment = await created(project, w.studentB)
    expect((await del(project, comment.id, w.studentB)).status).toBe(200)
    const list = await (await listComments(makeRequest(url(project)), params({ id: String(project.id) }))).json()
    expect(list.comments).toHaveLength(0)
  })
  it('pengelola proyek dapat menghapus komentar orang lain di proyeknya', async () => {
    const project = await newProject()
    const comment = await created(project, w.studentB)
    expect((await del(project, comment.id, w.studentA)).status).toBe(200)
  })
  it('siswa lain yang bukan penulis atau pengelola tidak bisa menghapus (403)', async () => {
    const project = await newProject()
    const comment = await created(project, w.studentB)
    expect((await del(project, comment.id, w.studentC)).status).toBe(403)
  })
  it('tanpa sesi → 401', async () => {
    const project = await newProject()
    const comment = await created(project, w.studentB)
    expect((await del(project, comment.id, undefined)).status).toBe(401)
  })
  it('daftar komentar menandai hak hapus dan edit menurut pemanggil', async () => {
    const project = await newProject()
    await created(project, w.studentB)
    const asOwner = (await (await listComments(makeRequest(url(project), { user: w.studentA }), params({ id: String(project.id) }))).json()).comments[0]
    expect(asOwner.mine).toBe(false)
    expect(asOwner.canDelete).toBe(true)
    const asAuthor = (await (await listComments(makeRequest(url(project), { user: w.studentB }), params({ id: String(project.id) }))).json()).comments[0]
    expect(asAuthor.mine).toBe(true)
    expect(asAuthor.canDelete).toBe(true)
    const asOther = (await (await listComments(makeRequest(url(project), { user: w.studentC }), params({ id: String(project.id) }))).json()).comments[0]
    expect(asOther.canDelete).toBe(false)
  })
})
