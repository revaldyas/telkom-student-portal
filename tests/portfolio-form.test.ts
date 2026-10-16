import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { as, begin, createPublishedWork, createWorld, rollback, type World } from './world'

let w: World
beforeAll(async () => { await begin(); w = await createWorld() })
afterAll(rollback)

let counter = 0
/** Judul unik per kasus, karena slug karya harus unik. */
const title = (label = 'Karya') => `${label} uji ${w.suffix} ${++counter}`
const valid = (extra: Record<string, unknown> = {}) => ({ title: title(), summary: 'Ringkasan karya', categoryRef: w.category.id, year: 2026, ...extra })
const create = (data: Record<string, unknown>, user = w.studentA) => w.payload.create({ collection: 'portfolios', data: data as never, ...as(user) })

describe('Form karya: membuat karya', () => {
  it('menyimpan karya sebagai draf milik siswa yang login', async () => {
    const doc = await create(valid({ tools: ['Figma', 'React'], projectUrl: 'https://contoh.id/karya' }))
    expect(doc).toMatchObject({ status: 'draft', year: 2026, tools: ['Figma', 'React'], projectUrl: 'https://contoh.id/karya' })
    expect(typeof doc.student === 'object' ? doc.student.id : doc.student).toBe(w.studentA.id)
  })
  it('membuat slug dari judul (tanpa aksen dan simbol)', async () => {
    const doc = await create(valid({ title: `Aplikasi Jelajah Kota! ${w.suffix}-${++counter}` }))
    expect(doc.slug).toMatch(/^aplikasi-jelajah-kota-/)
    expect(doc.slug).toMatch(/^[a-z0-9-]+$/)
  })
  it('mengisi kategori lama dari kode kategori', async () => {
    const doc = await create(valid())
    expect(doc.category).toBe(w.category.code)
  })

  describe('kategori (bug "Isian berikut tidak valid: Kategori")', () => {
    it('menerima ID kategori berupa angka', async () => {
      await expect(create(valid({ categoryRef: w.category.id }))).resolves.toBeTruthy()
    })
    it('menolak ID kategori berupa string', async () => {
      await expect(create(valid({ categoryRef: String(w.category.id) }))).rejects.toThrow(/Kategori/)
    })
    it('draf boleh tanpa kategori, tetapi karya yang diajukan wajib punya kategori', async () => {
      await expect(create(valid({ categoryRef: null }))).resolves.toBeTruthy()
      await expect(create(valid({ categoryRef: null, submitForReview: true }))).rejects.toThrow(/Kategori/)
    })
    it('menolak kategori yang tidak ada', async () => {
      await expect(create(valid({ categoryRef: 99999999 }))).rejects.toThrow()
    })
  })

  describe('validasi isian', () => {
    it('judul wajib', async () => { await expect(create(valid({ title: '' }))).rejects.toThrow(/Judul/) })
    it('draf boleh tanpa ringkasan, tetapi karya yang diajukan wajib punya ringkasan', async () => {
      await expect(create(valid({ summary: '' }))).resolves.toBeTruthy()
      await expect(create(valid({ summary: '   ', submitForReview: true }))).rejects.toThrow(/Ringkasan/)
    })
    it('judul yang menghasilkan slug sama ditolak', async () => {
      const shared = title('Duplikat')
      await create(valid({ title: shared }))
      await expect(create(valid({ title: shared.toUpperCase() }))).rejects.toThrow(/Slug/)
    })
    it.each([
      ['https://contoh.id/karya', true],
      ['http://contoh.id', true],
      ['', true],
      ['ftp://contoh.id/berkas', false],
      ['javascript:alert(1)', false],
      ['bukan tautan', false],
    ])('tautan karya %j → valid=%s', async (url, ok) => {
      const promise = create(valid({ projectUrl: url }))
      if (ok) await expect(promise).resolves.toBeTruthy()
      else await expect(promise).rejects.toThrow(/[Tt]autan/)
    })
  })

  describe('batasan hak siswa', () => {
    it('siswa tidak bisa menerbitkan karyanya sendiri', async () => {
      const doc = await create(valid({ status: 'published' }))
      expect(doc.status).toBe('draft')
    })
    it('siswa tidak bisa menandai karya sebagai terverifikasi atau unggulan', async () => {
      const doc = await create(valid({ verificationStatus: 'verified', featured: true, verifiedBy: w.teacher.id }))
      expect(doc.verificationStatus).not.toBe('verified')
      expect(doc.featured).toBeFalsy()
      expect(doc.verifiedBy ?? null).toBeNull()
    })
    it('siswa tidak bisa membuat karya atas nama siswa lain', async () => {
      const doc = await create(valid({ student: w.studentB.id }))
      expect(typeof doc.student === 'object' ? doc.student.id : doc.student).toBe(w.studentA.id)
    })
    it('guru tidak bisa membuat karya', async () => {
      await expect(create(valid(), w.teacher)).rejects.toThrow()
    })
    it('pengunjung tanpa login tidak bisa membuat karya', async () => {
      await expect(w.payload.create({ collection: 'portfolios', data: valid() as never, overrideAccess: false })).rejects.toThrow()
    })
  })
})

