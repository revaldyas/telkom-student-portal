import config from '@payload-config'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export default async function ImpactDashboardPage() {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let authorized = false
  try {
    const result = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })
    const user = result.user as unknown as { collection?: string; role?: unknown } | null
    authorized = Boolean(user && user.collection === 'users' && user.role === 'teacher')
  } catch { redirect('/login') }
  if (!authorized) redirect('/')

  const [students, published, pending, verified, allWorks, opportunities, interests] = await Promise.all([
    payload.count({ collection: 'users', where: { role: { equals: 'student' } }, overrideAccess: true }),
    payload.count({ collection: 'portfolios', where: { status: { equals: 'published' } }, overrideAccess: true }),
    payload.count({ collection: 'portfolios', where: { or: [{ status: { equals: 'draft' } }, { verificationStatus: { equals: 'revision-requested' } }] }, overrideAccess: true }),
    payload.count({ collection: 'portfolios', where: { verificationStatus: { equals: 'verified' } }, overrideAccess: true }),
    payload.find({ collection: 'portfolios', where: { status: { equals: 'published' } }, depth: 2, limit: 1000, overrideAccess: true }),
    payload.count({ collection: 'opportunities', where: { status: { equals: 'open' } }, overrideAccess: true }),
    payload.count({ collection: 'opportunity-interests', overrideAccess: true }),
  ])

  const authors = new Set<string>()
  const categories = new Map<string, number>()
  const programs = new Map<string, Set<string>>()
  for (const work of allWorks.docs) {
    const student = typeof work.student === 'object' ? work.student : null
    if (student) {
      authors.add(String(student.id))
      const program = typeof student.program === 'object' ? student.program?.name : null
      if (program) {
        const group = programs.get(program) || new Set<string>()
        group.add(String(student.id)); programs.set(program, group)
      }
    }
    const category = typeof work.categoryRef === 'object' ? work.categoryRef?.name : null
    if (category) categories.set(category, (categories.get(category) || 0) + 1)
  }
  const categoryList = [...categories.entries()].sort((a, b) => b[1] - a[1])
  const programList = [...programs.entries()].sort((a, b) => b[1].size - a[1].size)
  const percent = students.totalDocs ? Math.round(authors.size * 100 / students.totalDocs) : 0

  return <main className="impact-page wrap">
    <header className="impact-hero"><span className="section-kicker">DAMPAK PROGRAM</span><h1>Kreativitas yang<br /><span>bisa ditumbuhkan.</span></h1><p>Ringkasan partisipasi siswa, karya terbit, proses verifikasi, dan peluang yang sedang berjalan.</p><div className="impact-hero-actions"><Link className="button button-primary" href="/mentor">Tinjau karya</Link><Link className="button impact-secondary" href="/peluang">Kelola peluang</Link></div></header>
    <section className="impact-stats" aria-label="Ringkasan dampak">
      <article><span>SISWA TERDAFTAR</span><strong>{students.totalDocs}</strong></article>
      <article><span>SISWA BERKARYA</span><strong>{authors.size}</strong><small>{percent}% dari seluruh siswa</small></article>
      <article><span>KARYA TERBIT</span><strong>{published.totalDocs}</strong></article>
      <article><span>MENUNGGU TINJAUAN</span><strong>{pending.totalDocs}</strong></article>
      <article><span>KARYA TERVERIFIKASI</span><strong>{verified.totalDocs}</strong></article>
      <article><span>PELUANG DIBUKA</span><strong>{opportunities.totalDocs}</strong><small>{interests.totalDocs} minat siswa</small></article>
    </section>
    <section className="impact-columns">
      <article className="impact-panel"><header><div><span className="section-kicker">SEBARAN KARYA</span><h2>Kategori proyek</h2></div><span>{published.totalDocs} karya</span></header>{categoryList.length ? <div className="impact-bars">{categoryList.map(([name, count]) => <div className="impact-bar-row" key={name}><div><strong>{name}</strong><span>{count}</span></div><div className="impact-bar-track"><i style={{ width: `${Math.max(4, Math.round(count * 100 / (categoryList[0]?.[1] || 1)))}%` }} /></div></div>)}</div> : <p>Belum ada data kategori untuk ditampilkan.</p>}</article>
      <article className="impact-panel"><header><div><span className="section-kicker">PARTISIPASI</span><h2>Program keahlian</h2></div><span>{programList.length} program</span></header>{programList.length ? <ul className="impact-program-list">{programList.map(([name, studentsInProgram]) => <li key={name}><span>{name}</span><strong>{studentsInProgram.size} siswa</strong></li>)}</ul> : <p>Data partisipasi program belum tersedia.</p>}</article>
    </section>
    <p className="impact-note">Data diperbarui langsung dari aktivitas karya, verifikasi Guru, dan pendaftaran peluang.</p>
  </main>
}
