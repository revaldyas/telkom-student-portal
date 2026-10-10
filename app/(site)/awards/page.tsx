'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { siteFetch } from '../../../lib/siteFetch'
import { displayTitle } from '../../../lib/displayTitle'
import { AwardListSkeleton } from '../../../components/SiteSkeletons'
import SkeletonImage from '../../../components/SkeletonImage'

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

  return <main className="award-page">
    <header className="award-hero wrap">
      <div className="eyebrow muted">TELKOM STUDENT CREATION / PENGHARGAAN</div>
      <h1>Rayakan karya<br /><span>yang menginspirasi.</span></h1>
      <p>Apresiasi untuk karya terbaik siswa. Satu siswa, satu suara untuk setiap penghargaan.</p>
    </header>
    <section className="award-list wrap">
      {message && <p className="award-message" role="status">{message}</p>}
      <div className="listing-filters award-filters">
        <label className="listing-search"><span>Cari penghargaan, nominasi, atau siswa</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nama penghargaan, karya, siswa…" /></label>
        <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Semua status</option><option value="open">Voting dibuka</option><option value="closed">Voting ditutup</option><option value="announced">Hasil diumumkan</option></select></label>
        <span className="filter-result-count">{loading ? <span className="sk sk-count" role="status" aria-label="Menghitung penghargaan" /> : `${filteredAwards.length} penghargaan`}</span>
        {(query || statusFilter) && <button type="button" onClick={() => { setQuery(''); setStatusFilter('') }}>Hapus filter</button>}
      </div>
      {loading ? <AwardListSkeleton /> : awards.length === 0 ? <div className="empty-state"><h3>Belum ada penghargaan.</h3><p>Admin akan menampilkan penghargaan dan nominasi di sini.</p></div> : filteredAwards.length === 0 ? <div className="empty-state"><h3>Tidak ada penghargaan yang cocok.</h3><p>Ubah kata pencarian atau filter status.</p></div> : filteredAwards.map((award) => {
        const awardKey = String(award.id)
        const ownVote = votes[awardKey]
        const selectedPortfolio = ownVote && (typeof ownVote.portfolio === 'object' ? ownVote.portfolio.id : ownVote.portfolio)
        const result = results[awardKey]
        return <article className="award-card" key={award.id}>
          <div className="award-card-head">
          <div><div className="eyebrow muted">{award.status === 'announced' ? 'HASIL PENGHARGAAN' : 'PENGHARGAAN SISWA'}</div><h2>{award.title}</h2></div>
            <span className={`award-status ${award.status}`}>{award.status === 'open' ? 'VOTING DIBUKA' : award.status === 'closed' ? 'VOTING DITUTUP' : award.status === 'announced' ? 'HASIL DIUMUMKAN' : 'BELUM DIBUKA'}</span>
          </div>
          <p className="award-description">{award.description}</p>
          <p className="award-dates">Voting: {dateLabel(award.opensAt)} — {dateLabel(award.closesAt)}</p>
          <div className="award-nominees">{(award.nominees || []).map((portfolio) => {
            const nomineeResult = result?.results.find((item) => String(item.portfolio.id) === String(portfolio.id))
            const selected = String(selectedPortfolio) === String(portfolio.id)
            return <div className={`award-nominee${selected ? ' selected' : ''}`} key={portfolio.id}>
              <div className="award-nominee-main">{typeof portfolio.coverImage === 'object' && portfolio.coverImage?.url && <SkeletonImage className="award-nominee-image" src={portfolio.coverImage.url} alt={`Sampul ${portfolio.title}`} />}<div><span className="lowfi-badge">NOMINEE</span><h3>{displayTitle(portfolio.title, typeof portfolio.student === 'object' ? portfolio.student?.name : null)}</h3><p>{typeof portfolio.student === 'object' ? portfolio.student?.name : 'Siswa Telkom'}</p></div></div>
              {result ? <strong>{nomineeResult?.votes || 0} suara</strong> : isOpen(award) && (role === '' || role === 'student') ? <button type="button" className="filter" disabled={busy !== ''} onClick={() => void castVote(award, portfolio)}>{busy === `${awardKey}:${portfolio.id}` ? 'Menyimpan…' : selected ? 'Pilihanmu ✓' : ownVote ? 'Ubah pilihan' : 'Pilih karya'}</button> : null}
            </div>
          })}</div>
          {ownVote && isOpen(award) && <p className="award-vote-note">Suara tersimpan. Kamu dapat mengganti pilihan sampai {dateLabel(award.closesAt)}.</p>}
          {role === 'teacher' && isOpen(award) && <p className="award-vote-note">Voting hanya tersedia untuk akun siswa terdaftar.</p>}
          {award.status === 'open' && !isOpen(award) && <p className="award-vote-note">Periode voting belum dimulai atau sudah berakhir.</p>}
        </article>
      })}
    </section>
  </main>
}
