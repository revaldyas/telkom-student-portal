import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { POST as action } from '../app/(payload)/api/community/projects/[id]/actions/route'
import { as, begin, createWorld, makeRequest, params, rollback, type World } from './world'

let w: World
beforeAll(async () => { await begin(); w = await createWorld() })
afterAll(rollback)

type Doc = { id: number; [key: string]: unknown }
let counter = 0
const idOf = (value: unknown) => (value && typeof value === 'object' ? (value as { id: number }).id : value)

/** Proyek milik siswa A dengan guru A sebagai mentor utama dan (opsional) guru B sebagai pendamping. */
async function newProject({ supporting = false, mentors = true } = {}) {
  const mentorAssignments = mentors
    ? [{ mentor: w.teacher.id, assignmentRole: 'primary' }, ...(supporting ? [{ mentor: w.outsiderTeacher.id, assignmentRole: 'supporting' }] : [])]
    : []
  return (await w.payload.create({
    collection: 'projects', depth: 0, ...as(w.studentA),
    data: { title: `Alur proyek ${w.suffix} ${++counter}`, summary: 'Ringkasan', members: [{ member: w.studentA.id, contribution: 'Inisiator' }], mentorAssignments } as never,
  })) as unknown as Doc
}
const act = (project: Doc, user: Doc | undefined, body: unknown) =>
  action(makeRequest(`/api/community/projects/${project.id}/actions`, { method: 'POST', body, user }), params({ id: String(project.id) }))
const reload = (project: Doc) => w.payload.findByID({ collection: 'projects', id: project.id, depth: 0, overrideAccess: true }) as Promise<Record<string, any>>
const respond = (project: Doc, user: Doc, response: string) => act(project, user, { action: 'respond', response })
const review = (project: Doc, user: Doc, decision: string, feedback = 'Masukan dari guru pembimbing') => act(project, user, { action: 'review', decision, feedback })
const responseOf = (doc: Record<string, any>, teacher: Doc) => doc.mentorAssignments.find((item: any) => idOf(item.mentor) === teacher.id)?.response

describe('Alur proyek: undangan mentor', () => {
  it('guru yang diundang dapat menerima undangan', async () => {
    const project = await newProject()
    const result = await respond(project, w.teacher, 'accepted')
    expect(result.status).toBe(200)
    expect(responseOf(await reload(project), w.teacher)).toBe('accepted')
  })
  it('guru yang diundang dapat menolak undangan', async () => {
    const project = await newProject()
    expect((await respond(project, w.teacher, 'declined')).status).toBe(200)
    expect(responseOf(await reload(project), w.teacher)).toBe('declined')
  })
  it('undangan yang sudah ditanggapi tidak bisa diubah lagi', async () => {
    const project = await newProject()
    await respond(project, w.teacher, 'accepted')
    expect((await respond(project, w.teacher, 'declined')).status).toBe(403)
    expect(responseOf(await reload(project), w.teacher)).toBe('accepted')
  })
  it('guru yang tidak diundang tidak bisa menanggapi', async () => {
    const project = await newProject()
    expect((await respond(project, w.outsiderTeacher, 'accepted')).status).toBe(403)
  })
  it('siswa tidak bisa menjawab undangan atas nama guru', async () => {
    const project = await newProject()
    expect((await respond(project, w.studentA, 'accepted')).status).toBe(403)
    expect(responseOf(await reload(project), w.teacher)).toBe('invited')
  })
  it('menolak jawaban selain accepted/declined', async () => {
    const project = await newProject()
    expect((await respond(project, w.teacher, 'mungkin')).status).toBe(403)
  })
  it('respons satu guru tidak mengubah respons guru lain', async () => {
    const project = await newProject({ supporting: true })
    await respond(project, w.teacher, 'accepted')
    const doc = await reload(project)
    expect(responseOf(doc, w.teacher)).toBe('accepted')
    expect(responseOf(doc, w.outsiderTeacher)).toBe('invited')
  })
})

