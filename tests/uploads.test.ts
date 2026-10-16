import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { as, begin, createWorld, rollback, type World } from './world'

let w: World
let dir: string
let originalStaticDir: string | undefined
type UploadConfig = { upload: { staticDir?: string } }
const uploadConfig = () => (w.payload.collections['uploads'].config as unknown as UploadConfig).upload

beforeAll(async () => {
  await begin()
  w = await createWorld()
  // File hasil upload ditulis ke folder sementara, bukan public/media atau Vercel Blob.
  dir = await mkdtemp(path.join(tmpdir(), 'uploads-test-'))
  originalStaticDir = uploadConfig().staticDir
  uploadConfig().staticDir = dir
})
afterAll(async () => {
  uploadConfig().staticDir = originalStaticDir
  await rm(dir, { recursive: true, force: true })
  await rollback()
})

type Doc = { id: number; [key: string]: unknown }
const image = (width: number, height: number, format: 'png' | 'jpeg' | 'webp' = 'png') =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } } })[format]().toBuffer()
const mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }

async function upload(buffer: Buffer, { name = 'foto.png', type = 'image/png', alt, user = w.studentA }: { name?: string; type?: string; alt?: string; user?: Doc } = {}) {
  return (await w.payload.create({
    collection: 'uploads', depth: 0, ...as(user),
    data: alt === undefined ? {} : { alt },
    file: { data: buffer, mimetype: type, name, size: buffer.length },
  } as never)) as unknown as Doc & { filename: string; mimeType: string; width: number; height: number; filesize: number }
}
/** Meniru tombol "Apply changes" di editor gambar admin: crop dikirim lewat query `uploadEdits`. */
const crop = (doc: Doc, uploadEdits: Record<string, unknown>) => w.payload.update({
  collection: 'uploads', id: doc.id, data: {}, depth: 0, ...as(w.admin),
  req: { query: { uploadEdits } } as never,
}) as unknown as Promise<Doc & { filename: string; width: number; height: number; filesize: number }>
const stored = async (doc: { filename: string }) => sharp(await readFile(path.join(dir, doc.filename))).metadata()

describe('Upload gambar', () => {
  it('menyimpan gambar sebagai WebP dan membaca ukurannya', async () => {
    const doc = await upload(await image(1200, 800))
    expect(doc).toMatchObject({ mimeType: 'image/webp', width: 1200, height: 800 })
    expect(doc.filename).toMatch(/\.webp$/)
    expect(await readdir(dir)).toContain(doc.filename)
    expect(await stored(doc)).toMatchObject({ format: 'webp', width: 1200, height: 800 })
  })
  it.each(['png', 'jpeg', 'webp'] as const)('menerima format %s', async (format) => {
    const doc = await upload(await image(400, 300, format), { name: `foto.${format}`, type: mime[format] })
    expect(doc.mimeType).toBe('image/webp')
  })
  it('gambar besar diperkecil maksimal 2400px tanpa mengubah rasio', async () => {
    const doc = await upload(await image(4800, 3200), { name: 'besar.png' })
    expect(doc.width).toBe(2400)
    expect(doc.height).toBe(1600)
  })
  it('gambar kecil tidak diperbesar', async () => {
    const doc = await upload(await image(100, 60))
    expect(doc).toMatchObject({ width: 100, height: 60 })
  })
  it('teks alternatif dibuat otomatis bila kosong, dan dipertahankan bila diisi', async () => {
    const auto = await upload(await image(50, 50))
    expect(auto.alt).toMatch(/^telkom-student-[0-9a-f]{8}$/)
    const blank = await upload(await image(50, 50), { alt: '   ' })
    expect(blank.alt).toMatch(/^telkom-student-/)
    const given = await upload(await image(50, 50), { alt: 'Sampul proyek jaringan' })
    expect(given.alt).toBe('Sampul proyek jaringan')
  })
  it('menolak tipe berkas yang tidak diizinkan', async () => {
    await expect(upload(Buffer.from('<?php echo 1;'), { name: 'x.php', type: 'application/x-php' })).rejects.toThrow()
    await expect(upload(Buffer.from('halo'), { name: 'x.txt', type: 'text/plain' })).rejects.toThrow()
  })
  it('pengunjung tanpa login tidak bisa mengunggah', async () => {
    const buffer = await image(50, 50)
    await expect(w.payload.create({ collection: 'uploads', overrideAccess: false, data: {}, file: { data: buffer, mimetype: 'image/png', name: 'x.png', size: buffer.length } } as never)).rejects.toThrow()
  })
  it('siswa tidak bisa mengubah atau menghapus berkas', async () => {
    const doc = await upload(await image(50, 50))
    await expect(w.payload.update({ collection: 'uploads', id: doc.id, data: { alt: 'diubah' }, ...as(w.studentA) })).rejects.toThrow()
    await expect(w.payload.delete({ collection: 'uploads', id: doc.id, ...as(w.studentA) })).rejects.toThrow()
  })
})

