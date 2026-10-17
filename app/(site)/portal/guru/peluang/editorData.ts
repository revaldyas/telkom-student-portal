import config from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

export type OpportunityEditorData = {
  id: string | number; title: string; type: string; organizer: string; summary: string; requirements: string
  opensAt: string; deadline: string; url: string; contact: string; status: string
  coverImage: { id: string | number; url?: string; filename?: string } | null; targetPrograms: (string | number)[]
}

export async function getOpportunityEditorData(id?: string) {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let user: { collection?: string; role?: unknown; id: string | number } | null
  try { user = (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })).user as typeof user }
  catch { redirect('/login') }
  if (!user || user.collection !== 'users' || user.role !== 'teacher') redirect('/portal')
  const [programs, doc] = await Promise.all([
    payload.find({ collection: 'programs', limit: 100, sort: 'name', depth: 0, overrideAccess: true }),
    id ? payload.findByID({ collection: 'opportunities', id, depth: 1, overrideAccess: true }).catch(() => null) : Promise.resolve(null),
  ])
  if (id && !doc) redirect('/portal/guru/peluang')
  const opportunity: OpportunityEditorData | null = doc ? {
    id: doc.id, title: doc.title, type: doc.type || 'competition', organizer: doc.organizer || '', summary: doc.summary || '', requirements: doc.requirements || '',
    opensAt: doc.opensAt ? doc.opensAt.slice(0, 10) : '', deadline: doc.deadline ? doc.deadline.slice(0, 10) : '', url: doc.url || '', contact: doc.contact || '', status: doc.status,
    coverImage: typeof doc.coverImage === 'object' && doc.coverImage ? { id: doc.coverImage.id, url: doc.coverImage.url || undefined, filename: doc.coverImage.filename || undefined } : null,
    targetPrograms: (Array.isArray(doc.targetPrograms) ? doc.targetPrograms : []).map((program) => typeof program === 'object' && program ? program.id : program),
  } : null
  return { programs: programs.docs.map((program) => ({ id: program.id, name: program.name })), opportunity }
}
