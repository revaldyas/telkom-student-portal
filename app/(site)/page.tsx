'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade, Keyboard } from 'swiper/modules'
import type { Swiper as SwiperInstance } from 'swiper'
import 'swiper/css'
import 'swiper/css/effect-fade'
import { displayTitle } from '../../lib/displayTitle'
import { siteFetch } from '../../lib/siteFetch'
import { AwardCardsSkeleton, HeroSkeleton, LeaderboardSkeleton, WorkGridSkeleton } from '../../components/SiteSkeletons'
import SkeletonImage from '../../components/SkeletonImage'

const MotionLink = motion.create(Link)

function RevealLink({ href, children }: { href: string; children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion()

  return <MotionLink
    className="section-link"
    href={href}
    initial={shouldReduceMotion ? false : { opacity: 0, y: 16, scale: 0.96 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 18 }}
  >{children}</MotionLink>
}

type Portfolio = {
  id: string | number
  slug: string
  title: string
  summary: string
  student?: { id: string | number; name?: string; profilePhoto?: string | null; class?: { name?: string } | null; program?: { name?: string; code?: string } | null } | string | number | null
  categoryRef?: { name?: string; code?: string } | string | number
  year?: number
  coverImage?: { url?: string } | string | number
  likes?: number
  comments?: number
  isNominee?: boolean
  verificationStatus?: string
}
type RecentProject = { likes?: number; comments?: number; id: string | number; slug: string; title: string; summary?: string; year?: number; category?: string | null; coverImage: string | null; coverAlt?: string | null; members: { id: string | number; name?: string; profilePhoto: string | null }[] }
type RecentOpportunity = { id: string | number; title: string; type: string; organizer: string; summary: string; deadline?: string | null; coverImage: string | null; coverAlt?: string | null }
type Testimonial = { id: string | number; quote: string; name: string; role: string; program: string | null; isSample: boolean }
type Award = { id: string | number; title: string; description: string; opensAt: string; closesAt: string; nominees?: { id: string | number; title: string; slug: string; coverImage: string | null }[] }
type Leader = { id: string; name: string; profilePhoto: string | null; likes: number; comments: number; score?: number }
type RankedPortfolio = { id: string; slug: string; title: string; studentID?: string; studentName: string; profilePhoto: string | null; coverImage: string | null; likes: number; comments: number; isNominee?: boolean }
type Board = { topLikes: RankedPortfolio[]; trending: RankedPortfolio[]; topOverall: Leader[] }
type HeroSlide = { key: string; eyebrow: string; title: string; description: string; image: string | null; href: string; action: string; secondaryHref?: string | null; secondaryAction?: string | null }
type StudyShortcut = { id: string | number; name: string; code?: string }
const idOf = (value: Portfolio['student']) => typeof value === 'object' && value ? value.id : value
const nameOf = (value: Portfolio['student']) => typeof value === 'object' && value ? value.name || 'Siswa' : 'Siswa'
const photoOf = (value: Portfolio['student']) => typeof value === 'object' && value ? value.profilePhoto || null : null
// Nama kelas lengkap (mis. "X PPLG 1"), bukan hanya tingkatnya.
const studentStudyInfo = (value: Portfolio['student']) => typeof value === 'object' && value ? (value.class?.name || '').trim() : ''
const opportunityTypeLabel: Record<string, string> = { competition: 'Kompetisi', exhibition: 'Pameran', challenge: 'Tantangan proyek', mentoring: 'Mentoring', collaboration: 'Kolaborasi industri', other: 'Peluang' }
const selectRecentByProgram = (works: Portfolio[]) => {
  const perProgram = new Map<string, Portfolio[]>()
  for (const work of works) {
    const code = typeof work.student === 'object' && work.student ? work.student.program?.code : undefined
    if (!code) continue
    const group = perProgram.get(code) || []
    if (group.length < 2) group.push(work)
    perProgram.set(code, group)
  }
  const selectedIDs = new Set([...perProgram.values()].flat().map((work) => String(work.id)))
  for (const work of works) {
    if (selectedIDs.size >= 10) break
    selectedIDs.add(String(work.id))
  }
  return works.filter((work) => selectedIDs.has(String(work.id)))
}
const mvsRank = (board: Board | null, id: string | number | null | undefined) => {
  if (id === undefined || !board) return 0
  const rank = board.topOverall.findIndex((student) => String(student.id) === String(id))
  return rank >= 0 && rank < 3 && (board.topOverall[rank].score || 0) > 0 ? rank + 1 : 0
}

export default function Home() {
  const router = useRouter()
  const [role, setRole] = useState('')
  const [myLikes, setMyLikes] = useState<Record<string, string | number>>({})
  const [likeBusy, setLikeBusy] = useState('')
  const [likeNotice, setLikeNotice] = useState('')
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [projects, setProjects] = useState<RecentProject[]>([])
  const [opportunities, setOpportunities] = useState<RecentOpportunity[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [awards, setAwards] = useState<Award[]>([])
  const [totals, setTotals] = useState<{ portfolios?: number; projects?: number; opportunities?: number; awards?: number }>({})
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([])
  const [studyShortcuts, setStudyShortcuts] = useState<StudyShortcut[]>([])
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [boardLoading, setBoardLoading] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)
  const shouldReduceMotion = useReducedMotion()
  const heroSwiperRef = useRef<SwiperInstance | null>(null)
  const recentTrackRef = useRef<SwiperInstance | null>(null)
  const recentProjectsTrackRef = useRef<SwiperInstance | null>(null)
  const recentOpportunitiesTrackRef = useRef<SwiperInstance | null>(null)
  const awardTrackRef = useRef<SwiperInstance | null>(null)
  const testimonialTrackRef = useRef<SwiperInstance | null>(null)

  const navigateSwiper = (swiper: SwiperInstance | null, direction: -1 | 1) => {
    if (direction < 0) swiper?.slidePrev()
    else swiper?.slideNext()
  }
  const slideRecentWorks = (direction: -1 | 1) => navigateSwiper(recentTrackRef.current, direction)
  const slideRecentProjects = (direction: -1 | 1) => navigateSwiper(recentProjectsTrackRef.current, direction)
  const slideRecentOpportunities = (direction: -1 | 1) => navigateSwiper(recentOpportunitiesTrackRef.current, direction)
  const slideAwards = (direction: -1 | 1) => navigateSwiper(awardTrackRef.current, direction)
  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setRole(data?.user?.role || ''))
      .catch(() => setRole(''))
  }, [])

  // Karya di beranda yang sudah disukai user (satu permintaan untuk semua kartu).
  const portfolioIDs = portfolios.map((work) => work.id).join(',')
  useEffect(() => {
    if ((role !== 'student' && role !== 'teacher') || !portfolioIDs) return
    let cancelled = false
    siteFetch(`/api/portfolio-likes?where[portfolio][in]=${portfolioIDs}&limit=100&depth=0`, { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled || !data) return
        setMyLikes(Object.fromEntries((data.docs || []).map((like: { id: string | number; portfolio: { id: string | number } | string | number }) => [String(typeof like.portfolio === 'object' ? like.portfolio.id : like.portfolio), like.id])))
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [role, portfolioIDs])

  async function toggleLike(work: Portfolio) {
    setLikeNotice('')
    if (!role) { router.push('/login'); return }
    if (role !== 'student' && role !== 'teacher') { setLikeNotice('Masuk untuk menyukai karya.'); return }
    const key = String(work.id)
    if (likeBusy) return
    const existing = myLikes[key]
    const change = (delta: number) => setPortfolios((current) => current.map((item) => String(item.id) === key ? { ...item, likes: Math.max(0, (item.likes ?? 0) + delta) } : item))
    setLikeBusy(key)
    change(existing ? -1 : 1)
    try {
      const response = existing
        ? await siteFetch(`/api/portfolio-likes/${existing}`, { method: 'DELETE' })
        : await siteFetch('/api/portfolio-likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portfolio: work.id }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.errors?.[0]?.message || data.message || 'Suka belum berhasil disimpan.')
      setMyLikes((current) => { const next = { ...current }; if (existing) delete next[key]; else next[key] = data.doc?.id ?? 'liked'; return next })
    } catch (error) {
      change(existing ? 1 : -1)
      setLikeNotice(error instanceof Error ? error.message : 'Suka belum berhasil disimpan.')
    } finally { setLikeBusy('') }
  }

  useEffect(() => {
    fetch('/api/community/feed?limit=1000').then((response) => response.ok ? response.json() : null).then((feed) => {
      setPortfolios(selectRecentByProgram(feed?.portfolios || []))
      setProjects(feed?.projects || [])
      setOpportunities(feed?.opportunities || [])
      setAwards(feed?.awards || [])
      setTestimonials(feed?.testimonials || [])
      setHeroSlides(feed?.heroSlides || [])
      setTotals(feed?.totals || {})
    }).catch(() => {}).finally(() => setLoading(false))
    fetch('/api/programs?limit=100&sort=name').then((response) => response.ok ? response.json() : null).then((programData) => {
      const programs: StudyShortcut[] = (programData?.docs || []).map((item: { id: string | number; name: string; code?: string }) => ({ id: item.id, name: item.name, code: item.code }))
      setStudyShortcuts(programs)
    }).catch(() => {})
    fetch('/api/community/leaderboard').then((response) => response.ok ? response.json() : null).then(setBoard).catch(() => {}).finally(() => setBoardLoading(false))
  }, [])

  const slides = heroSlides

  useEffect(() => {
    if (activeSlide >= slides.length) {
      setActiveSlide(0)
      heroSwiperRef.current?.slideTo(0)
    }
  }, [activeSlide, slides.length])

  const pauseHeroSlider = () => {
    heroSwiperRef.current?.autoplay?.stop()
  }
  const resumeHeroSlider = () => {
    if (!shouldReduceMotion) heroSwiperRef.current?.autoplay?.start()
  }

  return <main className="home-page">
    {loading ? <HeroSkeleton /> : slides.length > 0 && <section className="home-slider" aria-label="Sorotan TEL-CREATION" onMouseEnter={pauseHeroSlider} onMouseLeave={resumeHeroSlider} onFocusCapture={pauseHeroSlider} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) resumeHeroSlider() }}>
      <Swiper
        className="home-hero-swiper"
        modules={[Autoplay, EffectFade, Keyboard]}
        slidesPerView={1}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={600}
        loop={slides.length > 1}
        keyboard={{ enabled: true, onlyInViewport: true }}
        autoplay={slides.length > 1 && !shouldReduceMotion ? { delay: 7000, disableOnInteraction: false } : false}
        onSwiper={(swiper) => { heroSwiperRef.current = swiper }}
        onSlideChange={(swiper) => setActiveSlide(swiper.realIndex)}
      >
        {slides.map((slide, index) => <SwiperSlide className={`home-slide${index === activeSlide ? ' is-active' : ''}`} key={slide.key} aria-hidden={index !== activeSlide} inert={index !== activeSlide}>
          <div className="home-slide-content">
            <span className="home-slide-eyebrow"><i />{slide.eyebrow}</span>
            <h1>{slide.title}</h1>
            <p>{slide.description}</p>
            <div className="home-slide-actions"><Link className="button button-primary" href={slide.href}>{slide.action}<span aria-hidden="true">↗</span></Link>{slide.secondaryHref && slide.secondaryAction && <Link className="button button-glass" href={slide.secondaryHref}>{slide.secondaryAction}</Link>}</div>
          </div>
          <div className="home-slide-media">{slide.image ? <SkeletonImage className="home-slide-image" src={slide.image} alt={`Sampul ${slide.title}`} /> : <span className="home-slide-media-placeholder" aria-hidden="true" />}</div>
        </SwiperSlide>)}
      </Swiper>
      {slides.length > 1 && <div className="home-slider-controls"><button type="button" aria-label="Sorotan sebelumnya" onClick={() => heroSwiperRef.current?.slidePrev()}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button><div>{slides.map((slide, index) => <button key={slide.key} type="button" aria-label={`Tampilkan sorotan ${index + 1}`} aria-current={activeSlide === index} onClick={() => heroSwiperRef.current?.slideToLoop(index)} />)}</div><button type="button" aria-label="Sorotan berikutnya" onClick={() => heroSwiperRef.current?.slideNext()}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></div>}
    </section>}

    {!loading && <section className="home-stats" aria-label="Ringkasan portal">
      <dl>
        <div><dd>{totals.portfolios ?? '—'}</dd><dt>karya terbit</dt></div>
        <div><dd>{totals.projects ?? '—'}</dd><dt>proyek kolaborasi</dt></div>
        <div><dd>{totals.opportunities ?? '—'}</dd><dt>peluang dibuka</dt></div>
        <div><dd>{totals.awards ?? '—'}</dd><dt>penghargaan</dt></div>
      </dl>
    </section>}

    <section className="home-index" aria-labelledby="home-index-title">
      <h2 id="home-index-title">Isi portal</h2>
      <ol>
        <li><Link href="/karya"><span className="home-index-no">01</span><strong>Karya</strong><span className="home-index-desc">Portofolio individu: desain, kode, foto, video. Bisa disaring per jurusan dan tahun.</span><span className="home-index-go">{totals.portfolios !== undefined ? `${totals.portfolios} karya` : 'Buka'} →</span></Link></li>
        <li><Link href="/proyek"><span className="home-index-no">02</span><strong>Proyek</strong><span className="home-index-desc">Pekerjaan tim lintas jurusan, lengkap dengan anggota dan perannya.</span><span className="home-index-go">{totals.projects !== undefined ? `${totals.projects} proyek` : 'Buka'} →</span></Link></li>
        <li><Link href="/peluang"><span className="home-index-no">03</span><strong>Peluang</strong><span className="home-index-desc">Lomba, pameran, dan tantangan dari guru serta mitra industri.</span><span className="home-index-go">{totals.opportunities !== undefined ? `${totals.opportunities} dibuka` : 'Buka'} →</span></Link></li>
        <li><Link href="/awards"><span className="home-index-no">04</span><strong>Penghargaan</strong><span className="home-index-desc">Voting karya terbaik dan peringkat kreator dengan interaksi terbanyak.</span><span className="home-index-go">{totals.awards !== undefined ? `${totals.awards} voting` : 'Buka'} →</span></Link></li>
      </ol>
    </section>

    <section className="home-note">
      <p>TEL-CREATION adalah tempat siswa SMK Telkom menyimpan hasil belajarnya. Guru memverifikasi, teman memberi komentar, dan mitra industri bisa melihat prosesnya, bukan hanya hasil akhirnya.</p>
      <Link href="/register">Daftar dengan akun siswa →</Link>
    </section>

    {studyShortcuts.length > 0 && <section className="home-programs" aria-label="Jelajahi jurusan">
      <span>Lihat karya per jurusan</span>
      <div>{studyShortcuts.map((item) => <Link key={item.id} href={`/karya?program=${encodeURIComponent(String(item.id))}`} title={item.name}>{item.code || item.name}</Link>)}</div>
    </section>}

    <section className="home-section" id="karya"><div className="section-heading"><div><h2>Karya <span className="home-recent-title-accent">Terbaru</span></h2></div><div className="home-heading-controls"><button className="home-recent-arrow" type="button" aria-label="Karya sebelumnya" disabled={loading} onClick={() => slideRecentWorks(-1)}>‹</button><button className="home-recent-arrow" type="button" aria-label="Karya berikutnya" disabled={loading} onClick={() => slideRecentWorks(1)}>›</button></div></div>
      {likeNotice && <p className="home-like-notice" role="status">{likeNotice}</p>}
      <div className="home-recent-carousel home-works-carousel"><div className="home-recent-all"><RevealLink href="/karya">Lihat semua{totals.portfolios !== undefined ? ` ${totals.portfolios}` : ''} karya <span>↗</span></RevealLink></div>
      {loading ? <WorkGridSkeleton count={4} className="home-recent-track home-works-track" /> : portfolios.length ? <Swiper
        className="home-recent-track home-works-track"
        modules={[Keyboard]}
        slidesPerView={4}
        spaceBetween={18}
        breakpoints={{ 0: { slidesPerView: 1 }, 431: { slidesPerView: 2 }, 601: { slidesPerView: 3 }, 1000: { slidesPerView: 4 } }}
        keyboard={{ enabled: true, onlyInViewport: true }}
        onSwiper={(swiper) => { recentTrackRef.current = swiper }}
        aria-label="Karya terbaru siswa"
        tabIndex={0}
      >{portfolios.map((work) => {
        const image = typeof work.coverImage === 'object' && work.coverImage ? work.coverImage.url : null
        const studentID = idOf(work.student)
        const photo = photoOf(work.student)
        const rank = mvsRank(board, studentID)
        const studyInfo = studentStudyInfo(work.student)
        const author = <>{photo ? <span className="mvs-avatar"><SkeletonImage src={photo} alt="" loading="lazy" /></span> : <span className="mvs-avatar work-author-placeholder">{nameOf(work.student).slice(0, 1).toUpperCase()}</span>}<span className="work-author-details"><span className="work-author-name">{nameOf(work.student)}{rank > 0 && <small className="work-author-rank">MVS #{rank}</small>}</span>{studyInfo && <small className="work-author-major">{studyInfo}</small>}</span></>
        const liked = Boolean(myLikes[String(work.id)])
        const category = typeof work.categoryRef === 'object' ? work.categoryRef?.name || work.categoryRef?.code : 'Karya'
        return <SwiperSlide key={work.id}><article className="kr-card">
          <div className="kr-media"><Link className="kr-cover" href={`/karya/${work.slug}`} tabIndex={-1} aria-hidden="true">{image ? <SkeletonImage src={image} alt="" /> : <span className="kr-placeholder">Telkom Student Creation</span>}</Link>
            <span className="kr-category">{category}</span>{work.isNominee && <span className="kr-nominee">★ NOMINEE</span>}
            <span className="kr-actions"><button type="button" className="kr-like" aria-pressed={liked} aria-label={`${liked ? 'Batal suka' : 'Suka'} (${work.likes ?? 0} suka)`} disabled={likeBusy === String(work.id)} onClick={() => void toggleLike(work)}><span aria-hidden="true">{liked ? '♥' : '♡'}</span>{work.likes ?? 0}</button><Link className="kr-comments" href={`/karya/${work.slug}#komentar`} aria-label={`${work.comments ?? 0} komentar, buka bagian komentar`}><span aria-hidden="true">◉</span>{work.comments ?? 0}</Link></span></div>
          <div className="kr-body"><h3><Link href={`/karya/${work.slug}`} title={displayTitle(work.title, nameOf(work.student))}>{displayTitle(work.title, nameOf(work.student))}</Link></h3>
            <p className="kr-author">{studentID ? <Link href={`/siswa/${studentID}`}>{author}</Link> : <span>{author}</span>}</p></div>
        </article></SwiperSlide>
      })}</Swiper> : <p>Belum ada karya terbit.</p>}
      </div>
    </section>

    <section className="home-section home-projects-section" id="proyek-terbaru"><div className="section-heading"><div><h2>Proyek <span className="home-recent-title-accent">Terbaru</span></h2></div><div className="home-heading-controls"><button className="home-recent-arrow" type="button" aria-label="Proyek sebelumnya" disabled={loading} onClick={() => slideRecentProjects(-1)}>‹</button><button className="home-recent-arrow" type="button" aria-label="Proyek berikutnya" disabled={loading} onClick={() => slideRecentProjects(1)}>›</button></div></div>
      <div className="home-recent-carousel home-projects-carousel"><div className="home-recent-all"><RevealLink href="/proyek">Lihat semua{totals.projects !== undefined ? ` ${totals.projects}` : ''} proyek <span>↗</span></RevealLink></div>
      {loading ? <WorkGridSkeleton count={4} className="home-recent-track home-project-track" /> : projects.length ? <Swiper
        className="home-recent-track home-project-track"
        modules={[Keyboard]}
        slidesPerView={4}
        spaceBetween={18}
        breakpoints={{ 0: { slidesPerView: 1 }, 431: { slidesPerView: 2 }, 601: { slidesPerView: 3 }, 1000: { slidesPerView: 4 } }}
        keyboard={{ enabled: true, onlyInViewport: true }}
        onSwiper={(swiper) => { recentProjectsTrackRef.current = swiper }}
        aria-label="Proyek kolaborasi terbaru"
        tabIndex={0}
      >{projects.map((project) => {
        const firstMember = project.members[0]
        const memberName = firstMember?.name || 'Siswa Telkom'
        return <SwiperSlide key={project.id}><article className="kr-card">
          <div className="kr-media"><Link className="kr-cover" href={`/proyek/${project.slug}`} tabIndex={-1} aria-hidden="true">{project.coverImage ? <SkeletonImage src={project.coverImage} alt="" /> : <span className="kr-placeholder">Proyek kolaborasi</span>}</Link>
            <span className="kr-category">{project.category || 'Proyek kolaborasi'}</span>{project.year ? <span className="kr-nominee kr-year">{project.year}</span> : null}
            <span className="kr-actions"><span className="kr-comments" aria-label={`${project.likes ?? 0} suka`}><span aria-hidden="true">♥</span> {project.likes ?? 0}</span><Link className="kr-comments" href={`/proyek/${project.slug}#komentar`} aria-label={`${project.comments ?? 0} komentar, buka bagian komentar`}><span aria-hidden="true">◉</span> {project.comments ?? 0}</Link></span></div>
          <div className="kr-body"><h3><Link href={`/proyek/${project.slug}`} title={project.title}>{project.title}</Link></h3>
            <p className="kr-author">{firstMember ? <Link href={`/siswa/${firstMember.id}`}>{firstMember.profilePhoto ? <span className="mvs-avatar"><SkeletonImage src={firstMember.profilePhoto} alt="" loading="lazy" /></span> : <span className="mvs-avatar work-author-placeholder">{memberName.slice(0, 1).toUpperCase()}</span>}<span className="work-author-details"><span className="work-author-name">{memberName}</span><small className="work-author-major">{project.members.length > 1 ? `+ ${project.members.length - 1} anggota proyek` : 'Proyek kolaborasi'}</small></span></Link> : <span><span className="work-author-details"><span className="work-author-name">Proyek kolaborasi</span></span></span>}</p></div>
        </article></SwiperSlide>
      })}</Swiper> : <p>Belum ada proyek yang diterbitkan.</p>}
      </div>
    </section>

    <section className="home-section home-opportunities-section" id="peluang-terbaru"><div className="section-heading"><div><h2>Peluang <span className="home-recent-title-accent">Terbaru</span></h2></div><div className="home-heading-controls"><button className="home-recent-arrow" type="button" aria-label="Peluang sebelumnya" disabled={loading} onClick={() => slideRecentOpportunities(-1)}>‹</button><button className="home-recent-arrow" type="button" aria-label="Peluang berikutnya" disabled={loading} onClick={() => slideRecentOpportunities(1)}>›</button></div></div>
      <div className="home-recent-carousel home-opportunities-carousel"><div className="home-recent-all"><RevealLink href="/peluang">Lihat semua{totals.opportunities !== undefined ? ` ${totals.opportunities}` : ''} peluang <span>↗</span></RevealLink></div>
      {loading ? <WorkGridSkeleton count={3} className="home-recent-track home-opportunities-track" /> : opportunities.length ? <Swiper
        className="home-recent-track home-opportunities-track"
        modules={[Keyboard]}
        slidesPerView={3}
        spaceBetween={18}
        breakpoints={{ 0: { slidesPerView: 1 }, 431: { slidesPerView: 2 }, 601: { slidesPerView: 3 } }}
        keyboard={{ enabled: true, onlyInViewport: true }}
        onSwiper={(swiper) => { recentOpportunitiesTrackRef.current = swiper }}
        aria-label="Peluang terbaru untuk siswa"
        tabIndex={0}
      >{opportunities.map((opportunity) => {
        const href = `/peluang#peluang-${opportunity.id}`
        const typeLabel = opportunityTypeLabel[opportunity.type] || 'Peluang siswa'
        const daysLeft = opportunity.deadline ? Math.ceil((new Date(opportunity.deadline).getTime() - Date.now()) / 86400000) : null
        const urgent = daysLeft !== null && daysLeft <= 7
        return <SwiperSlide key={opportunity.id}><article className="kr-card" data-type={opportunity.type}>
          <div className="kr-media"><Link className="kr-cover" href={href} tabIndex={-1} aria-hidden="true">{opportunity.coverImage ? <SkeletonImage src={opportunity.coverImage} alt="" /> : <span className="kr-placeholder">{typeLabel}</span>}</Link>
            <span className="kr-category">{typeLabel}</span>{daysLeft !== null && <span className={`kr-nominee kr-deadline${urgent ? ' is-urgent' : ''}`}>{daysLeft < 0 ? 'Berakhir' : daysLeft === 0 ? 'Hari ini' : `${daysLeft} hari lagi`}</span>}
            <span className="kr-actions"><Link className="kr-comments" href={href} aria-label={`Lihat peluang ${opportunity.title}`}>Lihat <span aria-hidden="true">↗</span></Link></span></div>
          <div className="kr-body"><h3><Link href={href}>{opportunity.title}</Link></h3><p className="kr-summary">{opportunity.summary}</p>
            <p className="kr-author"><span><span className="mvs-avatar work-author-placeholder">{(opportunity.organizer || 'P').slice(0, 1).toUpperCase()}</span><span className="work-author-details"><span className="work-author-name">{opportunity.organizer}</span><small className="work-author-major">{opportunity.deadline ? `Batas ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(opportunity.deadline))}` : 'Pendaftaran dibuka'}</small></span></span></p></div>
        </article></SwiperSlide>
      })}</Swiper> : <p>Belum ada peluang yang sedang dibuka.</p>}
      </div>
    </section>

    <section className="home-section home-awards-section" id="penghargaan"><div className="section-heading"><div><h2>Penghargaan <span className="home-recent-title-accent">Tersedia</span></h2></div><div className="home-heading-controls"><button className="home-recent-arrow" type="button" aria-label="Penghargaan sebelumnya" onClick={() => slideAwards(-1)}>‹</button><button className="home-recent-arrow" type="button" aria-label="Penghargaan berikutnya" onClick={() => slideAwards(1)}>›</button></div></div>{loading ? <AwardCardsSkeleton /> : awards.length ? <div className="home-awards-carousel"><Swiper
      className="home-awards-track"
      modules={[Keyboard]}
      slidesPerView={2}
      spaceBetween={18}
      breakpoints={{ 0: { slidesPerView: 1 }, 761: { slidesPerView: 2 } }}
      keyboard={{ enabled: true, onlyInViewport: true }}
      onSwiper={(swiper) => { awardTrackRef.current = swiper }}
      aria-label="Penghargaan yang sedang tersedia"
      tabIndex={0}
    >{awards.map((award) => {
      const opens = new Date(award.opensAt).getTime(), closes = new Date(award.closesAt).getTime()
      const progress = closes > opens ? Math.min(100, Math.max(0, ((Date.now() - opens) / (closes - opens)) * 100)) : 100
      const daysLeft = Math.max(0, Math.ceil((closes - Date.now()) / 86400000))
      const nominees = award.nominees || []
      return <SwiperSlide key={award.id}><article className="aw-card">
        <svg className="aw-card-trophy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>
        <div className="aw-card-top"><span className="aw-live"><i aria-hidden="true" />VOTING BERLANGSUNG</span><span className="aw-days">{daysLeft > 0 ? `${daysLeft} hari lagi` : 'Hari terakhir'}</span></div>
        <h3>{award.title}</h3><p className="aw-desc">{award.description}</p>
        <div className="aw-nominees">{nominees.length ? <><span className="aw-stack">{nominees.slice(0, 4).map((nominee) => <Link key={nominee.id} href={`/karya/${nominee.slug}`} title={nominee.title} aria-label={`Nominasi: ${nominee.title}`}>{nominee.coverImage ? <SkeletonImage src={nominee.coverImage} alt="" loading="lazy" /> : <b>{nominee.title.slice(0, 1).toUpperCase()}</b>}</Link>)}</span><span className="aw-nominee-count">{nominees.length} nominasi</span></> : <span className="aw-nominee-count">Nominasi segera diumumkan</span>}</div>
        <div className="aw-progress" role="img" aria-label={`Waktu voting berjalan ${Math.round(progress)} persen`}><span style={{ width: `${progress}%` }} /></div>
        <div className="aw-foot"><span>Ditutup {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(award.closesAt))}</span><Link className="aw-cta" href="/awards">Beri suara <span aria-hidden="true">↗</span></Link></div>
      </article></SwiperSlide>
    })}</Swiper></div> : <p className="section-empty">Belum ada voting penghargaan yang sedang tersedia.</p>}<div className="home-centered-link"><RevealLink href="/awards">Lihat semua{totals.awards !== undefined ? ` ${totals.awards}` : ''} penghargaan <span>↗</span></RevealLink></div></section>

    <section className="home-section leaderboard-home"><div className="section-heading"><div><h2><span className="home-recent-title-accent">Leaderboard</span></h2></div></div>{boardLoading ? <LeaderboardSkeleton /> : board ? (board.topOverall.some((leader) => (leader.score || 0) > 0) ? <div className="lb-grid">
      <section className="lb-podium-card" aria-label="Most Valuable Student"><div className="lb-card-head"><span className="lb-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg></span><div><h3>Most Valuable Student</h3><p>Kreator dengan interaksi terbanyak</p></div><span className="lb-brand" aria-label="TEL-CREATION"><img className="tel-creation-mark" src="/brand/telkom-schools.png" alt="" /><span className="tel-creation-wordmark"><span className="tel-creation-name">TEL</span><span className="tel-creation-accent">-CREATION</span></span></span></div>
        <div className="lb-podium">{[1, 0, 2].map((slot) => { const leader = board.topOverall.filter((entry) => (entry.score || 0) > 0)[slot]; return leader ? <Link className={`lb-step lb-step--${slot + 1}`} href={`/siswa/${leader.id}`} key={leader.id}><span className="lb-avatar">{slot === 0 && <span className="lb-crown" aria-hidden="true">♛</span>}{leader.profilePhoto ? <SkeletonImage src={leader.profilePhoto} alt={`Foto profil ${leader.name}`} /> : <span className="lb-initial">{leader.name.slice(0, 1).toUpperCase()}</span>}</span><strong className="lb-name">{leader.name}</strong><span className="lb-stats lb-stats--center"><span><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.5 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7h2C14 6.1 15.600 5 17.600 5 21 5 23 8.500 21.600 11.800 19.500 16.400 12 21 12 21Z"/></svg>{leader.likes}</span><span><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>{leader.comments}</span></span><span className="lb-block"><b>{slot + 1}</b></span></Link> : <span className="lb-step lb-step--empty" key={`empty-${slot}`} aria-hidden="true"><span className="lb-block"><b>{slot + 1}</b></span></span> })}</div></section>
      <div className="lb-lists">
        <section className="lb-list-card"><div className="lb-list-head"><span className="lb-list-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.5 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7h2C14 6.1 15.600 5 17.600 5 21 5 23 8.500 21.600 11.800 19.500 16.400 12 21 12 21Z"/></svg></span><h3>Top Likes · Karya</h3></div>{board.topLikes.slice(0, 3).map((work, index) => <article className="lb-row" key={work.id}><span className="lb-rank">{index + 1}</span><Link className="lb-thumb" href={`/karya/${work.slug}`} aria-label={`Lihat karya ${work.title}`}>{work.coverImage ? <SkeletonImage src={work.coverImage} alt={`Sampul ${work.title}`} /> : <span aria-hidden="true">K</span>}</Link><div className="lb-info">{work.isNominee && <small className="lb-nominee">NOMINEE</small>}<Link className="lb-title" href={`/karya/${work.slug}`}>{displayTitle(work.title, work.studentName)}</Link><small className="lb-author">Oleh {work.studentID ? <Link href={`/siswa/${work.studentID}`}>{work.studentName}</Link> : work.studentName}</small></div><div className="lb-stats"><span><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.5 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7h2C14 6.1 15.600 5 17.600 5 21 5 23 8.500 21.600 11.800 19.500 16.400 12 21 12 21Z"/></svg>{work.likes}</span><span><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>{work.comments}</span></div></article>)}{!board.topLikes.length && <p className="leaderboard-empty">Belum ada karya dengan suka.</p>}</section>
        <section className="lb-list-card"><div className="lb-list-head"><span className="lb-list-icon lb-list-icon--hot" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 22c4 0 7-2.8 7-7 0-3-1.8-5-3.5-6.8-.4 1.4-1.2 2.3-2.2 2.8.2-3.2-1.3-6-4.3-8C9 6 5 9.5 5 15c0 4.2 3 7 7 7Z"/></svg></span><h3>Trending · Karya</h3></div>{board.trending.slice(0, 3).map((work, index) => <article className="lb-row" key={work.id}><span className="lb-rank">{index + 1}</span><Link className="lb-thumb" href={`/karya/${work.slug}`} aria-label={`Lihat karya ${work.title}`}>{work.coverImage ? <SkeletonImage src={work.coverImage} alt={`Sampul ${work.title}`} /> : <span aria-hidden="true">K</span>}</Link><div className="lb-info">{work.isNominee && <small className="lb-nominee">NOMINEE</small>}<Link className="lb-title" href={`/karya/${work.slug}`}>{displayTitle(work.title, work.studentName)}</Link><small className="lb-author">Oleh {work.studentID ? <Link href={`/siswa/${work.studentID}`}>{work.studentName}</Link> : work.studentName}</small></div><div className="lb-stats"><span><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.5 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7h2C14 6.1 15.600 5 17.600 5 21 5 23 8.500 21.600 11.800 19.500 16.400 12 21 12 21Z"/></svg>{work.likes}</span><span><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>{work.comments}</span></div></article>)}{!board.trending.length && <p className="leaderboard-empty">Belum ada karya yang ramai dikomentari.</p>}</section>
      </div>
    </div> : <p>Data belum cukup untuk menampilkan leaderboard. Peringkat akan muncul setelah karya mendapatkan suka atau komentar.</p>) : <p>Leaderboard akan muncul setelah ada interaksi pada karya.</p>}<div className="home-centered-link"><RevealLink href="/leaderboard">Lihat semua peringkat <span>↗</span></RevealLink></div></section>

    <section className="home-section home-testimonials-section" id="testimoni">
      <div className="section-heading"><div><h2>Cerita di balik <span className="home-recent-title-accent">karya</span></h2></div>{testimonials.length > 3 && <div className="home-heading-controls"><button className="home-recent-arrow" type="button" aria-label="Testimoni sebelumnya" onClick={() => navigateSwiper(testimonialTrackRef.current, -1)}>‹</button><button className="home-recent-arrow" type="button" aria-label="Testimoni berikutnya" onClick={() => navigateSwiper(testimonialTrackRef.current, 1)}>›</button></div>}</div>
      {testimonials.length ? <Swiper
        className="home-testimonial-track"
        modules={[Keyboard]}
        slidesPerView={3}
        spaceBetween={18}
        breakpoints={{ 0: { slidesPerView: 1 }, 431: { slidesPerView: 2 }, 601: { slidesPerView: 3 } }}
        keyboard={{ enabled: true, onlyInViewport: true }}
        onSwiper={(swiper) => { testimonialTrackRef.current = swiper }}
        aria-label="Testimoni komunitas TEL-CREATION"
        tabIndex={0}
      >{testimonials.map((testimonial) => <SwiperSlide key={testimonial.id}><figure className="home-testimonial-card">
        <span className="home-testimonial-mark" aria-hidden="true">“</span>
        <blockquote>{testimonial.quote}</blockquote>
        <figcaption><span className="home-testimonial-author"><span className="home-testimonial-avatar" aria-hidden="true">{testimonial.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span><strong>{testimonial.name}</strong><small>{testimonial.role}{testimonial.program ? ` · ${testimonial.program}` : ''}</small></span></span>{testimonial.isSample && <small className="home-testimonial-sample">CONTOH</small>}</figcaption>
      </figure></SwiperSlide>)}</Swiper> : <article className="home-testimonial-empty">
        <span className="home-testimonial-mark" aria-hidden="true">“</span>
        <div><span className="home-testimonial-label">TESTIMONI KOMUNITAS</span><h3>Setiap karya punya cerita.</h3><p>Pengalaman siswa, guru, dan kolaborator akan hadir di sini saat testimoni mereka tersedia.</p><Link href="/karya">Jelajahi karya siswa <span aria-hidden="true">↗</span></Link></div>
      </article>}
    </section>

    <section className="home-final-cta" aria-labelledby="home-final-cta-title">
      <div className="home-final-cta-copy"><span className="home-final-cta-kicker">BERGABUNG DENGAN KOMUNITAS</span><h2 id="home-final-cta-title">Punya karya yang belum pernah kamu tunjukkan?</h2><p>Unggah, minta masukan dari guru, dan lihat siapa saja yang tertarik.</p><div className="home-final-cta-actions"><Link className="home-final-cta-primary" href="/register">Mulai berkarya <span aria-hidden="true">↗</span></Link><Link className="home-final-cta-secondary" href="/karya">Lihat karya lain dulu</Link></div></div>
      <div className="home-final-cta-art" aria-hidden="true"><span>✳</span><strong>IDE<br />JADI<br />KARYA</strong><i /></div>
    </section>

  </main>
}
