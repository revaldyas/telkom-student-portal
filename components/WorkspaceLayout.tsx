'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import WorkspaceAccountMenu from './WorkspaceAccountMenu'
import WorkspaceNotifications from './WorkspaceNotifications'
import '../app/(site)/workspace-nav.css'
import { playChatSound, unlockAudio } from '../lib/chatSound'
import { getSeenMap } from '../lib/trackerSeen'

type Account = { id: string | number; name: string; role: 'student' | 'teacher'; profilePhoto: string | null }
type IconName = 'tracker' | 'chat' | 'home' | 'image' | 'users' | 'user' | 'check' | 'spark' | 'plus' | 'list' | 'palette' | 'globe'
type NavChild = { label: string; href: string | null; icon: IconName; active: boolean; external?: boolean }
type NavItem = { key: string; label: string; icon: IconName; href?: string | null; active: boolean; badge?: number; children?: NavChild[] }

const iconPaths: Record<IconName, ReactNode> = {
  tracker: <><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="10" rx="1.5" /><rect x="17" y="4" width="4" height="13" rx="1.5" /></>,
  chat: <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />,
  home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5a1 1 0 0 0 1 1H10v-5h4v5h3.5a1 1 0 0 0 1-1V10" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 9" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0M16 4.6a3.2 3.2 0 0 1 0 6.1M21 20a5.5 5.5 0 0 0-3.5-5.1" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.8 2.8L16.5 9.5" /></>,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.500 15.500 18 18M18 6l-2.500 2.500M8.500 15.500 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3.500 6h.01M3.500 12h.01M3.500 18h.01" />,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.400 0 2-1 1.600-2.100-.4-1.100.2-2.400 1.600-2.400H17a4 4 0 0 0 4-4C21 6.800 17 3 12 3Z" /><circle cx="7.500" cy="11" r="1" /><circle cx="10" cy="7.500" r="1" /><circle cx="14.500" cy="7.500" r="1" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
}
function NavIcon({ name }: { name: IconName }) {
  return <svg className="ws-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>
}

/**
 * `account` bernilai null selama sesi masih diperiksa: shell tetap dirender dengan ukuran yang sama
 * (placeholder untuk data akun) agar tidak ada lompatan layout saat data akun tiba. `role` dipakai
 * untuk menentukan menu pada keadaan itu.
 */
