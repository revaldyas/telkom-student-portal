import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const payload = await getPayload({ config })
  const response = await payload.find({ collection: 'projects', where: { status: { equals: 'published' } }, depth: 2, limit: 1000, sort: '-createdAt', overrideAccess: true })
  return <main className="lowfi-shell"><section className="lowfi-content project-hub">
    <p><Link href="/">Beranda</Link> / Proyek kolaborasi</p>
    <header className="project-hub-heading"><span className="section-kicker">KARYA BERSAMA</span><h1>Proyek kolaborasi</h1><p>Temukan karya yang dibangun bersama oleh siswa dari berbagai bidang.</p></header>
    {response.docs.length ? <div className="lowfi-work-grid">{response.docs.map((project) => {
      const cover = project.coverImage && typeof project.coverImage === 'object' ? project.coverImage : null
      const members = Array.isArray(project.members) ? project.members : []
      return <article className="lowfi-work-card" key={project.id}>
        <Link className="work-card-media" href={`/proyek/${project.slug}`}>{cover?.url ? <img src={cover.url} alt={cover.alt || `Sampul ${project.title}`} loading="lazy" /> : <span className="work-card-placeholder">Proyek kolaborasi</span>}</Link>
        <div className="work-card-body"><p className="work-card-category">{typeof project.categoryRef === 'object' && project.categoryRef ? project.categoryRef.name : 'Proyek'}{project.year ? ` / ${project.year}` : ''}</p><h2><Link href={`/proyek/${project.slug}`}>{project.title}</Link></h2><p className="project-card-summary">{project.summary}</p><div className="project-member-links">{members.map((entry, index) => { const member = typeof entry.member === 'object' ? entry.member : null; return member ? <Link key={`${project.id}-${member.id}-${index}`} href={`/siswa/${member.id}`}>{member.name}</Link> : null })}</div></div>
      </article>
    })}</div> : <div className="project-empty"><h2>Belum ada proyek yang diterbitkan</h2><p>Proyek kolaborasi siswa akan tampil di sini setelah dipublikasikan.</p></div>}
  </section></main>
}
