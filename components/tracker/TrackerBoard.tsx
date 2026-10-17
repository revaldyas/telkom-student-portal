'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import DashIcon from '../DashIcon'
import './tracker.css'
import { markSeen } from '../../lib/trackerSeen'
import { Av, Pill, Stack, ago, api, dueInfo, lastSeenText, priorities, priorityOf, statusOf, statuses, type Activity, type ChecklistItem, type Member, type Priority, type Status, type Task } from './trackerShared'

type ProjectInfo = { id: number; title: string; slug: string; summary: string; year: number | null; published: boolean; category: string | null; cover: string | null }
type Data = { project: ProjectInfo; me: { id: number; role: string; canManage: boolean }; team: Member[]; tasks: Task[]; activity: Activity[] }
type Comment = { id: number; body: string; createdAt: string; author: { id: number; name: string; photo: string | null } | null }
type View = 'board' | 'list' | 'activity' | 'summary'

const actionIcon: Record<string, { icon: string; tone: string }> = {
  'task.created': { icon: '＋', tone: 'blue' }, 'task.moved': { icon: '⇄', tone: 'purple' }, 'task.assigned': { icon: '👤', tone: 'green' }, 'task.unassigned': { icon: '👤', tone: 'grey' },
  'task.updated': { icon: '✎', tone: 'orange' }, 'task.checklist': { icon: '☑', tone: 'green' }, 'task.commented': { icon: '💬', tone: 'blue' }, 'task.deleted': { icon: '🗑', tone: 'red' },
}
const dayLabel = (value: string) => {
  const date = new Date(value), start = new Date(); start.setHours(0, 0, 0, 0)
  if (date.getTime() >= start.getTime()) return 'Hari ini'
  if (date.getTime() >= start.getTime() - 86400000) return 'Kemarin'
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
}
const toDateInput = (value: string | null) => value ? new Date(value).toISOString().slice(0, 10) : ''

