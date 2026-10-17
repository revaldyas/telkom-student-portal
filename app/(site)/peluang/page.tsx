'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { siteFetch } from '../../../lib/siteFetch'
import '../listing.css'
import { Dropdown, ListingHead, SearchField } from '../../../components/ListingControls'

type Opportunity = {
  id: string | number; title: string; type: string; organizer: string; summary: string; requirements?: string
  opensAt?: string; deadline?: string; url?: string; contact?: string; status: string
  coverImage?: { url?: string } | string | number | null
  targetPrograms?: Array<{ id: string | number; name?: string } | string | number>
}

const labels: Record<string, string> = { competition: 'Kompetisi', exhibition: 'Pameran', challenge: 'Tantangan Proyek', mentoring: 'Mentoring', collaboration: 'Kolaborasi Industri', other: 'Lainnya' }
const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : ''

const PAGE_SIZE = 12

export default function OpportunitiesPage() {
  const [docs, setDocs] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState('terbaru')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [role, setRole] = useState('')
  const [interests, setInterests] = useState<Record<string, string | number>>({})
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    void Promise.all([
      fetch('/api/opportunities?where[status][not_equals]=draft&depth=2&limit=100&sort=-createdAt').then((r) => r.ok ? r.json() : { docs: [] }),
      fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.ok ? r.json() : null),
    ]).then(async ([data, session]) => {
      const opportunities: Opportunity[] = data.docs || []
      setDocs(opportunities)
      setRole(session?.user?.role || '')
      if (session?.user?.role === 'student') {
        const rows = await Promise.all(opportunities.filter((opportunity) => opportunity.status === 'open').map(async (opportunity) => {
          const response = await siteFetch(`/api/opportunity-interests?where[opportunity][equals]=${opportunity.id}&limit=1`, { cache: 'no-store' })
          if (!response.ok) return null
          const result = await response.json()
          return result.docs?.[0] ? [String(opportunity.id), result.docs[0].id] as const : null
        }))
        setInterests(Object.fromEntries(rows.filter((row): row is readonly [string, string | number] => row !== null)))
      }
    }).catch(() => setMessage('Peluang belum dapat dimuat. Coba lagi sebentar.')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setQuery(params.get('q') || ''); setType(params.get('jenis') || ''); setStatusFilter(params.get('status') || '')
    if (params.get('urut') === 'deadline') setSort('deadline')
  }, [])
  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (type) params.set('jenis', type)
    if (statusFilter) params.set('status', statusFilter)
    if (sort !== 'terbaru') params.set('urut', sort)
    const next = params.toString()
    window.history.replaceState(null, '', `${next ? `?${next}` : window.location.pathname}${window.location.hash}`)
  }, [query, type, statusFilter, sort])
  useEffect(() => { setVisible(PAGE_SIZE) }, [query, type, statusFilter, sort])

  const typeOptions = useMemo(() => Object.entries(labels).map(([value, label]) => ({ value, label, count: docs.filter((opportunity) => opportunity.type === value).length })).filter((option) => option.count > 0), [docs])
  const filtered = useMemo(() => {
    const result = docs.filter((opportunity) => {
      const haystack = `${opportunity.title} ${opportunity.organizer} ${opportunity.summary} ${opportunity.requirements || ''}`.toLocaleLowerCase('id')
      return (!query.trim() || haystack.includes(query.trim().toLocaleLowerCase('id'))) && (!type || opportunity.type === type) && (!statusFilter || (statusFilter === 'open' ? opportunity.status === 'open' : opportunity.status !== 'open'))
    })
    if (sort === 'deadline') return [...result].sort((a, b) => (a.deadline ? new Date(a.deadline).getTime() : Infinity) - (b.deadline ? new Date(b.deadline).getTime() : Infinity))
    return result
  }, [docs, query, type, statusFilter, sort])
  const hasFilter = Boolean(query || type || statusFilter)
  const shown = filtered.slice(0, visible)
  const daysLeft = (value?: string) => value ? Math.ceil((new Date(value).getTime() - Date.now()) / 86400000) : null

  async function expressInterest(opportunity: Opportunity) {
    if (!role) { window.location.assign('/login'); return }
    if (role !== 'student') { setMessage('Pendaftaran peluang ini tersedia untuk akun siswa.'); return }
    setBusy(String(opportunity.id)); setMessage('')
    try {
      const existingID = interests[String(opportunity.id)]
      const response = await siteFetch(existingID ? `/api/opportunity-interests/${existingID}` : '/api/opportunity-interests', {
        method: existingID ? 'DELETE' : 'POST', credentials: 'same-origin',
        headers: existingID ? undefined : { 'Content-Type': 'application/json' },
        body: existingID ? undefined : JSON.stringify({ opportunity: opportunity.id, note: '' }),
      })
      const result = response.status === 204 ? {} : await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Minat belum tersimpan.')
      setInterests((current) => {
        const next = { ...current }
        if (existingID) delete next[String(opportunity.id)]
        else next[String(opportunity.id)] = result.doc?.id || 'saved'
        return next
      })
      setMessage(existingID ? 'Pendaftaran minat dibatalkan.' : 'Minatmu berhasil dicatat. Guru pembimbing dapat menindaklanjutinya.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Minat belum tersimpan.') }
    finally { setBusy('') }
  }

  return <main className="lowfi-shell"><section className="lowfi-content kl-page" aria-label="Daftar peluang">
    <ListingHead crumb="Peluang" title="Peluang" count={loading ? null : `${filtered.length}${filtered.length !== docs.length ? ` / ${docs.length}` : ''}`} lead="Kompetisi, pameran, tantangan proyek, mentoring, dan kolaborasi bersama industri." />
    <div className="kl-bar">
      <SearchField value={query} onChange={setQuery} placeholder="Nama, penyelenggara, bidang…" label="Cari peluang" />
      <Dropdown label="Jenis" value={type} allLabel="Semua" options={typeOptions} onChange={setType} />
      <Dropdown label="Status" value={statusFilter} allLabel="Semua" options={[{ value: 'open', label: 'Dibuka', count: docs.filter((item) => item.status === 'open').length }, { value: 'closed', label: 'Ditutup', count: docs.filter((item) => item.status !== 'open').length }]} onChange={setStatusFilter} />
      {hasFilter && <button type="button" className="kl-reset" onClick={() => { setQuery(''); setType(''); setStatusFilter('') }}>Reset</button>}
      <div className="kl-bar-sort"><Dropdown label="Urutkan" value={sort} options={[{ value: 'terbaru', label: 'Terbaru' }, { value: 'deadline', label: 'Batas terdekat' }]} onChange={setSort} /></div>
    </div>
    {message && <p className="kl-note" role="status">{message}</p>}
    {loading ? <div className="kl-grid">{[1, 2, 3, 4].map((item) => <div className="opportunity-card opportunity-skeleton" key={item}><div className="sk" /><span className="sk sk-line" /><span className="sk sk-line" /></div>)}</div>
      : !shown.length ? <div className="kl-empty"><strong>{docs.length ? 'Peluang tidak ditemukan' : 'Belum ada peluang aktif'}</strong><p>{docs.length ? 'Coba ubah pencarian atau filter.' : 'Guru akan menambahkan informasi kompetisi, pameran, tantangan, dan kolaborasi di sini.'}</p>{hasFilter && <button type="button" onClick={() => { setQuery(''); setType(''); setStatusFilter('') }}>Hapus semua filter</button>}</div>
        : <><div className="kl-grid">{shown.map((opportunity) => {
          const image = typeof opportunity.coverImage === 'object' ? opportunity.coverImage?.url : null
          const isOpen = opportunity.status === 'open'
          const left = daysLeft(opportunity.deadline)
          return <article className="kr-card kl-op-card" id={`peluang-${opportunity.id}`} key={opportunity.id}>
            <div className="kr-media">{image ? <img src={image} alt="" loading="lazy" /> : <span className="kr-placeholder">{labels[opportunity.type] || 'Peluang'}</span>}
              <span className="kr-category">{labels[opportunity.type] || 'Peluang'}</span><span className={`kr-nominee kr-deadline${!isOpen || (left !== null && left <= 7) ? ' is-urgent' : ''}`}>{!isOpen ? 'Ditutup' : left === null ? 'Dibuka' : left < 0 ? 'Berakhir' : left === 0 ? 'Hari ini' : `${left} hari lagi`}</span></div>
            <div className="kr-body"><h2>{opportunity.title}</h2><p className="kl-organizer">{opportunity.organizer}</p><p className="kr-summary">{opportunity.summary}</p>
              {opportunity.requirements && <details className="kl-details"><summary>Syarat dan informasi</summary><p>{opportunity.requirements}</p></details>}
              <div className="kl-meta">{opportunity.opensAt && <span>Mulai {dateLabel(opportunity.opensAt)}</span>}{opportunity.deadline && <span>Batas {dateLabel(opportunity.deadline)}</span>}{opportunity.contact && <span>Kontak: {opportunity.contact}</span>}</div>
              <div className="kl-actions">{isOpen && <button type="button" className="kl-primary" disabled={busy === String(opportunity.id)} onClick={() => void expressInterest(opportunity)}>{busy === String(opportunity.id) ? 'Menyimpan…' : interests[String(opportunity.id)] ? 'Tertarik ✓ · Batalkan' : 'Saya tertarik'}</button>}{opportunity.url && <a className="kl-secondary" href={opportunity.url} target="_blank" rel="noreferrer">Info & daftar ↗</a>}</div>
            </div>
          </article>
        })}</div>
        <div className="kl-more"><p>Menampilkan {shown.length} dari {filtered.length} peluang</p>{shown.length < filtered.length && <button type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}>Muat lebih banyak</button>}</div></>}
    <p className="kl-footnote">{role === 'teacher' ? 'Kelola peluang di panel Guru atau CMS. ' : ''}Guru dapat mengelola peluang dan verifikasi karya melalui Portal Guru.</p>
  </section></main>
}
