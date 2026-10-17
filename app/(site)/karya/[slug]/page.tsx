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
import './work-detail.css'

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
  verifiedBy?: { id?: string | number; name?: string; photo?: string | null } | null
  verifiedAt?: string | null
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
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  useEffect(() => {
    if (!lightbox) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setLightbox(null) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [lightbox])

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
      // Sesi dan papan peringkat tidak bergantung pada karya: diminta bersamaan dengan karya (bukan berurutan).
      const sessionPromise = fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.ok ? r.json() : null).catch(() => null)
      const boardPromise = fetch('/api/community/leaderboard').then((r) => r.ok ? r.json() : null).catch(() => null)
      const response = await fetch(`/api/community/portfolios/slug/${encodeURIComponent(slug)}`)
      const work = response.ok ? await response.json() as Portfolio : null
      if (!work) { setLoading(false); return }
      setPortfolio(work)
      let nominatedAwards: Award[] = []

      if (work.status === 'published') {
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

      const [meData, leaderboard] = await Promise.all([sessionPromise, boardPromise])
      const currentRole = meData?.user?.role || ''
      setRole(currentRole)
      if (work.status === 'published' && leaderboard) {
        const rankIndex = (leaderboard.topOverall || []).findIndex((student: { id: string | number; score?: number }) => String(student.id) === String(relationId(work.student)))
        if (rankIndex >= 0 && rankIndex < 3 && (leaderboard.topOverall[rankIndex].score || 0) > 0) setMvsRank(rankIndex + 1)
      }
      // Halaman tampil segera; status suka dan suara pribadi menyusul tanpa menahan tampilan.
      setLoading(false)

      if (currentRole === 'student' || currentRole === 'teacher') {
        const [likeResponse, voteResults] = await Promise.all([
          siteFetch(`/api/portfolio-likes?where[portfolio][equals]=${work.id}&limit=1`),
          Promise.all(nominatedAwards.map(async (award) => {
            const voteResponse = await siteFetch(`/api/award-votes?where[award][equals]=${award.id}&limit=1`)
            if (!voteResponse.ok) return null
            const voteData = await voteResponse.json()
            return voteData.docs?.[0] ? [String(award.id), voteData.docs[0] as Vote] as const : null
          })),
        ])
        if (likeResponse.ok) {
          const likeData = await likeResponse.json()
          setMyLike(likeData.docs?.[0]?.id || null)
        }
        setMyVotes(Object.fromEntries(voteResults.filter((item): item is readonly [string, Vote] => item !== null)))
      }
    }
    void load().catch(() => { setMessage('Karya belum dapat dimuat.'); setLoading(false) })
  }, [slug])

  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href.split('#')[0]); setMessage('Tautan karya disalin.') }
    catch { setMessage('Salin tautan dari bilah alamat browser.') }
  }

  async function toggleLike() {
    if (role !== 'student' && role !== 'teacher') { router.push('/login'); return }
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
    if (role !== 'student' && role !== 'teacher') { router.push('/login'); return }
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
  const authorName = author?.name || 'Siswa'
  const gallery = (portfolio.galleryImages || []).filter((item) => item.url)
  const verified = portfolio.verificationStatus === 'verified'
  const canInteract = role !== 'teacher' && role !== 'admin'

  return <main className={`lowfi-shell wd-shell${isDraft ? ' work-detail-shell work-detail-shell--draft' : ''}`} style={{ '--site-nav-height': `${siteNavHeight}px` } as CSSProperties}>
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

    <article className="wd">
      {!isDraft && message && <p className="wd-toast" role="status">{message}</p>}
      <nav className="wd-crumb" aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>/</span><Link href="/karya">Eksplor Karya</Link><span>/</span><span aria-current="page">{displayTitle(portfolio.title, authorName)}</span></nav>

      <header className="wd-head">
        <div className="wd-chips">
          {category && <span className="wd-chip">{category}{portfolio.year ? ` · ${portfolio.year}` : ''}</span>}
          {portfolio.isNominee && <span className="wd-chip wd-chip--gold">★ Nominee</span>}
          {verified && <span className="wd-chip wd-chip--green">✓ Terverifikasi</span>}
          {isDraft && <span className="wd-chip wd-chip--grey">Draf</span>}
        </div>
        <h1>{displayTitle(portfolio.title, authorName)}</h1>
        {portfolio.summary && <p className="wd-lead">{portfolio.summary}</p>}
      </header>

      <div className="wd-layout">
        <div className="wd-main">
          {image ? <figure className="wd-cover"><button type="button" onClick={() => setLightbox({ src: image, alt: `Sampul ${portfolio.title}` })} aria-label="Perbesar gambar sampul"><SkeletonImage src={image} alt={`Sampul ${portfolio.title}`} /><span className="wd-zoom" aria-hidden="true">⤢</span></button></figure> : null}

          {gallery.length > 0 && <section className="wd-section" aria-labelledby="wd-gallery"><h2 id="wd-gallery">Galeri <small>{gallery.length}</small></h2>
            <div className="wd-gallery">{gallery.map((item) => <button type="button" key={item.id} onClick={() => setLightbox({ src: item.url!, alt: item.alt || item.filename || `Galeri ${portfolio.title}` })} aria-label="Perbesar gambar galeri"><SkeletonImage src={item.url!} alt={item.alt || item.filename || `Galeri ${portfolio.title}`} /></button>)}</div></section>}

          {portfolio.details && <section className="wd-section" aria-label="Detail karya"><h2>Tentang karya</h2><div className="wd-prose"><RichText data={portfolio.details} className="portfolio-richtext-content" /></div></section>}

          {portfolio.projectFile?.url && <section className="wd-section"><h2>Lampiran</h2>{portfolio.projectFile.mimeType?.startsWith('video/')
            ? <video className="wd-video" controls preload="metadata" src={portfolio.projectFile.url}>Browser tidak mendukung pemutaran video.</video>
            : <a className="wd-file" href={portfolio.projectFile.url} target="_blank" rel="noreferrer"><span aria-hidden="true">📄</span><div><strong>{portfolio.projectFile.filename || 'Dokumen pendukung'}</strong><small>Lihat atau unduh dokumen</small></div><b aria-hidden="true">↗</b></a>}</section>}

          {portfolio.status === 'published' ? <section className="wd-section wd-comments" id="komentar"><h2>Komentar <small>{comments.length}</small></h2>
            <form onSubmit={submitComment} className="wd-comment-form"><label htmlFor="comment" className="sr-only">Tulis komentar</label><textarea id="comment" value={commentText} onChange={(event) => setCommentText(event.target.value)} required minLength={2} maxLength={1200} placeholder={role === 'student' || role === 'teacher' ? 'Berikan tanggapan yang membangun…' : 'Masuk untuk berkomentar'} /><div><small>{commentText.length}/1200</small><button disabled={busy || !commentText.trim()}>{busy ? 'Mengirim…' : 'Kirim komentar'}</button></div></form>
            {comments.length ? <ul className="wd-comment-list">{[...comments].reverse().map((comment) => { const commenterPhoto = typeof comment.student === 'object' && comment.student && typeof comment.student.profilePhoto === 'object' && comment.student.profilePhoto ? comment.student.profilePhoto.url : null; const commenter = relationName(comment.student) || 'Siswa'; return <li key={comment.id}><span className="wd-avatar sm">{commenterPhoto ? <SkeletonImage src={commenterPhoto} alt="" /> : commenter.slice(0, 1).toUpperCase()}</span><div><p className="wd-comment-meta"><Link href={`/siswa/${relationId(comment.student)}`}>{commenter}</Link><time dateTime={comment.createdAt}>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(comment.createdAt))}</time></p><p>{comment.content}</p></div></li> })}</ul> : <p className="wd-empty">Belum ada komentar. Jadilah yang pertama memberi tanggapan.</p>}
          </section> : <section className="wd-section"><h2>Interaksi karya</h2><p className="wd-empty">Suka, komentar, dan voting akan tersedia setelah karya diterbitkan.</p></section>}
        </div>

        <aside className="wd-side" aria-label="Informasi karya">
          <section className="wd-card wd-author">
            <Link className="wd-avatar" href={`/siswa/${authorId}`} aria-label={`Profil ${authorName}`}>{authorPhoto ? <SkeletonImage src={authorPhoto} alt="" /> : authorName.slice(0, 1).toUpperCase()}{mvsRank > 0 && <small>MVS #{mvsRank}</small>}</Link>
            <div><span className="wd-label">Dibuat oleh</span><Link className="wd-author-name" href={`/siswa/${authorId}`}>{authorName}</Link></div>
            <Link className="wd-ghost" href={`/siswa/${authorId}`}>Lihat profil ↗</Link>
          </section>

          {portfolio.status === 'published' && <section className="wd-card wd-actions">
            <button type="button" className={`wd-like${myLike ? ' is-liked' : ''}`} disabled={busy} aria-pressed={Boolean(myLike)} onClick={() => void toggleLike()}><span aria-hidden="true">{myLike ? '♥' : '♡'}</span>{myLike ? 'Disukai' : 'Suka'}<b>{counts.likes}</b></button>
            <div className="wd-row"><a className="wd-ghost" href="#komentar">◉ {counts.comments} komentar</a><button type="button" className="wd-ghost" onClick={() => void copyLink()}>Salin tautan</button></div>
            {role !== 'student' && role !== 'teacher' && <p className="wd-hint">Masuk untuk menyukai dan berkomentar. <Link href="/login">Masuk</Link></p>}
          </section>}

          {(portfolio.projectUrl || portfolio.tools?.length) ? <section className="wd-card">
            {portfolio.projectUrl && <a className="wd-cta" href={portfolio.projectUrl} target="_blank" rel="noreferrer">Buka tautan karya <span aria-hidden="true">↗</span></a>}
            {portfolio.tools?.length ? <div className="wd-tools"><span className="wd-label">Perangkat &amp; teknologi</span><ul>{portfolio.tools.map((tool) => <li key={tool}>{tool}</li>)}</ul></div> : null}
          </section> : null}

          {awards.length > 0 && <section className="wd-card wd-awards"><span className="wd-label">Voting penghargaan</span><p>Karya ini masuk nominasi yang sedang dibuka.</p>{awards.map((award) => <div className="wd-award" key={award.id}><strong>{award.title}</strong><button type="button" disabled={busy || !canInteract} onClick={() => void vote(award)}>{myVotes[String(award.id)] ? 'Ubah suara' : 'Vote karya'}</button></div>)}</section>}

          {verified && <section className="wd-card wd-verified">
            <span className="wd-seal" aria-hidden="true">✓</span>
            <div><strong>Terverifikasi guru pembimbing</strong>
              {portfolio.verifiedBy?.name
                ? <Link className="wd-mentor" href={portfolio.verifiedBy.id ? `/guru/${portfolio.verifiedBy.id}` : '#'}><span className="wd-avatar sm">{portfolio.verifiedBy.photo ? <SkeletonImage src={portfolio.verifiedBy.photo} alt="" /> : portfolio.verifiedBy.name.slice(0, 1).toUpperCase()}</span><span><b>{portfolio.verifiedBy.name}</b>{portfolio.verifiedAt && <small>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date(portfolio.verifiedAt))}</small>}</span></Link>
                : <small>Telah ditinjau guru pembimbing</small>}
            </div></section>}
        </aside>
      </div>
    </article>

    {lightbox && <div className="wd-lightbox" role="dialog" aria-modal="true" aria-label="Pratinjau gambar" onClick={() => setLightbox(null)}><button type="button" aria-label="Tutup" onClick={() => setLightbox(null)}>×</button><img src={lightbox.src} alt={lightbox.alt} onClick={(event) => event.stopPropagation()} /></div>}
  </main>
}
