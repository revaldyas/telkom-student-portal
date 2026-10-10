import { LeaderboardSkeleton } from '../../../components/SiteSkeletons'

export default function Loading() {
  return <main className="lowfi-shell"><section className="lowfi-content"><p>Komunitas / Peringkat</p><h1>Leaderboard</h1><p>Top Likes dan Trending menampilkan karya beserta siswanya. Most Valuable Student dihitung dari total interaksi seluruh karya tiap siswa.</p><div className="listing-filters skeleton-listing-filters skeleton-listing-filters--two"><span className="sk sk-filter" /><span className="sk sk-filter" /></div><LeaderboardSkeleton rows={6} /></section></main>
}
