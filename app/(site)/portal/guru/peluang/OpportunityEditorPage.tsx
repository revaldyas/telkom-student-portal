'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DropZone, IMAGE_TYPES } from '../../../../../components/EditorParts'
import { siteFetch } from '../../../../../lib/siteFetch'
import type { OpportunityEditorData } from './editorData'
import '../../siswa/profil/profile-editor.css'
import '../../siswa/karya/portfolio-wizard.css'
import './opportunity-editor.css'

type Props = { programs: { id: string | number; name: string }[]; opportunity?: OpportunityEditorData | null }
const types = [
  { value: 'competition', label: 'Kompetisi' }, { value: 'exhibition', label: 'Pameran' }, { value: 'challenge', label: 'Tantangan proyek' },
  { value: 'mentoring', label: 'Mentoring' }, { value: 'collaboration', label: 'Kolaborasi industri' }, { value: 'other', label: 'Lainnya' },
]
const sections = [{ id: 'dasar', label: 'Informasi' }, { id: 'jadwal', label: 'Jadwal' }, { id: 'sasaran', label: 'Sasaran & media' }, { id: 'kontak', label: 'Tautan & kontak' }]
const SUMMARY_MAX = 1200
const toISODate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const addDays = (base: string, days: number) => { const date = base ? new Date(`${base}T00:00:00`) : new Date(); date.setDate(date.getDate() + days); return toISODate(date) }
const statusLabel: Record<string, string> = { draft: 'Draf', open: 'Dibuka', closed: 'Ditutup' }

