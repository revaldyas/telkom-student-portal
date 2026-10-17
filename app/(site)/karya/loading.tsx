import { WorkGridSkeleton } from '../../../components/SiteSkeletons'
import '../listing.css'

export default function Loading() {
  return <main className="lowfi-shell"><section className="lowfi-content kl-page"><header className="kl-head"><div><p className="kl-crumb">Beranda / Semua Karya</p><h1>Semua Karya</h1></div></header><div className="kl-bar"><span className="sk sk-filter" style={{ width: 260 }} /><span className="sk sk-filter" style={{ width: 150 }} /><span className="sk sk-filter" style={{ width: 150 }} /></div><WorkGridSkeleton count={8} className="kl-grid" /></section></main>
}
