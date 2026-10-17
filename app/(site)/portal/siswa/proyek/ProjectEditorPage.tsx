'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import PortfolioDetailEditor from '../../../../../components/PortfolioDetailEditor'
import { DropZone, IMAGE_TYPES, TagField } from '../../../../../components/EditorParts'
import { siteFetch } from '../../../../../lib/siteFetch'
import type { ProjectEditorData, ProjectMentorOption, ProjectStudentOption } from './editorData'
import '../profil/profile-editor.css'
import '../karya/portfolio-wizard.css'
import './project-wizard.css'

type Props = { userID: string | number; students: ProjectStudentOption[]; teachers: ProjectMentorOption[]; categories: Array<{ id: string | number; name: string }>; project?: ProjectEditorData | null; notice?: string }
type Member = { member: string | number; contribution: string }
type MentorAssignment = { mentor: string | number; assignmentRole: 'primary' | 'supporting'; response: 'invited' | 'accepted' | 'declined' }

const TITLE_MAX = 160
const SUMMARY_MAX = 800
const roleSuggestions = ['Inisiator', 'UI/UX Designer', 'Frontend', 'Backend', 'Riset', 'Dokumentasi', 'Presentasi', 'Quality Assurance']
const toolSuggestions = ['Figma', 'React', 'Next.js', 'Laravel', 'Flutter', 'Arduino', 'Canva', 'Blender', 'Premiere Pro', 'Cisco Packet Tracer']
const sections = [{ id: 'dasar', label: 'Informasi' }, { id: 'tim', label: 'Tim' }, { id: 'mentor', label: 'Pembimbing' }, { id: 'media', label: 'Detail & media' }, { id: 'tautan', label: 'Alat & tautan' }]
const responseLabel = { accepted: 'Diterima', declined: 'Ditolak', invited: 'Menunggu jawaban' } as const

function Avatar({ name, photo, size = 40 }: { name: string; photo?: string | null; size?: number }) {
  return <span className="pj-av" style={{ width: size, height: size, fontSize: size * 0.4 }}>{photo ? <img src={photo} alt="" loading="lazy" /> : name.slice(0, 1).toUpperCase()}</span>
}

function PersonPicker<T extends { id: string | number; name: string; photo: string | null }>({ title, people, hint, onPick, onClose, meta }: { title: string; people: T[]; hint?: string; onPick: (person: T) => void; onClose: () => void; meta: (person: T) => string }) {
  const [query, setQuery] = useState('')
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey) }, [onClose])
  const shown = people.filter((person) => !query.trim() || person.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 40)
  return <div className="pj-modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="pj-modal" role="dialog" aria-modal="true" aria-label={title}>
    <header><h2>{title}</h2><button type="button" aria-label="Tutup" onClick={onClose}>×</button></header>
    {hint && <p className="pj-modal-hint">{hint}</p>}
    <label className="pj-search"><span className="sr-only">Cari nama</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama…" /></label>
    <ul>{shown.length ? shown.map((person) => <li key={person.id}><button type="button" onClick={() => onPick(person)}><Avatar name={person.name} photo={person.photo} size={40} /><span><strong>{person.name}</strong><small>{meta(person)}</small></span><i aria-hidden="true">+</i></button></li>) : <li className="pj-empty">Tidak ada hasil.</li>}</ul>
  </div></div>
}

