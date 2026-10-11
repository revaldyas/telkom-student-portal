import Link from 'next/link'

export default function SiteFooter() {
  return <footer className="site-footer">
    <div className="site-footer-main">
      <div className="site-footer-brand"><Link className="site-brand" href="/" aria-label="TEL-CREATION — Beranda"><img className="tel-creation-mark" src="/brand/telkom-schools.png" alt="" /><span className="tel-creation-wordmark"><span className="tel-creation-name">TEL</span><span className="tel-creation-accent">-CREATION</span></span></Link><p>Ruang digital untuk menemukan, merayakan, dan mendukung karya siswa.</p></div>
      <div className="site-footer-links"><strong>JELAJAHI</strong><Link href="/karya">Semua karya</Link><Link href="/awards">Penghargaan</Link><Link href="/leaderboard">Peringkat siswa</Link><Link href="/peluang">Peluang & kolaborasi</Link></div>
      <div className="site-footer-links"><strong>BERGABUNG</strong><Link href="/register">Daftar sebagai siswa</Link><Link href="/login">Masuk ke akun</Link></div>
    </div>
    <div className="site-footer-bottom"><span>© {new Date().getFullYear()} Telkom Student Creation · SMK Telkom</span><Link href="/">Karya siswa, inspirasi bersama.</Link></div>
  </footer>
}
