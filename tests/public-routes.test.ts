import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GET as feed } from '../app/(payload)/api/community/feed/route'
import { GET as leaderboard } from '../app/(payload)/api/community/leaderboard/route'
import { GET as mentorProfile } from '../app/(payload)/api/community/mentors/[id]/route'
import { GET as workBySlug } from '../app/(payload)/api/community/portfolios/slug/[slug]/route'
import { GET as search } from '../app/(payload)/api/community/search/route'
import { GET as studentProfile } from '../app/(payload)/api/community/students/[id]/route'
import { GET as notifications } from '../app/(payload)/api/portal/notifications/route'
import { as, begin, createPublishedWork, createWorld, makeRequest, params, rollback, type World } from './world'

let w: World
beforeAll(async () => { await begin(); w = await createWorld() })
afterAll(rollback)

type Doc = { id: number; [key: string]: unknown }
let counter = 0
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString()
/** Token unik tanpa angka acak yang bisa bentrok dengan data asli, dipakai untuk pencarian. */
const token = () => `Zq${w.suffix}x${++counter}`
/** Draf pribadi siswa: belum diajukan, jadi belum terlihat guru. `submitForReview` mengajukannya ke antrean guru. */
const draftWork = async (title: string, owner: Doc = w.studentA, submitForReview = false) => (await w.payload.create({
  collection: 'portfolios', depth: 0, ...as(owner), data: { title, summary: 'Ringkasan', categoryRef: w.category.id, submitForReview } as never,
})) as unknown as Doc
const submittedWork = (title: string, owner: Doc = w.studentA) => draftWork(title, owner, true)
const publishedWork = (title: string, owner: Doc = w.studentB) => w.payload.create({
  collection: 'portfolios', depth: 0, overrideAccess: true,
  data: { title, summary: 'Ringkasan', categoryRef: w.category.id, student: owner.id, status: 'published', verificationStatus: 'verified' } as never,
}) as unknown as Promise<Doc>
const json = async (response: Response) => response.json()

describe('Feed beranda (GET /api/community/feed)', () => {
  const getFeed = async (query = '?limit=1000') => json(await feed(makeRequest(`/api/community/feed${query}`)))

  it('memuat karya terbit lengkap dengan jumlah suka dan komentar, tanpa karya draf', async () => {
    const published = await publishedWork(`Feed terbit ${token()}`)
    const draft = await draftWork(`Feed draf ${token()}`)
    await w.payload.create({ collection: 'portfolio-likes', data: { portfolio: published.id } as never, ...as(w.studentA) })
    await w.payload.create({ collection: 'portfolio-comments', data: { portfolio: published.id, content: 'Bagus sekali' } as never, ...as(w.studentA) })
    const body = await getFeed()
    const item = body.portfolios.find((entry: { id: number }) => entry.id === published.id)
    expect(item).toMatchObject({ title: published.title, likes: 1, comments: 1, student: { id: w.studentB.id, name: w.studentB.name } })
    expect(body.portfolios.some((entry: { id: number }) => entry.id === draft.id)).toBe(false)
  })
  it('batas jumlah karya mengikuti ?limit dan nilai tidak valid memakai bawaan', async () => {
    await publishedWork(`Feed batas ${token()}`)
    expect((await getFeed('?limit=1')).portfolios).toHaveLength(1)
    expect((await getFeed('?limit=0')).portfolios).toHaveLength(1)
    expect((await getFeed('?limit=abc')).portfolios.length).toBeLessThanOrEqual(6)
  })
  it('proyek hanya tampil bila sudah terbit', async () => {
    const make = (status: string) => w.payload.create({ collection: 'projects', depth: 0, overrideAccess: true, data: { title: `Feed proyek ${token()}`, summary: 'x', status, members: [{ member: w.studentA.id, contribution: 'Dev' }], createdBy: w.studentA.id } as never }) as unknown as Promise<Doc>
    const published = await make('published')
    const draft = await make('draft')
    const ids = (await getFeed()).projects.map((entry: { id: number }) => entry.id)
    expect(ids).toContain(published.id)
    expect(ids).not.toContain(draft.id)
  })
  it('peluang hanya tampil bila statusnya terbuka', async () => {
    const make = (status: string) => w.payload.create({ collection: 'opportunities', depth: 0, overrideAccess: true, data: { title: `Feed peluang ${token()}`, type: 'other', organizer: 'x', summary: 'x', status } as never }) as unknown as Promise<Doc>
    const [open, draft, closed] = [await make('open'), await make('draft'), await make('closed')]
    const ids = (await getFeed()).opportunities.map((entry: { id: number }) => entry.id)
    expect(ids).toContain(open.id)
    expect(ids).not.toContain(draft.id)
    expect(ids).not.toContain(closed.id)
  })
  it('award hanya tampil bila terbuka dan belum lewat batas penutupan', async () => {
    const work = await publishedWork(`Feed nominasi ${token()}`)
    const make = (extra: Record<string, unknown>) => w.payload.create({ collection: 'awards', depth: 0, overrideAccess: true, data: { title: `Feed award ${token()}`, description: 'x', opensAt: day(-5), closesAt: day(5), status: 'open', nominees: [work.id], ...extra } as never }) as unknown as Promise<Doc>
    const open = await make({})
    const closed = await make({ status: 'closed' })
    const expired = await make({ opensAt: day(-5), closesAt: day(-1) })
    const awards = (await getFeed()).awards as Array<{ id: number; nominees: Array<{ id: number }> }>
    expect(awards.map((entry) => entry.id)).toContain(open.id)
    expect(awards.map((entry) => entry.id)).not.toContain(closed.id)
    expect(awards.map((entry) => entry.id)).not.toContain(expired.id)
    expect(awards.find((entry) => entry.id === open.id)?.nominees.map((nominee) => nominee.id)).toEqual([work.id])
  })
  it('menandai karya yang menjadi nominasi award', async () => {
    const nominee = await publishedWork(`Feed nominee ${token()}`)
    const plain = await publishedWork(`Feed biasa ${token()}`)
    await w.payload.create({ collection: 'awards', depth: 0, overrideAccess: true, data: { title: `Award ${token()}`, description: 'x', opensAt: day(-1), closesAt: day(1), status: 'open', nominees: [nominee.id] } as never })
    const items = (await getFeed()).portfolios as Array<{ id: number; isNominee: boolean }>
    expect(items.find((entry) => entry.id === nominee.id)?.isNominee).toBe(true)
    expect(items.find((entry) => entry.id === plain.id)?.isNominee).toBe(false)
  })
})

