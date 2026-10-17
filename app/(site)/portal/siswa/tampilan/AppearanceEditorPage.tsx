'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import ShareProfile from '../../../../../components/ShareProfile'
import { siteFetch } from '../../../../../lib/siteFetch'
import { accentPresets, coverStyle, gradientCSS, gradientPresets, isHexColor, patternPresets, type Appearance } from '../../../../../lib/appearance'
import '../../../profile.css'
import './appearance.css'

type Profile = { id: string | number; name: string; photoURL: string | null; subtitle: string }

export default function AppearanceEditorPage({ profile, initial, initialCoverID, role = 'student' }: { profile: Profile; initial: Appearance; initialCoverID: string | number | null; role?: 'student' | 'teacher' }) {
  const base = role === 'teacher' ? '/portal/guru' : '/portal/siswa'
  const publicBase = role === 'teacher' ? '/guru' : '/siswa'
  const router = useRouter()
  const [value, setValue] = useState<Appearance>(initial)
  const [coverID, setCoverID] = useState<string | number | null>(initialCoverID)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [hex, setHex] = useState(initial.accent)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const photo = photoPreview || profile.photoURL
  const patch = (next: Partial<Appearance>) => { setValue((current) => ({ ...current, ...next })); setSaved(false) }

  function chooseCover(file: File | null) {
    setCoverFile(file)
    if (file) patch({ coverMode: 'image', coverImage: URL.createObjectURL(file) })
  }
  function choosePhoto(file: File | null) {
    setPhotoFile(file); setSaved(false)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }
  function setAccent(next: string) {
    setHex(next)
    if (isHexColor(next)) patch({ accent: next.toLowerCase() })
  }

  async function upload(file: File, alt: string) {
    const body = new FormData(); body.append('file', file); body.append('alt', alt)
    const response = await siteFetch('/api/uploads', { method: 'POST', body })
    const data = await response.json()
    if (!response.ok) throw new Error(data.errors?.[0]?.message || data.message || 'Gambar belum berhasil diunggah.')
    return data.doc?.id as string | number
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError(''); setSaved(false)
    try {
      let nextCover = coverID
      if (coverFile) { nextCover = await upload(coverFile, `Cover profil ${profile.name}`); setCoverID(nextCover); setCoverFile(null) }
      const data: Record<string, unknown> = {
        appearance: {
          coverMode: value.coverMode === 'image' && nextCover ? 'image' : 'gradient',
          gradient: value.gradient, pattern: value.pattern, accent: value.accent, avatarShape: value.avatarShape,
          tagline: value.tagline.trim(), coverImage: nextCover ?? null,
        },
      }
      if (photoFile) data.profilePhoto = await upload(photoFile, `Foto profil ${profile.name}`)
      const response = await siteFetch(`/api/users/${profile.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.errors?.[0]?.message || result.message || 'Tampilan belum berhasil disimpan.')
      setSaved(true); setPhotoFile(null)
      window.dispatchEvent(new Event('karyakita-session-change'))
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Tampilan belum berhasil disimpan.') }
    finally { setBusy(false) }
  }

  return <main className="portal-page portfolio-form-page ap-page">
    <nav className="portfolio-form-breadcrumb" aria-label="Breadcrumb"><Link href={base}>{role === 'teacher' ? 'Portal guru' : 'Portal siswa'}</Link><span>/</span><span>Tampilan profil</span></nav>
    <header className="portal-page-heading portfolio-form-heading"><div><span className="section-kicker">PERSONALISASI</span><h1>Tampilan profil</h1><p>Atur cover, pola, warna, dan foto agar profil publikmu punya karakter sendiri.</p></div><div className="ap-head-actions"><div className="ap-switch" role="tablist" aria-label="Pengaturan profil"><Link role="tab" aria-selected="false" href={`${base}/profil`}>Profil</Link><span className="is-active" role="tab" aria-selected="true">Tampilan</span></div><Link className="button button-glass" href={`${publicBase}/${profile.id}`}>Lihat profil publik</Link></div></header>

    <div className="ap-layout">
      <form className="ap-form" onSubmit={submit}>
        <fieldset><legend>Cover</legend>
          <div className="ap-seg" role="group" aria-label="Jenis cover">
            <button type="button" aria-pressed={value.coverMode === 'gradient'} className={value.coverMode === 'gradient' ? 'is-active' : ''} onClick={() => patch({ coverMode: 'gradient' })}>Gradien</button>
            <button type="button" aria-pressed={value.coverMode === 'image'} className={value.coverMode === 'image' ? 'is-active' : ''} onClick={() => value.coverImage ? patch({ coverMode: 'image' }) : document.getElementById('ap-cover-file')?.click()}>Gambar sendiri</button>
          </div>
          {value.coverMode === 'gradient'
            ? <div className="ap-swatches" role="radiogroup" aria-label="Gradien cover">{gradientPresets.map((preset) => <button key={preset.id} type="button" role="radio" aria-checked={value.gradient === preset.id} className={value.gradient === preset.id ? 'is-active' : ''} style={{ backgroundImage: gradientCSS(preset.id) }} onClick={() => patch({ gradient: preset.id })}><span>{preset.label}</span></button>)}</div>
            : <p className="ap-hint"><button type="button" className="ap-link" onClick={() => document.getElementById('ap-cover-file')?.click()}>Ganti gambar cover</button></p>}
          <div className="ap-spec" role="note"><div className="ap-spec-ratio" aria-hidden="true"><span>4 : 1</span></div><ul><li><strong>Ukuran ideal 1600 × 400 px</strong> (rasio 4:1, pipih memanjang)</li><li>Format JPG, PNG, atau WebP. Diperkecil otomatis saat diunggah.</li><li>Foto profil menutupi sedikit sisi <b>kiri bawah</b> banner. Letakkan objek penting di tengah atau kanan.</li><li>Gambar dengan rasio lain dipotong dari tengah, bukan diregangkan.</li></ul></div>
          <input id="ap-cover-file" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseCover(event.target.files?.[0] || null)} />
        </fieldset>

        <fieldset><legend>Pola</legend>
          <div className="ap-patterns" role="radiogroup" aria-label="Pola cover">{patternPresets.map((preset) => <button key={preset.id} type="button" role="radio" aria-checked={value.pattern === preset.id} className={value.pattern === preset.id ? 'is-active' : ''} onClick={() => patch({ pattern: preset.id })}><i style={coverStyle({ ...value, pattern: preset.id, coverMode: 'gradient', gradient: 'malam' })} />{preset.label}</button>)}</div>
        </fieldset>

        <fieldset><legend>Warna aksen</legend>
          <div className="ap-accents" role="radiogroup" aria-label="Warna aksen">{accentPresets.map((color) => <button key={color} type="button" role="radio" aria-checked={value.accent === color} aria-label={color} className={value.accent === color ? 'is-active' : ''} style={{ background: color }} onClick={() => { setHex(color); patch({ accent: color }) }} />)}
            <label className="ap-hex"><span className="sr-only">Kode warna</span><input value={hex} maxLength={7} onChange={(event) => setAccent(event.target.value)} aria-invalid={!isHexColor(hex)} placeholder="#e50914" /></label></div>
          <p className="ap-hint">Dipakai untuk tab, lencana, dan kartu bagikan.</p>
        </fieldset>

        <fieldset><legend>Foto profil</legend>
          <div className="ap-photo"><label className="ap-upload"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0] || null)} />{photoFile ? photoFile.name : 'Pilih foto baru'}</label>
            <div className="ap-seg" role="group" aria-label="Bentuk foto"><button type="button" aria-pressed={value.avatarShape === 'circle'} className={value.avatarShape === 'circle' ? 'is-active' : ''} onClick={() => patch({ avatarShape: 'circle' })}>Lingkaran</button><button type="button" aria-pressed={value.avatarShape === 'rounded'} className={value.avatarShape === 'rounded' ? 'is-active' : ''} onClick={() => patch({ avatarShape: 'rounded' })}>Kotak membulat</button></div></div>
        </fieldset>

        <fieldset><legend>Tagline</legend>
          <input className="ap-text" value={value.tagline} maxLength={80} onChange={(event) => patch({ tagline: event.target.value })} placeholder="mis. UI designer yang suka bereksperimen" />
          <p className="ap-hint">{value.tagline.length}/80 karakter</p>
        </fieldset>

        {error && <p className="portfolio-form-error" role="alert">{error}</p>}
        {saved && <p className="ap-saved" role="status">Tampilan profil tersimpan. <Link href={`${publicBase}/${profile.id}`}>Lihat hasilnya ↗</Link></p>}
        <div className="portfolio-form-actions"><button className="button button-primary" disabled={busy || !isHexColor(hex)}>{busy ? 'Menyimpan…' : 'Simpan tampilan'}</button></div>
      </form>

      <aside className="ap-preview" aria-label="Pratinjau">
        <span className="ap-preview-label">Pratinjau</span>
        <div className="pf-page" style={{ ['--pf-accent' as string]: value.accent }}>
          <div className="pf-hero ap-mini">
            <div className="pf-cover" style={coverStyle(value)} aria-hidden="true" />
            <div className="ap-mini-body">
              <span className={`pf-avatar${value.avatarShape === 'rounded' ? ' is-rounded' : ''}`}>{photo ? <img src={photo} alt="" /> : <span>{profile.name.slice(0, 1).toUpperCase()}</span>}</span>
              <div><div className="pf-name-row"><h1>{profile.name}</h1></div><p className="pf-subtitle">{profile.subtitle}</p>{value.tagline && <p className="pf-tagline">{value.tagline}</p>}</div>
            </div>
            <div className="ap-mini-tabs"><span className="is-active">Karya <small>3</small></span><span>Proyek <small>1</small></span><span>Awards <small>0</small></span></div>
          </div>
        </div>
        <ShareProfile path={`${publicBase}/${profile.id}`} name={profile.name} subtitle={profile.subtitle} photo={photo} appearance={value} />
        <p className="ap-hint">Pratinjau kartu bagikan memakai pengaturan di atas, termasuk yang belum disimpan.</p>
      </aside>
    </div>
  </main>
}
