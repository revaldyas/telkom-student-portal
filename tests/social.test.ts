import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GET as listComments } from '../app/(payload)/api/community/portfolios/[id]/comments/route'
import { GET as getStats } from '../app/(payload)/api/community/portfolios/[id]/stats/route'
import { as, begin, createPublishedWork, createWorld, makeRequest, params, rollback, type World } from './world'

let w: World
beforeAll(async () => { await begin(); w = await createWorld() })
afterAll(rollback)

type Doc = { id: number; [key: string]: unknown }
let counter = 0
const idOf = (value: unknown) => (value && typeof value === 'object' ? (value as { id: number }).id : value)
const draftWork = async (owner: Doc = w.studentB) => (await w.payload.create({
  collection: 'portfolios', depth: 0, overrideAccess: true,
  data: { title: `Draf sosial ${w.suffix} ${++counter}`, summary: 'Ringkasan', categoryRef: w.category.id, student: owner.id } as never,
})) as unknown as Doc
const publishedWork = (owner: Doc = w.studentB) => createPublishedWork(w, owner, `Sosial ${++counter}`)

/** `user = null` berarti pengunjung tanpa login (undefined akan memicu nilai bawaan siswa A). */
const like = (work: Doc, user: Doc | null = w.studentA) =>
  w.payload.create({ collection: 'portfolio-likes', data: { portfolio: work.id } as never, depth: 0, ...(user ? as(user) : { overrideAccess: false }) })
const comment = (work: Doc, content: string, user: Doc | null = w.studentA) =>
  w.payload.create({ collection: 'portfolio-comments', data: { portfolio: work.id, content } as never, depth: 0, ...(user ? as(user) : { overrideAccess: false }) })

describe('Suka karya', () => {
  it('siswa dapat menyukai karya terbit milik siswa lain', async () => {
    const work = await publishedWork()
    const doc = await like(work)
    expect(idOf(doc.portfolio)).toBe(work.id)
    expect(idOf(doc.student)).toBe(w.studentA.id)
    expect(doc.likeKey).toBe(`${work.id}:${w.studentA.id}`)
  })
  it('tidak bisa menyukai karya sendiri', async () => {
    await expect(like(await publishedWork(w.studentA))).rejects.toThrow(/karya sendiri/)
  })
  it('tidak bisa menyukai karya yang belum terbit', async () => {
    await expect(like(await draftWork())).rejects.toThrow(/belum diterbitkan/)
  })
  it('tidak bisa menyukai dua kali', async () => {
    const work = await publishedWork()
    await like(work)
    await expect(like(work)).rejects.toThrow(/Kunci Suka/)
  })
  it('beberapa siswa boleh menyukai karya yang sama', async () => {
    const work = await publishedWork(w.studentC)
    await like(work, w.studentA)
    await expect(like(work, w.studentB)).resolves.toBeTruthy()
  })
  it('siswa tidak bisa memalsukan identitas penyuka', async () => {
    const work = await publishedWork()
    const doc = await w.payload.create({ collection: 'portfolio-likes', data: { portfolio: work.id, student: w.studentC.id, likeKey: 'palsu' } as never, depth: 0, ...as(w.studentA) })
    expect(idOf(doc.student)).toBe(w.studentA.id)
    expect(doc.likeKey).toBe(`${work.id}:${w.studentA.id}`)
  })
  it('guru dapat menyukai karya siswa, pengunjung tidak', async () => {
    const work = await publishedWork()
    await expect(like(work, w.teacher)).resolves.toBeTruthy()
    await expect(like(work, null)).rejects.toThrow()
  })
  it('siswa dapat membatalkan sukanya, lalu menyukai lagi', async () => {
    const work = await publishedWork()
    const doc = await like(work)
    await expect(w.payload.delete({ collection: 'portfolio-likes', id: doc.id, ...as(w.studentA) })).resolves.toBeTruthy()
    await expect(like(work)).resolves.toBeTruthy()
  })
  it('siswa lain tidak bisa membatalkan suka orang lain', async () => {
    const doc = await like(await publishedWork())
    await expect(w.payload.delete({ collection: 'portfolio-likes', id: doc.id, ...as(w.studentC) })).rejects.toThrow()
  })
  it('suka tidak bisa diedit', async () => {
    const work = await publishedWork()
    const other = await publishedWork()
    const doc = await like(work)
    await expect(w.payload.update({ collection: 'portfolio-likes', id: doc.id, data: { portfolio: other.id } as never, ...as(w.studentA) })).rejects.toThrow()
  })
  it('siswa hanya dapat membaca suka miliknya sendiri', async () => {
    const work = await publishedWork(w.studentC)
    await like(work, w.studentA)
    await like(work, w.studentB)
    const result = await w.payload.find({ collection: 'portfolio-likes', where: { portfolio: { equals: work.id } }, depth: 0, ...as(w.studentA) })
    expect(result.docs.map((doc) => idOf(doc.student))).toEqual([w.studentA.id])
  })
})

