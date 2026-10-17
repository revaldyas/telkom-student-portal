import { AwardListSkeleton } from '../../../components/SiteSkeletons'
import '../listing.css'

export default function Loading() {
  return <main className="award-page"><section className="award-list wrap kl-page"><header className="kl-head"><p className="kl-crumb">Beranda / Penghargaan</p><h1>Penghargaan</h1></header><div className="kl-bar"><span className="sk sk-filter" style={{ width: 260 }} /><span className="sk sk-filter" style={{ width: 150 }} /></div><AwardListSkeleton /></section></main>
}
