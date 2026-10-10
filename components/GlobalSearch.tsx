'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { SearchResultsSkeleton } from './SiteSkeletons'

type SearchItem = { type: string; label: string; detail: string; href: string }

const suggestions: SearchItem[] = [
  { type: 'Jelajahi', label: 'Karya terbaru', detail: 'Cari karya dan kategori portofolio', href: '/karya' },
  { type: 'Jelajahi', label: 'Penghargaan', detail: 'Lihat award dan nominasi', href: '/awards' },
  { type: 'Jelajahi', label: 'Leaderboard', detail: 'Top Likes, Trending, dan MVS', href: '/leaderboard' },
]

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SearchItem[]>([])
  const [recommendations, setRecommendations] = useState<SearchItem[]>(suggestions)
  const [loadedRecommendations, setLoadedRecommendations] = useState(false)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef(0)

  useEffect(() => {
    const value = query.trim()
    if (value.length < 2) {
      requestRef.current += 1
      setItems([])
      setLoading(false)
      return
    }
    const requestID = ++requestRef.current
    setItems([])
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/community/search?q=${encodeURIComponent(value)}`, { cache: 'no-store' })
        const data = response.ok ? await response.json() : null
        if (requestID === requestRef.current) setItems(data?.items || [])
      } catch {
        if (requestID === requestRef.current) setItems([])
      } finally {
        if (requestID === requestRef.current) setLoading(false)
      }
    }, 220)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  const visibleRecommendations = query.trim().length < 2 ? recommendations : items
  const openRecommendations = () => {
    setOpen(true)
    if (loadedRecommendations) return
    setLoadedRecommendations(true)
    void fetch('/api/community/leaderboard', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((board) => {
        const students = (board?.topOverall || []).filter((student: { score?: number }) => (student.score || 0) > 0).slice(0, 3)
        if (students.length) setRecommendations([
          ...students.map((student: { id: string | number; name: string }, index: number) => ({ type: 'Siswa pilihan komunitas', label: student.name, detail: `Most Valuable Student #${index + 1}`, href: `/siswa/${student.id}` })),
          ...suggestions,
        ])
      })
      .catch(() => {})
  }
  const selectFirst = () => {
    if (visibleRecommendations[0]) window.location.href = visibleRecommendations[0].href
  }

  return <div className="global-search" ref={rootRef}>
    <div className="global-search-input-wrap">
      <span aria-hidden="true">⌕</span>
      <input
        type="search"
        role="combobox"
        aria-label="Cari siswa, karya, kategori, kelas, atau award"
        aria-expanded={open}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        placeholder="Cari siswa, karya, kategori…"
        value={query}
        onFocus={openRecommendations}
        onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
          if (event.key === 'Enter' && visibleRecommendations.length) { event.preventDefault(); selectFirst() }
        }}
      />
      {query && <button type="button" className="global-search-clear" aria-label="Hapus pencarian" onClick={() => setQuery('')}>×</button>}
    </div>
    {open && <div className="global-search-popover" id="global-search-results" role="listbox">
      <p className="global-search-heading">{query.trim().length < 2 ? 'Pencarian populer' : loading ? 'Mencari…' : 'Hasil pencarian'}</p>
      {loading && query.trim().length >= 2 ? <SearchResultsSkeleton /> : visibleRecommendations.length ? visibleRecommendations.map((item) => <Link className="global-search-result" href={item.href} key={`${item.type}:${item.href}:${item.label}`} role="option" onClick={() => setOpen(false)}>
        <span><small>{item.type}</small><strong>{item.label}</strong><em>{item.detail}</em></span><span aria-hidden="true">↗</span>
      </Link>) : !loading && <p className="global-search-empty">Tidak ada hasil. Coba nama siswa, judul karya, kelas, kategori, atau award.</p>}
      {query.trim().length >= 2 && <Link className="global-search-all" href={`/karya?q=${encodeURIComponent(query.trim())}`} onClick={() => setOpen(false)}>Cari “{query.trim()}” di semua karya</Link>}
    </div>}
  </div>
}
