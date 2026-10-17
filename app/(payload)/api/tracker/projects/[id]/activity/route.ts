import config from '@payload-config'
import { getPayload, type Where } from 'payload'
import { chatUser, fail, num, ok } from '../../../../../../../lib/chat'
import { projectAccess, serializeActivity } from '../../../../../../../lib/tracker'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const projectID = Number((await params).id)
  if (!await projectAccess(payload, user, projectID)) return fail('Proyek tidak ditemukan.', 404)
  const before = num(new URL(request.url).searchParams.get('before'))
  const filters: Where[] = [{ project: { equals: projectID } }]
  if (before !== undefined) filters.push({ id: { less_than: before } })
  const result = await payload.find({ collection: 'project-activity', where: { and: filters }, depth: 1, limit: 30, sort: '-id', overrideAccess: true })
  return ok({ activity: result.docs.map(serializeActivity), hasMore: result.hasNextPage })
}
