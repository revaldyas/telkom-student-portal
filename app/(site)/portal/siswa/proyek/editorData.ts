import config from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

export type ProjectStudentOption = { id: string | number; name: string }
export type ProjectMentorOption = { id: string | number; name: string; skills: string[]; interests: string[] }
export type ProjectEditorMember = { member: string | number; contribution: string }
export type ProjectEditorMentor = { mentor: string | number; assignmentRole: 'primary' | 'supporting'; response: 'invited' | 'accepted' | 'declined' }
export type ProjectEditorData = {
  id: string | number; title: string; summary: string; details?: SerializedEditorState | null; categoryRef?: string | number | null
  members: ProjectEditorMember[]; mentorAssignments: ProjectEditorMentor[]; coverImage?: { id: string | number; url?: string; filename?: string } | null
  galleryImages: Array<{ id: string | number; url?: string; filename?: string; alt?: string }>; year?: number; tools: string[]; projectUrl?: string
  status?: string; verificationStatus?: string
}

export async function getProjectEditorData(projectID?: string) {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let user: { collection?: string; role?: unknown; id: string | number } | null
  try { user = (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })).user as typeof user }
  catch { redirect('/login') }
  if (!user || user.collection !== 'users' || user.role !== 'student') redirect('/portal')
  const [categories, students, teachers, project] = await Promise.all([
    payload.find({ collection: 'portfolio-categories', limit: 100, sort: 'name', depth: 0, overrideAccess: true }),
    payload.find({ collection: 'users', where: { role: { equals: 'student' } }, limit: 1000, sort: 'name', depth: 0, overrideAccess: true }),
    payload.find({ collection: 'users', where: { role: { equals: 'teacher' } }, limit: 1000, sort: 'name', depth: 0, overrideAccess: true }),
    projectID ? payload.findByID({ collection: 'projects', id: projectID, depth: 2, overrideAccess: true }).catch(() => null) : Promise.resolve(null),
  ])
  if (projectID && (!project || String(typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy) !== String(user.id))) redirect('/portal/siswa/proyek')
  const editorProject: ProjectEditorData | null = project ? {
    id: project.id, title: project.title, summary: project.summary || '', details: project.details || null,
    categoryRef: typeof project.categoryRef === 'object' && project.categoryRef ? project.categoryRef.id : project.categoryRef,
    members: Array.isArray(project.members) ? project.members.flatMap((entry) => typeof entry.member === 'object' && entry.member ? [{ member: entry.member.id, contribution: entry.contribution || '' }] : typeof entry.member === 'number' ? [{ member: entry.member, contribution: entry.contribution || '' }] : []) : [],
    mentorAssignments: Array.isArray(project.mentorAssignments) ? project.mentorAssignments.flatMap((entry) => typeof entry.mentor === 'object' && entry.mentor ? [{ mentor: entry.mentor.id, assignmentRole: entry.assignmentRole || 'supporting', response: entry.response || 'invited' }] : typeof entry.mentor === 'number' ? [{ mentor: entry.mentor, assignmentRole: entry.assignmentRole || 'supporting', response: entry.response || 'invited' }] : []) : [],
    coverImage: typeof project.coverImage === 'object' && project.coverImage ? { id: project.coverImage.id, url: project.coverImage.url || undefined, filename: project.coverImage.filename || undefined } : null,
    galleryImages: Array.isArray(project.galleryImages) ? project.galleryImages.flatMap((image) => image && typeof image === 'object' ? [{ id: image.id, url: image.url || undefined, filename: image.filename || undefined, alt: image.alt || undefined }] : []) : [],
    year: project.year || undefined, tools: project.tools || [], projectUrl: project.projectUrl || '',
    status: project.status, verificationStatus: project.verificationStatus || 'unreviewed',
  } : null
  return {
    userID: user.id,
    categories: categories.docs.map((item) => ({ id: item.id, name: item.name })),
    students: students.docs.filter((student) => student.role === 'student').map((student) => ({ id: student.id, name: student.name || 'Siswa' })),
    teachers: teachers.docs.filter((teacher) => teacher.role === 'teacher').map((teacher) => ({ id: teacher.id, name: teacher.name || 'Guru', skills: teacher.skills || [], interests: teacher.interests || [] })) as ProjectMentorOption[],
    project: editorProject,
  }
}
