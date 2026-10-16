import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GET as listInterests, PATCH as updateInterest } from '../app/(payload)/api/mentor/interests/route'
import { as, begin, createWorld, makeRequest, rollback, type World } from './world'

let w: World
beforeAll(async () => { await begin(); w = await createWorld() })
afterAll(rollback)

type Doc = { id: number; [key: string]: unknown }
let counter = 0
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString()
const dateOnly = (offset: number) => day(offset).slice(0, 10)
const idOf = (value: unknown) => (value && typeof value === 'object' ? (value as { id: number }).id : value)

/** Data persis seperti yang dikirim form guru: tanggal "YYYY-MM-DD", status "open", program sasaran sebagai string. */
const formData = (extra: Record<string, unknown> = {}) => ({
  title: `Peluang uji ${w.suffix} ${++counter}`, type: 'competition', organizer: 'Penyelenggara Uji', summary: 'Deskripsi peluang', status: 'open', ...extra,
})
const createOpportunity = (data: Record<string, unknown>, user: Doc | { collection: string; id: number } = w.teacher) =>
  w.payload.create({ collection: 'opportunities', data: data as never, depth: 0, ...as(user) })
/** Peluang terbuka yang dibuat lewat jalur admin, untuk skenario minat siswa. */
const openOpportunity = async (extra: Record<string, unknown> = {}) =>
  (await w.payload.create({ collection: 'opportunities', data: formData(extra) as never, depth: 0, overrideAccess: true })) as unknown as Doc
const showInterest = (opportunity: Doc, user: Doc = w.studentA, extra: Record<string, unknown> = {}) =>
  w.payload.create({ collection: 'opportunity-interests', data: { opportunity: opportunity.id, note: '', ...extra } as never, depth: 0, ...as(user) })

describe('Form peluang (guru)', () => {
  it('guru dapat menerbitkan peluang dengan isian lengkap', async () => {
    const doc = await createOpportunity(formData({ requirements: 'Syarat', opensAt: dateOnly(-1), deadline: dateOnly(30), url: 'https://contoh.id/daftar', contact: 'guru@sekolah.id' }))
    expect(doc).toMatchObject({ type: 'competition', organizer: 'Penyelenggara Uji', status: 'open', url: 'https://contoh.id/daftar' })
    expect(doc.deadline).toBeTruthy()
  })
  it('program sasaran dengan ID angka diterima', async () => {
    const doc = await createOpportunity(formData({ targetPrograms: [w.program.id, w.otherProgram.id] }))
    expect((doc.targetPrograms as unknown[]).map(idOf)).toEqual([w.program.id, w.otherProgram.id])
  })
  it('program sasaran dengan ID string ditolak (karena itu form harus mengirim angka)', async () => {
    await expect(createOpportunity(formData({ targetPrograms: [String(w.program.id)] }))).rejects.toThrow(/Program Keahlian Sasaran/)
  })
  it('program sasaran boleh kosong (untuk semua program)', async () => {
    const doc = await createOpportunity(formData({ targetPrograms: [] }))
    expect(doc.targetPrograms ?? []).toEqual([])
  })
  it.each([
    ['nama peluang', { title: '' }, /Nama Peluang/],
    ['penyelenggara', { organizer: '' }, /Penyelenggara/],
    ['deskripsi', { summary: '' }, /Deskripsi/],
    ['jenis tidak dikenal', { type: 'lomba-liar' }, /Jenis/],
    ['status tidak dikenal', { status: 'rahasia' }, /Status/],
  ])('menolak isian tidak valid: %s', async (_label, extra, message) => {
    await expect(createOpportunity(formData(extra))).rejects.toThrow(message)
  })
  it.each([
    ['https://contoh.id', true], ['http://contoh.id/x', true], ['ftp://contoh.id', false], ['javascript:alert(1)', false], ['bukan tautan', false],
  ])('tautan %j → valid=%s', async (url, ok) => {
    const promise = createOpportunity(formData({ url }))
    if (ok) await expect(promise).resolves.toBeTruthy()
    else await expect(promise).rejects.toThrow(/[Tt]autan/)
  })
  it('guru dapat menutup peluang', async () => {
    const doc = await createOpportunity(formData())
    const closed = await w.payload.update({ collection: 'opportunities', id: doc.id, data: { status: 'closed' }, ...as(w.teacher) })
    expect(closed.status).toBe('closed')
  })
  it('siswa dan pengunjung tidak bisa membuat atau mengubah peluang', async () => {
    await expect(createOpportunity(formData(), w.studentA)).rejects.toThrow()
    await expect(w.payload.create({ collection: 'opportunities', data: formData() as never, overrideAccess: false })).rejects.toThrow()
    const doc = await openOpportunity()
    await expect(w.payload.update({ collection: 'opportunities', id: doc.id, data: { status: 'closed' }, ...as(w.studentA) })).rejects.toThrow()
  })
  it('hanya admin yang boleh menghapus peluang', async () => {
    const doc = await openOpportunity()
    await expect(w.payload.delete({ collection: 'opportunities', id: doc.id, ...as(w.teacher) })).rejects.toThrow()
    await expect(w.payload.delete({ collection: 'opportunities', id: doc.id, ...as(w.admin) })).resolves.toBeTruthy()
  })
  it('draf hanya terlihat oleh guru; peluang terbuka terlihat siswa', async () => {
    const draft = await openOpportunity({ status: 'draft' })
    const open = await openOpportunity()
    const where = { id: { in: [draft.id, open.id] } }
    expect((await w.payload.find({ collection: 'opportunities', where, depth: 0, ...as(w.studentA) })).docs.map((d) => d.id)).toEqual([open.id])
    expect((await w.payload.find({ collection: 'opportunities', where, depth: 0, ...as(w.teacher) })).totalDocs).toBe(2)
  })
})

