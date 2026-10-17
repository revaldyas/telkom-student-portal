'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import '../app/(site)/listing.css'
import '../app/(site)/profile.css'
import SkeletonImage from './SkeletonImage'
import ShareProfile from './ShareProfile'
import { coverStyle, defaultAppearance, type Appearance } from '../lib/appearance'
import { workStateLabel, type WorkState } from '../lib/workState'

export type ProfileWork = {
  id: string | number; href: string; title: string; category?: string | null; year?: number | null; cover?: string | null
  state: WorkState; likes?: number; comments?: number; isNominee?: boolean; verified?: boolean
  note?: ReactNode; editHref?: string; pinned?: boolean
}
export type ProfileRecord = { id: string; badge: string; title: string; description?: string; date?: string | null; note?: string; tone?: 'gold' }
export type ProfilePerson = {
  name: string; photo?: string | null; subtitle?: string; badges?: string[]; bio?: string | null; mvsRank?: number
  skills?: string[]; interests?: string[]; experiences?: string[]
  appearance?: Appearance
}
export type RelatedPerson = { id: string | number; name: string; photo?: string | null; subtitle?: string | null; badge?: string }
export type RelatedGroup = { key: string; title: string; hint?: string; icon: string; href: (id: string | number) => string; people: RelatedPerson[] }
type TabKey = 'karya' | 'proyek' | 'achievement' | 'awards'
type Props = {
  person: ProfilePerson
  stats: { value: number | string; label: string }[]
  /** Jalur profil publik, mis. /siswa/12, untuk kartu bagikan dan QR code. */
  sharePath?: string
  isOwner?: boolean
  /** Tombol Terbit/Draft hanya untuk pemilik profil yang punya draf (siswa). */
  showDrafts?: boolean
  actions?: ReactNode
  beforeTabs?: ReactNode
  works: ProfileWork[]
  projects: ProfileWork[]
  achievements: ProfileRecord[]
  awards: ProfileRecord[]
  related?: RelatedGroup[]
  /** Karya yang disematkan (urutan = urutan tampil) dan handler untuk menyematkan/melepas (pemilik saja). */
  pinnedIds?: (string | number)[]
  onTogglePin?: (id: string | number, pin: boolean) => Promise<string | null>
  pinLimit?: number
  worksLabel?: string
  projectsLabel?: string
  emptyText?: Partial<Record<TabKey, string>>
}

const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(value)) : ''
const heart = <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.5 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7h2C14 6.1 15.6 5 17.6 5 21 5 23 8.5 21.6 11.8 19.5 16.4 12 21 12 21Z"/></svg>

