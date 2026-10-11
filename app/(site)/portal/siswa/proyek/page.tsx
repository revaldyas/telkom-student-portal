import config from '@payload-config'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export default async function StudentProjectsPage() {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let user: { collection?: string; role?: unknown; id: string | number } | null = null
  try { user = (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })).user }
  catch { redirect('/login') }
  if (!user || user.collection !== 'users' || user.role !== 'student') redirect('/portal')
  const response = await payload.find({ collection: 'projects', where: { createdBy: { equals: user.id } }, depth: 2, limit: 200, sort: '-updatedAt', overrideAccess: true })
  return <main className="portal-page"><header className="portal-page-heading"><div><span className="section-kicker">KARYA KOLABORATIF</span><h1>Proyek saya</h1><p>Kelola proyek bersama dan tampilkan kontribusi setiap anggota.</p></div><Link className="button button-primary" href="/portal/siswa/proyek/baru">+ Buat proyek</Link></header>
    <section className="portal-panel"><header><h2>{response.docs.length} proyek</h2><Link href="/portal/siswa">Kembali ke dashboard</Link></header>{response.docs.length ? <div className="portal-work-list">{response.docs.map((project) => { const cover = project.coverImage && typeof project.coverImage === 'object' ? project.coverImage : null; const members = Array.isArray(project.members) ? project.members : []; const status = project.status === 'published' ? 'Terbit' : project.verificationStatus === 'submitted' ? 'Menunggu verifikasi' : project.verificationStatus === 'revision-requested' ? 'Perlu revisi' : 'Draf'; return <article key={project.id}><div className="portal-work-main"><Link className="portal-work-thumb" href={`/proyek/${project.slug}`} aria-label={`Lihat ${project.title}`}>{cover?.url ? <img src={cover.url} alt={cover.alt || ''} /> : <span>{project.title.slice(0, 1).toUpperCase()}</span>}</Link><div className="portal-work-copy"><strong>{project.title}</strong><span>{members.length} anggota · {project.year}</span></div></div><div className="portal-work-actions"><span className={`portal-status ${project.status === 'published' ? 'is-published' : 'is-draft'}`}>{status}</span><Link href={`/proyek/${project.slug}`}>Lihat</Link><Link href={`/portal/siswa/proyek/${project.id}/edit`}>Edit</Link></div></article> })}</div> : <div className="portal-empty"><h3>Mulai proyek bersama</h3><p>Buat proyek, tambahkan anggota tim, lalu tuliskan kontribusi masing-masing.</p><Link className="button button-primary" href="/portal/siswa/proyek/baru">Buat proyek pertama</Link></div>}</section>
  </main>
}
