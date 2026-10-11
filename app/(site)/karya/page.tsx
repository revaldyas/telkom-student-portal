'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { displayTitle } from '../../../lib/displayTitle'
import { WorkGridSkeleton } from '../../../components/SiteSkeletons'
import SkeletonImage from '../../../components/SkeletonImage'

type Student = { id: string | number; name?: string; profilePhoto?: string | null; class?: { id: string | number; name?: string } | string | number | null; program?: { id: string | number; name?: string } | string | number | null }
type Portfolio = {
  id: string | number
  slug: string
  title: string
  summary: string
  student?: Student | string | number | null
  categoryRef?: { id?: string | number; name?: string; code?: string } | string | number | null
  year?: number
  coverImage?: { url?: string } | string | number | null
  likes?: number
  comments?: number
  isNominee?: boolean
  verificationStatus?: string
}
type RankedStudent = { id: string | number; score?: number }
type FilterOption = { id: string | number; name: string; program?: { id: string | number; name?: string } | string | number }

const studentID = (student: Portfolio['student']) => typeof student === 'object' && student ? student.id : student
const studentName = (student: Portfolio['student']) => typeof student === 'object' && student ? student.name || 'Siswa' : 'Siswa'
const studentPhoto = (student: Portfolio['student']) => typeof student === 'object' && student ? student.profilePhoto || null : null

export default function AllWorksPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [mvsStudents, setMvsStudents] = useState<RankedStudent[]>([])
  const [categories, setCategories] = useState<FilterOption[]>([])
  const [classes, setClasses] = useState<FilterOption[]>([])
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [nomineesOnly, setNomineesOnly] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/community/feed?limit=1000').then(async (response) => response.ok ? response.json() : null),
      fetch('/api/community/leaderboard').then(async (response) => response.ok ? response.json() : null),
      fetch('/api/portfolio-categories?limit=100&sort=name').then(async (response) => response.ok ? response.json() : null),
      fetch('/api/classes?limit=100&depth=1&sort=name').then(async (response) => response.ok ? response.json() : null),
    ])
      .then(([feed, board, categoryData, classData]) => {
        setPortfolios(feed?.portfolios || [])
        setMvsStudents(board?.topOverall || [])
        setCategories(categoryData?.docs || [])
        setClasses(classData?.docs || [])
        const params = new URLSearchParams(window.location.search)
        setQuery(params.get('q') || '')
        setCategoryFilter(params.get('kategori') || '')
        setClassFilter(params.get('kelas') || '')
        setProgramFilter(params.get('program') || '')
      })
      .catch(() => setPortfolios([]))
      .finally(() => setLoading(false))
  }, [])

  const filteredPortfolios = portfolios.filter((work) => {
    const category = typeof work.categoryRef === 'object' && work.categoryRef ? work.categoryRef : null
    const student = typeof work.student === 'object' && work.student ? work.student : null
    const studentClass = student?.class && typeof student.class === 'object' ? student.class : null
    const studentProgram = student?.program && typeof student.program === 'object' ? student.program : null
    const searchText = [work.title, work.summary, student?.name, category?.name, category?.code, studentClass?.name, studentProgram?.name].filter(Boolean).join(' ').toLocaleLowerCase('id')
    return (!query.trim() || searchText.includes(query.trim().toLocaleLowerCase('id')))
      && (!categoryFilter || String(category?.id) === categoryFilter)
      && (!classFilter || String(studentClass?.id) === classFilter)
      && (!programFilter || String(studentProgram?.id) === programFilter)
      && (!nomineesOnly || Boolean(work.isNominee))
  })

  return <main className="lowfi-shell">
    <section className="lowfi-content">
      <p><Link href="/">Beranda</Link> / Semua Karya</p>
      <div className="lowfi-section-heading"><h1>Semua Karya</h1><span>{loading ? <span className="sk sk-count" role="status" aria-label="Menghitung karya" /> : `${filteredPortfolios.length} dari ${portfolios.length} karya`}</span></div>
      <div className="listing-filters">
        <label className="listing-search"><span>Cari karya atau siswa</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Judul karya, nama siswa, kelas…" /></label>
        <label><span>Kategori</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">Semua kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label><span>Kelas</span><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="">Semua kelas</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>Program keahlian</span><select value={programFilter} onChange={(event) => setProgramFilter(event.target.value)}><option value="">Semua program</option>{Array.from(new Map(classes.flatMap((item) => item.program && typeof item.program === 'object' ? [[String(item.program.id), item.program] as const] : [])).values()).map((program) => <option key={program.id} value={program.id}>{program.name || 'Program'}</option>)}</select></label>
        <label className="listing-checkbox"><input type="checkbox" checked={nomineesOnly} onChange={(event) => setNomineesOnly(event.target.checked)} />Karya nominee</label>
        {(query || categoryFilter || classFilter || programFilter || nomineesOnly) && <button type="button" onClick={() => { setQuery(''); setCategoryFilter(''); setClassFilter(''); setProgramFilter(''); setNomineesOnly(false) }}>Hapus filter</button>}
      </div>
      {loading ? <WorkGridSkeleton count={9} /> : filteredPortfolios.length ? <div className="lowfi-work-grid">{filteredPortfolios.map((work) => {
        const image = typeof work.coverImage === 'object' && work.coverImage ? work.coverImage.url : null
        const authorID = studentID(work.student)
        const photo = studentPhoto(work.student)
        const rankIndex = mvsStudents.findIndex((student) => String(student.id) === String(authorID))
        const rank = rankIndex >= 0 && rankIndex < 3 && (mvsStudents[rankIndex].score || 0) > 0 ? rankIndex + 1 : 0
        const author = <>{photo ? <span className="mvs-avatar"><SkeletonImage src={photo} alt="" loading="lazy" /></span> : <span className="mvs-avatar work-author-placeholder">{studentName(work.student).slice(0, 1).toUpperCase()}</span>}<span>{studentName(work.student)}{rank > 0 && <small className="work-author-rank">MVS #{rank}</small>}</span></>
        return <article className="lowfi-work-card" key={work.id}>
          <Link className="work-card-media" href={`/karya/${work.slug}`}>{image ? <SkeletonImage src={image} alt={`Sampul ${work.title}`} loading="lazy" /> : <span className="work-card-placeholder">Telkom Student Creation</span>}{work.isNominee && <span className="lowfi-badge">NOMINEE</span>}{work.verificationStatus === 'verified' && <span className="verified-badge">TERVERIFIKASI</span>}</Link>
          <div className="work-card-body"><p className="work-card-category">{typeof work.categoryRef === 'object' && work.categoryRef ? work.categoryRef.name || work.categoryRef.code : 'Karya'}{work.year ? ` / ${work.year}` : ''}</p><h2><Link href={`/karya/${work.slug}`}>{displayTitle(work.title, studentName(work.student))}</Link></h2><div className="work-card-footer"><p className="work-author">{authorID ? <Link href={`/siswa/${authorID}`}>{author}</Link> : <span>{author}</span>}</p><span className="work-card-arrow" aria-hidden="true">↗</span></div></div>
        </article>
      })}</div> : <p>Tidak ada karya yang cocok dengan pencarian atau filter ini.</p>}
    </section>
  </main>
}