describe('Pencarian (GET /api/community/search)', () => {
  const find = async (q: string) => (await json(await search(makeRequest(`/api/community/search?q=${encodeURIComponent(q)}`)))).items as Array<{ type: string; label: string; href: string }>

  it('kata kunci kurang dari 2 karakter menghasilkan daftar kosong', async () => {
    expect(await find('')).toEqual([])
    expect(await find('a')).toEqual([])
    expect(await find('   ')).toEqual([])
  })
  it('menemukan karya terbit berdasarkan judul, tetapi tidak karya draf', async () => {
    const key = token()
    const published = await publishedWork(`Cari terbit ${key}`)
    await draftWork(`Cari draf ${key}`)
    const items = await find(key)
    expect(items.filter((item) => item.type === 'Karya').map((item) => item.label)).toEqual([published.title])
    expect(items[0].href).toBe(`/karya/${published.slug}`)
  })
  it('menemukan proyek terbit, bukan proyek draf', async () => {
    const key = token()
    const make = (status: string) => w.payload.create({ collection: 'projects', depth: 0, overrideAccess: true, data: { title: `Cari proyek ${status} ${key}`, summary: 'x', status, members: [{ member: w.studentA.id, contribution: 'Dev' }], createdBy: w.studentA.id } as never }) as unknown as Promise<Doc>
    await make('draft')
    await make('published')
    const labels = (await find(key)).filter((item) => item.type === 'Proyek kolaborasi').map((item) => item.label)
    expect(labels).toEqual([`Cari proyek published ${key}`])
  })
  it('menemukan peluang dan award yang bukan draf', async () => {
    const key = token()
    const work = await publishedWork(`Nominasi ${key}`)
    for (const status of ['draft', 'open']) {
      await w.payload.create({ collection: 'opportunities', depth: 0, overrideAccess: true, data: { title: `Peluang ${status} ${key}`, type: 'other', organizer: 'x', summary: 'x', status } as never })
      await w.payload.create({ collection: 'awards', depth: 0, overrideAccess: true, data: { title: `Award ${status} ${key}`, description: 'x', opensAt: day(-1), closesAt: day(1), status, nominees: [work.id] } as never })
    }
    const items = await find(key)
    expect(items.filter((item) => item.type === 'Peluang').map((item) => item.label)).toEqual([`Peluang open ${key}`])
    expect(items.filter((item) => item.type === 'Award').map((item) => item.label)).toEqual([`Award open ${key}`])
  })
  it('menemukan profil siswa dan guru menurut nama', async () => {
    const student = await find(String(w.studentA.name))
    expect(student.some((item) => item.type === 'Profil siswa' && item.href === `/siswa/${w.studentA.id}`)).toBe(true)
    const teacher = await find(String(w.teacher.name))
    expect(teacher.some((item) => item.type === 'Profil Guru / Mentor' && item.href === `/guru/${w.teacher.id}`)).toBe(true)
  })
  it('menemukan kelas dan program keahlian', async () => {
    expect((await find(String(w.classroom.name))).some((item) => item.type === 'Kelas')).toBe(true)
    expect((await find(String(w.program.code))).some((item) => item.type === 'Program keahlian')).toBe(true)
  })
  it('kata "leaderboard" mengarah ke halaman peringkat', async () => {
    expect((await find('leaderboard')).some((item) => item.type === 'Leaderboard' && item.href === '/leaderboard')).toBe(true)
  })
  it('hasil dibatasi maksimal 12 item', async () => {
    expect((await find('Siswa')).length).toBeLessThanOrEqual(12)
  })
})

