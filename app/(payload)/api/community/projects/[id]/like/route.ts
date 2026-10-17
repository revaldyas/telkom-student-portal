import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, num, ok } from '../../../../../../../lib/chat'

/** Menyukai atau membatalkan suka (toggle). Siswa dan guru; bukan pengelola atau anggota tim proyek itu sendiri. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  if (!['student', 'teacher'].includes(String((user as { role?: string }).role))) return fail('Hanya akun siswa atau guru yang dapat menyukai proyek.', 403)
  const id = Number((await params).id)
  const project = await payload.findByID({ collection: 'projects', id, depth: 0, overrideAccess: true }).catch(() => null)
  if (!project || project.status !== 'published') return fail('Proyek tidak ditemukan atau belum diterbitkan.', 404)
  const meID = Number(user.id)
  const team = new Set([num(project.createdBy), ...(Array.isArray(project.members) ? project.members : []).map((entry) => num(entry.member))])
  if (team.has(meID)) return fail('Kamu tidak dapat menyukai proyek timmu sendiri.', 400)
  const likeKey = `${id}:${meID}`
  const existing = await payload.find({ collection: 'project-likes', where: { likeKey: { equals: likeKey } }, limit: 1, depth: 0, overrideAccess: true, pagination: false })
  let liked: boolean
  if (existing.docs[0]) { await payload.delete({ collection: 'project-likes', id: existing.docs[0].id, overrideAccess: true }); liked = false }
  else { await payload.create({ collection: 'project-likes', data: { project: id, user: meID, likeKey }, overrideAccess: true }); liked = true }
  const likes = (await payload.count({ collection: 'project-likes', where: { project: { equals: id } }, overrideAccess: true })).totalDocs
  return ok({ liked, likes })
}