describe('Form karya: draf dan pengajuan', () => {
  const stateOf = (doc: { id: number }) => w.payload.findByID({ collection: 'portfolios', id: doc.id, depth: 0, overrideAccess: true }) as unknown as Promise<Record<string, any>>

  it('karya baru tersimpan sebagai draf pribadi: belum diajukan', async () => {
    const doc = await create(valid())
    expect(doc).toMatchObject({ status: 'draft', verificationStatus: 'unreviewed' })
  })
  it('draf hanya perlu judul', async () => {
    const doc = await create({ title: title('Hanya judul') })
    expect(doc).toMatchObject({ status: 'draft', verificationStatus: 'unreviewed' })
    expect(doc.summary ?? null).toBeNull()
    expect(doc.categoryRef ?? null).toBeNull()
  })
  it('judul tetap wajib walau hanya draf', async () => {
    await expect(create({ title: '', summary: 'x' })).rejects.toThrow(/Judul/)
  })
  it('draf dilanjutkan lalu diajukan: status menjadi menunggu verifikasi', async () => {
    const draft = await create({ title: title('Lanjut') })
    await w.payload.update({ collection: 'portfolios', id: draft.id, data: { summary: 'Sudah lengkap', categoryRef: w.category.id }, ...as(w.studentA) })
    expect((await stateOf(draft)).verificationStatus).toBe('unreviewed')
    await w.payload.update({ collection: 'portfolios', id: draft.id, data: { submitForReview: true } as never, ...as(w.studentA) })
    expect(await stateOf(draft)).toMatchObject({ status: 'draft', verificationStatus: 'submitted' })
  })
  it('mengajukan draf yang belum lengkap ditolak dan statusnya tetap draf', async () => {
    const draft = await create({ title: title('Belum lengkap') })
    await expect(w.payload.update({ collection: 'portfolios', id: draft.id, data: { submitForReview: true } as never, ...as(w.studentA) })).rejects.toThrow(/Ringkasan/)
    expect((await stateOf(draft)).verificationStatus).toBe('unreviewed')
  })
  it('membuat dan langsung mengajukan dalam satu langkah', async () => {
    const doc = await create(valid({ submitForReview: true }))
    expect(doc).toMatchObject({ status: 'draft', verificationStatus: 'submitted' })
  })
  it('flag submitForReview bukan kolom: tidak tersimpan dan tidak ikut terbaca', async () => {
    const doc = await create(valid({ submitForReview: true }))
    expect((await stateOf(doc)).submitForReview).toBeUndefined()
  })
  it('menyimpan perubahan pada karya yang menunggu verifikasi tidak mengubah statusnya', async () => {
    const doc = await create(valid({ submitForReview: true }))
    await w.payload.update({ collection: 'portfolios', id: doc.id, data: { summary: 'Direvisi sedikit' }, ...as(w.studentA) })
    expect((await stateOf(doc)).verificationStatus).toBe('submitted')
  })
  it('siswa tidak bisa memalsukan status verifikasi lewat data biasa', async () => {
    const doc = await create(valid())
    await w.payload.update({ collection: 'portfolios', id: doc.id, data: { verificationStatus: 'verified', status: 'published' } as never, ...as(w.studentA) })
    expect(await stateOf(doc)).toMatchObject({ status: 'draft', verificationStatus: 'unreviewed' })
  })
  it('karya terbit yang diedit lalu diajukan ulang: menunggu verifikasi dan tidak tampil publik', async () => {
    const published = await createPublishedWork(w, w.studentA, 'Ajukan ulang')
    await w.payload.update({ collection: 'portfolios', id: published.id, data: { summary: 'Versi baru', submitForReview: true } as never, ...as(w.studentA) })
    expect(await stateOf(published)).toMatchObject({ status: 'draft', verificationStatus: 'submitted' })
  })
  it('draf tidak terlihat guru melalui akses koleksi, dan tidak bisa ditinjau sebelum diajukan', async () => {
    const draft = await create(valid())
    await expect(w.payload.create({ collection: 'portfolio-reviews', ...as(w.teacher), data: { portfolio: draft.id, decision: 'verified', feedback: 'Disetujui' } as never })).rejects.toThrow(/belum diajukan/)
  })
})