describe('Minat siswa pada peluang', () => {
  it('siswa dapat menyatakan minat; status awal "interested" dan terhubung ke akunnya', async () => {
    const doc = await showInterest(await openOpportunity(), w.studentA, { note: 'Saya ingin ikut' })
    expect(doc).toMatchObject({ status: 'interested', note: 'Saya ingin ikut' })
    expect(idOf(doc.student)).toBe(w.studentA.id)
  })
  it('siswa tidak bisa mengisi status sendiri atau memakai nama siswa lain', async () => {
    const doc = await showInterest(await openOpportunity(), w.studentA, { status: 'completed', student: w.studentB.id })
    expect(doc.status).toBe('interested')
    expect(idOf(doc.student)).toBe(w.studentA.id)
  })
  it('tidak bisa mendaftar dua kali ke peluang yang sama', async () => {
    const opportunity = await openOpportunity()
    await showInterest(opportunity)
    await expect(showInterest(opportunity)).rejects.toThrow()
  })
  it('dua siswa berbeda boleh mendaftar ke peluang yang sama', async () => {
    const opportunity = await openOpportunity()
    await showInterest(opportunity, w.studentA)
    await expect(showInterest(opportunity, w.studentB)).resolves.toBeTruthy()
  })
  it('catatan maksimal 800 karakter', async () => {
    await expect(showInterest(await openOpportunity(), w.studentA, { note: 'x'.repeat(801) })).rejects.toThrow()
  })
  it('ditolak bila peluang masih draf atau sudah ditutup', async () => {
    await expect(showInterest(await openOpportunity({ status: 'draft' }))).rejects.toThrow(/tidak dibuka/)
    await expect(showInterest(await openOpportunity({ status: 'closed' }))).rejects.toThrow(/tidak dibuka/)
  })
  it('ditolak bila belum waktunya dibuka', async () => {
    await expect(showInterest(await openOpportunity({ opensAt: day(5) }))).rejects.toThrow(/belum dibuka/)
  })
  it('ditolak bila batas pendaftaran sudah lewat', async () => {
    await expect(showInterest(await openOpportunity({ deadline: day(-2) }))).rejects.toThrow(/sudah lewat/)
  })
  it('diterima selama masih di dalam jendela pendaftaran', async () => {
    await expect(showInterest(await openOpportunity({ opensAt: day(-2), deadline: day(2) }))).resolves.toBeTruthy()
  })
  it('hanya siswa dari program sasaran yang boleh mendaftar', async () => {
    const opportunity = await openOpportunity({ targetPrograms: [w.program.id] })
    await expect(showInterest(opportunity, w.studentA)).resolves.toBeTruthy()
    await expect(showInterest(opportunity, w.studentC)).rejects.toThrow(/program keahlianmu/)
  })
  it('peluang tanpa program sasaran terbuka untuk semua program', async () => {
    await expect(showInterest(await openOpportunity(), w.studentC)).resolves.toBeTruthy()
  })
  it('guru tidak bisa mendaftarkan diri sebagai peminat', async () => {
    await expect(showInterest(await openOpportunity(), w.teacher)).rejects.toThrow()
  })
  it('siswa dapat membatalkan minatnya sendiri, siswa lain tidak bisa', async () => {
    const interest = await showInterest(await openOpportunity())
    await expect(w.payload.delete({ collection: 'opportunity-interests', id: interest.id, ...as(w.studentB) })).rejects.toThrow()
    await expect(w.payload.delete({ collection: 'opportunity-interests', id: interest.id, ...as(w.studentA) })).resolves.toBeTruthy()
  })
  it('setelah dibatalkan, siswa dapat mendaftar lagi', async () => {
    const opportunity = await openOpportunity()
    const interest = await showInterest(opportunity)
    await w.payload.delete({ collection: 'opportunity-interests', id: interest.id, ...as(w.studentA) })
    await expect(showInterest(opportunity)).resolves.toBeTruthy()
  })
  it('siswa hanya melihat minatnya sendiri', async () => {
    const opportunity = await openOpportunity()
    await showInterest(opportunity, w.studentA)
    await showInterest(opportunity, w.studentB)
    const result = await w.payload.find({ collection: 'opportunity-interests', where: { opportunity: { equals: opportunity.id } }, depth: 0, ...as(w.studentA) })
    expect(result.docs.map((doc) => idOf(doc.student))).toEqual([w.studentA.id])
  })
})

