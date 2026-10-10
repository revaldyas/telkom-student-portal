import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST } from '@payloadcms/next/routes'
import config from '@payload-config'

type RouteArgs = { params: Promise<{ slug?: string[] }> }
type RouteHandler = (request: Request, args: RouteArgs) => Promise<Response>
const websiteSessionCookie = 'karyakita-session'
const payloadCookie = 'payload-token'

function cookieValue(cookieHeader: string, name: string) {
  const pair = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))
  if (!pair) return undefined
  try {
    return decodeURIComponent(pair.slice(name.length + 1))
  } catch {
    return undefined
  }
}

function withWebsiteSession(handler: RouteHandler): RouteHandler {
  return async (request, args) => {
    const isWebsiteRequest = request.headers.get('X-Karyakita-Client') === 'website'
    const { slug = [] } = await args.params

    // Website accounts use the separate public-site session endpoints below.
    // Prevent the generic Payload endpoint from setting/clearing its CMS cookie for them.
    if (!isWebsiteRequest && slug[0] === 'users' && ['login', 'logout', 'refresh'].includes(slug[1] || '')) {
      return Response.json({ message: 'Gunakan endpoint sesi website.' }, { status: 404 })
    }
    if (!isWebsiteRequest) return handler(request, args)

    const method = request.method.toUpperCase()
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      const origin = request.headers.get('origin')
      if (!origin || origin !== new URL(request.url).origin) {
        return Response.json({ message: 'Permintaan tidak valid.' }, { status: 403 })
      }
    }

    const headers = new Headers(request.headers)
    headers.delete('Authorization')
    headers.set('DisableAutologin', 'true')

    const cookieHeader = headers.get('cookie') || ''
    const token = cookieValue(cookieHeader, websiteSessionCookie)
    const remainingCookies = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith(`${payloadCookie}=`))
    if (remainingCookies.length) headers.set('cookie', remainingCookies.join('; '))
    else headers.delete('cookie')

    if (token) headers.set('Authorization', `JWT ${token}`)
    // Rebuild from URL and RequestInit instead of passing Next's Request object
    // as the input. Turbopack can otherwise hit an internal private-state error.
    const requestInit: RequestInit & { duplex?: 'half' } = {
      method,
      headers,
    }
    if (method !== 'GET' && method !== 'HEAD') {
      requestInit.body = request.body
      requestInit.duplex = 'half'
    }
    const websiteRequest = new Request(request.url, requestInit)
    return handler(websiteRequest, args)
  }
}

export const GET = withWebsiteSession(REST_GET(config))
export const POST = withWebsiteSession(REST_POST(config))
export const DELETE = withWebsiteSession(REST_DELETE(config))
export const PATCH = withWebsiteSession(REST_PATCH(config))
export const OPTIONS = withWebsiteSession(REST_OPTIONS(config))
