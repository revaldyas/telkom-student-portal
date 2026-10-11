import config from '@payload-config'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import SkeletonImage from '../../../../components/SkeletonImage'

export const dynamic = 'force-dynamic'

export default async function StudentPortalDashboard() {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let sessionUser: { collection?: string; role?: unknown; id: string | number } | null = null
  try {
    const auth = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })
    sessionUser = auth.user
  } catch {
    return <main className="portal-page"><h1>Dashboard belum dapat dibuka</h1><p>Sesi belum bisa diperiksa. Muat ulang halaman untuk mencoba lagi.</p><Link className="button button-primary" href="/portal/siswa">Coba lagi</Link></main>
  }
  if (!sessionUser || sessionUser.collection !== 'users' || !['student', 'teacher'].includes(String(sessionUser.role))) redirect('/login')
  if (sessionUser.role === 'teacher') redirect('/portal/guru')

  const [user, response] = await Promise.all([
    payload.findByID({ collection: 'users', id: sessionUser.id, depth: 1, overrideAccess: true }),
    payload.find({ collection: 'portfolios', where: { student: { equals: sessionUser.id } }, depth: 1, limit: 100, sort: '-updatedAt', overrideAccess: true }),
  ])
  const works = response.docs
  const published = works.filter((work) => work.status === 'published').length
  const drafts = works.filter((work) => work.status !== 'published').length
  const needsRevision = works.filter((work) => work.verificationStatus === 'revision-requested').length
  const studentClass = user.class && typeof user.class === 'object' ? user.class.name : null
  const program = user.program && typeof user.program === 'object' ? user.program.name : null
  const firstName = user.name?.trim().split(/\s+/)[0] || 'Siswa'

  return <main className="portal-page">
    <header className="portal-hero"><span className="section-kicker">DASHBOARD SISWA</span><h1>Halo, {firstName}.</h1><p>{[studentClass, program].filter(Boolean).join(' · ') || 'Ruang untuk mengelola profil kompetensi dan karya-karyamu.'}</p><div className="portal-hero-actions"><Link className="button button-primary" href="/portal/siswa/karya">Kelola karya</Link><Link className="button impact-secondary" href="/portal/siswa/proyek">Proyek kolaborasi</Link><Link className="button impact-secondary" href={`/siswa/${user.id}`}>Lihat profil publik</Link></div></header>
    <section className="portal-stat-grid" aria-label="Ringkasan karya"><article><small>SEMUA KARYA</small><strong>{works.length}</strong></article><article><small>SUDAH TERBIT</small><strong>{published}</strong></article><article><small>DALAM TINJAUAN</small><strong>{drafts}</strong></article><article><small>PERLU REVISI</small><strong>{needsRevision}</strong></article></section>
    <section className="portal-panel"><header><div><span className="section-kicker">PORTOFOLIO</span><h2>Karya terbaru</h2></div><Link href="/portal/siswa/karya">Semua karya ↗</Link></header>
      {works.length ? <div className="portal-work-list">{works.slice(0, 5).map((work) => { const cover = work.coverImage && typeof work.coverImage === 'object' ? work.coverImage : null; return <article key={work.id}><div className="portal-work-main"><Link className="portal-work-thumb" href={`/karya/${work.slug}`} aria-label={`Lihat ${work.title}`}>{cover?.url ? <SkeletonImage src={cover.url} alt={cover.alt || `Sampul ${work.title}`} /> : <span aria-hidden="true">{work.title.slice(0, 1).toUpperCase()}</span>}</Link><div className="portal-work-copy"><strong>{work.title}</strong><span>{typeof work.categoryRef === 'object' && work.categoryRef ? work.categoryRef.name : 'Portofolio'} · {work.year}</span></div></div><div className="portal-work-actions"><span className={`portal-status ${work.status === 'published' ? 'is-published' : work.verificationStatus === 'revision-requested' ? 'is-revision' : 'is-draft'}`}>{work.status === 'published' ? 'Terbit' : work.verificationStatus === 'revision-requested' ? 'Perlu revisi' : 'Menunggu verifikasi'}</span><Link href={`/karya/${work.slug}`}>Lihat</Link><Link href={`/portal/siswa/karya/${work.id}/edit`}>Edit</Link></div></article> })}</div> : <div className="portal-empty"><h3>Mulai isi portofoliomu</h3><p>Tambahkan karya pertamamu agar dapat ditinjau Guru dan tampil di galeri publik.</p><Link className="button button-primary" href="/portal/siswa/karya/baru">Buat karya pertama</Link></div>}
    </section>
  </main>
}