export default function ProjectEditorPage({ userID, students, teachers, categories, project = null, notice: initialNotice = '' }: Props) {
  const router = useRouter()
  const initialCategory = String(project?.categoryRef || '')
  const [title, setTitle] = useState(project?.title || '')
  const [categoryID, setCategoryID] = useState(initialCategory)
  const [year, setYear] = useState(String(project?.year || new Date().getFullYear()))
  const [summary, setSummary] = useState(project?.summary || '')
  const [details, setDetails] = useState<SerializedEditorState | null>(project?.details || null)
  const [members, setMembers] = useState<Member[]>(project?.members || [{ member: userID, contribution: 'Inisiator' }])
  const [mentorAssignments, setMentorAssignments] = useState<MentorAssignment[]>(project?.mentorAssignments || [])
  const [tools, setTools] = useState<string[]>(project?.tools || [])
  const [url, setUrl] = useState(project?.projectUrl || '')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [removeCover, setRemoveCover] = useState(false)
  const [removedGallery, setRemovedGallery] = useState<string[]>([])
  const [newGallery, setNewGallery] = useState<{ file: File; preview: string }[]>([])
  const [picker, setPicker] = useState<null | 'member' | 'mentor'>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(initialNotice)
  const [active, setActive] = useState('dasar')
  const [detailsDirty, setDetailsDirty] = useState(false)
  const detailsSeen = useRef(false)
  const serialize = () => JSON.stringify([title, categoryID, year, summary, members, mentorAssignments, tools, url])
  const [baseline, setBaseline] = useState(() => JSON.stringify([project?.title || '', initialCategory, String(project?.year || new Date().getFullYear()), project?.summary || '', project?.members || [{ member: userID, contribution: 'Inisiator' }], project?.mentorAssignments || [], project?.tools || [], project?.projectUrl || '']))

  const leavesReview = Boolean(project && (project.status === 'published' || ['submitted', 'verified', 'revision-requested'].includes(String(project.verificationStatus))))
  const existingGallery = useMemo(() => (project?.galleryImages || []), [project])
  const coverShown = removeCover ? '' : coverPreview || project?.coverImage?.url || ''
  const category = categories.find((item) => String(item.id) === categoryID)
  const urlValid = !url.trim() || /^https?:\/\/\S+\.\S+/i.test(url.trim())
  const dirty = serialize() !== baseline || detailsDirty || Boolean(coverFile || removeCover || removedGallery.length || newGallery.length)
  const studentByID = useMemo(() => new Map(students.map((student) => [String(student.id), student])), [students])
  const teacherByID = useMemo(() => new Map(teachers.map((teacher) => [String(teacher.id), teacher])), [teachers])
  const galleryCount = existingGallery.filter((image) => !removedGallery.includes(String(image.id))).length + newGallery.length
  const rolesMissing = members.some((item) => !item.contribution.trim())

  const checklist = [
    { id: 'dasar', done: Boolean(title.trim()), label: 'Nama proyek', required: true },
    { id: 'dasar', done: Boolean(categoryID), label: 'Kategori', required: false },
    { id: 'dasar', done: summary.trim().length >= 40, label: 'Ringkasan (min. 40 karakter)', required: false },
    { id: 'tim', done: members.length > 1 && !rolesMissing, label: 'Tim ≥ 2 orang dengan peran', required: false },
    { id: 'mentor', done: mentorAssignments.length > 0, label: 'Undang guru pembimbing', required: false },
    { id: 'media', done: Boolean(coverShown), label: 'Gambar sampul', required: false },
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
  function pickGallery(files: File[]) { const valid = files.filter((file) => IMAGE_TYPES.test(file.type)); setError(valid.length !== files.length ? 'Sebagian berkas dilewati. Galeri hanya menerima JPG, PNG, atau WebP.' : ''); setNewGallery((current) => [...current, ...valid.map((file) => ({ file, preview: URL.createObjectURL(file) }))]) }
  async function upload(file: File, alt: string) {
    const form = new FormData(); form.append('file', file); form.append('alt', alt)
    const response = await siteFetch('/api/uploads', { method: 'POST', body: form })
    const result = await response.json()
    if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Unggahan belum berhasil.')
    return result.doc?.id as string | number
  }

  async function save() {
    const cleanTitle = title.trim()
    if (!cleanTitle) { setError('Isi nama proyek terlebih dahulu.'); jump('dasar'); return }
    if (!members.length || rolesMissing) { setError('Isi peran atau kontribusi setiap anggota tim.'); jump('tim'); return }
    if (!urlValid) { setError('Tautan proyek harus diawali http:// atau https://'); jump('tautan'); return }
    setBusy(true); setError(''); setToast('')
    try {
      const coverUploadID = coverFile ? await upload(coverFile, `Sampul proyek ${cleanTitle}`) : undefined
      const coverID = coverUploadID !== undefined ? coverUploadID : removeCover ? null : project?.coverImage?.id || null
      const removed = new Set(removedGallery)
      const galleryIDs = existingGallery.filter((item) => !removed.has(String(item.id))).map((item) => item.id)
      for (const item of newGallery) galleryIDs.push(await upload(item.file, `Galeri proyek ${cleanTitle}`))
      const data = {
        title: cleanTitle, summary: summary.trim(), details: details || undefined,
        categoryRef: categories.find((item) => String(item.id) === categoryID)?.id ?? null,
        members: members.map((item) => ({ member: item.member, contribution: item.contribution.trim() })),
        mentorAssignments: mentorAssignments.map((item) => ({ ...item })),
        coverImage: coverID, galleryImages: galleryIDs, year: Number(year), tools, projectUrl: url.trim() || null,
      }
      const response = await siteFetch(project ? `/api/projects/${project.id}?depth=2` : '/api/projects?depth=2', { method: project ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Proyek belum berhasil disimpan.')
      setBaseline(serialize()); setDetailsDirty(false); setCoverFile(null); setNewGallery([])
      if (!project) router.replace(`/portal/siswa/proyek/${result.doc?.id}/edit?saved=draft`)
      else { setToast('Draf tersimpan ✓ Ajukan verifikasi dari halaman proyek setelah mentor utama menerima undangan.'); router.refresh() }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Proyek belum berhasil disimpan.') }
    finally { setBusy(false) }
  }

  const availableStudents = students.filter((student) => !members.some((item) => String(item.member) === String(student.id)))
  const availableTeachers = teachers.filter((teacher) => !mentorAssignments.some((item) => String(item.mentor) === String(teacher.id)))
  const setRole = (index: number, role: 'primary' | 'supporting') => setMentorAssignments((items) => items.map((item, itemIndex) => ({ ...item, assignmentRole: itemIndex === index ? role : role === 'primary' ? 'supporting' : item.assignmentRole })))

  return <main className="portal-page pe-page pw-page pj-page">
    <nav className="portfolio-form-breadcrumb" aria-label="Breadcrumb"><Link href="/portal/siswa">Portal siswa</Link><span>/</span><Link href="/portal/siswa/proyek">Proyek saya</Link><span>/</span><span>{project ? 'Edit proyek' : 'Proyek baru'}</span></nav>
    <header className="pe-head"><div><span className="section-kicker">KARYA KOLABORATIF</span><h1>{project ? 'Edit proyek' : 'Buat proyek kolaborasi'}</h1><p>Atur tim, peran, dan pembimbing agar kontribusi setiap siswa terlihat jelas.</p></div>
      <div className="pe-head-actions">{project && <Link className="pe-ghost" href={`/portal/siswa/tracker/${project.id}`}>📋 Tracker</Link>}<Link className="pe-ghost" href="/portal/siswa/proyek">← Daftar proyek</Link></div></header>

    <div className="pe-layout">
      <form className="pe-form" onSubmit={(event) => event.preventDefault()} noValidate>
        <nav className="pe-steps" aria-label="Bagian formulir">{sections.map((section, index) => <button type="button" key={section.id} className={active === section.id ? 'is-active' : ''} aria-current={active === section.id ? 'step' : undefined} onClick={() => jump(section.id)}><b>{index + 1}</b>{section.label}</button>)}</nav>
        {error && <p className="pe-error" role="alert">{error}</p>}

        <section className="pe-card" id="dasar"><header><span>01</span><div><h2>Informasi proyek</h2><p>Jelaskan hasil kolaborasi dan pilih kategorinya.</p></div></header>
          <div className="pe-field"><div className="pe-label"><label htmlFor="pj-title">Nama proyek <i>*</i></label><span className="pe-count">{title.length}/{TITLE_MAX}</span></div><input id="pj-title" className="pe-input pw-title" value={title} maxLength={TITLE_MAX} autoFocus={!project} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Aplikasi Jelajah Kota" /></div>
          <div className="pe-field"><div className="pe-label"><span id="pj-cat" className="pw-fake-label">Kategori</span></div><div className="pw-cats" role="radiogroup" aria-labelledby="pj-cat">{categories.map((item) => <button type="button" role="radio" aria-checked={categoryID === String(item.id)} key={item.id} className={categoryID === String(item.id) ? 'is-active' : ''} onClick={() => setCategoryID(categoryID === String(item.id) ? '' : String(item.id))}>{item.name}</button>)}</div></div>
          <div className="pw-row"><div className="pe-field"><div className="pe-label"><label htmlFor="pj-year">Tahun</label></div><div className="pw-stepper"><button type="button" aria-label="Kurangi tahun" onClick={() => setYear(String(Math.max(2000, Number(year || new Date().getFullYear()) - 1)))}>−</button><input id="pj-year" className="pe-input" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, '').slice(0, 4))} /><button type="button" aria-label="Tambah tahun" onClick={() => setYear(String(Math.min(new Date().getFullYear() + 1, Number(year || new Date().getFullYear()) + 1)))}>+</button></div></div></div>
          <div className="pe-field"><div className="pe-label"><label htmlFor="pj-summary">Ringkasan</label><span className={`pe-count${summary.length > SUMMARY_MAX - 60 ? ' is-warn' : ''}`}>{summary.length}/{SUMMARY_MAX}</span></div><textarea id="pj-summary" className="pe-input pe-textarea" rows={5} maxLength={SUMMARY_MAX} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Apa yang dibuat tim, untuk siapa, dan apa hasilnya?" /><div className="pe-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, (summary.length / SUMMARY_MAX) * 100)}%` }} /></div></div>
        </section>

        <section className="pe-card" id="tim"><header><span>02</span><div><h2>Tim dan kontribusi</h2><p>Tambahkan siswa lain dan jelaskan peran masing-masing. Peran terlihat di halaman proyek.</p></div></header>
          <ul className="pj-team">{members.map((item, index) => { const student = studentByID.get(String(item.member)); const you = String(item.member) === String(userID); return <li key={`${item.member}-${index}`}>
            <Avatar name={student?.name || 'Siswa'} photo={student?.photo} size={48} />
            <div className="pj-team-main"><div className="pj-team-name"><strong>{student?.name || 'Siswa'}</strong>{you && <em>Kamu</em>}{student?.className && <small>{student.className}</small>}</div>
              <input className={`pe-input${!item.contribution.trim() ? ' pw-invalid' : ''}`} value={item.contribution} maxLength={120} aria-label={`Peran ${student?.name || 'anggota'}`} onChange={(event) => setMembers((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, contribution: event.target.value } : entry))} placeholder="Peran atau kontribusi, mis. UI/UX designer" />
              <div className="pj-roles">{roleSuggestions.filter((role) => role !== item.contribution).slice(0, 5).map((role) => <button type="button" key={role} onClick={() => setMembers((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, contribution: role } : entry))}>{role}</button>)}</div></div>
            {!you && <button className="pj-remove" type="button" aria-label={`Keluarkan ${student?.name || 'anggota'}`} onClick={() => setMembers((current) => current.filter((_, entryIndex) => entryIndex !== index))}>×</button>}</li> })}</ul>
          <button type="button" className="pe-add" onClick={() => setPicker('member')} disabled={!availableStudents.length}>+ Tambah anggota</button>
        </section>

        <section className="pe-card" id="mentor"><header><span>03</span><div><h2>Guru pembimbing</h2><p>Undang guru sesuai bidang proyek. Undangan harus diterima sebelum proyek diajukan untuk verifikasi.</p></div></header>
          {mentorAssignments.length ? <ul className="pj-team">{mentorAssignments.map((assignment, index) => { const teacher = teacherByID.get(String(assignment.mentor)); return <li key={assignment.mentor}>
            <Avatar name={teacher?.name || 'Guru'} photo={teacher?.photo} size={48} />
            <div className="pj-team-main"><div className="pj-team-name"><strong>{teacher?.name || 'Guru'}</strong><span className={`pj-resp pj-resp--${assignment.response}`}>{responseLabel[assignment.response]}</span></div>
              {teacher?.skills.length ? <div className="pj-skills">{teacher.skills.slice(0, 4).map((skill) => <span key={skill}>{skill}</span>)}</div> : null}
              <div className="pj-seg" role="group" aria-label={`Peran pembimbing ${teacher?.name || ''}`}><button type="button" aria-pressed={assignment.assignmentRole === 'primary'} className={assignment.assignmentRole === 'primary' ? 'is-on' : ''} onClick={() => setRole(index, 'primary')}>Mentor utama <small>keputusan akhir</small></button><button type="button" aria-pressed={assignment.assignmentRole === 'supporting'} className={assignment.assignmentRole === 'supporting' ? 'is-on' : ''} onClick={() => setRole(index, 'supporting')}>Pendamping <small>memberi masukan</small></button></div></div>
            <button className="pj-remove" type="button" aria-label={`Batalkan undangan ${teacher?.name || 'guru'}`} onClick={() => setMentorAssignments((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button></li> })}</ul>
            : <p className="pj-note">Belum ada guru yang diundang. Pilih guru yang relevan dengan bidang proyekmu.</p>}
          <button type="button" className="pe-add" onClick={() => setPicker('mentor')} disabled={!availableTeachers.length}>+ Undang guru</button>
        </section>

        <section className="pe-card" id="media"><header><span>04</span><div><h2>Detail dan media</h2><p>Tambahkan proses, sampul, dan dokumentasi hasil kerja.</p></div></header>
          <PortfolioDetailEditor initialValue={project?.details} onChange={(value) => { setDetails(value); if (detailsSeen.current) setDetailsDirty(true); else detailsSeen.current = true }} />
          <div className="pe-field"><div className="pe-label"><span className="pw-fake-label">Gambar sampul</span><span className="pe-count">Rasio 4:3 disarankan</span></div>
            {coverShown ? <div className="pw-cover"><img src={coverShown} alt="Pratinjau sampul" /><div className="pw-cover-actions"><DropZone accept="image/jpeg,image/png,image/webp" onFiles={pickCover} className="pw-inline" label="Ganti gambar sampul"><span>Ganti</span></DropZone><button type="button" onClick={() => { setRemoveCover(true); setCoverFile(null); setCoverPreview('') }}>Hapus</button></div></div>
              : <DropZone accept="image/jpeg,image/png,image/webp" onFiles={pickCover} className="pw-cover-drop" label="Pilih gambar sampul"><span className="pw-drop-icon" aria-hidden="true">🖼️</span><strong>Seret gambar sampul ke sini</strong><small>atau klik untuk memilih · JPG, PNG, WebP</small></DropZone>}</div>
          <div className="pe-field"><div className="pe-label"><span className="pw-fake-label">Galeri proyek</span><span className="pe-count">{galleryCount} gambar</span></div>
            <div className="pw-gallery">
              {existingGallery.filter((image) => !removedGallery.includes(String(image.id))).map((image) => <figure key={image.id}><img src={image.url || ''} alt={image.alt || image.filename || 'Gambar galeri'} /><button type="button" aria-label="Hapus gambar galeri" onClick={() => setRemovedGallery((current) => [...current, String(image.id)])}>×</button></figure>)}
              {newGallery.map((item, index) => <figure key={item.preview} className="is-new"><img src={item.preview} alt={`Gambar baru ${index + 1}`} /><span>Baru</span><button type="button" aria-label="Hapus gambar baru" onClick={() => setNewGallery((current) => current.filter((entry) => entry.preview !== item.preview))}>×</button></figure>)}
              <DropZone accept="image/jpeg,image/png,image/webp" multiple onFiles={pickGallery} className="pw-add" label="Tambah gambar galeri"><span aria-hidden="true">+</span><small>Tambah</small></DropZone></div></div>
        </section>

        <section className="pe-card" id="tautan"><header><span>05</span><div><h2>Alat &amp; tautan</h2><p>Perangkat yang dipakai dan tautan ke hasil proyek.</p></div></header>
          <TagField id="pj-tools" label="Perangkat & teknologi" values={tools} onChange={setTools} suggestions={toolSuggestions} placeholder="Ketik lalu tekan Enter atau koma" />
          <div className="pe-field"><div className="pe-label"><label htmlFor="pj-url">Tautan hasil proyek</label>{url.trim() && <span className={`pe-count${urlValid ? '' : ' is-warn'}`}>{urlValid ? '✓ Format valid' : 'Awali dengan https://'}</span>}</div><input id="pj-url" className={`pe-input${urlValid ? '' : ' pw-invalid'}`} type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></div>
        </section>
      </form>

      <aside className="pe-side" aria-label="Pratinjau dan kelengkapan">
        <span className="pe-side-label">Pratinjau kartu</span>
        <article className="kr-card pw-preview"><div className="kr-media">{coverShown ? <img src={coverShown} alt="" /> : <span className="kr-placeholder">Belum ada sampul</span>}<span className="kr-category">{category?.name || 'Kategori'}{year ? ` · ${year}` : ''}</span></div>
          <div className="kr-body"><h3>{title.trim() || 'Nama proyekmu'}</h3>{summary.trim() ? <p className="kr-summary">{summary.trim()}</p> : <p className="kr-summary pw-ghost-text">Ringkasan proyek akan tampil di sini.</p>}
            <div className="pj-prev-team">{members.slice(0, 4).map((item) => { const student = studentByID.get(String(item.member)); return <Avatar key={String(item.member)} name={student?.name || 'S'} photo={student?.photo} size={28} /> })}<span>{members.length} anggota</span></div></div></article>
        <section className="pe-progress"><div className="pe-ring" style={{ ['--p' as string]: `${percent}%` }} role="img" aria-label={`Kelengkapan proyek ${percent} persen`}><b>{percent}%</b></div><div><strong>{percent === 100 ? 'Siap diajukan! 🎉' : 'Kelengkapan proyek'}</strong>{nextTodo ? <button type="button" className="pe-link" onClick={() => jump(nextTodo.id)}>Berikutnya: {nextTodo.label} →</button> : <small>Semua bagian sudah terisi.</small>}</div></section>
        <ul className="pe-checklist">{checklist.map((item) => <li key={item.label} className={item.done ? 'is-done' : ''}><button type="button" onClick={() => jump(item.id)}><span aria-hidden="true">{item.done ? '✓' : '○'}</span>{item.label}{item.required && !item.done && <em>wajib</em>}</button></li>)}</ul>
        <p className="pw-note">{leavesReview ? 'Menyimpan perubahan membatalkan pengajuan sebelumnya. Ajukan ulang dari halaman proyek agar mentor utama meninjaunya lagi.' : 'Draf hanya terlihat oleh anggota tim. Cukup isi nama proyek dulu; ringkasan wajib saat proyek diajukan untuk verifikasi, setelah mentor utama menerima undangan.'}</p>
      </aside>
    </div>

    <div className="pe-savebar is-visible pw-actionbar" role="region" aria-label="Simpan proyek">
      <span>{dirty ? <><i aria-hidden="true" />Perubahan belum disimpan</> : <>✓ {project ? 'Tersimpan' : 'Belum ada perubahan'}</>}</span>
      <div><Link className="pe-ghost" href="/portal/siswa/proyek">Keluar</Link><button type="button" className="pe-save" onClick={() => void save()} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan draf'}</button></div>
    </div>
    {picker === 'member' && <PersonPicker title="Tambah anggota tim" people={availableStudents} meta={(person) => person.className || 'Siswa'} onClose={() => setPicker(null)} onPick={(person) => { setMembers((current) => [...current, { member: person.id, contribution: '' }]); setPicker(null) }} />}
    {picker === 'mentor' && <PersonPicker title="Undang guru pembimbing" hint="Guru akan menerima undangan dan bisa menerima atau menolaknya." people={availableTeachers} meta={(person) => person.skills.length ? person.skills.slice(0, 3).join(' · ') : 'Guru'} onClose={() => setPicker(null)} onPick={(person) => { setMentorAssignments((items) => [...items, { mentor: person.id, assignmentRole: items.length ? 'supporting' : 'primary', response: 'invited' }]); setPicker(null) }} />}
    {toast && <p className="pe-toast" role="status">{toast}</p>}
  </main>
}
