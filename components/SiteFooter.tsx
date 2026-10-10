import Link from 'next/link'

export default function SiteFooter() {
  return <footer className="site-footer">
    <div className="site-footer-main">
      <div className="site-footer-brand"><Link className="site-brand" href="/" aria-label="Telkom Student Creation — Beranda"><img className="site-brand-logo" src="/brand/telkom-schools.png" width="160" height="53" alt="Telkom Schools — SMK Telkom Jakarta" /><span className="site-brand-name">Telkom Student Creation</span></Link><p>Ruang digital untuk menemukan, merayakan, dan mendukung karya siswa.</p></div>
      <div className="site-footer-links"><strong>JELAJAHI</strong><Link href="/karya">Semua karya</Link><Link href="/awards">Penghargaan</Link><Link href="/leaderboard">Peringkat siswa</Link></div>
      <div className="site-footer-links"><strong>BERGABUNG</strong><Link href="/register">Daftar sebagai siswa</Link><Link href="/login">Masuk ke akun</Link></div>
    </div>
    <div className="site-footer-bottom"><span>© {new Date().getFullYear()} Telkom Student Creation · SMK Telkom</span><Link href="/">Karya siswa, inspirasi bersama.</Link></div>
  </footer>
}
