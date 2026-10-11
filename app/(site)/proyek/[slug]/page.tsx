import config from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { getPayload } from 'payload'
import ProjectMentorWorkflow from './ProjectMentorWorkflow'

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
  if (project.status !== 'published' && !isOwner && !canReview) notFound()
  const cover = project.coverImage && typeof project.coverImage === 'object' ? project.coverImage : null
  const gallery = Array.isArray(project.galleryImages) ? project.galleryImages.flatMap((image) => image && typeof image === 'object' ? [image] : []) : []
  const members = Array.isArray(project.members) ? project.members : []
  const category = project.categoryRef && typeof project.categoryRef === 'object' ? project.categoryRef.name : 'Proyek kolaborasi'
  return <main className="lowfi-shell"><article className="lowfi-content project-detail-page">
    <p><Link href="/proyek">Proyek kolaborasi</Link> / {project.title}</p>
    <header className="project-detail-heading"><span className="section-kicker">{category}{project.year ? ` · ${project.year}` : ''}</span><h1>{project.title}</h1><p>{project.summary}</p>{project.status !== 'published' && <div className="project-draft-status"><strong>{project.verificationStatus === 'submitted' ? 'MENUNGGU VERIFIKASI' : project.verificationStatus === 'revision-requested' ? 'PERLU REVISI' : 'PROYEK DRAF'}</strong><span>Proyek privat untuk tim dan Guru pembimbing.</span>{project.reviewFeedback && <p>Catatan terakhir: {project.reviewFeedback}</p>}{isOwner && <Link href={`/portal/siswa/proyek/${project.id}/edit`}>Edit proyek ↗</Link>}</div>}</header>
    {mentorAssignments.length > 0 && (isOwner || canReview) && <section className="project-review-history"><h2>Guru pembimbing</h2><div className="project-members-grid">{mentorAssignments.map((entry, index) => { const mentor = typeof entry.mentor === 'object' && entry.mentor ? entry.mentor : null; return <article className="project-member-card" key={`${mentor?.id || index}-${index}`}>{mentor?.profilePhoto && typeof mentor.profilePhoto === 'object' ? <img src={mentor.profilePhoto.url || ''} alt="" /> : <span className="project-member-initial">{mentor?.name?.slice(0, 1).toUpperCase() || 'G'}</span>}<span><strong>{mentor?.name || 'Guru'}</strong><small>{entry.assignmentRole === 'primary' ? 'Mentor utama' : 'Mentor pendamping'} · {entry.response === 'accepted' ? 'Undangan diterima' : entry.response === 'declined' ? 'Undangan ditolak' : 'Menunggu jawaban'}</small></span></article> })}</div></section>}
    {(isOwner || canReview) && <ProjectMentorWorkflow projectID={project.id} owner={isOwner} published={project.status === 'published'} assignment={viewerAssignment ? { role: viewerAssignment.assignmentRole, response: viewerAssignment.response } : null} submitted={project.verificationStatus === 'submitted'} />}
    {Array.isArray(project.reviewHistory) && project.reviewHistory.length > 0 && <section className="project-review-history"><h2>Riwayat tinjauan</h2>{[...project.reviewHistory].reverse().map((review, index) => { const reviewer = typeof review.reviewer === 'object' && review.reviewer ? review.reviewer : null; return <article key={`${review.id || index}`}><p><strong>{reviewer?.name || 'Guru pembimbing'}</strong><span>{review.decision === 'verified' ? ' · Disetujui dan diterbitkan' : review.decision === 'revision-requested' ? ' · Revisi diminta' : ' · Masukan'}{review.reviewedAt ? ` · ${new Date(review.reviewedAt).toLocaleDateString('id-ID')}` : ''}</span></p><p>{review.feedback}</p></article> })}</section>}
    {cover?.url && <img className="project-detail-cover" src={cover.url} alt={cover.alt || `Sampul ${project.title}`} />}
    <section className="project-members-section"><h2>Tim proyek</h2><div className="project-members-grid">{members.map((entry, index) => { const member = typeof entry.member === 'object' ? entry.member : null; if (!member) return null; const photo = typeof member.profilePhoto === 'object' && member.profilePhoto ? member.profilePhoto.url : null; return <Link className="project-member-card" href={`/siswa/${member.id}`} key={`${member.id}-${index}`}>{photo ? <img src={photo} alt="" /> : <span className="project-member-initial">{member.name?.slice(0, 1).toUpperCase()}</span>}<span><strong>{member.name}</strong><small>{entry.contribution}</small></span></Link> })}</div></section>
    {project.details && <section className="portfolio-richtext project-richtext"><h2>Detail proyek</h2><RichText data={project.details} className="portfolio-richtext-content" /></section>}
    {gallery.length > 0 && <section className="work-gallery project-gallery"><h2>Galeri proyek</h2><div className="work-gallery-grid">{gallery.map((image, index) => <img className="work-gallery-image" key={image.id || index} src={image.url || ''} alt={image.alt || image.filename || `Galeri ${project.title}`} loading="lazy" />)}</div></section>}
    <div className="project-detail-meta">{project.tools?.length ? <p><strong>Perangkat & teknologi yang digunakan:</strong> {project.tools.join(', ')}</p> : null}{project.projectUrl && <a href={project.projectUrl} target="_blank" rel="noreferrer">Lihat hasil proyek ↗</a>}</div>
  </article></main>
}
