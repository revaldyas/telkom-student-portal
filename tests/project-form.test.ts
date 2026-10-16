import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { as, begin, createWorld, rollback, type World } from './world'

let w: World
beforeAll(async () => { await begin(); w = await createWorld() })
afterAll(rollback)

type Doc = { id: number; [key: string]: unknown }
const idOf = (value: unknown) => (value && typeof value === 'object' ? (value as { id: number }).id : value)
let counter = 0
const name = (label = 'Proyek') => `${label} uji ${w.suffix} ${++counter}`
const valid = (extra: Record<string, unknown> = {}) => ({
  title: name(), summary: 'Ringkasan proyek', categoryRef: w.category.id, year: 2026,
  members: [{ member: w.studentA.id, contribution: 'Inisiator' }], ...extra,
})
const create = (data: Record<string, unknown>, user: Doc = w.studentA) => w.payload.create({ collection: 'projects', data: data as never, depth: 0, ...as(user) })
const memberIDs = (doc: { members?: unknown }) => ((doc.members || []) as Array<{ member: unknown }>).map((item) => idOf(item.member))

describe('Form proyek: membuat proyek', () => {
  it('menyimpan proyek sebagai draf milik pembuatnya', async () => {
    const doc = await create(valid({ tools: ['Figma'], projectUrl: 'https://contoh.id/proyek' }))
    expect(doc).toMatchObject({ status: 'draft', verificationStatus: 'unreviewed', year: 2026, tools: ['Figma'] })
    expect(idOf(doc.createdBy)).toBe(w.studentA.id)
    expect(doc.slug).toMatch(/^proyek-uji-/)
  })

  describe('kategori (bug "Isian berikut tidak valid: Kategori")', () => {
    it('menerima ID kategori berupa angka', async () => { await expect(create(valid({ categoryRef: w.category.id }))).resolves.toBeTruthy() })
    it('menolak ID kategori berupa string', async () => { await expect(create(valid({ categoryRef: String(w.category.id) }))).rejects.toThrow(/Kategori/) })
    it('kategori boleh kosong', async () => { await expect(create(valid({ categoryRef: null }))).resolves.toBeTruthy() })
  })

  describe('validasi isian', () => {
    it('nama proyek wajib', async () => { await expect(create(valid({ title: '' }))).rejects.toThrow(/Nama Proyek/) })
    it('ringkasan wajib', async () => { await expect(create(valid({ summary: '' }))).rejects.toThrow(/Ringkasan/) })
    it('nama proyek maksimal 160 karakter', async () => { await expect(create(valid({ title: 'x'.repeat(161) }))).rejects.toThrow() })
    it('ringkasan maksimal 800 karakter', async () => { await expect(create(valid({ summary: 'x'.repeat(801) }))).rejects.toThrow() })
    it('nama yang menghasilkan slug sama ditolak', async () => {
      const shared = name('Kembar')
      await create(valid({ title: shared }))
      await expect(create(valid({ title: shared.toUpperCase() }))).rejects.toThrow(/Slug/)
    })
    it.each([
      ['https://contoh.id', true], ['', true], ['ftp://contoh.id', false], ['bukan tautan', false],
    ])('tautan proyek %j → valid=%s', async (url, ok) => {
      const promise = create(valid({ projectUrl: url }))
      if (ok) await expect(promise).resolves.toBeTruthy()
      else await expect(promise).rejects.toThrow(/[Tt]autan/)
    })
  })

  describe('anggota proyek', () => {
    it('pembuat otomatis ditambahkan sebagai anggota "Inisiator" bila lupa dimasukkan', async () => {
      const doc = await create(valid({ members: [{ member: w.studentB.id, contribution: 'Desainer' }] }))
      expect(memberIDs(doc)).toEqual(expect.arrayContaining([w.studentA.id, w.studentB.id]))
      const initiator = (doc.members as Array<{ member: unknown; contribution: string }>).find((item) => idOf(item.member) === w.studentA.id)
      expect(initiator?.contribution).toBe('Inisiator')
    })
    it('menerima beberapa anggota dengan kontribusi masing-masing', async () => {
      const doc = await create(valid({ members: [{ member: w.studentA.id, contribution: 'Developer' }, { member: w.studentB.id, contribution: 'Desainer' }] }))
      expect(memberIDs(doc)).toEqual([w.studentA.id, w.studentB.id])
    })
    it('menolak siswa yang sama dua kali', async () => {
      await expect(create(valid({ members: [{ member: w.studentA.id, contribution: 'A' }, { member: w.studentA.id, contribution: 'B' }] }))).rejects.toThrow(/lebih dari satu kali/)
    })
    it('menolak anggota yang bukan siswa', async () => {
      await expect(create(valid({ members: [{ member: w.studentA.id, contribution: 'A' }, { member: w.teacher.id, contribution: 'B' }] }))).rejects.toThrow(/siswa/)
    })
    it('kontribusi anggota wajib diisi', async () => {
      await expect(create(valid({ members: [{ member: w.studentA.id, contribution: '' }] }))).rejects.toThrow()
    })
  })

  describe('guru pembimbing', () => {
    it('mengundang guru: status awal "invited" dan guru pertama otomatis menjadi mentor utama', async () => {
      const doc = await create(valid({ mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'supporting' }] }))
      const [assignment] = doc.mentorAssignments as Array<Record<string, unknown>>
      expect(idOf(assignment.mentor)).toBe(w.teacher.id)
      expect(assignment).toMatchObject({ assignmentRole: 'primary', response: 'invited' })
    })
    it('siswa tidak bisa langsung menandai undangan sebagai "accepted"', async () => {
      const doc = await create(valid({ mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary', response: 'accepted' }] }))
      expect((doc.mentorAssignments as Array<{ response: string }>)[0].response).toBe('invited')
    })
    it('menolak akun siswa sebagai pembimbing', async () => {
      await expect(create(valid({ mentorAssignments: [{ mentor: w.studentB.id, assignmentRole: 'primary' }] }))).rejects.toThrow(/Guru/)
    })
    it('menolak guru yang sama diundang dua kali', async () => {
      await expect(create(valid({ mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary' }, { mentor: w.teacher.id, assignmentRole: 'supporting' }] }))).rejects.toThrow(/lebih dari satu kali/)
    })
    it('menolak dua mentor utama', async () => {
      await expect(create(valid({ mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary' }, { mentor: w.outsiderTeacher.id, assignmentRole: 'primary' }] }))).rejects.toThrow(/satu Guru/)
    })
    it('mentor utama dan pendamping bisa digabung', async () => {
      const doc = await create(valid({ mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary' }, { mentor: w.outsiderTeacher.id, assignmentRole: 'supporting' }] }))
      expect((doc.mentorAssignments as Array<{ assignmentRole: string }>).map((item) => item.assignmentRole)).toEqual(['primary', 'supporting'])
    })
  })

  describe('batasan hak', () => {
    it('siswa tidak bisa menerbitkan atau memverifikasi proyek sendiri', async () => {
      const doc = await create(valid({ status: 'published', verificationStatus: 'verified', verifiedBy: w.teacher.id }))
      expect(doc.status).toBe('draft')
      expect(doc.verificationStatus).not.toBe('verified')
    })
    it('siswa tidak bisa membuat proyek atas nama siswa lain', async () => {
      const doc = await create(valid({ createdBy: w.studentB.id }))
      expect(idOf(doc.createdBy)).toBe(w.studentA.id)
    })
    it('guru tidak bisa membuat proyek', async () => { await expect(create(valid(), w.teacher)).rejects.toThrow() })
    it('pengunjung tanpa login tidak bisa membuat proyek', async () => {
      await expect(w.payload.create({ collection: 'projects', data: valid() as never, overrideAccess: false })).rejects.toThrow()
    })
  })
})

describe('Form proyek: mengedit proyek', () => {
  it('pembuat dapat mengubah ringkasan dan anggota', async () => {
    const doc = await create(valid())
    const updated = await w.payload.update({ collection: 'projects', id: doc.id, depth: 0, ...as(w.studentA),
      data: { summary: 'Ringkasan baru', members: [{ member: w.studentA.id, contribution: 'Lead' }, { member: w.studentB.id, contribution: 'QA' }] } as never })
    expect(updated.summary).toBe('Ringkasan baru')
    expect(memberIDs(updated)).toEqual([w.studentA.id, w.studentB.id])
  })
  it('edit tetap menolak kategori berupa string', async () => {
    const doc = await create(valid())
    await expect(w.payload.update({ collection: 'projects', id: doc.id, data: { categoryRef: String(w.category.id) } as never, ...as(w.studentA) })).rejects.toThrow(/Kategori/)
  })
  it('anggota lain (bukan pembuat) tidak bisa mengedit proyek', async () => {
    const doc = await create(valid({ members: [{ member: w.studentA.id, contribution: 'A' }, { member: w.studentB.id, contribution: 'B' }] }))
    await expect(w.payload.update({ collection: 'projects', id: doc.id, data: { summary: 'Diubah' }, ...as(w.studentB) })).rejects.toThrow()
  })
  it('pembuat dapat menghapus proyek, siswa lain tidak', async () => {
    const doc = await create(valid())
    await expect(w.payload.delete({ collection: 'projects', id: doc.id, ...as(w.studentB) })).rejects.toThrow()
    await expect(w.payload.delete({ collection: 'projects', id: doc.id, ...as(w.studentA) })).resolves.toBeTruthy()
  })
  it('draf proyek tidak terlihat oleh siswa lain maupun pengunjung', async () => {
    const doc = await create(valid())
    const query = { collection: 'projects' as const, where: { id: { equals: doc.id } }, depth: 0 }
    expect((await w.payload.find({ ...query, ...as(w.studentA) })).totalDocs).toBe(1)
    expect((await w.payload.find({ ...query, ...as(w.studentB) })).totalDocs).toBe(0)
    expect((await w.payload.find({ ...query, overrideAccess: false })).totalDocs).toBe(0)
  })
})
