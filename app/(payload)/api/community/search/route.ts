import config from '@payload-config'
import { getPayload } from 'payload'
import { NextResponse } from 'next/server'

type SearchItem = { type: string; label: string; detail: string; href: string }

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() || ''
  if (query.length < 2) return NextResponse.json({ items: [] })

  const payload = await getPayload({ config })
  const contains = { contains: query }
  const [works, students, classes, programs, categories, awards] = await Promise.all([
    payload.find({ collection: 'portfolios', where: { and: [{ status: { equals: 'published' } }, { title: contains }] }, depth: 1, limit: 4, overrideAccess: true }),
    payload.find({ collection: 'users', where: { and: [{ role: { equals: 'student' } }, { name: contains }] }, depth: 1, limit: 4, overrideAccess: true }),
    payload.find({ collection: 'classes', where: { name: contains }, depth: 1, limit: 3, overrideAccess: true }),
    payload.find({ collection: 'programs', where: { or: [{ name: contains }, { code: contains }] }, depth: 0, limit: 3, overrideAccess: true }),
    payload.find({ collection: 'portfolio-categories', where: { or: [{ name: contains }, { code: contains }] }, depth: 0, limit: 3, overrideAccess: true }),
    payload.find({ collection: 'awards', where: { and: [{ status: { not_equals: 'draft' } }, { title: contains }] }, depth: 0, limit: 3, overrideAccess: true }),
  ])

  const items: SearchItem[] = [
    ...students.docs.map((student) => ({ type: 'Profil siswa', label: student.name, detail: 'Siswa', href: `/siswa/${student.id}` })),
    ...works.docs.map((work) => ({ type: 'Karya', label: work.title, detail: typeof work.student === 'object' ? work.student.name || 'Siswa' : 'Portofolio siswa', href: `/karya/${work.slug}` })),
    ...classes.docs.map((item) => ({ type: 'Kelas', label: item.name, detail: 'Lihat karya siswa di kelas ini', href: `/karya?kelas=${item.id}` })),
    ...programs.docs.map((item) => ({ type: 'Program keahlian', label: item.name, detail: item.code, href: `/karya?program=${item.id}` })),
    ...categories.docs.map((item) => ({ type: 'Kategori karya', label: item.name, detail: item.code, href: `/karya?kategori=${item.id}` })),
    ...awards.docs.map((item) => ({ type: 'Award', label: item.title, detail: 'Penghargaan siswa', href: `/awards?q=${encodeURIComponent(item.title)}` })),
  ]
  const lowerQuery = query.toLocaleLowerCase('id')
  if (['leaderboard', 'peringkat', 'mvs', 'top likes', 'trending'].some((term) => term.includes(lowerQuery) || lowerQuery.includes(term))) {
    items.push({ type: 'Leaderboard', label: 'Peringkat komunitas', detail: 'Top Likes, Trending, dan Most Valuable Student', href: '/leaderboard' })
  }

  return NextResponse.json({ items: items.slice(0, 12) }, { headers: { 'Cache-Control': 'no-store' } })
}