export default function TrackerBoard({ projectID, role, meID }: { projectID: number; role: 'student' | 'teacher'; meID: number }) {
  const base = `/portal/${role === 'teacher' ? 'guru' : 'siswa'}`
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('board')
  const [query, setQuery] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'me' | 'none' | number>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [openID, setOpenID] = useState<number | null>(null)
  const [dragID, setDragID] = useState<number | null>(null)
  const [overStatus, setOverStatus] = useState<Status | null>(null)
  const [adding, setAdding] = useState<Status | null>(null)
  const [quick, setQuick] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [moreActivity, setMoreActivity] = useState<Activity[]>([])
  const [hasMoreActivity, setHasMoreActivity] = useState(true)
  const draggingRef = useRef(false)
  draggingRef.current = dragID !== null

  const flash = useCallback((message: string) => { setToast(message); setTimeout(() => setToast(''), 3200) }, [])
  const load = useCallback(async () => {
    const result = await api<Data>(`/api/tracker/projects/${projectID}`)
    if (!result.ok) { setError(result.data.message || 'Proyek tidak dapat dibuka.'); return }
    setError(''); setData(result.data)
  }, [projectID])

  useEffect(() => { const requested = Number(new URLSearchParams(window.location.search).get('task')); if (requested) setOpenID(requested) }, [])
  // Selama papan terbuka, aktivitas proyek ini dianggap sudah dilihat.
  useEffect(() => { markSeen(meID, projectID); const timer = setInterval(() => markSeen(meID, projectID), 15000); return () => { clearInterval(timer); markSeen(meID, projectID) } }, [meID, projectID])
  useEffect(() => { void load(); const timer = setInterval(() => { if (!document.hidden && !draggingRef.current) void load() }, 8000); return () => clearInterval(timer) }, [load])

  const team = data?.team || []
  const tasks = useMemo(() => data?.tasks || [], [data])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return tasks.filter((task) => (!needle || `${task.title} ${task.labels.join(' ')} ${task.description}`.toLowerCase().includes(needle))
      && (priorityFilter === 'all' || task.priority === priorityFilter)
      && (assigneeFilter === 'all' || (assigneeFilter === 'me' ? task.assignees.includes(meID) : assigneeFilter === 'none' ? task.assignees.length === 0 : task.assignees.includes(assigneeFilter))))
  }, [tasks, query, priorityFilter, assigneeFilter, meID])

  const stats = useMemo(() => {
    const now = Date.now(), week = now + 7 * 86400000
    const done = tasks.filter((task) => task.status === 'done').length
    const open = tasks.filter((task) => task.status !== 'done')
    return {
      total: tasks.length, done, doing: tasks.filter((task) => task.status === 'doing').length, review: tasks.filter((task) => task.status === 'review').length,
      overdue: open.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < now).length,
      soon: open.filter((task) => task.dueDate && new Date(task.dueDate).getTime() >= now && new Date(task.dueDate).getTime() <= week).length,
      percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    }
  }, [tasks])

  function patchLocal(id: number, partial: Partial<Task>) { setData((current) => current ? { ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, ...partial } : task) } : current) }
  const patchTask = useCallback(async (id: number, body: Record<string, unknown>) => {
    patchLocal(id, body as Partial<Task>)
    const result = await api<{ task: Task }>(`/api/tracker/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
    if (!result.ok) { flash(result.data.message || 'Perubahan belum tersimpan.'); await load(); return false }
    setData((current) => current ? { ...current, tasks: current.tasks.map((task) => task.id === id ? { ...result.data.task, commentCount: task.commentCount } : task) } : current)
    void load()
    return true
  }, [flash, load])
  async function createTask(body: Record<string, unknown>) {
    const result = await api<{ task: Task }>(`/api/tracker/projects/${projectID}/tasks`, { method: 'POST', body: JSON.stringify(body) })
    if (!result.ok) { flash(result.data.message || 'Tugas belum dibuat.'); return null }
    await load()
    return result.data.task
  }
  async function deleteTask(id: number) {
    const result = await api(`/api/tracker/tasks/${id}`, { method: 'DELETE' })
    if (!result.ok) { flash((result.data as { message?: string }).message || 'Tugas belum dihapus.'); return }
    setOpenID(null); flash('Tugas dihapus.'); await load()
  }

  function columnTasks(status: Status) { return filtered.filter((task) => task.status === status).sort((a, b) => a.position - b.position) }
  function drop(status: Status, beforeID?: number) {
    if (dragID === null) return
    const moving = tasks.find((task) => task.id === dragID)
    setDragID(null); setOverStatus(null)
    if (!moving) return
    const column = tasks.filter((task) => task.status === status && task.id !== moving.id).sort((a, b) => a.position - b.position)
    let position: number
    if (beforeID !== undefined) {
      const index = column.findIndex((task) => task.id === beforeID)
      const next = column[index], previous = column[index - 1]
      position = next ? (previous ? (previous.position + next.position) / 2 : next.position - 500) : (column.at(-1)?.position ?? 0) + 1000
    } else position = (column.at(-1)?.position ?? 0) + 1000
    if (moving.status === status && beforeID === undefined && column.length === 0) return
    void patchTask(moving.id, { status, position })
  }
  function move(task: Task, direction: -1 | 1) {
    const index = statuses.findIndex((item) => item.key === task.status) + direction
    if (index < 0 || index >= statuses.length) return
    const target = statuses[index].key
    const last = tasks.filter((item) => item.status === target).sort((a, b) => a.position - b.position).at(-1)
    void patchTask(task.id, { status: target, position: (last?.position ?? 0) + 1000 })
  }
  async function quickAdd(status: Status) {
    const title = quick.trim()
    if (!title) { setAdding(null); return }
    setQuick('')
    await createTask({ title, status })
  }
  const onQuickKey = (event: KeyboardEvent<HTMLInputElement>, status: Status) => { if (event.key === 'Enter') { event.preventDefault(); void quickAdd(status) } else if (event.key === 'Escape') { setAdding(null); setQuick('') } }

  async function loadMoreActivity() {
    const all = [...(data?.activity || []), ...moreActivity]
    const last = all.at(-1)
    if (!last) return
    const result = await api<{ activity: Activity[]; hasMore: boolean }>(`/api/tracker/projects/${projectID}/activity?before=${last.id}`)
    if (result.ok) { setMoreActivity((current) => [...current, ...result.data.activity]); setHasMoreActivity(result.data.hasMore) }
  }

  if (error) return <div className="tk-fatal"><span aria-hidden="true">🔒</span><strong>{error}</strong><Link href={`${base}/tracker`}>← Kembali ke tracker</Link></div>
  if (!data) return <div className="tk-loading"><span className="sk" /><span className="sk" /><span className="sk" /></div>
  const { project, me } = data
  const openTask = tasks.find((task) => task.id === openID) || null
  const onlineCount = team.filter((member) => member.online).length
  const activity = [...data.activity, ...moreActivity.filter((entry) => !data.activity.some((item) => item.id === entry.id))]

  return <div className="tk">
    <header className="tk-head">
      <div className="tk-crumb"><Link href={`${base}/tracker`}>← Tracker</Link></div>
      <div className="tk-title-row">
        <span className="tk-cover">{project.cover ? <img src={project.cover} alt="" /> : <b>{project.title.slice(0, 1).toUpperCase()}</b>}</span>
        <div className="tk-title"><h1>{project.title}</h1><div className="tk-meta">{project.category && <Pill tone="orange">{project.category}</Pill>}{project.year && <Pill tone="grey">{project.year}</Pill>}<Pill tone={project.published ? 'green' : 'grey'}>{project.published ? 'Terbit' : 'Draf'}</Pill></div></div>
        <div className="tk-head-actions">
          <div className="tk-team" aria-label="Anggota tim"><div className="tk-team-stack">{team.slice(0, 6).map((member) => <Av key={member.id} name={member.name} photo={member.photo} size={34} online={member.online} ring />)}{team.length > 6 && <span className="tk-more" style={{ width: 34, height: 34 }}>+{team.length - 6}</span>}</div><small><i className={`tk-dot is-inline${onlineCount ? ' is-online' : ''}`} />{onlineCount} online · {team.length} anggota</small></div>
          <Link className="tk-btn tk-btn--ghost" href={`${base}/pesan?room=project:${project.id}`}>💬 Chat</Link>
          <Link className="tk-btn tk-btn--ghost" href={`/proyek/${project.slug}`}>Halaman proyek ↗</Link>
          <button type="button" className="tk-btn" onClick={() => setNewOpen(true)}><DashIcon name="plus" size={16} />Tugas baru</button>
        </div>
      </div>
      <div className="tk-progress"><div className="tk-progress-top"><strong>{stats.percent}% selesai</strong><span>{stats.done} dari {stats.total} tugas</span></div><div className="tk-bar" role="progressbar" aria-valuenow={stats.percent} aria-valuemin={0} aria-valuemax={100}><span className="is-done" style={{ width: `${stats.total ? (stats.done / stats.total) * 100 : 0}%` }} /><span className="is-review" style={{ width: `${stats.total ? (stats.review / stats.total) * 100 : 0}%` }} /><span className="is-doing" style={{ width: `${stats.total ? (stats.doing / stats.total) * 100 : 0}%` }} /></div></div>
      <div className="tk-stats">
        <div><b>{stats.total}</b><span>Total tugas</span></div><div><b>{stats.doing}</b><span>Dikerjakan</span></div><div><b>{stats.review}</b><span>Review</span></div>
        <div className={stats.overdue ? 'is-bad' : ''}><b>{stats.overdue}</b><span>Terlambat</span></div><div className={stats.soon ? 'is-warn' : ''}><b>{stats.soon}</b><span>Jatuh tempo 7 hari</span></div>
      </div>
    </header>

    <div className="tk-toolbar">
      <div className="tk-tabs" role="tablist" aria-label="Tampilan">{([['board', 'Papan'], ['list', 'Daftar'], ['activity', 'Riwayat'], ['summary', 'Ringkasan']] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={view === key} className={view === key ? 'is-active' : ''} onClick={() => setView(key)}>{label}</button>)}</div>
      {(view === 'board' || view === 'list') && <div className="tk-filters">
        <label className="tk-search"><span className="sr-only">Cari tugas</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari tugas atau label…" /></label>
        <select aria-label="Filter penanggung jawab" value={String(assigneeFilter)} onChange={(event) => { const value = event.target.value; setAssigneeFilter(value === 'all' || value === 'me' || value === 'none' ? value : Number(value)) }}><option value="all">Semua orang</option><option value="me">Tugas saya</option><option value="none">Belum ditugaskan</option>{team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
        <select aria-label="Filter prioritas" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'all' | Priority)}><option value="all">Semua prioritas</option>{priorities.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
        {(query || assigneeFilter !== 'all' || priorityFilter !== 'all') && <button type="button" className="tk-reset" onClick={() => { setQuery(''); setAssigneeFilter('all'); setPriorityFilter('all') }}>Reset</button>}
      </div>}
    </div>

    {view === 'board' && <div className="tk-board">{statuses.map((column) => {
      const list = columnTasks(column.key)
      return <section key={column.key} className={`tk-col tk-col--${column.tone}${overStatus === column.key ? ' is-over' : ''}`} onDragOver={(event: DragEvent) => { event.preventDefault(); if (overStatus !== column.key) setOverStatus(column.key) }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOverStatus(null) }} onDrop={(event) => { event.preventDefault(); drop(column.key) }} aria-label={column.label}>
        <header><span className="tk-col-dot" /><h2>{column.label}</h2><b>{list.length}</b><button type="button" aria-label={`Tambah tugas di ${column.label}`} onClick={() => { setAdding(column.key); setQuick('') }}>+</button></header>
        <div className="tk-col-body">
          {adding === column.key && <div className="tk-quick"><input autoFocus value={quick} maxLength={160} onChange={(event) => setQuick(event.target.value)} onKeyDown={(event) => onQuickKey(event, column.key)} onBlur={() => void quickAdd(column.key)} placeholder="Judul tugas, lalu Enter" aria-label="Judul tugas baru" /></div>}
          {list.map((task) => <Card key={task.id} task={task} team={team} dragging={dragID === task.id} onOpen={() => setOpenID(task.id)} onDragStart={() => setDragID(task.id)} onDragEnd={() => { setDragID(null); setOverStatus(null) }} onDropBefore={() => drop(column.key, task.id)} onMove={(direction) => move(task, direction)} />)}
          {!list.length && adding !== column.key && <p className="tk-col-empty">{tasks.some((task) => task.status === column.key) ? 'Tidak ada yang cocok' : column.hint}</p>}
        </div>
      </section>
    })}</div>}

    {view === 'list' && <div className="tk-list-wrap">{filtered.length ? <table className="tk-list"><thead><tr><th>Tugas</th><th>Status</th><th>Prioritas</th><th>Penanggung jawab</th><th>Tenggat</th><th>Diperbarui</th></tr></thead><tbody>
      {[...filtered].sort((a, b) => statuses.findIndex((s) => s.key === a.status) - statuses.findIndex((s) => s.key === b.status) || a.position - b.position).map((task) => { const due = dueInfo(task); return <tr key={task.id} tabIndex={0} onClick={() => setOpenID(task.id)} onKeyDown={(event) => { if (event.key === 'Enter') setOpenID(task.id) }}>
        <td><strong>{task.title}</strong>{task.labels.length > 0 && <span className="tk-labels">{task.labels.slice(0, 3).map((label) => <em key={label}>{label}</em>)}</span>}</td>
        <td><Pill tone={statusOf(task.status).tone}>{statusOf(task.status).label}</Pill></td><td><Pill tone={priorityOf(task.priority).tone}>{priorityOf(task.priority).label}</Pill></td>
        <td><Stack ids={task.assignees} team={team} /></td><td>{due ? <span className={`tk-due tk-due--${due.tone}`}>{due.text}</span> : <span className="tk-muted">—</span>}</td><td className="tk-muted">{ago(task.updatedAt)}</td></tr> })}
    </tbody></table> : <div className="tk-empty"><span aria-hidden="true">🗂️</span><strong>{tasks.length ? 'Tidak ada tugas yang cocok' : 'Belum ada tugas'}</strong><p>{tasks.length ? 'Ubah pencarian atau filter.' : 'Mulai dengan menambah tugas pertama tim.'}</p>{!tasks.length && <button type="button" className="tk-btn" onClick={() => setNewOpen(true)}>Tugas baru</button>}</div>}</div>}

    {view === 'activity' && <section className="tk-activity"><h2>Riwayat aktivitas</h2>{activity.length ? <>{activity.map((entry, index) => { const previous = activity[index - 1]; const meta = actionIcon[entry.action] || { icon: '•', tone: 'grey' }; return <div key={entry.id}>
      {(!previous || dayLabel(previous.createdAt) !== dayLabel(entry.createdAt)) && <h3>{dayLabel(entry.createdAt)}</h3>}
      <article className="tk-event"><span className={`tk-event-ico tk-pill--${meta.tone}`} aria-hidden="true">{meta.icon}</span><Av name={entry.actor?.name || '?'} photo={entry.actor?.photo} size={30} /><div><p><strong>{entry.actor?.id === meID ? 'Kamu' : entry.actor?.name || 'Seseorang'}</strong> {entry.summary}</p>{typeof entry.meta.excerpt === 'string' && <q>{entry.meta.excerpt}</q>}<time dateTime={entry.createdAt}>{ago(entry.createdAt)}</time></div>{entry.taskID && tasks.some((task) => task.id === entry.taskID) && <button type="button" onClick={() => setOpenID(entry.taskID)}>Buka</button>}</article></div> })}
      {hasMoreActivity && activity.length >= 30 && <button type="button" className="tk-more-btn" onClick={() => void loadMoreActivity()}>Muat riwayat sebelumnya</button>}</> : <div className="tk-empty"><span aria-hidden="true">🕘</span><strong>Belum ada aktivitas</strong><p>Perubahan pada tugas akan tercatat di sini.</p></div>}</section>}

    {view === 'summary' && <Summary tasks={tasks} team={team} stats={stats} onOpen={setOpenID} />}

    {openTask && <Drawer key={openTask.id} task={openTask} team={team} meID={meID} canDelete={me.canManage || openTask.createdBy === meID} onClose={() => setOpenID(null)} onPatch={(body) => patchTask(openTask.id, body)} onDelete={() => void deleteTask(openTask.id)} flash={flash} />}
    {newOpen && <NewTask team={team} meID={meID} onClose={() => setNewOpen(false)} onCreate={async (body) => { const task = await createTask(body); if (task) { setNewOpen(false); flash('Tugas dibuat.'); setOpenID(task.id) } }} />}
    {toast && <p className="tk-toast" role="status">{toast}</p>}
  </div>
}

function Card({ task, team, dragging, onOpen, onDragStart, onDragEnd, onDropBefore, onMove }: { task: Task; team: Member[]; dragging: boolean; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void; onDropBefore: () => void; onMove: (direction: -1 | 1) => void }) {
  const due = dueInfo(task)
  const done = task.checklist.filter((item) => item.done).length
  const index = statuses.findIndex((item) => item.key === task.status)
  return <article className={`tk-card tk-card--${priorityOf(task.priority).tone}${dragging ? ' is-dragging' : ''}`} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(task.id)); onDragStart() }} onDragEnd={onDragEnd} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); event.stopPropagation(); onDropBefore() }} tabIndex={0} role="button" aria-label={`${task.title}, ${statusOf(task.status).label}`} onClick={onOpen} onKeyDown={(event) => { if (event.key === 'Enter') onOpen() }}>
    {task.labels.length > 0 && <div className="tk-labels">{task.labels.slice(0, 3).map((label) => <em key={label}>{label}</em>)}{task.labels.length > 3 && <em>+{task.labels.length - 3}</em>}</div>}
    <h3>{task.title}</h3>
    <div className="tk-card-meta">
      {task.priority !== 'medium' && <Pill tone={priorityOf(task.priority).tone}>{priorityOf(task.priority).label}</Pill>}
      {due && <span className={`tk-due tk-due--${due.tone}`}>📅 {due.text}</span>}
      {task.checklist.length > 0 && <span className={`tk-chk${done === task.checklist.length ? ' is-done' : ''}`}>☑ {done}/{task.checklist.length}</span>}
      {task.commentCount > 0 && <span className="tk-chk">💬 {task.commentCount}</span>}
    </div>
    <footer><Stack ids={task.assignees} team={team} size={26} /><span className="tk-card-move" onClick={(event) => event.stopPropagation()}>{index > 0 && <button type="button" aria-label="Pindah ke kolom sebelumnya" onClick={() => onMove(-1)}>←</button>}{index < statuses.length - 1 && <button type="button" aria-label="Pindah ke kolom berikutnya" onClick={() => onMove(1)}>→</button>}</span></footer>
  </article>
}

function Summary({ tasks, team, stats, onOpen }: { tasks: Task[]; team: Member[]; stats: { total: number; done: number; doing: number; review: number; overdue: number; soon: number; percent: number }; onOpen: (id: number) => void }) {
  const todo = tasks.filter((task) => task.status === 'todo').length
  const workload = team.map((member) => ({ member, open: tasks.filter((task) => task.status !== 'done' && task.assignees.includes(member.id)).length, done: tasks.filter((task) => task.status === 'done' && task.assignees.includes(member.id)).length }))
  const maxLoad = Math.max(1, ...workload.map((item) => item.open + item.done))
  const upcoming = tasks.filter((task) => task.status !== 'done' && task.dueDate).sort((a, b) => Date.parse(a.dueDate!) - Date.parse(b.dueDate!)).slice(0, 6)
  const unassigned = tasks.filter((task) => task.status !== 'done' && !task.assignees.length)
  return <div className="tk-summary">
    <section className="tk-card-panel"><h2>Distribusi status</h2><div className="tk-stacked">{[['todo', todo], ['doing', stats.doing], ['review', stats.review], ['done', stats.done]].map(([key, count]) => Number(count) > 0 && <span key={String(key)} className={`tk-seg tk-seg--${statusOf(key as Status).tone}`} style={{ flex: Number(count) }} title={`${statusOf(key as Status).label}: ${count}`}>{count}</span>)}{!stats.total && <span className="tk-seg tk-seg--grey" style={{ flex: 1 }}>0</span>}</div>
      <ul className="tk-legend">{statuses.map((item) => <li key={item.key}><i className={`tk-pill--${item.tone}`} />{item.label}<b>{tasks.filter((task) => task.status === item.key).length}</b></li>)}</ul></section>
    <section className="tk-card-panel"><h2>Beban kerja tim</h2>{workload.length ? <ul className="tk-workload">{workload.map(({ member, open, done }) => <li key={member.id}><Av name={member.name} photo={member.photo} size={32} online={member.online} /><div><div><strong>{member.name}</strong><small>{open} aktif · {done} selesai</small></div><div className="tk-load"><span className="is-done" style={{ width: `${(done / maxLoad) * 100}%` }} /><span className="is-open" style={{ width: `${(open / maxLoad) * 100}%` }} /></div></div></li>)}</ul> : <p className="tk-muted">Belum ada anggota.</p>}</section>
    <section className="tk-card-panel"><h2>Tenggat terdekat</h2>{upcoming.length ? <ul className="tk-upcoming">{upcoming.map((task) => { const due = dueInfo(task)!; return <li key={task.id}><button type="button" onClick={() => onOpen(task.id)}><span className={`tk-due tk-due--${due.tone}`}>{due.text}</span><strong>{task.title}</strong><Stack ids={task.assignees} team={team} size={22} /></button></li> })}</ul> : <p className="tk-muted">Tidak ada tugas dengan tenggat.</p>}</section>
    <section className="tk-card-panel"><h2>Perlu penanggung jawab <b className="tk-count">{unassigned.length}</b></h2>{unassigned.length ? <ul className="tk-upcoming">{unassigned.slice(0, 6).map((task) => <li key={task.id}><button type="button" onClick={() => onOpen(task.id)}><Pill tone={statusOf(task.status).tone}>{statusOf(task.status).label}</Pill><strong>{task.title}</strong></button></li>)}</ul> : <p className="tk-muted">Semua tugas aktif sudah ada penanggung jawabnya. 👏</p>}</section>
  </div>
}

function MemberPicker({ team, selected, onChange }: { team: Member[]; selected: number[]; onChange: (ids: number[]) => void }) {
  return <ul className="tk-pick">{team.map((member) => { const on = selected.includes(member.id); return <li key={member.id}><button type="button" className={on ? 'is-on' : ''} aria-pressed={on} onClick={() => onChange(on ? selected.filter((id) => id !== member.id) : [...selected, member.id])}><Av name={member.name} photo={member.photo} size={32} online={member.online} /><span><strong>{member.name}</strong><small>{member.note || (member.role === 'mentor' ? 'Mentor' : 'Anggota')} · {lastSeenText(member)}</small></span><i aria-hidden="true">{on ? '✓' : '+'}</i></button></li> })}</ul>
}

function NewTask({ team, meID, onClose, onCreate }: { team: Member[]; meID: number; onClose: () => void; onCreate: (body: Record<string, unknown>) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<Status>('todo')
  const [priority, setPriority] = useState<Priority>('medium')
  const [assignees, setAssignees] = useState<number[]>(team.some((member) => member.id === meID) ? [meID] : [])
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey) }, [onClose])
  return <div className="tk-modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="tk-modal" role="dialog" aria-modal="true" aria-label="Tugas baru" onSubmit={async (event) => { event.preventDefault(); if (!title.trim()) return; setBusy(true); await onCreate({ title, status, priority, assignees, dueDate: dueDate || null, description }); setBusy(false) }}>
    <header><h2>Tugas baru</h2><button type="button" aria-label="Tutup" onClick={onClose}>×</button></header>
    <div className="tk-modal-body">
    <label className="tk-field"><span>Judul tugas</span><input autoFocus required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Desain halaman beranda" /></label>
    <div className="tk-field"><span>Status</span><div className="tk-seg-pills">{statuses.map((item) => <button type="button" key={item.key} aria-pressed={status === item.key} className={status === item.key ? 'is-on' : ''} onClick={() => setStatus(item.key)}>{item.label}</button>)}</div></div>
    <div className="tk-field"><span>Prioritas</span><div className="tk-seg-pills">{priorities.map((item) => <button type="button" key={item.key} aria-pressed={priority === item.key} className={`${priority === item.key ? 'is-on' : ''} tone-${item.tone}`} onClick={() => setPriority(item.key)}>{item.label}</button>)}</div></div>
    <label className="tk-field"><span>Tenggat <small>opsional</small></span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
    <div className="tk-field"><span>Penanggung jawab</span><MemberPicker team={team} selected={assignees} onChange={setAssignees} /></div>
    <label className="tk-field"><span>Deskripsi (opsional)</span><textarea rows={3} maxLength={4000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Jelaskan apa yang perlu dikerjakan…" /></label>
    </div>
    <footer><button type="button" className="tk-btn tk-btn--ghost" onClick={onClose}>Batal</button><button type="submit" className="tk-btn" disabled={busy || !title.trim()}>{busy ? 'Membuat…' : 'Buat tugas'}</button></footer>
  </form></div>
}

function Drawer({ task, team, meID, canDelete, onClose, onPatch, onDelete, flash }: { task: Task; team: Member[]; meID: number; canDelete: boolean; onClose: () => void; onPatch: (body: Record<string, unknown>) => Promise<boolean>; onDelete: () => void; flash: (message: string) => void }) {
  const [tab, setTab] = useState<'detail' | 'comments' | 'history'>('detail')
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [comments, setComments] = useState<Comment[]>([])
  const [history, setHistory] = useState<Activity[]>([])
  const [commentText, setCommentText] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [checkInput, setCheckInput] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const titleFocus = useRef(false), descFocus = useRef(false)
  const done = task.checklist.filter((item) => item.done).length

  useEffect(() => { if (!titleFocus.current) setTitle(task.title) }, [task.title])
  useEffect(() => { if (!descFocus.current) setDescription(task.description) }, [task.description])
  useEffect(() => { const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey) }, [onClose])
  const loadDetail = useCallback(async () => {
    const result = await api<{ comments: Comment[]; activity: Activity[] }>(`/api/tracker/tasks/${task.id}`)
    if (result.ok) { setComments(result.data.comments); setHistory(result.data.activity) }
  }, [task.id])
  useEffect(() => { void loadDetail(); const timer = setInterval(() => { if (!document.hidden) void loadDetail() }, 10000); return () => clearInterval(timer) }, [loadDetail, task.updatedAt])

  const addLabel = () => { const label = labelInput.trim().slice(0, 24); setLabelInput(''); if (label && !task.labels.some((item) => item.toLowerCase() === label.toLowerCase()) && task.labels.length < 8) void onPatch({ labels: [...task.labels, label] }) }
  const setChecklist = (next: ChecklistItem[]) => void onPatch({ checklist: next })
  async function sendComment() {
    const body = commentText.trim()
    if (!body) return
    setCommentText('')
    const result = await api<{ comment: Comment }>(`/api/tracker/tasks/${task.id}/comments`, { method: 'POST', body: JSON.stringify({ body }) })
    if (!result.ok) { flash(result.data.message || 'Komentar belum terkirim.'); setCommentText(body); return }
    setComments((current) => [...current, result.data.comment]); void loadDetail()
  }

  return <div className="tk-drawer-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="tk-drawer" role="dialog" aria-modal="true" aria-label={`Tugas: ${task.title}`}>
    <header><div className="tk-drawer-tabs" role="tablist">{([['detail', 'Detail'], ['comments', `Komentar${comments.length ? ` ${comments.length}` : ''}`], ['history', 'Riwayat']] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div><button type="button" className="tk-x" aria-label="Tutup" onClick={onClose}>×</button></header>
    <div className="tk-drawer-body">
      {tab === 'detail' && <>
        <input className="tk-d-title" value={title} maxLength={160} aria-label="Judul tugas" onFocus={() => { titleFocus.current = true }} onChange={(event) => setTitle(event.target.value)} onBlur={() => { titleFocus.current = false; if (title.trim() && title.trim() !== task.title) void onPatch({ title }); else setTitle(task.title) }} onKeyDown={(event) => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur() }} />
        <div className="tk-d-grid">
          <div className="tk-field"><span>Status</span><div className="tk-seg-pills">{statuses.map((item) => <button type="button" key={item.key} className={`${task.status === item.key ? 'is-on' : ''} tone-${item.tone}`} aria-pressed={task.status === item.key} onClick={() => void onPatch({ status: item.key })}>{item.label}</button>)}</div></div>
          <div className="tk-field"><span>Prioritas</span><div className="tk-seg-pills">{priorities.map((item) => <button type="button" key={item.key} className={`${task.priority === item.key ? 'is-on' : ''} tone-${item.tone}`} aria-pressed={task.priority === item.key} onClick={() => void onPatch({ priority: item.key })}>{item.label}</button>)}</div></div>
          <label className="tk-field"><span>Tenggat</span><div className="tk-date"><input type="date" value={toDateInput(task.dueDate)} onChange={(event) => void onPatch({ dueDate: event.target.value || null })} />{task.dueDate && <button type="button" onClick={() => void onPatch({ dueDate: null })}>Hapus</button>}</div></label>
        </div>
        <div className="tk-field"><span>Penanggung jawab <small>{task.assignees.length ? `${task.assignees.length} orang` : 'belum ada'}</small></span><MemberPicker team={team} selected={task.assignees} onChange={(ids) => void onPatch({ assignees: ids })} /></div>
        <div className="tk-field"><span>Label</span><div className="tk-chips">{task.labels.map((label) => <em key={label}>{label}<button type="button" aria-label={`Hapus label ${label}`} onClick={() => void onPatch({ labels: task.labels.filter((item) => item !== label) })}>×</button></em>)}<input value={labelInput} maxLength={24} placeholder={task.labels.length ? 'Tambah…' : 'Tambah label (Enter)'} onChange={(event) => setLabelInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addLabel() } }} onBlur={addLabel} /></div></div>
        <label className="tk-field"><span>Deskripsi</span><textarea rows={5} value={description} maxLength={4000} placeholder="Tambahkan detail, tautan, atau catatan…" onFocus={() => { descFocus.current = true }} onChange={(event) => setDescription(event.target.value)} onBlur={() => { descFocus.current = false; if (description !== task.description) void onPatch({ description }) }} /></label>
        <div className="tk-field"><span>Daftar periksa {task.checklist.length > 0 && <small>{done}/{task.checklist.length}</small>}</span>
          {task.checklist.length > 0 && <div className="tk-bar tk-bar--thin"><span className="is-done" style={{ width: `${(done / task.checklist.length) * 100}%` }} /></div>}
          <ul className="tk-check">{task.checklist.map((item) => <li key={item.id} className={item.done ? 'is-done' : ''}><label><input type="checkbox" checked={item.done} onChange={() => setChecklist(task.checklist.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry))} /><span>{item.text}</span></label><button type="button" aria-label="Hapus butir" onClick={() => setChecklist(task.checklist.filter((entry) => entry.id !== item.id))}>×</button></li>)}</ul>
          <form className="tk-check-add" onSubmit={(event) => { event.preventDefault(); const text = checkInput.trim(); if (!text) return; setCheckInput(''); setChecklist([...task.checklist, { id: Math.random().toString(36).slice(2, 10), text, done: false }]) }}><input value={checkInput} maxLength={140} onChange={(event) => setCheckInput(event.target.value)} placeholder="Tambah butir…" aria-label="Butir daftar periksa baru" /><button type="submit" disabled={!checkInput.trim()}>Tambah</button></form></div>
        <div className="tk-d-foot"><small>Dibuat {ago(task.createdAt)} · diperbarui {ago(task.updatedAt)}{task.completedAt ? ` · selesai ${ago(task.completedAt)}` : ''}</small>
          {canDelete && (confirmDelete ? <span className="tk-confirm">Hapus tugas ini? <button type="button" onClick={onDelete}>Ya, hapus</button><button type="button" onClick={() => setConfirmDelete(false)}>Batal</button></span> : <button type="button" className="tk-danger" onClick={() => setConfirmDelete(true)}>Hapus tugas</button>)}</div>
      </>}
      {tab === 'comments' && <div className="tk-comments">
        {comments.length ? <ul>{comments.map((comment) => <li key={comment.id}><Av name={comment.author?.name || '?'} photo={comment.author?.photo} size={34} /><div><p><strong>{comment.author?.id === meID ? 'Kamu' : comment.author?.name}</strong><time dateTime={comment.createdAt}>{ago(comment.createdAt)}</time></p><div className="tk-bubble">{comment.body}</div></div></li>)}</ul> : <div className="tk-empty is-compact"><span aria-hidden="true">💬</span><strong>Belum ada komentar</strong><p>Diskusikan tugas ini dengan tim.</p></div>}
        <form className="tk-comment-form" onSubmit={(event) => { event.preventDefault(); void sendComment() }}><textarea value={commentText} rows={2} maxLength={2000} placeholder="Tulis komentar… (Ctrl+Enter kirim)" aria-label="Tulis komentar" onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void sendComment() } }} /><button type="submit" className="tk-btn" disabled={!commentText.trim()}>Kirim</button></form>
      </div>}
      {tab === 'history' && <ol className="tk-history">{history.length ? history.map((entry) => { const meta = actionIcon[entry.action] || { icon: '•', tone: 'grey' }; return <li key={entry.id}><span className={`tk-event-ico tk-pill--${meta.tone}`} aria-hidden="true">{meta.icon}</span><div><p><strong>{entry.actor?.id === meID ? 'Kamu' : entry.actor?.name || 'Seseorang'}</strong> {entry.summary}</p><time dateTime={entry.createdAt}>{ago(entry.createdAt)}</time></div></li> }) : <li className="tk-muted">Belum ada riwayat.</li>}</ol>}
    </div>
  </aside></div>
}
