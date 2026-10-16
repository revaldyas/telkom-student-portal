'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { siteFetch } from '../../../../../lib/siteFetch'
import { MentorCardsSkeleton } from '../../../../../components/SiteSkeletons'

type Opportunity = { id: string | number; title: string; type?: string | null; organizer?: string | null; status: string; summary?: string; requirements?: string; opensAt?: string; deadline?: string; url?: string; contact?: string; targetPrograms?: Array<{ id: string | number; name?: string } | string | number> }
type Program = { id: string | number; name: string }
type Interest = { id: string | number; note: string; status: string; createdAt: string; opportunity: { id: string | number; title: string; organizer: string }; student: { id: string | number; name: string; class?: string | null; program?: string | null; profilePhoto?: string | null } }

export default function OpportunityManagementPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [interests, setInterests] = useState<Interest[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Opportunity | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [message, setMessage] = useState('')
  const [layout, setLayout] = useState<'grid' | 'list'>('list')
  const [page, setPage] = useState(1)
  const pageSize = 6
  const pageCount = Math.max(1, Math.ceil(opportunities.length / pageSize))
  const pageOpportunities = opportunities.slice((page - 1) * pageSize, page * pageSize)

  const load = async () => {
    const sessionResponse = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
    if (!sessionResponse.ok) { window.location.assign('/login'); return }
    const session = await sessionResponse.json()
    if (session.user?.role !== 'teacher') { setMessage('Halaman ini khusus Guru pembimbing.'); setLoading(false); return }
    setAllowed(true)
    const [opportunityResponse, programResponse, interestResponse] = await Promise.all([
      siteFetch('/api/opportunities?depth=0&limit=100&sort=-createdAt', { cache: 'no-store' }),
      fetch('/api/programs?limit=100&sort=name', { cache: 'no-store' }),
      fetch('/api/mentor/interests', { credentials: 'same-origin', cache: 'no-store' }),
    ])
    if (opportunityResponse.ok) setOpportunities((await opportunityResponse.json()).docs || [])
    if (programResponse.ok) setPrograms((await programResponse.json()).docs || [])
    if (interestResponse.ok) setInterests((await interestResponse.json()).docs || [])
    setLoading(false)
  }

  useEffect(() => { void load().catch((error) => { setMessage(error instanceof Error ? error.message : 'Data peluang belum dapat dimuat.'); setLoading(false) }) }, [])
  useEffect(() => { setPage((current) => Math.min(current, Math.max(1, Math.ceil(opportunities.length / pageSize)))) }, [opportunities.length])

  async function saveOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage('')
    // Tombol yang ditekan menentukan niat: "draft" menyimpan saja, "publish" membuka pendaftaran, "save" menyimpan peluang yang sudah berjalan.
    const intent = ((event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value || 'save'
    const form = new FormData(event.currentTarget)
    const status = intent === 'publish' ? 'open' : intent === 'draft' ? 'draft' : editing?.status || 'open'
    if (status !== 'draft' && (!String(form.get('organizer') || '').trim() || !String(form.get('summary') || '').trim())) {
      setMessage('Untuk menerbitkan, lengkapi penyelenggara dan deskripsi. Atau simpan sebagai draf dulu.')
      return
    }
    setBusy(true)
    const data: Record<string, unknown> = Object.fromEntries([...form.entries()].filter(([key, value]) => key !== 'targetPrograms' && value !== ''))
    // ID relasi di database berupa angka; nilai <option> selalu string dan akan ditolak validasi bila dikirim apa adanya.
    data.targetPrograms = form.getAll('targetPrograms').map((value) => programs.find((program) => String(program.id) === value.toString())?.id).filter((id) => id !== undefined)
    try {
      const response = await siteFetch(editing ? `/api/opportunities/${editing.id}` : '/api/opportunities', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, status }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Peluang belum berhasil disimpan.')
      if (status === 'draft') {
        // Draf: formulir tetap terbuka agar pengisian bisa diteruskan.
        setMessage('Draf peluang tersimpan. Terbitkan saat sudah siap.')
        setEditing(result.doc || null); setFormOpen(true)
      } else {
        setMessage(editing && editing.status !== 'draft' ? 'Peluang berhasil diperbarui.' : 'Peluang berhasil diterbitkan.')
        setFormOpen(false); setEditing(null)
      }
      setPage(1)
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Peluang belum berhasil disimpan.') }
    finally { setBusy(false) }
  }

  async function changeStatus(opportunity: Opportunity, status: 'open' | 'closed', success: string) {
    setBusy(true); setMessage('')
    try {
      const response = await siteFetch(`/api/opportunities/${opportunity.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Status peluang belum berhasil diperbarui.')
      setMessage(success); await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Status peluang belum berhasil diperbarui.') }
    finally { setBusy(false) }
  }
  const closeOpportunity = (opportunity: Opportunity) => changeStatus(opportunity, 'closed', 'Pendaftaran peluang ditutup.')
  const publishOpportunity = (opportunity: Opportunity) => changeStatus(opportunity, 'open', 'Peluang diterbitkan.')

  async function updateInterest(interest: Interest, status: string) {
    try {
      const response = await fetch('/api/mentor/interests', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: interest.id, status }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Status minat belum berhasil diperbarui.')
      setInterests((current) => current.map((item) => item.id === interest.id ? { ...item, status } : item))
      setMessage('Status tindak lanjut siswa berhasil diperbarui.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Status minat belum berhasil diperbarui.') }
  }

  return <main className="mentor-page wrap">
    <header className="mentor-hero"><span className="section-kicker">PELUANG & KOLABORASI</span><h1>Buka jalan<br /><span>untuk siswa.</span></h1><p>Bagikan kompetisi, pameran, mentoring, dan kesempatan kolaborasi yang relevan untuk siswa.</p><Link className="button impact-secondary" href="/peluang">Lihat halaman publik</Link></header>
    {message && <p className="mentor-message" role="status">{message}</p>}
    {loading ? <MentorCardsSkeleton layout={layout} announce /> : !allowed ? <div className="empty-state"><h2>Akses dibatasi</h2><p>Masuk dengan akun Guru untuk mengelola peluang siswa.</p><Link href="/login">Masuk ke akun</Link></div> : <>
      <section className="mentor-opportunities">
        <div className="mentor-list-heading"><div><span className="section-kicker">KESEMPATAN SISWA</span><h2>Peluang siswa</h2></div><button className="button button-primary" type="button" onClick={() => { setEditing(null); setFormOpen((value) => !value) }}>{formOpen ? 'Tutup form' : 'Tambah peluang'}</button></div>
        {formOpen && <form key={editing?.id || 'new'} className="project-form mentor-opportunity-form" onSubmit={saveOpportunity}>
          <h3>{editing ? 'Edit informasi peluang' : 'Informasi peluang'}</h3><label htmlFor="opportunity-title">NAMA PELUANG</label><input id="opportunity-title" name="title" required defaultValue={editing?.title || ''} />
          <label htmlFor="opportunity-type">JENIS</label><select id="opportunity-type" name="type" defaultValue={editing?.type || 'competition'}><option value="competition">Kompetisi</option><option value="exhibition">Pameran</option><option value="challenge">Tantangan proyek</option><option value="mentoring">Mentoring</option><option value="collaboration">Kolaborasi industri</option><option value="other">Lainnya</option></select>
          <label htmlFor="opportunity-organizer">PENYELENGGARA</label><input id="opportunity-organizer" name="organizer" defaultValue={editing?.organizer || ''} />
          <label htmlFor="opportunity-summary">DESKRIPSI</label><textarea id="opportunity-summary" name="summary" defaultValue={editing?.summary || ''} />
          <label htmlFor="opportunity-requirements">SYARAT DAN INFORMASI</label><textarea id="opportunity-requirements" name="requirements" defaultValue={editing?.requirements || ''} />
          <label htmlFor="opportunity-opens">TANGGAL MULAI</label><input id="opportunity-opens" name="opensAt" type="date" defaultValue={editing?.opensAt?.slice(0, 10) || ''} />
          <label htmlFor="opportunity-deadline">BATAS PENDAFTARAN</label><input id="opportunity-deadline" name="deadline" type="date" defaultValue={editing?.deadline?.slice(0, 10) || ''} />
          <label htmlFor="opportunity-url">TAUTAN INFORMASI/PENDAFTARAN</label><input id="opportunity-url" name="url" type="url" defaultValue={editing?.url || ''} />
          <label htmlFor="opportunity-contact">KONTAK</label><input id="opportunity-contact" name="contact" defaultValue={editing?.contact || ''} />
          <label htmlFor="opportunity-programs">PROGRAM KEAHLIAN SASARAN</label><select id="opportunity-programs" name="targetPrograms" multiple defaultValue={editing?.targetPrograms?.map((program) => String(typeof program === 'object' ? program.id : program)) || []}><option value="" disabled>Pilih satu atau beberapa program; kosongkan untuk semua program.</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select>
          {!editing || editing.status === 'draft'
            ? <div className="portfolio-form-actions"><button className="button impact-secondary" type="submit" name="intent" value="draft" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan draf'}</button><button className="button button-primary" type="submit" name="intent" value="publish" disabled={busy}>{busy ? 'Menyimpan…' : 'Terbitkan peluang'}</button></div>
            : <button className="auth-submit" type="submit" name="intent" value="save" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button>}
        </form>}
        {opportunities.length ? <><div className="mentor-list-tools"><span>Menampilkan {Math.min((page - 1) * pageSize + 1, opportunities.length)}–{Math.min(page * pageSize, opportunities.length)} dari {opportunities.length} peluang</span><div className="mentor-list-controls" aria-label="Tampilan daftar peluang"><button type="button" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}>Grid</button><button type="button" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>List</button></div></div><div className={`mentor-opportunity-list is-${layout}`}>{pageOpportunities.map((item) => <article key={item.id}><div><strong>{item.title}</strong><span>{[item.organizer, item.status === 'open' ? 'Dibuka' : item.status === 'closed' ? 'Ditutup' : 'Draf'].filter(Boolean).join(' · ')}</span></div><div className="mentor-opportunity-actions"><Link href="/peluang">Lihat</Link><button type="button" disabled={busy} onClick={() => { setEditing(item); setFormOpen(true) }}>{item.status === 'draft' ? 'Lanjutkan' : 'Edit'}</button>{item.status === 'draft' && <button type="button" disabled={busy} onClick={() => void publishOpportunity(item)}>Terbitkan</button>}{item.status === 'open' && <button type="button" disabled={busy} onClick={() => void closeOpportunity(item)}>Tutup pendaftaran</button>}</div></article>)}</div><div className="mentor-pagination" aria-label="Halaman daftar peluang"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Sebelumnya</button><span>Halaman {page} dari {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Berikutnya</button></div></> : <p>Belum ada peluang yang dibuat.</p>}
      </section>
      <section className="mentor-opportunities"><div className="mentor-list-heading mentor-interest-heading"><div><span className="section-kicker">PARTISIPASI SISWA</span><h2>Siswa yang tertarik</h2></div><span>{interests.length} minat</span></div>
        {interests.length ? <div className="mentor-interest-list">{interests.map((interest) => <article key={interest.id}><div className="mentor-interest-avatar">{interest.student.profilePhoto ? <img src={interest.student.profilePhoto} alt="" /> : interest.student.name.slice(0, 1)}</div><div><strong>{interest.student.name}</strong><span>{interest.student.class || 'Siswa'}{interest.student.program ? ` · ${interest.student.program}` : ''}</span><small>Tertarik pada <b>{interest.opportunity.title}</b></small>{interest.note && <p>{interest.note}</p>}</div><time>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(interest.createdAt))}</time><label className="mentor-interest-status">Tindak lanjut<select aria-label={`Status tindak lanjut ${interest.student.name}`} value={interest.status} onChange={(event) => void updateInterest(interest, event.target.value)}><option value="interested">Tertarik</option><option value="contacted">Sudah dihubungi</option><option value="completed">Selesai</option></select></label></article>)}</div> : <p>Belum ada siswa yang menyatakan minat pada peluang.</p>}
      </section>
    </>}
  </main>
}
