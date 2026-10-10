import { WorkGridSkeleton } from '../../../components/SiteSkeletons'

export default function Loading() {
  return <main className="lowfi-shell"><section className="lowfi-content"><p>Beranda / Semua Karya</p><div className="lowfi-section-heading"><h1>Semua Karya</h1></div><div className="listing-filters skeleton-listing-filters"><span className="sk sk-filter" /><span className="sk sk-filter" /><span className="sk sk-filter" /><span className="sk sk-filter" /></div><WorkGridSkeleton count={9} /></section></main>
}
