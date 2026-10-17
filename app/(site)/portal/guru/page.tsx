import config from '@payload-config'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import DashIcon, { type DashIconName } from '../../../../components/DashIcon'
import SkeletonImage from '../../../../components/SkeletonImage'
import { appearanceFromUser } from '../../../../lib/appearanceFromUser'
import '../dashboard.css'

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

  const appearance = appearanceFromUser(teacher)
  const photo = teacher.profilePhoto && typeof teacher.profilePhoto === 'object' ? teacher.profilePhoto.url || null : null
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date()))
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam'
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date())
  const waitingDays = (value: string) => Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000))
  const revisionCount = queue.filter((work) => work.verificationStatus === 'revision-requested').length
  const waitingCount = queue.length - revisionCount

  const kpis: { label: string; value: number | string; icon: DashIconName; tone: string; href: string; hint: string }[] = [
    { label: 'Antrean bimbingan', value: queue.length, icon: 'clock', tone: 'blue', href: '/portal/guru/verifikasi', hint: `${waitingCount} menunggu · ${revisionCount} revisi` },
    { label: 'Menunggu tinjauan', value: pending.totalDocs, icon: 'alert', tone: 'orange', href: '/portal/guru/verifikasi', hint: 'Seluruh sekolah' },
    { label: 'Terverifikasi', value: verified.totalDocs, icon: 'check', tone: 'green', href: '/karya', hint: 'Karya disetujui guru' },
    { label: 'Karya terbit', value: published.totalDocs, icon: 'image', tone: 'ink', href: '/karya', hint: 'Tampil di publik' },
    { label: 'Siswa berkarya', value: authors.size, icon: 'users', tone: 'grey', href: '/leaderboard', hint: `${percent}% dari ${students.totalDocs} siswa` },
    { label: 'Peluang dibuka', value: opportunities.totalDocs, icon: 'spark', tone: 'gold', href: '/portal/guru/peluang', hint: `${interests.totalDocs} minat siswa` },
  ]

  return <main className="portal-page ds-page" style={{ ['--ds-accent' as string]: appearance.accent }}>
    <header className="ds-hero">
      <div className="ds-hero-text">
        <span className="ds-date">{today}</span>
        <h1>{greeting}, {firstName}! 👋</h1>
        <p>{program ? `Pembimbing program ${program}.` : 'Ruang untuk memverifikasi karya dan mendampingi perkembangan siswa.'}{queue.length ? <em> · {queue.length} karya menunggu perhatianmu</em> : <em> · Antrean bersih</em>}</p>
        <div className="ds-hero-actions"><Link className="ds-btn ds-btn--primary" href="/portal/guru/verifikasi"><DashIcon name="check" size={16} />Buka antrean</Link><Link className="ds-btn" href="/portal/guru/peluang">Kelola peluang</Link><Link className="ds-btn" href={`/guru/${teacher.id}`}>Profil publik <DashIcon name="arrow" size={14} /></Link></div>
      </div>
      <Link className={`ds-hero-avatar${appearance.avatarShape === 'rounded' ? ' is-rounded' : ''}`} href={`/guru/${teacher.id}`} aria-label="Lihat profil publik">{photo ? <SkeletonImage src={photo} alt={`Foto profil ${teacher.name}`} /> : <span>{firstName.slice(0, 1).toUpperCase()}</span>}<small>Profil publik</small></Link>
    </header>

    <section className="ds-kpis ds-kpis--six" aria-label="Ringkasan">{kpis.map((item) => <Link className={`ds-kpi ds-kpi--${item.tone}`} href={item.href} key={item.label}><span className="ds-kpi-icon"><DashIcon name={item.icon} /></span><strong>{item.value}</strong><span className="ds-kpi-label">{item.label}</span><small>{item.hint}</small></Link>)}</section>

    <div className="ds-grid">
      <div className="ds-col">
        <section className="ds-card"><header><div><h2>Antrean bimbingan</h2><p>Karya dari kelas atau program bimbinganmu</p></div><Link href="/portal/guru/verifikasi">Buka semua →</Link></header>
          {queue.length ? <ul className="ds-todo">{queue.slice(0, 6).map((work) => {
            const student = work.student && typeof work.student === 'object' ? work.student : null
            const revision = work.verificationStatus === 'revision-requested'
            const days = waitingDays(work.updatedAt)
            return <li key={work.id} className={revision ? 'is-revision' : days >= 3 ? 'is-draft is-late' : 'is-submitted'}>
              <span className="ds-todo-icon"><DashIcon name={revision ? 'edit' : 'clock'} size={18} /></span>
              <div><strong>{work.title}</strong><small>{student?.name || 'Siswa'} · {revision ? 'Menunggu perbaikan siswa' : 'Menunggu tinjauanmu'} · {days === 0 ? 'hari ini' : `${days} hari lalu`}{!revision && days >= 3 ? ' · perlu segera' : ''}</small></div>
              <Link className="ds-pill" href={`/karya/${work.slug}`}>{revision ? 'Lihat' : 'Tinjau'}</Link>
            </li>
          })}</ul> : <div className="ds-empty"><span aria-hidden="true">🎉</span><strong>Antrean kosong</strong><p>Karya dari program atau kelas bimbinganmu akan muncul di sini.</p></div>}
        </section>

        <section className="ds-card"><header><div><h2>Sebaran kategori</h2><p>{published.totalDocs} karya terbit di seluruh sekolah</p></div></header>
          {categoryList.length ? <div className="ds-bars">{categoryList.slice(0, 8).map(([name, count]) => <div key={name}><div><strong>{name}</strong><span>{count}</span></div><div className="ds-bar"><i style={{ width: `${Math.max(4, Math.round(count * 100 / (categoryList[0]?.[1] || 1)))}%` }} /></div></div>)}</div> : <div className="ds-empty is-compact"><p>Belum ada data kategori untuk ditampilkan.</p></div>}
        </section>
      </div>

      <aside className="ds-col">
        <section className="ds-card"><header><div><h2>Partisipasi siswa</h2><p>Siswa yang sudah menerbitkan karya</p></div></header>
          <div className="ds-complete"><div className="ds-ring" style={{ ['--p' as string]: `${percent}%` }} role="img" aria-label={`${percent} persen siswa berkarya`}><b>{percent}%</b></div>
            <ul className="ds-stats"><li><strong>{authors.size}</strong> siswa berkarya</li><li><strong>{students.totalDocs}</strong> siswa terdaftar</li><li><strong>{programList.length}</strong> program keahlian</li></ul></div>
        </section>

        <section className="ds-card"><header><div><h2>Program keahlian</h2><p>Jumlah siswa berkarya</p></div></header>
          {programList.length ? <ul className="ds-programs">{programList.map(([name, studentsInProgram]) => <li key={name}><span><DashIcon name="school" size={16} />{name}</span><strong>{studentsInProgram.size}</strong></li>)}</ul> : <div className="ds-empty is-compact"><p>Data partisipasi program belum tersedia.</p></div>}
        </section>

        <section className="ds-card ds-shortcuts"><header><div><h2>Pintasan</h2></div></header>
          <Link href="/karya"><DashIcon name="image" size={17} />Jelajahi karya <DashIcon name="arrow" size={14} /></Link>
          <Link href="/peluang"><DashIcon name="spark" size={17} />Lihat peluang publik <DashIcon name="arrow" size={14} /></Link>
          <Link href="/leaderboard"><DashIcon name="trophy" size={17} />Leaderboard <DashIcon name="arrow" size={14} /></Link>
        </section>
        <p className="ds-foot">Data diperbarui langsung dari aktivitas karya, verifikasi guru, dan pendaftaran peluang.</p>
      </aside>
    </div>
  </main>
}
