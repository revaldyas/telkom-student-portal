'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), credentials: 'same-origin' })
      const data = await response.json()
      if (!response.ok || !data.user) throw new Error(data.message || 'Email atau kata sandi belum cocok.')
      try { localStorage.removeItem('karyakita-token') } catch {}
      window.dispatchEvent(new Event('karyakita-session-change'))
      router.push(data.user?.role === 'teacher' ? '/awards' : '/dashboard')
    } catch (err) { setError(err instanceof Error ? err.message : 'Tidak bisa masuk. Coba lagi.') }
    finally { setBusy(false) }
  }
  return <main className="auth-shell">
    <aside className="auth-side">
      <Link href="/" className="brand" aria-label="Telkom Student Creation — Beranda"><img className="auth-brand-logo" src="/brand/telkom-schools.png" width="160" height="53" alt="Telkom Schools — SMK Telkom Jakarta" /></Link>
      <div className="auth-side-copy"><div className="eyebrow"><span className="live-dot"/> AREA PENGGUNA</div><h1>Ruangmu.<br/>Karyamu.</h1><p>Kelola portofolio, ceritakan proses, dan tunjukkan karya terbaikmu.</p></div>
      <div className="auth-shape">✳</div>
      <div className="auth-side-foot">SMK TELKOM · CREATE WHAT'S NEXT</div>
    </aside>
    <section className="auth-main"><div className="auth-box">
      <Link href="/" className="back-link">← Kembali ke beranda</Link><h2>Halo lagi!</h2><p>Masuk ke Telkom Student Creation.</p>
      <form onSubmit={submit}><label htmlFor="email">EMAIL AKUN</label><input id="email" type="email" autoComplete="username" placeholder="nama@smktelkom.sch.id" required value={email} onChange={(e) => setEmail(e.target.value)}/><label htmlFor="password">KATA SANDI</label><input id="password" type="password" autoComplete="current-password" placeholder="Masukkan kata sandi" required value={password} onChange={(e) => setPassword(e.target.value)}/>{error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" disabled={busy}>{busy ? 'Sedang masuk…' : 'Masuk ke ruangku'} <span>↗</span></button></form>
      <p className="auth-hint">Belum punya akun siswa? <Link href="/register">Daftar dengan NIS terdaftar.</Link><br/>Akun Guru dibuat oleh admin sekolah.</p>
    </div></section>
  </main>
}
