import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GET as listReviews, POST as postReview } from '../app/(payload)/api/mentor/reviews/route'
import { as, begin, createWorld, makeRequest, rollback, type World } from './world'

let w: World
beforeAll(async () => { await begin(); w = await createWorld() })
afterAll(rollback)

type Doc = { id: number; [key: string]: unknown }
let counter = 0
const idOf = (value: unknown) => (value && typeof value === 'object' ? (value as { id: number }).id : value)

const newWork = async (owner: Doc = w.studentA) => (await w.payload.create({
  collection: 'portfolios', depth: 0, ...as(owner),
  data: { title: `Tinjauan karya ${w.suffix} ${++counter}`, summary: 'Ringkasan', categoryRef: w.category.id } as never,
})) as unknown as Doc
const reload = (work: Doc) => w.payload.findByID({ collection: 'portfolios', id: work.id, depth: 0, overrideAccess: true }) as Promise<Record<string, any>>
const submit = (body: unknown, user?: Doc) => postReview(makeRequest('/api/mentor/reviews', { method: 'POST', body, user }))
const decide = (work: Doc, user: Doc | undefined, decision: string, feedback = 'Umpan balik dari guru') => submit({ portfolio: work.id, decision, feedback }, user)

describe('Alur persetujuan karya (POST /api/mentor/reviews)', () => {
  it('guru menyetujui: karya terbit, terverifikasi, dan tercatat siapa yang memverifikasi', async () => {
    const work = await newWork()
    expect((await reload(work)).status).toBe('draft')
    const response = await decide(work, w.teacher, 'verified', 'Karya sangat baik')
    expect(response.status).toBe(200)
    const doc = await reload(work)
    expect(doc).toMatchObject({ status: 'published', verificationStatus: 'verified', reviewFeedback: 'Karya sangat baik' })
    expect(idOf(doc.verifiedBy)).toBe(w.teacher.id)
    expect(doc.verifiedAt).toBeTruthy()
  })
  it('guru meminta revisi: karya tetap draf dengan catatan untuk siswa', async () => {
    const work = await newWork()
    expect((await decide(work, w.teacher, 'revision-requested', 'Tambahkan gambar proses')).status).toBe(200)
    const doc = await reload(work)
    expect(doc).toMatchObject({ status: 'draft', verificationStatus: 'revision-requested', reviewFeedback: 'Tambahkan gambar proses' })
    expect(doc.verifiedBy ?? null).toBeNull()
  })
  it('catatan revisi bisa dibaca siswa pemilik, tapi tidak oleh siswa lain', async () => {
    const work = await newWork()
    await decide(work, w.teacher, 'revision-requested', 'Perbaiki judul karya')
    const own = await w.payload.findByID({ collection: 'portfolios', id: work.id, depth: 0, ...as(w.studentA) })
    expect(own.reviewFeedback).toBe('Perbaiki judul karya')
    const asOther = await w.payload.find({ collection: 'portfolios', where: { id: { equals: work.id } }, depth: 0, ...as(w.studentB) })
    expect(asOther.totalDocs).toBe(0)
  })
  it('setelah revisi siswa memperbaiki karya, guru bisa menyetujuinya', async () => {
    const work = await newWork()
    await decide(work, w.teacher, 'revision-requested', 'Perbaiki ringkasan')
    await w.payload.update({ collection: 'portfolios', id: work.id, data: { summary: 'Ringkasan diperbaiki' }, ...as(w.studentA) })
    expect((await decide(work, w.teacher, 'verified', 'Sudah bagus')).status).toBe(200)
    expect(await reload(work)).toMatchObject({ status: 'published', verificationStatus: 'verified' })
  })
  it('karya terverifikasi yang diedit siswa harus ditinjau ulang', async () => {
    const work = await newWork()
    await decide(work, w.teacher, 'verified')
    await w.payload.update({ collection: 'portfolios', id: work.id, data: { summary: 'Diubah setelah terbit' }, ...as(w.studentA) })
    const doc = await reload(work)
    expect(doc).toMatchObject({ status: 'draft', verificationStatus: 'unreviewed' })
    expect(doc.verifiedBy ?? null).toBeNull()
  })
  it('guru dari program/kelas lain tidak bisa meninjau (403)', async () => {
    const work = await newWork()
    expect((await decide(work, w.outsiderTeacher, 'verified')).status).toBe(403)
    expect(await reload(work)).toMatchObject({ status: 'draft', verificationStatus: 'unreviewed' })
  })
  it('guru yang sama bisa meninjau karya siswa lain di kelas/program-nya', async () => {
    const work = await newWork(w.studentB)
    expect((await decide(work, w.teacher, 'verified')).status).toBe(200)
  })
  it('guru tidak bisa meninjau karya siswa dari program lain', async () => {
    const work = await newWork(w.studentC)
    expect((await decide(work, w.teacher, 'verified')).status).toBe(403)
  })
  it('siswa tidak bisa menyetujui karya sendiri (403)', async () => {
    const work = await newWork()
    expect((await decide(work, w.studentA, 'verified')).status).toBe(403)
    expect((await reload(work)).status).toBe('draft')
  })
  it('pengguna tanpa sesi ditolak (403)', async () => {
    const work = await newWork()
    expect((await decide(work, undefined, 'verified')).status).toBe(403)
  })
  it.each([
    ['umpan balik terlalu pendek', { decision: 'verified', feedback: 'ok' }],
    ['umpan balik kosong', { decision: 'verified', feedback: '' }],
    ['umpan balik lebih dari 3000 karakter', { decision: 'verified', feedback: 'x'.repeat(3001) }],
    ['keputusan tidak dikenal', { decision: 'approved', feedback: 'Umpan balik cukup' }],
    ['keputusan "comment" tidak berlaku untuk karya', { decision: 'comment', feedback: 'Umpan balik cukup' }],
  ])('menolak %s (400)', async (_label, extra) => {
    const work = await newWork()
    expect((await submit({ portfolio: work.id, ...extra }, w.teacher)).status).toBe(400)
    expect((await reload(work)).verificationStatus).toBe('unreviewed')
  })
  it.each([[undefined], ['abc'], [0], [-3]])('menolak ID karya tidak valid %j (400)', async (portfolio) => {
    expect((await submit({ portfolio, decision: 'verified', feedback: 'Umpan balik cukup' }, w.teacher)).status).toBe(400)
  })
})