export default function OpportunityEditorPage({ programs, opportunity = null }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(opportunity?.title || '')
  const [type, setType] = useState(opportunity?.type || 'competition')
  const [organizer, setOrganizer] = useState(opportunity?.organizer || '')
  const [summary, setSummary] = useState(opportunity?.summary || '')
  const [requirements, setRequirements] = useState(opportunity?.requirements || '')
  const [opensAt, setOpensAt] = useState(opportunity?.opensAt || '')
  const [deadline, setDeadline] = useState(opportunity?.deadline || '')
  const [url, setUrl] = useState(opportunity?.url || '')
  const [contact, setContact] = useState(opportunity?.contact || '')
  const [targets, setTargets] = useState<(string | number)[]>(opportunity?.targetPrograms || [])
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [removeCover, setRemoveCover] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [active, setActive] = useState('dasar')
  const status = opportunity?.status || 'draft'
  const serialize = () => JSON.stringify([title, type, organizer, summary, requirements, opensAt, deadline, url, contact, targets])
  const [baseline, setBaseline] = useState(serialize)

  const urlValid = !url.trim() || /^https?:\/\/\S+\.\S+/i.test(url.trim())
  const dateValid = !opensAt || !deadline || deadline >= opensAt
  const coverShown = removeCover ? '' : coverPreview || opportunity?.coverImage?.url || ''
  const dirty = serialize() !== baseline || Boolean(coverFile || removeCover)
  const typeInfo = types.find((item) => item.value === type) || types[0]
  const daysLeft = deadline ? Math.ceil((new Date(`${deadline}T23:59:59`).getTime() - Date.now()) / 86400000) : null
  const canPublish = Boolean(title.trim() && organizer.trim() && summary.trim())
  const programNames = useMemo(() => targets.map((id) => programs.find((program) => String(program.id) === String(id))?.name).filter(Boolean) as string[], [targets, programs])

  const checklist = [
    { id: 'dasar', done: Boolean(title.trim()), label: 'Nama peluang', required: true },
    { id: 'dasar', done: Boolean(organizer.trim()), label: 'Penyelenggara', required: true },
    { id: 'dasar', done: summary.trim().length >= 40, label: 'Deskripsi (min. 40 karakter)', required: true },
    { id: 'jadwal', done: Boolean(deadline), label: 'Batas pendaftaran', required: false },
    { id: 'sasaran', done: Boolean(coverShown), label: 'Gambar sampul', required: false },
    { id: 'kontak', done: Boolean(url.trim() || contact.trim()), label: 'Tautan atau kontak', required: false },
  ]
  const percent = Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100)
  const nextTodo = checklist.find((item) => !item.done)

  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => { const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (visible) setActive(visible.target.id) }, { rootMargin: '-25% 0px -60% 0px' })
    sections.forEach((section) => { const element = document.getElementById(section.id); if (element) observer.observe(element) })
    return () => observer.disconnect()
  }, [])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer) }, [toast])
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  function pickCover(files: File[]) { const file = files[0]; if (!file) return; if (!IMAGE_TYPES.test(file.type)) { setError('Sampul harus berformat JPG, PNG, atau WebP.'); return } setError(''); setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); setRemoveCover(false) }

  async function save(intent: 'draft' | 'publish' | 'save' | 'close' | 'reopen') {
    const nextStatus = intent === 'publish' || intent === 'reopen' ? 'open' : intent === 'draft' ? 'draft' : intent === 'close' ? 'closed' : status
    if (!title.trim()) { setError('Isi nama peluang terlebih dahulu.'); jump('dasar'); return }
    if (nextStatus !== 'draft' && !canPublish) { setError('Untuk menerbitkan, lengkapi nama, penyelenggara, dan deskripsi. Atau simpan sebagai draf dulu.'); jump('dasar'); return }
    if (!dateValid) { setError('Batas pendaftaran tidak boleh sebelum tanggal mulai.'); jump('jadwal'); return }
    if (!urlValid) { setError('Tautan harus diawali http:// atau https://'); jump('kontak'); return }
    setBusy(intent); setError(''); setToast('')
    try {
      let coverID: string | number | null | undefined = opportunity?.coverImage?.id ?? null
      if (coverFile) {
        const form = new FormData(); form.append('file', coverFile); form.append('alt', `Sampul ${title.trim()}`)
        const upload = await siteFetch('/api/uploads', { method: 'POST', body: form }); const uploaded = await upload.json()
        if (!upload.ok) throw new Error(uploaded.errors?.[0]?.message || uploaded.message || 'Sampul belum berhasil diunggah.')
        coverID = uploaded.doc?.id
      } else if (removeCover) coverID = null
      const data = {
        title: title.trim(), type, organizer: organizer.trim() || null, summary: summary.trim() || null, requirements: requirements.trim() || null,
        opensAt: opensAt || null, deadline: deadline || null, url: url.trim() || null, contact: contact.trim() || null,
        // ID relasi di database berupa angka.
        targetPrograms: targets.map((id) => programs.find((program) => String(program.id) === String(id))?.id).filter((id) => id !== undefined),
        coverImage: coverID, status: nextStatus,
      }
      const response = await siteFetch(opportunity ? `/api/opportunities/${opportunity.id}` : '/api/opportunities', { method: opportunity ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Peluang belum berhasil disimpan.')
      setBaseline(serialize()); setCoverFile(null)
      if (!opportunity && nextStatus === 'draft') router.replace(`/portal/guru/peluang/${result.doc?.id}/edit`)
      else if (nextStatus === 'open' && (intent === 'publish')) { router.push('/portal/guru/peluang'); router.refresh() }
      else { setToast(intent === 'draft' ? 'Draf tersimpan. Terbitkan saat sudah siap.' : intent === 'close' ? 'Pendaftaran ditutup.' : intent === 'reopen' ? 'Peluang dibuka kembali' : 'Perubahan tersimpan'); router.refresh() }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Peluang belum berhasil disimpan.') }
    finally { setBusy('') }
  }

  return <main className="portal-page pe-page pw-page oe-page">
    <nav className="portfolio-form-breadcrumb" aria-label="Breadcrumb"><Link href="/portal/guru">Portal guru</Link><span>/</span><Link href="/portal/guru/peluang">Peluang siswa</Link><span>/</span><span>{opportunity ? 'Edit peluang' : 'Peluang baru'}</span></nav>
    <header className="pe-head"><div><span className="section-kicker">PELUANG & KOLABORASI</span><h1>{opportunity ? (status === 'draft' ? 'Lanjutkan draf peluang' : 'Edit peluang') : 'Buat peluang baru'}</h1><p>Bagikan kompetisi, pameran, mentoring, atau kolaborasi yang relevan untuk siswa.</p></div>
      <div className="pe-head-actions">{opportunity && <span className={`oe-status oe-status--${status}`}>{statusLabel[status] || status}</span>}<Link className="pe-ghost" href="/portal/guru/peluang">← Daftar peluang</Link></div></header>

    <div className="pe-layout">
      <form className="pe-form" onSubmit={(event) => event.preventDefault()} noValidate>
        <nav className="pe-steps" aria-label="Bagian formulir">{sections.map((section, index) => <button type="button" key={section.id} className={active === section.id ? 'is-active' : ''} aria-current={active === section.id ? 'step' : undefined} onClick={() => jump(section.id)}><b>{index + 1}</b>{section.label}</button>)}</nav>
        {error && <p className="pe-error" role="alert">{error}</p>}

        <section className="pe-card" id="dasar"><header><span>01</span><div><h2>Informasi peluang</h2><p>Nama, jenis, dan penjelasan yang membuat siswa tertarik.</p></div></header>
          <div className="pe-field"><div className="pe-label"><label htmlFor="op-title">Nama peluang <i>*</i></label><span className="pe-count">{title.length}/160</span></div><input id="op-title" className="pe-input pw-title" value={title} maxLength={160} autoFocus={!opportunity} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Lomba Desain Poster Nasional 2026" /></div>
          <div className="pe-field"><div className="pe-label"><span id="op-type" className="pw-fake-label">Jenis peluang</span></div><div className="oe-types" role="radiogroup" aria-labelledby="op-type">{types.map((item) => <button type="button" role="radio" aria-checked={type === item.value} key={item.value} className={type === item.value ? 'is-active' : ''} onClick={() => setType(item.value)}>{item.label}</button>)}</div></div>
          <div className="pe-field"><div className="pe-label"><label htmlFor="op-org">Penyelenggara <i>*</i></label></div><input id="op-org" className="pe-input" value={organizer} maxLength={120} onChange={(event) => setOrganizer(event.target.value)} placeholder="Contoh: Kementerian Pendidikan, Telkom University" /></div>
          <div className="pe-field"><div className="pe-label"><label htmlFor="op-sum">Deskripsi <i>*</i></label><span className={`pe-count${summary.length > SUMMARY_MAX - 80 ? ' is-warn' : ''}`}>{summary.length}/{SUMMARY_MAX}</span></div><textarea id="op-sum" className="pe-input pe-textarea" rows={5} maxLength={SUMMARY_MAX} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Apa peluang ini, siapa yang cocok mengikuti, dan apa manfaatnya?" /><div className="pe-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, (summary.length / SUMMARY_MAX) * 100)}%` }} /></div></div>
          <div className="pe-field"><div className="pe-label"><label htmlFor="op-req">Syarat dan informasi</label><span className="pe-count">Opsional</span></div><textarea id="op-req" className="pe-input pe-textarea" rows={4} maxLength={3000} value={requirements} onChange={(event) => setRequirements(event.target.value)} placeholder="Persyaratan peserta, kelengkapan, hadiah, atau catatan penting lainnya." /></div>
        </section>

        <section className="pe-card" id="jadwal"><header><span>02</span><div><h2>Jadwal</h2><p>Kapan peluang dimulai dan batas akhir pendaftaran.</p></div></header>
          <div className="oe-dates">
            <div className="pe-field"><div className="pe-label"><label htmlFor="op-open">Tanggal mulai</label></div><input id="op-open" className="pe-input" type="date" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} /><div className="oe-quick"><button type="button" onClick={() => setOpensAt(toISODate(new Date()))}>Hari ini</button><button type="button" onClick={() => setOpensAt(addDays('', 7))}>+7 hari</button>{opensAt && <button type="button" className="is-clear" onClick={() => setOpensAt('')}>Hapus</button>}</div></div>
            <div className="pe-field"><div className="pe-label"><label htmlFor="op-dead">Batas pendaftaran</label>{daysLeft !== null && <span className={`pe-count${daysLeft < 0 ? ' is-warn' : ''}`}>{daysLeft < 0 ? `Terlewat ${-daysLeft} hari` : daysLeft === 0 ? 'Berakhir hari ini' : `${daysLeft} hari lagi`}</span>}</div><input id="op-dead" className={`pe-input${dateValid ? '' : ' pw-invalid'}`} type="date" min={opensAt || undefined} value={deadline} onChange={(event) => setDeadline(event.target.value)} /><div className="oe-quick">{[7, 14, 30].map((days) => <button type="button" key={days} onClick={() => setDeadline(addDays(opensAt, days))}>+{days} hari{opensAt ? ' dari mulai' : ''}</button>)}{deadline && <button type="button" className="is-clear" onClick={() => setDeadline('')}>Hapus</button>}</div></div>
          </div>
          {!dateValid && <p className="pe-hint oe-bad">Batas pendaftaran tidak boleh sebelum tanggal mulai.</p>}
        </section>

        <section className="pe-card" id="sasaran"><header><span>03</span><div><h2>Sasaran dan media</h2><p>Program keahlian yang dituju dan gambar sampul.</p></div></header>
          <div className="pe-field"><div className="pe-label"><span id="op-prog" className="pw-fake-label">Program keahlian sasaran</span><span className="pe-count">{targets.length ? `${targets.length} dipilih` : 'Semua program'}</span></div>
            <div className="pw-cats" role="group" aria-labelledby="op-prog"><button type="button" aria-pressed={!targets.length} className={!targets.length ? 'is-active' : ''} onClick={() => setTargets([])}>Semua program</button>{programs.map((program) => { const on = targets.some((id) => String(id) === String(program.id)); return <button type="button" key={program.id} aria-pressed={on} className={on ? 'is-active' : ''} onClick={() => setTargets((current) => on ? current.filter((id) => String(id) !== String(program.id)) : [...current, program.id])}>{program.name}</button> })}</div>
            <p className="pe-hint">Kosongkan pilihan (Semua program) bila terbuka untuk semua siswa.</p></div>
          <div className="pe-field"><div className="pe-label"><span className="pw-fake-label">Gambar sampul</span><span className="pe-count">Rasio 4:3 disarankan</span></div>
            {coverShown ? <div className="pw-cover"><img src={coverShown} alt="Pratinjau sampul" /><div className="pw-cover-actions"><DropZone accept="image/jpeg,image/png,image/webp" onFiles={pickCover} className="pw-inline" label="Ganti gambar sampul"><span>Ganti</span></DropZone><button type="button" onClick={() => { setRemoveCover(true); setCoverFile(null); setCoverPreview('') }}>Hapus</button></div></div>
              : <DropZone accept="image/jpeg,image/png,image/webp" onFiles={pickCover} className="pw-cover-drop" label="Pilih gambar sampul"><svg className="pw-drop-icon" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg><strong>Seret poster atau gambar sampul ke sini</strong><small>atau klik untuk memilih · JPG, PNG, WebP</small></DropZone>}</div>
        </section>

        <section className="pe-card" id="kontak"><header><span>04</span><div><h2>Tautan dan kontak</h2><p>Tempat siswa mendaftar atau bertanya lebih lanjut.</p></div></header>
          <div className="pe-field"><div className="pe-label"><label htmlFor="op-url">Tautan informasi atau pendaftaran</label>{url.trim() && <span className={`pe-count${urlValid ? '' : ' is-warn'}`}>{urlValid ? 'Format valid' : 'Awali dengan https://'}</span>}</div><input id="op-url" className={`pe-input${urlValid ? '' : ' pw-invalid'}`} type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></div>
          <div className="pe-field"><div className="pe-label"><label htmlFor="op-contact">Kontak</label></div><input id="op-contact" className="pe-input" value={contact} maxLength={120} onChange={(event) => setContact(event.target.value)} placeholder="Email atau nomor WhatsApp panitia" /></div>
        </section>
      </form>

      <aside className="pe-side" aria-label="Pratinjau dan kelengkapan">
        <span className="pe-side-label">Pratinjau kartu</span>
        <article className="kr-card pw-preview"><div className="kr-media">{coverShown ? <img src={coverShown} alt="" /> : <span className="kr-placeholder">{typeInfo.label}</span>}<span className="kr-category">{typeInfo.label}</span>{daysLeft !== null && <span className={`kr-nominee kr-deadline${daysLeft <= 7 ? ' is-urgent' : ''}`}>{daysLeft < 0 ? 'Berakhir' : daysLeft === 0 ? 'Hari ini' : `${daysLeft} hari lagi`}</span>}</div>
          <div className="kr-body"><h3>{title.trim() || 'Nama peluangmu'}</h3><p className="oe-org">{organizer.trim() || 'Penyelenggara'}</p>{summary.trim() ? <p className="kr-summary">{summary.trim()}</p> : <p className="kr-summary pw-ghost-text">Deskripsi akan tampil di sini.</p>}{programNames.length > 0 && <div className="oe-prog">{programNames.slice(0, 3).map((name) => <span key={name}>{name}</span>)}{programNames.length > 3 && <span>+{programNames.length - 3}</span>}</div>}</div></article>
        <section className="pe-progress"><div className="pe-ring" style={{ ['--p' as string]: `${percent}%` }} role="img" aria-label={`Kelengkapan ${percent} persen`}><b>{percent}%</b></div><div><strong>{percent === 100 ? 'Siap diterbitkan' : canPublish ? 'Sudah bisa diterbitkan' : 'Kelengkapan peluang'}</strong>{nextTodo ? <button type="button" className="pe-link" onClick={() => jump(nextTodo.id)}>Berikutnya: {nextTodo.label} →</button> : <small>Semua bagian sudah terisi.</small>}</div></section>
        <ul className="pe-checklist">{checklist.map((item) => <li key={item.label} className={item.done ? 'is-done' : ''}><button type="button" onClick={() => jump(item.id)}><span aria-hidden="true">{item.done ? '✓' : '○'}</span>{item.label}{item.required && !item.done && <em>wajib</em>}</button></li>)}</ul>
        <p className="pw-note">{status === 'draft' ? 'Draf hanya terlihat olehmu. Siswa baru melihatnya setelah kamu menerbitkan.' : status === 'open' ? 'Peluang ini sedang tampil di halaman publik. Perubahan langsung terlihat setelah disimpan.' : 'Pendaftaran peluang ini sudah ditutup. Kamu bisa membukanya kembali kapan saja.'}</p>
      </aside>
    </div>

    <div className="pe-savebar is-visible pw-actionbar" role="region" aria-label="Simpan peluang">
      <span>{dirty ? <><i aria-hidden="true" />Perubahan belum disimpan</> : <>{opportunity ? 'Tersimpan' : 'Belum ada perubahan'}</>}</span>
      <div><Link className="pe-ghost" href="/portal/guru/peluang">Keluar</Link>
        {status === 'draft'
          ? <><button type="button" className="pe-ghost" onClick={() => void save('draft')} disabled={Boolean(busy)}>{busy === 'draft' ? 'Menyimpan…' : 'Simpan draf'}</button><button type="button" className="pe-save" onClick={() => void save('publish')} disabled={Boolean(busy)} title={canPublish ? undefined : 'Lengkapi nama, penyelenggara, dan deskripsi dulu'}>{busy === 'publish' ? 'Menerbitkan…' : 'Terbitkan peluang'}</button></>
          : <>{status === 'open' ? <button type="button" className="pe-ghost" onClick={() => void save('close')} disabled={Boolean(busy)}>{busy === 'close' ? 'Menutup…' : 'Tutup pendaftaran'}</button> : <button type="button" className="pe-ghost" onClick={() => void save('reopen')} disabled={Boolean(busy)}>{busy === 'reopen' ? 'Membuka…' : 'Buka kembali'}</button>}<button type="button" className="pe-save" onClick={() => void save('save')} disabled={Boolean(busy) || !dirty}>{busy === 'save' ? 'Menyimpan…' : 'Simpan perubahan'}</button></>}
      </div>
    </div>
    {toast && <p className="pe-toast" role="status">{toast}</p>}
  </main>
}
