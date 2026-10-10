import type { ReactNode } from 'react'

type CountProps = { count?: number }

function LoadingStatus({ label, children }: { label: string; children: ReactNode }) {
  return <div className="site-skeleton" role="status" aria-label={label} aria-busy="true">
    <span className="site-skeleton-sr">{label}</span>
    <div aria-hidden="true">{children}</div>
  </div>
}

export function HeroSkeleton() {
  return <LoadingStatus label="Memuat sorotan karya">
    <div className="home-slider skeleton-hero">
      <div className="skeleton-hero-copy"><span className="sk sk-kicker" /><span className="sk sk-title" /><span className="sk sk-title sk-title-short" /><span className="sk sk-line" /><span className="sk sk-line sk-line-short" /><span className="sk sk-button" /></div>
      <div className="skeleton-hero-media"><span className="sk skeleton-hero-art" /></div>
    </div>
  </LoadingStatus>
}

export function WorkGridSkeleton({ count = 6 }: CountProps) {
  return <LoadingStatus label="Memuat karya siswa"><div className="lowfi-work-grid">
    {Array.from({ length: count }, (_, index) => <div className="skeleton-work-card" key={index}>
      <div className="sk skeleton-work-media" />
      <div className="skeleton-work-body"><span className="sk sk-kicker" /><span className="sk sk-card-title" /><span className="sk sk-card-title sk-card-title-short" /><div className="skeleton-work-author"><span className="sk sk-avatar" /><span className="sk sk-author-line" /></div></div>
    </div>)}
  </div></LoadingStatus>
}

export function AwardCardsSkeleton() {
  return <LoadingStatus label="Memuat penghargaan"><div className="award-home-grid">
    {[0, 1].map((index) => <div className="skeleton-award-home" key={index}><span className="sk sk-kicker" /><div><span className="sk sk-award-title" /><span className="sk sk-line" /><span className="sk sk-line sk-line-short" /></div><span className="sk sk-award-footer" /></div>)}
  </div></LoadingStatus>
}

export function AwardListSkeleton({ count = 2 }: CountProps) {
  return <LoadingStatus label="Memuat daftar penghargaan"><div className="skeleton-award-list">
    {Array.from({ length: count }, (_, index) => <div className="skeleton-award-panel" key={index}>
      <span className="sk sk-kicker" /><span className="sk sk-award-title" /><span className="sk sk-line" /><span className="sk sk-line sk-line-short" />
      <div className="skeleton-nominees">{[0, 1, 2, 3].map((row) => <div className="skeleton-nominee" key={row}><span className="sk skeleton-nominee-image" /><div><span className="sk sk-kicker" /><span className="sk sk-card-title" /><span className="sk sk-author-line" /></div></div>)}</div>
    </div>)}
  </div></LoadingStatus>
}

export function LeaderboardSkeleton({ rows = 3 }: { rows?: number }) {
  return <LoadingStatus label="Memuat peringkat komunitas"><div className="leader-grid skeleton-leader-grid">
    {[0, 1, 2].map((panel) => <div className="lowfi-panel skeleton-leader-panel" key={panel}><span className="sk sk-panel-title" />
      {Array.from({ length: rows }, (_, row) => <div className="skeleton-leader-row" key={row}><span className="sk sk-rank" /><span className={`sk ${panel === 0 ? 'sk-avatar' : 'sk-work-thumb'}`} /><div><span className="sk sk-card-title" /><span className="sk sk-author-line" /></div></div>)}
    </div>)}
  </div></LoadingStatus>
}

export function ProfileSkeleton() {
  return <main className="lowfi-shell"><LoadingStatus label="Memuat profil siswa"><div className="lowfi-content student-profile-page skeleton-profile-page">
    <span className="sk sk-breadcrumb" />
    <div className="creator-profile-header skeleton-profile-header"><span className="sk skeleton-profile-avatar" /><div className="skeleton-profile-copy"><span className="sk sk-title sk-title-short" /><div className="skeleton-profile-stats"><span className="sk sk-stat" /><span className="sk sk-stat" /><span className="sk sk-stat" /></div><span className="sk sk-line sk-line-short" /><span className="sk sk-line" /><span className="sk sk-line sk-line-short" /></div></div>
    <div className="creator-achievements skeleton-profile-history"><span className="sk sk-panel-title" /><span className="sk sk-tab" /><span className="sk sk-line sk-line-short" /></div>
    <div className="creator-work-section skeleton-profile-works"><span className="sk sk-panel-title" /><span className="sk sk-filter" /><WorkGridSkeleton count={3} /></div>
  </div></LoadingStatus></main>
}

export function WorkDetailSkeleton() {
  return <main className="lowfi-shell"><LoadingStatus label="Memuat detail karya"><article className="lowfi-content work-detail skeleton-detail-page">
    <div className="work-detail-heading"><span className="sk sk-breadcrumb" /><span className="sk sk-title" /><span className="sk sk-title sk-title-short" /><span className="sk sk-kicker" /><div className="skeleton-work-author"><span className="sk sk-avatar" /><span className="sk sk-author-line" /></div></div>
    <div className="sk skeleton-detail-cover" />
    <div className="work-detail-body"><span className="sk sk-line" /><span className="sk sk-line" /><span className="sk sk-line sk-line-short" /><span className="sk sk-button" /><div className="skeleton-detail-panel"><span className="sk sk-panel-title" /><span className="sk sk-line" /><span className="sk sk-line sk-line-short" /></div></div>
  </article></LoadingStatus></main>
}

export function SearchResultsSkeleton() {
  return <LoadingStatus label="Mencari hasil"><div className="skeleton-search-results">{[0, 1, 2].map((item) => <div className="skeleton-search-row" key={item}><span className="sk sk-avatar" /><div><span className="sk sk-card-title" /><span className="sk sk-author-line" /></div></div>)}</div></LoadingStatus>
}

export function HomePageSkeleton() {
  return <main className="home-page"><HeroSkeleton /><section className="home-section"><div className="section-heading"><div><span className="section-kicker">PILIHAN KOMUNITAS</span><h2>Karya terbaru</h2></div></div><WorkGridSkeleton /></section><section className="home-section"><div className="section-heading"><div><span className="section-kicker">MOMEN APRESIASI</span><h2>Penghargaan tersedia</h2></div></div><AwardCardsSkeleton /></section><section className="home-section leaderboard-home"><div className="section-heading"><div><span className="section-kicker">KREATOR PILIHAN</span><h2>Leaderboard</h2></div></div><LeaderboardSkeleton /></section></main>
}

export function AuthSkeleton() {
  return <main className="auth-shell"><LoadingStatus label="Memuat formulir akun"><div className="skeleton-auth-layout"><div className="skeleton-auth-side"><span className="sk sk-kicker" /><div><span className="sk sk-title" /><span className="sk sk-title sk-title-short" /><span className="sk sk-line" /></div></div><div className="skeleton-auth-form"><span className="sk sk-breadcrumb" /><span className="sk sk-panel-title" /><span className="sk sk-line sk-line-short" />{[0, 1, 2, 3].map((row) => <div className="skeleton-auth-field" key={row}><span className="sk sk-kicker" /><span className="sk sk-filter" /></div>)}<span className="sk sk-button" /></div></div></LoadingStatus></main>
}
