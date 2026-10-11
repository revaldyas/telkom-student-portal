'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { siteFetch } from '../../../lib/siteFetch'

type Opportunity = {
  id: string | number; title: string; type: string; organizer: string; summary: string; requirements?: string
  opensAt?: string; deadline?: string; url?: string; contact?: string; status: string
  coverImage?: { url?: string } | string | number | null
  targetPrograms?: Array<{ id: string | number; name?: string } | string | number>
}

const labels: Record<string, string> = { competition: 'Kompetisi', exhibition: 'Pameran', challenge: 'Tantangan Proyek', mentoring: 'Mentoring', collaboration: 'Kolaborasi Industri', other: 'Lainnya' }
const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value)) : ''

export default function OpportunitiesPage() {
  const [docs, setDocs] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
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

  const filtered = useMemo(() => docs.filter((opportunity) => {
    const haystack = `${opportunity.title} ${opportunity.organizer} ${opportunity.summary} ${opportunity.requirements || ''}`.toLocaleLowerCase('id')
    return (!query.trim() || haystack.includes(query.trim().toLocaleLowerCase('id'))) && (!type || opportunity.type === type)
  }), [docs, query, type])

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

  return <main className="opportunity-page wrap">
    <header className="opportunity-hero"><span className="section-kicker">PELUANG & KOLABORASI</span><h1>Bawa karyamu<br /><span>ke langkah berikutnya.</span></h1><p>Temukan kompetisi, pameran, tantangan proyek, mentoring, dan kolaborasi bersama industri.</p></header>
    <section aria-label="Daftar peluang">
      <div className="listing-filters opportunity-filters">
        <label className="listing-search"><span>Cari peluang</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nama, penyelenggara, atau bidang…" /></label>
        <label><span>Jenis peluang</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="">Semua jenis</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <span className="filter-result-count">{loading ? 'Memuat…' : `${filtered.length} peluang`}</span>
      </div>
      {message && <p className="opportunity-message" role="status">{message}</p>}
      {loading ? <div className="opportunity-grid">{[1, 2, 3].map((item) => <div className="opportunity-card opportunity-skeleton" key={item}><div className="sk" /><span className="sk sk-line" /><span className="sk sk-line" /></div>)}</div>
        : !filtered.length ? <div className="empty-state"><h2>{docs.length ? 'Peluang tidak ditemukan' : 'Belum ada peluang aktif'}</h2><p>{docs.length ? 'Coba ubah pencarian atau filter.' : 'Guru akan menambahkan informasi kompetisi, pameran, tantangan, dan kolaborasi di sini.'}</p></div>
          : <div className="opportunity-grid">{filtered.map((opportunity) => {
            const image = typeof opportunity.coverImage === 'object' ? opportunity.coverImage?.url : null
            const isOpen = opportunity.status === 'open'
            return <article className="opportunity-card" id={`peluang-${opportunity.id}`} key={opportunity.id}>
              {image && <img className="opportunity-cover" src={image} alt="" />}
              <div className="opportunity-card-body"><div className="opportunity-card-labels"><span className="lowfi-badge">{labels[opportunity.type] || 'Peluang'}</span><span className={`opportunity-status ${isOpen ? 'is-open' : 'is-closed'}`}>{isOpen ? 'DIBUKA' : 'DITUTUP'}</span></div>
                <h2>{opportunity.title}</h2><p className="opportunity-organizer">{opportunity.organizer}</p><p>{opportunity.summary}</p>
                {opportunity.requirements && <details><summary>Syarat dan informasi</summary><p>{opportunity.requirements}</p></details>}
                <div className="opportunity-dates">{opportunity.opensAt && <span>Mulai {dateLabel(opportunity.opensAt)}</span>}{opportunity.deadline && <span>Batas {dateLabel(opportunity.deadline)}</span>}</div>
                {opportunity.contact && <p className="opportunity-contact">Kontak: {opportunity.contact}</p>}
                <div className="opportunity-actions">{isOpen && <button type="button" className="button button-primary" disabled={busy === String(opportunity.id)} onClick={() => void expressInterest(opportunity)}>{busy === String(opportunity.id) ? 'Menyimpan…' : interests[String(opportunity.id)] ? 'Tertarik ✓ · Batalkan' : 'Saya tertarik'}</button>}{opportunity.url && <a className="button button-glass opportunity-link" href={opportunity.url} target="_blank" rel="noreferrer">Info & pendaftaran ↗</a>}</div>
              </div>
            </article>
          })}</div>}
    </section>
    {role === 'teacher' && <p className="opportunity-manage-note">Kelola peluang di panel Guru atau CMS.</p>}
    <p className="opportunity-manage-note">Guru dapat mengelola peluang dan verifikasi karya melalui Portal Guru.</p>
  </main>
}
