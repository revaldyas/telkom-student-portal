'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import SkeletonImage from '../../../../../components/SkeletonImage'
import { siteFetch } from '../../../../../lib/siteFetch'

type Profile = {
  id: string | number; name: string; bio: string
  interests: string[]; skills: string[]; experiences: string[]
  photoURL: string | null; className: string | null; programName: string | null
}

const readLines = (value: FormDataEntryValue | null) => String(value || '').split(/\n|,/).map((item) => item.trim()).filter(Boolean)

export default function ProfileEditorPage({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const photo = preview || profile.photoURL

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(''); setSaved(false)
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    try {
      let photoID: string | number | undefined
      const file = form.get('profilePhoto')
      if (file instanceof File && file.size) {
        const upload = new FormData()
        upload.append('file', file)
        upload.append('alt', `Foto profil ${name || profile.name}`)
        const uploadResponse = await siteFetch('/api/uploads', { method: 'POST', body: upload })
        const uploadData = await uploadResponse.json()
        if (!uploadResponse.ok) throw new Error(uploadData.errors?.[0]?.message || uploadData.message || 'Foto profil belum berhasil diunggah.')
        photoID = uploadData.doc?.id
      }
      const data: Record<string, unknown> = {
        name, bio: String(form.get('bio') || '').trim(),
        interests: readLines(form.get('interests')), skills: readLines(form.get('skills')), experiences: readLines(form.get('experiences')),
      }
      if (photoID !== undefined) data.profilePhoto = photoID
      const response = await siteFetch(`/api/users/${profile.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Profil belum berhasil diperbarui.')
      setSaved(true)
      // Memperbarui nama dan foto di header portal.
      window.dispatchEvent(new Event('karyakita-session-change'))
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Profil belum berhasil diperbarui.') }
    finally { setBusy(false) }
  }

  return <main className="portal-page portfolio-form-page profile-editor-page">
    <nav className="portfolio-form-breadcrumb" aria-label="Breadcrumb"><Link href="/portal/siswa">Portal siswa</Link><span>/</span><span>Profil saya</span></nav>
    <header className="portal-page-heading portfolio-form-heading"><div><span className="section-kicker">PROFIL</span><h1>Profil saya</h1><p>Ubah informasi yang tampil di profil publikmu. Karya dan riwayat penghargaan diperbarui otomatis.</p></div><Link className="button impact-secondary" href={`/siswa/${profile.id}`}>Lihat profil publik ↗</Link></header>
    <form className="portfolio-create-form" onSubmit={submit}>
      {error && <p className="portfolio-form-error" role="alert">{error}</p>}
      {saved && <p className="portfolio-form-success" role="status">Profil berhasil diperbarui.</p>}
      <section className="portfolio-form-section"><div className="portfolio-form-section-heading"><span>01</span><div><h2>Identitas</h2><p>Nama dan foto yang dilihat pengunjung.</p></div></div>
        <div className="profile-editor-identity">
          <span className="profile-editor-avatar">{photo ? (preview ? <img src={preview} alt="Pratinjau foto profil" /> : <SkeletonImage src={photo} alt={`Foto profil ${profile.name}`} />) : <span aria-hidden="true">{profile.name.slice(0, 1).toUpperCase()}</span>}</span>
          <div className="portfolio-form-grid">
            <label className="portfolio-form-field portfolio-form-field--wide"><span>Nama <i>*</i></span><input name="name" required maxLength={120} defaultValue={profile.name} /></label>
            <label className="portfolio-form-field portfolio-form-field--wide"><span>Foto profil</span><input name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; setPreview(file ? URL.createObjectURL(file) : null) }} /></label>
          </div>
        </div>
        {(profile.className || profile.programName) && <p className="profile-editor-meta">{[profile.className, profile.programName].filter(Boolean).join(' · ')} <small>Kelas dan program diatur oleh admin sekolah.</small></p>}
      </section>
      <section className="portfolio-form-section"><div className="portfolio-form-section-heading"><span>02</span><div><h2>Tentang saya</h2><p>Ringkasan singkat tentang dirimu.</p></div></div>
        <div className="portfolio-form-grid"><label className="portfolio-form-field portfolio-form-field--wide"><span>Bio</span><textarea name="bio" rows={4} maxLength={300} defaultValue={profile.bio} placeholder="Ceritakan sedikit tentang dirimu" /></label></div>
      </section>
      <section className="portfolio-form-section"><div className="portfolio-form-section-heading"><span>03</span><div><h2>Profil kompetensi</h2><p>Satu entri per baris. Ini tampil sebagai label di profil publikmu.</p></div></div>
        <div className="portfolio-form-grid">
          <label className="portfolio-form-field"><span>Keterampilan</span><textarea name="skills" rows={5} defaultValue={profile.skills.join('\n')} placeholder="Contoh: Figma" /></label>
          <label className="portfolio-form-field"><span>Minat</span><textarea name="interests" rows={5} defaultValue={profile.interests.join('\n')} placeholder="Contoh: UI/UX" /></label>
          <label className="portfolio-form-field portfolio-form-field--wide"><span>Pengalaman proyek</span><textarea name="experiences" rows={4} defaultValue={profile.experiences.join('\n')} placeholder="Contoh: Aplikasi Kasir — UI designer, 2025" /></label>
        </div>
      </section>
      <footer className="portfolio-form-actions"><Link className="button impact-secondary" href="/portal/siswa">Kembali</Link><button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan profil'}</button></footer>
    </form>
  </main>
}
