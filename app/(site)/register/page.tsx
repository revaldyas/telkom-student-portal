'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useMemo, useState } from 'react'
import AuthShell, { AuthSvg, Field, PasswordField } from '../../../components/AuthShell'

const side = {
  kicker: 'Ruang karya siswa',
  title: <>Mulai dari<br /><span>karyamu.</span></>,
  text: 'Buat akun siswa dan bagikan proses kreatifmu bersama komunitas Telkom Student Creation.',
  points: [
    { icon: 'folder' as const, title: 'Tampilkan karyamu', text: 'Portofolio publik yang bisa dibagikan lewat QR.' },
    { icon: 'trophy' as const, title: 'Raih penghargaan', text: 'Ikut voting, leaderboard, dan peluang kompetisi.' },
    { icon: 'board' as const, title: 'Kolaborasi proyek', text: 'Kerja tim dengan tracker dan guru pembimbing.' },
  ],
}

function strength(password: string) {
  const rules = [
    { ok: password.length >= 8, label: '8+ karakter' },
    { ok: /[a-z]/.test(password) && /[A-Z]/.test(password), label: 'Huruf besar & kecil' },
    { ok: /\d/.test(password), label: 'Angka' },
    { ok: /[^A-Za-z0-9]/.test(password), label: 'Simbol' },
  ]
  const level = password ? Math.max(1, rules.filter((rule) => rule.ok).length) : 0
  return { rules, level, label: ['', 'Lemah', 'Cukup', 'Bagus', 'Kuat'][level] }
}

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [nis, setNis] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [caps, setCaps] = useState(false)
  const power = useMemo(() => strength(password), [password])

  const nameError = touched.name && name.trim().length < 3 ? 'Isi nama lengkap sesuai data sekolah.' : ''
  const nisError = touched.nis && !/^\d{4,}$/.test(nis.trim()) ? 'NIS berupa angka, minimal 4 digit.' : ''
  const emailError = touched.email && !/^\S+@\S+\.\S+$/.test(email.trim()) ? 'Masukkan alamat email yang valid.' : ''
  const passError = touched.password && password.length < 8 ? 'Kata sandi minimal 8 karakter.' : ''
  const mismatch = Boolean(confirmPassword) && password !== confirmPassword
  const step1Ok = name.trim().length >= 3 && /^\d{4,}$/.test(nis.trim())
  const step2Ok = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 8 && password === confirmPassword

  function next(event: FormEvent) {
    event.preventDefault()
    setTouched((current) => ({ ...current, name: true, nis: true }))
    if (step1Ok) { setError(''); setStep(2) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(''); setTouched((current) => ({ ...current, email: true, password: true, confirm: true }))
    if (!step2Ok) { if (mismatch) setError('Konfirmasi kata sandi belum cocok.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), nis: nis.trim(), email: email.trim(), password }) })
      const data = await response.json()
      if (!response.ok) {
        const message = data.message || data.errors?.[0]?.message || 'Registrasi belum berhasil.'
        // Kesalahan NIS atau nama dikembalikan ke langkah pertama agar mudah diperbaiki.
        if (/nis|nama/i.test(message)) setStep(1)
        throw new Error(message)
      }
      const loginResponse = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ email: email.trim(), password }) })
      const loginData = await loginResponse.json()
      if (!loginResponse.ok || !loginData.user) throw new Error('Akun berhasil dibuat. Silakan masuk melalui halaman login.')
      try { localStorage.removeItem('karyakita-token') } catch {}
      window.dispatchEvent(new Event('karyakita-session-change'))
      router.push('/portal/siswa')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tidak bisa mendaftar. Coba lagi.'); setBusy(false)
    }
  }

  return <AuthShell side={side}>
    <Link href="/" className="au-back"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>Kembali ke beranda</Link>
    <h2>Daftar siswa</h2>
    <p className="au-sub">Gunakan NIS yang terdaftar di sekolah.</p>
    <ol className="au-steps" aria-label="Langkah pendaftaran">
      <li className={`au-step ${step === 1 ? 'is-active' : 'is-done'}`} aria-current={step === 1 ? 'step' : undefined}><b>{step === 1 ? '1' : <AuthSvg name="check" size={14} />}</b>Identitas</li>
      <li className={`au-step-line${step === 2 ? ' is-full' : ''}`} aria-hidden="true"><i /></li>
      <li className={`au-step ${step === 2 ? 'is-active' : ''}`} aria-current={step === 2 ? 'step' : undefined}><b>2</b>Akun</li>
    </ol>

    {step === 1 ? <form className="au-form" onSubmit={next}>
      <Field id="name" label="Nama lengkap" icon="user" autoComplete="name" placeholder="Nama sesuai data sekolah" required autoFocus value={name} error={nameError} onBlur={() => setTouched((current) => ({ ...current, name: true }))} onChange={(event) => setName(event.target.value)} />
      <Field id="nis" label="NIS (Nomor Induk Siswa)" icon="id" inputMode="numeric" autoComplete="off" placeholder="Masukkan NIS terdaftar" required value={nis} error={nisError} hint="NIS dicocokkan dengan Data Siswa sekolah." onBlur={() => setTouched((current) => ({ ...current, nis: true }))} onChange={(event) => setNis(event.target.value.replace(/\D/g, ''))} />
      {error && <p className="au-alert" role="alert"><AuthSvg name="alert" size={18} />{error}</p>}
      <button className="au-submit" disabled={!name.trim() || !nis.trim()}>Lanjut</button>
    </form> : <form className="au-form" onSubmit={submit}>
      <p className="au-chip"><AuthSvg name="user" size={15} /><span><b>{name.trim()}</b> · NIS {nis}</span><button type="button" onClick={() => setStep(1)}>Ubah</button></p>
      <Field id="email" label="Email" icon="mail" type="email" autoComplete="email" placeholder="nama@smktelkom.sch.id" required autoFocus value={email} error={emailError} onBlur={() => setTouched((current) => ({ ...current, email: true }))} onChange={(event) => setEmail(event.target.value)} />
      <div>
        <PasswordField id="password" label="Kata sandi" autoComplete="new-password" minLength={8} placeholder="Minimal 8 karakter" required value={password} error={passError} onBlur={() => setTouched((current) => ({ ...current, password: true }))} onChange={(event) => setPassword(event.target.value)} onCaps={setCaps} />
        {password && <div className="au-strength"><div className="au-meter" data-level={power.level} aria-hidden="true"><i /><i /><i /><i /></div><div className="au-strength-text"><span>Kekuatan: {power.label}</span></div><ul className="au-rules">{power.rules.map((rule) => <li key={rule.label} className={rule.ok ? 'is-ok' : ''}><i aria-hidden="true" />{rule.label}</li>)}</ul></div>}
      </div>
      <div>
        <PasswordField id="confirm-password" label="Ulangi kata sandi" autoComplete="new-password" minLength={8} placeholder="Masukkan kata sandi sekali lagi" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} onCaps={setCaps} />
        {confirmPassword && <p className={`au-match ${mismatch ? 'is-bad' : 'is-ok'}`}><AuthSvg name={mismatch ? 'alert' : 'check'} size={15} />{mismatch ? 'Kata sandi belum sama.' : 'Kata sandi cocok.'}</p>}
      </div>
      {caps && <p className="au-caps" role="status"><AuthSvg name="alert" size={16} />Caps Lock sedang aktif.</p>}
      {error && <p className="au-alert" role="alert"><AuthSvg name="alert" size={18} />{error}</p>}
      <div className="au-row"><button type="button" className="au-ghost" onClick={() => setStep(1)}>Kembali</button><button className="au-submit" disabled={busy || !email || !password || !confirmPassword}>{busy ? <><span className="au-spin" aria-hidden="true" />Membuat akun…</> : <>Buat akun siswa</>}</button></div>
    </form>}
    <p className="au-foot">Sudah punya akun? <Link href="/login">Masuk di sini.</Link></p>
  </AuthShell>
}
