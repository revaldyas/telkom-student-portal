import config from '@payload-config'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import SkeletonImage from '../../../../../components/SkeletonImage'

export const dynamic = 'force-dynamic'

export default async function StudentWorksPage() {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let user: { collection?: string; role?: unknown; id: string | number } | null = null
  try { user = (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })).user }
  catch { redirect('/login') }
  if (!user || user.collection !== 'users' || !['student', 'teacher'].includes(String(user.role))) redirect('/login')
  if (user.role === 'teacher') redirect('/portal/guru')
  const response = await payload.find({ collection: 'portfolios', where: { student: { equals: user.id } }, depth: 1, limit: 200, sort: '-updatedAt', overrideAccess: true })
  return <main className="portal-page">
    <header className="portal-page-heading"><div><span className="section-kicker">PORTOFOLIO SISWA</span><h1>Karya saya</h1><p>Periksa status tinjauan dan buka detail karya. Karya draf hanya dapat dilihat olehmu dan Guru pembimbing.</p></div><Link className="button button-primary" href="/portal/siswa/karya/baru">+ Buat karya</Link></header>
    <section className="portal-panel"><header><h2>{response.docs.length} karya</h2><Link href="/portal/siswa">Kembali ke dashboard</Link></header>
      {response.docs.length ? <div className="portal-work-list">{response.docs.map((work) => { const cover = work.coverImage && typeof work.coverImage === 'object' ? work.coverImage : null; return <article key={work.id}><div className="portal-work-main"><Link className="portal-work-thumb" href={`/karya/${work.slug}`} aria-label={`Lihat ${work.title}`}>{cover?.url ? <SkeletonImage src={cover.url} alt={cover.alt || `Sampul ${work.title}`} /> : <span aria-hidden="true">{work.title.slice(0, 1).toUpperCase()}</span>}</Link><div className="portal-work-copy"><strong>{work.title}</strong><span>{typeof work.categoryRef === 'object' && work.categoryRef ? work.categoryRef.name : 'Portofolio'} · {work.year}</span></div></div><div className="portal-work-actions"><span className={`portal-status ${work.status === 'published' ? 'is-published' : work.verificationStatus === 'revision-requested' ? 'is-revision' : 'is-draft'}`}>{work.status === 'published' ? 'Terbit' : work.verificationStatus === 'revision-requested' ? 'Perlu revisi' : 'Menunggu verifikasi'}</span><Link href={`/karya/${work.slug}`}>Lihat karya ↗</Link><Link href={`/portal/siswa/karya/${work.id}/edit`}>Edit</Link></div></article> })}</div> : <div className="portal-empty"><p>Kamu belum menambahkan karya.</p><Link className="button button-primary" href="/portal/siswa/karya/baru">Buat karya pertama</Link></div>}
    </section>
  </main>
}
