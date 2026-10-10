'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { displayTitle } from '../../../lib/displayTitle'
import { LeaderboardSkeleton } from '../../../components/SiteSkeletons'
import SkeletonImage from '../../../components/SkeletonImage'

type Leader = { id: string; name: string; profilePhoto: string | null; likes: number; comments: number; karya: number; score?: number }
type RankedPortfolio = { id: string; slug: string; title: string; studentID?: string; studentName: string; profilePhoto: string | null; coverImage: string | null; likes: number; comments: number; isNominee?: boolean }
type Board = { topLikes: RankedPortfolio[]; trending: RankedPortfolio[]; topOverall: Leader[] }
type BoardFilter = 'all' | 'mvs' | 'likes' | 'trending'

function Ranking({ title, rows }: { title: string; rows: Leader[] }) {
  return <section className="lowfi-panel"><h2>{title}</h2>{rows.length ? rows.map((student, index) => <article className="leader-row" key={student.id}>
    <span>#{index + 1}</span>
    <span className="mvs-avatar">{student.profilePhoto ? <SkeletonImage src={student.profilePhoto} alt={`Foto profil ${student.name}`} /> : <span className="leader-initial">{student.name.slice(0, 1)}</span>}<small className="mvs-rank-badge">MVS #{index + 1}</small></span>
    <Link href={`/siswa/${student.id}`}>{student.name}</Link>
  </article>) : <p>Belum ada data untuk peringkat ini.</p>}</section>
}

function RankedWorks({ title, rows }: { title: string; rows: RankedPortfolio[] }) {
  return <section className="lowfi-panel"><h2>{title} · Karya</h2>{rows.length ? rows.map((work, index) => <article className="leader-row leader-row--work" style={{ gridTemplateColumns: '32px 48px minmax(0, 1fr)' }} key={work.id}>
    <span>#{index + 1}</span>
    <Link className="leader-work-image-link" href={`/karya/${work.slug}`} aria-label={`Lihat karya ${work.title}`}>
      {work.coverImage ? <SkeletonImage className="leader-work-thumb" src={work.coverImage} alt={`Sampul ${work.title}`} /> : <span className="leader-work-thumb leader-work-placeholder" aria-hidden="true">K</span>}
    </Link>
    <span>{work.isNominee && <small className="lowfi-badge">NOMINEE</small>}<Link href={`/karya/${work.slug}`}>{displayTitle(work.title, work.studentName)}</Link><small className="leader-author" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>Oleh {work.studentID ? <Link href={`/siswa/${work.studentID}`}>{work.studentName}</Link> : work.studentName}</small></span>
  </article>) : <p>Data belum cukup untuk menampilkan karya di {title}.</p>}</section>
}

export default function LeaderboardPage() {
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<BoardFilter>('all')
  useEffect(() => {
    fetch('/api/community/leaderboard').then((response) => response.ok ? response.json() : null).then(setBoard).finally(() => setLoading(false))
    const params = new URLSearchParams(window.location.search)
    setQuery(params.get('q') || '')
    const requestedFilter = params.get('tab')
    if (requestedFilter === 'mvs' || requestedFilter === 'likes' || requestedFilter === 'trending') setFilter(requestedFilter)
  }, [])
  const normalizedQuery = query.trim().toLocaleLowerCase('id')
  const visibleMVS = (board?.topOverall || []).filter((student) => !normalizedQuery || student.name.toLocaleLowerCase('id').includes(normalizedQuery))
  const visibleTopLikes = (board?.topLikes || []).filter((work) => !normalizedQuery || `${work.title} ${work.studentName}`.toLocaleLowerCase('id').includes(normalizedQuery))
  const visibleTrending = (board?.trending || []).filter((work) => !normalizedQuery || `${work.title} ${work.studentName}`.toLocaleLowerCase('id').includes(normalizedQuery))
  return <main className="lowfi-shell">
    <section className="lowfi-content"><p>Komunitas / Peringkat</p><h1>Leaderboard</h1><p>Top Likes dan Trending menampilkan karya beserta siswanya. Most Valuable Student dihitung dari total interaksi seluruh karya tiap siswa.</p>
      <div className="listing-filters leaderboard-filters">
        <label className="listing-search"><span>Cari siswa atau karya</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nama siswa atau judul karya…" /></label>
        <label><span>Daftar</span><select value={filter} onChange={(event) => setFilter(event.target.value as BoardFilter)}><option value="all">Semua peringkat</option><option value="mvs">Most Valuable Student</option><option value="likes">Top Likes</option><option value="trending">Trending</option></select></label>
        {(query || filter !== 'all') && <button type="button" onClick={() => { setQuery(''); setFilter('all') }}>Hapus filter</button>}
      </div>
      {loading ? <LeaderboardSkeleton rows={6} /> : board ? <div className="leader-grid">
        {(filter === 'all' || filter === 'mvs') && <Ranking title="Most Valuable Student" rows={visibleMVS} />}
        {(filter === 'all' || filter === 'likes') && <RankedWorks title="Top Likes" rows={visibleTopLikes} />}
        {(filter === 'all' || filter === 'trending') && <RankedWorks title="Trending" rows={visibleTrending} />}
      </div> : <p>Leaderboard belum dapat dimuat.</p>}
    </section>
  </main>
}
