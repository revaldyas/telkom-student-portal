import { WorkGridSkeleton } from '../../../components/SiteSkeletons'
import '../listing.css'

export default function Loading() {
  return <main className="lowfi-shell"><section className="lowfi-content kl-page"><header className="kl-head"><p className="kl-crumb">Beranda / Proyek kolaborasi</p><h1>Proyek Kolaborasi</h1></header><div className="kl-bar"><span className="sk sk-filter" style={{ width: 260 }} /><span className="sk sk-filter" style={{ width: 150 }} /><span className="sk sk-filter" style={{ width: 150 }} /></div><WorkGridSkeleton count={8} className="kl-grid" /></section></main>
}
