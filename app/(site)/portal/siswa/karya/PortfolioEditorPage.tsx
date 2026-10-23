'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import PortfolioDetailEditor from '../../../../../components/PortfolioDetailEditor'
import { siteFetch } from '../../../../../lib/siteFetch'
import { workState } from '../../../../../lib/workState'
import '../profil/profile-editor.css'
import './portfolio-wizard.css'

export type PortfolioEditorCategory = { id: string | number; name: string; code: string }
export type PortfolioEditorWork = {
  id: string | number
  title: string
  categoryRef?: string | number | { id: string | number } | null
  summary?: string
  details?: SerializedEditorState | null
  coverImage?: { id?: string | number; url?: string; filename?: string } | string | number | null
  galleryImages?: Array<{ id?: string | number; url?: string; filename?: string; alt?: string }>
  projectFile?: { id?: string | number; url?: string; filename?: string; mimeType?: string } | string | number | null
  year?: number
  tools?: string[]
  projectUrl?: string
  status?: string
  verificationStatus?: string
}

type Props = { categories: PortfolioEditorCategory[]; work?: PortfolioEditorWork | null; notice?: string }
const relationID = (value: PortfolioEditorWork['coverImage']) => value && typeof value === 'object' ? value.id : typeof value === 'string' || typeof value === 'number' ? value : undefined

const SUMMARY_MAX = 800
const TITLE_MAX = 160
const IMAGE_TYPES = /^image\/(jpeg|png|webp)$/
const EVIDENCE_TYPES = /^(video\/(mp4|webm)|application\/pdf)$/
const toolSuggestions = ['Figma', 'Photoshop', 'Illustrator', 'Canva', 'VS Code', 'React', 'Premiere Pro', 'Blender', 'Arduino', 'Cisco Packet Tracer']
const sections = [
  { id: 'dasar', label: 'Informasi dasar' }, { id: 'detail', label: 'Detail' }, { id: 'media', label: 'Media' }, { id: 'tautan', label: 'Tautan & alat' },
]
const sizeLabel = (bytes: number) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

