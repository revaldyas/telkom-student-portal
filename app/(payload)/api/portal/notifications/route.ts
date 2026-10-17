import config from '@payload-config'
import { authenticateWebsiteRequest } from '../../../../../lib/websiteAuth'
import { isStudentUser } from '../../../../../lib/isStudentUser'
import { isTeacherUser } from '../../../../../lib/isTeacherUser'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

type Actor = { id: string | number; name: string; photo: string | null }
type Item = { id: string; type: string; title: string; message: string; href: string; createdAt?: string; actor?: Actor }
const actorOf = (value: unknown): Actor | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const user = value as { id?: string | number; name?: string; profilePhoto?: unknown }
  if (user.id === undefined) return undefined
  const photo = user.profilePhoto && typeof user.profilePhoto === 'object' ? (user.profilePhoto as { url?: string }).url || null : null
  return { id: user.id, name: user.name || 'Pengguna', photo }
}
const relationID = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return relationID((value as { id: unknown }).id)
  return undefined
}

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const user = await authenticateWebsiteRequest(payload, request)
  if (!user || (!isStudentUser(user) && !isTeacherUser(user))) return NextResponse.json({ message: 'Sesi portal tidak ditemukan.' }, { status: 401 })
  const assignedPromise = payload.find({
    collection: 'project-activity', depth: 1, limit: 50, sort: '-id', pagination: false, overrideAccess: true,
    where: { and: [{ action: { equals: 'task.assigned' } }, { createdAt: { greater_than: new Date(Date.now() - 7 * 86400000).toISOString() } }] },
  })
  assignedPromise.catch(() => undefined) // cegah peringatan bila route gagal sebelum menunggunya
  try {
    const notifications: Item[] = []
    if (isStudentUser(user)) {
      const [works, projects, records, opportunities, awards] = await Promise.all([
        payload.find({ collection: 'portfolios', where: { student: { equals: user.id } }, depth: 0, limit: 500, sort: '-updatedAt', overrideAccess: true, pagination: false }),
        payload.find({ collection: 'projects', where: { createdBy: { equals: user.id } }, depth: 2, limit: 500, sort: '-updatedAt', overrideAccess: true, pagination: false }),
        payload.find({ collection: 'student-records', where: { student: { equals: user.id } }, depth: 1, limit: 20, sort: '-earnedAt', overrideAccess: true, pagination: false }),
        payload.find({ collection: 'opportunities', where: { status: { equals: 'open' } }, depth: 1, limit: 100, sort: 'deadline', overrideAccess: true, pagination: false }),
        payload.find({ collection: 'awards', where: { status: { equals: 'open' } }, depth: 1, limit: 100, sort: 'closesAt', overrideAccess: true, pagination: false }),
      ])
      for (const work of works.docs) {
        if (work.verificationStatus === 'revision-requested') notifications.push({ id: `revision:${work.id}:${work.updatedAt}`, type: 'revision', title: 'Karya perlu direvisi', message: `${work.title}: ${work.reviewFeedback || 'Buka karya untuk melihat catatan Guru.'}`, href: `/karya/${work.slug}`, createdAt: work.updatedAt })
      }
      for (const project of projects.docs) {
        const entries = Array.isArray(project.mentorAssignments) ? project.mentorAssignments : []
        for (const entry of entries) {
          if (!['accepted', 'declined'].includes(String(entry.response))) continue
          const mentor = typeof entry.mentor === 'object' && entry.mentor ? entry.mentor.name : 'Guru pembimbing'
          notifications.push({ id: `mentor-response:${project.id}:${relationID(entry.mentor)}:${entry.response}:${project.updatedAt}`, type: 'mentor', actor: actorOf(entry.mentor), title: entry.response === 'accepted' ? 'Undangan pembimbing diterima' : 'Undangan pembimbing ditolak', message: `${mentor} menanggapi undangan untuk proyek ${project.title}.`, href: `/proyek/${project.slug}`, createdAt: project.updatedAt })
        }
      }
      const workIDs = works.docs.map((work) => work.id)
      if (workIDs.length) {
        const [comments, likes] = await Promise.all([
          payload.find({ collection: 'portfolio-comments', where: { portfolio: { in: workIDs } }, depth: 2, limit: 100, sort: '-createdAt', overrideAccess: true, pagination: false }),
          payload.find({ collection: 'portfolio-likes', where: { portfolio: { in: workIDs } }, depth: 2, limit: 100, sort: '-createdAt', overrideAccess: true, pagination: false }),
        ])
        for (const comment of comments.docs) {
          const work = typeof comment.portfolio === 'object' && comment.portfolio ? comment.portfolio : null
          const author = typeof comment.student === 'object' && comment.student ? comment.student : null
          if (!work || String(relationID(comment.student)) === String(user.id)) continue
          notifications.push({ id: `comment:${comment.id}`, type: 'comment', actor: actorOf(author), title: 'Komentar baru pada karyamu', message: `${author?.name || 'Seseorang'}: ${comment.content}`, href: `/karya/${work.slug}`, createdAt: comment.createdAt })
        }
        for (const like of likes.docs) {
          const work = typeof like.portfolio === 'object' && like.portfolio ? like.portfolio : null
          const author = typeof like.student === 'object' && like.student ? like.student : null
          if (!work || String(relationID(like.student)) === String(user.id)) continue
          notifications.push({ id: `like:${like.id}`, type: 'like', actor: actorOf(author), title: 'Seseorang menyukai karyamu', message: `${author?.name || 'Siswa'} menyukai ${work.title}.`, href: `/karya/${work.slug}`, createdAt: like.createdAt })
        }
      }
      for (const record of records.docs) notifications.push({ id: `record:${record.id}`, type: record.recordType === 'award' ? 'award' : 'achievement', title: record.recordType === 'award' ? 'Penghargaan baru' : 'Achievement baru', message: record.title, href: `/siswa/${user.id}`, createdAt: record.earnedAt })

      const now = Date.now()
      const sevenDays = now + 7 * 24 * 60 * 60 * 1000
      for (const opportunity of opportunities.docs) {
        if (!opportunity.deadline || new Date(opportunity.deadline).getTime() < now || new Date(opportunity.deadline).getTime() > sevenDays) continue
        notifications.push({ id: `opportunity-deadline:${opportunity.id}:${opportunity.deadline}`, type: 'deadline', title: 'Batas peluang semakin dekat', message: `${opportunity.title} ditutup ${new Date(opportunity.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}.`, href: '/peluang', createdAt: opportunity.deadline })
      }
      for (const award of awards.docs) {
        if (new Date(award.closesAt).getTime() < now || new Date(award.closesAt).getTime() > sevenDays) continue
        notifications.push({ id: `award-deadline:${award.id}:${award.closesAt}`, type: 'vote', title: 'Voting penghargaan segera ditutup', message: `${award.title} ditutup ${new Date(award.closesAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}.`, href: '/awards', createdAt: award.closesAt })
      }
    } else {
      const [teacher, works, projects, interests] = await Promise.all([
        payload.findByID({ collection: 'users', id: user.id, depth: 2, overrideAccess: true }),
        payload.find({ collection: 'portfolios', where: { status: { equals: 'draft' } }, depth: 3, limit: 500, sort: '-updatedAt', overrideAccess: true, pagination: false }),
        payload.find({ collection: 'projects', where: { status: { equals: 'draft' } }, depth: 2, limit: 500, sort: '-updatedAt', overrideAccess: true, pagination: false }),
        payload.find({ collection: 'opportunity-interests', where: { status: { equals: 'interested' } }, depth: 2, limit: 500, sort: '-createdAt', overrideAccess: true, pagination: false }),
      ])
      const teacherClass = relationID(teacher.class)
      const teacherProgram = relationID(teacher.program)
      for (const work of works.docs) {
        if (work.verificationStatus !== 'submitted') continue
        const student = typeof work.student === 'object' && work.student ? work.student : null
        const studentClass = student?.class && typeof student.class === 'object' ? student.class : null
        const studentProgram = relationID(student?.program) ?? relationID(studentClass?.program)
        const inScope = Boolean((teacherClass && String(teacherClass) === String(relationID(student?.class))) || (teacherProgram && String(teacherProgram) === String(studentProgram)))
        if (!student || !inScope) continue
        notifications.push({ id: `portfolio-review:${work.id}:${work.updatedAt}`, type: 'review', actor: actorOf(student), title: 'Karya menunggu verifikasi', message: `${student.name || 'Siswa'} mengirim karya “${work.title}”.`, href: `/karya/${work.slug}`, createdAt: work.updatedAt })
      }
      for (const project of projects.docs) {
        const entries = Array.isArray(project.mentorAssignments) ? project.mentorAssignments : []
        const assignment = entries.find((entry) => String(relationID(entry.mentor)) === String(user.id))
        if (!assignment) continue
        if (assignment.response === 'invited') notifications.push({ id: `project-invitation:${project.id}:${project.updatedAt}`, type: 'invite', actor: actorOf(project.createdBy), title: 'Undangan menjadi pembimbing', message: `Kamu diundang untuk membimbing proyek “${project.title}”.`, href: `/proyek/${project.slug}`, createdAt: project.updatedAt })
        else if (assignment.response === 'accepted' && project.verificationStatus === 'submitted') notifications.push({ id: `project-review:${project.id}:${project.updatedAt}`, type: 'project-review', actor: actorOf(project.createdBy), title: 'Proyek menunggu tinjauan', message: `Tim “${project.title}” mengajukan proyek untuk ditinjau.`, href: `/proyek/${project.slug}`, createdAt: project.updatedAt })
      }
      for (const interest of interests.docs) {
        const student = typeof interest.student === 'object' && interest.student ? interest.student : null
        const studentClass = student?.class && typeof student.class === 'object' ? student.class : null
        const studentProgram = relationID(student?.program) ?? relationID(studentClass?.program)
        const inScope = Boolean((teacherClass && String(teacherClass) === String(relationID(student?.class))) || (teacherProgram && String(teacherProgram) === String(studentProgram)))
        const opportunity = typeof interest.opportunity === 'object' && interest.opportunity ? interest.opportunity : null
        if (!student || !opportunity || !inScope) continue
        notifications.push({ id: `opportunity-interest:${interest.id}`, type: 'interest', actor: actorOf(student), title: 'Siswa tertarik pada peluang', message: `${student.name || 'Siswa'} tertarik pada “${opportunity.title}”.`, href: '/portal/guru/peluang', createdAt: interest.createdAt })
      }
    }
    const assigned = await assignedPromise
    for (const entry of assigned.docs) {
      const meta = (entry.meta && typeof entry.meta === 'object' ? entry.meta : {}) as { added?: unknown[]; title?: string }
      if (!Array.isArray(meta.added) || !meta.added.map(Number).includes(Number(user.id))) continue
      const actor = typeof entry.actor === 'object' && entry.actor ? entry.actor : null
      if (relationID(actor) === user.id) continue
      const projectID = relationID(entry.project)
      notifications.push({ id: `task-assigned:${entry.id}`, type: 'task', actor: actorOf(actor), title: 'Kamu ditugaskan pada sebuah tugas', message: `${actor?.name || 'Seseorang'} ${entry.summary}`, href: `/portal/${isStudentUser(user) ? 'siswa' : 'guru'}/tracker/${projectID}${entry.task ? `?task=${entry.task}` : ''}`, createdAt: entry.createdAt })
    }
    notifications.sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''))
    return NextResponse.json({ notifications: notifications.slice(0, 20) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Failed to load portal notifications', error)
    return NextResponse.json({ message: 'Notifikasi belum dapat dimuat.' }, { status: 503 })
  }
}
