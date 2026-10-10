import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

const sessionCookie = 'karyakita-session'

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ message: 'Permintaan tidak valid.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password) return NextResponse.json({ message: 'Email dan kata sandi wajib diisi.' }, { status: 400 })

    const payload = await getPayload({ config })
    const result = await payload.login({ collection: 'users', data: { email, password } })
    if (!result.token || !result.user) {
      return NextResponse.json({ message: 'Email atau kata sandi belum cocok.' }, { status: 401 })
    }

    const response = NextResponse.json({
      user: { id: result.user.id, name: result.user.name, role: result.user.role },
      exp: result.exp,
    })
    const maxAge = 60 * 60 * 24 * 30
    response.cookies.set(sessionCookie, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    })
    return response
  } catch {
    return NextResponse.json({ message: 'Email atau kata sandi belum cocok.' }, { status: 401 })
  }
}
