'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { siteFetch } from '../../../../lib/siteFetch'

type Props = { projectID: string | number; owner: boolean; published: boolean; assignment?: { role: 'primary' | 'supporting'; response: 'invited' | 'accepted' | 'declined' } | null; submitted: boolean }

export default function ProjectMentorWorkflow({ projectID, owner, published, assignment, submitted }: Props) {
  const router = useRouter()
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function act(action: string, values: Record<string, string> = {}) {
    setBusy(true); setMessage('')
    try {
      const response = await siteFetch(`/api/community/projects/${projectID}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...values }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || result.errors?.[0]?.message || 'Tindakan belum berhasil.')
      setMessage(action === 'respond' ? 'Respons undangan tersimpan.' : action === 'submit' ? 'Proyek diajukan untuk verifikasi.' : 'Tinjauan berhasil disimpan.')
      setFeedback(''); router.refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Tindakan belum berhasil.') }
    finally { setBusy(false) }
  }
  if (!owner && !assignment) return null
  return <section className="project-mentor-workflow">
    <h2>{owner ? 'Status pembimbing dan verifikasi' : 'Tinjauan proyek'}</h2>
    {owner && <p>{submitted ? 'Proyek sedang menunggu keputusan mentor utama.' : 'Setelah mentor utama menerima undangan, kamu dapat mengajukan proyek untuk ditinjau.'}</p>}
    {assignment?.response === 'invited' && <div className="project-workflow-actions"><p>Undangan sebagai <strong>{assignment.role === 'primary' ? 'mentor utama' : 'mentor pendamping'}</strong>.</p><button className="button button-primary" type="button" disabled={busy} onClick={() => void act('respond', { response: 'accepted' })}>Terima undangan</button><button className="button impact-secondary" type="button" disabled={busy} onClick={() => void act('respond', { response: 'declined' })}>Tolak</button></div>}
    {assignment?.response === 'accepted' && <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void act('review', { decision: String(form.get('decision')), feedback }) }}>
      <label htmlFor="project-review-decision">Tindakan</label><select id="project-review-decision" name="decision" disabled={assignment.role !== 'primary' || !submitted} defaultValue="comment"><option value="comment">Berikan masukan</option>{assignment.role === 'primary' && submitted && <><option value="verified">Setujui dan terbitkan</option><option value="revision-requested">Minta revisi</option></>}</select>
      <label htmlFor="project-review-feedback">Catatan untuk tim</label><textarea id="project-review-feedback" minLength={5} maxLength={3000} required value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Tuliskan masukan yang jelas dan dapat ditindaklanjuti." />
      {assignment.role !== 'primary' && <small>Mentor pendamping dapat memberi masukan. Keputusan akhir hanya tersedia untuk mentor utama.</small>}
      {!submitted && assignment.role === 'primary' && <small>Keputusan akhir aktif setelah tim mengajukan proyek.</small>}
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Kirim tinjauan'}</button>
    </form>}
    {owner && !published && !submitted && <button className="button button-primary" type="button" disabled={busy} onClick={() => void act('submit')}>Ajukan untuk verifikasi</button>}
    {message && <p role="status">{message}</p>}
  </section>
}
