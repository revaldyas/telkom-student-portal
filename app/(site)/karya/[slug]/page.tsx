'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { type CSSProperties, FormEvent, useEffect, useState } from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { siteFetch } from '../../../../lib/siteFetch'
import { displayTitle } from '../../../../lib/displayTitle'
import { WorkDetailSkeleton } from '../../../../components/SiteSkeletons'
import SkeletonImage from '../../../../components/SkeletonImage'

type Relation = string | number | { id: string | number; name?: string; title?: string; url?: string; code?: string; profilePhoto?: { url?: string } | string | null }
type Portfolio = {
  id: string | number
  title: string
  summary: string
  details?: SerializedEditorState | null
  slug: string
  year?: number
  projectUrl?: string
  projectFile?: { url?: string; mimeType?: string; filename?: string } | null
  tools?: string[]
  status?: string
  verificationStatus?: string
  verifiedBy?: { name?: string } | null
  accessLevel?: 'public' | 'owner' | 'mentor'
  reviewFeedback?: string | null
  reviewHistory?: Array<{ id: string | number; decision: string; feedback: string; createdAt: string; reviewer?: { name?: string } | null }>
  categoryRef?: Relation
  coverImage?: Relation
  galleryImages?: Array<{ id: string | number; url?: string; alt?: string; filename?: string }>
  student?: Relation
  isNominee?: boolean
}
type Comment = { id: string | number; content: string; createdAt: string; student?: Relation }
type Award = { id: string | number; title: string; status: string; opensAt: string; closesAt: string; nominees: Relation[] }
type Vote = { id: string | number; portfolio: Relation }

const relationName = (value?: Relation) => value && typeof value === 'object' ? value.name || value.title || '' : ''
const relationId = (value?: Relation) => value && typeof value === 'object' ? value.id : value

