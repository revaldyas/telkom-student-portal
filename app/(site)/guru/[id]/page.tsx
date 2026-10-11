'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { ProfileSkeleton } from '../../../../components/SiteSkeletons'
import SkeletonImage from '../../../../components/SkeletonImage'
import { siteFetch } from '../../../../lib/siteFetch'

type Mentor = {
  id: string | number
  name: string
  bio?: string | null
  interests: string[]
  skills: string[]
  experiences: string[]
  profilePhoto?: string | null
  class?: string | null
  program?: string | null
}
type MentorWork = {
  id: string | number
  title: string
  slug: string
  year?: number
  verifiedAt?: string | null
  category?: string | null
  coverImage?: string | null
  student?: { id: string | number; name: string } | null
}
type Impact = { reviews: number; verified: number; revisions: number; works: number }

const parseLines = (value: FormDataEntryValue | null) => String(value || '').split(/\n|,/).map((item) => item.trim()).filter(Boolean)

export default function MentorProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [works, setWorks] = useState<MentorWork[]>([])
  const [impact, setImpact] = useState<Impact>({ reviews: 0, verified: 0, revisions: 0, works: 0 })
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [profileResponse, sessionResponse] = await Promise.all([
          fetch(`/api/community/mentors/${encodeURIComponent(id)}`, { cache: 'no-store' }),
          fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' }),
        ])
        if (!profileResponse.ok) throw new Error('Profil Guru tidak ditemukan.')
        const data = await profileResponse.json()
        const session = sessionResponse.ok ? await sessionResponse.json() : null
        if (cancelled) return
        setMentor(data.mentor)
        setWorks(data.works || [])
        setImpact(data.impact || { reviews: 0, verified: 0, revisions: 0, works: 0 })
        setIsOwner(session?.user?.role === 'teacher' && String(session.user.id) === String(id))
      } catch {
        if (!cancelled) setMentor(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [id])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!mentor) return
    setNotice('')
    const form = new FormData(event.currentTarget)
    const photo = form.get('profilePhoto')
    let profilePhoto: string | number | undefined
    if (photo instanceof File && photo.size) {
      const upload = new FormData()
      upload.append('file', photo)
      upload.append('alt', `Foto profil Guru ${String(form.get('name') || mentor.name)}`)
      const uploadResponse = await siteFetch('/api/uploads', { method: 'POST', body: upload })
      const uploadData = await uploadResponse.json()
      if (!uploadResponse.ok) { setNotice(uploadData.errors?.[0]?.message || 'Foto profil belum berhasil diunggah.'); return }
      profilePhoto = uploadData.doc?.id
    }
    const data: Record<string, unknown> = {
      name: String(form.get('name') || '').trim(),
      bio: String(form.get('bio') || '').trim(),
      interests: parseLines(form.get('interests')),
      skills: parseLines(form.get('skills')),
      experiences: parseLines(form.get('experiences')),
    }
    if (profilePhoto !== undefined) data.profilePhoto = profilePhoto
    const response = await siteFetch(`/api/users/${mentor.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    const result = await response.json()
    if (!response.ok) { setNotice(result.errors?.[0]?.message || 'Profil belum berhasil diperbarui.'); return }
    const user = result.doc || result
    const nextMentor = {
      ...mentor,
      name: user.name,
      bio: user.bio || null,
      interests: user.interests || [],
      skills: user.skills || [],
      experiences: user.experiences || [],
      profilePhoto: user.profilePhoto?.url || mentor.profilePhoto,
    }
    setMentor(nextMentor)
    setEditing(false)
    setNotice('Profil Guru berhasil diperbarui.')
  }

  if (loading) return <ProfileSkeleton />
  if (!mentor) return <main className="lowfi-shell"><p>Profil Guru tidak ditemukan.</p><Link href="/">Kembali ke beranda</Link></main>

  return <main className="lowfi-shell">
    <section className="lowfi-content student-profile-page mentor-profile-page">
      <p><Link href="/">Beranda</Link> / Profil Guru</p>
      <header className="creator-profile-header">
        <span className="mvs-avatar mvs-avatar--profile">{mentor.profilePhoto ? <SkeletonImage className="creator-avatar" src={mentor.profilePhoto} alt={`Foto profil ${mentor.name}`} /> : <span className="creator-avatar profile-initial">{mentor.name.slice(0, 1).toUpperCase()}</span>}</span>
        <div className="creator-details">
          <div className="creator-title-row"><h1>{mentor.name}</h1><span className="lowfi-badge">GURU PEMBIMBING</span>{isOwner && <button className="filter" type="button" onClick={() => setEditing((value) => !value)}>{editing ? 'Tutup' : 'Edit profil'}</button>}</div>
          <div className="creator-stats"><span><strong>{impact.works}</strong> karya terverifikasi</span><span><strong>{impact.reviews}</strong> tinjauan</span><span><strong>{impact.revisions}</strong> arahan revisi</span></div>
          <p className="creator-school">{mentor.class || 'Guru'}{mentor.program ? ` · ${mentor.program}` : ''}</p>
          {mentor.bio && <p className="creator-bio">{mentor.bio}</p>}
          {isOwner && <Link className="dash-new" href="/portal/guru">Buka Portal Guru</Link>}
        </div>
      </header>

      {notice && <p className="auth-hint" role="status">{notice}</p>}
      {editing && isOwner && <form className="project-form profile-edit-form" onSubmit={saveProfile}>
        <h2>Edit profil Guru</h2>
        <label htmlFor="mentor-name">NAMA LENGKAP</label><input id="mentor-name" name="name" required defaultValue={mentor.name} />
        <label htmlFor="mentor-bio">BIO</label><textarea id="mentor-bio" name="bio" maxLength={1200} defaultValue={mentor.bio || ''} placeholder="Ceritakan pengalaman dan pendekatanmu dalam membimbing siswa." />
        <label htmlFor="mentor-interests">MINAT DAN FOKUS BIMBINGAN</label><textarea id="mentor-interests" name="interests" defaultValue={mentor.interests.join('\n')} placeholder="Satu bidang per baris" />
        <label htmlFor="mentor-skills">KEAHLIAN</label><textarea id="mentor-skills" name="skills" defaultValue={mentor.skills.join('\n')} placeholder="Satu keahlian per baris" />
        <label htmlFor="mentor-experiences">PENGALAMAN DAN PROYEK</label><textarea id="mentor-experiences" name="experiences" defaultValue={mentor.experiences.join('\n')} placeholder="Satu pengalaman per baris" />
        <label htmlFor="mentor-photo">FOTO PROFIL</label><input id="mentor-photo" name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" />
        <button className="auth-submit">Simpan perubahan</button>
      </form>}

      <section className="competency-panel">
        <div className="section-heading"><div><span className="section-kicker">PROFIL MENTOR</span><h2>Fokus dan pengalaman</h2></div></div>
        {mentor.skills.length > 0 && <div className="competency-group"><h3>Keahlian</h3><div className="competency-chips">{mentor.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></div>}
        {mentor.interests.length > 0 && <div className="competency-group"><h3>Minat dan fokus bimbingan</h3><div className="competency-chips competency-chips--soft">{mentor.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></div>}
        {mentor.experiences.length > 0 && <div className="competency-group"><h3>Pengalaman dan proyek</h3><ul className="competency-experiences">{mentor.experiences.map((experience) => <li key={experience}>{experience}</li>)}</ul></div>}
        {!mentor.skills.length && !mentor.interests.length && !mentor.experiences.length && <p>{isOwner ? 'Tambahkan keahlian, fokus bimbingan, dan pengalaman agar siswa mengenal profilmu.' : 'Guru ini belum menambahkan informasi keahlian dan pengalaman.'}</p>}
        {isOwner && !editing && <button className="filter" type="button" onClick={() => setEditing(true)}>Lengkapi profil</button>}
      </section>

      <section className="creator-work-section mentor-verified-work">
        <div className="creator-tabs"><h2>Karya terverifikasi</h2><span>{works.length} karya</span></div>
        {works.length ? <div className="creator-work-grid">{works.map((work) => <article className="creator-work-card" key={work.id}>
          <Link className="creator-work-image" href={`/karya/${work.slug}`}>{work.coverImage ? <SkeletonImage src={work.coverImage} alt={`Sampul ${work.title}`} /> : <span>{work.title.slice(0, 1)}</span>}<small className="verified-badge">TERVERIFIKASI</small></Link>
          <div className="creator-work-meta"><h3><Link href={`/karya/${work.slug}`}>{work.title}</Link></h3><p>{work.category || 'Portofolio'}{work.year ? ` · ${work.year}` : ''}</p>{work.student && <p>Karya <Link href={`/siswa/${work.student.id}`}>{work.student.name}</Link></p>}</div>
        </article>)}</div> : <div className="empty-state"><h2>Belum ada karya terverifikasi</h2><p>Karya yang kamu verifikasi akan tampil di profil ini.</p></div>}
      </section>
    </section>
  </main>
}
