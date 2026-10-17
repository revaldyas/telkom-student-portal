import config from '@payload-config'
import { getPayload } from 'payload'
import ProjectsListing, { type ProjectItem } from '../../../components/ProjectsListing'
import { projectCounts } from '../../../lib/projectSocial'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const payload = await getPayload({ config })
  const response = await payload.find({ collection: 'projects', where: { status: { equals: 'published' } }, depth: 2, limit: 1000, sort: '-createdAt', overrideAccess: true })
  const counts = await projectCounts(payload, response.docs.map((project) => project.id))
  const projects: ProjectItem[] = response.docs.map((project) => {
    const cover = project.coverImage && typeof project.coverImage === 'object' ? project.coverImage : null
    const category = typeof project.categoryRef === 'object' && project.categoryRef ? project.categoryRef : null
    const members = Array.isArray(project.members) ? project.members.flatMap((entry) => {
      const member = typeof entry.member === 'object' && entry.member ? entry.member : null
      if (!member) return []
      const photo = member.profilePhoto && typeof member.profilePhoto === 'object' ? member.profilePhoto.url || null : null
      return [{ id: member.id, name: member.name || 'Siswa', photo }]
    }) : []
    return { id: project.id, slug: project.slug, title: project.title, summary: project.summary || '', year: project.year ?? null, category: category?.name || 'Proyek', categoryId: category ? String(category.id) : '', cover: cover?.url || null, coverAlt: cover?.alt || '', members, likes: counts.likes.get(project.id) || 0, comments: counts.comments.get(project.id) || 0 }
  })
  return <main className="lowfi-shell"><ProjectsListing projects={projects} /></main>
}
