import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { POST as register } from '../app/(payload)/api/register/route'
import { POST as login } from '../app/(payload)/api/auth/login/route'
import { as, begin, createWorld, makeRequest, rollback, type World } from './world'

let w: World
beforeAll(async () => { await begin(); w = await createWorld() })
afterAll(rollback)

let counter = 0
const uniq = () => `${w.suffix}${++counter}`

const newStudentRecord = async (nis: string) => w.payload.create({ collection: 'students', data: { nis, name: 'Siswa Baru', class: w.classroom.id }, overrideAccess: true })

describe('Register (POST /api/register)', () => {
  const body = (nis: string, extra: Record<string, unknown> = {}) => ({ name: 'Siswa Baru', nis, email: `baru-${uniq()}@test.local`, password: 'rahasia-123', ...extra })

  it('membuat akun siswa untuk NIS yang terdaftar', async () => {
    const nis = `N${uniq()}`
    await newStudentRecord(nis)
    const response = await register(makeRequest('/api/register', { method: 'POST', body: body(nis) }))
    expect(response.status).toBe(201)
    const users = await w.payload.find({ collection: 'users', where: { nis: { equals: nis } }, overrideAccess: true })
    expect(users.docs[0]).toMatchObject({ role: 'student', nis, name: 'Siswa Baru' })
  })
  it('selalu membuat akun siswa, tidak peduli role yang dikirim', async () => {
    const nis = `N${uniq()}`
    await newStudentRecord(nis)
    const response = await register(makeRequest('/api/register', { method: 'POST', body: body(nis, { role: 'teacher' }) }))
    expect(response.status).toBe(201)
    const users = await w.payload.find({ collection: 'users', where: { nis: { equals: nis } }, overrideAccess: true })
    expect(users.docs[0].role).toBe('student')
  })
  it('menolak NIS yang tidak ada di Data Siswa', async () => {
    const response = await register(makeRequest('/api/register', { method: 'POST', body: body(`TIDAK-ADA-${uniq()}`) }))
    expect(response.status).toBe(400)
    expect((await response.json()).message).toMatch(/NIS/)
  })
  it('menolak NIS yang sudah dipakai akun lain', async () => {
    const response = await register(makeRequest('/api/register', { method: 'POST', body: body(String(w.studentA.nis)) }))
    expect(response.status).toBe(400)
  })
  it('menolak email yang sudah terdaftar', async () => {
    const nis = `N${uniq()}`
    await newStudentRecord(nis)
    const response = await register(makeRequest('/api/register', { method: 'POST', body: body(nis, { email: String(w.studentA.email) }) }))
    expect(response.status).toBe(400)
  })
  it('menolak kata sandi kurang dari 8 karakter', async () => {
    const response = await register(makeRequest('/api/register', { method: 'POST', body: body(String(w.studentA.nis), { password: 'pendek' }) }))
    expect(response.status).toBe(400)
    expect((await response.json()).message).toMatch(/8 karakter/)
  })
  it.each(['name', 'nis', 'email', 'password'])('menolak jika %s kosong', async (field) => {
    const response = await register(makeRequest('/api/register', { method: 'POST', body: body('X', { [field]: '' }) }))
    expect(response.status).toBe(400)
    expect((await response.json()).message).toMatch(/wajib/)
  })
  it('menolak request dari origin lain', async () => {
    const response = await register(makeRequest('/api/register', { method: 'POST', body: body('X'), origin: 'https://situs-lain.example' }))
    expect(response.status).toBe(403)
  })
  it('menolak request tanpa header origin', async () => {
    const response = await register(makeRequest('/api/register', { method: 'POST', body: body('X'), origin: null }))
    expect(response.status).toBe(403)
  })
})

