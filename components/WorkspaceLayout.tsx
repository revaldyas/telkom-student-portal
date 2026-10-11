'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import SkeletonImage from './SkeletonImage'
import WorkspaceNotifications from './WorkspaceNotifications'

type Account = { id: string | number; name: string; role: 'student' | 'teacher'; profilePhoto: string | null }

export default function WorkspaceLayout({ children, account }: { children: ReactNode; account: Account }) {
  const pathname = usePathname()
  const router = useRouter()
  const profileHref = account.role === 'teacher' ? `/guru/${account.id}` : `/siswa/${account.id}`
  const firstName = account.name.trim().split(/\s+/)[0] || 'Akun'
  const links = account.role === 'teacher'
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
        { label: 'Profil publik', href: profileHref, active: false },
      ]

  async function logout() {
    const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    if (!response.ok) return
    window.dispatchEvent(new Event('karyakita-session-change'))
    router.replace('/')
    router.refresh()
  }

  return <div className="workspace-layout">
    <aside className="workspace-sidebar">
      <Link className="workspace-brand" href="/" aria-label="TEL-CREATION — Beranda">
        <img className="tel-creation-mark" src="/brand/telkom-schools.png" alt="" />
        <span className="tel-creation-wordmark"><span className="tel-creation-name">TEL</span><span className="tel-creation-accent">-CREATION</span></span>
      </Link>
      <div className="workspace-context"><span className="workspace-context-mark" aria-hidden="true">{account.role === 'teacher' ? 'G' : 'S'}</span><span><small>PORTAL {account.role === 'teacher' ? 'GURU' : 'SISWA'}</small><strong>Ruang kerja</strong></span></div>
      <nav className="workspace-links" aria-label="Navigasi ruang kerja">
        <span className="workspace-nav-label">MENU</span>
        {links.map((link) => <Link key={link.href} href={link.href} aria-current={link.active ? 'page' : undefined}>{link.label}</Link>)}
      </nav>
      <div className="workspace-sidebar-bottom">
        <Link className="workspace-view-site" href="/">Lihat situs publik <span aria-hidden="true">↗</span></Link>
        <div className="workspace-account">
          {account.profilePhoto ? <SkeletonImage className="workspace-avatar" src={account.profilePhoto} alt="" /> : <span className="workspace-avatar workspace-avatar-initial">{firstName.slice(0, 1).toUpperCase()}</span>}
          <span className="workspace-account-name"><strong>{account.name}</strong><small>{account.role === 'teacher' ? 'Guru / Mentor' : 'Siswa'}</small></span>
          <button type="button" className="workspace-logout" onClick={() => void logout()} aria-label="Keluar">Keluar</button>
        </div>
      </div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-topbar"><span><small>PORTAL {account.role === 'teacher' ? 'GURU' : 'SISWA'}</small><strong>{links.find((link) => link.active)?.label || 'Ruang kerja'}</strong></span><div className="workspace-topbar-actions"><WorkspaceNotifications accountID={account.id} /><Link href={profileHref}>{firstName}<span aria-hidden="true"> ↗</span></Link></div></header>
      <div className="workspace-page">{children}</div>
    </div>
  </div>
}