describe('Alur proyek: pengajuan verifikasi', () => {
  it('pengelola dapat mengajukan setelah mentor utama menerima', async () => {
    const project = await newProject()
    await respond(project, w.teacher, 'accepted')
    const result = await act(project, w.studentA, { action: 'submit' })
    expect(result.status).toBe(200)
    expect(await reload(project)).toMatchObject({ verificationStatus: 'submitted', status: 'draft' })
  })
  it('ditolak bila belum ada mentor', async () => {
    const project = await newProject({ mentors: false })
    expect((await act(project, w.studentA, { action: 'submit' })).status).toBe(400)
  })
  it('ditolak selama mentor utama belum menjawab', async () => {
    const project = await newProject()
    const result = await act(project, w.studentA, { action: 'submit' })
    expect(result.status).toBe(400)
    expect((await result.json()).message).toMatch(/mentor utama/)
  })
  it('ditolak bila mentor utama menolak undangan', async () => {
    const project = await newProject()
    await respond(project, w.teacher, 'declined')
    expect((await act(project, w.studentA, { action: 'submit' })).status).toBe(400)
  })
  it('ditolak bila ringkasan proyek masih kosong (draf belum lengkap)', async () => {
    const project = await newProject()
    await w.payload.update({ collection: 'projects', id: project.id, data: { summary: '' }, ...as(w.studentA) })
    await respond(project, w.teacher, 'accepted')
    const result = await act(project, w.studentA, { action: 'submit' })
    expect(result.status).toBe(400)
    expect((await result.json()).message).toMatch(/ringkasan/i)
    expect((await reload(project)).verificationStatus).toBe('unreviewed')
  })
  it('hanya mentor pendamping yang menerima tidak cukup', async () => {
    const project = await newProject({ supporting: true })
    await respond(project, w.outsiderTeacher, 'accepted')
    expect((await act(project, w.studentA, { action: 'submit' })).status).toBe(400)
  })
  it('siswa lain (bukan pengelola) tidak bisa mengajukan', async () => {
    const project = await newProject()
    await respond(project, w.teacher, 'accepted')
    expect((await act(project, w.studentB, { action: 'submit' })).status).toBe(403)
    expect((await reload(project)).verificationStatus).toBe('unreviewed')
  })
  it('guru tidak bisa mengajukan proyek', async () => {
    const project = await newProject()
    await respond(project, w.teacher, 'accepted')
    expect((await act(project, w.teacher, { action: 'submit' })).status).toBe(403)
  })
})