function DropZone({ accept, multiple = false, onFiles, className = '', children, label }: { accept: string; multiple?: boolean; onFiles: (files: File[]) => void; className?: string; children: ReactNode; label: string }) {
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const drop = (event: DragEvent) => { event.preventDefault(); setOver(false); const files = Array.from(event.dataTransfer.files || []); if (files.length) onFiles(multiple ? files : files.slice(0, 1)) }
  return <div className={`pw-drop ${className}${over ? ' is-over' : ''}`} onDragOver={(event) => { event.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={drop}>
    <button type="button" className="pw-drop-btn" aria-label={label} onClick={() => input.current?.click()}>{children}</button>
    <input ref={input} className="sr-only" type="file" accept={accept} multiple={multiple} tabIndex={-1} onChange={(event) => { const files = Array.from(event.target.files || []); if (files.length) onFiles(files); event.target.value = '' }} />
  </div>
}

export default function PortfolioEditorPage({ categories, work = null, notice: initialNotice = '' }: Props) {
  const router = useRouter()
  const state = work ? workState(work) : 'draft'
  const existingCover = work?.coverImage && typeof work.coverImage === 'object' ? work.coverImage : null
  const existingEvidence = work?.projectFile && typeof work.projectFile === 'object' ? work.projectFile : null
  const existingGallery = useMemo(() => (work?.galleryImages || []).filter((image) => image.id !== undefined), [work])
  const initialCategory = String(work?.categoryRef && typeof work.categoryRef === 'object' ? work.categoryRef.id : work?.categoryRef || '')

  const [title, setTitle] = useState(work?.title || '')
  const [categoryID, setCategoryID] = useState(initialCategory)
  const [year, setYear] = useState(String(work?.year || new Date().getFullYear()))
  const [summary, setSummary] = useState(work?.summary || '')
  const [details, setDetails] = useState<SerializedEditorState | null>(work?.details || null)
  const [tools, setTools] = useState<string[]>(work?.tools || [])
  const [toolInput, setToolInput] = useState('')
  const [url, setUrl] = useState(work?.projectUrl || '')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [removeCover, setRemoveCover] = useState(false)
  const [removedGallery, setRemovedGallery] = useState<string[]>([])
  const [newGallery, setNewGallery] = useState<{ file: File; preview: string }[]>([])
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [removeEvidence, setRemoveEvidence] = useState(false)
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(initialNotice)
  const [active, setActive] = useState('dasar')
  const [touchedSubmit, setTouchedSubmit] = useState(false)
  const [detailsDirty, setDetailsDirty] = useState(false)
  const detailsSeen = useRef(false)
  const [baseline, setBaseline] = useState(() => JSON.stringify([work?.title || '', initialCategory, String(work?.year || new Date().getFullYear()), work?.summary || '', work?.tools || [], work?.projectUrl || '']))

  const urlValid = !url.trim() || /^https?:\/\/\S+\.\S+/i.test(url.trim())
  const toolList = useMemo(() => [...tools, ...toolInput.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)].filter((item, index, all) => all.findIndex((candidate) => candidate.toLocaleLowerCase() === item.toLocaleLowerCase()) === index), [tools, toolInput])
  const snapshot = JSON.stringify([title, categoryID, year, summary, toolList, url])
  const dirty = snapshot !== baseline || detailsDirty || Boolean(coverFile || removeCover || removedGallery.length || newGallery.length || evidenceFile || removeEvidence)
  const coverShown = removeCover ? '' : coverPreview || existingCover?.url || ''
  const category = categories.find((item) => String(item.id) === categoryID)
  const galleryCount = existingGallery.filter((image) => !removedGallery.includes(String(image.id))).length + newGallery.length
  const hasDetails = Boolean(details || work?.details)

  const checklist = [
    { id: 'dasar', done: Boolean(title.trim()), required: true, label: 'Judul karya' },
    { id: 'dasar', done: Boolean(categoryID), required: true, label: 'Kategori' },
    { id: 'dasar', done: summary.trim().length >= 40, required: true, label: 'Ringkasan (min. 40 karakter)' },
    { id: 'media', done: Boolean(coverShown), required: false, label: 'Gambar sampul' },
    { id: 'detail', done: hasDetails, required: false, label: 'Detail dan proses' },
  ]
  const percent = Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100)
  const readyToSubmit = Boolean(title.trim() && categoryID && summary.trim())
  const nextTodo = checklist.find((item) => !item.done)

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setActive(visible.target.id)
    }, { rootMargin: '-25% 0px -60% 0px' })
    sections.forEach((section) => { const element = document.getElementById(section.id); if (element) observer.observe(element) })
    return () => observer.disconnect()
  }, [])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer) }, [toast])

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  function pickCover(files: File[]) {
    const file = files[0]
    if (!file) return
    if (!IMAGE_TYPES.test(file.type)) { setError('Sampul harus berformat JPG, PNG, atau WebP.'); return }
    setError(''); setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); setRemoveCover(false)
  }
  function pickGallery(files: File[]) {
    const valid = files.filter((file) => IMAGE_TYPES.test(file.type))
    if (valid.length !== files.length) setError('Sebagian berkas dilewati. Galeri hanya menerima JPG, PNG, atau WebP.')
    else setError('')
    setNewGallery((current) => [...current, ...valid.map((file) => ({ file, preview: URL.createObjectURL(file) }))])
  }
  function pickEvidence(files: File[]) {
    const file = files[0]
    if (!file) return
    if (!EVIDENCE_TYPES.test(file.type)) { setError('Berkas pendukung harus video MP4/WebM atau dokumen PDF.'); return }
    setError(''); setEvidenceFile(file); setRemoveEvidence(false)
  }
  function addTools(value: string) {
    const additions = value.split(/[\n,]/).map((item) => item.trim().slice(0, 40)).filter(Boolean)
    if (!additions.length) return
    setTools((current) => { const seen = new Set(current.map((item) => item.toLocaleLowerCase())); return [...current, ...additions.filter((item) => { const key = item.toLocaleLowerCase(); if (seen.has(key)) return false; seen.add(key); return true })] })
  }

  async function uploadFile(file: File, alt: string) {
    const body = new FormData()
    body.append('file', file)
    body.append('alt', alt)
    const response = await siteFetch('/api/uploads', { method: 'POST', body })
    const result = await response.json()
    if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Berkas belum berhasil diunggah.')
    return result.doc?.id as string | number
  }

  async function save(submitForReview: boolean) {
    const cleanTitle = title.trim()
    if (!cleanTitle) { setError('Isi judul karya terlebih dahulu.'); jump('dasar'); return }
    if (submitForReview && (!categoryID || !summary.trim())) {
      setTouchedSubmit(true)
      setError('Untuk mengajukan verifikasi, lengkapi kategori dan ringkasan karya. Atau simpan sebagai draf dulu.')
      jump('dasar')
      return
    }
    if (!urlValid) { setError('Tautan karya harus diawali http:// atau https://'); jump('tautan'); return }
    setBusy(submitForReview ? 'submit' : 'draft'); setError(''); setToast('')
    try {
      const coverUploadID = coverFile ? await uploadFile(coverFile, `Gambar sampul ${cleanTitle}`) : undefined
      const coverID = coverUploadID !== undefined ? coverUploadID : removeCover ? null : relationID(work?.coverImage)
      const evidenceUploadID = evidenceFile ? await uploadFile(evidenceFile, `Bukti karya ${cleanTitle}`) : undefined
      const evidenceID = evidenceUploadID !== undefined ? evidenceUploadID : removeEvidence ? null : relationID(work?.projectFile)
      const removed = new Set(removedGallery)
      const galleryIDs = existingGallery.flatMap((image) => !removed.has(String(image.id)) ? [image.id as string | number] : [])
      for (const item of newGallery) galleryIDs.push(await uploadFile(item.file, `Galeri karya ${cleanTitle}`))
      const data = {
        title: cleanTitle,
        categoryRef: categories.find((item) => String(item.id) === categoryID)?.id ?? null,
        summary: summary.trim(),
        submitForReview,
        details: details || undefined,
        coverImage: coverID,
        galleryImages: galleryIDs,
        projectFile: evidenceID,
        year: Number(year),
        tools: toolList,
        projectUrl: url.trim() || null,
      }
      const response = await siteFetch(work ? `/api/portfolios/${work.id}?depth=2` : '/api/portfolios?depth=2', {
        method: work ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(work ? data : { ...data, status: 'draft' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Karya belum berhasil disimpan.')
      setBaseline(snapshot); setDetailsDirty(false); setCoverFile(null); setNewGallery([]); setEvidenceFile(null)
      if (submitForReview) {
        router.push('/portal/siswa/karya')
        router.refresh()
      } else if (!work) {
        // Draf baru: lanjut di halaman edit supaya pengerjaan bisa diteruskan.
        router.replace(`/portal/siswa/karya/${result.doc?.id}/edit?saved=draft`)
      } else {
        setToast(state === 'draft' || state === 'revision' || state === 'published' ? 'Draf tersimpan. Ajukan verifikasi saat karya siap.' : 'Perubahan tersimpan')
        router.refresh()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Karya belum berhasil disimpan.')
    } finally {
      setBusy(null)
    }
  }

  const stateLabel = state === 'published' ? 'Terbit' : state === 'submitted' ? 'Menunggu verifikasi' : state === 'revision' ? 'Perlu revisi' : 'Draf'
  const submitNote = state === 'submitted' ? 'Sedang menunggu verifikasi Guru. Menyimpan perubahan tidak mengubah statusnya.' : state === 'published' ? 'Menyimpan akan menjadikan karya draf lagi. Pilih "Simpan & ajukan ulang" agar langsung masuk antrean.' : state === 'revision' ? 'Perbaiki sesuai catatan Guru, lalu ajukan ulang.' : 'Draf hanya terlihat olehmu. Guru meninjau setelah kamu mengajukan.'

  return <main className="portal-page pe-page pw-page">
    <nav className="portfolio-form-breadcrumb" aria-label="Breadcrumb"><Link href="/portal/siswa">Portal siswa</Link><span>/</span><Link href="/portal/siswa/karya">Karya saya</Link><span>/</span><span>{work ? 'Edit karya' : 'Karya baru'}</span></nav>
    <header className="pe-head"><div><span className="section-kicker">RUANG KARYA SISWA</span><h1>{work ? (state === 'draft' ? 'Lanjutkan draf' : 'Edit karya') : 'Buat karya baru'}</h1><p>{work ? 'Lanjutkan pengerjaan, simpan sebagai draf, atau ajukan saat sudah siap.' : 'Mulai dari draf: simpan kapan saja dan ajukan verifikasi saat karyamu siap.'}</p></div>
      <div className="pe-head-actions">{work && <span className={`pw-state pw-state--${state}`}>{stateLabel}</span>}<Link className="pe-ghost" href="/portal/siswa/karya">← Daftar karya</Link></div></header>

    <div className="pe-layout">
      <form className="pe-form" onSubmit={(event) => event.preventDefault()} noValidate>
        <nav className="pe-steps" aria-label="Bagian formulir">{sections.map((section, index) => <button type="button" key={section.id} className={active === section.id ? 'is-active' : ''} aria-current={active === section.id ? 'step' : undefined} onClick={() => jump(section.id)}><b>{index + 1}</b>{section.label}</button>)}</nav>
        {error && <p className="pe-error" role="alert">{error}</p>}

        <section className="pe-card" id="dasar"><header><span>01</span><div><h2>Informasi dasar</h2><p>Judul, kategori, dan ringkasan membantu orang menemukan karyamu.</p></div></header>
          <div className="pe-field"><div className="pe-label"><label htmlFor="pw-title">Judul karya <i>*</i></label><span className="pe-count">{title.length}/{TITLE_MAX}</span></div>
            <input id="pw-title" className="pe-input pw-title" value={title} maxLength={TITLE_MAX} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Identitas Visual Festival Kota" autoFocus={!work} /></div>
          <div className="pe-field"><div className="pe-label"><span id="pw-cat-label" className="pw-fake-label">Kategori {readyToSubmit || !touchedSubmit ? null : <i>wajib untuk diajukan</i>}</span></div>
            <div className={`pw-cats${touchedSubmit && !categoryID ? ' is-invalid' : ''}`} role="radiogroup" aria-labelledby="pw-cat-label">{categories.map((item) => <button type="button" role="radio" aria-checked={categoryID === String(item.id)} key={item.id} className={categoryID === String(item.id) ? 'is-active' : ''} onClick={() => setCategoryID(categoryID === String(item.id) ? '' : String(item.id))}>{item.name}</button>)}</div></div>
          <div className="pw-row">
            <div className="pe-field"><div className="pe-label"><label htmlFor="pw-year">Tahun karya</label></div>
              <div className="pw-stepper"><button type="button" aria-label="Kurangi tahun" onClick={() => setYear(String(Math.max(2000, Number(year || new Date().getFullYear()) - 1)))}>−</button><input id="pw-year" className="pe-input" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, '').slice(0, 4))} /><button type="button" aria-label="Tambah tahun" onClick={() => setYear(String(Math.min(new Date().getFullYear() + 1, Number(year || new Date().getFullYear()) + 1)))}>+</button></div></div>
          </div>
          <div className="pe-field"><div className="pe-label"><label htmlFor="pw-summary">Ringkasan karya</label><span className={`pe-count${summary.length > SUMMARY_MAX - 60 ? ' is-warn' : ''}`}>{summary.length}/{SUMMARY_MAX}</span></div>
            <textarea id="pw-summary" className={`pe-input pe-textarea${touchedSubmit && !summary.trim() ? ' pw-invalid' : ''}`} rows={5} maxLength={SUMMARY_MAX} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Jelaskan karya ini secara singkat: masalah yang dijawab, tujuan, atau hasil utamanya." />
            <div className="pe-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, (summary.length / SUMMARY_MAX) * 100)}%` }} /></div>
            <p className="pe-hint">Tampil pada kartu dan bagian awal halaman karya. 2–4 kalimat sudah cukup.</p></div>
        </section>

        <section className="pe-card" id="detail"><header><span>02</span><div><h2>Detail dan proses</h2><p>Ceritakan proses, keputusan desain, tantangan, dan hasil dengan editor blok.</p></div></header>
          <PortfolioDetailEditor initialValue={work?.details} onChange={(value) => { setDetails(value); if (detailsSeen.current) setDetailsDirty(true); else detailsSeen.current = true }} />
        </section>

        <section className="pe-card" id="media"><header><span>03</span><div><h2>Media</h2><p>Visual yang kuat membuat karya lebih menarik. Seret berkas ke kotak atau klik untuk memilih.</p></div></header>
          <div className="pe-field"><div className="pe-label"><span className="pw-fake-label">Gambar sampul</span><span className="pe-count">Rasio 4:3 disarankan</span></div>
            {coverShown ? <div className="pw-cover"><img src={coverShown} alt="Pratinjau sampul" /><div className="pw-cover-actions"><DropZone accept="image/jpeg,image/png,image/webp" onFiles={pickCover} className="pw-inline" label="Ganti gambar sampul"><span>Ganti</span></DropZone><button type="button" onClick={() => { setRemoveCover(true); setCoverFile(null); setCoverPreview('') }}>Hapus</button></div></div>
              : <DropZone accept="image/jpeg,image/png,image/webp" onFiles={pickCover} className="pw-cover-drop" label="Pilih gambar sampul"><svg className="pw-drop-icon" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg><strong>Seret gambar sampul ke sini</strong><small>atau klik untuk memilih · JPG, PNG, WebP</small>{removeCover && existingCover && <em>Sampul akan dihapus saat disimpan</em>}</DropZone>}
          </div>
          <div className="pe-field"><div className="pe-label"><span className="pw-fake-label">Galeri karya</span><span className="pe-count">{galleryCount} gambar</span></div>
            <div className="pw-gallery">
              {existingGallery.filter((image) => !removedGallery.includes(String(image.id))).map((image) => <figure key={image.id}><img src={image.url || ''} alt={image.alt || image.filename || 'Gambar galeri'} /><button type="button" aria-label="Hapus gambar galeri" onClick={() => setRemovedGallery((current) => [...current, String(image.id)])}>×</button></figure>)}
              {newGallery.map((item, index) => <figure key={item.preview} className="is-new"><img src={item.preview} alt={`Gambar baru ${index + 1}`} /><span>Baru</span><button type="button" aria-label="Hapus gambar baru" onClick={() => setNewGallery((current) => current.filter((entry) => entry.preview !== item.preview))}>×</button></figure>)}
              <DropZone accept="image/jpeg,image/png,image/webp" multiple onFiles={pickGallery} className="pw-add" label="Tambah gambar galeri"><span aria-hidden="true">+</span><small>Tambah</small></DropZone>
            </div>
            <p className="pe-hint">Gambar tambahan tampil sebagai galeri di halaman detail karya.</p></div>
          <div className="pe-field"><div className="pe-label"><span className="pw-fake-label">Video atau dokumen pendukung</span><span className="pe-count">Opsional</span></div>
            {evidenceFile ? <div className="pw-file"><span aria-hidden="true">{evidenceFile.type.startsWith('video/') ? 'VIDEO' : 'FILE'}</span><div><strong>{evidenceFile.name}</strong><small>{sizeLabel(evidenceFile.size)} · akan diunggah saat disimpan</small></div><button type="button" onClick={() => setEvidenceFile(null)}>Batal</button></div>
              : existingEvidence?.url && !removeEvidence ? <div className="pw-file"><span aria-hidden="true">FILE</span><div><strong>{existingEvidence.filename || 'Berkas karya'}</strong><small><a href={existingEvidence.url} target="_blank" rel="noreferrer">Buka berkas saat ini ↗</a></small></div><button type="button" onClick={() => setRemoveEvidence(true)}>Hapus</button></div>
                : <DropZone accept="video/mp4,video/webm,application/pdf" onFiles={pickEvidence} className="pw-file-drop" label="Pilih video atau dokumen"><svg className="pw-drop-icon" viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg><strong>Seret video MP4/WebM atau PDF</strong><small>atau klik untuk memilih{removeEvidence ? ' · berkas lama akan dihapus saat disimpan' : ''}</small></DropZone>}
          </div>
        </section>

        <section className="pe-card" id="tautan"><header><span>04</span><div><h2>Tautan &amp; alat</h2><p>Perangkat yang dipakai dan tautan ke hasil karyamu.</p></div></header>
          <div className="pe-field"><div className="pe-label"><label htmlFor="pw-tools">Perangkat &amp; teknologi</label><span className="pe-count">{toolList.length} dipilih</span></div>
            <div className="pe-tags" onClick={(event) => event.currentTarget.querySelector('input')?.focus()}>
              {tools.map((tool, index) => <span className="pe-tag" key={`${tool}-${index}`}>{tool}<button type="button" aria-label={`Hapus ${tool}`} onClick={() => setTools((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>)}
              <input id="pw-tools" value={toolInput} maxLength={40} onChange={(event) => { const parts = event.target.value.split(/[\n,]/); if (parts.length > 1) addTools(parts.slice(0, -1).join(',')); setToolInput(parts[parts.length - 1] || '') }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTools(toolInput); setToolInput('') } else if (event.key === 'Backspace' && !toolInput && tools.length) setTools((current) => current.slice(0, -1)) }} onBlur={() => { addTools(toolInput); setToolInput('') }} placeholder={tools.length ? 'Tambah lagi…' : 'Ketik lalu tekan Enter atau koma'} />
            </div>
            <div className="pe-suggest"><span>Saran:</span>{toolSuggestions.filter((item) => !tools.some((tool) => tool.toLocaleLowerCase() === item.toLocaleLowerCase())).slice(0, 7).map((item) => <button type="button" key={item} onClick={() => addTools(item)}>+ {item}</button>)}</div></div>
          <div className="pe-field"><div className="pe-label"><label htmlFor="pw-url">Tautan karya</label>{url.trim() && <span className={`pe-count${urlValid ? '' : ' is-warn'}`}>{urlValid ? 'Format valid' : 'Awali dengan https://'}</span>}</div>
            <input id="pw-url" className={`pe-input${urlValid ? '' : ' pw-invalid'}`} type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /><p className="pe-hint">Prototipe, situs, repositori, atau demo jika tersedia.</p></div>
        </section>
      </form>

      <aside className="pe-side" aria-label="Pratinjau dan kelengkapan">
        <span className="pe-side-label">Pratinjau kartu</span>
        <article className="kr-card pw-preview">
          <div className="kr-media">{coverShown ? <img src={coverShown} alt="" /> : <span className="kr-placeholder">Belum ada sampul</span>}
            <span className="kr-category">{category?.name || 'Kategori'}{year ? ` · ${year}` : ''}</span></div>
          <div className="kr-body"><h3>{title.trim() || 'Judul karyamu'}</h3>{summary.trim() ? <p className="kr-summary">{summary.trim()}</p> : <p className="kr-summary pw-ghost-text">Ringkasan karya akan tampil di sini.</p>}</div>
        </article>
        <section className="pe-progress">
          <div className="pe-ring" style={{ ['--p' as string]: `${percent}%` }} role="img" aria-label={`Kelengkapan karya ${percent} persen`}><b>{percent}%</b></div>
          <div><strong>{percent === 100 ? 'Siap diajukan' : readyToSubmit ? 'Sudah bisa diajukan' : 'Kelengkapan karya'}</strong>
            {nextTodo ? <button type="button" className="pe-link" onClick={() => jump(nextTodo.id)}>Berikutnya: {nextTodo.label} →</button> : <small>Semua bagian sudah terisi.</small>}</div>
        </section>
        <ul className="pe-checklist">{checklist.map((item) => <li key={item.label} className={item.done ? 'is-done' : ''}><button type="button" onClick={() => jump(item.id)}><span aria-hidden="true">{item.done ? '✓' : '○'}</span>{item.label}{item.required && !item.done && <em>wajib</em>}</button></li>)}</ul>
        <p className="pw-note">{submitNote}</p>
      </aside>
    </div>

    <div className="pe-savebar is-visible pw-actionbar" role="region" aria-label="Simpan karya">
      <span>{dirty ? <><i aria-hidden="true" />Perubahan belum disimpan</> : <>{work ? 'Tersimpan' : 'Belum ada perubahan'}</>}</span>
      <div>
        <Link className="pe-ghost" href="/portal/siswa/karya">Keluar</Link>
        {state === 'submitted'
          ? <button type="button" className="pe-save" onClick={() => void save(false)} disabled={busy !== null || !dirty}>{busy ? 'Menyimpan…' : 'Simpan perubahan'}</button>
          : <><button type="button" className="pe-ghost" onClick={() => void save(false)} disabled={busy !== null}>{busy === 'draft' ? 'Menyimpan…' : state === 'published' ? 'Simpan sebagai draf' : 'Simpan draf'}</button>
            <button type="button" className="pe-save" onClick={() => void save(true)} disabled={busy !== null} title={readyToSubmit ? undefined : 'Lengkapi kategori dan ringkasan dulu'}>{busy === 'submit' ? 'Mengirim…' : state === 'revision' ? 'Ajukan ulang' : state === 'published' ? 'Simpan & ajukan ulang' : 'Ajukan verifikasi'}</button></>}
      </div>
    </div>
    {toast && <p className="pe-toast" role="status">{toast}</p>}
  </main>
}
