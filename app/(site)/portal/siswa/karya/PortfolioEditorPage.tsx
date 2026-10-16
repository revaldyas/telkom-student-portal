'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import PortfolioDetailEditor from '../../../../../components/PortfolioDetailEditor'
import { siteFetch } from '../../../../../lib/siteFetch'

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
}

type Props = { categories: PortfolioEditorCategory[]; work?: PortfolioEditorWork | null }
const relationID = (value: PortfolioEditorWork['coverImage']) => value && typeof value === 'object' ? value.id : typeof value === 'string' || typeof value === 'number' ? value : undefined

export default function PortfolioEditorPage({ categories, work = null }: Props) {
  const router = useRouter()
  const [details, setDetails] = useState<SerializedEditorState | null>(work?.details || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [coverPreview, setCoverPreview] = useState('')
  const [tools, setTools] = useState<string[]>(work?.tools || [])
  const [toolInput, setToolInput] = useState('')

  function addTools(value: string) {
    const additions = value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
    if (!additions.length) return
    setTools((current) => {
      const seen = new Set(current.map((item) => item.toLocaleLowerCase()))
      return [...current, ...additions.filter((item) => {
        const key = item.toLocaleLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })]
    })
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') || '').trim()
    const categoryRef = String(form.get('categoryRef') || '')
    const summary = String(form.get('summary') || '').trim()
    const coverFile = form.get('coverImage')
    const projectFile = form.get('projectFile')
    if (!title || !categoryRef || !summary) {
      setError('Lengkapi judul, kategori, dan ringkasan karya terlebih dahulu.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const coverID = coverFile instanceof File && coverFile.size
        ? await uploadFile(coverFile, `Gambar sampul ${title}`)
        : form.get('removeCover') === 'on' ? null : relationID(work?.coverImage)
      const evidenceID = projectFile instanceof File && projectFile.size
        ? await uploadFile(projectFile, `Bukti karya ${title}`)
        : form.get('removeProjectFile') === 'on' ? null : relationID(work?.projectFile)
      const removedGalleryIDs = new Set(form.getAll('removeGalleryImage').map(String))
      const galleryIDs = (work?.galleryImages || []).flatMap((image) => image.id !== undefined && !removedGalleryIDs.has(String(image.id)) ? [image.id] : [])
      for (const file of form.getAll('galleryImages')) {
        if (file instanceof File && file.size) galleryIDs.push(await uploadFile(file, `Galeri karya ${title}`))
      }
      const data = {
        title,
        categoryRef: categories.find((category) => String(category.id) === categoryRef)?.id ?? categoryRef,
        summary,
        details: details || undefined,
        coverImage: coverID,
        galleryImages: galleryIDs,
        projectFile: evidenceID,
        year: Number(form.get('year')),
        tools: [...tools, ...toolInput.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)].filter((item, index, all) => all.findIndex((candidate) => candidate.toLocaleLowerCase() === item.toLocaleLowerCase()) === index),
        projectUrl: String(form.get('projectUrl') || '').trim() || null,
      }
      const response = await siteFetch(work ? `/api/portfolios/${work.id}?depth=2` : '/api/portfolios?depth=2', {
        method: work ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(work ? data : { ...data, status: 'draft' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Karya belum berhasil disimpan.')
      router.push('/portal/siswa/karya')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Karya belum berhasil disimpan.')
    } finally {
      setBusy(false)
    }
  }

  const cover = work?.coverImage && typeof work.coverImage === 'object' ? work.coverImage : null
  const evidence = work?.projectFile && typeof work.projectFile === 'object' ? work.projectFile : null
  const gallery = work?.galleryImages || []
  const categoryID = work?.categoryRef && typeof work.categoryRef === 'object' ? work.categoryRef.id : work?.categoryRef

  return <main className="portal-page portfolio-form-page">
    <nav className="portfolio-form-breadcrumb" aria-label="Breadcrumb"><Link href="/portal/siswa">Portal siswa</Link><span>/</span><Link href="/portal/siswa/karya">Karya saya</Link><span>/</span><span>{work ? 'Edit karya' : 'Karya baru'}</span></nav>
    <header className="portal-page-heading portfolio-form-heading"><div><span className="section-kicker">RUANG KARYA SISWA</span><h1>{work ? 'Edit karya' : 'Buat karya baru'}</h1><p>{work ? 'Perbarui informasi dan kirim perubahan untuk ditinjau kembali.' : 'Lengkapi informasi dan detail proses agar Guru dapat meninjau karyamu.'}</p></div><Link className="button impact-secondary" href="/portal/siswa/karya">Kembali ke daftar</Link></header>
    <form className="portfolio-create-form" onSubmit={submit}>
      {error && <p className="portfolio-form-error" role="alert">{error}</p>}
      <section className="portfolio-form-section"><div className="portfolio-form-section-heading"><span>01</span><div><h2>Informasi dasar</h2><p>Judul dan kategori membantu orang menemukan karya.</p></div></div>
        <div className="portfolio-form-grid"><label className="portfolio-form-field portfolio-form-field--wide"><span>Judul karya <i>*</i></span><input name="title" required maxLength={160} defaultValue={work?.title || ''} placeholder="Contoh: Identitas Visual Festival Kota" /></label>
          <label className="portfolio-form-field"><span>Kategori <i>*</i></span><select name="categoryRef" required defaultValue={String(categoryID || '')}><option value="" disabled>Pilih kategori karya</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="portfolio-form-field"><span>Tahun karya <i>*</i></span><input name="year" type="number" min="2000" max={new Date().getFullYear() + 1} required defaultValue={work?.year || new Date().getFullYear()} /></label>
          <label className="portfolio-form-field portfolio-form-field--wide"><span>Ringkasan karya <i>*</i></span><textarea name="summary" required maxLength={800} rows={4} defaultValue={work?.summary || ''} placeholder="Jelaskan karya ini secara singkat: masalah yang dijawab, tujuan, atau hasil utamanya." /><small>Ringkasan tampil pada kartu dan bagian awal halaman karya.</small></label>
        </div>
      </section>

      <section className="portfolio-form-section"><div className="portfolio-form-section-heading"><span>02</span><div><h2>Detail dan proses</h2><p>Gunakan editor blok untuk menjelaskan proses, keputusan desain, tantangan, dan hasil.</p></div></div>
        <PortfolioDetailEditor initialValue={work?.details} onChange={setDetails} />
      </section>

      <section className="portfolio-form-section"><div className="portfolio-form-section-heading"><span>03</span><div><h2>Media dan tautan</h2><p>Tambahkan visual utama dan bukti atau tautan untuk memperlihatkan hasilnya.</p></div></div>
        <div className="portfolio-form-grid">
          <div className="portfolio-form-field portfolio-form-field--wide"><span>Gambar sampul</span>{coverPreview ? <img className="portfolio-form-cover-preview" src={coverPreview} alt="Pratinjau gambar sampul pilihan" /> : cover?.url && <img className="portfolio-form-cover-preview" src={cover.url} alt={cover.filename || `Sampul ${work?.title}`} />}
            <input name="coverImage" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; setCoverPreview(file ? URL.createObjectURL(file) : '') }} />
            <small>Format JPG, PNG, atau WebP. Gambar akan dikompresi saat diunggah.</small>
            {cover && <label className="portfolio-form-remove"><input name="removeCover" type="checkbox" /> Hapus gambar sampul saat ini</label>}
          </div>
          <div className="portfolio-form-field portfolio-form-field--wide"><span>Galeri karya</span>
            {gallery.length > 0 && <div className="portfolio-form-gallery">{gallery.map((item) => <label className="portfolio-form-gallery-item" key={item.id}><img src={item.url || ''} alt={item.alt || item.filename || 'Gambar galeri karya'} /><span><input name="removeGalleryImage" type="checkbox" value={String(item.id)} /> Hapus gambar</span></label>)}</div>}
            <input name="galleryImages" type="file" accept="image/jpeg,image/png,image/webp" multiple />
            <small>Unggah beberapa gambar untuk ditampilkan di halaman detail karya. Format JPG, PNG, atau WebP; gambar akan dikompresi saat diunggah.</small>
          </div>
          <div className="portfolio-form-field portfolio-form-field--wide"><span>Video atau dokumen pendukung</span>
            {evidence?.url && <a className="portfolio-form-current-file" href={evidence.url} target="_blank" rel="noreferrer">Buka berkas saat ini · {evidence.filename || 'berkas karya'} ↗</a>}
            <input name="projectFile" type="file" accept="video/mp4,video/webm,application/pdf" />
            <small>Opsional. Unggah video MP4/WebM atau dokumen PDF sebagai bukti karya.</small>
            {evidence && <label className="portfolio-form-remove"><input name="removeProjectFile" type="checkbox" /> Hapus berkas saat ini</label>}
          </div>
          <div className="portfolio-form-field"><span id="portfolio-tools-label">Perangkat & teknologi yang digunakan</span><div className="portfolio-tools-input" onClick={(event) => event.currentTarget.querySelector('input')?.focus()}>
            {tools.map((tool, index) => <span className="portfolio-tool-chip" key={`${tool}-${index}`}>{tool}<button type="button" aria-label={`Hapus ${tool}`} onClick={() => setTools((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>)}
            <input aria-labelledby="portfolio-tools-label" aria-describedby="portfolio-tools-help" value={toolInput} onChange={(event) => { const parts = event.target.value.split(/[\n,]/); if (parts.length > 1) addTools(parts.slice(0, -1).join(',')); setToolInput(parts[parts.length - 1] || '') }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTools(toolInput); setToolInput('') } else if (event.key === 'Backspace' && !toolInput && tools.length) setTools((current) => current.slice(0, -1)) }} onBlur={() => { addTools(toolInput); setToolInput('') }} placeholder="Ketik perangkat atau teknologi lalu tekan koma atau Enter" />
          </div><small id="portfolio-tools-help">Tekan koma atau Enter setelah setiap perangkat atau teknologi untuk membuat chip.</small></div>
          <label className="portfolio-form-field"><span>Tautan karya</span><input name="projectUrl" type="url" defaultValue={work?.projectUrl || ''} placeholder="https://…" /><small>Masukkan tautan prototipe, situs, atau demo jika tersedia.</small></label>
        </div>
      </section>

      <aside className="portfolio-form-submit-note"><strong>{work ? 'Perubahan dikirim untuk ditinjau' : 'Karya masuk ke proses verifikasi'}</strong><p>{work?.status === 'published' ? 'Karya akan kembali menjadi draf setelah perubahan disimpan dan perlu diverifikasi Guru sebelum terbit lagi.' : 'Setelah dikirim, Guru pembimbing akan meninjau karya dan memberi kabar jika ada bagian yang perlu diperbaiki.'}</p></aside>
      <footer className="portfolio-form-actions"><Link className="button impact-secondary" href="/portal/siswa/karya">Batal</Link><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Mengirim…' : 'Submit Karya'}</button></footer>
    </form>
  </main>
}
