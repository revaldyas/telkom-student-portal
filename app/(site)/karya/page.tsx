'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { displayTitle } from '../../../lib/displayTitle'
import { WorkGridSkeleton } from '../../../components/SiteSkeletons'
import SkeletonImage from '../../../components/SkeletonImage'
import '../listing.css'
import { Dropdown, ListingHead, SearchField } from '../../../components/ListingControls'
import DashIcon from '../../../components/DashIcon'

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
const studentClassInfo = (student: Portfolio['student']) => {
  if (typeof student !== 'object' || !student) return ''
  const className = typeof student.class === 'object' && student.class ? student.class.name || '' : ''
  const programName = typeof student.program === 'object' && student.program ? student.program.name || '' : ''
  return [className, programName].filter(Boolean).join(' · ')
}
const studentPhoto = (student: Portfolio['student']) => typeof student === 'object' && student ? student.profilePhoto || null : null

const PAGE_SIZE = 12
type Sort = 'terbaru' | 'suka' | 'komentar'
const sortOptions: { value: Sort; label: string }[] = [{ value: 'terbaru', label: 'Terbaru' }, { value: 'suka', label: 'Terpopuler' }, { value: 'komentar', label: 'Ramai dibahas' }]
const idKey = (value: unknown) => typeof value === 'object' && value ? String((value as { id?: string | number }).id ?? '') : value === undefined || value === null ? '' : String(value)

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
  const [sort, setSort] = useState<Sort>('terbaru')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [ready, setReady] = useState(false)

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
        setNomineesOnly(params.get('nominee') === '1')
        const sortParam = params.get('urut')
        if (sortParam === 'suka' || sortParam === 'komentar') setSort(sortParam)
      })
      .catch(() => setPortfolios([]))
      .finally(() => { setLoading(false); setReady(true) })
  }, [])

  // Simpan filter di URL supaya bisa dibagikan.
  useEffect(() => {
    if (!ready) return
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (categoryFilter) params.set('kategori', categoryFilter)
    if (programFilter) params.set('program', programFilter)
    if (classFilter) params.set('kelas', classFilter)
    if (nomineesOnly) params.set('nominee', '1')
    if (sort !== 'terbaru') params.set('urut', sort)
    const next = params.toString()
    window.history.replaceState(null, '', next ? `?${next}` : window.location.pathname)
  }, [ready, query, categoryFilter, programFilter, classFilter, nomineesOnly, sort])

  const programs = useMemo(() => Array.from(new Map(classes.flatMap((item) => item.program && typeof item.program === 'object' ? [[String(item.program.id), { id: String(item.program.id), name: item.program.name || 'Program' }] as const] : [])).values()), [classes])
  const visibleClasses = programFilter ? classes.filter((item) => idKey(item.program) === programFilter) : classes

  const counts = useMemo(() => {
    const byCategory: Record<string, number> = {}, byProgram: Record<string, number> = {}, byClass: Record<string, number> = {}
    for (const work of portfolios) {
      const student = typeof work.student === 'object' && work.student ? work.student : null
      const category = idKey(work.categoryRef), program = idKey(student?.program), klass = idKey(student?.class)
      if (category) byCategory[category] = (byCategory[category] || 0) + 1
      if (program) byProgram[program] = (byProgram[program] || 0) + 1
      if (klass) byClass[klass] = (byClass[klass] || 0) + 1
    }
    return { byCategory, byProgram, byClass }
  }, [portfolios])

  const filteredPortfolios = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('id')
    const result = portfolios.filter((work) => {
      const category = typeof work.categoryRef === 'object' && work.categoryRef ? work.categoryRef : null
      const student = typeof work.student === 'object' && work.student ? work.student : null
      const studentClass = student?.class && typeof student.class === 'object' ? student.class : null
      const studentProgram = student?.program && typeof student.program === 'object' ? student.program : null
      const searchText = [work.title, work.summary, student?.name, category?.name, category?.code, studentClass?.name, studentProgram?.name].filter(Boolean).join(' ').toLocaleLowerCase('id')
      return (!needle || searchText.includes(needle))
        && (!categoryFilter || String(category?.id) === categoryFilter)
        && (!classFilter || String(studentClass?.id) === classFilter)
        && (!programFilter || String(studentProgram?.id) === programFilter)
        && (!nomineesOnly || Boolean(work.isNominee))
    })
    if (sort === 'suka') return [...result].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
    if (sort === 'komentar') return [...result].sort((a, b) => (b.comments ?? 0) - (a.comments ?? 0))
    return result
  }, [portfolios, query, categoryFilter, classFilter, programFilter, nomineesOnly, sort])

  useEffect(() => { setVisible(PAGE_SIZE) }, [query, categoryFilter, classFilter, programFilter, nomineesOnly, sort])

  const hasFilter = Boolean(query || categoryFilter || classFilter || programFilter || nomineesOnly)
  const reset = () => { setQuery(''); setCategoryFilter(''); setClassFilter(''); setProgramFilter(''); setNomineesOnly(false) }
  const shown = filteredPortfolios.slice(0, visible)

  return <main className="lowfi-shell">
    <section className="lowfi-content kl-page">
      <ListingHead crumb="Semua Karya" title="Semua Karya" count={loading ? null : `${filteredPortfolios.length}${filteredPortfolios.length !== portfolios.length ? ` / ${portfolios.length}` : ''}`} />

      <div className="kl-bar">
        <SearchField value={query} onChange={setQuery} placeholder="Cari judul, siswa, kelas…" label="Cari karya atau siswa" />
        <Dropdown label="Jurusan" value={programFilter} allLabel="Semua" options={programs.map((program) => ({ value: program.id, label: program.name, count: counts.byProgram[program.id] || 0 }))} onChange={(value) => { setProgramFilter(value); setClassFilter('') }} />
        <Dropdown label="Kelas" value={classFilter} allLabel="Semua" options={visibleClasses.map((item) => ({ value: String(item.id), label: item.name, count: counts.byClass[String(item.id)] || 0 }))} onChange={setClassFilter} />
        <Dropdown label="Kategori" value={categoryFilter} allLabel="Semua" options={categories.map((category) => ({ value: String(category.id), label: category.name, count: counts.byCategory[String(category.id)] || 0 }))} onChange={setCategoryFilter} />
        <button type="button" className={`kl-toggle${nomineesOnly ? ' is-active' : ''}`} aria-pressed={nomineesOnly} onClick={() => setNomineesOnly(!nomineesOnly)}><DashIcon name="star" size={13} filled /> Nominee</button>
        {hasFilter && <button type="button" className="kl-reset" onClick={reset}>Reset</button>}
        <div className="kl-bar-sort"><Dropdown label="Urutkan" value={sort} options={sortOptions} onChange={(value) => setSort(value as Sort)} /></div>
      </div>

      {loading ? <WorkGridSkeleton count={8} className="kl-grid" /> : shown.length ? <>
        <div className="kl-grid">{shown.map((work) => {
          const image = typeof work.coverImage === 'object' && work.coverImage ? work.coverImage.url : null
          const authorID = studentID(work.student)
          const photo = studentPhoto(work.student)
          const rankIndex = mvsStudents.findIndex((student) => String(student.id) === String(authorID))
          const rank = rankIndex >= 0 && rankIndex < 3 && (mvsStudents[rankIndex].score || 0) > 0 ? rankIndex + 1 : 0
          const classInfo = studentClassInfo(work.student)
          const category = typeof work.categoryRef === 'object' && work.categoryRef ? work.categoryRef.name || work.categoryRef.code : 'Karya'
          const author = <>{photo ? <span className="mvs-avatar"><SkeletonImage src={photo} alt="" loading="lazy" /></span> : <span className="mvs-avatar work-author-placeholder">{studentName(work.student).slice(0, 1).toUpperCase()}</span>}<span className="work-author-details"><span className="work-author-name">{studentName(work.student)}{rank > 0 && <small className="work-author-rank">MVS #{rank}</small>}</span>{classInfo && <small className="work-author-major" title={classInfo}>{classInfo}</small>}</span></>
          return <article className="kr-card" key={work.id}>
            <div className="kr-media"><Link className="kr-cover" href={`/karya/${work.slug}`} tabIndex={-1} aria-hidden="true">{image ? <SkeletonImage src={image} alt="" loading="lazy" /> : <span className="kr-placeholder">Telkom Student Creation</span>}</Link>
              <span className="kr-category">{category}{work.year ? ` · ${work.year}` : ''}</span>{work.isNominee && <span className="kr-nominee"><DashIcon name="star" size={11} filled /> NOMINEE</span>}
              <span className="kr-actions"><span className="kr-comments" aria-label={`${work.likes ?? 0} suka`}><DashIcon name="heart" size={13} filled />{work.likes ?? 0}</span><Link className="kr-comments" href={`/karya/${work.slug}#komentar`} aria-label={`${work.comments ?? 0} komentar`}><DashIcon name="chat" size={13} />{work.comments ?? 0}</Link></span></div>
            <div className="kr-body"><h2><Link href={`/karya/${work.slug}`} title={displayTitle(work.title, studentName(work.student))}>{displayTitle(work.title, studentName(work.student))}</Link></h2>{work.summary && <p className="kr-summary">{work.summary}</p>}
              <p className="kr-author">{authorID ? <Link href={`/siswa/${authorID}`}>{author}</Link> : <span>{author}</span>}</p></div>
          </article>
        })}</div>
        <div className="kl-more"><p>Menampilkan {shown.length} dari {filteredPortfolios.length} karya</p>{shown.length < filteredPortfolios.length && <button type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}>Muat lebih banyak</button>}</div>
      </> : <div className="kl-empty"><strong>Belum ada karya yang cocok</strong><p>Coba ganti kata kunci atau longgarkan filter.</p>{hasFilter && <button type="button" onClick={reset}>Hapus semua filter</button>}</div>}
    </section>
  </main>
}