describe('Login (POST /api/auth/login)', () => {
  const credentials = (email: string, password = 'password-uji-123') => ({ email, password })

  it('berhasil dan mengatur cookie sesi httpOnly', async () => {
    const response = await login(makeRequest('/api/auth/login', { method: 'POST', body: credentials(String(w.studentA.email)) }))
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.user).toMatchObject({ id: w.studentA.id, role: 'student' })
    const cookie = response.headers.get('set-cookie') || ''
    expect(cookie).toMatch(/karyakita-session=.+/)
    expect(cookie.toLowerCase()).toContain('httponly')
    expect(cookie.toLowerCase()).toContain('samesite=lax')
  })
  it('email tidak peka huruf besar dan spasi', async () => {
    const response = await login(makeRequest('/api/auth/login', { method: 'POST', body: credentials(`  ${String(w.studentA.email).toUpperCase()} `) }))
    expect(response.status).toBe(200)
  })
  it('akun guru juga bisa masuk dan membawa role teacher', async () => {
    const response = await login(makeRequest('/api/auth/login', { method: 'POST', body: credentials(String(w.teacher.email)) }))
    expect(response.status).toBe(200)
    expect((await response.json()).user.role).toBe('teacher')
  })
  it('menolak kata sandi salah tanpa cookie', async () => {
    const response = await login(makeRequest('/api/auth/login', { method: 'POST', body: credentials(String(w.studentA.email), 'salah-total') }))
    expect(response.status).toBe(401)
    expect(response.headers.get('set-cookie')).toBeNull()
  })
  it('menolak email yang tidak terdaftar dengan pesan yang sama', async () => {
    const wrongPassword = await login(makeRequest('/api/auth/login', { method: 'POST', body: credentials(String(w.studentA.email), 'salah-total') }))
    const unknownEmail = await login(makeRequest('/api/auth/login', { method: 'POST', body: credentials(`tidak-ada-${w.suffix}@test.local`) }))
    expect(unknownEmail.status).toBe(401)
    expect((await unknownEmail.json()).message).toBe((await wrongPassword.json()).message)
  })
  it('menolak email atau kata sandi kosong', async () => {
    expect((await login(makeRequest('/api/auth/login', { method: 'POST', body: credentials('') }))).status).toBe(400)
    expect((await login(makeRequest('/api/auth/login', { method: 'POST', body: credentials(String(w.studentA.email), '') }))).status).toBe(400)
  })
  it('menolak request dari origin lain', async () => {
    const response = await login(makeRequest('/api/auth/login', { method: 'POST', body: credentials(String(w.studentA.email)), origin: 'https://situs-lain.example' }))
    expect(response.status).toBe(403)
  })
})

describe('Akun (collection users)', () => {
  it('siswa tidak bisa mengubah role sendiri menjadi guru', async () => {
    await w.payload.update({ collection: 'users', id: w.studentA.id, data: { role: 'teacher' }, ...as(w.studentA) })
    const user = await w.payload.findByID({ collection: 'users', id: w.studentA.id, overrideAccess: true })
    expect(user.role).toBe('student')
  })
  it('siswa tidak bisa mengubah NIS sendiri', async () => {
    await w.payload.update({ collection: 'users', id: w.studentA.id, data: { nis: String(w.studentB.nis) }, ...as(w.studentA) })
    const user = await w.payload.findByID({ collection: 'users', id: w.studentA.id, overrideAccess: true })
    expect(user.nis).toBe(w.studentA.nis)
  })
  it('siswa bisa memperbarui bio dan minat sendiri', async () => {
    await w.payload.update({ collection: 'users', id: w.studentA.id, data: { bio: 'Halo', interests: ['Web'] }, ...as(w.studentA) })
    const user = await w.payload.findByID({ collection: 'users', id: w.studentA.id, overrideAccess: true })
    expect(user).toMatchObject({ bio: 'Halo', interests: ['Web'] })
  })
  it('siswa tidak bisa mengubah profil siswa lain', async () => {
    await expect(w.payload.update({ collection: 'users', id: w.studentB.id, data: { bio: 'Diretas' }, ...as(w.studentA) })).rejects.toThrow()
  })
  it('siswa tidak bisa membaca akun siswa lain', async () => {
    const result = await w.payload.find({ collection: 'users', ...as(w.studentA) })
    expect(result.docs.map((doc) => doc.id)).toEqual([w.studentA.id])
  })
  it('akun siswa tidak bisa dibuat tanpa NIS', async () => {
    await expect(w.payload.create({ collection: 'users', overrideAccess: true, data: { name: 'Tanpa NIS', email: `x-${w.suffix}@test.local`, password: 'password-uji-123', role: 'student' } })).rejects.toThrow(/NIS/)
  })
})
