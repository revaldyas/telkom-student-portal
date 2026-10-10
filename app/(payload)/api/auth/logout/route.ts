import { NextResponse } from 'next/server'

const sessionCookie = 'karyakita-session'

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: 'Permintaan tidak valid.' }, { status: 403 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(sessionCookie, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
