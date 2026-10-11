'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { displayTitle } from '../../lib/displayTitle'
import { AwardCardsSkeleton, HeroSkeleton, LeaderboardSkeleton, WorkGridSkeleton } from '../../components/SiteSkeletons'
import SkeletonImage from '../../components/SkeletonImage'

type Portfolio = {
  id: string | number
  slug: string
  title: string
  summary: string
  student?: { id: string | number; name?: string; profilePhoto?: string | null } | string | number | null
  categoryRef?: { name?: string; code?: string } | string | number
  year?: number
  coverImage?: { url?: string } | string | number
  likes?: number
  comments?: number
  isNominee?: boolean
  verificationStatus?: string
}
type Award = { id: string | number; title: string; description: string; opensAt: string; closesAt: string; nominees?: { id: string | number; title: string; slug: string; coverImage: string | null }[] }
type Leader = { id: string; name: string; profilePhoto: string | null; likes: number; comments: number; score?: number }
type RankedPortfolio = { id: string; slug: string; title: string; studentID?: string; studentName: string; profilePhoto: string | null; coverImage: string | null; likes: number; comments: number; isNominee?: boolean }
type Board = { topLikes: RankedPortfolio[]; trending: RankedPortfolio[]; topOverall: Leader[] }
type HeroSlide = { key: string; eyebrow: string; title: string; description: string; image: string | null; href: string; action: string; byline?: string }
const idOf = (value: Portfolio['student']) => typeof value === 'object' && value ? value.id : value
const nameOf = (value: Portfolio['student']) => typeof value === 'object' && value ? value.name || 'Siswa' : 'Siswa'
const photoOf = (value: Portfolio['student']) => typeof value === 'object' && value ? value.profilePhoto || null : null
const mvsRank = (board: Board | null, id: string | number | null | undefined) => {
  if (id === undefined || !board) return 0
  const rank = board.topOverall.findIndex((student) => String(student.id) === String(id))
  return rank >= 0 && rank < 3 && (board.topOverall[rank].score || 0) > 0 ? rank + 1 : 0
}

