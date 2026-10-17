import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import { projectCounts } from '../../../../../lib/projectSocial'
import { awardVoteCounts, groupCount } from '../../../../../lib/dbCounts'

type StudentTotal = {
  id: string
  name: string
  profilePhoto: string | null
  likes: number
  comments: number
  karya: number
}

const idOf = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return undefined
}

type Board = { topProjects: unknown[]; trendingProjects: unknown[]; topLikes: unknown[]; trending: unknown[]; topOverall: unknown[] }
// Hasil dihitung ulang paling cepat tiap 30 detik; permintaan bersamaan berbagi satu perhitungan.
const TTL_MS = 30_000
const globalCache = globalThis as unknown as { __leaderboard?: { at: number; data?: Board; promise?: Promise<Board> } }

async function compute(): Promise<Board> {
  const payload = await getPayload({ config })
  // Semua bacaan yang saling bebas dijalankan bersamaan: satu "gelombang" round trip, bukan berurutan.
  const [portfolios, likeCountsByID, commentCountsByID, awards, voteCounts, projectDocs] = await Promise.all([
    payload.find({ collection: 'portfolios', where: { status: { equals: 'published' } }, depth: 2, limit: 1000, overrideAccess: true, pagination: false }),
    groupCount(payload, 'portfolio_likes', 'portfolio_id'),
    groupCount(payload, 'portfolio_comments', 'portfolio_id'),
    payload.find({ collection: 'awards', where: { status: { not_equals: 'draft' } }, depth: 0, limit: 1000, overrideAccess: true, pagination: false }),
    awardVoteCounts(payload),
    payload.find({ collection: 'projects', where: { status: { equals: 'published' } }, depth: 2, limit: 1000, overrideAccess: true, pagination: false }),
  ])
  const likeCounts = new Map([...likeCountsByID].map(([id, total]) => [String(id), total]))
  const commentCounts = new Map([...commentCountsByID].map(([id, total]) => [String(id), total]))
  const nomineePortfolioIDs = new Set(awards.docs.flatMap((award) =>
    Array.isArray(award.nominees) ? award.nominees.map(idOf).filter((id): id is string => Boolean(id)) : [],
  ))

  const totals = new Map<string, StudentTotal>()
  for (const portfolio of portfolios.docs) {
    const studentID = idOf(portfolio.student)
    if (!studentID) continue
    let student = totals.get(studentID)
    if (!student) {
      const studentDoc = typeof portfolio.student === 'object' ? portfolio.student : null
      const photo = studentDoc && typeof studentDoc.profilePhoto === 'object' ? studentDoc.profilePhoto : null
      student = {
        id: studentID,
        name: studentDoc?.name || 'Siswa',
        profilePhoto: photo?.url || null,
        likes: 0,
        comments: 0,
        karya: 0,
      }
      totals.set(studentID, student)
    }
    student.likes += likeCounts.get(String(portfolio.id)) || 0
    student.comments += commentCounts.get(String(portfolio.id)) || 0
    student.karya += 1
  }

  const students = [...totals.values()]
  const sortTop = (key: 'likes' | 'comments' | 'score') => [...students]
    .sort((a, b) => (key === 'score' ? b.likes + b.comments - a.likes - a.comments : b[key] - a[key]) || a.name.localeCompare(b.name, 'id'))
    .slice(0, 10)

  const portfolioRankings = portfolios.docs
    .map((portfolio) => {
      const studentID = idOf(portfolio.student)
      const student = typeof portfolio.student === 'object' ? portfolio.student : null
      const profilePhoto = student && typeof student.profilePhoto === 'object' ? student.profilePhoto : null
      const coverImage = typeof portfolio.coverImage === 'object' ? portfolio.coverImage : null
      return {
        id: String(portfolio.id),
        slug: portfolio.slug,
        title: portfolio.title || 'Tanpa Judul',
        isNominee: nomineePortfolioIDs.has(String(portfolio.id)),
        studentID,
        studentName: student?.name || 'Siswa',
        profilePhoto: profilePhoto?.url || null,
        coverImage: coverImage?.url || null,
        likes: likeCounts.get(String(portfolio.id)) || 0,
        comments: commentCounts.get(String(portfolio.id)) || 0,
      }
    })

  const topLikedPortfolios = portfolioRankings
    .filter((portfolio) => portfolio.likes > 0)
    .sort((a, b) => b.likes - a.likes || a.title.localeCompare(b.title, 'id'))
    .slice(0, 10)
  const trendingPortfolios = portfolioRankings
    .filter((portfolio) => portfolio.comments > 0)
    .sort((a, b) => b.comments - a.comments || a.title.localeCompare(b.title, 'id'))
    .slice(0, 10)

  const topOverall = sortTop('score').map((student) => ({ ...student, score: student.likes + student.comments }))
  const portfolioByID = new Map(portfolios.docs.map((portfolio) => [String(portfolio.id), portfolio]))
  type RecordInput = { recordKey: string; student: string; recordType: 'achievement' | 'award'; code: string; title: string; description: string; rank?: number; portfolio?: string; award?: string | number; earnedAt?: string }
  const pending: RecordInput[] = []
  const saveRecord = async (record: RecordInput) => { pending.push(record) }
  const topLiked = topLikedPortfolios[0]
  if (topLiked?.studentID) {
    await saveRecord({
      recordKey: `top-likes:${topLiked.id}`,
      student: topLiked.studentID,
      recordType: 'achievement',
      code: 'top-likes',
      title: 'Karya Paling Disukai',
      description: `${topLiked.title} pernah menjadi karya dengan suka terbanyak.`,
      rank: 1,
      portfolio: topLiked.id,
    })
  }
  const topCommented = trendingPortfolios[0]
  if (topCommented?.studentID) {
    await saveRecord({
      recordKey: `top-comments:${topCommented.id}`,
      student: topCommented.studentID,
      recordType: 'achievement',
      code: 'top-comments',
      title: 'Karya Paling Ramai',
      description: `${topCommented.title} pernah menjadi karya dengan komentar terbanyak.`,
      rank: 1,
      portfolio: topCommented.id,
    })
  }
  for (const [index, student] of topOverall.slice(0, 3).entries()) {
    if (student.score <= 0) continue
    await saveRecord({
      recordKey: `mvs:${student.id}:${index + 1}`,
      student: student.id,
      recordType: 'achievement',
      code: 'mvs',
      title: `Most Valuable Student #${index + 1}`,
      description: `Pernah berada di peringkat ${index + 1} Most Valuable Student.`,
      rank: index + 1,
    })
  }

  for (const award of awards.docs.filter((item) => item.status !== 'draft')) {
    const nominees = Array.isArray(award.nominees) ? award.nominees.map(idOf).filter((id): id is string => Boolean(id)) : []
    for (const portfolioID of nominees) {
      const portfolio = portfolioByID.get(portfolioID)
      const studentID = portfolio ? idOf(portfolio.student) : undefined
      if (!studentID) continue
      await saveRecord({
        recordKey: `award-nominee:${award.id}:${portfolioID}`,
        student: studentID,
        recordType: 'award',
        code: 'award-nominee',
        title: award.title,
        description: `Masuk nominasi penghargaan melalui karya ${portfolio?.title || 'portofolio siswa'}.`,
        portfolio: portfolioID,
        award: award.id,
        earnedAt: award.updatedAt,
      })
    }
    if (award.status !== 'announced') continue
    const results = nominees.map((portfolioID) => {
      const portfolio = portfolioByID.get(portfolioID)
      const studentID = portfolio ? idOf(portfolio.student) : undefined
      if (!studentID) return null
      return { portfolioID, studentID, votes: voteCounts.get(`${award.id}:${portfolioID}`) || 0 }
    })
    const validResults = results.filter((result): result is NonNullable<typeof result> => result !== null)
    const winningVotes = Math.max(0, ...validResults.map((result) => result.votes))
    if (winningVotes === 0) continue
    for (const winner of validResults.filter((result) => result.votes === winningVotes)) {
      await saveRecord({
        recordKey: `award:${award.id}:${winner.studentID}`,
        student: winner.studentID,
        recordType: 'award',
        code: 'award-winner',
        title: award.title,
        description: `Pemenang penghargaan melalui karya ${portfolioByID.get(winner.portfolioID)?.title || 'portofolio siswa'}.`,
        portfolio: winner.portfolioID,
        award: award.id,
        earnedAt: award.updatedAt,
      })
    }
  }

  // Peringkat proyek kolaborasi (suka dan komentar proyek).
  const projectCountsResult = await projectCounts(payload, projectDocs.docs.map((project) => project.id))
  const projectRankings = projectDocs.docs.map((project) => {
    const cover = typeof project.coverImage === 'object' && project.coverImage ? project.coverImage : null
    const members = (Array.isArray(project.members) ? project.members : []).flatMap((entry) => typeof entry.member === 'object' && entry.member ? [{ id: entry.member.id, name: entry.member.name || 'Siswa' }] : [])
    return {
      id: String(project.id), slug: project.slug, title: project.title || 'Tanpa Judul',
      category: typeof project.categoryRef === 'object' && project.categoryRef ? project.categoryRef.name : null,
      coverImage: cover?.url || null, members, likes: projectCountsResult.likes.get(project.id) || 0, comments: projectCountsResult.comments.get(project.id) || 0,
    }
  })
  const topProjects = projectRankings.filter((project) => project.likes > 0).sort((a, b) => b.likes - a.likes || a.title.localeCompare(b.title, 'id')).slice(0, 10)
  const trendingProjects = projectRankings.filter((project) => project.comments > 0).sort((a, b) => b.comments - a.comments || b.likes - a.likes || a.title.localeCompare(b.title, 'id')).slice(0, 10)

  // Simpan pencapaian yang belum ada dalam satu batch: satu query pemeriksaan, lalu hanya yang baru dibuat.
  if (pending.length) {
    const existing = await payload.find({ collection: 'student-records', where: { recordKey: { in: pending.map((record) => record.recordKey) } }, depth: 0, limit: pending.length, pagination: false, overrideAccess: true })
    const known = new Set(existing.docs.map((doc) => doc.recordKey))
    await Promise.all(pending.filter((record) => !known.has(record.recordKey)).map((record) => payload.create({
      collection: 'student-records',
      data: { ...record, student: Number(record.student), portfolio: record.portfolio === undefined ? undefined : Number(record.portfolio), award: record.award === undefined ? undefined : Number(record.award), earnedAt: record.earnedAt || new Date().toISOString() },
      overrideAccess: true,
    }).catch(() => undefined)))  // permintaan bersamaan dapat menemukan pencapaian yang sama; recordKey unik menjaga satu salinan
  }

  return { topProjects, trendingProjects, topLikes: topLikedPortfolios, trending: trendingPortfolios, topOverall }
}

export async function GET() {
  const cache = globalCache.__leaderboard ||= { at: 0 }
  const fresh = cache.data && Date.now() - cache.at < TTL_MS
  if (!fresh && !cache.promise) {
    cache.promise = compute().then((data) => { cache.data = data; cache.at = Date.now(); return data }).finally(() => { cache.promise = undefined })
  }
  // Basi tapi ada: sajikan segera sambil memperbarui di latar; belum ada data: tunggu perhitungan pertama.
  const data = fresh || (cache.data && cache.promise) ? cache.data! : await cache.promise!
  return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' } })
}
