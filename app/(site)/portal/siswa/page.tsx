import config from '@payload-config'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import SkeletonImage from '../../../../components/SkeletonImage'
import DashIcon, { type DashIconName } from '../../../../components/DashIcon'
import { appearanceFromUser } from '../../../../lib/appearanceFromUser'
import '../dashboard.css'
import { workState, workStateClass, workStateLabel } from '../../../../lib/workState'

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
  const workIDs = works.map((work) => work.id)
  const [likeCount, commentCount, recentComments, projectCount, projectDrafts, opportunities] = await Promise.all([
    workIDs.length ? payload.count({ collection: 'portfolio-likes', where: { portfolio: { in: workIDs } }, overrideAccess: true }) : { totalDocs: 0 },
    workIDs.length ? payload.count({ collection: 'portfolio-comments', where: { portfolio: { in: workIDs } }, overrideAccess: true }) : { totalDocs: 0 },
    workIDs.length ? payload.find({ collection: 'portfolio-comments', where: { portfolio: { in: workIDs } }, depth: 1, limit: 5, sort: '-createdAt', overrideAccess: true }) : { docs: [] },
    payload.count({ collection: 'projects', where: { and: [{ 'members.member': { equals: sessionUser.id } }, { status: { equals: 'published' } }] }, overrideAccess: true }),
    payload.count({ collection: 'projects', where: { and: [{ createdBy: { equals: sessionUser.id } }, { status: { not_equals: 'published' } }] }, overrideAccess: true }),
    payload.find({ collection: 'opportunities', where: { status: { equals: 'open' } }, depth: 0, limit: 3, sort: '-createdAt', overrideAccess: true }),
  ])
  const published = works.filter((work) => workState(work) === 'published').length
  const drafts = works.filter((work) => workState(work) === 'draft').length
  const inReview = works.filter((work) => workState(work) === 'submitted').length
  const needsRevision = works.filter((work) => workState(work) === 'revision').length
  const studentClass = user.class && typeof user.class === 'object' ? user.class.name : null
  const program = user.program && typeof user.program === 'object' ? user.program.name : null
  const firstName = user.name?.trim().split(/\s+/)[0] || 'Siswa'
  const appearance = appearanceFromUser(user)
  const photo = user.profilePhoto && typeof user.profilePhoto === 'object' ? user.profilePhoto.url || null : null

  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date()))
  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam'
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date())
  const ago = (value: string) => {
    const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000)
    const formatter = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' })
    if (minutes < 60) return formatter.format(-Math.max(minutes, 1), 'minute')
    if (minutes < 1440) return formatter.format(-Math.round(minutes / 60), 'hour')
    return formatter.format(-Math.round(minutes / 1440), 'day')
  }

  const kpis: { label: string; value: number; icon: DashIconName; tone: string; href: string; hint: string }[] = [
    { label: 'Semua karya', value: works.length, icon: 'image', tone: 'ink', href: '/portal/siswa/karya', hint: 'Seluruh portofolio' },
    { label: 'Terbit', value: published, icon: 'check', tone: 'green', href: '/portal/siswa/karya', hint: 'Tampil di publik' },
    { label: 'Draf', value: drafts, icon: 'edit', tone: 'grey', href: '/portal/siswa/karya', hint: 'Belum diajukan' },
    { label: 'Dalam tinjauan', value: inReview, icon: 'clock', tone: 'blue', href: '/portal/siswa/karya', hint: 'Menunggu guru' },
    { label: 'Perlu revisi', value: needsRevision, icon: 'alert', tone: 'orange', href: '/portal/siswa/karya', hint: 'Ada catatan guru' },
  ]
  const todo = [
    ...works.filter((work) => workState(work) === 'revision').map((work) => ({ work, kind: 'revision' as const })),
    ...works.filter((work) => workState(work) === 'draft').map((work) => ({ work, kind: 'draft' as const })),
    ...works.filter((work) => workState(work) === 'submitted').map((work) => ({ work, kind: 'submitted' as const })),
  ].slice(0, 5)

  const checklist = [
    { done: Boolean(photo), label: 'Foto profil' },
    { done: (user.bio || '').trim().length >= 40, label: 'Bio minimal 40 karakter' },
    { done: (user.skills || []).length >= 3, label: '3 keterampilan' },
    { done: (user.interests || []).length >= 2, label: '2 minat' },
    { done: (user.experiences || []).length >= 1, label: '1 pengalaman proyek' },
  ]
  const completeness = Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100)
  const nextStep = checklist.find((item) => !item.done)

  return <main className="portal-page ds-page" style={{ ['--ds-accent' as string]: appearance.accent }}>
    <header className="ds-hero">
      <div className="ds-hero-text">
        <span className="ds-date">{today}</span>
        <h1>{greeting}, {firstName}! 👋</h1>
        <p>{[studentClass, program].filter(Boolean).join(' · ') || 'Ruang untuk mengelola profil kompetensi dan karya-karyamu.'}{appearance.tagline ? <em> · {appearance.tagline}</em> : null}</p>
        <div className="ds-hero-actions"><Link className="ds-btn ds-btn--primary" href="/portal/siswa/karya/baru"><DashIcon name="plus" size={16} />Karya baru</Link><Link className="ds-btn" href="/portal/siswa/proyek/baru">Proyek baru</Link><Link className="ds-btn" href={`/siswa/${user.id}`}>Profil publik <DashIcon name="arrow" size={14} /></Link></div>
      </div>
      <Link className={`ds-hero-avatar${appearance.avatarShape === 'rounded' ? ' is-rounded' : ''}`} href="/portal/siswa/profil" aria-label="Ubah profil">{photo ? <SkeletonImage src={photo} alt={`Foto profil ${user.name}`} /> : <span>{firstName.slice(0, 1).toUpperCase()}</span>}<small>Ubah profil</small></Link>
    </header>

    <section className="ds-kpis" aria-label="Ringkasan karya">{kpis.map((item) => <Link className={`ds-kpi ds-kpi--${item.tone}`} href={item.href} key={item.label}><span className="ds-kpi-icon"><DashIcon name={item.icon} /></span><strong>{item.value}</strong><span className="ds-kpi-label">{item.label}</span><small>{item.hint}</small></Link>)}</section>

    <div className="ds-grid">
      <div className="ds-col">
        <section className="ds-card"><header><div><h2>Perlu perhatian</h2><p>Karya yang menunggu tindakanmu atau guru</p></div>{todo.length > 0 && <Link href="/portal/siswa/karya">Semua karya →</Link>}</header>
          {todo.length ? <ul className="ds-todo">{todo.map(({ work, kind }) => <li key={work.id} className={`is-${kind}`}>
            <span className="ds-todo-icon"><DashIcon name={kind === 'revision' ? 'alert' : kind === 'draft' ? 'edit' : 'clock'} size={18} /></span>
            <div><strong>{work.title || 'Tanpa judul'}</strong><small>{kind === 'revision' ? (work.reviewFeedback ? `Catatan guru: ${work.reviewFeedback.length > 90 ? `${work.reviewFeedback.slice(0, 90)}…` : work.reviewFeedback}` : 'Guru meminta revisi.') : kind === 'draft' ? 'Draf belum diajukan. Lengkapi lalu ajukan verifikasi.' : 'Sedang ditinjau guru pembimbing.'}</small></div>
            {kind !== 'submitted' ? <Link className="ds-pill" href={`/portal/siswa/karya/${work.id}/edit`}>{kind === 'revision' ? 'Perbaiki' : 'Lanjutkan'}</Link> : <span className="ds-pill is-muted">Menunggu</span>}
          </li>)}</ul> : <div className="ds-empty"><span aria-hidden="true">🎉</span><strong>Semua beres!</strong><p>Tidak ada karya yang perlu tindakan saat ini.</p></div>}
        </section>

        <section className="ds-card"><header><div><h2>Karya terbaru</h2><p>Terakhir diperbarui</p></div><Link href="/portal/siswa/karya">Kelola →</Link></header>
          {works.length ? <ul className="ds-works">{works.slice(0, 5).map((work) => { const cover = work.coverImage && typeof work.coverImage === 'object' ? work.coverImage : null; const state = workState(work); return <li key={work.id}>
            <Link className="ds-thumb" href={state === 'published' ? `/karya/${work.slug}` : `/portal/siswa/karya/${work.id}/edit`} aria-hidden="true" tabIndex={-1}>{cover?.url ? <SkeletonImage src={cover.url} alt="" /> : <span>{(work.title || '?').slice(0, 1).toUpperCase()}</span>}</Link>
            <div><strong>{work.title || 'Tanpa judul'}</strong><small>{typeof work.categoryRef === 'object' && work.categoryRef ? work.categoryRef.name : 'Tanpa kategori'} · {work.year} · diperbarui {ago(work.updatedAt)}</small></div>
            <span className={`portal-status ${workStateClass[state]}`}>{workStateLabel[state]}</span>
            <Link className="ds-link" href={`/portal/siswa/karya/${work.id}/edit`}>Edit</Link>
          </li> })}</ul> : <div className="ds-empty"><span aria-hidden="true">🚀</span><strong>Mulai isi portofoliomu</strong><p>Tambahkan karya pertamamu agar dapat ditinjau guru dan tampil di galeri publik.</p><Link className="ds-btn ds-btn--primary" href="/portal/siswa/karya/baru">Buat karya pertama</Link></div>}
        </section>

        <section className="ds-card"><header><div><h2>Aktivitas terbaru</h2><p>Komentar pada karyamu</p></div></header>
          {recentComments.docs.length ? <ul className="ds-feed">{recentComments.docs.map((comment) => { const author = comment.student && typeof comment.student === 'object' ? comment.student : null; const target = comment.portfolio && typeof comment.portfolio === 'object' ? comment.portfolio : null; return <li key={comment.id}>
            <span className="ds-feed-dot" aria-hidden="true">{(author?.name || '?').slice(0, 1).toUpperCase()}</span>
            <div><p><strong>{author?.name || 'Siswa'}</strong> mengomentari <Link href={target ? `/karya/${target.slug}#komentar` : '#'}>{target?.title || 'karyamu'}</Link></p><q>{comment.content.length > 110 ? `${comment.content.slice(0, 110)}…` : comment.content}</q><time dateTime={comment.createdAt}>{ago(comment.createdAt)}</time></div>
          </li> })}</ul> : <div className="ds-empty is-compact"><p>Belum ada komentar. Bagikan profilmu agar karya dilihat lebih banyak orang.</p></div>}
        </section>
      </div>

      <aside className="ds-col">
        <section className="ds-card ds-impact"><header><div><h2>Dampak karyamu</h2><p>Interaksi dari komunitas</p></div></header>
          <div className="ds-impact-grid"><div><span className="ds-i ds-i--red"><DashIcon name="heart" size={18} /></span><strong>{likeCount.totalDocs}</strong><small>Suka</small></div><div><span className="ds-i ds-i--blue"><DashIcon name="chat" size={18} /></span><strong>{commentCount.totalDocs}</strong><small>Komentar</small></div><div><span className="ds-i ds-i--green"><DashIcon name="users" size={18} /></span><strong>{projectCount.totalDocs}</strong><small>Proyek tim</small></div></div>
          {projectDrafts.totalDocs > 0 && <p className="ds-note">Ada {projectDrafts.totalDocs} proyek draf. <Link href="/portal/siswa/proyek">Lanjutkan →</Link></p>}
        </section>

        <section className="ds-card"><header><div><h2>Kelengkapan profil</h2><p>Profil lengkap lebih mudah ditemukan</p></div></header>
          <div className="ds-complete"><div className="ds-ring" style={{ ['--p' as string]: `${completeness}%` }} role="img" aria-label={`Profil ${completeness} persen lengkap`}><b>{completeness}%</b></div>
            <ul>{checklist.map((item) => <li key={item.label} className={item.done ? 'is-done' : ''}><span aria-hidden="true">{item.done ? '✓' : '○'}</span>{item.label}</li>)}</ul></div>
          <Link className="ds-btn ds-btn--block" href="/portal/siswa/profil">{nextStep ? `Lengkapi: ${nextStep.label}` : 'Perbarui profil'}</Link>
        </section>

        <section className="ds-card"><header><div><h2>Peluang terbuka</h2><p>Kompetisi dan kolaborasi terbaru</p></div><Link href="/peluang">Semua →</Link></header>
          {opportunities.docs.length ? <ul className="ds-opps">{opportunities.docs.map((opportunity) => <li key={opportunity.id}><Link href={`/peluang#peluang-${opportunity.id}`}><span className="ds-i ds-i--gold"><DashIcon name="spark" size={16} /></span><div><strong>{opportunity.title}</strong><small>{opportunity.organizer || 'Peluang siswa'}{opportunity.deadline ? ` · batas ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(new Date(opportunity.deadline))}` : ''}</small></div></Link></li>)}</ul> : <div className="ds-empty is-compact"><p>Belum ada peluang yang dibuka.</p></div>}
        </section>
      </aside>
    </div>
  </main>
}
