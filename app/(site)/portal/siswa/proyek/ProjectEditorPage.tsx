'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import PortfolioDetailEditor from '../../../../../components/PortfolioDetailEditor'
import { siteFetch } from '../../../../../lib/siteFetch'
import type { ProjectEditorData, ProjectMentorOption, ProjectStudentOption } from './editorData'

type Props = { userID: string | number; students: ProjectStudentOption[]; teachers: ProjectMentorOption[]; categories: Array<{ id: string | number; name: string }>; project?: ProjectEditorData | null; notice?: string }
type Member = { member: string | number; contribution: string }
type MentorAssignment = { mentor: string | number; assignmentRole: 'primary' | 'supporting'; response: 'invited' | 'accepted' | 'declined' }

export default function ProjectEditorPage({ userID, students, teachers, categories, project = null, notice: initialNotice = '' }: Props) {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>(project?.members || [{ member: userID, contribution: 'Inisiator' }])
  const [mentorAssignments, setMentorAssignments] = useState<MentorAssignment[]>(project?.mentorAssignments || [])
  const [details, setDetails] = useState<SerializedEditorState | null>(project?.details || null)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [tools, setTools] = useState<string[]>(project?.tools || [])
  const [toolInput, setToolInput] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(initialNotice)
  const [busy, setBusy] = useState(false)
  // Mengedit proyek yang sudah diajukan/terbit mengembalikannya menjadi draf (lihat hook beforeChange di Projects).
  const leavesReview = Boolean(project && (project.status === 'published' || project.verificationStatus === 'submitted' || project.verificationStatus === 'verified' || project.verificationStatus === 'revision-requested'))
  const available = students.filter((student) => !members.some((member) => String(member.member) === String(student.id)))

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

  async function upload(file: File, alt: string) {
    const form = new FormData(); form.append('file', file); form.append('alt', alt)
    const response = await siteFetch('/api/uploads', { method: 'POST', body: form })
    const result = await response.json()
    if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Unggahan belum berhasil.')
    return result.doc?.id as string | number
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!members.length || members.some((item) => !String(item.contribution).trim())) { setError('Tambahkan anggota dan isi kontribusi setiap anggota.'); return }
    setBusy(true); setError(''); setNotice('')
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') || '').trim()
    try {
      const coverFile = form.get('coverImage')
      const coverID = coverFile instanceof File && coverFile.size ? await upload(coverFile, `Sampul proyek ${title}`) : form.get('removeCover') === 'on' ? null : project?.coverImage?.id || null
      const removed = new Set(form.getAll('removeGallery').map(String))
      const galleryIDs = (project?.galleryImages || []).filter((item) => !removed.has(String(item.id))).map((item) => item.id)
      for (const file of form.getAll('galleryImages')) if (file instanceof File && file.size) galleryIDs.push(await upload(file, `Galeri proyek ${title}`))
      const data = {
        title,
        summary: String(form.get('summary') || '').trim(),
        details: details || undefined,
        categoryRef: categories.find((category) => String(category.id) === String(form.get('categoryRef') || ''))?.id ?? null,
        members: members.map((item) => ({ member: item.member, contribution: item.contribution.trim() })),
        mentorAssignments: mentorAssignments.map((item) => ({ ...item })),
        coverImage: coverID,
        galleryImages: galleryIDs,
        year: Number(form.get('year')),
        tools: [...tools, ...toolInput.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)].filter((item, index, all) => all.findIndex((candidate) => candidate.toLocaleLowerCase() === item.toLocaleLowerCase()) === index),
        projectUrl: String(form.get('projectUrl') || '').trim() || null,
      }
      const response = await siteFetch(project ? `/api/projects/${project.id}?depth=2` : '/api/projects?depth=2', { method: project ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Proyek belum berhasil disimpan.')
      if (!project) router.replace(`/portal/siswa/proyek/${result.doc?.id}/edit?saved=draft`)
      else { setNotice('Draf tersimpan. Ajukan verifikasi dari halaman proyek setelah mentor utama menerima undangan.'); router.refresh() }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Proyek belum berhasil disimpan.') }
    finally { setBusy(false) }
  }

  return <main className="portal-page portfolio-form-page project-editor-page">
    <nav className="portfolio-form-breadcrumb" aria-label="Breadcrumb"><Link href="/portal/siswa">Portal siswa</Link><span>/</span><Link href="/portal/siswa/proyek">Proyek saya</Link><span>/</span><span>{project ? 'Edit proyek' : 'Proyek baru'}</span></nav>
    <header className="portal-page-heading portfolio-form-heading"><div><span className="section-kicker">KARYA KOLABORATIF</span><h1>{project ? 'Edit proyek' : 'Buat proyek kolaborasi'}</h1><p>Atur anggota dan peran mereka agar kontribusi setiap siswa terlihat jelas.</p></div><Link className="button impact-secondary" href="/portal/siswa/proyek">Kembali ke proyek</Link></header>
    <form className="portfolio-create-form" onSubmit={submit}>
      {error && <p className="portfolio-form-error" role="alert">{error}</p>}
      {notice && <p className="portfolio-form-success" role="status">{notice}</p>}
      <section className="portfolio-form-section"><div className="portfolio-form-section-heading"><span>01</span><div><h2>Informasi proyek</h2><p>Jelaskan hasil kolaborasi dan pilih kategorinya.</p></div></div>
        <div className="portfolio-form-grid"><label className="portfolio-form-field portfolio-form-field--wide"><span>Nama proyek <i>*</i></span><input name="title" required maxLength={160} defaultValue={project?.title || ''} placeholder="Contoh: Aplikasi Jelajah Kota" /></label>
          <label className="portfolio-form-field"><span>Kategori</span><select name="categoryRef" defaultValue={String(project?.categoryRef || '')}><option value="">Pilih kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="portfolio-form-field"><span>Tahun</span><input name="year" type="number" min="2000" max={new Date().getFullYear() + 1} defaultValue={project?.year || new Date().getFullYear()} /></label>
          <label className="portfolio-form-field portfolio-form-field--wide"><span>Ringkasan</span><textarea name="summary" maxLength={800} rows={4} defaultValue={project?.summary || ''} placeholder="Apa yang dibuat tim, untuk siapa, dan apa hasilnya?" /></label>
        </div>
      </section>
      <section className="portfolio-form-section"><div className="portfolio-form-section-heading"><span>02</span><div><h2>Anggota dan kontribusi</h2><p>Tambahkan siswa lain dan jelaskan peran masing-masing.</p></div></div>
        <div className="project-editor-members">{members.map((item, index) => <div className="project-editor-member" key={`${item.member}-${index}`}><strong>{students.find((student) => String(student.id) === String(item.member))?.name || 'Siswa'}</strong><label><span>Kontribusi atau peran</span><input value={item.contribution} maxLength={120} onChange={(event) => setMembers((current) => current.map((member, memberIndex) => memberIndex === index ? { ...member, contribution: event.target.value } : member))} placeholder="Contoh: UI/UX designer" /></label>{String(item.member) !== String(userID) && <button className="filter" type="button" onClick={() => setMembers((current) => current.filter((_, memberIndex) => memberIndex !== index))}>Hapus</button>}</div>)}</div>
        <div className="project-editor-add-member"><select aria-label="Pilih siswa untuk ditambahkan" value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)}><option value="">Pilih siswa</option>{available.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select><button className="filter" type="button" disabled={!selectedStudent} onClick={() => { const student = students.find((item) => String(item.id) === selectedStudent); if (student) setMembers((current) => [...current, { member: student.id, contribution: '' }]); setSelectedStudent('') }}>Tambah anggota</button></div>
      </section>
      <section className="portfolio-form-section"><div className="portfolio-form-section-heading"><span>03</span><div><h2>Guru pembimbing</h2><p>Pilih Guru sesuai keahlian atau minatnya. Undangan harus diterima sebelum proyek diajukan untuk verifikasi.</p></div></div>
        {mentorAssignments.length ? <div className="project-editor-members">{mentorAssignments.map((assignment) => {
          const teacher = teachers.find((item) => String(item.id) === String(assignment.mentor))
          return <div className="project-editor-member" key={assignment.mentor}><strong>{teacher?.name || 'Guru'}</strong><label><span>Peran pembimbing</span><select value={assignment.assignmentRole} onChange={(event) => setMentorAssignments((items) => items.map((item) => ({ ...item, assignmentRole: String(item.mentor) === String(assignment.mentor) ? event.target.value as 'primary' | 'supporting' : event.target.value === 'primary' ? 'supporting' : item.assignmentRole })))}><option value="primary">Mentor utama — keputusan akhir</option><option value="supporting">Mentor pendamping — masukan</option></select></label><span className="project-mentor-response">{assignment.response === 'accepted' ? 'Undangan diterima' : assignment.response === 'declined' ? 'Undangan ditolak' : 'Menunggu jawaban'}</span><button className="filter" type="button" onClick={() => setMentorAssignments((items) => items.filter((item) => String(item.mentor) !== String(assignment.mentor)))}>Hapus</button>{teacher && (teacher.skills.length || teacher.interests.length) ? <small className="project-mentor-skills">Fokus: {[...teacher.skills, ...teacher.interests].join(' · ')}</small> : null}</div>
        })}</div> : <p className="project-mentor-empty">Belum ada Guru yang diundang. Pilih Guru yang relevan dengan bidang proyek.</p>}
        <div className="project-editor-add-member"><select aria-label="Pilih Guru untuk diundang" value={selectedTeacher} onChange={(event) => setSelectedTeacher(event.target.value)}><option value="">Pilih Guru</option>{teachers.filter((teacher) => !mentorAssignments.some((assignment) => String(assignment.mentor) === String(teacher.id))).map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}{teacher.skills.length ? ` — ${teacher.skills.slice(0, 2).join(', ')}` : ''}</option>)}</select><button className="filter" type="button" disabled={!selectedTeacher} onClick={() => { const teacher = teachers.find((item) => String(item.id) === selectedTeacher); if (teacher) setMentorAssignments((items) => [...items, { mentor: teacher.id, assignmentRole: items.length ? 'supporting' : 'primary', response: 'invited' }]); setSelectedTeacher('') }}>Undang Guru</button></div>
      </section>
      <section className="portfolio-form-section"><div className="portfolio-form-section-heading"><span>04</span><div><h2>Detail dan media</h2><p>Tambahkan proses, sampul, dan dokumentasi hasil kerja.</p></div></div>
        <PortfolioDetailEditor initialValue={project?.details} onChange={setDetails} />
        <div className="portfolio-form-grid project-editor-media"><div className="portfolio-form-field portfolio-form-field--wide"><span>Gambar sampul</span>{project?.coverImage?.url && <img className="portfolio-form-cover-preview" src={project.coverImage.url} alt={project.coverImage.filename || `Sampul ${project.title}`} />}<input name="coverImage" type="file" accept="image/jpeg,image/png,image/webp" />{project?.coverImage && <label className="portfolio-form-remove"><input type="checkbox" name="removeCover" /> Hapus gambar sampul</label>}</div>
          <div className="portfolio-form-field portfolio-form-field--wide"><span>Galeri proyek</span>{project?.galleryImages.length ? <div className="portfolio-form-gallery">{project.galleryImages.map((image) => <label className="portfolio-form-gallery-item" key={image.id}><img src={image.url || ''} alt={image.alt || image.filename || 'Galeri proyek'} /><span><input name="removeGallery" type="checkbox" value={image.id} /> Hapus gambar</span></label>)}</div> : null}<input name="galleryImages" type="file" accept="image/jpeg,image/png,image/webp" multiple /></div>
          <div className="portfolio-form-field"><span id="project-tools-label">Perangkat & teknologi yang digunakan</span><div className="portfolio-tools-input" onClick={(event) => event.currentTarget.querySelector('input')?.focus()}>
            {tools.map((tool, index) => <span className="portfolio-tool-chip" key={`${tool}-${index}`}>{tool}<button type="button" aria-label={`Hapus ${tool}`} onClick={() => setTools((current) => current.filter((_, itemIndex) => itemIndex !== index))}>×</button></span>)}
            <input aria-labelledby="project-tools-label" aria-describedby="project-tools-help" value={toolInput} onChange={(event) => { const parts = event.target.value.split(/[\n,]/); if (parts.length > 1) addTools(parts.slice(0, -1).join(',')); setToolInput(parts[parts.length - 1] || '') }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTools(toolInput); setToolInput('') } else if (event.key === 'Backspace' && !toolInput && tools.length) setTools((current) => current.slice(0, -1)) }} onBlur={() => { addTools(toolInput); setToolInput('') }} placeholder="Ketik perangkat atau teknologi lalu tekan koma atau Enter" />
          </div><small id="project-tools-help">Tekan koma atau Enter setelah setiap perangkat atau teknologi untuk membuat pill.</small></div><label className="portfolio-form-field"><span>Tautan hasil proyek</span><input name="projectUrl" type="url" defaultValue={project?.projectUrl || ''} placeholder="https://…" /></label>
        </div>
      </section>
      <aside className="portfolio-form-submit-note"><strong>{leavesReview ? 'Proyek akan kembali menjadi draf' : 'Disimpan sebagai draf'}</strong><p>{leavesReview ? 'Menyimpan perubahan membatalkan pengajuan sebelumnya. Ajukan ulang dari halaman proyek agar mentor utama meninjaunya lagi.' : 'Draf hanya terlihat oleh anggota tim. Cukup isi nama proyek dulu; ringkasan wajib saat proyek diajukan untuk verifikasi, setelah mentor utama menerima undangan.'}</p></aside>
      <footer className="portfolio-form-actions"><Link className="button impact-secondary" href="/portal/siswa/proyek">Kembali</Link><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan draf'}</button></footer>
    </form>
  </main>
}