describe('Detail karya (GET /api/community/portfolios/slug/[slug])', () => {
  const get = (slug: string, user?: Doc) => workBySlug(makeRequest(`/api/community/portfolios/slug/${slug}`, { user }), params({ slug }))

  it('karya terbit dapat dilihat publik tanpa umpan balik guru', async () => {
    const work = await createPublishedWork(w, w.studentA, 'Slug terbit')
    await w.payload.update({ collection: 'portfolios', id: work.id, data: { reviewFeedback: 'Catatan privat' }, overrideAccess: true })
    const response = await get(String(work.slug))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ id: work.id, accessLevel: 'public', reviewFeedback: null, reviewHistory: [], student: { id: w.studentA.id } })
  })
  it('draf tidak ditemukan (404) bagi pengunjung, siswa lain, dan guru dari program lain', async () => {
    const work = await draftWork(`Slug draf ${token()}`)
    for (const user of [undefined, w.studentB, w.outsiderTeacher]) expect((await get(String(work.slug), user)).status).toBe(404)
  })
  it('pemilik melihat drafnya beserta umpan balik dan riwayat tinjauan', async () => {
    const work = await submittedWork(`Slug pemilik ${token()}`)
    await w.payload.create({ collection: 'portfolio-reviews', ...as(w.teacher), data: { portfolio: work.id, decision: 'revision-requested', feedback: 'Perbaiki lagi' } as never })
    const response = await get(String(work.slug), w.studentA)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ accessLevel: 'owner', reviewFeedback: 'Perbaiki lagi' })
    expect(body.reviewHistory[0]).toMatchObject({ decision: 'revision-requested', feedback: 'Perbaiki lagi' })
  })
  it('guru sekelas/seprogram dapat melihat karya yang sudah diajukan sebagai mentor', async () => {
    const work = await submittedWork(`Slug mentor ${token()}`)
    const response = await get(String(work.slug), w.teacher)
    expect(response.status).toBe(200)
    expect((await response.json()).accessLevel).toBe('mentor')
  })
  it('draf yang belum diajukan bersifat pribadi: guru mendapat 404, pemilik tetap bisa membuka', async () => {
    const work = await draftWork(`Slug pribadi ${token()}`)
    expect((await get(String(work.slug), w.teacher)).status).toBe(404)
    expect((await get(String(work.slug), w.studentA)).status).toBe(200)
  })
  it('slug yang tidak ada → 404', async () => {
    expect((await get(`tidak-ada-${token().toLowerCase()}`)).status).toBe(404)
  })
})

