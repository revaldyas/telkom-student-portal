import type { Metadata } from 'next'
import SiteLayout from '../../components/SiteLayout'
import './globals.css'
import './refinement.css'
import './portfolio-editor.css'
import './workspace-notifications.css'
import './home-banner.css'
import './corporate.css'

export const metadata: Metadata = {
  title: 'Telkom Student Creation — Portofolio Siswa',
  description: 'Ruang untuk ide dan karya terbaik siswa SMK Telkom.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" data-scroll-behavior="smooth"><body><SiteLayout>{children}</SiteLayout></body></html>
}
