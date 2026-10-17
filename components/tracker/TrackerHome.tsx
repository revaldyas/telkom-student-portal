'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import DashIcon from '../DashIcon'
import { getSeenMap } from '../../lib/trackerSeen'
import './tracker.css'
import { Pill, ago, api, dueInfo, priorityOf, statusOf, statuses, type Priority, type Status } from './trackerShared'

type Summary = { id: number; title: string; slug: string; published: boolean; category: string | null; cover: string | null; memberCount: number; stats: { total: number; done: number; doing: number; review: number; todo: number; overdue: number; mine: number; dueSoon: number } }
type MyTask = { id: number; title: string; status: Status; priority: Priority; dueDate: string | null; projectID: number; projectTitle: string }
type Feed = { id: number; taskID: number | null; action: string; summary: string; createdAt: string; actor: { id: number; name: string; photo: string | null } | null; projectID: number; projectTitle: string }
type Badge = { projects: Record<string, { activity: number; assigned: number }>; total: number; assigned: number }
type Group = { key: string; label: string; tone: string; tasks: MyTask[] }

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
function groupTasks(tasks: MyTask[]): Group[] {
  const today = startOfDay(new Date())
  const groups: Group[] = [{ key: 'overdue', label: 'Terlambat', tone: 'red', tasks: [] }, { key: 'today', label: 'Hari ini', tone: 'orange', tasks: [] }, { key: 'week', label: '7 hari ke depan', tone: 'blue', tasks: [] }, { key: 'later', label: 'Nanti', tone: 'grey', tasks: [] }, { key: 'none', label: 'Tanpa tenggat', tone: 'grey', tasks: [] }]
  for (const task of tasks) {
    if (!task.dueDate) { groups[4].tasks.push(task); continue }
    const due = startOfDay(new Date(task.dueDate))
    groups[due < today ? 0 : due === today ? 1 : due <= today + 7 * 86400000 ? 2 : 3].tasks.push(task)
  }
  return groups.filter((group) => group.tasks.length)
}
const greeting = () => { const hour = new Date().getHours(); return hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam' }

export default function TrackerHome({ role, meID, name }: { role: 'student' | 'teacher'; meID: number; name: string }) {
  const base = `/portal/${role === 'teacher' ? 'guru' : 'siswa'}`
  const [projects, setProjects] = useState<Summary[] | null>(null)
  const [myTasks, setMyTasks] = useState<MyTask[]>([])
  const [feed, setFeed] = useState<Feed[]>([])
  const [badge, setBadge] = useState<Badge | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'mine' | 'late'>('all')
  const [busyTask, setBusyTask] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const [collapsed, setCollapsed] = useState<string[]>([])

  const load = useCallback(async () => {
    const seen = getSeenMap(meID)
    const [result, badgeResult] = await Promise.all([
      api<{ projects: Summary[]; myTasks: MyTask[]; activity: Feed[] }>('/api/tracker/projects'),
      api<Badge>('/api/tracker/badge', { method: 'POST', body: JSON.stringify({ seen }) }),
    ])
    if (!result.ok) { setError(result.data.message || 'Tracker belum dapat dimuat.'); return }
    setError(''); setProjects(result.data.projects); setMyTasks(result.data.myTasks); setFeed(result.data.activity)
    if (badgeResult.ok) setBadge(badgeResult.data)
  }, [meID])
  useEffect(() => { void load(); const timer = setInterval(() => { if (!document.hidden) void load() }, 15000); return () => clearInterval(timer) }, [load])

  const totals = useMemo(() => (projects || []).reduce((sum, project) => ({ total: sum.total + project.stats.total, done: sum.done + project.stats.done, overdue: sum.overdue + project.stats.overdue, mine: sum.mine + project.stats.mine, doing: sum.doing + project.stats.doing, soon: sum.soon + project.stats.dueSoon }), { total: 0, done: 0, overdue: 0, mine: 0, doing: 0, soon: 0 }), [projects])
  const groups = useMemo(() => groupTasks(myTasks), [myTasks])
  const list = (projects || []).filter((project) => (!query.trim() || project.title.toLowerCase().includes(query.trim().toLowerCase())) && (filter === 'all' || (filter === 'mine' ? project.stats.mine > 0 : project.stats.overdue > 0)))
  const percent = totals.total ? Math.round((totals.done / totals.total) * 100) : 0
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const lateCount = groups.find((group) => group.key === 'overdue')?.tasks.length || 0
  const todayCount = groups.find((group) => group.key === 'today')?.tasks.length || 0

  async function advance(task: MyTask, status: Status) {
    setBusyTask(task.id)
    setMyTasks((current) => status === 'done' ? current.filter((item) => item.id !== task.id) : current.map((item) => item.id === task.id ? { ...item, status } : item))
    const result = await api(`/api/tracker/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
    setBusyTask(null)
    setToast(result.ok ? (status === 'done' ? 'Tugas selesai 🎉' : `Dipindah ke ${statusOf(status).label}`) : (result.data as { message?: string }).message || 'Belum berhasil.')
    setTimeout(() => setToast(''), 2600)
    void load()
  }

  if (error) return <div className="tk-fatal"><span aria-hidden="true">⚠️</span><strong>{error}</strong></div>

  return <div className="tk th">
    <header className="th-hero">
      <div className="th-hero-text">
        <span className="th-date">{today}</span>
        <h1>{greeting()}, {name.split(/\s+/)[0]}!</h1>
        <p>{projects === null ? 'Memuat ringkasan proyekmu…' : lateCount ? <><b>{lateCount} tugas terlambat</b>{todayCount ? `, ${todayCount} jatuh tempo hari ini` : ''}. Ayo kejar!</> : todayCount ? <><b>{todayCount} tugas</b> jatuh tempo hari ini.</> : totals.mine ? <>Kamu punya <b>{totals.mine} tugas aktif</b> di {projects.filter((project) => project.stats.mine).length} proyek.</> : 'Tidak ada tugas yang menunggumu. Waktu yang tepat untuk merencanakan sesuatu.'}</p>
        <div className="th-hero-actions">{role === 'student' && <Link className="tk-btn th-btn-light" href="/portal/siswa/proyek/baru"><DashIcon name="plus" size={16} />Proyek baru</Link>}<Link className="tk-btn th-btn-glass" href={`${base}/pesan`}>💬 Pesan tim</Link></div>
      </div>
      <div className="th-ring" role="img" aria-label={`Progres keseluruhan ${percent} persen`} style={{ ['--p' as string]: `${percent}%` }}><div><b>{projects ? `${percent}%` : '–'}</b><span>selesai</span></div></div>
    </header>

    <section className="th-kpis" aria-label="Ringkasan">
      {([
        ['Proyek aktif', projects ? projects.length : '–', 'folder', 'ink', 'Yang sedang kamu ikuti'],
        ['Tugas saya', projects ? totals.mine : '–', 'user', 'blue', 'Belum selesai'],
        ['Sedang dikerjakan', projects ? totals.doing : '–', 'clock', 'purple', 'Di seluruh proyek'],
        ['Terlambat', projects ? totals.overdue : '–', 'alert', totals.overdue ? 'red' : 'grey', 'Melewati tenggat'],
        ['Jatuh tempo 7 hari', projects ? totals.soon : '–', 'chart', totals.soon ? 'orange' : 'grey', 'Segera tuntaskan'],
      ] as const).map(([label, value, icon, tone, hint]) => <div className={`th-kpi th-kpi--${tone}`} key={label}><span className="th-kpi-icon"><DashIcon name={icon} size={20} /></span><div><b>{value}</b><span>{label}</span><small>{hint}</small></div></div>)}
    </section>

    <div className="th-grid">
      <div className="th-col">
        <section className="th-card th-focus">
          <header><div><h2>Fokus saya</h2><p>Tugas yang ditugaskan kepadamu, dikelompokkan menurut tenggat</p></div>{badge && badge.assigned > 0 && <span className="th-new">{badge.assigned} penugasan baru</span>}</header>
          {projects === null ? <div className="tk-loading"><span className="sk" /><span className="sk" /></div> : groups.length ? groups.map((group) => <div className="th-group" key={group.key}>
            <button type="button" className={`th-group-head th-group-head--${group.tone}`} aria-expanded={!collapsed.includes(group.key)} onClick={() => setCollapsed((current) => current.includes(group.key) ? current.filter((item) => item !== group.key) : [...current, group.key])}><span className="th-chev" aria-hidden="true">▾</span>{group.label}<b>{group.tasks.length}</b></button>
            {!collapsed.includes(group.key) && <ul>{group.tasks.map((task) => { const due = dueInfo({ dueDate: task.dueDate, status: task.status }); const next = statuses[statuses.findIndex((item) => item.key === task.status) + 1]; return <li key={task.id} className="th-task">
              <button type="button" className="th-check" disabled={busyTask === task.id} aria-label={`Tandai selesai: ${task.title}`} title="Tandai selesai" onClick={() => void advance(task, 'done')}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.500 4.500 4.500L19 7.500" /></svg></button>
              <Link className="th-task-main" href={`${base}/tracker/${task.projectID}?task=${task.id}`}><span className={`tk-pri tk-pri--${priorityOf(task.priority).tone}`} aria-hidden="true" /><div><strong>{task.title}</strong><small>{task.projectTitle}</small></div></Link>
              <Pill tone={statusOf(task.status).tone}>{statusOf(task.status).label}</Pill>
              {due && <span className={`tk-due tk-due--${due.tone}`}>{due.text}</span>}
              {next && next.key !== 'done' && <button type="button" className="th-next" disabled={busyTask === task.id} onClick={() => void advance(task, next.key)}>{task.status === 'todo' ? 'Mulai' : 'Ke review'} →</button>}
            </li> })}</ul>}
          </div>) : <div className="tk-empty is-compact"><span aria-hidden="true">🎉</span><strong>Tidak ada tugas aktif</strong><p>Tugas yang ditugaskan kepadamu akan muncul di sini.</p></div>}
        </section>

        <section className="th-card">
          <header><div><h2>Proyek</h2><p>{projects ? `${list.length} dari ${projects.length} proyek` : 'Memuat…'}</p></div>
            <div className="th-tools"><div className="th-seg" role="group" aria-label="Filter proyek">{([['all', 'Semua'], ['mine', 'Ada tugasku'], ['late', 'Terlambat']] as const).map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key} className={filter === key ? 'is-on' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div>
              <label className="tk-search"><span className="sr-only">Cari proyek</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari proyek…" /></label></div></header>
          {projects === null ? <div className="tk-loading"><span className="sk" /><span className="sk" /></div> : list.length ? <div className="th-projects">{list.map((project) => {
            const stats = project.stats, pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0, fresh = badge?.projects[String(project.id)]
            return <Link key={project.id} className="th-proj" href={`${base}/tracker/${project.id}`}>
              <span className="th-proj-cover">{project.cover ? <img src={project.cover} alt="" /> : <b>{project.title.slice(0, 1).toUpperCase()}</b>}</span>
              <div className="th-proj-body">
                <div className="th-proj-top"><h3>{project.title}</h3>{fresh && fresh.activity > 0 && <span className="th-new" title={`${fresh.activity} aktivitas baru`}>{fresh.activity} baru</span>}</div>
                <div className="tk-meta">{project.category && <Pill tone="orange">{project.category}</Pill>}<Pill tone={project.published ? 'green' : 'grey'}>{project.published ? 'Terbit' : 'Draf'}</Pill>{stats.overdue > 0 && <Pill tone="red">{stats.overdue} terlambat</Pill>}{stats.mine > 0 && <Pill tone="blue">{stats.mine} tugasku</Pill>}</div>
                <div className="th-mini" role="img" aria-label={`${stats.todo} direncanakan, ${stats.doing} dikerjakan, ${stats.review} review, ${stats.done} selesai`}>{stats.total ? <>{stats.done > 0 && <i className="is-done" style={{ flex: stats.done }} />}{stats.review > 0 && <i className="is-review" style={{ flex: stats.review }} />}{stats.doing > 0 && <i className="is-doing" style={{ flex: stats.doing }} />}{stats.todo > 0 && <i className="is-todo" style={{ flex: stats.todo }} />}</> : <i className="is-todo" style={{ flex: 1 }} />}</div>
                <div className="th-proj-foot"><span><b>{pct}%</b> · {stats.done}/{stats.total} tugas</span><span>👥 {project.memberCount + 1}</span></div>
              </div></Link> })}</div>
            : <div className="tk-empty"><span aria-hidden="true">🗂️</span><strong>{query || filter !== 'all' ? 'Proyek tidak ditemukan' : 'Belum ada proyek'}</strong><p>{query || filter !== 'all' ? 'Ubah pencarian atau filter.' : role === 'student' ? 'Buat proyek kolaborasi atau tunggu undangan tim, lalu kelola tugasnya di sini.' : 'Proyek yang kamu bimbing muncul di sini setelah kamu menerima undangan.'}</p>{!query && filter === 'all' && role === 'student' && <Link className="tk-btn" href="/portal/siswa/proyek/baru">Buat proyek</Link>}</div>}
        </section>
      </div>

      <aside className="th-col">
        <section className="th-card th-progress"><header><div><h2>Progres tugas</h2><p>Seluruh proyekmu</p></div></header>
          <div className="th-bigbar"><div className="tk-bar"><span className="is-done" style={{ width: `${percent}%` }} /></div><div className="th-bigbar-meta"><strong>{percent}%</strong><span>{totals.done} dari {totals.total} tugas selesai</span></div></div>
          <ul className="tk-legend">{statuses.map((item) => <li key={item.key}><i className={`tk-pill--${item.tone}`} />{item.label}<b>{(projects || []).reduce((sum, project) => sum + project.stats[item.key], 0)}</b></li>)}</ul></section>
        <section className="th-card"><header><div><h2>Aktivitas terbaru</h2><p>Dari semua proyekmu</p></div>{badge && badge.total > 0 && <span className="th-new">{badge.total} baru</span>}</header>
          {feed.length ? <ol className="th-feed">{feed.map((entry) => <li key={entry.id}><span className="th-feed-av">{entry.actor?.photo ? <img src={entry.actor.photo} alt="" loading="lazy" /> : (entry.actor?.name || '?').slice(0, 1).toUpperCase()}</span><div><p><strong>{entry.actor?.id === meID ? 'Kamu' : entry.actor?.name || 'Seseorang'}</strong> {entry.summary}</p><small><Link href={`${base}/tracker/${entry.projectID}${entry.taskID ? `?task=${entry.taskID}` : ''}`}>{entry.projectTitle}</Link> · {ago(entry.createdAt)}</small></div></li>)}</ol> : <div className="tk-empty is-compact"><span aria-hidden="true">🕘</span><p>Belum ada aktivitas. Perubahan pada tugas akan tercatat di sini.</p></div>}
        </section>
      </aside>
    </div>
    {toast && <p className="tk-toast" role="status">{toast}</p>}
  </div>
}
