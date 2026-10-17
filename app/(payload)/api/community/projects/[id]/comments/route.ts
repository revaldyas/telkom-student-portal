import config from '@payload-config'
import { getPayload } from 'payload'
import { chatUser, fail, num, ok, personOf } from '../../../../../../../lib/chat'

const serialize = (doc: { id: number; body: string; createdAt: string; updatedAt: string; author: unknown }, meID?: number, ownerID?: number) => {
  const author = personOf(doc.author)
  const mine = Boolean(meID && author && author.id === meID)
  // Penulis dapat mengedit; penulis dan pengelola proyek dapat menghapus.
  return { id: doc.id, body: doc.body, createdAt: doc.createdAt, edited: Date.parse(doc.updatedAt) - Date.parse(doc.createdAt) > 2000, author, mine, canDelete: mine || Boolean(meID && ownerID && meID === ownerID) }
}

async function publishedProject(payload: Awaited<ReturnType<typeof getPayload>>, id: number) {
  const project = await payload.findByID({ collection: 'projects', id, depth: 0, overrideAccess: true }).catch(() => null)
  return project && project.status === 'published' ? project : null
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const id = Number((await params).id)
  const project = await publishedProject(payload, id)
  if (!project) return fail('Proyek tidak ditemukan.', 404)
  const user = await chatUser(payload, request)
  const result = await payload.find({ collection: 'project-comments', where: { project: { equals: id } }, depth: 1, limit: 200, sort: 'createdAt', overrideAccess: true, pagination: false })
  return ok({ comments: result.docs.map((doc) => serialize(doc, user ? Number(user.id) : undefined, num(project.createdBy))) })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  if (!['student', 'teacher'].includes(String((user as { role?: string }).role))) return fail('Hanya akun siswa atau guru yang dapat berkomentar.', 403)
  const id = Number((await params).id)
  const project = await publishedProject(payload, id)
  if (!project) return fail('Proyek tidak ditemukan atau belum diterbitkan.', 404)
  const { body } = await request.json().catch(() => ({})) as { body?: string }
  const text = String(body || '').trim()
  if (text.length < 2) return fail('Komentar minimal 2 karakter.')
  if (text.length > 1200) return fail('Komentar maksimal 1200 karakter.')
  const recent = await payload.count({ collection: 'project-comments', overrideAccess: true, where: { and: [{ author: { equals: Number(user.id) } }, { createdAt: { greater_than: new Date(Date.now() - 60000).toISOString() } }] } })
  if (recent.totalDocs >= 8) return fail('Terlalu cepat. Tunggu sebentar sebelum berkomentar lagi.', 429)
  const doc = await payload.create({ collection: 'project-comments', data: { project: id, author: Number(user.id), body: text }, depth: 1, overrideAccess: true })
  return ok({ comment: serialize(doc, Number(user.id), num(project.createdBy)) }, 201)
}

/** Mengedit komentar sendiri: PATCH ?commentID= dengan body { body }. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const commentID = num(new URL(request.url).searchParams.get('commentID'))
  const projectID = Number((await params).id)
  if (commentID === undefined) return fail('Komentar tidak valid.')
  const comment = await payload.findByID({ collection: 'project-comments', id: commentID, depth: 0, overrideAccess: true }).catch(() => null)
  if (!comment || num(comment.project) !== projectID) return fail('Komentar tidak ditemukan.', 404)
  if (num(comment.author) !== Number(user.id)) return fail('Kamu hanya dapat mengedit komentarmu sendiri.', 403)
  const { body } = await request.json().catch(() => ({})) as { body?: string }
  const text = String(body || '').trim()
  if (text.length < 2) return fail('Komentar minimal 2 karakter.')
  if (text.length > 1200) return fail('Komentar maksimal 1200 karakter.')
  const project = await publishedProject(payload, projectID)
  const doc = await payload.update({ collection: 'project-comments', id: commentID, data: { body: text }, depth: 1, overrideAccess: true })
  return ok({ comment: { ...serialize(doc, Number(user.id), project ? num(project.createdBy) : undefined), edited: true } })
}

/** Menghapus komentar: DELETE ?commentID=. Boleh oleh penulis atau pengelola proyek. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const user = await chatUser(payload, request)
  if (!user) return fail('Masuk terlebih dahulu.', 401)
  const commentID = num(new URL(request.url).searchParams.get('commentID'))
  const projectID = Number((await params).id)
  if (commentID === undefined) return fail('Komentar tidak valid.')
  const [comment, project] = await Promise.all([
    payload.findByID({ collection: 'project-comments', id: commentID, depth: 0, overrideAccess: true }).catch(() => null),
    payload.findByID({ collection: 'projects', id: projectID, depth: 0, overrideAccess: true }).catch(() => null),
  ])
  if (!comment || !project || num(comment.project) !== projectID) return fail('Komentar tidak ditemukan.', 404)
  if (num(comment.author) !== Number(user.id) && num(project.createdBy) !== Number(user.id)) return fail('Kamu hanya dapat menghapus komentarmu sendiri atau komentar di proyekmu.', 403)
  await payload.delete({ collection: 'project-comments', id: commentID, overrideAccess: true })
  return ok({ ok: true })
}
