'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [nis, setNis] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi belum cocok.')
      return
    }

    setBusy(true)
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nis, email, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || data.errors?.[0]?.message || 'Registrasi belum berhasil.')
      }
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      })
      const loginData = await loginResponse.json()
      if (!loginResponse.ok || !loginData.user) {
        throw new Error('Akun berhasil dibuat. Silakan masuk melalui halaman login.')
      }
      try { localStorage.removeItem('karyakita-token') } catch {}
      window.dispatchEvent(new Event('karyakita-session-change'))
      router.push('/portal/siswa')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tidak bisa mendaftar. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="auth-shell">
    <aside className="auth-side">
      <Link href="/" className="brand auth-brand" aria-label="TEL-CREATION — Beranda"><img className="tel-creation-mark" src="/brand/telkom-schools.png" alt="" /><span className="tel-creation-wordmark"><span className="tel-creation-name">TEL</span><span className="tel-creation-accent">-CREATION</span></span></Link>
      <div className="auth-side-copy"><div className="eyebrow"><span className="live-dot" /> RUANG KARYA SISWA</div><h1>Mulai dari<br />karyamu.</h1><p>Buat akun siswa dan bagikan proses kreatifmu bersama komunitas Telkom Student Creation.</p></div>
      <div className="auth-shape">✳</div>
      <div className="auth-side-foot">SMK TELKOM · CREATE WHAT'S NEXT</div>
    </aside>
    <section className="auth-main"><div className="auth-box">
      <Link href="/" className="back-link">← Kembali ke beranda</Link>
      <h2>Daftar siswa</h2>
      <p>Gunakan NIS yang terdaftar di sekolah.</p>
      <form onSubmit={submit}>
        <label htmlFor="name">NAMA LENGKAP</label>
        <input id="name" autoComplete="name" placeholder="Nama sesuai data sekolah" required value={name} onChange={(event) => setName(event.target.value)} />
        <label htmlFor="nis">NIS (NOMOR INDUK SISWA)</label>
        <input id="nis" autoComplete="off" placeholder="Masukkan NIS terdaftar" required value={nis} onChange={(event) => setNis(event.target.value)} />
        <label htmlFor="email">EMAIL</label>
        <input id="email" type="email" autoComplete="email" placeholder="nama@smktelkom.sch.id" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="password">KATA SANDI</label>
        <input id="password" type="password" autoComplete="new-password" minLength={8} placeholder="Minimal 8 karakter" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <label htmlFor="confirm-password">ULANGI KATA SANDI</label>
        <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} placeholder="Masukkan kata sandi sekali lagi" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="auth-submit" disabled={busy}>{busy ? 'Membuat akun…' : 'Buat akun siswa'} <span>↗</span></button>
      </form>
      <p className="auth-hint">NIS akan dicocokkan dengan Data Siswa sekolah. Sudah punya akun? <Link href="/login">Masuk di sini.</Link></p>
    </div></section>
  </main>
}
