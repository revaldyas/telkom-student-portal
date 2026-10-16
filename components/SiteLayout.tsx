'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import SiteFooter from './SiteFooter'
import SiteNav from './SiteNav'
import WorkspaceLayout from './WorkspaceLayout'

type Account = { id: string | number; name: string; role: 'student' | 'teacher'; profilePhoto: string | null }

export default function SiteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [account, setAccount] = useState<Account | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const workspacePath = pathname === '/dashboard' || pathname.startsWith('/dashboard/') || pathname === '/portal' || pathname.startsWith('/portal/')

  const portalRole = pathname.startsWith('/portal/guru') ? 'teacher' : pathname.startsWith('/portal/siswa') ? 'student' : null

  useEffect(() => {
    if (!workspacePath) { setAccount(null); setSessionChecked(false); return }
    // Sesi cukup diperiksa sekali per kunjungan ke portal, bukan di setiap perpindahan halaman.
    if (sessionChecked) return
    let cancelled = false
    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled) return
        const user = data?.user
        setAccount(user && (user.role === 'student' || user.role === 'teacher') ? user as Account : null)
        setSessionChecked(true)
      })
      .catch(() => { if (!cancelled) { setAccount(null); setSessionChecked(true) } })
    return () => { cancelled = true }
  }, [workspacePath, sessionChecked])

  // Setelah profil diubah (atau sesi berganti), perbarui data akun di header tanpa menampilkan skeleton lagi.
  useEffect(() => {
    if (!workspacePath) return
    let latest = 0
    function refresh() {
      const ticket = ++latest
      fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
        .then(async (response) => response.ok ? response.json() : null)
        .then((data) => {
          const user = data?.user
          if (ticket === latest && user && (user.role === 'student' || user.role === 'teacher')) setAccount(user as Account)
        })
        .catch(() => undefined)
    }
    window.addEventListener('karyakita-session-change', refresh)
    return () => window.removeEventListener('karyakita-session-change', refresh)
  }, [workspacePath])

  const isCorrectWorkspace = Boolean(
    account && (
      (pathname.startsWith('/portal/siswa') && account.role === 'student') ||
      (pathname.startsWith('/portal/guru') && account.role === 'teacher')
    ),
  )
  if (isCorrectWorkspace && account) return <WorkspaceLayout account={account}>{children}</WorkspaceLayout>
  // Selama sesi diperiksa, tampilkan shell portal (sidebar berukuran sama) beserta halamannya, bukan layar kosong,
  // supaya tidak ada lompatan layout dan loading.tsx tiap halaman tetap terlihat.
  if (workspacePath && !sessionChecked && portalRole) return <WorkspaceLayout account={null} role={portalRole}>{children}</WorkspaceLayout>
  if (workspacePath && !sessionChecked) return <div className="workspace-checking"><img src="/brand/telkom-schools.png" alt="Telkom Schools" /><span>Memeriksa sesi akun…</span></div>

  return <>
    <SiteNav />
    {children}
    <SiteFooter />
  </>
}
