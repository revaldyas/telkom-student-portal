'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import GlobalSearch from './GlobalSearch'
import SkeletonImage from './SkeletonImage'

type SessionStatus = 'checking' | 'authenticated' | 'anonymous' | 'unavailable'
type SessionUser = { id: string | number; name: string; role: 'student' | 'teacher'; profilePhoto: string | null }

export default function SiteNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<SessionStatus>('checking')
  const [account, setAccount] = useState<SessionUser | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDetailsElement | null>(null)

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) accountMenuRef.current?.removeAttribute('open')
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') accountMenuRef.current?.removeAttribute('open')
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let lastFocusCheck = 0
    const checkSession = async () => {
      setStatus((current) => current === 'authenticated' ? current : 'checking')
      try {
        const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
        if (response.status === 401 || response.status === 403) {
          if (!cancelled) { setAccount(null); setStatus('anonymous') }
          return
        }
        if (!response.ok) throw new Error('Session check failed')
        const data = await response.json()
        const role = data.user?.role
        if (!cancelled) {
          if (role === 'student' || role === 'teacher') {
            setAccount(data.user)
            setStatus('authenticated')
          } else {
            setAccount(null)
            setStatus('anonymous')
          }
        }
      } catch {
        if (!cancelled) setStatus('unavailable')
      }
    }

    const onSessionChange = () => { void checkSession() }
    const onFocus = () => {
      // Avoid a database round trip on every focus/route transition.
      if (Date.now() - lastFocusCheck < 30_000) return
      lastFocusCheck = Date.now()
      void checkSession()
    }
    try { localStorage.removeItem('karyakita-token') } catch {}
    lastFocusCheck = Date.now()
    void checkSession()
    window.addEventListener('karyakita-session-change', onSessionChange)
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.removeEventListener('karyakita-session-change', onSessionChange)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const logout = async () => {
    setLoggingOut(true)
    setLogoutError('')
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      if (!response.ok) throw new Error('Logout failed')
      setAccount(null)
      setStatus('anonymous')
      window.dispatchEvent(new Event('karyakita-session-change'))
      router.replace('/')
      router.refresh()
    } catch {
      setLogoutError('Belum bisa logout. Coba lagi.')
    } finally {
      setLoggingOut(false)
    }
  }

  const firstName = account?.name.trim().split(/\s+/)[0] || 'Akun'

  return <div className="site-nav-shell"><header className="site-nav-bar">
    <Link className="site-brand" href="/" aria-label="TEL-CREATION — Beranda"><img className="tel-creation-mark" src="/brand/telkom-schools.png" alt="" /><span className="tel-creation-wordmark"><span className="tel-creation-name">TEL</span><span className="tel-creation-accent">-CREATION</span></span></Link>
    <button type="button" className="site-nav-toggle" aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}><span /><span /><span /></button>
    <nav className={menuOpen ? 'site-nav-links is-open' : 'site-nav-links'} aria-label="Navigasi utama">
      <Link aria-current={pathname === '/karya' || pathname.startsWith('/karya/') ? 'page' : undefined} href="/karya" onClick={() => setMenuOpen(false)}>Eksplor Karya</Link>
      <Link aria-current={pathname === '/proyek' || pathname.startsWith('/proyek/') ? 'page' : undefined} href="/proyek" onClick={() => setMenuOpen(false)}>Proyek Siswa</Link>
      <Link aria-current={pathname === '/peluang' ? 'page' : undefined} href="/peluang" onClick={() => setMenuOpen(false)}>Peluang Kolaborasi</Link>
      <Link aria-current={pathname === '/awards' ? 'page' : undefined} href="/awards" onClick={() => setMenuOpen(false)}>Awards</Link>
      <Link aria-current={pathname === '/leaderboard' ? 'page' : undefined} href="/leaderboard" onClick={() => setMenuOpen(false)}>Leaderboard</Link>
    </nav>
    <GlobalSearch />
    {status === 'checking' ? <span className="site-nav-session-skeleton" role="status" aria-label="Memeriksa sesi"><span className="sk" aria-hidden="true" /></span>
      : status === 'unavailable' ? <button type="button" onClick={() => window.dispatchEvent(new Event('karyakita-session-change'))}>Coba lagi</button>
        : status === 'authenticated' && account ? <details ref={accountMenuRef} className="site-account-menu">
          <summary className="site-account-trigger" aria-label={`Menu akun ${firstName}`}>
            {account.profilePhoto ? <SkeletonImage className="site-account-avatar" src={account.profilePhoto} alt="" /> : <span className="site-account-avatar site-account-initial" aria-hidden="true">{firstName.slice(0, 1).toUpperCase()}</span>}
            <span>{firstName}</span>
          </summary>
          <div className="site-account-dropdown">
            <Link href={account.role === 'teacher' ? '/portal/guru' : '/portal/siswa'} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open') }}>{account.role === 'teacher' ? 'Portal Guru' : 'Portal Siswa'}</Link>
            {account.role === 'student' && <Link href={`/siswa/${account.id}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open') }}>Profil</Link>}
            {account.role === 'teacher' && <>
              <Link href={`/guru/${account.id}`} onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open') }}>Profil</Link>
            </>}
            <button type="button" onClick={() => void logout()} disabled={loggingOut}>{loggingOut ? 'Keluar…' : 'Keluar'}</button>
            {logoutError && <p role="alert">{logoutError}</p>}
          </div>
        </details>
          : <Link href="/login">Masuk</Link>}
  </header></div>
}