describe('Daftar antrean guru (GET /api/mentor/reviews)', () => {
  const list = async (user?: Doc) => listReviews(makeRequest('/api/mentor/reviews', { user }))
  const ids = (body: { docs: Array<{ kind: string; id: number }> }, kind = 'portfolio') => body.docs.filter((item) => item.kind === kind).map((item) => item.id)

  it('guru melihat karya draf siswa di kelas/program-nya, bukan milik program lain', async () => {
    const mine = await newWork(w.studentA)
    const other = await newWork(w.studentC)
    const response = await list(w.teacher)
    expect(response.status).toBe(200)
    const found = ids(await response.json())
    expect(found).toContain(mine.id)
    expect(found).not.toContain(other.id)
  })
  it('karya yang diminta revisi tetap muncul di antrean beserta keputusannya', async () => {
    const work = await newWork()
    await decide(work, w.teacher, 'revision-requested', 'Perlu revisi kecil')
    const body = await (await list(w.teacher)).json()
    const item = body.docs.find((entry: { id: number; kind: string }) => entry.kind === 'portfolio' && entry.id === work.id)
    expect(item).toMatchObject({ verificationStatus: 'revision-requested', review: { decision: 'revision-requested', feedback: 'Perlu revisi kecil' } })
  })
  it('karya yang sudah terbit tidak lagi ada di antrean', async () => {
    const work = await newWork()
    await decide(work, w.teacher, 'verified')
    expect(ids(await (await list(w.teacher)).json())).not.toContain(work.id)
  })
  it('guru lain tidak melihat karya di luar tanggung jawabnya', async () => {
    const work = await newWork(w.studentA)
    expect(ids(await (await list(w.outsiderTeacher)).json())).not.toContain(work.id)
  })
  it('siswa dan pengunjung tidak boleh mengakses antrean (403)', async () => {
    expect((await list(w.studentA)).status).toBe(403)
    expect((await list(undefined)).status).toBe(403)
  })
})
