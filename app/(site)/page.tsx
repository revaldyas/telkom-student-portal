'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { displayTitle } from '../../lib/displayTitle'
import { AwardCardsSkeleton, HeroSkeleton, LeaderboardSkeleton, WorkGridSkeleton } from '../../components/SiteSkeletons'
import SkeletonImage from '../../components/SkeletonImage'

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
type RecentProject = { id: string | number; slug: string; title: string; summary?: string; year?: number; category?: string | null; coverImage: string | null; coverAlt?: string | null; members: { id: string | number; name?: string; profilePhoto: string | null }[] }
type RecentOpportunity = { id: string | number; title: string; type: string; organizer: string; summary: string; deadline?: string | null; coverImage: string | null; coverAlt?: string | null }
type Award = { id: string | number; title: string; description: string; opensAt: string; closesAt: string; nominees?: { id: string | number; title: string; slug: string; coverImage: string | null }[] }
type Leader = { id: string; name: string; profilePhoto: string | null; likes: number; comments: number; score?: number }
type RankedPortfolio = { id: string; slug: string; title: string; studentID?: string; studentName: string; profilePhoto: string | null; coverImage: string | null; likes: number; comments: number; isNominee?: boolean }
type Board = { topLikes: RankedPortfolio[]; trending: RankedPortfolio[]; topOverall: Leader[] }
type HeroSlide = { key: string; eyebrow: string; title: string; description: string; image: string | null; href: string; action: string; secondaryHref?: string | null; secondaryAction?: string | null }
const idOf = (value: Portfolio['student']) => typeof value === 'object' && value ? value.id : value
const nameOf = (value: Portfolio['student']) => typeof value === 'object' && value ? value.name || 'Siswa' : 'Siswa'
const photoOf = (value: Portfolio['student']) => typeof value === 'object' && value ? value.profilePhoto || null : null
const studentStudyInfo = (value: Portfolio['student']) => typeof value === 'object' && value
  ? [value.class?.name, value.program?.code].filter(Boolean).join(' · ')
  : ''
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
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [projects, setProjects] = useState<RecentProject[]>([])
  const [opportunities, setOpportunities] = useState<RecentOpportunity[]>([])
  const [awards, setAwards] = useState<Award[]>([])
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([])
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [boardLoading, setBoardLoading] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)
  const [sliderPaused, setSliderPaused] = useState(false)
  const recentTrackRef = useRef<HTMLDivElement | null>(null)
  const recentProjectsTrackRef = useRef<HTMLDivElement | null>(null)
  const recentOpportunitiesTrackRef = useRef<HTMLDivElement | null>(null)
  const awardTrackRef = useRef<HTMLDivElement | null>(null)

  const scrollTrack = (track: HTMLDivElement | null, direction: -1 | 1) => {
    const firstCard = track?.firstElementChild
    if (!track || !firstCard) return
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0
    const visibleCards = Math.max(1, Math.floor((track.clientWidth + gap) / (firstCard.getBoundingClientRect().width + gap)))
    track.scrollBy({ left: direction * (firstCard.getBoundingClientRect().width + gap) * Math.max(1, visibleCards - 1), behavior: 'smooth' })
  }
  const scrollRecentWorks = (direction: -1 | 1) => scrollTrack(recentTrackRef.current, direction)
  const scrollRecentProjects = (direction: -1 | 1) => scrollTrack(recentProjectsTrackRef.current, direction)
  const scrollRecentOpportunities = (direction: -1 | 1) => scrollTrack(recentOpportunitiesTrackRef.current, direction)
  const scrollAwards = (direction: -1 | 1) => scrollTrack(awardTrackRef.current, direction)
  useEffect(() => {
    fetch('/api/community/feed?limit=1000').then((response) => response.ok ? response.json() : null).then((feed) => {
      setPortfolios(selectRecentByProgram(feed?.portfolios || []))
      setProjects(feed?.projects || [])
      setOpportunities(feed?.opportunities || [])
      setAwards(feed?.awards || [])
      setHeroSlides(feed?.heroSlides || [])
    }).catch(() => {}).finally(() => setLoading(false))
    fetch('/api/community/leaderboard').then((response) => response.ok ? response.json() : null).then(setBoard).catch(() => {}).finally(() => setBoardLoading(false))
  }, [])

  const slides = heroSlides

  useEffect(() => {
    if (activeSlide >= slides.length) setActiveSlide(0)
    if (slides.length < 2 || sliderPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 7000)
    return () => window.clearInterval(timer)
  }, [activeSlide, slides.length, sliderPaused])

  return <main className="home-page">
    {loading ? <HeroSkeleton /> : slides.length > 0 && <section className="home-slider" aria-label="Sorotan TEL-CREATION" onMouseEnter={() => setSliderPaused(true)} onMouseLeave={() => setSliderPaused(false)} onFocusCapture={() => setSliderPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSliderPaused(false) }}>
        {slides.map((slide, index) => <article className={`home-slide${index === activeSlide ? ' is-active' : ''}`} key={slide.key} aria-hidden={index !== activeSlide} inert={index !== activeSlide}>
          <div className="home-slide-content">
            <span className="home-slide-eyebrow"><i />{slide.eyebrow}</span>
            <h1>{slide.title}</h1>
            <p>{slide.description}</p>
            <div className="home-slide-actions"><Link className="button button-primary" href={slide.href}>{slide.action}<span aria-hidden="true">↗</span></Link>{slide.secondaryHref && slide.secondaryAction && <Link className="button button-glass" href={slide.secondaryHref}>{slide.secondaryAction}</Link>}</div>
          </div>
          <div className="home-slide-media">{slide.image ? <SkeletonImage className="home-slide-image" src={slide.image} alt={`Sampul ${slide.title}`} /> : <span className="home-slide-media-placeholder" aria-hidden="true" />}<span className="home-slide-media-caption">TEL-CREATION · SOROTAN</span></div>
        </article>)}
        {slides.length > 1 && <div className="home-slider-controls"><button type="button" aria-label="Sorotan sebelumnya" onClick={() => setActiveSlide((activeSlide - 1 + slides.length) % slides.length)}>‹</button><div>{slides.map((slide, index) => <button key={slide.key} type="button" aria-label={`Tampilkan sorotan ${index + 1}`} aria-current={activeSlide === index} onClick={() => setActiveSlide(index)} />)}</div><button type="button" aria-label="Sorotan berikutnya" onClick={() => setActiveSlide((activeSlide + 1) % slides.length)}>›</button></div>}
    </section>}

    <section className="home-section" id="karya"><div className="section-heading"><div><span className="section-kicker">PILIHAN KOMUNITAS</span><h2>Karya terbaru</h2></div></div>
      <div className="home-recent-carousel"><button className="home-recent-arrow" type="button" aria-label="Karya sebelumnya" disabled={loading} onClick={() => scrollRecentWorks(-1)}>‹</button>
      {loading ? <WorkGridSkeleton className="home-recent-track" /> : portfolios.length ? <div ref={recentTrackRef} className="lowfi-work-grid home-recent-track" aria-label="Karya terbaru siswa" tabIndex={0}>{portfolios.map((work) => {
        const image = typeof work.coverImage === 'object' && work.coverImage ? work.coverImage.url : null
        const studentID = idOf(work.student)
        const photo = photoOf(work.student)
        const rank = mvsRank(board, studentID)
        const studyInfo = studentStudyInfo(work.student)
        const author = <>{photo ? <span className="mvs-avatar"><SkeletonImage src={photo} alt="" loading="lazy" /></span> : <span className="mvs-avatar work-author-placeholder">{nameOf(work.student).slice(0, 1).toUpperCase()}</span>}<span className="work-author-details"><span className="work-author-name">{nameOf(work.student)}{rank > 0 && <small className="work-author-rank">MVS #{rank}</small>}</span>{studyInfo && <small className="work-author-major">{studyInfo}</small>}</span></>
        return <article className="lowfi-work-card" key={work.id}>
          <Link className="work-card-media" href={`/karya/${work.slug}`}>{image ? <SkeletonImage src={image} alt={`Sampul ${work.title}`} /> : <span className="work-card-placeholder">Telkom Student Creation</span>}{work.isNominee && <span className="lowfi-badge">NOMINEE</span>}{work.verificationStatus === 'verified' && <span className="verified-badge">TERVERIFIKASI</span>}</Link>
          <div className="work-card-body"><p className="work-card-category">{typeof work.categoryRef === 'object' ? work.categoryRef?.name || work.categoryRef?.code : 'Karya'}{work.year ? ` / ${work.year}` : ''}</p><h3><Link href={`/karya/${work.slug}`}>{displayTitle(work.title, nameOf(work.student))}</Link></h3><div className="work-card-footer"><p className="work-author">{studentID ? <Link href={`/siswa/${studentID}`}>{author}</Link> : <span>{author}</span>}</p><span className="work-card-arrow" aria-hidden="true">↗</span></div></div>
        </article>
      })}</div> : <p>Belum ada karya terbit.</p>}
      <button className="home-recent-arrow" type="button" aria-label="Karya berikutnya" disabled={loading} onClick={() => scrollRecentWorks(1)}>›</button></div>
      <div className="home-recent-all"><Link className="section-link" href="/karya">Lihat semua karya <span>↗</span></Link></div>
    </section>

    <section className="home-section home-projects-section" id="proyek-terbaru"><div className="section-heading"><div><span className="section-kicker">KOLABORASI SISWA</span><h2>Proyek terbaru</h2></div></div>
      <div className="home-recent-carousel"><button className="home-recent-arrow" type="button" aria-label="Proyek sebelumnya" disabled={loading} onClick={() => scrollRecentProjects(-1)}>‹</button>
      {loading ? <WorkGridSkeleton className="home-recent-track home-project-track" count={4} /> : projects.length ? <div ref={recentProjectsTrackRef} className="lowfi-work-grid home-recent-track home-project-track" aria-label="Proyek kolaborasi terbaru" tabIndex={0}>{projects.map((project) => {
        const firstMember = project.members[0]
        const memberName = firstMember?.name || 'Siswa Telkom'
        return <article className="lowfi-work-card" key={project.id}>
          <Link className="work-card-media" href={`/proyek/${project.slug}`}>{project.coverImage ? <SkeletonImage src={project.coverImage} alt={project.coverAlt || `Sampul ${project.title}`} /> : <span className="work-card-placeholder">Proyek kolaborasi</span>}</Link>
          <div className="work-card-body"><p className="work-card-category">{project.category || 'Proyek kolaborasi'}{project.year ? ` / ${project.year}` : ''}</p><h3><Link href={`/proyek/${project.slug}`}>{project.title}</Link></h3><div className="work-card-footer"><p className="work-author">{firstMember ? <Link href={`/siswa/${firstMember.id}`}>{firstMember.profilePhoto ? <span className="mvs-avatar"><SkeletonImage src={firstMember.profilePhoto} alt="" loading="lazy" /></span> : <span className="mvs-avatar work-author-placeholder">{memberName.slice(0, 1).toUpperCase()}</span>}<span className="work-author-details"><span className="work-author-name">{memberName}</span><small className="work-author-major">{project.members.length > 1 ? `+ ${project.members.length - 1} anggota proyek` : 'Proyek kolaborasi'}</small></span></Link> : <span className="work-author-name">Proyek kolaborasi</span>}</p><span className="work-card-arrow" aria-hidden="true">↗</span></div></div>
        </article>
      })}</div> : <p>Belum ada proyek yang diterbitkan.</p>}
      <button className="home-recent-arrow" type="button" aria-label="Proyek berikutnya" disabled={loading} onClick={() => scrollRecentProjects(1)}>›</button></div>
      <div className="home-recent-all"><Link className="section-link" href="/proyek">Lihat semua proyek <span>↗</span></Link></div>
    </section>

    <section className="home-section home-opportunities-section" id="peluang-terbaru"><div className="section-heading"><div><span className="section-kicker">LANGKAH BERIKUTNYA</span><h2>Peluang terbaru</h2></div></div>
      <div className="home-recent-carousel"><button className="home-recent-arrow" type="button" aria-label="Peluang sebelumnya" disabled={loading} onClick={() => scrollRecentOpportunities(-1)}>‹</button>
      {loading ? <WorkGridSkeleton className="home-recent-track home-opportunities-track" count={4} /> : opportunities.length ? <div ref={recentOpportunitiesTrackRef} className="lowfi-work-grid home-recent-track home-opportunities-track" aria-label="Peluang terbaru untuk siswa" tabIndex={0}>{opportunities.map((opportunity) => <article className="lowfi-work-card home-opportunity-card" key={opportunity.id}>
        <Link className="work-card-media" href={`/peluang#peluang-${opportunity.id}`}>{opportunity.coverImage ? <SkeletonImage src={opportunity.coverImage} alt={opportunity.coverAlt || `Sampul ${opportunity.title}`} /> : <span className="work-card-placeholder">{opportunityTypeLabel[opportunity.type] || 'Peluang siswa'}</span>}</Link>
        <div className="work-card-body"><p className="work-card-category">{opportunityTypeLabel[opportunity.type] || 'Peluang siswa'}</p><h3><Link href={`/peluang#peluang-${opportunity.id}`}>{opportunity.title}</Link></h3><p className="home-opportunity-summary">{opportunity.summary}</p><div className="work-card-footer"><p className="work-author"><span className="work-author-details"><span className="work-author-name">{opportunity.organizer}</span><small className="work-author-major">{opportunity.deadline ? `Batas ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(opportunity.deadline))}` : 'Pendaftaran dibuka'}</small></span></p><Link className="work-card-arrow" href={`/peluang#peluang-${opportunity.id}`} aria-label={`Lihat peluang ${opportunity.title}`}>↗</Link></div></div>
      </article>)}</div> : <p>Belum ada peluang yang sedang dibuka.</p>}
      <button className="home-recent-arrow" type="button" aria-label="Peluang berikutnya" disabled={loading} onClick={() => scrollRecentOpportunities(1)}>›</button></div>
      <div className="home-recent-all"><Link className="section-link" href="/peluang">Lihat semua peluang <span>↗</span></Link></div>
    </section>

    <section className="home-section home-awards-section" id="penghargaan"><div className="section-heading"><div><span className="section-kicker">MOMEN APRESIASI</span><h2>Penghargaan tersedia</h2></div></div>{loading ? <AwardCardsSkeleton /> : awards.length ? <div className="home-awards-carousel"><button className="home-recent-arrow" type="button" aria-label="Penghargaan sebelumnya" onClick={() => scrollAwards(-1)}>‹</button><div ref={awardTrackRef} className="award-home-grid home-awards-track" aria-label="Penghargaan yang sedang tersedia" tabIndex={0}>{awards.map((award) => <article className="award-home-card" key={award.id}><span className="award-home-label">VOTING BERLANGSUNG</span><h3>{award.title}</h3><p>{award.description}</p><div><span>Ditutup {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(award.closesAt))}</span><Link href="/awards">Lihat nominasi <span>↗</span></Link></div></article>)}</div><button className="home-recent-arrow" type="button" aria-label="Penghargaan berikutnya" onClick={() => scrollAwards(1)}>›</button></div> : <p className="section-empty">Belum ada voting penghargaan yang sedang tersedia.</p>}<div className="home-recent-all"><Link className="section-link" href="/awards">Semua penghargaan <span>↗</span></Link></div></section>

    <section className="home-section leaderboard-home"><div className="section-heading"><div><span className="section-kicker">KREATOR PILIHAN</span><h2>Leaderboard</h2></div><Link className="section-link" href="/leaderboard">Lihat semua peringkat <span>↗</span></Link></div>{boardLoading ? <LeaderboardSkeleton /> : board ? (board.topOverall.some((leader) => (leader.score || 0) > 0) ? <div className="leader-grid">
      <section className="lowfi-panel"><h3>Most Valuable Student</h3>{board.topOverall.filter((leader) => (leader.score || 0) > 0).slice(0, 3).map((leader, index) => <article className="leader-row" key={leader.id}><span>#{index + 1}</span><span className="mvs-avatar">{leader.profilePhoto ? <SkeletonImage src={leader.profilePhoto} alt={`Foto profil ${leader.name}`} /> : <span className="leader-initial">{leader.name.slice(0, 1)}</span>}<small className="mvs-rank-badge">MVS #{index + 1}</small></span><Link href={`/siswa/${leader.id}`}>{leader.name}</Link></article>)}</section>
      <section className="lowfi-panel"><h3>Top Likes · Karya</h3>{board.topLikes.slice(0, 3).map((work, index) => <article className="leader-row leader-row--work" style={{ gridTemplateColumns: '32px 48px minmax(0, 1fr)' }} key={work.id}><span>#{index + 1}</span><Link className="leader-work-image-link" href={`/karya/${work.slug}`} aria-label={`Lihat karya ${work.title}`}>{work.coverImage ? <SkeletonImage className="leader-work-thumb" src={work.coverImage} alt={`Sampul ${work.title}`} /> : <span className="leader-work-thumb leader-work-placeholder" aria-hidden="true">K</span>}</Link><span>{work.isNominee && <small className="lowfi-badge">NOMINEE</small>}<Link href={`/karya/${work.slug}`}>{displayTitle(work.title, work.studentName)}</Link><small className="leader-author" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>Oleh {work.studentID ? <Link href={`/siswa/${work.studentID}`}>{work.studentName}</Link> : work.studentName}</small></span></article>)}{!board.topLikes.length && <p className="leaderboard-empty">Belum ada karya dengan suka.</p>}</section>
      <section className="lowfi-panel"><h3>Trending · Karya</h3>{board.trending.slice(0, 3).map((work, index) => <article className="leader-row leader-row--work" style={{ gridTemplateColumns: '32px 48px minmax(0, 1fr)' }} key={work.id}><span>#{index + 1}</span><Link className="leader-work-image-link" href={`/karya/${work.slug}`} aria-label={`Lihat karya ${work.title}`}>{work.coverImage ? <SkeletonImage className="leader-work-thumb" src={work.coverImage} alt={`Sampul ${work.title}`} /> : <span className="leader-work-thumb leader-work-placeholder" aria-hidden="true">K</span>}</Link><span>{work.isNominee && <small className="lowfi-badge">NOMINEE</small>}<Link href={`/karya/${work.slug}`}>{displayTitle(work.title, work.studentName)}</Link><small className="leader-author" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>Oleh {work.studentID ? <Link href={`/siswa/${work.studentID}`}>{work.studentName}</Link> : work.studentName}</small></span></article>)}{!board.trending.length && <p className="leaderboard-empty">Belum ada karya yang ramai dikomentari.</p>}</section>
    </div> : <p>Data belum cukup untuk menampilkan leaderboard. Peringkat akan muncul setelah karya mendapatkan suka atau komentar.</p>) : <p>Leaderboard akan muncul setelah ada interaksi pada karya.</p>}</section>

  </main>
}