describe('Alur proyek: tinjauan dan persetujuan', () => {
  const submitted = async (opts?: Parameters<typeof newProject>[0]) => {
    const project = await newProject(opts)
    await respond(project, w.teacher, 'accepted')
    await act(project, w.studentA, { action: 'submit' })
    return project
  }

  it('mentor utama menyetujui: proyek terbit dan tercatat siapa yang memverifikasi', async () => {
    const project = await submitted()
    const result = await review(project, w.teacher, 'verified', 'Hasil sudah sangat baik')
    expect(result.status).toBe(200)
    const doc = await reload(project)
    expect(doc).toMatchObject({ verificationStatus: 'verified', status: 'published', reviewFeedback: 'Hasil sudah sangat baik' })
    expect(idOf(doc.verifiedBy)).toBe(w.teacher.id)
    expect(doc.verifiedAt).toBeTruthy()
    expect(doc.reviewHistory).toHaveLength(1)
    expect(doc.reviewHistory[0]).toMatchObject({ decision: 'verified', reviewerRole: 'primary' })
  })
  it('mentor utama meminta revisi: proyek kembali draf tanpa tanda verifikasi', async () => {
    const project = await submitted()
    expect((await review(project, w.teacher, 'revision-requested', 'Tambahkan dokumentasi')).status).toBe(200)
    const doc = await reload(project)
    expect(doc).toMatchObject({ verificationStatus: 'revision-requested', status: 'draft', reviewFeedback: 'Tambahkan dokumentasi' })
    expect(doc.verifiedBy ?? null).toBeNull()
  })
  it('setelah revisi, siswa dapat mengajukan ulang lalu disetujui', async () => {
    const project = await submitted()
    await review(project, w.teacher, 'revision-requested', 'Perbaiki ringkasan')
    await w.payload.update({ collection: 'projects', id: project.id, data: { summary: 'Ringkasan diperbaiki' }, ...as(w.studentA) })
    expect((await act(project, w.studentA, { action: 'submit' })).status).toBe(200)
    expect((await review(project, w.teacher, 'verified', 'Sekarang sudah bagus')).status).toBe(200)
    const doc = await reload(project)
    expect(doc).toMatchObject({ status: 'published', verificationStatus: 'verified' })
    expect(doc.reviewHistory).toHaveLength(2)
  })
  it('mentor pendamping hanya boleh memberi masukan, bukan memutuskan', async () => {
    const project = await newProject({ supporting: true })
    await respond(project, w.teacher, 'accepted')
    await respond(project, w.outsiderTeacher, 'accepted')
    await act(project, w.studentA, { action: 'submit' })
    expect((await review(project, w.outsiderTeacher, 'verified')).status).toBe(403)
    expect((await review(project, w.outsiderTeacher, 'revision-requested')).status).toBe(403)
    expect((await review(project, w.outsiderTeacher, 'comment', 'Saran dari pendamping')).status).toBe(200)
    const doc = await reload(project)
    expect(doc).toMatchObject({ verificationStatus: 'submitted', status: 'draft' })
    expect(doc.reviewHistory[0]).toMatchObject({ decision: 'comment', reviewerRole: 'supporting' })
  })
  it('keputusan baru ditolak sebelum proyek diajukan (409)', async () => {
    const project = await newProject()
    await respond(project, w.teacher, 'accepted')
    expect((await review(project, w.teacher, 'verified')).status).toBe(409)
    expect((await reload(project)).status).toBe('draft')
  })
  it('komentar boleh diberikan walau belum diajukan', async () => {
    const project = await newProject()
    await respond(project, w.teacher, 'accepted')
    expect((await review(project, w.teacher, 'comment', 'Semangat ya')).status).toBe(200)
  })
  it('guru yang belum menerima undangan tidak bisa meninjau', async () => {
    const project = await newProject()
    expect((await review(project, w.teacher, 'comment')).status).toBe(403)
  })
  it('guru di luar daftar pembimbing tidak bisa meninjau', async () => {
    const project = await submitted()
    expect((await review(project, w.outsiderTeacher, 'verified')).status).toBe(403)
    expect((await reload(project)).status).toBe('draft')
  })
  it('siswa tidak bisa meninjau proyeknya sendiri', async () => {
    const project = await submitted()
    expect((await review(project, w.studentA, 'verified')).status).toBe(403)
    expect((await reload(project)).status).toBe('draft')
  })
  it.each([['oke', 'verified'], ['x'.repeat(3001), 'verified'], ['Masukan cukup panjang', 'diterima-saja']])(
    'menolak masukan %#: feedback/keputusan tidak valid', async (feedback, decision) => {
      const project = await submitted()
      expect((await review(project, w.teacher, decision, feedback)).status).toBe(400)
    })
  it('proyek terbit yang diedit siswa kembali menjadi draf dan perlu ditinjau ulang', async () => {
    const project = await submitted()
    await review(project, w.teacher, 'verified', 'Disetujui')
    await w.payload.update({ collection: 'projects', id: project.id, data: { summary: 'Diubah setelah terbit' }, ...as(w.studentA) })
    expect(await reload(project)).toMatchObject({ status: 'draft', verificationStatus: 'unreviewed' })
  })
})

describe('Alur proyek: validasi endpoint', () => {
  it('menolak pengguna tanpa sesi (401)', async () => {
    const project = await newProject()
    expect((await act(project, undefined, { action: 'submit' })).status).toBe(401)
  })
  it('menolak tindakan yang tidak dikenal dan body kosong (400)', async () => {
    const project = await newProject()
    expect((await act(project, w.studentA, { action: 'hapus-semua' })).status).toBe(400)
    expect((await act(project, w.studentA, {})).status).toBe(400)
  })
  it('menolak ID proyek yang tidak valid (400)', async () => {
    const result = await action(makeRequest('/api/community/projects/abc/actions', { method: 'POST', body: { action: 'submit' }, user: w.studentA }), params({ id: 'abc' }))
    expect(result.status).toBe(400)
  })
})
