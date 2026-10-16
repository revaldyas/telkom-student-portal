import { getPayload, type Payload } from 'payload'
import { loadEnv } from 'payload/node'
import { expect } from 'vitest'
import { guardTransaction, txState } from './harness'

type Doc = { id: number; [key: string]: unknown }

let cached: Payload | undefined
export async function payloadInstance(): Promise<Payload> {
  if (cached) return cached
  loadEnv()
  const config = (await import('../payload.config')).default
  cached = await getPayload({ config })
  guardTransaction(cached)
  return cached
}

/** Mulai transaksi untuk satu test. Wajib dipasangkan dengan `rollback()`. */
export async function begin() {
  const payload = await payloadInstance()
  txState.id = (await payload.db.beginTransaction()) as string | number
}
export async function rollback() {
  const payload = await payloadInstance()
  const id = txState.id
  txState.releasing = true
  txState.id = undefined
  try { if (id !== undefined) await payload.db.rollbackTransaction(id) } finally { txState.releasing = false }
  await assertNothingPersisted(payload)
}

/** Pengaman: data uji (email @test.local, program 'Program …') tidak boleh ada di database setelah rollback. */
async function assertNothingPersisted(payload: Payload) {
  const pool = (payload.db as unknown as { pool: { query: (text: string) => Promise<{ rows: Array<{ n: string }> }> } }).pool
  const result = await pool.query(`select (select count(*) from users where email like '%@test.local') + (select count(*) from admins where email like '%@test.local') + (select count(*) from programs where name like 'Program %') as n`)
  expect(Number(result.rows[0].n), 'Data uji tersimpan permanen! Rollback gagal.').toBe(0)
}

const rand = () => Math.random().toString(36).slice(2, 10)

/** Opsi Local API yang meniru request dari user biasa (akses dicek, bukan di-override). */
export const as = (user: Doc | { collection: string; id: number }) => ({
  user: { ...user, collection: (user as { collection?: string }).collection ?? 'users' } as never,
  overrideAccess: false,
})

export type World = Awaited<ReturnType<typeof createWorld>>

/**
 * Data minimum untuk satu test: dua program, dua kelas, tiga siswa, dua guru (satu sekelas dengan siswa A,
 * satu dari program lain), satu admin, satu kategori. Semuanya hidup hanya di dalam transaksi.
 */
export async function createWorld() {
  const payload = await payloadInstance()
  const s = rand()
  const program = (await payload.create({ collection: 'programs', data: { name: `Program ${s}`, code: `P${s}` }, overrideAccess: true })) as unknown as Doc
  const otherProgram = (await payload.create({ collection: 'programs', data: { name: `Program lain ${s}`, code: `Q${s}` }, overrideAccess: true })) as unknown as Doc
  const classroom = (await payload.create({ collection: 'classes', data: { name: `Kelas ${s}`, program: program.id }, overrideAccess: true })) as unknown as Doc
  const otherClass = (await payload.create({ collection: 'classes', data: { name: `Kelas lain ${s}`, program: otherProgram.id }, overrideAccess: true })) as unknown as Doc

  const makeStudent = async (label: string, klass: Doc, programID: number): Promise<Doc> => {
    const nis = `T${s}${label}`
    await payload.create({ collection: 'students', data: { nis, name: `Siswa ${label}`, class: klass.id }, overrideAccess: true })
    return (await payload.create({
      collection: 'users',
      data: { name: `Siswa ${label}`, email: `siswa-${label}-${s}@test.local`, password: 'password-uji-123', role: 'student', nis, class: klass.id, program: programID },
      overrideAccess: true,
    })) as unknown as Doc
  }
  const makeTeacher = async (label: string, klass: Doc, programID: number): Promise<Doc> => (await payload.create({
    collection: 'users',
    data: { name: `Guru ${label}`, email: `guru-${label}-${s}@test.local`, password: 'password-uji-123', role: 'teacher', class: klass.id, program: programID },
    overrideAccess: true,
  })) as unknown as Doc

  const studentA = await makeStudent('A', classroom, program.id)
  const studentB = await makeStudent('B', classroom, program.id)
  const studentC = await makeStudent('C', otherClass, otherProgram.id)
  const teacher = await makeTeacher('A', classroom, program.id)
  const outsiderTeacher = await makeTeacher('B', otherClass, otherProgram.id)
  const admin = (await payload.create({ collection: 'admins', data: { name: `Admin ${s}`, email: `admin-${s}@test.local`, password: 'password-uji-123' }, overrideAccess: true })) as unknown as Doc
  const categories = await payload.find({ collection: 'portfolio-categories', where: { code: { equals: 'PPLG-WEB' } }, limit: 1, depth: 0, overrideAccess: true })
  const category = (categories.docs[0] ?? (await payload.find({ collection: 'portfolio-categories', limit: 1, depth: 0, overrideAccess: true })).docs[0]) as unknown as Doc
  expect(category, 'butuh minimal satu kategori portofolio di database').toBeTruthy()
  expect(typeof category.id).toBe('number')

  return {
    payload, suffix: s, program, otherProgram, classroom, otherClass, category,
    studentA, studentB, studentC, teacher, outsiderTeacher,
    admin: { ...admin, collection: 'admins' as const },
  }
}

/** Karya terbit milik `owner`, dibuat lewat jalur admin supaya langsung published. */
export async function createPublishedWork(world: World, owner: Doc, title = 'Karya terbit') {
  return (await world.payload.create({
    collection: 'portfolios', overrideAccess: true,
    data: { title: `${title} ${world.suffix}`, summary: 'Ringkasan', categoryRef: world.category.id, student: owner.id, status: 'published', verificationStatus: 'verified' } as never,
  })) as unknown as Doc
}

type RequestOptions = { method?: string; body?: unknown; user?: Doc; origin?: string | null }
/** Request bergaya browser ke handler route. `user` meniru sesi login (lihat tests/setup.ts). */
export function makeRequest(path: string, { method = 'GET', body, user, origin = 'http://localhost' }: RequestOptions = {}) {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (origin) headers.set('origin', origin)
  if (user) headers.set('x-test-user', String(user.id))
  return new Request(`http://localhost${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
}
export const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) })
