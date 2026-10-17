'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { displayTitle } from '../../../../lib/displayTitle'
import { ProfileSkeleton } from '../../../../components/SiteSkeletons'
import ProfileView, { type ProfileRecord, type ProfileWork, type RelatedGroup, type RelatedPerson } from '../../../../components/ProfileView'
import type { WorkState } from '../../../../lib/workState'
import { siteFetch } from '../../../../lib/siteFetch'
import type { Appearance } from '../../../../lib/appearance'

type AwardEntry = { id: string | number; title: string; portfolio?: string }
type Badge = { id: string; name: string; description: string; portfolio: string }
type StudentRecord = {
  id: string | number; recordType: 'achievement' | 'award'; code: string; title: string; description: string
  rank?: number | null; earnedAt: string; portfolio?: { id: string | number; title: string } | null
  award?: { id: string | number; title: string } | null
}
type Work = {
  id: string | number; slug: string; title: string; summary: string; year?: number
  verificationStatus?: string
  categoryRef?: { id?: string | number; name?: string; code?: string } | string | number
  coverImage?: { url?: string; alt?: string } | string | number
  likeCount: number; commentCount: number
  isNominee?: boolean
}
type StudentProject = { likes?: number; comments?: number; id: string | number; slug: string; title: string; summary: string; year?: number; category?: string | null; coverImage?: { url?: string; alt?: string } | null; members: Array<{ id: string | number; name: string; contribution: string }> }
type DraftItem = { id: string | number; slug: string; title: string; year?: number; state: WorkState; category?: string | null; coverImage?: { url?: string } | null }
type Profile = {
  student: { id: string | number; name: string; bio?: string | null; profilePhoto?: string | null; class?: string | null; program?: string | null; interests?: string[]; skills?: string[]; experiences?: string[]; appearance?: Appearance }
  totals: { likes: number; comments: number; portfolios: number }
  isOwner?: boolean
  pinnedWorks?: number[]
  related?: { team: RelatedPerson[]; programName: string | null; program: RelatedPerson[] }
  drafts?: { works: DraftItem[]; projects: DraftItem[] }
  portfolios: Work[]; projects: StudentProject[]; nomineeAwards: AwardEntry[]; winningAwards: AwardEntry[]; badges: Badge[]; records: StudentRecord[]
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mvsRank, setMvsRank] = useState(0)
  const [pinned, setPinned] = useState<number[]>([])
  const [viewer, setViewer] = useState<{ id: number; role: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((data) => { if (data?.user) setViewer({ id: Number(data.user.id), role: data.user.role }) }).catch(() => null)
  }, [])

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
        // Kirim cookie sesi agar pemilik profil menerima draf miliknya.
        const response = await fetch(`/api/community/students/${encodeURIComponent(id)}`, { cache: 'no-store', credentials: 'same-origin' })
        if (!response.ok) throw new Error('Profil siswa tidak ditemukan.')
        const publicProfile: Profile = await response.json()
        if (!cancelled) { setProfile(publicProfile); setPinned(publicProfile.pinnedWorks || []) }
      } catch {
        if (!cancelled) setProfile(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [id])

  const togglePin = useCallback(async (workID: string | number, pin: boolean): Promise<string | null> => {
    const numeric = Number(workID)
    const previous = pinned
    const next = pin ? [...previous.filter((item) => item !== numeric), numeric].slice(-3) : previous.filter((item) => item !== numeric)
    if (pin && previous.length >= 3 && !previous.includes(numeric)) return 'Maksimal 3 karya disematkan. Lepas satu dulu.'
    setPinned(next)
    try {
      const response = await siteFetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinnedWorks: next }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Sematan belum tersimpan.')
      setPinned(Array.isArray(result.doc?.pinnedWorks) ? result.doc.pinnedWorks.map(Number) : next)
      return null
    } catch (error) {
      setPinned(previous)
      return error instanceof Error ? error.message : 'Sematan belum tersimpan.'
    }
  }, [id, pinned])

  if (loading) return <ProfileSkeleton />
  if (!profile) return <main className="lowfi-shell"><p>Profil siswa tidak ditemukan.</p><Link href="/">Kembali ke beranda</Link></main>
  const student = profile.student
  const isOwner = Boolean(profile.isOwner)
  const isNominee = profile.nomineeAwards.length > 0

  const works: ProfileWork[] = [
    ...profile.portfolios.map((work): ProfileWork => ({
      id: work.id, href: `/karya/${work.slug}`, title: displayTitle(work.title, student.name),
      category: typeof work.categoryRef === 'object' && work.categoryRef ? work.categoryRef.name || work.categoryRef.code : null, year: work.year,
      cover: typeof work.coverImage === 'object' && work.coverImage ? work.coverImage.url || null : null,
      state: 'published', likes: work.likeCount, comments: work.commentCount, isNominee: work.isNominee, verified: work.verificationStatus === 'verified',
    })),
    ...(profile.drafts?.works || []).map((work): ProfileWork => ({
      id: `draft-${work.id}`, href: `/portal/siswa/karya/${work.id}/edit`, editHref: `/portal/siswa/karya/${work.id}/edit`, title: work.title || 'Tanpa judul',
      category: work.category, year: work.year, cover: work.coverImage?.url || null, state: work.state,
    })),
  ]
  const projects: ProfileWork[] = [
    ...profile.projects.map((project): ProfileWork => ({
      id: project.id, href: `/proyek/${project.slug}`, title: project.title, category: project.category, year: project.year, cover: project.coverImage?.url || null, state: 'published', likes: project.likes ?? 0, comments: project.comments ?? 0,
      note: project.members.length > 1 ? `${project.members.length} anggota tim` : 'Proyek kolaborasi',
    })),
    ...(profile.drafts?.projects || []).map((project): ProfileWork => ({
      id: `draft-${project.id}`, href: `/portal/siswa/proyek/${project.id}/edit`, editHref: `/portal/siswa/proyek/${project.id}/edit`, title: project.title || 'Tanpa judul',
      category: project.category, year: project.year, cover: project.coverImage?.url || null, state: project.state,
    })),
  ]
  const recordOf = (record: StudentRecord): ProfileRecord => ({
    id: String(record.id), date: record.earnedAt, title: record.recordType === 'award' ? record.award?.title || record.title : record.title,
    badge: record.recordType === 'award' ? (record.code === 'award-winner' ? 'PEMENANG' : 'NOMINASI') : record.code === 'mvs' ? `MVS #${record.rank}` : 'ACHIEVEMENT',
    description: record.description, note: record.portfolio?.title ? `Karya: ${record.portfolio.title}` : undefined,
    tone: record.code === 'award-winner' || record.code === 'mvs' ? 'gold' : undefined,
  })
  const achievements: ProfileRecord[] = [
    ...(profile.records || []).filter((record) => record.recordType === 'achievement').map(recordOf),
    ...profile.badges.map((badge): ProfileRecord => ({ id: `badge-${badge.id}`, badge: 'LENCANA', title: badge.name, description: badge.description, note: `Karya: ${badge.portfolio}` })),
  ]
  const awardRecords = (profile.records || []).filter((record) => record.recordType === 'award').map(recordOf)
  const awards: ProfileRecord[] = awardRecords.length ? awardRecords : [
    ...profile.winningAwards.map((award): ProfileRecord => ({ id: `win-${award.id}`, badge: 'PEMENANG', title: award.title, tone: 'gold' })),
    ...profile.nomineeAwards.map((award): ProfileRecord => ({ id: `nom-${award.id}-${award.portfolio}`, badge: 'NOMINASI', title: award.title })),
  ]

  const related: RelatedGroup[] = [
    { key: 'team', title: 'Satu tim proyek', hint: 'Rekan yang pernah berkolaborasi', icon: '🤝', href: (personID) => `/siswa/${personID}`, people: profile.related?.team || [] },
    { key: 'program', title: profile.related?.programName ? `Satu jurusan · ${profile.related.programName}` : 'Satu jurusan', hint: 'Siswa lain yang aktif berkarya', icon: '🎓', href: (personID) => `/siswa/${personID}`, people: profile.related?.program || [] },
  ]

  return <ProfileView
    related={related}
    pinnedIds={pinned}
    onTogglePin={isOwner ? togglePin : undefined}
    sharePath={`/siswa/${student.id}`}
    person={{ name: student.name, photo: student.profilePhoto, subtitle: [student.class || 'Siswa', student.program].filter(Boolean).join(' · '), badges: isNominee ? ['Nominee'] : [], bio: student.bio, appearance: student.appearance, mvsRank, skills: student.skills, interests: student.interests, experiences: student.experiences }}
    stats={[{ value: profile.totals.portfolios, label: 'Karya' }, { value: profile.totals.likes, label: 'Suka' }, { value: profile.totals.comments, label: 'Komentar' }]}
    isOwner={isOwner}
    showDrafts={isOwner}
    actions={isOwner ? <><Link href="/portal/siswa/karya/baru">+ Karya baru</Link><Link href="/portal/siswa">Buka dashboard</Link></> : viewer ? <Link href={`/portal/${viewer.role === 'teacher' ? 'guru' : 'siswa'}/pesan?dm=${student.id}`}>✉ Kirim pesan</Link> : undefined}
    works={works} projects={projects} achievements={achievements} awards={awards}
    emptyText={{ achievement: 'Belum ada achievement. Pencapaian leaderboard akan tercatat di sini.', awards: 'Belum ada riwayat penghargaan.' }}
  />
}
