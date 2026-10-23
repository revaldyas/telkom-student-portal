'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import '../app/(site)/listing.css'
import { Dropdown, ListingHead, SearchField } from './ListingControls'
import DashIcon from './DashIcon'

export type ProjectItem = {
  id: string | number; slug: string; title: string; summary: string; year?: number | null
  category: string; categoryId: string; cover: string | null; coverAlt: string
  members: { id: string | number; name: string; photo: string | null }[]
  likes: number; comments: number
}

const PAGE_SIZE = 12
type Sort = 'terbaru' | 'populer' | 'tahun' | 'anggota'

export default function ProjectsListing({ projects }: { projects: ProjectItem[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [year, setYear] = useState('')
  const [sort, setSort] = useState<Sort>('terbaru')
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setQuery(params.get('q') || ''); setCategory(params.get('kategori') || ''); setYear(params.get('tahun') || '')
    const sortParam = params.get('urut'); if (sortParam === 'populer' || sortParam === 'tahun' || sortParam === 'anggota') setSort(sortParam)
  }, [])
  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (category) params.set('kategori', category)
    if (year) params.set('tahun', year)
    if (sort !== 'terbaru') params.set('urut', sort)
    const next = params.toString()
    window.history.replaceState(null, '', next ? `?${next}` : window.location.pathname)
  }, [query, category, year, sort])
  useEffect(() => { setVisible(PAGE_SIZE) }, [query, category, year, sort])

  const categories = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>()
    for (const project of projects) if (project.categoryId) map.set(project.categoryId, { label: project.category, count: (map.get(project.categoryId)?.count || 0) + 1 })
    return Array.from(map, ([value, item]) => ({ value, label: item.label, count: item.count }))
  }, [projects])
  const years = useMemo(() => {
    const map = new Map<string, number>()
    for (const project of projects) if (project.year) map.set(String(project.year), (map.get(String(project.year)) || 0) + 1)
    return Array.from(map, ([value, count]) => ({ value, label: value, count })).sort((a, b) => Number(b.value) - Number(a.value))
  }, [projects])

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('id')
    const result = projects.filter((project) => (!needle || [project.title, project.summary, project.category, ...project.members.map((member) => member.name)].join(' ').toLocaleLowerCase('id').includes(needle))
      && (!category || project.categoryId === category) && (!year || String(project.year) === year))
    if (sort === 'populer') return [...result].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments) || b.likes - a.likes)
    if (sort === 'tahun') return [...result].sort((a, b) => (b.year || 0) - (a.year || 0))
    if (sort === 'anggota') return [...result].sort((a, b) => b.members.length - a.members.length)
    return result
  }, [projects, query, category, year, sort])

  const hasFilter = Boolean(query || category || year)
  const reset = () => { setQuery(''); setCategory(''); setYear('') }
  const shown = filtered.slice(0, visible)

  return <section className="lowfi-content kl-page">
    <ListingHead crumb="Proyek kolaborasi" title="Proyek Kolaborasi" count={`${filtered.length}${filtered.length !== projects.length ? ` / ${projects.length}` : ''}`} lead="Karya yang dibangun bersama oleh siswa dari berbagai bidang." />
    <div className="kl-bar">
      <SearchField value={query} onChange={setQuery} placeholder="Cari proyek atau anggota…" label="Cari proyek atau anggota" />
      <Dropdown label="Kategori" value={category} allLabel="Semua" options={categories} onChange={setCategory} />
      <Dropdown label="Tahun" value={year} allLabel="Semua" options={years} onChange={setYear} />
      {hasFilter && <button type="button" className="kl-reset" onClick={reset}>Reset</button>}
      <div className="kl-bar-sort"><Dropdown label="Urutkan" value={sort} options={[{ value: 'terbaru', label: 'Terbaru' }, { value: 'populer', label: 'Terpopuler' }, { value: 'tahun', label: 'Tahun terbaru' }, { value: 'anggota', label: 'Tim terbesar' }]} onChange={(value) => setSort(value as Sort)} /></div>
    </div>
    {shown.length ? <>
      <div className="kl-grid">{shown.map((project) => {
        const first = project.members[0]
        return <article className="kr-card" key={project.id}>
          <div className="kr-media"><Link className="kr-cover" href={`/proyek/${project.slug}`} tabIndex={-1} aria-hidden="true">{project.cover ? <img src={project.cover} alt="" loading="lazy" /> : <span className="kr-placeholder">Proyek kolaborasi</span>}</Link>
            <span className="kr-category">{project.category}</span>{project.year ? <span className="kr-nominee kr-year">{project.year}</span> : null}
            <span className="kr-actions"><span className="kr-comments" aria-label={`${project.likes} suka`}><DashIcon name="heart" size={13} filled />{project.likes}</span><Link className="kr-comments" href={`/proyek/${project.slug}#komentar`} aria-label={`${project.comments} komentar`}><DashIcon name="chat" size={13} />{project.comments}</Link></span></div>
          <div className="kr-body"><h2><Link href={`/proyek/${project.slug}`} title={project.title}>{project.title}</Link></h2>{project.summary && <p className="kr-summary">{project.summary}</p>}
            <p className="kr-author">{first ? <Link href={`/siswa/${first.id}`}>{first.photo ? <span className="mvs-avatar"><img src={first.photo} alt="" loading="lazy" /></span> : <span className="mvs-avatar work-author-placeholder">{first.name.slice(0, 1).toUpperCase()}</span>}<span className="work-author-details"><span className="work-author-name">{first.name}</span><small className="work-author-major">{project.members.length > 1 ? `+ ${project.members.length - 1} anggota proyek` : 'Proyek kolaborasi'}</small></span></Link> : <span><span className="work-author-details"><span className="work-author-name">Proyek kolaborasi</span></span></span>}</p></div>
        </article>
      })}</div>
      <div className="kl-more"><p>Menampilkan {shown.length} dari {filtered.length} proyek</p>{shown.length < filtered.length && <button type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}>Muat lebih banyak</button>}</div>
    </> : <div className="kl-empty"><strong>{projects.length ? 'Belum ada proyek yang cocok' : 'Belum ada proyek yang diterbitkan'}</strong><p>{projects.length ? 'Coba ganti kata kunci atau longgarkan filter.' : 'Proyek kolaborasi siswa akan tampil di sini setelah dipublikasikan.'}</p>{hasFilter && <button type="button" onClick={reset}>Hapus semua filter</button>}</div>}
  </section>
}
