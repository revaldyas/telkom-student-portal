'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { siteFetch } from '../../../../../lib/siteFetch'
import { MentorCardsSkeleton } from '../../../../../components/SiteSkeletons'
import './opportunity-list.css'

type Opportunity = { id: string | number; title: string; type?: string | null; organizer?: string | null; status: string; summary?: string; requirements?: string; opensAt?: string; deadline?: string; url?: string; contact?: string; targetPrograms?: Array<{ id: string | number; name?: string } | string | number> }
type Interest = { id: string | number; note: string; status: string; createdAt: string; opportunity: { id: string | number; title: string; organizer: string }; student: { id: string | number; name: string; class?: string | null; program?: string | null; profilePhoto?: string | null } }

export default function OpportunityManagementPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [interests, setInterests] = useState<Interest[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [message, setMessage] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'draft' | 'closed'>('all')
  const [query, setQuery] = useState('')

  const load = async () => {
    const sessionResponse = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
    if (!sessionResponse.ok) { window.location.assign('/login'); return }
    const session = await sessionResponse.json()
    if (session.user?.role !== 'teacher') { setMessage('Halaman ini khusus Guru pembimbing.'); setLoading(false); return }
    setAllowed(true)
    const [opportunityResponse, interestResponse] = await Promise.all([
      siteFetch('/api/opportunities?depth=0&limit=100&sort=-createdAt', { cache: 'no-store' }),
      fetch('/api/mentor/interests', { credentials: 'same-origin', cache: 'no-store' }),
    ])
    if (opportunityResponse.ok) setOpportunities((await opportunityResponse.json()).docs || [])
    if (interestResponse.ok) setInterests((await interestResponse.json()).docs || [])
    setLoading(false)
  }

  useEffect(() => { void load().catch((error) => { setMessage(error instanceof Error ? error.message : 'Data peluang belum dapat dimuat.'); setLoading(false) }) }, [])

  async function changeStatus(opportunity: Opportunity, status: 'open' | 'closed', success: string) {
    setBusy(true); setMessage('')
    try {
      const response = await siteFetch(`/api/opportunities/${opportunity.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Status peluang belum berhasil diperbarui.')
      setMessage(success); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Status peluang belum berhasil diperbarui.') }
    finally { setBusy(false) }
  }
  const closeOpportunity = (opportunity: Opportunity) => changeStatus(opportunity, 'closed', 'Pendaftaran peluang ditutup.')
  const publishOpportunity = (opportunity: Opportunity) => changeStatus(opportunity, 'open', 'Peluang diterbitkan.')

  async function updateInterest(interest: Interest, status: string) {
    try {
      const response = await fetch('/api/mentor/interests', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: interest.id, status }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Status minat belum berhasil diperbarui.')
      setInterests((current) => current.map((item) => item.id === interest.id ? { ...item, status } : item))
      setMessage('Status tindak lanjut siswa berhasil diperbarui.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Status minat belum berhasil diperbarui.') }
  }

  const counts = useMemo(() => ({ all: opportunities.length, open: opportunities.filter((item) => item.status === 'open').length, draft: opportunities.filter((item) => item.status === 'draft').length, closed: opportunities.filter((item) => item.status === 'closed').length }), [opportunities])
  const interestCount = useMemo(() => { const map = new Map<string, number>(); for (const interest of interests) map.set(String(interest.opportunity.id), (map.get(String(interest.opportunity.id)) || 0) + 1); return map }, [interests])
  const visible = opportunities.filter((item) => (filter === 'all' || item.status === filter) && (!query.trim() || `${item.title} ${item.organizer || ''}`.toLowerCase().includes(query.trim().toLowerCase())))
  const typeLabel: Record<string, string> = { competition: 'Kompetisi', exhibition: 'Pameran', challenge: 'Tantangan proyek', mentoring: 'Mentoring', collaboration: 'Kolaborasi industri', other: 'Lainnya' }
  const daysLeft = (value?: string) => value ? Math.ceil((new Date(value).getTime() - Date.now()) / 86400000) : null

  return <main className="portal-page opl-page">
    <header className="opl-head"><div><span className="section-kicker">PELUANG & KOLABORASI</span><h1>Peluang siswa</h1><p>Bagikan kompetisi, pameran, mentoring, dan kolaborasi yang relevan untuk siswa.</p></div>
      <div className="opl-head-actions"><Link className="pe-ghost" href="/peluang">Lihat halaman publik ↗</Link><Link className="opl-new" href="/portal/guru/peluang/baru">+ Peluang baru</Link></div></header>
    {message && <p className="opl-message" role="status">{message}</p>}
    {loading ? <MentorCardsSkeleton layout="list" announce /> : !allowed ? <div className="empty-state"><h2>Akses dibatasi</h2><p>Masuk dengan akun Guru untuk mengelola peluang siswa.</p><Link href="/login">Masuk ke akun</Link></div> : <>
      <section className="opl-stats" aria-label="Ringkasan"><div><b>{counts.open}</b><span>Dibuka</span></div><div><b>{counts.draft}</b><span>Draf</span></div><div><b>{counts.closed}</b><span>Ditutup</span></div><div><b>{interests.length}</b><span>Minat siswa</span></div></section>

      <section className="opl-section"><div className="opl-bar"><div className="opl-tabs" role="tablist" aria-label="Filter status">{([['all', 'Semua'], ['open', 'Dibuka'], ['draft', 'Draf'], ['closed', 'Ditutup']] as const).map(([key, label]) => <button type="button" role="tab" aria-selected={filter === key} key={key} className={filter === key ? 'is-active' : ''} onClick={() => setFilter(key)}>{label}<b>{counts[key]}</b></button>)}</div>
        <label className="opl-search"><span className="sr-only">Cari peluang</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari peluang…" /></label></div>
        {visible.length ? <ul className="opl-list">{visible.map((item) => { const left = daysLeft(item.deadline); const interested = interestCount.get(String(item.id)) || 0; return <li key={item.id} className={`opl-item opl-item--${item.status}`}>
          <div className="opl-item-main"><div className="opl-chips"><span className={`opl-status opl-status--${item.status}`}>{item.status === 'open' ? 'Dibuka' : item.status === 'closed' ? 'Ditutup' : 'Draf'}</span>{item.type && <span className="opl-chip">{typeLabel[item.type] || item.type}</span>}{item.status === 'open' && left !== null && <span className={`opl-chip${left <= 7 ? ' is-urgent' : ''}`}>{left < 0 ? 'Berakhir' : left === 0 ? 'Hari ini' : `${left} hari lagi`}</span>}</div>
            <h3><Link href={`/portal/guru/peluang/${item.id}/edit`}>{item.title}</Link></h3><p>{item.organizer || 'Penyelenggara belum diisi'}{item.deadline ? ` · batas ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(item.deadline))}` : ''}</p></div>
          <div className="opl-item-meta"><span title="Siswa yang menyatakan minat">👥 {interested}</span></div>
          <div className="opl-actions"><Link className="opl-act" href={`/portal/guru/peluang/${item.id}/edit`}>{item.status === 'draft' ? 'Lanjutkan' : 'Edit'}</Link>{item.status === 'draft' && <button type="button" className="opl-act is-primary" disabled={busy} onClick={() => void publishOpportunity(item)}>Terbitkan</button>}{item.status === 'open' && <button type="button" className="opl-act" disabled={busy} onClick={() => void closeOpportunity(item)}>Tutup</button>}{item.status === 'closed' && <button type="button" className="opl-act" disabled={busy} onClick={() => void publishOpportunity(item)}>Buka lagi</button>}{item.status !== 'draft' && <Link className="opl-act" href={`/peluang#peluang-${item.id}`}>Lihat ↗</Link>}</div>
        </li> })}</ul>
          : <div className="opl-empty"><span aria-hidden="true">🚀</span><strong>{opportunities.length ? 'Tidak ada peluang yang cocok' : 'Belum ada peluang'}</strong><p>{opportunities.length ? 'Ubah filter atau pencarian.' : 'Buat peluang pertamamu agar siswa dapat melihatnya.'}</p>{!opportunities.length && <Link className="opl-new" href="/portal/guru/peluang/baru">+ Peluang baru</Link>}</div>}
      </section>

      <section className="opl-section"><div className="opl-section-head"><div><h2>Siswa yang tertarik</h2><p>Tindak lanjuti siswa yang menyatakan minat pada peluangmu.</p></div><span className="opl-count">{interests.length} minat</span></div>
        {interests.length ? <ul className="opl-interests">{interests.map((interest) => <li key={interest.id}>
          <span className="opl-av">{interest.student.profilePhoto ? <img src={interest.student.profilePhoto} alt="" loading="lazy" /> : interest.student.name.slice(0, 1).toUpperCase()}</span>
          <div className="opl-interest-main"><strong><Link href={`/siswa/${interest.student.id}`}>{interest.student.name}</Link></strong><span>{interest.student.class || 'Siswa'}{interest.student.program ? ` · ${interest.student.program}` : ''}</span><small>Tertarik pada <b>{interest.opportunity.title}</b> · {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(interest.createdAt))}</small>{interest.note && <p>“{interest.note}”</p>}</div>
          <div className="opl-follow" role="group" aria-label={`Tindak lanjut ${interest.student.name}`}>{([['interested', 'Tertarik'], ['contacted', 'Dihubungi'], ['completed', 'Selesai']] as const).map(([key, label]) => <button type="button" key={key} aria-pressed={interest.status === key} className={interest.status === key ? `is-on is-${key}` : ''} onClick={() => interest.status !== key && void updateInterest(interest, key)}>{label}</button>)}</div>
        </li>)}</ul> : <div className="opl-empty is-compact"><span aria-hidden="true">👥</span><p>Belum ada siswa yang menyatakan minat pada peluang.</p></div>}
      </section>
    </>}
  </main>
}
