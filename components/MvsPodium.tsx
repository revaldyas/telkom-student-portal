import Link from 'next/link'
import SkeletonImage from './SkeletonImage'

export type PodiumLeader = { id: string; name: string; profilePhoto: string | null; likes: number; comments: number; score?: number }

export const heartIcon = <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C1 8.5 3 5 6.4 5c2 0 3.6 1.1 4.6 2.7h2C14 6.1 15.6 5 17.6 5 21 5 23 8.5 21.6 11.8 19.5 16.4 12 21 12 21Z"/></svg>
export const chatIcon = <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>

export default function MvsPodium({ leaders }: { leaders: PodiumLeader[] }) {
  const top = leaders.filter((leader) => (leader.score || 0) > 0)
  return <section className="lb-podium-card" aria-label="Most Valuable Student">
    <div className="lb-card-head"><span className="lb-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg></span><div><h3>Most Valuable Student</h3><p>Kreator dengan interaksi terbanyak</p></div><span className="lb-brand" aria-label="TEL-CREATION"><img className="tel-creation-mark" src="/brand/telkom-schools.png" alt="" /><span className="tel-creation-wordmark"><span className="tel-creation-name">TEL</span><span className="tel-creation-accent">-CREATION</span></span></span></div>
    <div className="lb-podium">{[1, 0, 2].map((slot) => {
      const leader = top[slot]
      return leader ? <Link className={`lb-step lb-step--${slot + 1}`} href={`/siswa/${leader.id}`} key={leader.id}><span className="lb-avatar">{slot === 0 && <span className="lb-crown" aria-hidden="true">♛</span>}{leader.profilePhoto ? <SkeletonImage src={leader.profilePhoto} alt={`Foto profil ${leader.name}`} /> : <span className="lb-initial">{leader.name.slice(0, 1).toUpperCase()}</span>}</span><strong className="lb-name">{leader.name}</strong><span className="lb-stats lb-stats--center"><span>{heartIcon}{leader.likes}</span><span>{chatIcon}{leader.comments}</span></span><span className="lb-block"><b>{slot + 1}</b></span></Link>
        : <span className="lb-step lb-step--empty" key={`empty-${slot}`} aria-hidden="true"><span className="lb-block"><b>{slot + 1}</b></span></span>
    })}</div>
  </section>
}
