import config from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getPayload } from 'payload'
import ProjectMentorWorkflow from './ProjectMentorWorkflow'
import { CopyLinkButton, ProjectMedia } from './ProjectMedia'
import ProjectSocial from './ProjectSocial'
import '../../karya/[slug]/work-detail.css'
import './project-detail.css'

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'projects', where: { slug: { equals: slug } }, depth: 3, limit: 1, overrideAccess: true })
  const project = result.docs[0]
  if (!project) notFound()
  let viewerID: string | number | undefined
  let viewerRole: string | undefined
  const token = (await cookies()).get('karyakita-session')?.value
  if (token) {
    try {
      const auth = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })
      const viewer = auth.user as unknown as { collection?: string; role?: unknown; id: string | number } | null
      if (viewer?.collection === 'users') { viewerID = viewer.id; viewerRole = String(viewer.role || '') }
    } catch { /* Public projects remain available if an optional session is stale. */ }
  }
  const ownerID = typeof project.createdBy === 'object' ? project.createdBy.id : project.createdBy
  const isOwner = viewerID !== undefined && String(viewerID) === String(ownerID)
  const mentorAssignments = Array.isArray(project.mentorAssignments) ? project.mentorAssignments : []
  const viewerAssignment = mentorAssignments.find((item) => {
    const mentorID = typeof item.mentor === 'object' && item.mentor ? item.mentor.id : item.mentor
    return viewerID !== undefined && String(mentorID) === String(viewerID)
  })
  const canReview = viewerRole === 'teacher' && Boolean(viewerAssignment)
  const teamIDs = [ownerID, ...(Array.isArray(project.members) ? project.members : []).map((entry) => typeof entry.member === 'object' && entry.member ? entry.member.id : entry.member), ...mentorAssignments.filter((item) => item.response !== 'declined').map((item) => typeof item.mentor === 'object' && item.mentor ? item.mentor.id : item.mentor)]
  const isLikeBlocked = viewerID !== undefined && [ownerID, ...(Array.isArray(project.members) ? project.members : []).map((entry) => typeof entry.member === 'object' && entry.member ? entry.member.id : entry.member)].some((value) => String(value) === String(viewerID))
  const inTeam = viewerID !== undefined && teamIDs.some((value) => String(value) === String(viewerID))
  if (project.status !== 'published' && !isOwner && !canReview) notFound()
  const cover = project.coverImage && typeof project.coverImage === 'object' ? project.coverImage : null
  const gallery = Array.isArray(project.galleryImages) ? project.galleryImages.flatMap((image) => image && typeof image === 'object' ? [image] : []) : []
  const members = Array.isArray(project.members) ? project.members : []
  const category = project.categoryRef && typeof project.categoryRef === 'object' ? project.categoryRef.name : 'Proyek kolaborasi'
  const fmtDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(value)) : ''
  const published = project.status === 'published'
  const verified = project.verificationStatus === 'verified'
  const acceptedMentors = mentorAssignments.flatMap((entry) => {
    const mentor = typeof entry.mentor === 'object' && entry.mentor ? entry.mentor : null
    if (!mentor || entry.response !== 'accepted') return []
    return [{ id: mentor.id, name: mentor.name || 'Guru', photo: typeof mentor.profilePhoto === 'object' && mentor.profilePhoto ? mentor.profilePhoto.url || null : null, primary: entry.assignmentRole === 'primary' }]
  }).sort((a, b) => Number(b.primary) - Number(a.primary))
  const teamMembers = members.flatMap((entry) => {
    const member = typeof entry.member === 'object' && entry.member ? entry.member : null
    if (!member) return []
    return [{ id: member.id, name: member.name || 'Siswa', role: entry.contribution, photo: typeof member.profilePhoto === 'object' && member.profilePhoto ? member.profilePhoto.url || null : null }]
  })
  const statusLabel = project.verificationStatus === 'submitted' ? 'Menunggu verifikasi' : project.verificationStatus === 'revision-requested' ? 'Perlu revisi' : 'Proyek draf'

  return <main className="lowfi-shell wd-shell"><article className="wd pd">
    <nav className="wd-crumb" aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>/</span><Link href="/proyek">Proyek Siswa</Link><span>/</span><span aria-current="page">{project.title}</span></nav>

    <header className="wd-head">
      <div className="wd-chips">
        <span className="wd-chip">{category}{project.year ? ` · ${project.year}` : ''}</span>
        <span className="wd-chip wd-chip--blue">👥 {teamMembers.length} anggota</span>
        {verified && published && <span className="wd-chip wd-chip--green">✓ Terverifikasi</span>}
        {!published && <span className="wd-chip wd-chip--grey">Draf</span>}
      </div>
      <h1>{project.title}</h1>
      {project.summary && <p className="wd-lead">{project.summary}</p>}
    </header>

    {!published && <div className="pd-banner" role="status"><div><strong>{statusLabel}</strong><span>Proyek privat untuk tim dan Guru pembimbing.</span>{project.reviewFeedback && <p>Catatan terakhir: {project.reviewFeedback}</p>}</div>{isOwner && <Link className="wd-ghost" href={`/portal/siswa/proyek/${project.id}/edit`}>Edit proyek ↗</Link>}</div>}

    <div className="wd-layout">
      <div className="wd-main">
        <ProjectMedia cover={cover?.url ? { src: cover.url, alt: cover.alt || `Sampul ${project.title}` } : null} gallery={[]} />

        {(isOwner || canReview) && <ProjectMentorWorkflow projectID={project.id} owner={isOwner} published={published} assignment={viewerAssignment ? { role: viewerAssignment.assignmentRole, response: viewerAssignment.response } : null} submitted={project.verificationStatus === 'submitted'} />}

        {project.details && <section className="wd-section" aria-label="Detail proyek"><h2>Tentang proyek</h2><div className="wd-prose"><RichText data={project.details} className="portfolio-richtext-content" /></div></section>}

        <ProjectMedia cover={null} gallery={gallery.filter((image) => image.url).map((image) => ({ src: image.url as string, alt: image.alt || image.filename || `Galeri ${project.title}` }))} />

        {published && <ProjectSocial projectID={project.id} isTeam={isLikeBlocked} />}

        {mentorAssignments.length > 0 && (isOwner || canReview) && <section className="wd-section"><h2>Guru pembimbing <small>{mentorAssignments.length}</small></h2><div className="pd-mentors">{mentorAssignments.map((entry, index) => { const mentor = typeof entry.mentor === 'object' && entry.mentor ? entry.mentor : null; const photo = mentor?.profilePhoto && typeof mentor.profilePhoto === 'object' ? mentor.profilePhoto.url : null; return <div className="pd-mentor" key={`${mentor?.id || index}-${index}`}><span className="wd-avatar sm">{photo ? <img src={photo} alt="" /> : (mentor?.name?.slice(0, 1).toUpperCase() || 'G')}</span><div><strong>{mentor?.name || 'Guru'}</strong><small>{entry.assignmentRole === 'primary' ? 'Mentor utama' : 'Mentor pendamping'}</small></div><span className={`pd-response pd-response--${entry.response}`}>{entry.response === 'accepted' ? 'Diterima' : entry.response === 'declined' ? 'Ditolak' : 'Menunggu'}</span></div> })}</div></section>}

        {Array.isArray(project.reviewHistory) && project.reviewHistory.length > 0 && (isOwner || canReview) && <section className="wd-section"><h2>Riwayat tinjauan <small>{project.reviewHistory.length}</small></h2><ol className="pd-timeline">{[...project.reviewHistory].reverse().map((review, index) => { const reviewer = typeof review.reviewer === 'object' && review.reviewer ? review.reviewer : null; return <li key={`${review.id || index}`} className={review.decision === 'verified' ? 'is-ok' : review.decision === 'revision-requested' ? 'is-warn' : ''}><div><strong>{reviewer?.name || 'Guru pembimbing'}</strong><span>{review.decision === 'verified' ? 'Disetujui dan diterbitkan' : review.decision === 'revision-requested' ? 'Revisi diminta' : 'Masukan'}</span>{review.reviewedAt && <time dateTime={review.reviewedAt}>{fmtDate(review.reviewedAt)}</time>}</div><p>{review.feedback}</p></li> })}</ol></section>}
      </div>

      <aside className="wd-side" aria-label="Informasi proyek">
        <section className="wd-card pd-team"><span className="wd-label">Tim proyek · {teamMembers.length}</span><ul>{teamMembers.map((member, index) => <li key={`${member.id}-${index}`}><Link href={`/siswa/${member.id}`}><span className="wd-avatar sm">{member.photo ? <img src={member.photo} alt="" /> : member.name.slice(0, 1).toUpperCase()}</span><span><strong>{member.name}</strong><small>{member.role}</small></span></Link></li>)}</ul></section>

        <section className="wd-card">
          {project.projectUrl && <a className="wd-cta" href={project.projectUrl} target="_blank" rel="noreferrer">Lihat hasil proyek <span aria-hidden="true">↗</span></a>}
          {inTeam && <Link className="wd-cta" href={`/portal/${viewerRole === 'teacher' ? 'guru' : 'siswa'}/tracker/${project.id}`}>📋 Buka tracker proyek <span aria-hidden="true">→</span></Link>}
          {inTeam && <Link className="wd-cta" href={`/portal/${viewerRole === 'teacher' ? 'guru' : 'siswa'}/pesan?room=project:${project.id}`}>💬 Chat tim proyek <span aria-hidden="true">→</span></Link>}
          <div className="wd-row"><CopyLinkButton /><Link className="wd-ghost" href="/proyek">Semua proyek</Link></div>
          {project.tools?.length ? <div className="wd-tools"><span className="wd-label">Perangkat &amp; teknologi</span><ul>{project.tools.map((tool: string) => <li key={tool}>{tool}</li>)}</ul></div> : null}
        </section>

        {published && acceptedMentors.length > 0 && <section className="wd-card wd-verified"><span className="wd-seal" aria-hidden="true">✓</span><div><strong>{verified ? 'Terverifikasi guru pembimbing' : 'Dibimbing oleh'}</strong>{acceptedMentors.map((mentor) => <Link className="wd-mentor" href={`/guru/${mentor.id}`} key={mentor.id}><span className="wd-avatar sm">{mentor.photo ? <img src={mentor.photo} alt="" /> : mentor.name.slice(0, 1).toUpperCase()}</span><span><b>{mentor.name}</b><small>{mentor.primary ? 'Mentor utama' : 'Mentor pendamping'}{verified && mentor.primary && project.verifiedAt ? ` · ${fmtDate(project.verifiedAt)}` : ''}</small></span></Link>)}</div></section>}
      </aside>
    </div>
  </article></main>
}