export default function Home() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [awards, setAwards] = useState<Award[]>([])
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [boardLoading, setBoardLoading] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)
  const [sliderPaused, setSliderPaused] = useState(false)
  useEffect(() => {
    fetch('/api/community/feed').then((response) => response.ok ? response.json() : null).then((feed) => {
      setPortfolios(feed?.portfolios || [])
      setAwards(feed?.awards || [])
    }).catch(() => {}).finally(() => setLoading(false))
    fetch('/api/community/leaderboard').then((response) => response.ok ? response.json() : null).then(setBoard).catch(() => {}).finally(() => setBoardLoading(false))
  }, [])

  const slides = useMemo<HeroSlide[]>(() => {
    const rows: HeroSlide[] = []
    const topLiked = board?.topLikes[0]
    const trending = board?.trending.find((work) => work.id !== topLiked?.id)
    const nominee = portfolios.find((work) => work.isNominee && work.id !== topLiked?.id && work.id !== trending?.id && typeof work.coverImage === 'object' && work.coverImage?.url)
    const featuredAward = awards[0]
    const awardNominee = featuredAward?.nominees?.[0]
    if (topLiked) rows.push({ key: `likes-${topLiked.id}`, eyebrow: 'SOROTAN / KARYA PALING DISUKAI', title: displayTitle(topLiked.title, topLiked.studentName), description: 'Sebuah karya pilihan komunitas yang patut dilihat lebih dekat.', image: topLiked.coverImage, href: `/karya/${topLiked.slug}`, action: 'Lihat karya', byline: topLiked.studentName })
    if (trending) rows.push({ key: `trending-${trending.id}`, eyebrow: 'SOROTAN / SEDANG RAMAI', title: displayTitle(trending.title, trending.studentName), description: 'Karya yang sedang membuka percakapan di komunitas.', image: trending.coverImage, href: `/karya/${trending.slug}`, action: 'Lihat karya', byline: trending.studentName })
    if (nominee) rows.push({ key: `nominee-${nominee.id}`, eyebrow: 'SOROTAN / NOMINEE', title: displayTitle(nominee.title, nameOf(nominee.student)), description: 'Masuk nominasi penghargaan karya siswa tahun ini.', image: typeof nominee.coverImage === 'object' ? nominee.coverImage.url || null : null, href: `/karya/${nominee.slug}`, action: 'Lihat nominasi', byline: nameOf(nominee.student) })
    if (featuredAward && awardNominee) rows.push({ key: `award-${featuredAward.id}`, eyebrow: 'VOTING PENGHARGAAN', title: featuredAward.title, description: featuredAward.description, image: awardNominee.coverImage, href: '/awards', action: 'Lihat award' })
    const latest = portfolios.find((work) => typeof work.coverImage === 'object' && work.coverImage?.url)
    if (latest && !rows.some((slide) => slide.key.endsWith(String(latest.id)))) rows.push({ key: `latest-${latest.id}`, eyebrow: 'KARYA TERBARU', title: latest.title, description: latest.summary, image: typeof latest.coverImage === 'object' ? latest.coverImage.url || null : null, href: `/karya/${latest.slug}`, action: 'Jelajahi karya' })
    return rows
  }, [awards, board, portfolios])

  useEffect(() => {
    if (activeSlide >= slides.length) setActiveSlide(0)
    if (slides.length < 2 || sliderPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 7000)
    return () => window.clearInterval(timer)
  }, [activeSlide, slides.length, sliderPaused])

  return <main className="home-page">
    {loading || boardLoading ? <HeroSkeleton /> : <section className="home-slider" aria-label="Sorotan Telkom Student Creation" onMouseEnter={() => setSliderPaused(true)} onMouseLeave={() => setSliderPaused(false)} onFocusCapture={() => setSliderPaused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSliderPaused(false) }}>
      {slides.length ? <>
        {slides.map((slide, index) => <article className={`home-slide${index === activeSlide ? ' is-active' : ''}`} key={slide.key} aria-hidden={index !== activeSlide} inert={index !== activeSlide}>
          <div className="home-slide-content">
            <span className="home-slide-eyebrow"><i />{slide.eyebrow}</span>
            <h1>{slide.title}</h1>
            <p>{slide.description}</p>
            {slide.byline && <span className="home-slide-byline">Karya oleh <strong>{slide.byline}</strong></span>}
            <div className="home-slide-actions"><Link className="button button-primary" href={slide.href}>{slide.action}<span aria-hidden="true">↗</span></Link><Link className="button button-glass" href="/karya">Jelajahi karya</Link></div>
          </div>
          <div className="home-slide-media">{slide.image ? <SkeletonImage className="home-slide-image" src={slide.image} alt={`Sampul ${slide.title}`} /> : <span className="home-slide-media-placeholder" aria-hidden="true">Telkom Student Creation</span>}<span className="home-slide-media-caption">PILIHAN KOMUNITAS <span>↗</span></span></div>
        </article>)}
        {slides.length > 1 && <div className="home-slider-controls"><button type="button" aria-label="Sorotan sebelumnya" onClick={() => setActiveSlide((activeSlide - 1 + slides.length) % slides.length)}>‹</button><div>{slides.map((slide, index) => <button key={slide.key} type="button" aria-label={`Tampilkan sorotan ${index + 1}`} aria-current={activeSlide === index} onClick={() => setActiveSlide(index)} />)}</div><button type="button" aria-label="Sorotan berikutnya" onClick={() => setActiveSlide((activeSlide + 1) % slides.length)}>›</button></div>}
      </> : <div className="home-slide home-slide-empty"><div className="home-slide-content"><span className="home-slide-eyebrow"><i />TELKOM STUDENT CREATION</span><h1>Karya yang layak mendapat panggung.</h1><p>Temukan kreator, jelajahi karya, dan dukung penghargaan pilihan komunitas.</p><Link className="button button-primary" href="/karya">Jelajahi karya <span>↗</span></Link></div><div className="home-slide-media home-slide-media-placeholder">Telkom Student Creation</div></div>}
    </section>}

    <section className="home-section" id="karya"><div className="section-heading"><div><span className="section-kicker">PILIHAN KOMUNITAS</span><h2>Karya terbaru</h2></div><Link className="section-link" href="/karya">Lihat semua karya <span>↗</span></Link></div>
      {loading ? <WorkGridSkeleton /> : portfolios.length ? <div className="lowfi-work-grid">{portfolios.slice(0, 6).map((work) => {
        const image = typeof work.coverImage === 'object' && work.coverImage ? work.coverImage.url : null
        const studentID = idOf(work.student)
        const photo = photoOf(work.student)
        const rank = mvsRank(board, studentID)
        const author = <>{photo ? <span className="mvs-avatar"><SkeletonImage src={photo} alt="" loading="lazy" /></span> : <span className="mvs-avatar work-author-placeholder">{nameOf(work.student).slice(0, 1).toUpperCase()}</span>}<span>{nameOf(work.student)}{rank > 0 && <small className="work-author-rank">MVS #{rank}</small>}</span></>
        return <article className="lowfi-work-card" key={work.id}>
          <Link className="work-card-media" href={`/karya/${work.slug}`}>{image ? <SkeletonImage src={image} alt={`Sampul ${work.title}`} /> : <span className="work-card-placeholder">Telkom Student Creation</span>}{work.isNominee && <span className="lowfi-badge">NOMINEE</span>}{work.verificationStatus === 'verified' && <span className="verified-badge">TERVERIFIKASI</span>}</Link>
          <div className="work-card-body"><p className="work-card-category">{typeof work.categoryRef === 'object' ? work.categoryRef?.name || work.categoryRef?.code : 'Karya'}{work.year ? ` / ${work.year}` : ''}</p><h3><Link href={`/karya/${work.slug}`}>{displayTitle(work.title, nameOf(work.student))}</Link></h3><div className="work-card-footer"><p className="work-author">{studentID ? <Link href={`/siswa/${studentID}`}>{author}</Link> : <span>{author}</span>}</p><span className="work-card-arrow" aria-hidden="true">↗</span></div></div>
        </article>
      })}</div> : <p>Belum ada karya terbit.</p>}
    </section>

    <section className="home-section" id="penghargaan"><div className="section-heading"><div><span className="section-kicker">MOMEN APRESIASI</span><h2>Penghargaan tersedia</h2></div><Link className="section-link" href="/awards">Semua penghargaan <span>↗</span></Link></div>{loading ? <AwardCardsSkeleton /> : awards.length ? <div className="award-home-grid">{awards.map((award) => <article className="award-home-card" key={award.id}><span className="award-home-label">VOTING BERLANGSUNG</span><h3>{award.title}</h3><p>{award.description}</p><div><span>Ditutup {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(award.closesAt))}</span><Link href="/awards">Lihat nominasi <span>↗</span></Link></div></article>)}</div> : <p className="section-empty">Belum ada voting penghargaan yang sedang tersedia.</p>}</section>

    <section className="home-section leaderboard-home"><div className="section-heading"><div><span className="section-kicker">KREATOR PILIHAN</span><h2>Leaderboard</h2></div><Link className="section-link" href="/leaderboard">Lihat semua peringkat <span>↗</span></Link></div>{boardLoading ? <LeaderboardSkeleton /> : board ? (board.topOverall.some((leader) => (leader.score || 0) > 0) ? <div className="leader-grid">
      <section className="lowfi-panel"><h3>Most Valuable Student</h3>{board.topOverall.filter((leader) => (leader.score || 0) > 0).slice(0, 3).map((leader, index) => <article className="leader-row" key={leader.id}><span>#{index + 1}</span><span className="mvs-avatar">{leader.profilePhoto ? <SkeletonImage src={leader.profilePhoto} alt={`Foto profil ${leader.name}`} /> : <span className="leader-initial">{leader.name.slice(0, 1)}</span>}<small className="mvs-rank-badge">MVS #{index + 1}</small></span><Link href={`/siswa/${leader.id}`}>{leader.name}</Link></article>)}</section>
      <section className="lowfi-panel"><h3>Top Likes · Karya</h3>{board.topLikes.slice(0, 3).map((work, index) => <article className="leader-row leader-row--work" style={{ gridTemplateColumns: '32px 48px minmax(0, 1fr)' }} key={work.id}><span>#{index + 1}</span><Link className="leader-work-image-link" href={`/karya/${work.slug}`} aria-label={`Lihat karya ${work.title}`}>{work.coverImage ? <SkeletonImage className="leader-work-thumb" src={work.coverImage} alt={`Sampul ${work.title}`} /> : <span className="leader-work-thumb leader-work-placeholder" aria-hidden="true">K</span>}</Link><span>{work.isNominee && <small className="lowfi-badge">NOMINEE</small>}<Link href={`/karya/${work.slug}`}>{displayTitle(work.title, work.studentName)}</Link><small className="leader-author" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>Oleh {work.studentID ? <Link href={`/siswa/${work.studentID}`}>{work.studentName}</Link> : work.studentName}</small></span></article>)}{!board.topLikes.length && <p className="leaderboard-empty">Belum ada karya dengan suka.</p>}</section>
      <section className="lowfi-panel"><h3>Trending · Karya</h3>{board.trending.slice(0, 3).map((work, index) => <article className="leader-row leader-row--work" style={{ gridTemplateColumns: '32px 48px minmax(0, 1fr)' }} key={work.id}><span>#{index + 1}</span><Link className="leader-work-image-link" href={`/karya/${work.slug}`} aria-label={`Lihat karya ${work.title}`}>{work.coverImage ? <SkeletonImage className="leader-work-thumb" src={work.coverImage} alt={`Sampul ${work.title}`} /> : <span className="leader-work-thumb leader-work-placeholder" aria-hidden="true">K</span>}</Link><span>{work.isNominee && <small className="lowfi-badge">NOMINEE</small>}<Link href={`/karya/${work.slug}`}>{displayTitle(work.title, work.studentName)}</Link><small className="leader-author" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>Oleh {work.studentID ? <Link href={`/siswa/${work.studentID}`}>{work.studentName}</Link> : work.studentName}</small></span></article>)}{!board.trending.length && <p className="leaderboard-empty">Belum ada karya yang ramai dikomentari.</p>}</section>
    </div> : <p>Data belum cukup untuk menampilkan leaderboard. Peringkat akan muncul setelah karya mendapatkan suka atau komentar.</p>) : <p>Leaderboard akan muncul setelah ada interaksi pada karya.</p>}</section>

  </main>
}