describe('Komentar karya', () => {
  it('siswa dapat berkomentar pada karya terbit', async () => {
    const work = await publishedWork()
    const doc = await comment(work, 'Karya yang keren!')
    expect(doc.content).toBe('Karya yang keren!')
    expect(idOf(doc.student)).toBe(w.studentA.id)
  })
  it('siswa boleh berkomentar di karyanya sendiri (membalas komentar)', async () => {
    await expect(comment(await publishedWork(w.studentA), 'Terima kasih semua')).resolves.toBeTruthy()
  })
  it('boleh berkomentar berkali-kali pada karya yang sama', async () => {
    const work = await publishedWork()
    await comment(work, 'Komentar pertama')
    await expect(comment(work, 'Komentar kedua')).resolves.toBeTruthy()
  })
  it('tidak bisa berkomentar pada karya yang belum terbit', async () => {
    await expect(comment(await draftWork(), 'Halo draf')).rejects.toThrow(/belum diterbitkan/)
  })
  it.each([[''], [' '], ['a'], ['   a   '], ['x'.repeat(1201)]])('menolak komentar tidak valid %#', async (content) => {
    await expect(comment(await publishedWork(), content)).rejects.toThrow()
  })
  it('menerima komentar tepat 2 dan 1200 karakter', async () => {
    const work = await publishedWork()
    await expect(comment(work, 'ok')).resolves.toBeTruthy()
    await expect(comment(work, 'x'.repeat(1200))).resolves.toBeTruthy()
  })
  it('siswa tidak bisa memalsukan penulis komentar', async () => {
    const work = await publishedWork()
    const doc = await w.payload.create({ collection: 'portfolio-comments', data: { portfolio: work.id, content: 'Halo', student: w.studentC.id } as never, depth: 0, ...as(w.studentA) })
    expect(idOf(doc.student)).toBe(w.studentA.id)
  })
  it('guru dapat berkomentar, pengunjung tidak', async () => {
    const work = await publishedWork()
    await expect(comment(work, 'Halo dari guru', w.teacher)).resolves.toBeTruthy()
    await expect(comment(work, 'Halo tamu', null)).rejects.toThrow()
  })
  it('penulis dapat mengedit isi komentarnya; karya dan penulis tidak berubah', async () => {
    const work = await publishedWork()
    const doc = await comment(work, 'Versi awal')
    const updated = await w.payload.update({ collection: 'portfolio-comments', id: doc.id, data: { content: 'Versi baru' } as never, depth: 0, ...as(w.studentA) })
    expect(updated.content).toBe('Versi baru')
    expect(idOf(updated.portfolio)).toBe(work.id)
    expect(idOf(updated.student)).toBe(w.studentA.id)
  })
  it('hasil edit tetap divalidasi (minimal 2 karakter)', async () => {
    const doc = await comment(await publishedWork(), 'Versi awal')
    await expect(w.payload.update({ collection: 'portfolio-comments', id: doc.id, data: { content: 'x' } as never, ...as(w.studentA) })).rejects.toThrow()
  })
  it('siswa lain, termasuk pemilik karya, tidak bisa mengedit komentar orang lain', async () => {
    const work = await publishedWork(w.studentB)
    const doc = await comment(work, 'Komentar dari A')
    await expect(w.payload.update({ collection: 'portfolio-comments', id: doc.id, data: { content: 'Diubah' } as never, ...as(w.studentC) })).rejects.toThrow()
    await expect(w.payload.update({ collection: 'portfolio-comments', id: doc.id, data: { content: 'Diubah' } as never, ...as(w.studentB) })).rejects.toThrow()
  })
  it('penulis dapat menghapus komentarnya, siswa lain tidak', async () => {
    const doc = await comment(await publishedWork(), 'Akan dihapus')
    await expect(w.payload.delete({ collection: 'portfolio-comments', id: doc.id, ...as(w.studentC) })).rejects.toThrow()
    await expect(w.payload.delete({ collection: 'portfolio-comments', id: doc.id, ...as(w.studentA) })).resolves.toBeTruthy()
  })
  it('pemilik karya dapat menghapus komentar orang lain di karyanya', async () => {
    const work = await publishedWork(w.studentB)
    const doc = await comment(work, 'Komentar dari A')
    await expect(w.payload.delete({ collection: 'portfolio-comments', id: doc.id, ...as(w.studentB) })).resolves.toBeTruthy()
  })
  it('pemilik karya lain tidak bisa menghapus komentar di karya yang bukan miliknya', async () => {
    const work = await publishedWork(w.studentB)
    const doc = await comment(work, 'Komentar dari A')
    await expect(w.payload.delete({ collection: 'portfolio-comments', id: doc.id, ...as(w.studentC) })).rejects.toThrow()
  })
})

