import { AwardListSkeleton } from '../../../components/SiteSkeletons'

export default function Loading() {
  return <main className="award-page"><header className="award-hero wrap"><div className="eyebrow muted">TELKOM STUDENT CREATION / PENGHARGAAN</div><h1>Rayakan karya<br /><span>yang menginspirasi.</span></h1><p>Apresiasi untuk karya terbaik siswa. Satu siswa, satu suara untuk setiap penghargaan.</p></header><section className="award-list wrap"><div className="listing-filters skeleton-listing-filters skeleton-listing-filters--two"><span className="sk sk-filter" /><span className="sk sk-filter" /></div><AwardListSkeleton /></section></main>
}
