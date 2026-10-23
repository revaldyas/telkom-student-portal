'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { displayTitle } from '../../../lib/displayTitle'
import { LeaderboardSkeleton } from '../../../components/SiteSkeletons'
import SkeletonImage from '../../../components/SkeletonImage'
import MvsPodium, { chatIcon, heartIcon } from '../../../components/MvsPodium'
import '../listing.css'
import { ListingHead, SearchField } from '../../../components/ListingControls'
import DashIcon from '../../../components/DashIcon'

type Leader = { id: string; name: string; profilePhoto: string | null; likes: number; comments: number; karya: number; score?: number }
type RankedPortfolio = { id: string; slug: string; title: string; studentID?: string; studentName: string; profilePhoto: string | null; coverImage: string | null; likes: number; comments: number; isNominee?: boolean }
type RankedProject = { id: string; slug: string; title: string; category: string | null; coverImage: string | null; members: { id: string | number; name: string }[]; likes: number; comments: number }
type Board = { topLikes: RankedPortfolio[]; trending: RankedPortfolio[]; topOverall: Leader[]; topProjects?: RankedProject[]; trendingProjects?: RankedProject[] }
type Tab = 'all' | 'mvs' | 'likes' | 'trending' | 'projects'

const fireIcon = <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 22c4 0 7-2.8 7-7 0-3-1.8-5-3.5-6.8-.4 1.4-1.2 2.3-2.2 2.8.2-3.2-1.3-6-4.3-8C9 6 5 9.5 5 15c0 4.2 3 7 7 7Z"/></svg>
const MVS_LIMIT = 20

function StudentList({ title, rows, offset = 0, onMore }: { title: string; rows: Leader[]; offset?: number; onMore?: () => void }) {
  return <section className="lb-list-card"><div className="lb-list-head"><span className="lb-list-icon lb-list-icon--gold" aria-hidden="true"><DashIcon name="crown" size={16} /></span><h3>{title}</h3></div>{rows.length ? rows.map((student, index) => <article className="lb-row lb-row--student" key={student.id}>
    <span className="lb-rank">{offset + index + 1}</span>
    <Link className="lb-thumb" href={`/siswa/${student.id}`} aria-label={`Profil ${student.name}`}>{student.profilePhoto ? <SkeletonImage src={student.profilePhoto} alt="" /> : <span aria-hidden="true">{student.name.slice(0, 1).toUpperCase()}</span>}</Link>
    <div className="lb-info"><Link className="lb-title" href={`/siswa/${student.id}`}>{student.name}</Link><small className="lb-author">{student.karya} karya</small></div>
    <div className="lb-stats"><span>{heartIcon}{student.likes}</span><span>{chatIcon}{student.comments}</span></div>
  </article>) : <p className="leaderboard-empty">Belum ada data untuk peringkat ini.</p>}{onMore && <button type="button" className="lbp-more" onClick={onMore}>Tampilkan lebih banyak</button>}</section>
}

function ProjectList({ title, rows, icon, tone, metric }: { title: string; rows: RankedProject[]; icon: React.ReactNode; tone?: 'hot'; metric: 'likes' | 'comments' }) {
  return <section className="lb-list-card"><div className="lb-list-head"><span className={`lb-list-icon${tone ? ` lb-list-icon--${tone}` : ''}`} aria-hidden="true">{icon}</span><h3>{title}</h3></div>{rows.length ? rows.map((project, index) => <article className="lb-row" key={project.id}>
    <span className="lb-rank">{index + 1}</span>
    <Link className="lb-thumb" href={`/proyek/${project.slug}`} aria-label={`Lihat proyek ${project.title}`}>{project.coverImage ? <SkeletonImage src={project.coverImage} alt="" /> : <span aria-hidden="true">P</span>}</Link>
    <div className="lb-info"><Link className="lb-title" href={`/proyek/${project.slug}`}>{project.title}</Link><small className="lb-author">{project.category ? `${project.category} · ` : ''}{project.members.slice(0, 2).map((member) => member.name).join(', ')}{project.members.length > 2 ? ` +${project.members.length - 2}` : ''}</small></div>
    <div className="lb-stats"><span>{heartIcon}{project.likes}</span><span>{chatIcon}{project.comments}</span></div>
  </article>) : <p className="leaderboard-empty">{metric === 'likes' ? 'Belum ada proyek yang disukai.' : 'Belum ada proyek yang ramai dikomentari.'}</p>}</section>
}

function WorkList({ title, rows, icon, tone, onAll }: { title: string; rows: RankedPortfolio[]; icon: React.ReactNode; tone?: 'hot'; onAll?: () => void }) {
  return <section className="lb-list-card"><div className="lb-list-head"><span className={`lb-list-icon${tone ? ` lb-list-icon--${tone}` : ''}`} aria-hidden="true">{icon}</span><h3>{title}</h3>{onAll && <button type="button" className="lbp-all" onClick={onAll}>Lihat semua <span aria-hidden="true">→</span></button>}</div>{rows.length ? rows.map((work, index) => <article className="lb-row" key={work.id}>
    <span className="lb-rank">{index + 1}</span>
    <Link className="lb-thumb" href={`/karya/${work.slug}`} aria-label={`Lihat karya ${work.title}`}>{work.coverImage ? <SkeletonImage src={work.coverImage} alt="" /> : <span aria-hidden="true">K</span>}</Link>
    <div className="lb-info">{work.isNominee && <small className="lb-nominee">NOMINEE</small>}<Link className="lb-title" href={`/karya/${work.slug}`}>{displayTitle(work.title, work.studentName)}</Link><small className="lb-author">Oleh {work.studentID ? <Link href={`/siswa/${work.studentID}`}>{work.studentName}</Link> : work.studentName}</small></div>
    <div className="lb-stats"><span>{heartIcon}{work.likes}</span><span>{chatIcon}{work.comments}</span></div>
  </article>) : <p className="leaderboard-empty">Belum ada data untuk daftar ini.</p>}</section>
}

