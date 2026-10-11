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

  useEffect(() => {
    if (!workspacePath) return
    let cancelled = false
    setSessionChecked(false)
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
  }, [pathname, workspacePath])

  const isCorrectWorkspace = Boolean(
    account && (
      (pathname.startsWith('/portal/siswa') && account.role === 'student') ||
      (pathname.startsWith('/portal/guru') && account.role === 'teacher')
    ),
  )
  if (isCorrectWorkspace && account) return <WorkspaceLayout account={account}>{children}</WorkspaceLayout>
  if (workspacePath && !sessionChecked) return <div className="workspace-checking"><img src="/brand/telkom-schools.png" alt="Telkom Schools" /><span>Memeriksa sesi akun…</span></div>

  return <>
    <SiteNav />
    {children}
    <SiteFooter />
  </>
}