describe('Statistik dan daftar komentar (GET /api/community/portfolios/[id]/…)', () => {
  const stats = (work: Doc | string) => getStats(makeRequest('/'), params({ id: String(typeof work === 'object' ? work.id : work) }))
  const comments = (work: Doc | string) => listComments(makeRequest('/'), params({ id: String(typeof work === 'object' ? work.id : work) }))

  it('menghitung jumlah suka dan komentar', async () => {
    const work = await publishedWork(w.studentC)
    await like(work, w.studentA)
    await like(work, w.studentB)
    await comment(work, 'Komentar satu')
    const response = await stats(work)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ likes: 2, comments: 1 })
  })
  it('karya tanpa interaksi bernilai nol', async () => {
    expect(await (await stats(await publishedWork())).json()).toEqual({ likes: 0, comments: 0 })
  })
  it('suka yang dibatalkan tidak ikut terhitung', async () => {
    const work = await publishedWork()
    const doc = await like(work)
    await w.payload.delete({ collection: 'portfolio-likes', id: doc.id, ...as(w.studentA) })
    expect((await (await stats(work)).json()).likes).toBe(0)
  })
  it('daftar komentar berurutan dari yang terlama dan memuat nama penulis', async () => {
    const work = await publishedWork(w.studentC)
    await comment(work, 'Pertama', w.studentA)
    await comment(work, 'Kedua', w.studentB)
    const response = await comments(work)
    expect(response.status).toBe(200)
    const { docs } = await response.json()
    expect(docs.map((item: { content: string }) => item.content)).toEqual(['Pertama', 'Kedua'])
    expect(docs[0].student).toEqual({ id: w.studentA.id, name: w.studentA.name })
  })
  it('karya belum terbit atau tidak ada → 404 untuk statistik dan komentar', async () => {
    const draft = await draftWork()
    expect((await stats(draft)).status).toBe(404)
    expect((await comments(draft)).status).toBe(404)
    expect((await stats('99999999')).status).toBe(404)
    expect((await comments('bukan-id')).status).toBe(404)
  })
})
