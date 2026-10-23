'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthShell, { AuthSvg, Field, PasswordField } from '../../../components/AuthShell'

const side = {
  kicker: 'Area pengguna',
  title: <>Ruangmu.<br /><span>Karyamu.</span></>,
  text: 'Kelola portofolio, ceritakan proses, dan tunjukkan karya terbaikmu kepada komunitas.',
  points: [
    { icon: 'folder' as const, title: 'Portofolio digital', text: 'Satu tempat untuk semua karya dan prosesnya.' },
    { icon: 'board' as const, title: 'Tracker proyek tim', text: 'Bagi tugas, pantau progres, dan kerja bareng.' },
    { icon: 'chat' as const, title: 'Pesan dan komunitas', text: 'Ngobrol dengan teman, kelas, dan guru pembimbing.' },
  ],
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [caps, setCaps] = useState(false)
  const [next, setNext] = useState('')
  const router = useRouter()

  // Tujuan setelah masuk (hanya jalur internal), mis. /login?next=/portal/siswa/tracker
  useEffect(() => {
    const target = new URLSearchParams(window.location.search).get('next') || ''
    if (target.startsWith('/') && !target.startsWith('//')) setNext(target)
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), password }), credentials: 'same-origin' })
      const data = await response.json()
      if (!response.ok || !data.user) throw new Error(data.message || 'Email atau kata sandi belum cocok.')
      try { localStorage.removeItem('karyakita-token') } catch {}
      window.dispatchEvent(new Event('karyakita-session-change'))
      router.push(next || (data.user?.role === 'teacher' ? '/portal/guru' : '/portal/siswa'))
    } catch (err) { setError(err instanceof Error ? err.message : 'Tidak bisa masuk. Coba lagi.'); setBusy(false) }
  }

  return <AuthShell side={side}>
    <Link href="/" className="au-back"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>Kembali ke beranda</Link>
    <h2>Masuk</h2>
    <p className="au-sub">Gunakan email dan kata sandi akun siswa atau guru.</p>
    <form className="au-form" onSubmit={submit} noValidate={false}>
      <Field id="email" label="Email akun" icon="mail" type="email" autoComplete="username" placeholder="nama@smktelkom.sch.id" required autoFocus value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError('') }} />
      <PasswordField id="password" label="Kata sandi" autoComplete="current-password" placeholder="Masukkan kata sandi" required value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError('') }} onCaps={setCaps} />
      {caps && <p className="au-caps" role="status"><AuthSvg name="alert" size={16} />Caps Lock sedang aktif.</p>}
      {error && <p className="au-alert" role="alert"><AuthSvg name="alert" size={18} />{error}</p>}
      <button className="au-submit" disabled={busy || !email || !password}>{busy ? <><span className="au-spin" aria-hidden="true" />Sedang masuk…</> : <>Masuk</>}</button>
    </form>
    <p className="au-foot">Belum punya akun siswa? <Link href="/register">Daftar dengan NIS terdaftar.</Link></p>
    <p className="au-note">Akun Guru dibuat oleh admin sekolah. Lupa kata sandi? Hubungi admin sekolah untuk mengatur ulang.</p>
  </AuthShell>
}