describe('Crop gambar (editor gambar admin → Apply changes)', () => {
  const edits = { crop: { x: 25, y: 25, width: 50, height: 50, unit: '%' }, widthInPixels: 600, heightInPixels: 400, focalPoint: { x: 50, y: 50 } }

  it('hasil crop tersimpan: ukuran di database dan di berkas ikut berubah', async () => {
    const doc = await upload(await image(1200, 800))
    const before = await readFile(path.join(dir, doc.filename))
    const cropped = await crop(doc, edits)
    expect(cropped).toMatchObject({ width: 600, height: 400 })
    const after = await readFile(path.join(dir, cropped.filename))
    expect(after.equals(before)).toBe(false)
    expect(await stored(cropped)).toMatchObject({ width: 600, height: 400 })
  })
  it('hasil crop terbaca kembali setelah dimuat ulang', async () => {
    const doc = await upload(await image(1200, 800))
    await crop(doc, edits)
    const reloaded = await w.payload.findByID({ collection: 'uploads', id: doc.id, depth: 0, overrideAccess: true })
    expect(reloaded).toMatchObject({ width: 600, height: 400 })
  })
  it('crop persegi mengambil bagian yang dipilih saja', async () => {
    // Kiri merah, kanan biru: crop separuh kiri harus menghasilkan gambar yang dominan merah.
    const left = await sharp({ create: { width: 500, height: 500, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer()
    const right = await sharp({ create: { width: 500, height: 500, channels: 3, background: { r: 0, g: 0, b: 255 } } }).png().toBuffer()
    const both = await sharp({ create: { width: 1000, height: 500, channels: 3, background: '#000' } }).composite([{ input: left, left: 0, top: 0 }, { input: right, left: 500, top: 0 }]).png().toBuffer()
    const doc = await upload(both)
    const cropped = await crop(doc, { crop: { x: 0, y: 0, width: 50, height: 100, unit: '%' }, widthInPixels: 500, heightInPixels: 500, focalPoint: { x: 50, y: 50 } })
    const { channels } = await sharp(await readFile(path.join(dir, cropped.filename))).stats()
    expect(channels[0].mean).toBeGreaterThan(200)
    expect(channels[2].mean).toBeLessThan(50)
  })
  it('hanya mengubah titik fokus tidak memotong gambar', async () => {
    const doc = await upload(await image(1200, 800))
    const result = await crop(doc, { focalPoint: { x: 20, y: 80 } })
    expect(result).toMatchObject({ width: 1200, height: 800 })
  })
  it('crop dengan ukuran sama dengan aslinya tidak mengubah dimensi', async () => {
    const doc = await upload(await image(1200, 800))
    const result = await crop(doc, { crop: { x: 0, y: 0, width: 100, height: 100, unit: '%' }, widthInPixels: 1200, heightInPixels: 800, focalPoint: { x: 50, y: 50 } })
    expect(result).toMatchObject({ width: 1200, height: 800 })
  })
  it('siswa tidak bisa melakukan crop pada berkas', async () => {
    const doc = await upload(await image(1200, 800))
    await expect(w.payload.update({ collection: 'uploads', id: doc.id, data: {}, ...as(w.studentA), req: { query: { uploadEdits: edits } } as never })).rejects.toThrow()
  })
})
