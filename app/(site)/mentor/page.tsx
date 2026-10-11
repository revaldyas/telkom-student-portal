'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { siteFetch } from '../../../lib/siteFetch'

type ReviewItem = {
  id: string | number; title: string; slug: string; summary: string; year?: number; tools?: string[]
  status: string; verificationStatus?: string; student?: { id: string | number; name: string; class?: string; program?: string } | null
  category?: string | null; coverImage?: string | null; projectFile?: { url?: string; mimeType?: string; filename?: string } | null
  review?: { id: string | number; decision: string; feedback: string } | null
}
type Opportunity = { id: string | number; title: string; type: string; organizer: string; status: string; summary?: string; requirements?: string; opensAt?: string; deadline?: string; url?: string; contact?: string; targetPrograms?: Array<{ id: string | number; name?: string } | string | number> }
type Program = { id: string | number; name: string }
type OpportunityInterest = { id: string | number; note: string; status: string; createdAt: string; opportunity: { id: string | number; title: string; organizer: string }; student: { id: string | number; name: string; class?: string | null; program?: string | null; profilePhoto?: string | null } }

export default function MentorReviewPage() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [allowed, setAllowed] = useState(false)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [interests, setInterests] = useState<OpportunityInterest[]>([])
  const [opportunityForm, setOpportunityForm] = useState(false)
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null)
  const [opportunityBusy, setOpportunityBusy] = useState(false)

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
    setFeedback(Object.fromEntries(docs.map((item) => [String(item.id), item.review?.feedback || ''])))
    const opportunityResponse = await siteFetch('/api/opportunities?depth=0&limit=100&sort=-createdAt', { cache: 'no-store' })
    if (opportunityResponse.ok) {
      const opportunityData = await opportunityResponse.json()
      setOpportunities(opportunityData.docs || [])
    }
    const programResponse = await fetch('/api/programs?limit=100&sort=name', { cache: 'no-store' })
    if (programResponse.ok) setPrograms((await programResponse.json()).docs || [])
    const interestResponse = await fetch('/api/mentor/interests', { credentials: 'same-origin', cache: 'no-store' })
    if (interestResponse.ok) {
      const interestData = await interestResponse.json()
      setInterests(interestData.docs || [])
    }
    setLoading(false)
  }

  useEffect(() => { void load().catch((error) => { setMessage(error instanceof Error ? error.message : 'Karya belum dapat dimuat.'); setLoading(false) }) }, [])

  async function submit(item: ReviewItem, decision: 'verified' | 'revision-requested') {
    const note = feedback[String(item.id)]?.trim() || ''
    if (note.length < 5) { setMessage('Umpan balik minimal 5 karakter agar siswa mendapat arahan yang jelas.'); return }
    setBusy(`${item.id}:${decision}`); setMessage('')
    try {
      const response = await fetch('/api/mentor/reviews', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portfolio: item.id, decision, feedback: note }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || data.errors?.[0]?.message || 'Tinjauan belum tersimpan.')
      setMessage(decision === 'verified' ? 'Karya terverifikasi dan diterbitkan.' : 'Umpan balik revisi berhasil dikirim.')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Tinjauan belum tersimpan.') }
    finally { setBusy('') }
  }

  async function createOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setOpportunityBusy(true); setMessage('')
    const form = new FormData(event.currentTarget)
    const data: Record<string, unknown> = Object.fromEntries([...form.entries()].filter(([key, value]) => key !== 'targetPrograms' && value !== ''))
    data.targetPrograms = form.getAll('targetPrograms').map((value) => value.toString())
    try {
      const response = await siteFetch(editingOpportunity ? `/api/opportunities/${editingOpportunity.id}` : '/api/opportunities', { method: editingOpportunity ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, status: editingOpportunity?.status || 'open' }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Peluang belum berhasil disimpan.')
      setMessage(editingOpportunity ? 'Peluang berhasil diperbarui.' : 'Peluang berhasil diterbitkan.')
      setOpportunityForm(false)
      setEditingOpportunity(null)
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Peluang belum berhasil disimpan.') }
    finally { setOpportunityBusy(false) }
  }

  async function closeOpportunity(opportunity: Opportunity) {
    setOpportunityBusy(true); setMessage('')
    try {
      const response = await siteFetch(`/api/opportunities/${opportunity.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'closed' }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Status peluang belum berhasil diperbarui.')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Status peluang belum berhasil diperbarui.') }
    finally { setOpportunityBusy(false) }
  }

  async function updateInterest(interest: OpportunityInterest, status: string) {
    try {
      const response = await fetch('/api/mentor/interests', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: interest.id, status }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Status minat belum berhasil diperbarui.')
      setInterests((current) => current.map((item) => item.id === interest.id ? { ...item, status } : item))
      setMessage('Status tindak lanjut siswa berhasil diperbarui.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Status minat belum berhasil diperbarui.') }
  }

  return <main className="mentor-page wrap">
    <header className="mentor-hero"><span className="section-kicker">MENTOR & VERIFIKASI</span><h1>Bantu karya<br /><span>bertumbuh.</span></h1><p>Tinjau bukti karya siswa, beri umpan balik yang membangun, lalu verifikasi karya yang siap dipublikasikan.</p><Link className="button impact-secondary" href="/dampak">Lihat dampak program</Link></header>
    {message && <p className="mentor-message" role="status">{message}</p>}
    {allowed && <section className="mentor-opportunities">
      <div className="mentor-list-heading"><div><span className="section-kicker">PELUANG & KOLABORASI</span><h2>Peluang siswa</h2></div><button className="button button-primary" type="button" onClick={() => { setEditingOpportunity(null); setOpportunityForm((value) => !value) }}>{opportunityForm ? 'Tutup form' : 'Tambah peluang'}</button></div>
      {opportunityForm && <form key={editingOpportunity?.id || 'new'} className="project-form mentor-opportunity-form" onSubmit={createOpportunity}>
        <h3>{editingOpportunity ? 'Edit informasi peluang' : 'Informasi peluang'}</h3><label htmlFor="opportunity-title">NAMA PELUANG</label><input id="opportunity-title" name="title" required defaultValue={editingOpportunity?.title || ''} />
        <label htmlFor="opportunity-type">JENIS</label><select id="opportunity-type" name="type" defaultValue={editingOpportunity?.type || 'competition'}><option value="competition">Kompetisi</option><option value="exhibition">Pameran</option><option value="challenge">Tantangan proyek</option><option value="mentoring">Mentoring</option><option value="collaboration">Kolaborasi industri</option><option value="other">Lainnya</option></select>
        <label htmlFor="opportunity-organizer">PENYELENGGARA</label><input id="opportunity-organizer" name="organizer" required defaultValue={editingOpportunity?.organizer || ''} />
        <label htmlFor="opportunity-summary">DESKRIPSI</label><textarea id="opportunity-summary" name="summary" required defaultValue={editingOpportunity?.summary || ''} />
        <label htmlFor="opportunity-requirements">SYARAT DAN INFORMASI</label><textarea id="opportunity-requirements" name="requirements" defaultValue={editingOpportunity?.requirements || ''} />
        <label htmlFor="opportunity-opens">TANGGAL MULAI</label><input id="opportunity-opens" name="opensAt" type="date" defaultValue={editingOpportunity?.opensAt?.slice(0, 10) || ''} />
        <label htmlFor="opportunity-deadline">BATAS PENDAFTARAN</label><input id="opportunity-deadline" name="deadline" type="date" defaultValue={editingOpportunity?.deadline?.slice(0, 10) || ''} />
        <label htmlFor="opportunity-url">TAUTAN INFORMASI/PENDAFTARAN</label><input id="opportunity-url" name="url" type="url" defaultValue={editingOpportunity?.url || ''} />
        <label htmlFor="opportunity-contact">KONTAK</label><input id="opportunity-contact" name="contact" defaultValue={editingOpportunity?.contact || ''} />
        <label htmlFor="opportunity-programs">PROGRAM KEAHLIAN SASARAN</label><select id="opportunity-programs" name="targetPrograms" multiple defaultValue={editingOpportunity?.targetPrograms?.map((program) => String(typeof program === 'object' ? program.id : program)) || []}><option value="" disabled>Pilih satu atau beberapa program; kosongkan untuk semua program.</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select>
        <button className="auth-submit" disabled={opportunityBusy}>{opportunityBusy ? 'Menyimpan…' : editingOpportunity ? 'Simpan perubahan' : 'Terbitkan peluang'}</button>
      </form>}
      {opportunities.length ? <div className="mentor-opportunity-list">{opportunities.map((item) => <article key={item.id}><div><strong>{item.title}</strong><span>{item.organizer} · {item.status === 'open' ? 'Dibuka' : item.status === 'closed' ? 'Ditutup' : 'Draf'}</span></div><div className="mentor-opportunity-actions"><Link href="/peluang">Lihat</Link><button type="button" disabled={opportunityBusy} onClick={() => { setEditingOpportunity(item); setOpportunityForm(true) }}>Edit</button>{item.status === 'open' && <button type="button" disabled={opportunityBusy} onClick={() => void closeOpportunity(item)}>Tutup pendaftaran</button>}</div></article>)}</div> : <p>Belum ada peluang yang dibuat.</p>}
      <div className="mentor-list-heading mentor-interest-heading"><div><span className="section-kicker">PARTISIPASI SISWA</span><h2>Siswa yang tertarik</h2></div><span>{interests.length} minat</span></div>
      {interests.length ? <div className="mentor-interest-list">{interests.map((interest) => <article key={interest.id}><div className="mentor-interest-avatar">{interest.student.profilePhoto ? <img src={interest.student.profilePhoto} alt="" /> : interest.student.name.slice(0, 1)}</div><div><strong>{interest.student.name}</strong><span>{interest.student.class || 'Siswa'}{interest.student.program ? ` · ${interest.student.program}` : ''}</span><small>Tertarik pada <b>{interest.opportunity.title}</b></small>{interest.note && <p>{interest.note}</p>}</div><time>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(interest.createdAt))}</time><label className="mentor-interest-status">Tindak lanjut<select aria-label={`Status tindak lanjut ${interest.student.name}`} value={interest.status} onChange={(event) => void updateInterest(interest, event.target.value)}><option value="interested">Tertarik</option><option value="contacted">Sudah dihubungi</option><option value="completed">Selesai</option></select></label></article>)}</div> : <p>Belum ada siswa yang menyatakan minat pada peluang.</p>}
    </section>}
    <div className="mentor-list-heading"><div><span className="section-kicker">TINJAUAN KARYA</span><h2>Menunggu bimbingan</h2></div>{!loading && <span>{items.length} karya</span>}</div>
    {loading ? <div className="mentor-list">{[1, 2, 3].map((id) => <div className="mentor-card mentor-skeleton" key={id}><div className="sk" /><span className="sk sk-line" /><span className="sk sk-line" /></div>)}</div>
      : !allowed ? <div className="empty-state"><h2>Akses dibatasi</h2><p>Masuk dengan akun Guru yang ditetapkan ke kelas atau program keahlian siswa.</p><Link href="/login">Masuk ke akun</Link></div>
        : !items.length ? <div className="empty-state"><h2>Semua karya sudah ditinjau</h2><p>Karya baru dari kelas atau program keahlianmu akan muncul di sini.</p></div>
          : <div className="mentor-list">{items.map((item) => <article className="mentor-card" key={item.id}>
            {item.coverImage && <Link href={`/karya/${item.slug}`}><img className="mentor-cover" src={item.coverImage} alt={`Sampul ${item.title}`} /></Link>}
            <div className="mentor-card-content"><div className="mentor-card-top"><span className="lowfi-badge">{item.verificationStatus === 'revision-requested' ? 'REVISI DIMINTA' : 'MENUNGGU TINJAUAN'}</span><span>{item.category || 'Karya siswa'}</span></div>
              <h3>{item.title}</h3><p className="mentor-author">{item.student?.name || 'Siswa'}{item.student?.class ? ` · ${item.student.class}` : ''}{item.student?.program ? ` · ${item.student.program}` : ''}</p><p>{item.summary}</p>
              {item.tools?.length ? <p><strong>Perangkat:</strong> {item.tools.join(', ')}</p> : null}
              {item.projectFile?.url && <a className="mentor-evidence" href={item.projectFile.url} target="_blank" rel="noreferrer">Buka bukti: {item.projectFile.filename || 'berkas karya'} ↗</a>}
              {item.review && <div className="mentor-previous-feedback"><strong>Umpan balik terakhir</strong><p>{item.review.feedback}</p></div>}
              <label className="mentor-feedback">Umpan balik pembimbing<textarea value={feedback[String(item.id)] || ''} onChange={(event) => setFeedback((current) => ({ ...current, [String(item.id)]: event.target.value }))} minLength={5} maxLength={3000} placeholder="Sampaikan kekuatan karya dan saran perbaikan yang spesifik…" /></label>
              <div className="mentor-actions"><button className="button button-primary" disabled={Boolean(busy)} onClick={() => void submit(item, 'verified')}>{busy === `${item.id}:verified` ? 'Menyimpan…' : 'Verifikasi & terbitkan'}</button><button className="button mentor-revision" disabled={Boolean(busy)} onClick={() => void submit(item, 'revision-requested')}>{busy === `${item.id}:revision-requested` ? 'Menyimpan…' : 'Minta revisi'}</button></div>
            </div>
          </article>)}</div>}
  </main>
}
