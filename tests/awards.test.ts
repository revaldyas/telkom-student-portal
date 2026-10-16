import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GET as getResults } from '../app/(payload)/api/awards/[id]/results/route'
import { as, begin, createPublishedWork, createWorld, makeRequest, params, rollback, type World } from './world'

let w: World
beforeAll(async () => { await begin(); w = await createWorld() })
afterAll(rollback)

type Doc = { id: number; [key: string]: unknown }
let counter = 0
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString()
const idOf = (value: unknown) => (value && typeof value === 'object' ? (value as { id: number }).id : value)

/** Karya terbit milik siswa B dan C sebagai nominasi (siswa A adalah pemilih). */
async function nominees() {
  return [await createPublishedWork(w, w.studentB, `Nominasi ${++counter}`), await createPublishedWork(w, w.studentC, `Nominasi ${++counter}`)]
}
async function newAward(extra: Record<string, unknown> = {}, works?: Doc[]) {
  const list = works ?? await nominees()
  const award = (await w.payload.create({
    collection: 'awards', depth: 0, ...as(w.admin),
    data: { title: `Award uji ${w.suffix} ${++counter}`, description: 'Deskripsi', opensAt: day(-1), closesAt: day(1), status: 'open', nominees: list.map((work) => work.id), ...extra } as never,
  })) as unknown as Doc
  return { award, works: list }
}
/** `user = null` berarti pengunjung tanpa login (undefined akan memicu nilai bawaan siswa A). */
const vote = (award: Doc, work: Doc, user: Doc | null = w.studentA) =>
  w.payload.create({ collection: 'award-votes', data: { award: award.id, portfolio: work.id } as never, depth: 0, ...(user ? as(user) : { overrideAccess: false }) })

describe('Penghargaan (award): pengaturan oleh admin', () => {
  it('admin dapat membuat award dengan nominasi', async () => {
    const { award, works } = await newAward()
    expect(award.status).toBe('open')
    expect((award.nominees as unknown[]).map(idOf)).toEqual(works.map((work) => work.id))
  })
  it('award baru berstatus draf secara bawaan', async () => {
    const { award } = await newAward({ status: undefined })
    expect(award.status).toBe('draft')
  })
  it('waktu penutupan harus setelah waktu pembukaan', async () => {
    await expect(newAward({ opensAt: day(2), closesAt: day(1) })).rejects.toThrow(/Voting Ditutup/)
    await expect(newAward({ opensAt: day(1), closesAt: day(1) })).rejects.toThrow(/Voting Ditutup/)
  })
  it.each([['title', ''], ['description', ''], ['opensAt', null], ['closesAt', null], ['nominees', []]])('%s wajib diisi', async (field, value) => {
    await expect(newAward({ [field]: value })).rejects.toThrow()
  })
  it('karya yang belum terbit tidak bisa dijadikan nominasi', async () => {
    const draft = (await w.payload.create({ collection: 'portfolios', depth: 0, overrideAccess: true, data: { title: `Draf nominasi ${w.suffix}`, summary: 'x', categoryRef: w.category.id, student: w.studentB.id } as never })) as unknown as Doc
    await expect(newAward({}, [draft])).rejects.toThrow()
  })
  it('hanya admin yang dapat membuat atau mengubah award', async () => {
    const { award, works } = await newAward()
    const data = { title: 'x', description: 'x', opensAt: day(-1), closesAt: day(1), nominees: works.map((work) => work.id) } as never
    await expect(w.payload.create({ collection: 'awards', data, ...as(w.teacher) })).rejects.toThrow()
    await expect(w.payload.create({ collection: 'awards', data, ...as(w.studentA) })).rejects.toThrow()
    await expect(w.payload.update({ collection: 'awards', id: award.id, data: { status: 'closed' }, ...as(w.teacher) })).rejects.toThrow()
  })
  it('award draf tidak terlihat siswa; award terbuka terlihat', async () => {
    const { award: draft } = await newAward({ status: 'draft' })
    const { award: open } = await newAward()
    const result = await w.payload.find({ collection: 'awards', where: { id: { in: [draft.id, open.id] } }, depth: 0, ...as(w.studentA) })
    expect(result.docs.map((doc) => doc.id)).toEqual([open.id])
  })
})

