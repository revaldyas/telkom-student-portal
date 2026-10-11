import config from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import type { PortfolioEditorCategory, PortfolioEditorWork } from './PortfolioEditorPage'

const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return relationID((value as { id: unknown }).id)
  return undefined
}

export async function getPortfolioEditorData(workID?: string): Promise<{ categories: PortfolioEditorCategory[]; work: PortfolioEditorWork | null }> {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  const user = await (async () => {
    try {
      const auth = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })
      return auth.user as unknown as { collection?: string; role?: unknown; id: string | number } | null
    } catch { redirect('/login') }
  })()
  if (!user || user.collection !== 'users' || user.role !== 'student') redirect('/portal')

  const [categoryResponse, workResponse] = await Promise.all([
    payload.find({ collection: 'portfolio-categories', limit: 100, sort: 'name', depth: 0, overrideAccess: true }),
    workID ? payload.findByID({ collection: 'portfolios', id: workID, depth: 2, overrideAccess: true }).catch(() => null) : Promise.resolve(null),
  ])
  if (workID && (!workResponse || String(relationID(workResponse.student)) !== String(user.id))) redirect('/portal/siswa/karya')

  const work = workResponse ? {
    id: workResponse.id,
    title: workResponse.title,
    categoryRef: relationID(workResponse.categoryRef),
    summary: workResponse.summary || '',
    details: workResponse.details || null,
    coverImage: typeof workResponse.coverImage === 'object' && workResponse.coverImage ? { id: workResponse.coverImage.id, url: workResponse.coverImage.url || undefined, filename: workResponse.coverImage.filename || undefined } : relationID(workResponse.coverImage) || null,
    galleryImages: Array.isArray(workResponse.galleryImages) ? workResponse.galleryImages.flatMap((image) => image && typeof image === 'object' ? [{ id: image.id, url: image.url || undefined, filename: image.filename || undefined, alt: image.alt }] : []) : [],
    projectFile: typeof workResponse.projectFile === 'object' && workResponse.projectFile ? { id: workResponse.projectFile.id, url: workResponse.projectFile.url || undefined, filename: workResponse.projectFile.filename || undefined, mimeType: workResponse.projectFile.mimeType || undefined } : relationID(workResponse.projectFile) || null,
    year: workResponse.year || undefined,
    tools: workResponse.tools || [],
    projectUrl: workResponse.projectUrl || '',
    status: workResponse.status,
  } satisfies PortfolioEditorWork : null

  return {
    categories: categoryResponse.docs.map((category) => ({ id: category.id, name: category.name, code: category.code })),
    work,
  }
}
