import type { ReactNode } from 'react'

type CountProps = { count?: number; className?: string }

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

export function WorkGridSkeleton({ count = 6, className = '' }: CountProps) {
  return <LoadingStatus label="Memuat karya siswa"><div className={`lowfi-work-grid ${className}`.trim()}>
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

export function PortfolioFormSkeleton() {
  return <main className="portal-page portfolio-form-page"><LoadingStatus label="Memuat formulir"><div className="skeleton-portal-form">
    <span className="sk sk-breadcrumb" />
    <div className="portal-page-heading portfolio-form-heading"><div><span className="sk sk-kicker" /><span className="sk sk-title" /><span className="sk sk-line" /></div><span className="sk sk-button" /></div>
    {[3, 1, 2].map((fields, section) => <section className="portfolio-form-skeleton-section" key={section}><div className="sk sk-panel-title" />{Array.from({ length: fields }, (_, field) => <div className="sk sk-filter" key={field} />)}</section>)}
  </div></LoadingStatus></main>
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

/* ——— Portal siswa dan guru ——— */

function PortalHeroSkeleton({ actions }: { actions: number }) {
  return <header className="portal-hero skeleton-portal-hero">
    <span className="sk sk-kicker" /><span className="sk sk-title" /><span className="sk sk-line sk-line-short" />
    <div className="portal-hero-actions">{Array.from({ length: actions }, (_, index) => <span className="sk sk-button" key={index} />)}</div>
  </header>
}

function PortalPanelHeadingSkeleton() {
  return <header><div><span className="sk sk-kicker" /><span className="sk sk-panel-title" /></div><span className="sk sk-link" /></header>
}

function PortalWorkRowsSkeleton({ rows = 5, thumb = true }: { rows?: number; thumb?: boolean }) {
  return <div className="portal-work-list">{Array.from({ length: rows }, (_, index) => <article key={index}>
    {thumb ? <div className="portal-work-main"><span className="sk skeleton-portal-thumb" /><div className="portal-work-copy"><span className="sk sk-card-title" /><span className="sk sk-author-line" /></div></div>
      : <div><span className="sk sk-card-title" /><span className="sk sk-author-line" /></div>}
    <div className="portal-work-actions"><span className="sk sk-status" /><span className="sk sk-link" /></div>
  </article>)}</div>
}

export function PortalStudentDashboardSkeleton() {
  return <main className="portal-page"><LoadingStatus label="Memuat dashboard siswa"><div>
    <PortalHeroSkeleton actions={3} />
    <section className="portal-stat-grid">{[0, 1, 2, 3].map((index) => <article key={index}><span className="sk sk-kicker" /><span className="sk sk-stat-value" /></article>)}</section>
    <section className="portal-panel"><PortalPanelHeadingSkeleton /><PortalWorkRowsSkeleton /></section>
  </div></LoadingStatus></main>
}

export function PortalTeacherDashboardSkeleton() {
  return <main className="portal-page"><LoadingStatus label="Memuat dashboard guru"><div>
    <PortalHeroSkeleton actions={3} />
    <section className="portal-impact-section">
      <header className="portal-impact-heading"><div className="skeleton-heading-copy"><span className="sk sk-kicker" /><span className="sk sk-panel-title skeleton-impact-title" /><span className="sk sk-line" /></div><div className="portal-hero-actions"><span className="sk sk-button" /><span className="sk sk-button" /></div></header>
      <section className="impact-stats">{[0, 1, 2, 3, 4, 5].map((index) => <article key={index}><span className="sk sk-kicker" /><span className="sk sk-stat-value skeleton-impact-value" /><span className="sk sk-author-line" /></article>)}</section>
      <section className="portal-panel portal-review-queue"><PortalPanelHeadingSkeleton /><PortalWorkRowsSkeleton thumb={false} /></section>
      <section className="impact-columns">{[0, 1].map((index) => <article className="impact-panel" key={index}><header><div><span className="sk sk-kicker" /><span className="sk sk-panel-title" /></div><span className="sk sk-link" /></header><div className="skeleton-impact-bars">{[0, 1, 2, 3].map((row) => <span className="sk sk-line" key={row} />)}</div></article>)}</section>
    </section>
  </div></LoadingStatus></main>
}

/** Halaman daftar di portal siswa (karya saya, proyek saya). */
export function PortalListSkeleton({ rows = 5 }: { rows?: number }) {
  return <main className="portal-page"><LoadingStatus label="Memuat daftar"><div>
    <header className="portal-page-heading"><div className="skeleton-heading-copy"><span className="sk sk-kicker" /><span className="sk sk-title" /><span className="sk sk-line" /></div><span className="sk sk-button" /></header>
    <section className="portal-panel"><header><span className="sk sk-panel-title" /><span className="sk sk-link" /></header><PortalWorkRowsSkeleton rows={rows} /></section>
  </div></LoadingStatus></main>
}

/** Kartu undangan/tinjauan/peluang guru; dipakai juga oleh halaman klien saat data dimuat. */
export function MentorCardsSkeleton({ layout = 'list', count = 3, announce = false }: { layout?: 'grid' | 'list'; count?: number; announce?: boolean }) {
  const list = <div className={`mentor-list is-${layout}`}>{Array.from({ length: count }, (_, index) => <div className="mentor-card mentor-skeleton" key={index}>
    <span className="sk mentor-skeleton-cover" />
    <div className="mentor-card-content"><div className="mentor-card-top"><span className="sk sk-badge" /><span className="sk sk-author-line" /></div><span className="sk sk-card-title mentor-skeleton-title" /><span className="sk sk-line" /><span className="sk sk-line sk-line-short" /><span className="sk sk-button" /></div>
  </div>)}</div>
  return announce ? <LoadingStatus label="Memuat daftar">{list}</LoadingStatus> : list
}

/** Halaman guru yang dirender di klien (verifikasi, peluang). */
export function MentorPageSkeleton({ heading = 'Memuat halaman guru' }: { heading?: string }) {
  return <main className="mentor-page wrap"><LoadingStatus label={heading}><div>
    <header className="mentor-hero skeleton-mentor-hero"><span className="sk sk-kicker" /><span className="sk sk-title" /><span className="sk sk-title sk-title-short" /><span className="sk sk-line" /><span className="sk sk-button" /></header>
    <div className="mentor-list-heading"><div className="skeleton-heading-copy"><span className="sk sk-kicker" /><span className="sk sk-panel-title" /></div></div>
    <MentorCardsSkeleton />
  </div></LoadingStatus></main>
}
