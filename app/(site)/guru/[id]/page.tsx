'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProfileSkeleton } from '../../../../components/SiteSkeletons'
import ProfileView, { type ProfileRecord, type ProfileWork, type RelatedGroup } from '../../../../components/ProfileView'
import type { Appearance } from '../../../../lib/appearance'
import DashIcon from '../../../../components/DashIcon'

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
  appearance?: Appearance
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
type MentorProject = { likes?: number; comments?: number; id: string | number; slug: string; title: string; year?: number; category?: string | null; coverImage?: string | null; members: string[] }
type MentorAward = { id: string | number; title: string; work: string; winner: boolean; date: string }
type Impact = { reviews: number; verified: number; revisions: number; works: number }

export default function MentorProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [works, setWorks] = useState<MentorWork[]>([])
  const [projects, setProjects] = useState<MentorProject[]>([])
  const [awardList, setAwardList] = useState<MentorAward[]>([])
  const [impact, setImpact] = useState<Impact>({ reviews: 0, verified: 0, revisions: 0, works: 0 })
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [viewerRole, setViewerRole] = useState('')

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
        setProjects(data.projects || [])
        setAwardList(data.awards || [])
        setImpact(data.impact || { reviews: 0, verified: 0, revisions: 0, works: 0 })
        setIsOwner(session?.user?.role === 'teacher' && String(session.user.id) === String(id))
        setViewerRole(session?.user?.role || '')
      } catch {
        if (!cancelled) setMentor(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [id])

  if (loading) return <ProfileSkeleton />
  if (!mentor) return <main className="lowfi-shell"><p>Profil Guru tidak ditemukan.</p><Link href="/">Kembali ke beranda</Link></main>

  const mentorWorks: ProfileWork[] = works.map((work) => ({
    id: work.id, href: `/karya/${work.slug}`, title: work.title, category: work.category, year: work.year, cover: work.coverImage, state: 'published', verified: true,
    note: work.student ? <>Karya <Link href={`/siswa/${work.student.id}`}>{work.student.name}</Link></> : undefined,
  }))
  const mentorProjects: ProfileWork[] = projects.map((project) => ({
    id: project.id, href: `/proyek/${project.slug}`, title: project.title, category: project.category, year: project.year, cover: project.coverImage, state: 'published', likes: project.likes ?? 0, comments: project.comments ?? 0,
    note: project.members.length ? project.members.slice(0, 2).join(', ') + (project.members.length > 2 ? ` +${project.members.length - 2}` : '') : 'Proyek bimbingan',
  }))
  const milestones: { at: number; value: number; badge: string; title: string; description: string }[] = [
    { at: 1, value: impact.works, badge: 'KARYA', title: 'Mentor Pertama', description: 'Memverifikasi karya siswa pertama.' },
    { at: 10, value: impact.works, badge: 'KARYA', title: 'Mentor Aktif', description: 'Memverifikasi 10 karya siswa.' },
    { at: 25, value: impact.works, badge: 'KARYA', title: 'Mentor Andalan', description: 'Memverifikasi 25 karya siswa.' },
    { at: 50, value: impact.works, badge: 'KARYA', title: 'Mentor Unggul', description: 'Memverifikasi 50 karya siswa.' },
    { at: 10, value: impact.reviews, badge: 'TINJAUAN', title: 'Peninjau Rajin', description: 'Menyelesaikan 10 tinjauan karya.' },
    { at: 50, value: impact.reviews, badge: 'TINJAUAN', title: 'Peninjau Andal', description: 'Menyelesaikan 50 tinjauan karya.' },
    { at: 100, value: impact.reviews, badge: 'TINJAUAN', title: 'Penjaga Kualitas', description: 'Menyelesaikan 100 tinjauan karya.' },
    { at: 10, value: impact.revisions, badge: 'ARAHAN', title: 'Pemberi Arahan', description: 'Memberi 10 arahan revisi yang membangun.' },
  ]
  const achievements: ProfileRecord[] = milestones.filter((item) => item.value >= item.at).map((item) => ({ id: `${item.badge}-${item.at}`, badge: item.badge, title: item.title, description: item.description, tone: item.at >= 25 ? 'gold' : undefined }))
  const mentorAwards: ProfileRecord[] = awardList.map((award) => ({ id: `${award.id}-${award.work}`, badge: award.winner ? 'PEMENANG' : 'NOMINASI', title: award.title, description: `Karya bimbingan: ${award.work}`, date: award.date, tone: award.winner ? 'gold' : undefined }))

  const mentored = new Map<string, { id: string | number; name: string; count: number }>()
  for (const work of works) {
    if (!work.student) continue
    const entry = mentored.get(String(work.student.id)) || { id: work.student.id, name: work.student.name, count: 0 }
    entry.count += 1
    mentored.set(String(work.student.id), entry)
  }
  const related: RelatedGroup[] = [{
    key: 'students', title: 'Siswa bimbingan', hint: 'Karya mereka diverifikasi guru ini', icon: <DashIcon name="school" size={18} />, href: (personID) => `/siswa/${personID}`,
    people: [...mentored.values()].sort((a, b) => b.count - a.count).slice(0, 6).map((entry) => ({ id: entry.id, name: entry.name, subtitle: `${entry.count} karya terverifikasi`, badge: `${entry.count} karya` })),
  }]

  return <ProfileView
    related={related}
    sharePath={`/guru/${mentor.id}`}
    person={{ name: mentor.name, photo: mentor.profilePhoto, subtitle: [mentor.class || 'Guru', mentor.program].filter(Boolean).join(' · '), badges: ['Guru pembimbing'], bio: mentor.bio, appearance: mentor.appearance, skills: mentor.skills, interests: mentor.interests, experiences: mentor.experiences }}
    stats={[{ value: impact.works, label: 'Terverifikasi' }, { value: impact.reviews, label: 'Tinjauan' }, { value: impact.revisions, label: 'Revisi' }]}
    isOwner={isOwner}
    actions={isOwner ? <><Link href="/portal/guru/profil"><DashIcon name="edit" size={14} /> Edit profil</Link><Link href="/portal/guru">Buka Portal Guru</Link></> : viewerRole ? <Link href={`/portal/${viewerRole === 'teacher' ? 'guru' : 'siswa'}/pesan?dm=${mentor.id}`}><DashIcon name="mail" size={14} /> Kirim pesan</Link> : undefined}
    works={mentorWorks} projects={mentorProjects} achievements={achievements} awards={mentorAwards}
    worksLabel="Karya" projectsLabel="Proyek"
    emptyText={{ karya: 'Belum ada karya terverifikasi', proyek: 'Belum ada proyek bimbingan', achievement: 'Belum ada achievement. Pencapaian muncul seiring karya yang kamu verifikasi.', awards: 'Belum ada karya bimbingan yang meraih penghargaan.' }}
  />
}
