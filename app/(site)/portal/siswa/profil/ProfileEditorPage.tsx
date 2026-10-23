'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import SkeletonImage from '../../../../../components/SkeletonImage'
import { siteFetch } from '../../../../../lib/siteFetch'
import { coverStyle, type Appearance } from '../../../../../lib/appearance'
import '../../../profile.css'
import './profile-editor.css'

type Profile = {
  id: string | number; name: string; bio: string
  interests: string[]; skills: string[]; experiences: string[]
  photoURL: string | null; className: string | null; programName: string | null
}
type Experience = { key: string; project: string; role: string; year: string }

const BIO_MAX = 300
const skillSuggestions = ['Figma', 'HTML & CSS', 'JavaScript', 'Photoshop', 'Illustrator', 'Video editing', 'Public speaking', 'Python', 'Jaringan', 'Fotografi']
const interestSuggestions = ['UI/UX', 'Web development', 'Desain grafis', 'Animasi', 'Game', 'Robotika', 'IoT', 'Keamanan siber', 'Konten kreator']
const sections = [
  { id: 'identitas', label: 'Identitas' }, { id: 'tentang', label: 'Tentang' }, { id: 'kompetensi', label: 'Kompetensi' }, { id: 'pengalaman', label: 'Pengalaman' },
]

let counter = 0
const nextKey = () => `exp-${Date.now()}-${counter++}`
/** "Aplikasi Kasir — UI designer, 2025" -> pecah menjadi tiga kolom. */
function parseExperience(line: string): Experience {
  const [project, rest = ''] = line.split(/\s+[—–-]\s+/, 2)
  const match = rest.match(/^(.*?)(?:,\s*(\d{4}))?$/)
  return { key: nextKey(), project: rest ? project : line, role: rest ? (match?.[1] || '').trim() : '', year: rest ? match?.[2] || '' : '' }
}
const formatExperience = (item: Experience) => {
  const project = item.project.trim()
  if (!project) return ''
  const tail = [item.role.trim(), item.year.trim()].filter(Boolean).join(', ')
  return tail ? `${project} — ${tail}` : project
}

function TagInput({ id, label, hint, values, onChange, suggestions, max, placeholder }: { id: string; label: string; hint: string; values: string[]; onChange: (next: string[]) => void; suggestions: string[]; max: number; placeholder: string }) {
  const [draft, setDraft] = useState('')
  const add = (raw: string) => {
    const items = raw.split(/[,\n]/).map((item) => item.trim().slice(0, 40)).filter(Boolean)
    if (!items.length) return
    const next = [...values]
    for (const item of items) if (next.length < max && !next.some((existing) => existing.toLowerCase() === item.toLowerCase())) next.push(item)
    onChange(next); setDraft('')
  }
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); add(draft) }
    else if (event.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1))
  }
  const available = suggestions.filter((item) => !values.some((value) => value.toLowerCase() === item.toLowerCase())).slice(0, 8)
  return <div className="pe-field">
    <div className="pe-label"><label htmlFor={id}>{label}</label><span className="pe-count">{values.length}/{max}</span></div>
    <div className="pe-tags" onClick={() => document.getElementById(id)?.focus()}>
      {values.map((value) => <span className="pe-tag" key={value}>{value}<button type="button" aria-label={`Hapus ${value}`} onClick={() => onChange(values.filter((item) => item !== value))}>×</button></span>)}
      {values.length < max && <input id={id} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKey} onBlur={() => add(draft)} placeholder={values.length ? 'Tambah lagi…' : placeholder} maxLength={40} />}
    </div>
    <p className="pe-hint">{hint}</p>
    {available.length > 0 && values.length < max && <div className="pe-suggest" aria-label="Saran"><span>Saran:</span>{available.map((item) => <button type="button" key={item} onClick={() => add(item)}>+ {item}</button>)}</div>}
  </div>
}