export default function LeaderboardPage() {
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [mvsLimit, setMvsLimit] = useState(MVS_LIMIT)

  useEffect(() => {
    fetch('/api/community/leaderboard').then((response) => response.ok ? response.json() : null).then(setBoard).finally(() => setLoading(false))
    const params = new URLSearchParams(window.location.search)
    setQuery(params.get('q') || '')
    const requested = params.get('tab')
    if (requested === 'mvs' || requested === 'likes' || requested === 'trending' || requested === 'projects') setTab(requested)
  }, [])
  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (tab !== 'all') params.set('tab', tab)
    const next = params.toString()
    window.history.replaceState(null, '', next ? `?${next}` : window.location.pathname)
  }, [query, tab])

  const needle = query.trim().toLocaleLowerCase('id')
  const ranked = useMemo(() => (board?.topOverall || []).filter((student) => (student.score || 0) > 0), [board])
  const mvs = useMemo(() => ranked.filter((student) => !needle || student.name.toLocaleLowerCase('id').includes(needle)), [ranked, needle])
  const likes = useMemo(() => (board?.topLikes || []).filter((work) => !needle || `${work.title} ${work.studentName}`.toLocaleLowerCase('id').includes(needle)), [board, needle])
  const topProjects = useMemo(() => (board?.topProjects || []).filter((project) => !needle || `${project.title} ${project.members.map((member) => member.name).join(' ')}`.toLocaleLowerCase('id').includes(needle)), [board, needle])
  const trendingProjects = useMemo(() => (board?.trendingProjects || []).filter((project) => !needle || `${project.title} ${project.members.map((member) => member.name).join(' ')}`.toLocaleLowerCase('id').includes(needle)), [board, needle])
  const trending = useMemo(() => (board?.trending || []).filter((work) => !needle || `${work.title} ${work.studentName}`.toLocaleLowerCase('id').includes(needle)), [board, needle])

  const tabs: { value: Tab; label: string; count?: number }[] = [
    { value: 'all', label: 'Ringkasan' }, { value: 'mvs', label: 'Most Valuable Student', count: mvs.length },
    { value: 'likes', label: 'Top Likes', count: likes.length }, { value: 'trending', label: 'Trending', count: trending.length },
    { value: 'projects', label: 'Proyek', count: new Set([...topProjects, ...trendingProjects].map((project) => project.id)).size },
  ]
  const showPodium = !needle && (tab === 'all' || tab === 'mvs') && ranked.length > 0

  return <main className="lowfi-shell">
    <section className="lowfi-content kl-page">
      <ListingHead crumb="Leaderboard" title="Leaderboard" count={loading ? null : String(ranked.length)} lead="Top Likes dan Trending menampilkan karya beserta siswanya. Most Valuable Student dihitung dari total interaksi seluruh karya tiap siswa." />
      <div className="kl-bar">
        <SearchField value={query} onChange={setQuery} placeholder="Nama siswa atau judul karya…" label="Cari siswa atau karya" />
        <div className="lbp-tabs" role="tablist" aria-label="Pilih peringkat">{tabs.map((item) => <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} className={tab === item.value ? 'is-active' : ''} onClick={() => setTab(item.value)}>{item.label}{item.count !== undefined && !loading && <small>{item.count}</small>}</button>)}</div>
        {query && <button type="button" className="kl-reset" onClick={() => setQuery('')}>Reset</button>}
      </div>

      {loading ? <LeaderboardSkeleton rows={6} /> : !board ? <p className="kl-note">Leaderboard belum dapat dimuat.</p> : <>
        {tab === 'all' && <div className="lbp-grid">
          {showPodium ? <MvsPodium leaders={ranked.slice(0, 3)} /> : <StudentList title="Most Valuable Student" rows={mvs.slice(0, 5)} />}
          <div className="lbp-stack">
            <WorkList title="Top Likes · Karya" rows={likes.slice(0, 5)} icon={heartIcon} onAll={() => setTab('likes')} />
            <WorkList title="Trending · Karya" rows={trending.slice(0, 5)} icon={fireIcon} tone="hot" onAll={() => setTab('trending')} />
          </div>
        </div>}
        {tab === 'mvs' && <div className={showPodium ? 'lbp-grid' : 'lbp-single'}>
          {showPodium && <MvsPodium leaders={ranked.slice(0, 3)} />}
          <StudentList title={showPodium ? 'Peringkat berikutnya' : 'Most Valuable Student'} rows={(showPodium ? mvs.slice(3) : mvs).slice(0, mvsLimit)} offset={showPodium ? 3 : 0} onMore={(showPodium ? mvs.length - 3 : mvs.length) > mvsLimit ? () => setMvsLimit((count) => count + MVS_LIMIT) : undefined} />
        </div>}
        {tab === 'likes' && <div className="lbp-single"><WorkList title="Top Likes · Karya" rows={likes} icon={heartIcon} /></div>}
        {tab === 'projects' && <div className="lbp-projects"><ProjectList title="Top Likes · Proyek" rows={topProjects} icon={heartIcon} metric="likes" /><ProjectList title="Trending · Proyek" rows={trendingProjects} icon={fireIcon} tone="hot" metric="comments" /></div>}
        {tab === 'trending' && <div className="lbp-single"><WorkList title="Trending · Karya" rows={trending} icon={fireIcon} tone="hot" /></div>}
      </>}
    </section>
  </main>
}
