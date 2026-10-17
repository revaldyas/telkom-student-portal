import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, ok } from '../../../../../../../lib/chat'
import { projectCounts } from '../../../../../../../lib/projectSocial'

/** Suka, komentar, dan apakah pengguna saat ini sudah menyukai proyek. Proyek draf hanya dapat dilihat tim. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const id = Number((await params).id)
  const project = await payload.findByID({ collection: 'projects', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!project || project.status !== 'published') return fail('Proyek tidak ditemukan.', 404)
  const user = await chatUser(payload, request)
  const counts = await projectCounts(payload, [id])
  let liked = false
  if (user) liked = (await payload.count({ collection: 'project-likes', where: { likeKey: { equals: `${id}:${user.id}` } }, overrideAccess: true })).totalDocs > 0
  return ok({ likes: counts.likes.get(id) || 0, comments: counts.comments.get(id) || 0, liked, role: user ? (user as { role?: string }).role || null : null })
}