export default function ProfileEditorPage({ profile, appearance, role = 'student' }: { profile: Profile; appearance: Appearance; role?: 'student' | 'teacher' }) {
  const base = role === 'teacher' ? '/portal/guru' : '/portal/siswa'
  const publicHref = `${role === 'teacher' ? '/guru' : '/siswa'}/${profile.id}`
  const router = useRouter()
  const initial = useMemo(() => ({
    name: profile.name, bio: profile.bio, skills: profile.skills, interests: profile.interests,
    experiences: profile.experiences.map(parseExperience),
  }), [profile])
  const [name, setName] = useState(initial.name)
  const [bio, setBio] = useState(initial.bio)
  const [skills, setSkills] = useState(initial.skills)
  const [interests, setInterests] = useState(initial.interests)
  const [experiences, setExperiences] = useState<Experience[]>(initial.experiences)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [active, setActive] = useState('identitas')
  const [baseline, setBaseline] = useState(() => JSON.stringify({ name: initial.name, bio: initial.bio, skills: initial.skills, interests: initial.interests, experiences: initial.experiences.map(formatExperience) }))
  const fileRef = useRef<HTMLInputElement>(null)
  const photo = preview || profile.photoURL

  const experienceLines = experiences.map(formatExperience).filter(Boolean)
  const snapshot = JSON.stringify({ name, bio, skills, interests, experiences: experienceLines })
  const dirty = snapshot !== baseline || Boolean(photoFile)

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

  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer) }, [toast])

  const choosePhoto = useCallback((file: File | null | undefined) => {
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError('Foto harus berformat JPG, PNG, atau WebP.'); return }
    if (file.size > 8 * 1024 * 1024) { setError('Ukuran foto maksimal 8 MB.'); return }
    setError(''); setPhotoFile(file); setPreview(URL.createObjectURL(file))
  }, [])

  const checklist = [
    { id: 'identitas', done: Boolean(photo), label: 'Tambahkan foto profil' },
    { id: 'tentang', done: bio.trim().length >= 40, label: 'Tulis bio minimal 40 karakter' },
    { id: 'kompetensi', done: skills.length >= 3, label: 'Pilih minimal 3 keterampilan' },
    { id: 'kompetensi', done: interests.length >= 2, label: 'Pilih minimal 2 minat' },
    { id: 'pengalaman', done: experienceLines.length >= 1, label: 'Catat 1 pengalaman proyek' },
  ]
  const percent = Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100)
  const nextTodo = checklist.find((item) => !item.done)
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  function reset() {
    setName(initial.name); setBio(initial.bio); setSkills(initial.skills); setInterests(initial.interests)
    setExperiences(initial.experiences.map((item) => ({ ...item, key: nextKey() }))); setPhotoFile(null); setPreview(null); setError('')
  }

  async function save() {
    if (!name.trim()) { setError('Nama tidak boleh kosong.'); jump('identitas'); return }
    setBusy(true); setError('')
    try {
      let photoID: string | number | undefined
      if (photoFile) {
        const upload = new FormData(); upload.append('file', photoFile); upload.append('alt', `Foto profil ${name.trim()}`)
        const uploadResponse = await siteFetch('/api/uploads', { method: 'POST', body: upload })
        const uploadData = await uploadResponse.json()
        if (!uploadResponse.ok) throw new Error(uploadData.errors?.[0]?.message || uploadData.message || 'Foto profil belum berhasil diunggah.')
        photoID = uploadData.doc?.id
      }
      const data: Record<string, unknown> = { name: name.trim(), bio: bio.trim(), interests, skills, experiences: experienceLines }
      if (photoID !== undefined) data.profilePhoto = photoID
      const response = await siteFetch(`/api/users/${profile.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Profil belum berhasil diperbarui.')
      setBaseline(JSON.stringify({ name: name.trim(), bio: bio.trim(), skills, interests, experiences: experienceLines }))
      setPhotoFile(null); setToast('Profil berhasil disimpan')
      window.dispatchEvent(new Event('karyakita-session-change'))
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Profil belum berhasil diperbarui.') }
    finally { setBusy(false) }
  }

  const subtitle = [profile.className, profile.programName].filter(Boolean).join(' · ')

  return <main className="portal-page pe-page">
    <nav className="portfolio-form-breadcrumb" aria-label="Breadcrumb"><Link href={base}>{role === 'teacher' ? 'Portal guru' : 'Portal siswa'}</Link><span>/</span><span>Profil saya</span></nav>
    <header className="pe-head"><div><span className="section-kicker">PROFIL</span><h1>Profil saya</h1><p>Ceritakan siapa dirimu. Semua yang diisi di sini tampil di profil publikmu.</p></div>
      <div className="pe-head-actions"><div className="pe-switch" role="tablist" aria-label="Pengaturan profil"><span className="is-active" role="tab" aria-selected="true">Profil</span><Link role="tab" aria-selected="false" href={`${base}/tampilan`}>Tampilan</Link></div><Link className="pe-ghost" href={publicHref}>Lihat profil publik ↗</Link></div></header>

    <div className="pe-layout">
      <div className="pe-form">
        <nav className="pe-steps" aria-label="Bagian formulir">{sections.map((section, index) => <button type="button" key={section.id} className={active === section.id ? 'is-active' : ''} aria-current={active === section.id ? 'step' : undefined} onClick={() => jump(section.id)}><b>{index + 1}</b>{section.label}</button>)}</nav>

        {error && <p className="pe-error" role="alert">{error}</p>}

        <section className="pe-card" id="identitas"><header><span>01</span><div><h2>Identitas</h2><p>Foto dan nama yang dilihat pengunjung.</p></div></header>
          <div className="pe-identity">
            <div className={`pe-drop${dragging ? ' is-drag' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choosePhoto(event.dataTransfer.files?.[0]) }}>
              <button type="button" className={`pe-avatar${appearance.avatarShape === 'rounded' ? ' is-rounded' : ''}`} onClick={() => fileRef.current?.click()} aria-label="Ganti foto profil">
                {photo ? (preview ? <img src={preview} alt="Pratinjau foto profil" /> : <SkeletonImage src={photo} alt={`Foto profil ${profile.name}`} />) : <span aria-hidden="true">{(name || profile.name).slice(0, 1).toUpperCase()}</span>}
                <i aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.500" /></svg></i>
              </button>
              <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0])} />
              <p><button type="button" className="pe-link" onClick={() => fileRef.current?.click()}>{photoFile ? 'Ganti foto lain' : 'Unggah foto'}</button> atau seret ke sini<small>JPG, PNG, WebP · maks 8 MB{photoFile ? ` · ${photoFile.name}` : ''}</small></p>
            </div>
            <div className="pe-field pe-grow"><div className="pe-label"><label htmlFor="pe-name">Nama lengkap <i>*</i></label><span className="pe-count">{name.length}/120</span></div>
              <input id="pe-name" className="pe-input" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="Nama yang tampil di profil" />
              {subtitle && <p className="pe-locked">{subtitle} <small>Kelas dan program diatur oleh admin sekolah.</small></p>}</div>
          </div>
        </section>

        <section className="pe-card" id="tentang"><header><span>02</span><div><h2>Tentang saya</h2><p>Perkenalan singkat — apa yang kamu sukai dan sedang kamu pelajari.</p></div></header>
          <div className="pe-field"><div className="pe-label"><label htmlFor="pe-bio">Bio</label><span className={`pe-count${bio.length > BIO_MAX - 20 ? ' is-warn' : ''}`}>{bio.length}/{BIO_MAX}</span></div>
            <textarea id="pe-bio" className="pe-input pe-textarea" rows={5} maxLength={BIO_MAX} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Contoh: Siswa PPLG yang suka membuat antarmuka sederhana dan nyaman dipakai. Sedang belajar React dan desain sistem." />
            <div className="pe-meter" aria-hidden="true"><span style={{ width: `${Math.min(100, (bio.length / BIO_MAX) * 100)}%` }} /></div></div>
        </section>

        <section className="pe-card" id="kompetensi"><header><span>03</span><div><h2>Kompetensi</h2><p>Tekan Enter atau koma untuk menambah. Klik saran untuk menambah cepat.</p></div></header>
          <TagInput id="pe-skills" label="Keterampilan" hint="Hal yang sudah kamu kuasai." values={skills} onChange={setSkills} suggestions={skillSuggestions} max={12} placeholder="Ketik keterampilan, mis. Figma" />
          <TagInput id="pe-interests" label="Minat" hint="Bidang yang ingin kamu dalami." values={interests} onChange={setInterests} suggestions={interestSuggestions} max={10} placeholder="Ketik minat, mis. UI/UX" />
        </section>

        <section className="pe-card" id="pengalaman"><header><span>04</span><div><h2>Pengalaman proyek</h2><p>Proyek, lomba, atau kegiatan yang pernah kamu ikuti.</p></div></header>
          <div className="pe-exps">{experiences.map((item, index) => <div className="pe-exp" key={item.key}>
            <span className="pe-exp-index" aria-hidden="true">{index + 1}</span>
            <label><span>Proyek atau kegiatan</span><input className="pe-input" value={item.project} maxLength={100} onChange={(event) => setExperiences((list) => list.map((entry) => entry.key === item.key ? { ...entry, project: event.target.value } : entry))} placeholder="Aplikasi Kasir" /></label>
            <label><span>Peran</span><input className="pe-input" value={item.role} maxLength={60} onChange={(event) => setExperiences((list) => list.map((entry) => entry.key === item.key ? { ...entry, role: event.target.value } : entry))} placeholder="UI designer" /></label>
            <label className="pe-year"><span>Tahun</span><input className="pe-input" inputMode="numeric" value={item.year} maxLength={4} onChange={(event) => setExperiences((list) => list.map((entry) => entry.key === item.key ? { ...entry, year: event.target.value.replace(/\D/g, '') } : entry))} placeholder="2025" /></label>
            <button type="button" className="pe-remove" aria-label={`Hapus pengalaman ${index + 1}`} onClick={() => setExperiences((list) => list.filter((entry) => entry.key !== item.key))}>×</button>
          </div>)}
            {!experiences.length && <p className="pe-empty">Belum ada pengalaman. Tambahkan satu untuk memperkaya profilmu.</p>}
          </div>
          {experiences.length < 8 && <button type="button" className="pe-add" onClick={() => setExperiences((list) => [...list, { key: nextKey(), project: '', role: '', year: '' }])}>+ Tambah pengalaman</button>}
        </section>
      </div>

      <aside className="pe-side" aria-label="Pratinjau profil">
        <span className="pe-side-label">Pratinjau langsung</span>
        <div className="pf-page" style={{ ['--pf-accent' as string]: appearance.accent }}>
          <div className="pf-hero pe-preview">
            <div className="pf-cover" style={coverStyle(appearance)} aria-hidden="true" />
            <div className="pe-preview-body">
              <span className={`pf-avatar${appearance.avatarShape === 'rounded' ? ' is-rounded' : ''}`}>{photo ? <img src={photo} alt="" /> : <span>{(name || '?').slice(0, 1).toUpperCase()}</span>}</span>
              <h3>{name || 'Nama kamu'}</h3>
              {subtitle && <p className="pf-subtitle">{subtitle}</p>}
              {appearance.tagline && <p className="pf-tagline">{appearance.tagline}</p>}
              {bio && <p className="pe-preview-bio">{bio.length > 110 ? `${bio.slice(0, 110)}…` : bio}</p>}
              {skills.length > 0 && <ul className="pe-preview-chips">{skills.slice(0, 5).map((skill) => <li key={skill}>{skill}</li>)}{skills.length > 5 && <li>+{skills.length - 5}</li>}</ul>}
              {interests.length > 0 && <ul className="pe-preview-chips is-soft">{interests.slice(0, 4).map((interest) => <li key={interest}>{interest}</li>)}</ul>}
            </div>
          </div>
        </div>
        <section className="pe-progress">
          <div className="pe-ring" style={{ ['--p' as string]: `${percent}%` }} role="img" aria-label={`Kelengkapan profil ${percent} persen`}><b>{percent}%</b></div>
          <div><strong>{percent === 100 ? 'Profil lengkap' : 'Kelengkapan profil'}</strong>
            {nextTodo ? <button type="button" className="pe-link" onClick={() => jump(nextTodo.id)}>Berikutnya: {nextTodo.label} →</button> : <small>Profilmu siap dilihat banyak orang.</small>}</div>
        </section>
        <ul className="pe-checklist">{checklist.map((item) => <li key={item.label} className={item.done ? 'is-done' : ''}><button type="button" onClick={() => jump(item.id)}><span aria-hidden="true">{item.done ? '✓' : '○'}</span>{item.label}</button></li>)}</ul>
        <Link className="pe-ghost pe-appearance" href={`${base}/tampilan`}>Atur cover &amp; warna →</Link>
      </aside>
    </div>

    <div className={`pe-savebar${dirty ? ' is-visible' : ''}`} role="region" aria-label="Simpan perubahan" aria-hidden={!dirty}>
      <span><i aria-hidden="true" />Ada perubahan yang belum disimpan</span>
      <div><button type="button" className="pe-ghost" onClick={reset} disabled={busy} tabIndex={dirty ? 0 : -1}>Batalkan</button><button type="button" className="pe-save" onClick={() => void save()} disabled={busy || !dirty} tabIndex={dirty ? 0 : -1}>{busy ? 'Menyimpan…' : 'Simpan profil'}</button></div>
    </div>
    {toast && <p className="pe-toast" role="status">{toast}</p>}
  </main>
}