describe('Alur voting', () => {
  it('siswa dapat memilih salah satu nominasi; suara tercatat atas namanya', async () => {
    const { award, works } = await newAward()
    const doc = await vote(award, works[0])
    expect(idOf(doc.voter)).toBe(w.studentA.id)
    expect(idOf(doc.portfolio)).toBe(works[0].id)
    expect(doc.voteKey).toBe(`${award.id}:${w.studentA.id}`)
  })
  it('satu siswa hanya punya satu suara per award', async () => {
    const { award, works } = await newAward()
    await vote(award, works[0])
    await expect(vote(award, works[1])).rejects.toThrow(/Kunci Suara/)
  })
  it('siswa boleh memberi suara di award yang berbeda', async () => {
    const works = await nominees()
    const { award: first } = await newAward({}, works)
    const { award: second } = await newAward({}, works)
    await vote(first, works[0])
    await expect(vote(second, works[0])).resolves.toBeTruthy()
  })
  it('siswa dapat mengubah pilihannya selama voting dibuka', async () => {
    const { award, works } = await newAward()
    const doc = await vote(award, works[0])
    const updated = await w.payload.update({ collection: 'award-votes', id: doc.id, data: { portfolio: works[1].id } as never, depth: 0, ...as(w.studentA) })
    expect(idOf(updated.portfolio)).toBe(works[1].id)
  })
  it('mengubah pilihan ke karya sendiri tetap ditolak', async () => {
    const works = await nominees()
    const own = await createPublishedWork(w, w.studentA, `Karya A ${++counter}`)
    const { award } = await newAward({}, [works[0], own])
    const doc = await vote(award, works[0])
    await expect(w.payload.update({ collection: 'award-votes', id: doc.id, data: { portfolio: own.id } as never, ...as(w.studentA) })).rejects.toThrow(/karya sendiri/)
  })
  it('tidak bisa memilih karya sendiri', async () => {
    const own = await createPublishedWork(w, w.studentA, `Karya A ${++counter}`)
    const [other] = await nominees()
    const { award } = await newAward({}, [own, other])
    await expect(vote(award, own)).rejects.toThrow(/karya sendiri/)
  })
  it('tidak bisa memilih karya yang bukan nominasi award itu', async () => {
    const { award } = await newAward()
    const outsider = await createPublishedWork(w, w.studentB, `Bukan nominasi ${++counter}`)
    await expect(vote(award, outsider)).rejects.toThrow(/bukan nominasi/)
  })
  it.each([
    ['masih draf', { status: 'draft' }],
    ['sudah ditutup', { status: 'closed' }],
    ['hasil sudah diumumkan', { status: 'announced' }],
    ['belum dibuka (opensAt di masa depan)', { opensAt: day(1), closesAt: day(3) }],
    ['sudah lewat (closesAt di masa lalu)', { opensAt: day(-3), closesAt: day(-1) }],
  ])('voting ditolak bila award %s', async (_label, extra) => {
    const { award, works } = await newAward(extra)
    await expect(vote(award, works[0])).rejects.toThrow(/tidak dibuka/)
  })
  it('perubahan pilihan ditolak setelah voting ditutup', async () => {
    const { award, works } = await newAward()
    const doc = await vote(award, works[0])
    await w.payload.update({ collection: 'awards', id: award.id, data: { status: 'closed' }, ...as(w.admin) })
    await expect(w.payload.update({ collection: 'award-votes', id: doc.id, data: { portfolio: works[1].id } as never, ...as(w.studentA) })).rejects.toThrow(/tidak dibuka/)
  })
  it('siswa tidak bisa mengubah suara siswa lain', async () => {
    const { award, works } = await newAward()
    const doc = await vote(award, works[0], w.studentA)
    await expect(w.payload.update({ collection: 'award-votes', id: doc.id, data: { portfolio: works[1].id } as never, ...as(w.studentB) })).rejects.toThrow()
  })
  it('suara tidak bisa dihapus', async () => {
    const { award, works } = await newAward()
    const doc = await vote(award, works[0])
    await expect(w.payload.delete({ collection: 'award-votes', id: doc.id, ...as(w.studentA) })).rejects.toThrow()
    await expect(w.payload.delete({ collection: 'award-votes', id: doc.id, ...as(w.admin) })).rejects.toThrow()
  })
  it('siswa tidak bisa memalsukan identitas pemilih', async () => {
    const { award, works } = await newAward()
    const doc = await w.payload.create({ collection: 'award-votes', data: { award: award.id, portfolio: works[0].id, voter: w.studentC.id, voteKey: 'palsu' } as never, depth: 0, ...as(w.studentA) })
    expect(idOf(doc.voter)).toBe(w.studentA.id)
    expect(doc.voteKey).toBe(`${award.id}:${w.studentA.id}`)
  })
  it('guru dan pengunjung tidak bisa memilih', async () => {
    const { award, works } = await newAward()
    await expect(vote(award, works[0], w.teacher)).rejects.toThrow()
    await expect(vote(award, works[0], null)).rejects.toThrow()
  })
  it('siswa hanya melihat suaranya sendiri; admin melihat semua', async () => {
    const { award, works } = await newAward()
    await vote(award, works[0], w.studentA)
    await vote(award, works[0], w.studentC)
    const asStudent = await w.payload.find({ collection: 'award-votes', where: { award: { equals: award.id } }, depth: 0, ...as(w.studentA) })
    const asAdmin = await w.payload.find({ collection: 'award-votes', where: { award: { equals: award.id } }, depth: 0, ...as(w.admin) })
    expect(asStudent.totalDocs).toBe(1)
    expect(asAdmin.totalDocs).toBe(2)
  })
})

