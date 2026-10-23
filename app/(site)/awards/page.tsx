'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { siteFetch } from '../../../lib/siteFetch'
import { displayTitle } from '../../../lib/displayTitle'
import { AwardListSkeleton } from '../../../components/SiteSkeletons'
import SkeletonImage from '../../../components/SkeletonImage'
import '../listing.css'
import { Dropdown, ListingHead, SearchField } from '../../../components/ListingControls'
import DashIcon from '../../../components/DashIcon'

type Portfolio = {
  id: string | number
  title: string
  summary?: string
  student?: { name?: string } | string | number
  coverImage?: { url?: string } | string | number | null
}

type Award = {
  id: string | number
  title: string
  description: string
  opensAt: string
  closesAt: string
  status: 'draft' | 'open' | 'closed' | 'announced'
  nominees: Portfolio[]
}

type Vote = { id: string | number; portfolio: string | number | Portfolio }

type AwardStats = { totalVotes: number; eligibleVoters: number }

type AwardResult = { award: string; results: { portfolio: Portfolio; votes: number }[] }

const dateLabel = (value: string) => new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

export default function AwardsPage() {
  const router = useRouter()
  const [awards, setAwards] = useState<Award[]>([])
  const [votes, setVotes] = useState<Record<string, Vote>>({})
  const [results, setResults] = useState<Record<string, AwardResult>>({})
  const [stats, setStats] = useState<Record<string, AwardStats>>({})
  const [role, setRole] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      let currentRole = ''
      const meResponse = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' }).catch(() => null)
      if (meResponse?.ok) {
        const me = await meResponse.json()
        currentRole = me.user?.role || ''
        setRole(currentRole)
      }

      const response = await fetch('/api/awards?limit=100&depth=2&sort=-createdAt')
      const data = response.ok ? await response.json() : null
      const docs: Award[] = data?.docs || []
      setAwards(docs)
      setQuery(new URLSearchParams(window.location.search).get('q') || '')

      if (currentRole === 'student') {
        const openAwards = docs.filter((award) => award.status === 'open')
        const voteEntries = await Promise.all(openAwards.map(async (award) => {
          const voteResponse = await siteFetch(`/api/award-votes?where[award][equals]=${award.id}&limit=1`)
          if (!voteResponse.ok) return null
          const voteData = await voteResponse.json()
          return voteData.docs?.[0] ? [String(award.id), voteData.docs[0] as Vote] as const : null
        }))
        setVotes(Object.fromEntries(voteEntries.filter((entry): entry is readonly [string, Vote] => entry !== null)))
      }

      const announced = docs.filter((award) => award.status === 'announced')
      const resultEntries = await Promise.all(announced.map(async (award) => {
        const resultResponse = await fetch(`/api/awards/${award.id}/results`)
        if (!resultResponse.ok) return null
        return [String(award.id), await resultResponse.json() as AwardResult] as const
      }))
      const statEntries = await Promise.all(docs.filter((award) => award.status !== 'draft').map(async (award) => {
        const statResponse = await fetch(`/api/awards/${award.id}/stats`, { cache: 'no-store' }).catch(() => null)
        return statResponse?.ok ? [String(award.id), await statResponse.json() as AwardStats] as const : null
      }))
      setStats(Object.fromEntries(statEntries.filter((entry): entry is readonly [string, AwardStats] => entry !== null)))
      setResults(Object.fromEntries(resultEntries.filter((entry): entry is readonly [string, AwardResult] => entry !== null)))
      setLoading(false)
    }

    void load().catch(() => {
      setMessage('Penghargaan belum dapat dimuat. Coba lagi sebentar.')
      setLoading(false)
    })
  }, [])

  async function castVote(award: Award, portfolio: Portfolio) {
    if (!role) {
      router.push('/login')
      return
    }
    if (role !== 'student') {
      setMessage('Voting hanya tersedia untuk akun siswa terdaftar.')
      return
    }

    const awardKey = String(award.id)
    const existing = votes[awardKey]
    setBusy(`${awardKey}:${portfolio.id}`)
    setMessage('')
    try {
      const response = await siteFetch(existing ? `/api/award-votes/${existing.id}` : '/api/award-votes', {
        method: existing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ award: award.id, portfolio: portfolio.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.errors?.[0]?.message || data.message || 'Suara belum tersimpan.')
      setVotes((current) => ({ ...current, [awardKey]: data.doc }))
      setMessage('Pilihanmu berhasil disimpan. Kamu masih bisa mengubahnya sebelum voting ditutup.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Suara belum tersimpan.')
    } finally {
      setBusy('')
    }
  }

  const isOpen = (award: Award) => {
    const now = Date.now()
    return award.status === 'open' && now >= new Date(award.opensAt).getTime() && now <= new Date(award.closesAt).getTime()
  }
  const filteredAwards = awards.filter((award) => {
    const searchable = [award.title, award.description, ...(award.nominees || []).map((item) => `${item.title} ${typeof item.student === 'object' ? item.student.name || '' : ''}`)].join(' ').toLocaleLowerCase('id')
    return (!query.trim() || searchable.includes(query.trim().toLocaleLowerCase('id')))
      && (!statusFilter || award.status === statusFilter)
  })

  const statusCounts = { open: awards.filter((award) => award.status === 'open').length, closed: awards.filter((award) => award.status === 'closed').length, announced: awards.filter((award) => award.status === 'announced').length }
  return <main className="award-page">
    <section className="award-list wrap kl-page">
      <ListingHead crumb="Penghargaan" title="Penghargaan" count={loading ? null : `${filteredAwards.length}${filteredAwards.length !== awards.length ? ` / ${awards.length}` : ''}`} lead="Apresiasi untuk karya terbaik siswa. Satu siswa, satu suara untuk setiap penghargaan." />
      {message && <p className="kl-note" role="status">{message}</p>}
      <div className="kl-bar">
        <SearchField value={query} onChange={setQuery} placeholder="Penghargaan, karya, siswa…" label="Cari penghargaan, nominasi, atau siswa" />
        <Dropdown label="Status" value={statusFilter} allLabel="Semua" options={[{ value: 'open', label: 'Voting dibuka', count: statusCounts.open }, { value: 'closed', label: 'Voting ditutup', count: statusCounts.closed }, { value: 'announced', label: 'Hasil diumumkan', count: statusCounts.announced }]} onChange={setStatusFilter} />
        {(query || statusFilter) && <button type="button" className="kl-reset" onClick={() => { setQuery(''); setStatusFilter('') }}>Reset</button>}
      </div>
      {loading ? <AwardListSkeleton /> : awards.length === 0 ? <div className="kl-empty"><strong>Belum ada penghargaan</strong><p>Admin akan menampilkan penghargaan dan nominasi di sini.</p></div> : filteredAwards.length === 0 ? <div className="kl-empty"><strong>Tidak ada penghargaan yang cocok</strong><p>Ubah kata pencarian atau filter status.</p><button type="button" onClick={() => { setQuery(''); setStatusFilter('') }}>Hapus semua filter</button></div> : filteredAwards.map((award) => {
        const awardKey = String(award.id)
        const ownVote = votes[awardKey]
        const selectedPortfolio = ownVote && (typeof ownVote.portfolio === 'object' ? ownVote.portfolio.id : ownVote.portfolio)
        const result = results[awardKey]
        const open = isOpen(award)
        const opens = new Date(award.opensAt).getTime(), closes = new Date(award.closesAt).getTime()
        const progress = closes > opens ? Math.min(100, Math.max(0, ((Date.now() - opens) / (closes - opens)) * 100)) : 100
        const daysLeft = Math.max(0, Math.ceil((closes - Date.now()) / 86400000))
        const statusText = award.status === 'open' ? (open ? 'VOTING BERLANGSUNG' : 'BELUM DIBUKA') : award.status === 'closed' ? 'VOTING DITUTUP' : award.status === 'announced' ? 'HASIL DIUMUMKAN' : 'BELUM DIBUKA'
        const nominees = [...(award.nominees || [])]
        const votesOf = (portfolio: Portfolio) => result?.results.find((item) => String(item.portfolio.id) === String(portfolio.id))?.votes || 0
        if (result) nominees.sort((a, b) => votesOf(b) - votesOf(a))
        const totalVotes = result ? nominees.reduce((sum, portfolio) => sum + votesOf(portfolio), 0) : 0
        return <article className="awp-award" id={`award-${award.id}`} key={award.id}>
          <header className={`awp-hero awp-hero--${award.status}`}>
            <svg className="awp-trophy" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>
            <div className="awp-hero-top"><span className="awp-status"><i aria-hidden="true" />{statusText}</span>{open && <span className="awp-days">{daysLeft > 0 ? `${daysLeft} hari lagi` : 'Hari terakhir'}</span>}</div>
            <h2>{award.title}</h2><p className="awp-desc">{award.description}</p>
            <div className="awp-meta"><span>{dateLabel(award.opensAt)} — {dateLabel(award.closesAt)}</span><span>{nominees.length} nominasi{result ? ` · ${totalVotes} suara` : ''}</span></div>
            {award.status === 'open' && <div className="aw-progress" role="img" aria-label={`Waktu voting berjalan ${Math.round(progress)} persen`}><span style={{ width: `${progress}%` }} /></div>}
          </header>
          {stats[awardKey] && (() => {
            const stat = stats[awardKey]
            const turnout = stat.eligibleVoters ? Math.min(100, Math.round((stat.totalVotes / stat.eligibleVoters) * 100)) : 0
            return <div className="awp-quick" aria-label="Quick count partisipasi">
              <div><strong>{stat.totalVotes}</strong><span>Suara masuk</span></div>
              <div><strong>{turnout}%</strong><span>Partisipasi siswa</span><div className="awp-turnout" role="img" aria-label={`${turnout} persen siswa sudah memilih`}><span style={{ width: `${turnout}%` }} /></div></div>
              <div><strong>{nominees.length}</strong><span>Nominasi</span></div>
              <div><strong>{open ? (daysLeft > 0 ? daysLeft : '0') : '—'}</strong><span>{open ? 'Hari tersisa' : 'Voting selesai'}</span></div>
            </div>
          })()}
          {(ownVote && open) || (role === 'teacher' && open) || (award.status === 'open' && !open) ? <p className="awp-note" role="status">{ownVote && open ? `Suara tersimpan. Kamu dapat mengganti pilihan sampai ${dateLabel(award.closesAt)}.` : role === 'teacher' && open ? 'Voting hanya tersedia untuk akun siswa terdaftar.' : 'Periode voting belum dimulai atau sudah berakhir.'}</p> : null}
          {nominees.length ? <div className="awp-grid">{nominees.map((portfolio, index) => {
            const selected = String(selectedPortfolio) === String(portfolio.id)
            const votesCount = votesOf(portfolio)
            const percent = totalVotes ? Math.round((votesCount / totalVotes) * 100) : 0
            const winner = Boolean(result) && index === 0 && votesCount > 0
            const cover = typeof portfolio.coverImage === 'object' && portfolio.coverImage?.url ? portfolio.coverImage.url : null
            const studentLabel = typeof portfolio.student === 'object' ? portfolio.student?.name || 'Siswa Telkom' : 'Siswa Telkom'
            const canVote = !result && open && (role === '' || role === 'student')
            return <div className={`awp-nominee${selected ? ' is-selected' : ''}${winner ? ' is-winner' : ''}`} key={portfolio.id}>
              <div className="awp-cover">{cover ? <SkeletonImage src={cover} alt={`Sampul ${portfolio.title}`} /> : <span className="kr-placeholder">Telkom Student Creation</span>}
                {result ? <span className="awp-rank">{winner ? <><DashIcon name="crown" size={13} /> Juara</> : `#${index + 1}`}</span> : <span className="awp-rank">Nominasi</span>}{selected && !result && <span className="awp-picked"><DashIcon name="tick" size={13} /> Pilihanmu</span>}</div>
              <div className="awp-body"><h3>{displayTitle(portfolio.title, studentLabel)}</h3><p>Oleh {studentLabel}</p>
                {result && <div className="awp-result"><div className="awp-bar"><span style={{ width: `${percent}%` }} /></div><strong>{votesCount} suara <small>{percent}%</small></strong></div>}
                {canVote && <button type="button" className={`awp-vote${selected ? ' is-selected' : ''}`} disabled={busy !== ''} onClick={() => void castVote(award, portfolio)}>{busy === `${awardKey}:${portfolio.id}` ? 'Menyimpan…' : selected ? <><DashIcon name="tick" size={13} /> Pilihanmu</> : ownVote ? 'Ubah pilihan' : 'Pilih karya'}</button>}
              </div>
            </div>
          })}</div> : <p className="awp-empty">Belum ada karya nominasi untuk penghargaan ini.</p>}
        </article>
      })}
    </section>
  </main>
}
