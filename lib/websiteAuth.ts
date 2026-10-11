import type { BasePayload, TypedUser } from 'payload'

export async function authenticateWebsiteRequest(payload: BasePayload, request: Request): Promise<TypedUser | null> {
  const token = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('karyakita-session='))
    ?.slice('karyakita-session='.length)
  if (!token) return null
  try {
    const { user } = await payload.auth({
      headers: new Headers({ Authorization: `JWT ${decodeURIComponent(token)}`, DisableAutologin: 'true' }),
    })
    return user?.collection === 'users' && ['student', 'teacher'].includes(String((user as { role?: unknown }).role)) ? user : null
  } catch {
    return null
  }
}
