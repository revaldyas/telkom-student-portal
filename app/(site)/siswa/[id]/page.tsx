'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { displayTitle } from '../../../../lib/displayTitle'
import { ProfileSkeleton } from '../../../../components/SiteSkeletons'
import SkeletonImage from '../../../../components/SkeletonImage'

type AwardEntry = { id: string | number; title: string; portfolio?: string }
type Badge = { id: string; name: string; description: string; portfolio: string }
type StudentRecord = {
  id: string | number; recordType: 'achievement' | 'award'; code: string; title: string; description: string
  rank?: number | null; earnedAt: string; portfolio?: { id: string | number; title: string } | null
  award?: { id: string | number; title: string } | null
}
type Work = {
  id: string | number; slug: string; title: string; summary: string; year?: number
  status?: string; projectUrl?: string; tools?: string[]
  verificationStatus?: string; reviewFeedback?: string | null
  projectFile?: { url?: string; filename?: string; mimeType?: string } | null
  categoryRef?: { id?: string | number; name?: string; code?: string } | string | number
  coverImage?: { url?: string; alt?: string } | string | number
  likeCount: number; commentCount: number
  isNominee?: boolean
}
type StudentProject = { id: string | number; slug: string; title: string; summary: string; year?: number; status?: string; category?: string | null; coverImage?: { url?: string; alt?: string } | null; members: Array<{ id: string | number; name: string; contribution: string }> }
type Profile = {
  student: { id: string | number; name: string; bio?: string | null; profilePhoto?: string | null; class?: string | null; program?: string | null; interests?: string[]; skills?: string[]; experiences?: string[] }
  totals: { likes: number; comments: number; portfolios: number }
  portfolios: Work[]; projects: StudentProject[]; nomineeAwards: AwardEntry[]; winningAwards: AwardEntry[]; badges: Badge[]; records: StudentRecord[]
}
export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mvsRank, setMvsRank] = useState(0)
  const [profileTab, setProfileTab] = useState<'awards' | 'achievements'>('achievements')
  const [workQuery, setWorkQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const leaderboardResponse = await fetch('/api/community/leaderboard', { cache: 'no-store' })
        if (leaderboardResponse.ok) {
          const leaderboard = await leaderboardResponse.json()
          const rankIndex = (leaderboard.topOverall || []).findIndex((student: { id: string | number; score?: number }) => String(student.id) === String(id))
          if (!cancelled && rankIndex >= 0 && rankIndex < 3 && (leaderboard.topOverall[rankIndex].score || 0) > 0) setMvsRank(rankIndex + 1)
        }
        const response = await fetch(`/api/community/students/${encodeURIComponent(id)}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Profil siswa tidak ditemukan.')
        const publicProfile: Profile = await response.json()
        if (!cancelled) setProfile(publicProfile)
      } catch {
        if (!cancelled) setProfile(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [id])

  const publishedCount = profile?.portfolios.length || 0

  if (loading) return <ProfileSkeleton />
  if (!profile) return <main className="lowfi-shell"><p>Profil siswa tidak ditemukan.</p><Link href="/">Kembali ke beranda</Link></main>
  const student = profile.student
  const isNominee = profile.nomineeAwards.length > 0
  const visibleWorks = profile.portfolios.filter((work) => {
    const category = typeof work.categoryRef === 'object' && work.categoryRef ? work.categoryRef.name || work.categoryRef.code || '' : ''
    return `${work.title} ${work.summary} ${category}`.toLocaleLowerCase('id').includes(workQuery.trim().toLocaleLowerCase('id'))
  })

  return <main className="lowfi-shell">
    <section className="lowfi-content student-profile-page">
      <p><Link href="/">Beranda</Link> / Profil Siswa</p>
      <header className="creator-profile-header">
        <span className="mvs-avatar mvs-avatar--profile">{student.profilePhoto ? <SkeletonImage className="creator-avatar" src={student.profilePhoto} alt={`Foto profil ${student.name}`} /> : <span className="creator-avatar profile-initial">{student.name.slice(0, 1).toUpperCase()}</span>}{mvsRank > 0 && <small className="mvs-rank-badge">MVS #{mvsRank}</small>}</span>
        <div className="creator-details">
          <div className="creator-title-row"><h1>{student.name}</h1>{isNominee && <span className="lowfi-badge">NOMINEE</span>}</div>
          <div className="creator-stats"><span><strong>{publishedCount}</strong> karya</span><span><strong>{profile.totals.likes}</strong> suka</span><span><strong>{profile.totals.comments}</strong> komentar</span></div>
          <p className="creator-school">{student.class || 'Siswa'}{student.program ? ` · ${student.program}` : ''}</p>
          {student.bio && <p className="creator-bio">{student.bio}</p>}
        </div>
      </header>

      <section className="creator-achievements">
        <h2>Riwayat</h2>
        <div className="profile-history-tabs" role="tablist" aria-label="Riwayat siswa">
          <button type="button" role="tab" aria-selected={profileTab === 'awards'} onClick={() => setProfileTab('awards')}>Awards</button>
          <button type="button" role="tab" aria-selected={profileTab === 'achievements'} onClick={() => setProfileTab('achievements')}>Achievements</button>
        </div>
        <div className="profile-history-list" role="tabpanel">
          {profileTab === 'awards' ? (() => {
            const records = (profile.records || []).filter((record) => record.recordType === 'award')
            return records.length ? records.map((record) => <article className="profile-history-item" key={record.id}>
              <span className="lowfi-badge">{record.code === 'award-winner' ? 'PEMENANG' : 'NOMINASI'}</span>
              <div><h3>{record.award?.title || record.title}</h3><p>{record.description}</p>{record.portfolio?.title && <small>Karya: {record.portfolio.title}</small>}</div>
              <time dateTime={record.earnedAt}>{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(record.earnedAt))}</time>
            </article>) : <p>Belum ada riwayat penghargaan.</p>
          })() : (() => {
            const records = (profile.records || []).filter((record) => record.recordType === 'achievement')
            return records.length ? records.map((record) => <article className="profile-history-item" key={record.id}>
              <span className="lowfi-badge">{record.code === 'mvs' ? `MVS #${record.rank}` : 'ACHIEVEMENT'}</span>
              <div><h3>{record.title}</h3><p>{record.description}</p>{record.portfolio?.title && <small>Karya: {record.portfolio.title}</small>}</div>
              <time dateTime={record.earnedAt}>{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(record.earnedAt))}</time>
            </article>) : <p>Belum ada achievement. Pencapaian leaderboard akan tercatat di sini.</p>
          })()}
        </div>
      </section>

      {(student.interests?.length || student.skills?.length || student.experiences?.length) ? <section className="competency-panel"><div className="section-heading"><div><span className="section-kicker">PROFIL KOMPETENSI</span><h2>Yang sedang kamu kembangkan</h2></div></div>
        {!!student.skills?.length && <div className="competency-group"><h3>Keterampilan</h3><div className="competency-chips">{student.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div>}
        {!!student.interests?.length && <div className="competency-group"><h3>Minat</h3><div className="competency-chips competency-chips--soft">{student.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></div>}
        {!!student.experiences?.length && <div className="competency-group"><h3>Pengalaman proyek</h3><ul className="competency-experiences">{student.experiences.map((experience) => <li key={experience}>{experience}</li>)}</ul></div>}
      </section> : null}

      <section className="creator-work-section" id="karya"><div className="creator-tabs"><h2>Karya</h2><span>Karya terbit</span></div>
        <label className="listing-search profile-work-search"><span>Cari karya siswa</span><input type="search" value={workQuery} onChange={(event) => setWorkQuery(event.target.value)} placeholder="Judul atau kategori…" /></label>
        {visibleWorks.length ? <div className="creator-work-grid">{visibleWorks.map((work) => {
          const image = typeof work.coverImage === 'object' && work.coverImage ? work.coverImage.url : null
          return <article className="creator-work-card" key={work.id}>
            <Link className="creator-work-image" href={`/karya/${work.slug}`}>{image ? <SkeletonImage src={image} alt={typeof work.coverImage === 'object' ? work.coverImage.alt || work.title : work.title} /> : <span>{work.title.slice(0, 1)}</span>}</Link>
            <div className="creator-work-meta">{work.isNominee && <span className="lowfi-badge">NOMINEE</span>}{work.verificationStatus === 'verified' && <span className="verified-badge">TERVERIFIKASI</span>}<h3><Link href={`/karya/${work.slug}`}>{displayTitle(work.title, student.name)}</Link></h3><p>{typeof work.categoryRef === 'object' ? work.categoryRef?.name || work.categoryRef?.code : 'Portofolio'}{work.year ? ` · ${work.year}` : ''}</p><div className="lowfi-counts"><span>♡ {work.likeCount}</span><span>◉ {work.commentCount}</span></div></div>
          </article>
        })}</div> : <p>{profile.portfolios.length ? 'Tidak ada karya yang cocok dengan pencarian.' : 'Belum ada karya yang diterbitkan.'}</p>}
      </section>
      {profile.projects.length > 0 && <section className="creator-work-section" id="proyek"><div className="creator-tabs"><h2>Proyek kolaborasi</h2><span>{profile.projects.length} proyek</span></div><div className="creator-work-grid">{profile.projects.map((project) => <article className="creator-work-card" key={project.id}><Link className="creator-work-image" href={`/proyek/${project.slug}`}>{project.coverImage?.url ? <SkeletonImage src={project.coverImage.url} alt={project.coverImage.alt || project.title} /> : <span>{project.title.slice(0, 1).toUpperCase()}</span>}</Link><div className="creator-work-meta"><h3><Link href={`/proyek/${project.slug}`}>{project.title}</Link></h3><p>{project.category || 'Proyek kolaborasi'}{project.year ? ` · ${project.year}` : ''}</p><div className="project-profile-members">{project.members.map((member) => <span key={`${project.id}-${member.id}`}>{member.name} · {member.contribution}</span>)}</div></div></article>)}</div></section>}
    </section>
  </main>
}
