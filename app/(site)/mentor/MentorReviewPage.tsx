'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MentorCardsSkeleton } from '../../../components/SiteSkeletons'

type ReviewItem = {
  kind?: 'portfolio' | 'project'
  id: string | number; title: string; slug: string; summary: string; year?: number; tools?: string[]
  status: string; verificationStatus?: string; student?: { id: string | number; name: string; class?: string; program?: string } | null
  category?: string | null; coverImage?: string | null; projectFile?: { url?: string; mimeType?: string; filename?: string } | null
  review?: { id: string | number; decision: string; feedback: string } | null
  mentorResponse?: 'invited' | 'accepted' | 'declined'; mentorRole?: 'primary' | 'supporting'
}

export default function MentorReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [allowed, setAllowed] = useState(false)
  const [layout, setLayout] = useState<'grid' | 'list'>('list')
  const [page, setPage] = useState(1)
  const pageSize = 6
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize)

  const load = async () => {
    const sessionResponse = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
    if (!sessionResponse.ok) { window.location.assign('/login'); return }
    const session = await sessionResponse.json()
    if (session.user?.role !== 'teacher') { setMessage('Halaman ini khusus Guru pembimbing.'); setLoading(false); return }
    setAllowed(true)
    const response = await fetch('/api/mentor/reviews', { credentials: 'same-origin', cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Daftar karya belum dapat dimuat.')
    const docs: ReviewItem[] = data.docs || []
    setItems(docs)
    setLoading(false)
  }

  useEffect(() => { void load().catch((error) => { setMessage(error instanceof Error ? error.message : 'Karya belum dapat dimuat.'); setLoading(false) }) }, [])
  useEffect(() => { setPage((current) => Math.min(current, Math.max(1, Math.ceil(items.length / pageSize)))) }, [items.length])

  return <main className="mentor-page wrap">
    <header className="mentor-hero"><span className="section-kicker">VERIFIKASI KARYA</span><h1>Bantu karya<br /><span>bertumbuh.</span></h1><p>Tinjau bukti karya siswa, beri umpan balik yang membangun, lalu verifikasi karya yang siap dipublikasikan.</p><Link className="button impact-secondary" href="/portal/guru">Kembali ke dashboard</Link></header>
    {message && <p className="mentor-message" role="status">{message}</p>}
    <div className="mentor-list-heading"><div><span className="section-kicker">TINJAUAN KARYA</span><h2>Undangan dan tinjauan</h2></div>{!loading && <span>{items.length} item</span>}</div>
    {loading ? <MentorCardsSkeleton layout={layout} announce />
      : !allowed ? <div className="empty-state"><h2>Akses dibatasi</h2><p>Masuk dengan akun Guru yang ditetapkan ke kelas atau program keahlian siswa.</p><Link href="/login">Masuk ke akun</Link></div>
        : !items.length ? <div className="empty-state"><h2>Belum ada undangan atau tinjauan</h2><p>Undangan pembimbing proyek dan karya siswa yang perlu ditinjau akan muncul di sini.</p></div>
          : <><div className="mentor-list-tools"><span>Menampilkan {Math.min((page - 1) * pageSize + 1, items.length)}–{Math.min(page * pageSize, items.length)} dari {items.length} karya</span><div className="mentor-list-controls" aria-label="Tampilan daftar verifikasi"><button type="button" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}>Grid</button><button type="button" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>List</button></div></div><div className={`mentor-list is-${layout}`}>{pageItems.map((item) => <article className={`mentor-card${item.coverImage ? '' : ' mentor-card-no-cover'}`} key={item.id}>
            {item.coverImage && <Link href={item.kind === 'project' ? `/proyek/${item.slug}` : `/karya/${item.slug}`}><img className="mentor-cover" src={item.coverImage} alt={`Sampul ${item.title}`} /></Link>}
            <div className="mentor-card-content"><div className="mentor-card-top"><span className="lowfi-badge">{item.kind === 'project' ? item.mentorResponse === 'invited' ? 'UNDANGAN PEMBIMBING' : item.verificationStatus === 'submitted' ? 'MENUNGGU VERIFIKASI' : 'PROYEK BIMBINGAN' : item.verificationStatus === 'revision-requested' ? 'PERLU REVISI' : 'MENUNGGU VERIFIKASI'}</span><span>{item.category || 'Karya siswa'}</span></div>
              <h3>{item.title}</h3><p className="mentor-author">{item.student?.name || 'Siswa'}{item.student?.class ? ` · ${item.student.class}` : ''}{item.student?.program ? ` · ${item.student.program}` : ''}</p><p>{item.summary}</p>
              {item.tools?.length ? <p><strong>Perangkat & teknologi yang digunakan:</strong> {item.tools.join(', ')}</p> : null}
              {item.projectFile?.url && <a className="mentor-evidence" href={item.projectFile.url} target="_blank" rel="noreferrer">Buka bukti: {item.projectFile.filename || 'berkas karya'} ↗</a>}
              {item.review && <div className="mentor-previous-feedback"><strong>Pesan revisi terakhir</strong><p>{item.review.feedback}</p></div>}
              <p className="mentor-detail-link"><Link className="button button-primary" href={item.kind === 'project' ? `/proyek/${item.slug}` : `/karya/${item.slug}`}>{item.kind === 'project' ? 'Buka proyek & tinjauan' : 'Buka detail & riwayat'} ↗</Link></p>
            </div>
          </article>)}</div><div className="mentor-pagination" aria-label="Halaman daftar verifikasi"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Sebelumnya</button><span>Halaman {page} dari {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Berikutnya</button></div></>}
  </main>
}
