import { LeaderboardSkeleton } from '../../../components/SiteSkeletons'
import '../listing.css'

export default function Loading() {
  return <main className="lowfi-shell"><section className="lowfi-content kl-page"><header className="kl-head"><p className="kl-crumb">Beranda / Leaderboard</p><h1>Leaderboard</h1></header><div className="kl-bar"><span className="sk sk-filter" style={{ width: 260 }} /><span className="sk sk-filter" style={{ width: 170 }} /></div><LeaderboardSkeleton rows={6} /></section></main>
}
