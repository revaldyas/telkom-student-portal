'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { siteFetch } from '../../../../lib/siteFetch'
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
  const [isOwner, setIsOwner] = useState(false)
  const [mvsRank, setMvsRank] = useState(0)
  const [profileTab, setProfileTab] = useState<'awards' | 'achievements'>('achievements')
  const [workQuery, setWorkQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')

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
        let ownProfile = publicProfile
        const meResponse = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
        if (meResponse.ok) {
          const me = await meResponse.json()
          if (me?.user && String(me.user.id) === String(id)) {
            setIsOwner(true)
            const [worksResponse, projectsResponse] = await Promise.all([
              siteFetch(`/api/portfolios?where[student][equals]=${encodeURIComponent(id)}&limit=100&sort=-updatedAt&depth=2`, { cache: 'no-store' }),
              siteFetch(`/api/projects?where[createdBy][equals]=${encodeURIComponent(id)}&limit=100&sort=-updatedAt&depth=2`, { cache: 'no-store' }),
            ])
            const workData = worksResponse.ok ? await worksResponse.json() : { docs: [] }
            const projectData = projectsResponse.ok ? await projectsResponse.json() : { docs: [] }
            const counts = new Map(publicProfile.portfolios.map((work) => [String(work.id), work]))
            ownProfile = {
              ...publicProfile,
              student: { ...publicProfile.student, name: me.user.name || publicProfile.student.name },
              portfolios: (workData.docs || []).map((work: any) => {
                const existing = counts.get(String(work.id))
                const category = typeof work.categoryRef === 'object' ? work.categoryRef : null
                const cover = typeof work.coverImage === 'object' ? work.coverImage : null
                return {
                  id: work.id, slug: work.slug, title: work.title, summary: work.summary || '', year: work.year,
                  status: work.status, projectUrl: work.projectUrl, tools: work.tools,
                  verificationStatus: work.verificationStatus, reviewFeedback: work.reviewFeedback,
                  categoryRef: category ? { id: category.id, name: category.name, code: category.code } : null,
                  coverImage: cover ? { url: cover.url, alt: cover.alt } : null,
                  projectFile: typeof work.projectFile === 'object' && work.projectFile ? { url: work.projectFile.url, filename: work.projectFile.filename, mimeType: work.projectFile.mimeType } : null,
                  likeCount: existing?.likeCount || 0, commentCount: existing?.commentCount || 0,
                  isNominee: existing?.isNominee || false,
                }
              }),
              projects: (projectData.docs || []).flatMap((project: any) => {
                const cover = typeof project.coverImage === 'object' && project.coverImage ? { url: project.coverImage.url, alt: project.coverImage.alt } : null
                return [{ id: project.id, slug: project.slug, title: project.title, summary: project.summary || '', year: project.year, status: project.status, category: typeof project.categoryRef === 'object' ? project.categoryRef?.name || null : null, coverImage: cover, members: (project.members || []).map((entry: any) => ({ id: typeof entry.member === 'object' ? entry.member.id : entry.member, name: typeof entry.member === 'object' ? entry.member.name : 'Siswa', contribution: entry.contribution || '' })) }]
              }),
            }
          }
        }
        if (!cancelled) setProfile(ownProfile)
      } catch {
        if (!cancelled) setProfile(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [id])

  const publishedCount = useMemo(() => profile?.portfolios.filter((work) => work.status === 'published' || !work.status).length || 0, [profile])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    setNotice('')
    const form = new FormData(event.currentTarget)
    const photo = form.get('profilePhoto')
    let profilePhoto: string | number | undefined
    if (photo instanceof File && photo.size) {
      const upload = new FormData()
      upload.append('file', photo)
      upload.append('alt', `Foto profil ${String(form.get('name') || profile.student.name)}`)
      const uploadResponse = await siteFetch('/api/uploads', { method: 'POST', body: upload })
      const uploadData = await uploadResponse.json()
      if (!uploadResponse.ok) { setNotice(uploadData.errors?.[0]?.message || 'Foto profil belum berhasil diunggah.'); return }
      profilePhoto = uploadData.doc?.id
    }
    const readLines = (key: string) => String(form.get(key) || '').split(/\n|,/).map((item) => item.trim()).filter(Boolean)
    const data: Record<string, unknown> = {
      name: form.get('name'), bio: form.get('bio'),
      interests: readLines('interests'), skills: readLines('skills'), experiences: readLines('experiences'),
    }
    if (profilePhoto !== undefined) data.profilePhoto = profilePhoto
    const response = await siteFetch(`/api/users/${profile.student.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    const result = await response.json()
    if (!response.ok) { setNotice(result.errors?.[0]?.message || 'Profil belum berhasil diperbarui.'); return }
    const user = result.doc || result
    setProfile({ ...profile, student: { ...profile.student, name: user.name, bio: user.bio || null, interests: user.interests || [], skills: user.skills || [], experiences: user.experiences || [], profilePhoto: user.profilePhoto?.url || profile.student.profilePhoto } })
    setEditing(false)
    setNotice('Profil berhasil diperbarui.')
  }

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
          <div className="creator-title-row"><h1>{student.name}</h1>{isOwner && <button className="filter" onClick={() => setEditing(!editing)}>{editing ? 'Tutup' : 'Edit profil'}</button>}{isNominee && <span className="lowfi-badge">NOMINEE</span>}</div>
          <div className="creator-stats"><span><strong>{publishedCount}</strong> karya</span><span><strong>{profile.totals.likes}</strong> suka</span><span><strong>{profile.totals.comments}</strong> komentar</span></div>
          <p className="creator-school">{student.class || 'Siswa'}{student.program ? ` · ${student.program}` : ''}</p>
          {student.bio && <p className="creator-bio">{student.bio}</p>}
          {isOwner && <Link className="dash-new" href="/portal/siswa/karya/baru">+ Tambah karya</Link>}
        </div>
      </header>

      {notice && <p className="auth-hint" role="status">{notice}</p>}
      {editing && isOwner && <form className="project-form profile-edit-form" onSubmit={saveProfile}>
        <h2>Edit profil</h2><label htmlFor="profile-name">NAMA</label><input id="profile-name" name="name" required defaultValue={student.name} />
        <label htmlFor="profile-bio">BIO</label><textarea id="profile-bio" name="bio" maxLength={300} defaultValue={student.bio || ''} placeholder="Ceritakan sedikit tentang dirimu" />
        <label htmlFor="profile-interests">MINAT</label><textarea id="profile-interests" name="interests" defaultValue={(student.interests || []).join('\n')} placeholder="Satu minat per baris" />
        <label htmlFor="profile-skills">KETERAMPILAN</label><textarea id="profile-skills" name="skills" defaultValue={(student.skills || []).join('\n')} placeholder="Satu keterampilan per baris" />
        <label htmlFor="profile-experiences">PENGALAMAN PROYEK</label><textarea id="profile-experiences" name="experiences" defaultValue={(student.experiences || []).join('\n')} placeholder="Contoh: Aplikasi Kasir — UI designer, 2025" />
        <label htmlFor="profile-photo">FOTO PROFIL</label><input id="profile-photo" name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" />
        <button className="auth-submit">Simpan perubahan</button>
      </form>}
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

      {(student.interests?.length || student.skills?.length || student.experiences?.length || isOwner) ? <section className="competency-panel"><div className="section-heading"><div><span className="section-kicker">PROFIL KOMPETENSI</span><h2>Yang sedang kamu kembangkan</h2></div>{isOwner && <button className="filter" type="button" onClick={() => setEditing(true)}>Perbarui profil</button>}</div>
        {!!student.skills?.length && <div className="competency-group"><h3>Keterampilan</h3><div className="competency-chips">{student.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div>}
        {!!student.interests?.length && <div className="competency-group"><h3>Minat</h3><div className="competency-chips competency-chips--soft">{student.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></div>}
        {!!student.experiences?.length && <div className="competency-group"><h3>Pengalaman proyek</h3><ul className="competency-experiences">{student.experiences.map((experience) => <li key={experience}>{experience}</li>)}</ul></div>}
        {!student.skills?.length && !student.interests?.length && !student.experiences?.length && <p>Tambahkan minat, keterampilan, dan pengalaman proyek agar profil kompetensimu berkembang.</p>}
      </section> : null}

      <section className="creator-work-section" id="karya"><div className="creator-tabs"><h2>Karya</h2><span>{isOwner ? 'Semua karya' : 'Karya terbit'}</span></div>
        <label className="listing-search profile-work-search"><span>Cari karya siswa</span><input type="search" value={workQuery} onChange={(event) => setWorkQuery(event.target.value)} placeholder="Judul atau kategori…" /></label>
        {visibleWorks.length ? <div className="creator-work-grid">{visibleWorks.map((work) => {
          const image = typeof work.coverImage === 'object' && work.coverImage ? work.coverImage.url : null
          return <article className="creator-work-card" key={work.id}>
            <Link className="creator-work-image" href={`/karya/${work.slug}`}>{image ? <SkeletonImage src={image} alt={typeof work.coverImage === 'object' ? work.coverImage.alt || work.title : work.title} /> : <span>{work.title.slice(0, 1)}</span>}{isOwner && work.status !== 'published' && <small className="creator-work-status">{work.verificationStatus === 'revision-requested' ? 'Draf · perlu revisi' : 'Draf · menunggu verifikasi'}</small>}</Link>
            <div className="creator-work-meta">{work.isNominee && <span className="lowfi-badge">NOMINEE</span>}{work.verificationStatus === 'verified' && <span className="verified-badge">TERVERIFIKASI</span>}<h3><Link href={`/karya/${work.slug}`}>{displayTitle(work.title, student.name)}</Link></h3><p>{typeof work.categoryRef === 'object' ? work.categoryRef?.name || work.categoryRef?.code : 'Portofolio'}{work.year ? ` · ${work.year}` : ''}</p>{isOwner && <Link className="filter creator-work-view" href={`/karya/${work.slug}`}>Lihat karya</Link>}{isOwner && <Link className="filter" href={`/portal/siswa/karya/${work.id}/edit`}>{work.status === 'published' ? 'Edit karya' : 'Edit dan kirim ulang'}</Link>}{isOwner && work.reviewFeedback && <p className="work-feedback"><strong>Umpan balik Guru:</strong> {work.reviewFeedback}</p>}<div className="lowfi-counts"><span>♡ {work.likeCount}</span><span>◉ {work.commentCount}</span></div></div>
          </article>
        })}</div> : <p>{profile.portfolios.length ? 'Tidak ada karya yang cocok dengan pencarian.' : 'Belum ada karya yang diterbitkan.'}</p>}
      </section>
      {profile.projects.length > 0 && <section className="creator-work-section" id="proyek"><div className="creator-tabs"><h2>Proyek kolaborasi</h2><span>{profile.projects.length} proyek</span></div><div className="creator-work-grid">{profile.projects.map((project) => <article className="creator-work-card" key={project.id}><Link className="creator-work-image" href={`/proyek/${project.slug}`}>{project.coverImage?.url ? <SkeletonImage src={project.coverImage.url} alt={project.coverImage.alt || project.title} /> : <span>{project.title.slice(0, 1).toUpperCase()}</span>}{isOwner && project.status !== 'published' && <small className="creator-work-status">Draf · menunggu publikasi</small>}</Link><div className="creator-work-meta"><h3><Link href={`/proyek/${project.slug}`}>{project.title}</Link></h3><p>{project.category || 'Proyek kolaborasi'}{project.year ? ` · ${project.year}` : ''}</p><div className="project-profile-members">{project.members.map((member) => <span key={`${project.id}-${member.id}`}>{member.name} · {member.contribution}</span>)}</div>{isOwner && <Link className="filter" href={`/portal/siswa/proyek/${project.id}/edit`}>Edit proyek</Link>}</div></article>)}</div></section>}
    </section>
  </main>
}
