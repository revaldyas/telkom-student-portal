import config from '@payload-config'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

const idOf = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return undefined
}

export default async function TeacherPortalDashboard() {
  const token = (await cookies()).get('karyakita-session')?.value
  if (!token) redirect('/login')
  const payload = await getPayload({ config })
  let sessionUser: { collection?: string; role?: unknown; id: string | number } | null = null
  try { sessionUser = (await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: 'true' }) })).user }
  catch { redirect('/login') }
  if (!sessionUser || sessionUser.collection !== 'users' || !['student', 'teacher'].includes(String(sessionUser.role))) redirect('/login')
  if (sessionUser.role === 'student') redirect('/portal/siswa')

  const teacher = await payload.findByID({ collection: 'users', id: sessionUser.id, depth: 1, overrideAccess: true })
  const teacherClass = idOf(teacher.class)
  const teacherProgram = idOf(teacher.program)
  const queueResponse = await payload.find({
    collection: 'portfolios',
    where: { and: [{ status: { equals: 'draft' } }, { verificationStatus: { in: ['submitted', 'revision-requested'] } }] },
    depth: 3,
    limit: 500,
    sort: '-updatedAt',
    overrideAccess: true,
  })
  const queue = queueResponse.docs.filter((work) => {
    const student = work.student && typeof work.student === 'object' ? work.student as unknown as Record<string, unknown> : null
    if (!student) return false
    const studentClass = student.class && typeof student.class === 'object' ? student.class as unknown as Record<string, unknown> : null
    const studentProgram = idOf(student.program) ?? idOf(studentClass?.program)
    return Boolean((teacherClass && String(teacherClass) === String(idOf(student.class))) || (teacherProgram && String(teacherProgram) === String(studentProgram)))
  })
  const [students, published, pending, verified, allWorks, opportunities, interests] = await Promise.all([
    payload.count({ collection: 'users', where: { role: { equals: 'student' } }, overrideAccess: true }),
    payload.count({ collection: 'portfolios', where: { status: { equals: 'published' } }, overrideAccess: true }),
    payload.count({ collection: 'portfolios', where: { and: [{ status: { equals: 'draft' } }, { verificationStatus: { in: ['submitted', 'revision-requested'] } }] }, overrideAccess: true }),
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
      const programName = typeof student.program === 'object' ? student.program?.name : null
      if (programName) {
        const group = programs.get(programName) || new Set<string>()
        group.add(String(student.id)); programs.set(programName, group)
      }
    }
    const categoryName = typeof work.categoryRef === 'object' ? work.categoryRef?.name : null
    if (categoryName) categories.set(categoryName, (categories.get(categoryName) || 0) + 1)
  }
  const categoryList = [...categories.entries()].sort((a, b) => b[1] - a[1])
  const programList = [...programs.entries()].sort((a, b) => b[1].size - a[1].size)
  const percent = students.totalDocs ? Math.round(authors.size * 100 / students.totalDocs) : 0
  const firstName = teacher.name?.trim().split(/\s+/)[0] || 'Guru'
  const program = teacher.program && typeof teacher.program === 'object' ? teacher.program.name : null

  return <main className="portal-page">
    <header className="portal-hero"><span className="section-kicker">DASHBOARD GURU</span><h1>Selamat datang, {firstName}.</h1><p>{program ? `Pembimbing program ${program}.` : 'Ruang untuk memverifikasi karya dan mendampingi perkembangan siswa.'}</p><div className="portal-hero-actions"><Link className="button button-primary" href="/portal/guru/verifikasi">Buka antrean verifikasi</Link><Link className="button impact-secondary" href="/portal/guru/peluang">Kelola peluang</Link><Link className="button impact-secondary" href={`/guru/${teacher.id}`}>Lihat profil publik</Link></div></header>
    <section className="portal-impact-section">
      <header className="portal-impact-heading"><div><span className="section-kicker">RINGKASAN SEKOLAH</span><h2>Aktivitas karya dan partisipasi</h2><p>Statistik seluruh sekolah. Antrean di bawah hanya berisi karya dari kelas atau program bimbinganmu.</p></div><div className="portal-hero-actions"><Link className="button button-primary" href="/karya">Jelajahi karya</Link><Link className="button impact-secondary" href="/peluang">Lihat peluang</Link></div></header>
      <section className="impact-stats" aria-label="Ringkasan dampak">
        <article><span>SISWA TERDAFTAR</span><strong>{students.totalDocs}</strong></article>
        <article><span>SISWA BERKARYA</span><strong>{authors.size}</strong><small>{percent}% dari seluruh siswa</small></article>
        <article><span>KARYA TERBIT</span><strong>{published.totalDocs}</strong></article>
        <article><span>MENUNGGU TINJAUAN</span><strong>{pending.totalDocs}</strong></article>
        <article><span>KARYA TERVERIFIKASI</span><strong>{verified.totalDocs}</strong></article>
        <article><span>PELUANG DIBUKA</span><strong>{opportunities.totalDocs}</strong><small>{interests.totalDocs} minat siswa</small></article>
      </section>
      <section className="portal-panel portal-review-queue"><header><div><span className="section-kicker">TINJAUAN KARYA</span><h2>Antrean bimbingan</h2></div><Link href="/portal/guru/verifikasi">Buka semua ↗</Link></header>
        {queue.length ? <div className="portal-work-list">{queue.slice(0, 5).map((work) => {
          const student = work.student && typeof work.student === 'object' ? work.student : null
          return <article key={work.id}><div><strong>{work.title}</strong><span>{student?.name || 'Siswa'} · {work.verificationStatus === 'revision-requested' ? 'Perlu revisi' : 'Menunggu tinjauan'}</span></div><Link href={`/karya/${work.slug}`}>Lihat karya ↗</Link></article>
        })}</div> : <div className="portal-empty"><h3>Antrean kosong</h3><p>Karya dari program atau kelas bimbinganmu akan muncul di sini.</p></div>}
      </section>
      <section className="impact-columns">
        <article className="impact-panel"><header><div><span className="section-kicker">SEBARAN KARYA</span><h2>Kategori proyek</h2></div><span>{published.totalDocs} karya</span></header>{categoryList.length ? <div className="impact-bars">{categoryList.map(([name, count]) => <div className="impact-bar-row" key={name}><div><strong>{name}</strong><span>{count}</span></div><div className="impact-bar-track"><i style={{ width: `${Math.max(4, Math.round(count * 100 / (categoryList[0]?.[1] || 1)))}%` }} /></div></div>)}</div> : <p>Belum ada data kategori untuk ditampilkan.</p>}</article>
        <article className="impact-panel"><header><div><span className="section-kicker">PARTISIPASI</span><h2>Program keahlian</h2></div><span>{programList.length} program</span></header>{programList.length ? <ul className="impact-program-list">{programList.map(([name, studentsInProgram]) => <li key={name}><span>{name}</span><strong>{studentsInProgram.size} siswa</strong></li>)}</ul> : <p>Data partisipasi program belum tersedia.</p>}</article>
      </section>
      <p className="impact-note">Data diperbarui langsung dari aktivitas karya, verifikasi Guru, dan pendaftaran peluang.</p>
    </section>
  </main>
}