describe('Form karya: mengedit karya', () => {
  it('pemilik dapat mengubah judul, ringkasan, kategori, dan tautan', async () => {
    const doc = await create(valid())
    const updated = await w.payload.update({ collection: 'portfolios', id: doc.id, data: { summary: 'Ringkasan baru', projectUrl: 'https://baru.id' }, ...as(w.studentA) })
    expect(updated).toMatchObject({ summary: 'Ringkasan baru', projectUrl: 'https://baru.id' })
  })
  it('edit tetap menolak kategori berupa string', async () => {
    const doc = await create(valid())
    await expect(w.payload.update({ collection: 'portfolios', id: doc.id, data: { categoryRef: String(w.category.id) } as never, ...as(w.studentA) })).rejects.toThrow(/Kategori/)
  })
  it('siswa lain tidak bisa mengedit karya ini', async () => {
    const doc = await create(valid())
    await expect(w.payload.update({ collection: 'portfolios', id: doc.id, data: { summary: 'Diubah orang lain' }, ...as(w.studentB) })).rejects.toThrow()
  })
  it('mengedit karya yang sudah terbit mengembalikannya ke draf dan menghapus status verifikasi', async () => {
    const published = await createPublishedWork(w, w.studentA, 'Terbit')
    const updated = await w.payload.update({ collection: 'portfolios', id: published.id, data: { summary: 'Direvisi' }, ...as(w.studentA) })
    expect(updated).toMatchObject({ status: 'draft', verificationStatus: 'unreviewed' })
    expect(updated.verifiedBy ?? null).toBeNull()
  })
  it('pemilik dapat menghapus karyanya, siswa lain tidak', async () => {
    const doc = await create(valid())
    await expect(w.payload.delete({ collection: 'portfolios', id: doc.id, ...as(w.studentB) })).rejects.toThrow()
    await expect(w.payload.delete({ collection: 'portfolios', id: doc.id, ...as(w.studentA) })).resolves.toBeTruthy()
  })
})

describe('Visibilitas karya', () => {
  it('draf hanya terlihat oleh pemiliknya', async () => {
    const doc = await create(valid())
    const ownerView = await w.payload.find({ collection: 'portfolios', where: { id: { equals: doc.id } }, ...as(w.studentA) })
    const otherView = await w.payload.find({ collection: 'portfolios', where: { id: { equals: doc.id } }, ...as(w.studentB) })
    const guestView = await w.payload.find({ collection: 'portfolios', where: { id: { equals: doc.id } }, overrideAccess: false })
    expect(ownerView.totalDocs).toBe(1)
    expect(otherView.totalDocs).toBe(0)
    expect(guestView.totalDocs).toBe(0)
  })
  it('karya terbit terlihat oleh pengunjung', async () => {
    const doc = await createPublishedWork(w, w.studentA)
    const guestView = await w.payload.find({ collection: 'portfolios', where: { id: { equals: doc.id } }, overrideAccess: false })
    expect(guestView.totalDocs).toBe(1)
  })
})