describe('Tindak lanjut guru (GET/PATCH /api/mentor/interests)', () => {
  const list = (user?: Doc) => listInterests(makeRequest('/api/mentor/interests', { user }))
  const patch = (body: unknown, user?: Doc) => updateInterest(makeRequest('/api/mentor/interests', { method: 'PATCH', body, user }))

  it('guru melihat peminat dari kelas/program-nya saja', async () => {
    const opportunity = await openOpportunity()
    const mine = await showInterest(opportunity, w.studentA)
    const other = await showInterest(opportunity, w.studentC)
    const response = await list(w.teacher)
    expect(response.status).toBe(200)
    const ids = (await response.json()).docs.map((item: { id: number }) => item.id)
    expect(ids).toContain(mine.id)
    expect(ids).not.toContain(other.id)
  })
  it('guru mengubah status menjadi contacted lalu completed', async () => {
    const interest = await showInterest(await openOpportunity())
    expect((await patch({ id: interest.id, status: 'contacted' }, w.teacher)).status).toBe(200)
    expect((await w.payload.findByID({ collection: 'opportunity-interests', id: interest.id, depth: 0, overrideAccess: true })).status).toBe('contacted')
    expect((await patch({ id: interest.id, status: 'completed' }, w.teacher)).status).toBe(200)
    expect((await w.payload.findByID({ collection: 'opportunity-interests', id: interest.id, depth: 0, overrideAccess: true })).status).toBe('completed')
  })
  it('guru di luar kelas/program siswa tidak bisa mengubah status (403)', async () => {
    const interest = await showInterest(await openOpportunity())
    expect((await patch({ id: interest.id, status: 'contacted' }, w.outsiderTeacher)).status).toBe(403)
    expect((await w.payload.findByID({ collection: 'opportunity-interests', id: interest.id, depth: 0, overrideAccess: true })).status).toBe('interested')
  })
  it('guru hanya bisa mengubah status, bukan catatan siswa', async () => {
    const interest = await showInterest(await openOpportunity(), w.studentA, { note: 'Catatan asli' })
    await patch({ id: interest.id, status: 'contacted', note: 'Diubah guru' }, w.teacher)
    expect((await w.payload.findByID({ collection: 'opportunity-interests', id: interest.id, depth: 0, overrideAccess: true })).note).toBe('Catatan asli')
  })
  it.each([[{ id: 1, status: 'ghosting' }], [{ status: 'contacted' }], [{ id: 1 }], [null]])('menolak permintaan tidak valid %j (400)', async (body) => {
    expect((await patch(body, w.teacher)).status).toBe(400)
  })
  it('siswa dan pengunjung tidak punya akses (403)', async () => {
    expect((await list(w.studentA)).status).toBe(403)
    expect((await list(undefined)).status).toBe(403)
    expect((await patch({ id: 1, status: 'contacted' }, w.studentA)).status).toBe(403)
  })
})
