import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

const sessionCookie = 'karyakita-session'

export async function GET(request: Request) {
  const token = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookie}=`))
    ?.slice(sessionCookie.length + 1)

  // Anonymous is a normal frontend state; return an empty session instead of
  // logging it as a failed API request on every public page visit.
  if (!token) return NextResponse.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } })

  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({
      headers: new Headers({ Authorization: `JWT ${decodeURIComponent(token)}`, DisableAutologin: 'true' }),
    })
    if (!user || user.collection !== 'users' || !['student', 'teacher'].includes(String(user.role))) {
      const response = NextResponse.json({ user: null }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
      response.cookies.set(sessionCookie, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
      return response
    }

    const photo = typeof user.profilePhoto === 'object' && user.profilePhoto ? user.profilePhoto.url || null : null

    return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role, profilePhoto: photo } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'Sesi belum dapat diperiksa.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