export default function WorkPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [awards, setAwards] = useState<Award[]>([])
  const [counts, setCounts] = useState({ likes: 0, comments: 0 })
  const [role, setRole] = useState('')
  const [myLike, setMyLike] = useState<string | number | null>(null)
  const [myVotes, setMyVotes] = useState<Record<string, Vote>>({})
  const [commentText, setCommentText] = useState('')
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mvsRank, setMvsRank] = useState(0)
  const [siteNavHeight, setSiteNavHeight] = useState(74)

  // Tautan "#komentar" dari kartu karya: konten baru muncul setelah data dimuat, jadi scroll dilakukan di sini.
  useEffect(() => {
    if (loading || !portfolio || window.location.hash !== '#komentar') return
    document.getElementById('komentar')?.scrollIntoView({ block: 'start' })
  }, [loading, portfolio])

  useEffect(() => {
    const siteNav = document.querySelector('.site-nav-shell')
    if (!siteNav) return
    const updateHeight = () => setSiteNavHeight(siteNav.getBoundingClientRect().height)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(siteNav)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`/api/community/portfolios/slug/${encodeURIComponent(slug)}`)
      const work = response.ok ? await response.json() as Portfolio : null
      if (!work) { setLoading(false); return }
      setPortfolio(work)
      let nominatedAwards: Award[] = []

      if (work.status === 'published') {
        const leaderboardResponse = await fetch('/api/community/leaderboard')
        if (leaderboardResponse.ok) {
          const leaderboard = await leaderboardResponse.json()
          const rankIndex = (leaderboard.topOverall || []).findIndex((student: { id: string | number; score?: number }) => String(student.id) === String(relationId(work.student)))
          if (rankIndex >= 0 && rankIndex < 3 && (leaderboard.topOverall[rankIndex].score || 0) > 0) setMvsRank(rankIndex + 1)
        }

        const [statsResponse, commentsResponse, awardsResponse] = await Promise.all([
          fetch(`/api/community/portfolios/${work.id}/stats`),
          fetch(`/api/community/portfolios/${work.id}/comments`),
          fetch('/api/awards?where[status][equals]=open&depth=1&limit=100'),
        ])
        if (statsResponse.ok) setCounts(await statsResponse.json())
        if (commentsResponse.ok) {
          const commentData = await commentsResponse.json()
          setComments(commentData.docs || [])
        }
        if (awardsResponse.ok) {
          const awardData = await awardsResponse.json()
          const allAwards = (awardData.docs || []) as Award[]
          nominatedAwards = allAwards.filter((award) => award.nominees?.some((nominee) => String(relationId(nominee)) === String(work.id)))
          setAwards(nominatedAwards)
        }
      }

      const meResponse = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' }).catch(() => null)
      if (meResponse?.ok) {
        const meData = await meResponse.json()
        const currentRole = meResponse.ok ? meData.user?.role || '' : ''
        setRole(currentRole)
        if (currentRole === 'student') {
          const likeResponse = await siteFetch(`/api/portfolio-likes?where[portfolio][equals]=${work.id}&limit=1`)
          if (likeResponse.ok) {
            const likeData = await likeResponse.json()
            setMyLike(likeData.docs?.[0]?.id || null)
          }
          const voteResults = await Promise.all(nominatedAwards.map(async (award) => {
            if (!award.nominees?.some((nominee) => String(relationId(nominee)) === String(work.id))) return null
            const voteResponse = await siteFetch(`/api/award-votes?where[award][equals]=${award.id}&limit=1`)
            if (!voteResponse.ok) return null
            const voteData = await voteResponse.json()
            return voteData.docs?.[0] ? [String(award.id), voteData.docs[0] as Vote] as const : null
          }))
          setMyVotes(Object.fromEntries(voteResults.filter((item): item is readonly [string, Vote] => item !== null)))
        }
      }
      setLoading(false)
    }
    void load().catch(() => { setMessage('Karya belum dapat dimuat.'); setLoading(false) })
  }, [slug])

  async function toggleLike() {
    if (role !== 'student') { router.push('/login'); return }
    if (!portfolio) return
    setBusy(true)
    try {
      const response = myLike
        ? await siteFetch(`/api/portfolio-likes/${myLike}`, { method: 'DELETE' })
        : await siteFetch('/api/portfolio-likes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portfolio: portfolio.id }) })
      const data = response.ok ? await response.json().catch(() => ({})) : await response.json()
      if (!response.ok) throw new Error(data.errors?.[0]?.message || data.message || 'Suka belum tersimpan.')
      setMyLike(myLike ? null : data.doc?.id || 'liked')
      const stats = await fetch(`/api/community/portfolios/${portfolio.id}/stats`)
      if (stats.ok) setCounts(await stats.json())
      void fetch('/api/community/leaderboard', { cache: 'no-store' }).catch(() => null)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Suka belum tersimpan.') }
    finally { setBusy(false) }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (role !== 'student') { router.push('/login'); return }
    if (!portfolio) return
    setBusy(true)
    try {
      const response = await siteFetch('/api/portfolio-comments?depth=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio: portfolio.id, content: commentText }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.errors?.[0]?.message || data.message || 'Komentar belum terkirim.')
      setComments((current) => [...current, data.doc])
      setCommentText('')
      setCounts((current) => ({ ...current, comments: current.comments + 1 }))
      void fetch('/api/community/leaderboard', { cache: 'no-store' }).catch(() => null)
      setMessage('Komentar berhasil dikirim.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Komentar belum terkirim.') }
    finally { setBusy(false) }
  }

  async function vote(award: Award) {
    if (role !== 'student' || !portfolio) { router.push('/login'); return }
    const now = Date.now()
    if (award.status !== 'open' || now < Date.parse(award.opensAt) || now > Date.parse(award.closesAt)) {
      setMessage('Voting untuk penghargaan ini sedang tidak dibuka.')
      return
    }
    setBusy(true)
    try {
      const existing = myVotes[String(award.id)]
      const response = await siteFetch(existing ? `/api/award-votes/${existing.id}` : '/api/award-votes', {
        method: existing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ award: award.id, portfolio: portfolio.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.errors?.[0]?.message || data.message || 'Suara belum tersimpan.')
      setMyVotes((current) => ({ ...current, [String(award.id)]: data.doc }))
      setMessage('Suaramu untuk karya ini berhasil disimpan.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Suara belum tersimpan.') }
    finally { setBusy(false) }
  }

  async function submitReview(decision: 'verified' | 'revision-requested') {
    if (!portfolio || role !== 'teacher') return
    const feedback = reviewFeedback.trim()
    if (feedback.length < 5) { setMessage('Pesan tinjauan minimal 5 karakter.'); return }
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/mentor/reviews', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio: portfolio.id, decision, feedback }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.errors?.[0]?.message || 'Tinjauan belum tersimpan.')
      const workResponse = await fetch(`/api/community/portfolios/slug/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      if (workResponse.ok) setPortfolio(await workResponse.json())
      setReviewFeedback('')
      setMessage(decision === 'verified' ? 'Karya terverifikasi dan diterbitkan.' : 'Pesan revisi berhasil dikirim kepada siswa.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Tinjauan belum tersimpan.') }
    finally { setBusy(false) }
  }

  if (loading) return <WorkDetailSkeleton />
  if (!portfolio) return <main className="lowfi-shell"><p>Karya tidak tersedia atau akunmu tidak memiliki akses.</p><Link href="/">Kembali ke beranda</Link></main>
  const author = typeof portfolio.student === 'object' ? portfolio.student : null
  const authorId = relationId(portfolio.student)
  const authorPhotoValue = author?.profilePhoto
  const authorPhoto = typeof authorPhotoValue === 'object' && authorPhotoValue ? authorPhotoValue.url : typeof authorPhotoValue === 'string' ? authorPhotoValue : null
  const image = portfolio.coverImage && typeof portfolio.coverImage === 'object' ? portfolio.coverImage.url : null
  const category = relationName(portfolio.categoryRef)
  const isDraft = portfolio.status !== 'published'

  return <main className={`lowfi-shell${isDraft ? ' work-detail-shell work-detail-shell--draft' : ''}`} style={{ '--site-nav-height': `${siteNavHeight}px` } as CSSProperties}>
    {isDraft && <aside className="work-review-sidebar" aria-label="Status dan riwayat verifikasi">
      {message && <p className="mentor-message" role="status">{message}</p>}
      <div className="work-review-sidebar-section"><span className="section-kicker">STATUS KARYA</span><div className="work-status-strip" aria-label="Status karya">
        <span className="work-state work-state--draft">DRAF</span>
        <span className={portfolio.verificationStatus === 'verified' ? 'work-state work-state--verified' : portfolio.verificationStatus === 'revision-requested' ? 'work-state work-state--revision' : 'work-state work-state--pending'}>{portfolio.verificationStatus === 'verified' ? 'TERVERIFIKASI' : portfolio.verificationStatus === 'revision-requested' ? 'PERLU REVISI' : portfolio.verificationStatus === 'unreviewed' ? 'DRAF' : 'MENUNGGU VERIFIKASI'}</span>
      </div></div>
      {portfolio.verificationStatus === 'verified' && <p className="verified-callout">Terverifikasi oleh {portfolio.verifiedBy?.name || 'Guru pembimbing'} · menunggu publikasi</p>}
      {portfolio.reviewFeedback && <section className="work-review-latest"><span className="section-kicker">PESAN TERAKHIR</span><p>{portfolio.reviewFeedback}</p></section>}
      <section className="work-review-history"><h2>Riwayat tinjauan</h2>{portfolio.reviewHistory && portfolio.reviewHistory.length > 0 ? <ol>{portfolio.reviewHistory.map((review) => <li key={review.id}><div className="work-review-history-heading"><strong>{review.decision === 'verified' ? 'Terverifikasi' : 'Perlu revisi'}</strong><time>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(review.createdAt))}</time></div><p>{review.feedback}</p><small>Oleh {review.reviewer?.name || 'Guru pembimbing'}</small></li>)}</ol> : <p className="work-review-empty">Belum ada tinjauan dari Guru.</p>}</section>
      {portfolio.accessLevel === 'mentor' && <section className="work-review-action"><h2>Tinjau karya</h2><label htmlFor="mentor-review-feedback">Pesan untuk siswa</label><textarea id="mentor-review-feedback" value={reviewFeedback} onChange={(event) => setReviewFeedback(event.target.value)} minLength={5} maxLength={3000} placeholder="Tuliskan revisi atau catatan untuk siswa…"/><div className="mentor-actions"><button className="button mentor-revision" type="button" disabled={busy} onClick={() => void submitReview('revision-requested')}>{busy ? 'Menyimpan…' : 'Minta revisi'}</button><button className="button button-primary" type="button" disabled={busy} onClick={() => void submitReview('verified')}>{busy ? 'Menyimpan…' : 'Verifikasi & terbitkan'}</button></div></section>}
      {portfolio.accessLevel === 'mentor' && <Link className="work-review-back" href="/portal/guru/verifikasi">Kembali ke antrean ↗</Link>}
    </aside>}
    {!isDraft && message && <p className="mentor-message work-page-message" role="status">{message}</p>}
    <article className="lowfi-content work-detail">
      <header className="work-detail-heading">
      <p><Link href="/">Beranda</Link> / Karya</p>
      <h1>{displayTitle(portfolio.title, author?.name)}</h1>
      {portfolio.isNominee && <span className="lowfi-badge">NOMINEE</span>}
      <p>{category} · {portfolio.year}</p>
      {!isDraft && <div className="work-status-strip" aria-label="Status karya">
        <span className={portfolio.status === 'published' ? 'work-state work-state--published' : 'work-state work-state--draft'}>{portfolio.status === 'published' ? 'TERBIT' : 'DRAF'}</span>
        <span className={portfolio.verificationStatus === 'verified' ? 'work-state work-state--verified' : portfolio.verificationStatus === 'revision-requested' ? 'work-state work-state--revision' : 'work-state work-state--pending'}>{portfolio.verificationStatus === 'verified' ? 'TERVERIFIKASI' : portfolio.verificationStatus === 'revision-requested' ? 'PERLU REVISI' : portfolio.verificationStatus === 'unreviewed' ? 'DRAF' : 'MENUNGGU VERIFIKASI'}</span>
      </div>}
      <p className="work-author">Oleh <Link href={`/siswa/${authorId}`}>{authorPhoto ? <span className="mvs-avatar"><SkeletonImage className="work-author-placeholder" src={authorPhoto} alt="" />{mvsRank > 0 && <small className="mvs-rank-badge">MVS #{mvsRank}</small>}</span> : mvsRank > 0 ? <span className="mvs-avatar work-author-placeholder">{(author?.name || 'Siswa').slice(0, 1).toUpperCase()}<small className="mvs-rank-badge">MVS #{mvsRank}</small></span> : null}{author?.name || 'Siswa'}</Link></p>
      </header>
      {image && <SkeletonImage className="lowfi-cover" src={image} alt={`Sampul ${portfolio.title}`} />}
      {portfolio.galleryImages?.some((item) => item.url) && <section className="work-gallery" aria-labelledby="work-gallery-title">
        <h2 id="work-gallery-title">Galeri karya</h2>
        <div className="work-gallery-grid">{portfolio.galleryImages.filter((item) => item.url).map((item) => <SkeletonImage key={item.id} className="work-gallery-image" src={item.url!} alt={item.alt || item.filename || `Galeri ${portfolio.title}`} />)}</div>
      </section>}
      <div className="work-detail-body">
      <p>{portfolio.summary}</p>
      {portfolio.details && <section className="portfolio-richtext" aria-label="Detail karya"><h2>Detail karya</h2><RichText data={portfolio.details} className="portfolio-richtext-content" /></section>}
      {portfolio.tools?.length ? <p><strong>Perangkat & teknologi yang digunakan:</strong> {portfolio.tools.join(', ')}</p> : null}
      {portfolio.projectUrl && <p><a href={portfolio.projectUrl} target="_blank" rel="noreferrer">Buka tautan karya</a></p>}
      {portfolio.projectFile?.url && (portfolio.projectFile.mimeType?.startsWith('video/')
        ? <video className="work-project-video" controls preload="metadata" src={portfolio.projectFile.url}>Browser tidak mendukung pemutaran video.</video>
        : <a className="work-project-file" href={portfolio.projectFile.url} target="_blank" rel="noreferrer">Lihat atau unduh dokumen · {portfolio.projectFile.filename || 'PDF'} ↗</a>)}
      {portfolio.status === 'published' ? <>
        <div className="lowfi-actions"><button type="button" disabled={busy} onClick={() => void toggleLike()}>{myLike ? '♥ Disukai' : '♡ Suka'} · {counts.likes}</button><span>{counts.comments} komentar</span></div>
        {awards.length > 0 && <section className="lowfi-panel"><h2>Voting Penghargaan</h2><p>Karya ini masuk nominasi penghargaan yang sedang tersedia.</p>{awards.map((award) => <div className="lowfi-row" key={award.id}><span>{award.title}</span><button disabled={busy || role === 'teacher' || role === 'admin'} onClick={() => void vote(award)}>{myVotes[String(award.id)] ? 'Ubah suara' : 'Vote karya'}</button></div>)}</section>}
        <section className="lowfi-panel" id="komentar"><h2>Komentar ({comments.length})</h2><form onSubmit={submitComment}><label htmlFor="comment">Tulis komentar</label><textarea id="comment" value={commentText} onChange={(event) => setCommentText(event.target.value)} required minLength={2} maxLength={1200} placeholder="Berikan tanggapan yang membangun…"/><button disabled={busy || !commentText.trim()}>{busy ? 'Mengirim…' : 'Kirim komentar'}</button></form>{comments.map((comment) => <article className="lowfi-comment" key={comment.id}><p>{comment.content}</p><small><Link href={`/siswa/${relationId(comment.student)}`}>{relationName(comment.student) || 'Siswa'}</Link> · {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(comment.createdAt))}</small></article>)}</section>
      </> : <section className="lowfi-panel"><h2>Interaksi karya</h2><p>Suka, komentar, dan voting akan tersedia setelah karya diterbitkan.</p></section>}
      </div>
    </article>
  </main>
}
