import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ message: 'Permintaan tidak valid.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const nis = typeof body.nis === 'string' ? body.nis.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!name || !nis || !email || !password) {
      return NextResponse.json({ message: 'Semua field wajib diisi.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ message: 'Kata sandi minimal 8 karakter.' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    await payload.create({
      collection: 'users',
      data: { name, nis, email, password, role: 'student' },
      overrideAccess: true,
    })

    return NextResponse.json({ message: 'Akun siswa berhasil dibuat.' }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registrasi belum berhasil.'
    return NextResponse.json({ message }, { status: 400 })
  }
}
