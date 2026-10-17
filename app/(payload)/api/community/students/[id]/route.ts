import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'
import { appearanceFromUser } from '../../../../../../lib/appearanceFromUser'
import { authenticateWebsiteRequest } from '../../../../../../lib/websiteAuth'
import { projectCounts } from '../../../../../../lib/projectSocial'
import { awardVoteCounts, groupCount } from '../../../../../../lib/dbCounts'
import { workState } from '../../../../../../lib/workState'

const idOf = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return undefined
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  try {
    const [student, viewer] = await Promise.all([
      payload.findByID({ collection: 'users', id, depth: 1, overrideAccess: true }),
      authenticateWebsiteRequest(payload, request),
    ])
    if (student.role !== 'student') return NextResponse.json({ message: 'Profil siswa tidak ditemukan.' }, { status: 404 })
    // Draf hanya terlihat oleh pemilik profil.
    const isOwner = Boolean(viewer && (viewer as { role?: string }).role === 'student' && String(viewer.id) === String(student.id))
    const [draftWorksResponse, draftProjectsResponse] = isOwner ? await Promise.all([
      payload.find({ collection: 'portfolios', where: { and: [{ student: { equals: student.id } }, { status: { not_equals: 'published' } }] }, depth: 1, limit: 200, sort: '-updatedAt', overrideAccess: true, pagination: false }),
      payload.find({ collection: 'projects', where: { and: [{ createdBy: { equals: student.id } }, { status: { not_equals: 'published' } }] }, depth: 1, limit: 200, sort: '-updatedAt', overrideAccess: true, pagination: false }),
    ]) : [null, null]
    const [portfoliosResponse, projectsResponse, awardResponse, voteCounts, likeTotals, commentTotals, recordsResponse] = await Promise.all([payload.find({
      collection: 'portfolios',
      where: { and: [{ student: { equals: student.id } }, { status: { equals: 'published' } }] },
      depth: 2,
      limit: 1000,
      sort: '-createdAt',
      overrideAccess: true, pagination: false }), payload.find({
      collection: 'projects',
      where: { and: [{ 'members.member': { equals: student.id } }, { status: { equals: 'published' } }] },
      depth: 2,
      limit: 1000,
      sort: '-createdAt',
      overrideAccess: true, pagination: false }),
    // Dibaca bersamaan dengan karya/proyek: penghargaan (ID saja), suara, agregat suka/komentar, dan rekam jejak.
    payload.find({ collection: 'awards', where: { status: { not_equals: 'draft' } }, depth: 0, limit: 1000, overrideAccess: true, pagination: false }),
    awardVoteCounts(payload),
    groupCount(payload, 'portfolio_likes', 'portfolio_id'),
    groupCount(payload, 'portfolio_comments', 'portfolio_id'),
    payload.find({ collection: 'student-records', where: { student: { equals: student.id } }, depth: 1, limit: 1000, sort: '-earnedAt', overrideAccess: true, pagination: false }),
    ])
    const portfolios = portfoliosResponse.docs.map((portfolio) => {
      const author = typeof portfolio.student === 'object' ? portfolio.student : null
      const category = typeof portfolio.categoryRef === 'object' ? portfolio.categoryRef : null
      const cover = typeof portfolio.coverImage === 'object' ? portfolio.coverImage : null
      return {
        id: portfolio.id,
        slug: portfolio.slug,
        title: portfolio.title,
        summary: portfolio.summary,
        year: portfolio.year,
        verificationStatus: portfolio.verificationStatus || 'unreviewed',
        projectUrl: portfolio.projectUrl,
        tools: portfolio.tools,
        categoryRef: category ? { name: category.name, code: category.code } : null,
        coverImage: cover ? { url: cover.url, alt: cover.alt } : null,
        student: author ? { id: author.id, name: author.name } : null,
        likeCount: likeTotals.get(Number(portfolio.id)) || 0,
        commentCount: commentTotals.get(Number(portfolio.id)) || 0,
      }
    })

    const ownPortfolioIds = new Set(portfolios.map((portfolio) => String(portfolio.id)))
    const nomineeAwards: { id: string | number; title: string; portfolio: string }[] = []
    const winningAwards: { id: string | number; title: string }[] = []

    for (const award of awardResponse.docs) {
      const nominees = Array.isArray(award.nominees) ? award.nominees : []
      const ownNominees = nominees.filter((nominee) => ownPortfolioIds.has(String(idOf(nominee))))
      ownNominees.forEach((nominee) => nomineeAwards.push({ id: award.id, title: award.title, portfolio: String(idOf(nominee)) }))
      if (award.status !== 'announced' || nominees.length === 0) continue

      const voteTotals = nominees.map((nominee) => {
        const portfolioID = idOf(nominee)
        return { portfolioID: portfolioID || '', votes: portfolioID ? voteCounts.get(`${award.id}:${portfolioID}`) || 0 : 0 }
      })
      const maxVotes = Math.max(...voteTotals.map((entry) => entry.votes))
      if (maxVotes > 0 && voteTotals.some((entry) => entry.votes === maxVotes && ownPortfolioIds.has(entry.portfolioID))) {
        winningAwards.push({ id: award.id, title: award.title })
      }
    }
    const nomineePortfolioIDs = new Set(nomineeAwards.map((award) => award.portfolio))
    const portfoliosWithNomineeStatus = portfolios.map((portfolio) => ({
      ...portfolio,
      isNominee: nomineePortfolioIDs.has(String(portfolio.id)),
    }))

    const projectStats = await projectCounts(payload, projectsResponse.docs.map((project) => project.id))
    const projects = projectsResponse.docs.map((project) => ({
      likes: projectStats.likes.get(project.id) || 0,
      comments: projectStats.comments.get(project.id) || 0,
      id: project.id,
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      year: project.year,
      coverImage: typeof project.coverImage === 'object' && project.coverImage ? { url: project.coverImage.url, alt: project.coverImage.alt } : null,
      category: typeof project.categoryRef === 'object' && project.categoryRef ? project.categoryRef.name : null,
      members: Array.isArray(project.members) ? project.members.map((entry) => ({
        id: typeof entry.member === 'object' && entry.member ? entry.member.id : entry.member,
        name: typeof entry.member === 'object' && entry.member ? entry.member.name : 'Siswa',
        contribution: entry.contribution,
      })) : [],
    }))

    const totalLikes = portfolios.reduce((sum, portfolio) => sum + portfolio.likeCount, 0)
    const totalComments = portfolios.reduce((sum, portfolio) => sum + portfolio.commentCount, 0)
    const badges = portfolios.flatMap((portfolio) => [
      ...(portfolio.likeCount > 50 ? [{ id: `likes-${portfolio.id}`, name: 'Api Menyala', description: 'Satu karya menembus 50 suka.', portfolio: portfolio.title }] : []),
      ...(portfolio.likeCount > 200 ? [{ id: `likes-200-${portfolio.id}`, name: 'Orbit Komunitas', description: 'Satu karya menembus 200 suka.', portfolio: portfolio.title }] : []),
      ...(portfolio.commentCount > 25 ? [{ id: `comments-${portfolio.id}`, name: 'Pemantik Diskusi', description: 'Satu karya memicu lebih dari 25 komentar.', portfolio: portfolio.title }] : []),
    ])
    const records = recordsResponse.docs.map((record) => ({
      id: record.id,
      recordType: record.recordType,
      code: record.code,
      title: record.title,
      description: record.description || '',
      rank: record.rank || null,
      earnedAt: record.earnedAt,
      portfolio: typeof record.portfolio === 'object' && record.portfolio ? { id: record.portfolio.id, title: record.portfolio.title } : null,
      award: typeof record.award === 'object' && record.award ? { id: record.award.id, title: record.award.title } : null,
    }))

    // Relasi: rekan satu proyek, lalu siswa lain di jurusan yang sama (yang paling aktif berkarya lebih dulu).
    const photoOf = (user: { profilePhoto?: unknown }) => user.profilePhoto && typeof user.profilePhoto === 'object' ? (user.profilePhoto as { url?: string }).url || null : null
    const teamMap = new Map<string, { id: string | number; name: string; photo: string | null; projects: string[] }>()
    for (const project of projectsResponse.docs) {
      for (const entry of Array.isArray(project.members) ? project.members : []) {
        const member = typeof entry.member === 'object' && entry.member ? entry.member : null
        if (!member || String(member.id) === String(student.id)) continue
        const existing = teamMap.get(String(member.id)) || { id: member.id, name: member.name || 'Siswa', photo: photoOf(member), projects: [] }
        existing.projects.push(project.title)
        teamMap.set(String(member.id), existing)
      }
    }
    const team = [...teamMap.values()].sort((a, b) => b.projects.length - a.projects.length).slice(0, 6).map((member) => ({
      id: member.id, name: member.name, photo: member.photo,
      subtitle: member.projects.length > 1 ? `${member.projects[0]} +${member.projects.length - 1} proyek` : member.projects[0],
      badge: `${member.projects.length} proyek`,
    }))
    const programID = typeof student.program === 'object' && student.program ? student.program.id : student.program
    const classID = typeof student.class === 'object' && student.class ? student.class.id : student.class
    let programPeers: { id: string | number; name: string; photo: string | null; subtitle: string | null; badge: string }[] = []
    if (programID) {
      const peers = await payload.find({ collection: 'users', where: { and: [{ role: { equals: 'student' } }, { program: { equals: programID } }, { id: { not_equals: student.id } }] }, depth: 1, limit: 80, overrideAccess: true, pagination: false })
      const candidates = peers.docs.filter((peer) => !teamMap.has(String(peer.id)))
      const counts = new Map<string, number>()
      if (candidates.length) {
        const peerWorks = await payload.find({ collection: 'portfolios', where: { and: [{ student: { in: candidates.map((peer) => peer.id) } }, { status: { equals: 'published' } }] }, depth: 0, limit: 2000, pagination: false, overrideAccess: true })
        for (const work of peerWorks.docs) { const key = String(idOf(work.student)); counts.set(key, (counts.get(key) || 0) + 1) }
      }
      programPeers = candidates
        .map((peer) => ({ peer, works: counts.get(String(peer.id)) || 0, sameClass: Boolean(classID) && String(idOf(peer.class)) === String(classID) }))
        .sort((a, b) => b.works - a.works || Number(b.sameClass) - Number(a.sameClass) || String(a.peer.name).localeCompare(String(b.peer.name), 'id'))
        .slice(0, 6)
        .map(({ peer, works, sameClass }) => ({ id: peer.id, name: peer.name || 'Siswa', photo: photoOf(peer), subtitle: typeof peer.class === 'object' && peer.class ? `${peer.class.name}${sameClass ? ' · sekelas' : ''}` : null, badge: `${works} karya` }))
    }

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        bio: student.bio || null,
        interests: student.interests || [],
        skills: student.skills || [],
        experiences: student.experiences || [],
        profilePhoto: typeof student.profilePhoto === 'object' ? student.profilePhoto?.url || null : null,
        class: typeof student.class === 'object' ? student.class?.name || null : null,
        program: typeof student.program === 'object' ? student.program?.name || null : null,
        appearance: appearanceFromUser(student),
      },
      pinnedWorks: (Array.isArray(student.pinnedWorks) ? (student.pinnedWorks as unknown[]).map(Number) : []).filter((id) => portfolios.some((portfolio) => Number(portfolio.id) === id)).slice(0, 3),
      related: { team, programName: typeof student.program === 'object' && student.program ? student.program.name || null : null, program: programPeers },
      isOwner,
      drafts: {
        works: (draftWorksResponse?.docs || []).map((work) => ({
          id: work.id, slug: work.slug, title: work.title, summary: work.summary || '', year: work.year,
          state: workState(work),
          category: typeof work.categoryRef === 'object' && work.categoryRef ? work.categoryRef.name : null,
          coverImage: typeof work.coverImage === 'object' && work.coverImage ? { url: work.coverImage.url, alt: work.coverImage.alt } : null,
        })),
        projects: (draftProjectsResponse?.docs || []).map((project) => ({
          id: project.id, slug: project.slug, title: project.title, summary: project.summary || '', year: project.year,
          state: workState(project),
          category: typeof project.categoryRef === 'object' && project.categoryRef ? project.categoryRef.name : null,
          coverImage: typeof project.coverImage === 'object' && project.coverImage ? { url: project.coverImage.url, alt: project.coverImage.alt } : null,
        })),
      },
      totals: { likes: totalLikes, comments: totalComments, portfolios: portfolios.length },
      portfolios: portfoliosWithNomineeStatus,
      projects,
      nomineeAwards,
      winningAwards,
      badges,
      records,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'Profil siswa tidak ditemukan.' }, { status: 404 })
  }
}