function WorkGrid({ items, query, owner, onPin, pinFull, busyID }: { items: ProfileWork[]; query: string; owner: boolean; onPin?: (work: ProfileWork) => void; pinFull?: boolean; busyID?: string | number | null }) {
  return <div className="pf-grid">{items.map((work) => {
    const isDraft = work.state !== 'published'
    return <article className={`kr-card${work.pinned ? ' is-pinned' : ''}`} key={work.id}>
      <div className="kr-media"><Link className="kr-cover" href={work.href} tabIndex={-1} aria-hidden="true">{work.cover ? <SkeletonImage src={work.cover} alt="" loading="lazy" /> : <span className="kr-placeholder">{work.title.slice(0, 1).toUpperCase()}</span>}</Link>
        {work.category && <span className="kr-category">{work.category}{work.year ? ` · ${work.year}` : ''}</span>}
        {work.pinned && <span className="pf-pin-badge" title="Disematkan di profil"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M16 3a1 1 0 0 1 .7 1.7L15.4 6l.9 5.4 2.4 2.1a1 1 0 0 1-.7 1.7H13v5.5a1 1 0 0 1-2 0v-5.5H6a1 1 0 0 1-.7-1.7L7.7 11.400 8.6 6 7.300 4.700A1 1 0 0 1 8 3h8Z"/></svg>Disematkan</span>}
        {isDraft ? <span className={`kr-nominee pf-state pf-state--${work.state}`}>{workStateLabel[work.state]}</span> : work.isNominee ? <span className="kr-nominee">★ NOMINEE</span> : null}
        <span className="kr-actions">{isDraft && owner && work.editHref
          ? <Link className="kr-comments" href={work.editHref}>Lanjutkan <span aria-hidden="true">✎</span></Link>
          : <>{owner && onPin && !isDraft && <button type="button" className={`kr-comments pf-pin-btn${work.pinned ? ' is-on' : ''}`} disabled={busyID !== null && busyID !== undefined || (!work.pinned && pinFull)} title={!work.pinned && pinFull ? 'Maksimal 3 karya disematkan. Lepas satu dulu.' : work.pinned ? 'Lepas sematan' : 'Sematkan di profil'} aria-pressed={Boolean(work.pinned)} aria-label={work.pinned ? 'Lepas sematan' : 'Sematkan di profil'} onClick={() => onPin(work)}>📌</button>}{work.likes !== undefined && <span className="kr-comments" aria-label={`${work.likes} suka`}>{heart}{work.likes}</span>}{work.comments !== undefined && <span className="kr-comments" aria-label={`${work.comments} komentar`}><span aria-hidden="true">◉</span>{work.comments}</span>}</>}</span></div>
      <div className="kr-body"><h3><Link href={work.href} title={work.title}>{work.title}</Link></h3>
        {(work.verified || work.note) && <p className="pf-note">{work.verified && <span className="pf-verified">✓ Terverifikasi</span>}{work.note}</p>}</div>
    </article>
  })}{!items.length && <p className="pf-empty-inline">{query ? 'Tidak ada yang cocok dengan pencarian.' : 'Belum ada item.'}</p>}</div>
}

function Records({ items, empty }: { items: ProfileRecord[]; empty: string }) {
  return items.length ? <div className="pf-records">{items.map((record) => <article className={`pf-record${record.tone === 'gold' ? ' is-gold' : ''}`} key={record.id}>
    <span className="pf-record-icon" aria-hidden="true">{record.tone === 'gold' ? '♛' : '★'}</span>
    <div><span className="pf-record-badge">{record.badge}</span><h3>{record.title}</h3>{record.description && <p>{record.description}</p>}{record.note && <small>{record.note}</small>}</div>
    {record.date && <time dateTime={record.date}>{formatDate(record.date)}</time>}
  </article>)}</div> : <div className="kl-empty"><strong>{empty}</strong></div>
}

export default function ProfileView({ person, stats, isOwner = false, showDrafts = false, sharePath, actions, beforeTabs, works, projects, achievements, awards, related = [], pinnedIds = [], onTogglePin, pinLimit = 3, worksLabel = 'Karya', projectsLabel = 'Proyek', emptyText = {} }: Props) {
  const appearance = person.appearance || defaultAppearance
  const [tab, setTab] = useState<TabKey>('karya')
  const [workView, setWorkView] = useState<'published' | 'draft'>('published')
  const [projectView, setProjectView] = useState<'published' | 'draft'>('published')
  const [query, setQuery] = useState('')
  const [pinBusy, setPinBusy] = useState<string | number | null>(null)
  const [pinToast, setPinToast] = useState('')

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab')
    if (requested === 'karya' || requested === 'proyek' || requested === 'achievement' || requested === 'awards') setTab(requested)
  }, [])
  const choose = (next: TabKey) => {
    setTab(next)
    const params = new URLSearchParams(window.location.search)
    if (next === 'karya') params.delete('tab'); else params.set('tab', next)
    const text = params.toString()
    window.history.replaceState(null, '', text ? `?${text}` : window.location.pathname)
  }

  const publishedWorks = works.filter((work) => work.state === 'published')
  const draftWorks = works.filter((work) => work.state !== 'published')
  const publishedProjects = projects.filter((project) => project.state === 'published')
  const draftProjects = projects.filter((project) => project.state !== 'published')
  const needle = query.trim().toLocaleLowerCase('id')
  const pinOrder = useMemo(() => new Map(pinnedIds.map((id, index) => [String(id), index])), [pinnedIds])
  const shownWorks = useMemo(() => (workView === 'draft' ? draftWorks : publishedWorks.map((work) => ({ ...work, pinned: pinOrder.has(String(work.id)) })).sort((a, b) => (pinOrder.get(String(a.id)) ?? 99) - (pinOrder.get(String(b.id)) ?? 99))).filter((work) => !needle || `${work.title} ${work.category || ''}`.toLocaleLowerCase('id').includes(needle)), [workView, draftWorks, publishedWorks, needle, pinOrder])
  async function togglePin(work: ProfileWork) {
    if (!onTogglePin || pinBusy !== null) return
    setPinBusy(work.id)
    const message = await onTogglePin(work.id, !work.pinned)
    setPinBusy(null)
    setPinToast(message || (work.pinned ? 'Sematan dilepas.' : 'Karya disematkan di bagian atas profil.'))
    setTimeout(() => setPinToast(''), 3000)
  }
  const shownProjects = (projectView === 'draft' ? draftProjects : publishedProjects)

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'karya', label: worksLabel, count: publishedWorks.length },
    { key: 'proyek', label: projectsLabel, count: publishedProjects.length },
    { key: 'achievement', label: 'Achievement', count: achievements.length },
    { key: 'awards', label: 'Awards', count: awards.length },
  ]

  const Toggle = ({ view, setView, published, drafts }: { view: 'published' | 'draft'; setView: (value: 'published' | 'draft') => void; published: number; drafts: number }) => isOwner && showDrafts
    ? <div className="pf-toggle" role="group" aria-label="Status"><button type="button" aria-pressed={view === 'published'} className={view === 'published' ? 'is-active' : ''} onClick={() => setView('published')}>Terbit <small>{published}</small></button><button type="button" aria-pressed={view === 'draft'} className={view === 'draft' ? 'is-active' : ''} onClick={() => setView('draft')}>Draft <small>{drafts}</small></button></div> : null

  return <main className="lowfi-shell"><section className="lowfi-content kl-page pf-page" style={{ ['--pf-accent' as string]: appearance.accent }}>
    <header className="ph">
      <div className="ph-banner" style={coverStyle(appearance)} role="img" aria-label="Banner profil" />
      <div className="ph-bar">
        <span className={`ph-avatar${appearance.avatarShape === 'rounded' ? ' is-rounded' : ''}`}>{person.photo ? <SkeletonImage src={person.photo} alt={`Foto profil ${person.name}`} /> : <span aria-hidden="true">{person.name.slice(0, 1).toUpperCase()}</span>}{person.mvsRank ? <small className="ph-mvs">MVS #{person.mvsRank}</small> : null}</span>
        <div className="ph-id">
          <div className="ph-name"><h1>{person.name}</h1>{(person.badges || []).map((badge) => <span className="ph-badge" key={badge}>{badge}</span>)}</div>
          {(person.subtitle || appearance.tagline) && <p className="ph-sub">{person.subtitle}{person.subtitle && appearance.tagline ? <span className="ph-dot" aria-hidden="true">•</span> : null}{appearance.tagline && <em>{appearance.tagline}</em>}</p>}
        </div>
        {(actions || sharePath) && <div className="ph-cta">{sharePath && <ShareProfile path={sharePath} name={person.name} subtitle={person.subtitle} photo={person.photo} appearance={appearance} />}{actions}</div>}
      </div>
      {(person.bio || person.skills?.length || person.interests?.length || person.experiences?.length) ? <div className="ph-about">
        {person.bio && <p className="ph-bio">{person.bio}</p>}
        {!!person.skills?.length && <div className="ph-tags"><span>Keahlian</span><ul>{person.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul></div>}
        {!!person.interests?.length && <div className="ph-tags"><span>Minat</span><ul className="is-soft">{person.interests.map((interest) => <li key={interest}>{interest}</li>)}</ul></div>}
        {!!person.experiences?.length && <details className="ph-exp"><summary>Pengalaman <b>{person.experiences.length}</b></summary><ul>{person.experiences.map((experience) => <li key={experience}>{experience}</li>)}</ul></details>}
      </div> : null}
      <dl className="ph-stats">{stats.map((stat) => <div key={stat.label}><dd>{stat.value}</dd><dt>{stat.label}</dt></div>)}</dl>
    </header>

    {beforeTabs}

    <div className={`ph-layout${related.some((group) => group.people.length) ? ' has-aside' : ''}`}>
    <div className="ph-main">
    <div className="pf-tabs" role="tablist" aria-label="Isi profil">{tabs.map((item) => <button key={item.key} type="button" role="tab" id={`pf-tab-${item.key}`} aria-selected={tab === item.key} aria-controls={`pf-panel-${item.key}`} className={tab === item.key ? 'is-active' : ''} onClick={() => choose(item.key)}>{item.label}<small>{item.count}</small></button>)}</div>

    <div className="pf-panel" role="tabpanel" id={`pf-panel-${tab}`} aria-labelledby={`pf-tab-${tab}`}>
      {tab === 'karya' && <>
        <div className="pf-toolbar"><Toggle view={workView} setView={setWorkView} published={publishedWorks.length} drafts={draftWorks.length} />
          <label className="kl-search pf-search"><span className="sr-only">Cari {worksLabel.toLowerCase()}</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul atau kategori…" /></label></div>
        {isOwner && onTogglePin && workView === 'published' && publishedWorks.length > 0 && <p className="pf-pin-hint">📌 Sematkan hingga {pinLimit} karya terbaikmu agar tampil paling atas · {pinnedIds.length}/{pinLimit} dipakai</p>}
        {workView === 'draft' && isOwner && showDrafts && <p className="kl-note">Draft hanya terlihat olehmu. Karya muncul di profil publik setelah diverifikasi guru dan terbit.</p>}
        {shownWorks.length ? <WorkGrid items={shownWorks} query={needle} owner={isOwner} onPin={onTogglePin ? (work) => void togglePin(work) : undefined} pinFull={pinnedIds.length >= pinLimit} busyID={pinBusy} /> : <div className="kl-empty"><strong>{emptyText.karya || (workView === 'draft' ? 'Tidak ada draft' : 'Belum ada karya yang terbit')}</strong>{needle && <p>Tidak ada yang cocok dengan pencarian.</p>}</div>}
      </>}
      {tab === 'proyek' && <>
        <div className="pf-toolbar"><Toggle view={projectView} setView={setProjectView} published={publishedProjects.length} drafts={draftProjects.length} /></div>
        {projectView === 'draft' && isOwner && showDrafts && <p className="kl-note">Draft proyek hanya terlihat olehmu.</p>}
        {shownProjects.length ? <WorkGrid items={shownProjects} query="" owner={isOwner} /> : <div className="kl-empty"><strong>{emptyText.proyek || (projectView === 'draft' ? 'Tidak ada draft proyek' : 'Belum ada proyek')}</strong></div>}
      </>}
      {tab === 'achievement' && <Records items={achievements} empty={emptyText.achievement || 'Belum ada achievement'} />}
      {tab === 'awards' && <Records items={awards} empty={emptyText.awards || 'Belum ada penghargaan'} />}
    </div>
    </div>
    {related.some((group) => group.people.length) && <aside className="ph-aside" aria-label="Rekomendasi">{related.filter((group) => group.people.length).map((group) => <section className="ph-rel" key={group.key}>
      <header><span aria-hidden="true">{group.icon}</span><div><h2>{group.title}</h2>{group.hint && <p>{group.hint}</p>}</div></header>
      <ul>{group.people.map((person) => <li key={person.id}><Link href={group.href(person.id)}><span className="ph-rel-avatar">{person.photo ? <SkeletonImage src={person.photo} alt="" loading="lazy" /> : person.name.slice(0, 1).toUpperCase()}</span><span className="ph-rel-text"><strong>{person.name}</strong>{person.subtitle && <small>{person.subtitle}</small>}</span>{person.badge && <em>{person.badge}</em>}</Link></li>)}</ul>
    </section>)}</aside>}
    </div>
  {pinToast && <p className="pf-toast" role="status">{pinToast}</p>}
  </section></main>
}