export default function WorkspaceLayout({ children, account, role: fallbackRole }: { children: ReactNode; account: Account | null; role?: 'student' | 'teacher' }) {
  const pathname = usePathname()
  const router = useRouter()
  const role = account?.role ?? fallbackRole ?? 'student'
  const profileHref = account ? (role === 'teacher' ? `/guru/${account.id}` : `/siswa/${account.id}`) : null
  const tagline = role === 'teacher' ? 'Ruang bimbingan' : 'Ruang karyamu'
  const [unread, setUnread] = useState(0)
  const [trackerNew, setTrackerNew] = useState(0)
  const previousUnread = useRef<number | null>(null)
  useEffect(() => { unlockAudio() }, [])
  // Satu denyut berkala: pesan belum dibaca, aktivitas tracker baru, dan status online (menggantikan tiga polling terpisah).
  useEffect(() => {
    if (!account) return
    let active = true
    const pulse = () => fetch('/api/portal/pulse', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seen: getSeenMap(account.id) }) })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!active || !data) return
        const total = (data.unread || 0) + (data.invites || 0)
        // Bunyi hanya bila jumlah naik setelah pemuatan pertama dan pengguna tidak sedang di halaman Pesan (halaman itu punya bunyi sendiri).
        if (previousUnread.current !== null && total > previousUnread.current && !window.location.pathname.includes('/pesan')) playChatSound('ping')
        previousUnread.current = total
        setUnread(total); setTrackerNew(data.trackerNew || 0)
      }).catch(() => null)
    void pulse()
    const timer = setInterval(() => { if (!document.hidden) void pulse() }, 25000)
    const onVisible = () => { if (!document.hidden) void pulse() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('tsc-tracker-seen', pulse); window.addEventListener('tsc-pulse', pulse)
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('tsc-tracker-seen', pulse); window.removeEventListener('tsc-pulse', pulse) }
  }, [account])
  const isUnder = (base: string) => pathname === base || pathname.startsWith(`${base}/`)
  const nav: NavItem[] = role === 'teacher'
    ? [
        { key: 'dashboard', label: 'Dashboard', icon: 'home', href: '/portal/guru', active: pathname === '/portal/guru' },
        { key: 'verifikasi', label: 'Verifikasi karya', icon: 'check', href: '/portal/guru/verifikasi', active: isUnder('/portal/guru/verifikasi') },
        { key: 'peluang', label: 'Peluang siswa', icon: 'spark', href: '/portal/guru/peluang', active: isUnder('/portal/guru/peluang') },
        { key: 'tracker', label: 'Tracker proyek', icon: 'tracker', href: '/portal/guru/tracker', active: isUnder('/portal/guru/tracker'), badge: trackerNew },
        { key: 'pesan', label: 'Pesan', icon: 'chat', href: '/portal/guru/pesan', active: isUnder('/portal/guru/pesan'), badge: unread },
        { key: 'profil', label: 'Profil', icon: 'user', active: isUnder('/portal/guru/profil') || isUnder('/portal/guru/tampilan'), children: [
          { label: 'Profil saya', href: '/portal/guru/profil', icon: 'user', active: isUnder('/portal/guru/profil') },
          { label: 'Tampilan profil', href: '/portal/guru/tampilan', icon: 'palette', active: isUnder('/portal/guru/tampilan') },
          { label: 'Lihat profil publik', href: profileHref, icon: 'globe', active: false, external: true },
        ] },
      ]
    : [
        { key: 'dashboard', label: 'Dashboard', icon: 'home', href: '/portal/siswa', active: pathname === '/portal/siswa' },
        { key: 'tracker', label: 'Tracker proyek', icon: 'tracker', href: '/portal/siswa/tracker', active: isUnder('/portal/siswa/tracker'), badge: trackerNew },
        { key: 'pesan', label: 'Pesan', icon: 'chat', href: '/portal/siswa/pesan', active: isUnder('/portal/siswa/pesan'), badge: unread },
        { key: 'karya', label: 'Karya saya', icon: 'image', active: isUnder('/portal/siswa/karya'), children: [
          { label: 'Semua karya', href: '/portal/siswa/karya', icon: 'list', active: pathname === '/portal/siswa/karya' || /^\/portal\/siswa\/karya\/[^/]+\/edit/.test(pathname) },
          { label: 'Karya baru', href: '/portal/siswa/karya/baru', icon: 'plus', active: pathname === '/portal/siswa/karya/baru' },
        ] },
        { key: 'proyek', label: 'Proyek kolaborasi', icon: 'users', active: isUnder('/portal/siswa/proyek'), children: [
          { label: 'Semua proyek', href: '/portal/siswa/proyek', icon: 'list', active: pathname === '/portal/siswa/proyek' || /^\/portal\/siswa\/proyek\/[^/]+\/edit/.test(pathname) },
          { label: 'Proyek baru', href: '/portal/siswa/proyek/baru', icon: 'plus', active: pathname === '/portal/siswa/proyek/baru' },
        ] },
        { key: 'profil', label: 'Profil', icon: 'user', active: isUnder('/portal/siswa/profil') || isUnder('/portal/siswa/tampilan'), children: [
          { label: 'Profil saya', href: '/portal/siswa/profil', icon: 'user', active: isUnder('/portal/siswa/profil') },
          { label: 'Tampilan profil', href: '/portal/siswa/tampilan', icon: 'palette', active: isUnder('/portal/siswa/tampilan') },
          { label: 'Lihat profil publik', href: profileHref, icon: 'globe', active: false, external: true },
        ] },
      ]
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const isOpen = (item: NavItem) => openGroups[item.key] ?? item.active
  const currentLabel = nav.flatMap((item) => item.children ? item.children.filter((child) => child.active).map((child) => child.label) : item.active ? [item.label] : [])[0]

  async function logout() {
    const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    if (!response.ok) return
    window.dispatchEvent(new Event('karyakita-session-change'))
    router.replace('/')
    router.refresh()
  }

  return <div className="workspace-layout" aria-busy={account ? undefined : true}>
    <aside className="workspace-sidebar">
      <Link className="workspace-brand" href="/" aria-label="TEL-CREATION — Beranda">
        <img className="tel-creation-mark" src="/brand/telkom-schools.png" alt="" />
        <span className="tel-creation-wordmark"><span className="tel-creation-name">TEL</span><span className="tel-creation-accent">-CREATION</span></span>
      </Link>
      <div className="workspace-context"><small>PORTAL</small><strong>{role === 'teacher' ? 'Guru' : 'Siswa'}</strong><span>{tagline}</span></div>
      <nav className="ws-nav" aria-label="Navigasi ruang kerja">
        <span className="workspace-nav-label">MENU</span>
        <ul>{nav.map((item) => {
          if (!item.children) return <li key={item.key}>{item.href ? <Link className="ws-row" href={item.href} aria-current={item.active ? 'page' : undefined}><span className="ws-ico"><NavIcon name={item.icon} /></span><span className="ws-label">{item.label}</span>{item.badge ? <span className="ws-badge" aria-label={`${item.badge} belum dibaca`}>{item.badge > 99 ? '99+' : item.badge}</span> : null}</Link> : <span className="ws-row is-pending" aria-hidden="true"><span className="ws-ico"><NavIcon name={item.icon} /></span><span className="ws-label">{item.label}</span></span>}</li>
          const open = isOpen(item)
          return <li key={item.key} className={`ws-group${open ? ' is-open' : ''}${item.active ? ' has-active' : ''}`}>
            <button type="button" className="ws-row ws-head" aria-expanded={open} aria-controls={`ws-sub-${item.key}`} onClick={() => setOpenGroups((current) => ({ ...current, [item.key]: !open }))}>
              <span className="ws-ico"><NavIcon name={item.icon} /></span><span className="ws-label">{item.label}</span>
              <svg className="ws-chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
            </button>
            <div className="ws-sub" id={`ws-sub-${item.key}`}><ul>{item.children.map((child) => <li key={child.label}>{child.href ? <Link className="ws-child" href={child.href} aria-current={child.active ? 'page' : undefined} {...(child.external ? { target: '_blank', rel: 'noreferrer' } : {})}>{child.label}{child.external && <span className="ws-ext" aria-hidden="true">↗</span>}</Link> : <span className="ws-child is-pending" aria-hidden="true">{child.label}</span>}</li>)}</ul></div>
          </li>
        })}</ul>
      </nav>
      <div className="workspace-sidebar-bottom">
        <Link className="workspace-view-site" href="/">Lihat situs publik <span aria-hidden="true">↗</span></Link>
      </div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar"><strong>{currentLabel || tagline}</strong><div className="workspace-topbar-actions">{account && profileHref ? <><WorkspaceNotifications accountID={account.id} /><WorkspaceAccountMenu name={account.name} role={account.role} profilePhoto={account.profilePhoto} profileHref={profileHref} editHref={account.role === 'student' ? '/portal/siswa/profil' : '/portal/guru/profil'} onLogout={() => void logout()} /></> : <><span className="sk workspace-bell-skeleton" /><span className="sk workspace-avatar-skeleton" /></>}</div></header>
      <div className="workspace-page">{children}</div>
    </div>
  </div>
}
