'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

type Comment = { id: number; body: string; createdAt: string; edited: boolean; mine: boolean; canDelete: boolean; author: { id: number; name: string; photo: string | null; role: string } | null }
type Stats = { likes: number; comments: number; liked: boolean; role: string | null }

const ago = (value: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} mnt lalu`
  if (minutes < 1440) return `${Math.round(minutes / 60)} jam lalu`
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Suka dan komentar proyek: tombol suka, daftar komentar, dan formulir komentar. */
export default function ProjectSocial({ projectID, isTeam }: { projectID: number; isTeam: boolean }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null)

  const load = useCallback(async () => {
    const [statsResponse, commentsResponse] = await Promise.all([
      fetch(`/api/community/projects/${projectID}/stats`, { credentials: 'same-origin', cache: 'no-store' }),
      fetch(`/api/community/projects/${projectID}/comments`, { credentials: 'same-origin', cache: 'no-store' }),
    ])
    if (statsResponse.ok) setStats(await statsResponse.json())
    if (commentsResponse.ok) setComments((await commentsResponse.json()).comments)
  }, [projectID])
  useEffect(() => { void load() }, [load])

  const flash = (value: string) => { setMessage(value); setTimeout(() => setMessage(''), 3200) }
  // Siswa dan guru dapat berkomentar (termasuk tim proyek); menyukai proyek sendiri tidak diperbolehkan.
  const canInteract = stats?.role === 'student' || stats?.role === 'teacher'

  async function toggleLike() {
    if (!stats) return
    if (!stats.role) { window.location.assign('/login'); return }
    setBusy(true)
    const previous = stats
    setStats({ ...stats, liked: !stats.liked, likes: stats.likes + (stats.liked ? -1 : 1) })
    const response = await fetch(`/api/community/projects/${projectID}/like`, { method: 'POST', credentials: 'same-origin' })
    const data = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) { setStats(previous); flash(data.message || 'Suka belum tersimpan.'); return }
    setStats((current) => current ? { ...current, liked: data.liked, likes: data.likes } : current)
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const body = text.trim()
    if (body.length < 2) return
    setBusy(true)
    const response = await fetch(`/api/community/projects/${projectID}/comments`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) })
    const data = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) { flash(data.message || 'Komentar belum terkirim.'); return }
    setText(''); setComments((current) => [...current, data.comment]); setStats((current) => current ? { ...current, comments: current.comments + 1 } : current)
  }
  async function saveEdit(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    const body = editing.text.trim()
    if (body.length < 2) return
    setBusy(true)
    const response = await fetch(`/api/community/projects/${projectID}/comments?commentID=${editing.id}`, { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) })
    const data = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) { flash(data.message || 'Komentar belum tersimpan.'); return }
    setComments((current) => current.map((item) => item.id === editing.id ? data.comment : item)); setEditing(null)
  }
  async function remove(comment: Comment) {
    if (!window.confirm('Hapus komentar ini?')) return
    const response = await fetch(`/api/community/projects/${projectID}/comments?commentID=${comment.id}`, { method: 'DELETE', credentials: 'same-origin' })
    if (!response.ok) { flash('Komentar belum terhapus.'); return }
    setComments((current) => current.filter((item) => item.id !== comment.id)); setStats((current) => current ? { ...current, comments: Math.max(0, current.comments - 1) } : current)
  }

  return <section className="wd-section wd-comments" id="komentar">
    <div className="ps-bar">
      <button type="button" className={`wd-like ps-like${stats?.liked ? ' is-liked' : ''}`} disabled={busy || !stats || isTeam} aria-pressed={Boolean(stats?.liked)} title={isTeam ? 'Kamu tidak dapat menyukai proyek timmu sendiri' : undefined} onClick={() => void toggleLike()}><span aria-hidden="true">{stats?.liked ? '♥' : '♡'}</span>{stats?.liked ? 'Disukai' : 'Suka'}<b>{stats?.likes ?? 0}</b></button>
      <a className="wd-ghost" href="#komentar-form">💬 {stats?.comments ?? comments.length} komentar</a>
      {stats && !stats.role && <small className="wd-hint">Masuk untuk menyukai dan berkomentar. <Link href="/login">Masuk</Link></small>}
    </div>
    <h2>Komentar <small>{comments.length}</small></h2>
    {canInteract ? <form id="komentar-form" onSubmit={submit} className="wd-comment-form"><label htmlFor="project-comment" className="sr-only">Tulis komentar</label><textarea id="project-comment" value={text} onChange={(event) => setText(event.target.value)} required minLength={2} maxLength={1200} placeholder="Berikan tanggapan yang membangun…" /><div><small>{text.length}/1200</small><button disabled={busy || text.trim().length < 2}>{busy ? 'Mengirim…' : 'Kirim komentar'}</button></div></form>
      : null}
    {comments.length ? <ul className="wd-comment-list">{[...comments].reverse().map((comment) => <li key={comment.id}><span className="wd-avatar sm">{comment.author?.photo ? <img src={comment.author.photo} alt="" loading="lazy" /> : (comment.author?.name || '?').slice(0, 1).toUpperCase()}</span><div><p className="wd-comment-meta"><Link href={`/${comment.author?.role === 'teacher' ? 'guru' : 'siswa'}/${comment.author?.id}`}>{comment.author?.name || 'Siswa'}</Link><time dateTime={comment.createdAt}>{ago(comment.createdAt)}</time>{comment.edited && <em className="wd-edited">diedit</em>}<span className="wd-comment-actions">{comment.mine && editing?.id !== comment.id && <button type="button" className="ps-edit" onClick={() => setEditing({ id: comment.id, text: comment.body })}>Edit</button>}{comment.canDelete && <button type="button" className="ps-del" onClick={() => void remove(comment)}>Hapus</button>}</span></p>{editing?.id === comment.id ? <form className="wd-comment-edit" onSubmit={saveEdit}><textarea value={editing.text} onChange={(event) => setEditing({ id: comment.id, text: event.target.value })} required minLength={2} maxLength={1200} aria-label="Edit komentar" /><div><button type="button" onClick={() => setEditing(null)}>Batal</button><button disabled={busy || editing.text.trim().length < 2}>{busy ? 'Menyimpan…' : 'Simpan'}</button></div></form> : <p>{comment.body}</p>}</div></li>)}</ul>
      : <p className="wd-empty">Belum ada komentar. Jadilah yang pertama memberi tanggapan.</p>}
    {message && <p className="wd-toast" role="status">{message}</p>}
  </section>
}
