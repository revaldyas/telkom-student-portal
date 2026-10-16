'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import WorkspaceAccountMenu from './WorkspaceAccountMenu'
import WorkspaceNotifications from './WorkspaceNotifications'

type Account = { id: string | number; name: string; role: 'student' | 'teacher'; profilePhoto: string | null }

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
  const links = role === 'teacher'
    ? [
        { label: 'Dashboard', href: '/portal/guru', active: pathname === '/portal/guru' },
        { label: 'Verifikasi karya', href: '/portal/guru/verifikasi', active: pathname.startsWith('/portal/guru/verifikasi') },
        { label: 'Peluang siswa', href: '/portal/guru/peluang', active: pathname.startsWith('/portal/guru/peluang') },
        { label: 'Profil publik', href: profileHref, active: false },
      ]
    : [
        { label: 'Dashboard', href: '/portal/siswa', active: pathname === '/portal/siswa' },
        { label: 'Karya saya', href: '/portal/siswa/karya', active: pathname.startsWith('/portal/siswa/karya') },
        { label: 'Proyek kolaborasi', href: '/portal/siswa/proyek', active: pathname.startsWith('/portal/siswa/proyek') },
        { label: 'Profil saya', href: '/portal/siswa/profil', active: pathname.startsWith('/portal/siswa/profil') },
        { label: 'Profil publik', href: profileHref, active: false },
      ]

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
      <nav className="workspace-links" aria-label="Navigasi ruang kerja">
        <span className="workspace-nav-label">MENU</span>
        {links.map((link) => link.href ? <Link key={link.label} href={link.href} aria-current={link.active ? 'page' : undefined}>{link.label}</Link> : <span key={link.label} className="workspace-link-pending" aria-hidden="true">{link.label}</span>)}
      </nav>
      <div className="workspace-sidebar-bottom">
        <Link className="workspace-view-site" href="/">Lihat situs publik <span aria-hidden="true">↗</span></Link>
      </div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar"><strong>{links.find((link) => link.active)?.label || tagline}</strong><div className="workspace-topbar-actions">{account && profileHref ? <><WorkspaceNotifications accountID={account.id} /><WorkspaceAccountMenu name={account.name} role={account.role} profilePhoto={account.profilePhoto} profileHref={profileHref} editHref={account.role === 'student' ? '/portal/siswa/profil' : null} onLogout={() => void logout()} /></> : <><span className="sk workspace-bell-skeleton" /><span className="sk workspace-avatar-skeleton" /></>}</div></header>
      <div className="workspace-page">{children}</div>
    </div>
  </div>
}