describe('Hasil award (GET /api/awards/[id]/results)', () => {
  const results = (award: Doc) => getResults(makeRequest(`/api/awards/${award.id}/results`), params({ id: String(award.id) }))

  it('hasil disembunyikan selama voting belum diumumkan (403)', async () => {
    for (const status of ['draft', 'open', 'closed']) {
      const { award } = await newAward({ status })
      expect((await results(award)).status).toBe(403)
    }
  })
  it('setelah diumumkan, hasil memuat jumlah suara tiap nominasi', async () => {
    const { award, works } = await newAward()
    await vote(award, works[0], w.studentA)
    await vote(award, works[0], w.studentC)
    await vote(award, works[1], w.studentB)
    await w.payload.update({ collection: 'awards', id: award.id, data: { status: 'announced' }, ...as(w.admin) })
    const response = await results(award)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.award).toBe(award.title)
    const votesByWork = Object.fromEntries(body.results.map((item: { portfolio: { id: number }; votes: number }) => [item.portfolio.id, item.votes]))
    expect(votesByWork[works[0].id]).toBe(2)
    expect(votesByWork[works[1].id]).toBe(1)
    expect(body.results).toHaveLength(2)
    expect(body.results[0].portfolio).toMatchObject({ id: expect.any(Number), title: expect.any(String), student: { id: expect.any(Number), name: expect.any(String) } })
  })
  it('nominasi tanpa suara bernilai nol, dan suara award lain tidak ikut terhitung', async () => {
    const works = await nominees()
    const { award } = await newAward({}, works)
    const { award: other } = await newAward({}, works)
    await vote(other, works[0])
    await w.payload.update({ collection: 'awards', id: award.id, data: { status: 'announced' }, ...as(w.admin) })
    const body = await (await results(award)).json()
    expect(body.results.map((item: { votes: number }) => item.votes)).toEqual([0, 0])
  })
})
