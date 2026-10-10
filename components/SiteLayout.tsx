'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import SiteFooter from './SiteFooter'
import SiteNav from './SiteNav'

export default function SiteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return children

  return <>
    <SiteNav />
    {children}
    <SiteFooter />
  </>
}