describe('Profil siswa dan guru', () => {
  it('profil siswa memuat total suka/komentar dan karya terbit saja', async () => {
    const published = await publishedWork(`Profil terbit ${token()}`, w.studentC)
    await draftWork(`Profil draf ${token()}`, w.studentC)
    await w.payload.create({ collection: 'portfolio-likes', data: { portfolio: published.id } as never, ...as(w.studentA) })
    await w.payload.create({ collection: 'portfolio-comments', data: { portfolio: published.id, content: 'Mantap' } as never, ...as(w.studentB) })
    const response = await studentProfile(makeRequest('/'), params({ id: String(w.studentC.id) }))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.student).toMatchObject({ id: w.studentC.id, name: w.studentC.name })
    expect(body.portfolios.map((item: { id: number }) => item.id)).toEqual([published.id])
    expect(body.totals).toEqual({ likes: 1, comments: 1, portfolios: 1 })
  })
  it('profil siswa → 404 untuk akun guru atau ID yang tidak ada', async () => {
    expect((await studentProfile(makeRequest('/'), params({ id: String(w.teacher.id) }))).status).toBe(404)
    expect((await studentProfile(makeRequest('/'), params({ id: '99999999' }))).status).toBe(404)
    expect((await studentProfile(makeRequest('/'), params({ id: 'abc' }))).status).toBe(404)
  })
  it('profil guru memuat jumlah tinjauan dan karya yang ia verifikasi', async () => {
    const profile = async () => (await mentorProfile(makeRequest('/'), params({ id: String(w.teacher.id) }))).json()
    const before = await profile()
    const work = await submittedWork(`Profil guru ${token()}`)
    await w.payload.create({ collection: 'portfolio-reviews', ...as(w.teacher), data: { portfolio: work.id, decision: 'verified', feedback: 'Disetujui guru' } as never })
    const body = await profile()
    expect(body.mentor).toMatchObject({ id: w.teacher.id, name: w.teacher.name })
    // Dibandingkan dengan kondisi awal karena test lain di file ini juga membuat tinjauan atas nama guru yang sama.
    expect(body.impact.reviews).toBe(before.impact.reviews + 1)
    expect(body.impact.verified).toBe(before.impact.verified + 1)
    expect(body.impact.works).toBe(before.impact.works + 1)
    expect(body.works.map((item: { id: number }) => item.id)).toContain(work.id)
  })
  it('profil guru → 404 untuk akun siswa', async () => {
    expect((await mentorProfile(makeRequest('/'), params({ id: String(w.studentA.id) }))).status).toBe(404)
  })
})

describe('Leaderboard (GET /api/community/leaderboard)', () => {
  // Daftar peringkat dipotong 10 teratas dari seluruh data asli, jadi isinya tidak bisa diprediksi: yang dicek bentuk dan urutannya.
  it('merespons 200 dengan tiga peringkat yang terurut menurun', async () => {
    const work = await publishedWork(`Leaderboard ${token()}`, w.studentC)
    await w.payload.create({ collection: 'portfolio-likes', data: { portfolio: work.id } as never, ...as(w.studentA) })
    const response = await leaderboard()
    expect(response.status).toBe(200)
    const body = await response.json()
    for (const key of ['topLikes', 'trending', 'topOverall']) {
      expect(Array.isArray(body[key])).toBe(true)
      expect(body[key].length).toBeLessThanOrEqual(10)
    }
    const likes = body.topLikes.map((item: { likes: number }) => item.likes)
    expect(likes).toEqual([...likes].sort((a: number, b: number) => b - a))
    const scores = body.topOverall.map((item: { score: number }) => item.score)
    expect(scores).toEqual([...scores].sort((a: number, b: number) => b - a))
    expect(body.topLikes.every((item: { likes: number }) => item.likes > 0)).toBe(true)
  })
})

describe('Notifikasi portal (GET /api/portal/notifications)', () => {
  const get = (user?: Doc) => notifications(makeRequest('/api/portal/notifications', { user }))
  const titles = async (user: Doc) => ((await json(await get(user))).notifications as Array<{ title: string; message: string }>)

  it('tanpa sesi → 401', async () => { expect((await get(undefined)).status).toBe(401) })

  it('pemilik karya menerima notifikasi komentar dan suka dari siswa lain, bukan dari dirinya sendiri', async () => {
    const work = await publishedWork(`Notif karya ${token()}`, w.studentA)
    await w.payload.create({ collection: 'portfolio-comments', data: { portfolio: work.id, content: 'Komentar dari B' } as never, ...as(w.studentB) })
    await w.payload.create({ collection: 'portfolio-comments', data: { portfolio: work.id, content: 'Balasan sendiri' } as never, ...as(w.studentA) })
    await w.payload.create({ collection: 'portfolio-likes', data: { portfolio: work.id } as never, ...as(w.studentB) })
    const items = await titles(w.studentA)
    expect(items.some((item) => item.title === 'Komentar baru pada karyamu' && item.message.includes('Komentar dari B'))).toBe(true)
    expect(items.some((item) => item.message.includes('Balasan sendiri'))).toBe(false)
    expect(items.some((item) => item.title === 'Seseorang menyukai karyamu' && item.message.includes(String(w.studentB.name)))).toBe(true)
  })
  it('siswa diberi tahu bila karyanya perlu direvisi', async () => {
    const work = await submittedWork(`Notif revisi ${token()}`, w.studentA)
    await w.payload.create({ collection: 'portfolio-reviews', ...as(w.teacher), data: { portfolio: work.id, decision: 'revision-requested', feedback: 'Tambahkan dokumentasi' } as never })
    const items = await titles(w.studentA)
    expect(items.some((item) => item.title === 'Karya perlu direvisi' && item.message.includes('Tambahkan dokumentasi'))).toBe(true)
  })
  it('siswa diberi tahu saat guru menjawab undangan pembimbing', async () => {
    const project = await w.payload.create({ collection: 'projects', depth: 0, ...as(w.studentA), data: { title: `Notif proyek ${token()}`, summary: 'x', members: [{ member: w.studentA.id, contribution: 'Dev' }], mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary' }] } as never }) as unknown as Doc
    await w.payload.update({ collection: 'projects', id: project.id, overrideAccess: true, data: { mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary', response: 'accepted' }] } as never })
    expect((await titles(w.studentA)).some((item) => item.title === 'Undangan pembimbing diterima' && item.message.includes(String(project.title)))).toBe(true)
  })
  it('siswa diberi pengingat untuk peluang dan voting yang segera ditutup', async () => {
    const opportunity = await w.payload.create({ collection: 'opportunities', depth: 0, overrideAccess: true, data: { title: `Notif peluang ${token()}`, type: 'other', organizer: 'x', summary: 'x', status: 'open', deadline: day(3) } as never }) as unknown as Doc
    const work = await publishedWork(`Notif nominasi ${token()}`)
    const award = await w.payload.create({ collection: 'awards', depth: 0, overrideAccess: true, data: { title: `Notif award ${token()}`, description: 'x', opensAt: day(-1), closesAt: day(2), status: 'open', nominees: [work.id] } as never }) as unknown as Doc
    const items = await titles(w.studentA)
    expect(items.some((item) => item.title === 'Batas peluang semakin dekat' && item.message.includes(String(opportunity.title)))).toBe(true)
    expect(items.some((item) => item.title === 'Voting penghargaan segera ditutup' && item.message.includes(String(award.title)))).toBe(true)
  })
  it('guru menerima notifikasi karya menunggu verifikasi hanya dari siswa di cakupannya', async () => {
    const mine = await submittedWork(`Notif antre ${token()}`, w.studentA)
    const other = await submittedWork(`Notif antre luar ${token()}`, w.studentC)
    const privateDraft = await draftWork(`Notif draf pribadi ${token()}`, w.studentA)
    const items = await titles(w.teacher)
    expect(items.some((item) => item.message.includes(String(privateDraft.title)))).toBe(false)
    expect(items.some((item) => item.title === 'Karya menunggu verifikasi' && item.message.includes(String(mine.title)))).toBe(true)
    expect(items.some((item) => item.message.includes(String(other.title)))).toBe(false)
  })
  it('guru menerima undangan pembimbing proyek', async () => {
    const project = await w.payload.create({ collection: 'projects', depth: 0, ...as(w.studentA), data: { title: `Notif undangan ${token()}`, summary: 'x', members: [{ member: w.studentA.id, contribution: 'Dev' }], mentorAssignments: [{ mentor: w.teacher.id, assignmentRole: 'primary' }] } as never }) as unknown as Doc
    expect((await titles(w.teacher)).some((item) => item.title === 'Undangan menjadi pembimbing' && item.message.includes(String(project.title)))).toBe(true)
  })
  it('guru menerima notifikasi saat siswa di cakupannya tertarik pada peluang', async () => {
    const opportunity = await w.payload.create({ collection: 'opportunities', depth: 0, overrideAccess: true, data: { title: `Notif minat ${token()}`, type: 'other', organizer: 'x', summary: 'x', status: 'open' } as never }) as unknown as Doc
    await w.payload.create({ collection: 'opportunity-interests', data: { opportunity: opportunity.id } as never, ...as(w.studentA) })
    expect((await titles(w.teacher)).some((item) => item.title === 'Siswa tertarik pada peluang' && item.message.includes(String(opportunity.title)))).toBe(true)
    expect((await titles(w.outsiderTeacher)).some((item) => item.message.includes(String(opportunity.title)))).toBe(false)
  })
})
