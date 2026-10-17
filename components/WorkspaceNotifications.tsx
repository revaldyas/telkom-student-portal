'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import DashIcon, { type DashIconName } from './DashIcon'

type Actor = { id: string | number; name: string; photo: string | null }
type NotificationItem = { id: string; type: string; title: string; message: string; href: string; createdAt?: string; actor?: Actor }
type Props = { accountID: string | number }

const kinds: Record<string, { icon: DashIconName; tone: string; label: string }> = {
  comment: { icon: 'chat', tone: 'blue', label: 'Komentar' },
  like: { icon: 'heart', tone: 'red', label: 'Suka' },
  revision: { icon: 'edit', tone: 'orange', label: 'Revisi' },
  mentor: { icon: 'school', tone: 'green', label: 'Pembimbing' },
  award: { icon: 'trophy', tone: 'gold', label: 'Penghargaan' },
  achievement: { icon: 'spark', tone: 'gold', label: 'Achievement' },
  deadline: { icon: 'clock', tone: 'orange', label: 'Batas peluang' },
  vote: { icon: 'trophy', tone: 'red', label: 'Voting' },
  review: { icon: 'check', tone: 'blue', label: 'Verifikasi' },
  invite: { icon: 'school', tone: 'purple', label: 'Undangan' },
  'project-review': { icon: 'users', tone: 'blue', label: 'Proyek' },
  interest: { icon: 'spark', tone: 'gold', label: 'Peluang' },
  task: { icon: 'folder', tone: 'purple', label: 'Tugas' },
}
const kindOf = (type: string) => kinds[type] || { icon: 'alert' as DashIconName, tone: 'grey', label: 'Info' }

function timeAgo(value?: string) {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  if (diff < 0) {
    const days = Math.ceil(-diff / 86400000)
    return days <= 1 ? 'besok' : `${days} hari lagi`
  }
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} mnt lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days} hari lalu` : new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
function dayGroup(value?: string) {
  if (!value) return 'Sebelumnya'
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const time = new Date(value).getTime()
  if (time > start.getTime() + 86400000) return 'Mendatang'
  if (time >= start.getTime()) return 'Hari ini'
  if (time >= start.getTime() - 86400000) return 'Kemarin'
  return 'Sebelumnya'
}

export default function WorkspaceNotifications({ accountID }: Props) {
  const pathname = usePathname()
  const root = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [seen, setSeen] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [error, setError] = useState('')
  const storageKey = `tsc-notifications:${accountID}`
  const unread = items.filter((item) => !seen.includes(item.id)).length

  useEffect(() => {
    try { setSeen(JSON.parse(localStorage.getItem(storageKey) || '[]') as string[]) } catch { setSeen([]) }
  }, [storageKey])

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch('/api/portal/notifications', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Notifikasi belum dapat dimuat.')
        if (active) { setItems(data.notifications || []); setError('') }
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Notifikasi belum dapat dimuat.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [pathname, open])

  useEffect(() => {
    function onPointerDown(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown) }
  }, [])

  function markRead(id: string) {
    setSeen((current) => {
      const next = current.includes(id) ? current : [...current, id]
      try { localStorage.setItem(storageKey, JSON.stringify(next.slice(-200))) } catch { /* Badge remains usable when storage is unavailable. */ }
      return next
    })
    setOpen(false)
  }

  function markAllRead() {
    const next = items.map((item) => item.id)
    setSeen(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next.slice(-200))) } catch { /* Keep the current view usable. */ }
  }

  const visible = useMemo(() => filter === 'unread' ? items.filter((item) => !seen.includes(item.id)) : items, [items, seen, filter])
  const groups = useMemo(() => {
    const order = ['Mendatang', 'Hari ini', 'Kemarin', 'Sebelumnya']
    const map = new Map<string, NotificationItem[]>()
    for (const item of visible) { const key = dayGroup(item.createdAt); map.set(key, [...(map.get(key) || []), item]) }
    return order.filter((key) => map.has(key)).map((key) => ({ key, items: map.get(key) || [] }))
  }, [visible])

  return <div className="workspace-notifications" ref={root}>
    <button className={`workspace-notification-trigger${unread ? ' has-unread' : ''}`} type="button" aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'} aria-expanded={open} aria-controls="workspace-notification-menu" onClick={() => setOpen((value) => !value)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {unread > 0 && <span className="workspace-notification-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <section className="workspace-notification-menu wn" id="workspace-notification-menu" aria-label="Notifikasi portal">
      <header className="wn-head"><div><strong>Notifikasi</strong><small>{unread ? `${unread} belum dibaca` : 'Semua sudah dibaca'}</small></div>{unread > 0 && <button type="button" onClick={markAllRead}><DashIcon name="check" size={14} />Tandai semua dibaca</button>}</header>
      <div className="wn-tabs" role="tablist" aria-label="Filter notifikasi"><button type="button" role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>Semua <b>{items.length}</b></button><button type="button" role="tab" aria-selected={filter === 'unread'} className={filter === 'unread' ? 'is-active' : ''} onClick={() => setFilter('unread')}>Belum dibaca <b>{unread}</b></button></div>
      <div className="wn-body">
        {loading && !items.length ? <ul className="wn-skeleton" aria-label="Memuat notifikasi">{[0, 1, 2].map((index) => <li key={index}><span className="sk" /><div><span className="sk" /><span className="sk" /></div></li>)}</ul>
          : error ? <div className="wn-empty"><span className="wn-empty-icon"><DashIcon name="alert" size={26} /></span><strong>Belum bisa dimuat</strong><p>{error}</p></div>
            : visible.length === 0 ? <div className="wn-empty"><span className="wn-empty-icon"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg></span><strong>{filter === 'unread' ? 'Tidak ada yang belum dibaca' : 'Belum ada notifikasi'}</strong><p>{filter === 'unread' ? 'Kamu sudah mengikuti semuanya. Keren!' : 'Aktivitas pada karya dan proyekmu akan muncul di sini.'}</p></div>
              : groups.map((group) => <section className="wn-group" key={group.key}><h3>{group.key}</h3><ul>{group.items.map((item) => {
                const kind = kindOf(item.type); const isUnread = !seen.includes(item.id)
                return <li key={item.id}><Link href={item.href} onClick={() => markRead(item.id)} className={`wn-item wn-tone-${kind.tone}${isUnread ? ' is-unread' : ''}`}>
                  <span className="wn-lead">{item.actor ? <span className="wn-avatar">{item.actor.photo ? <img src={item.actor.photo} alt="" loading="lazy" /> : item.actor.name.slice(0, 1).toUpperCase()}</span> : <span className="wn-tile"><DashIcon name={kind.icon} size={20} /></span>}{item.actor && <span className="wn-badge"><DashIcon name={kind.icon} size={11} /></span>}</span>
                  <span className="wn-text"><span className="wn-top"><em>{kind.label}</em><time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time></span><strong>{item.title}</strong><small>{item.message}</small></span>
                  {isUnread && <span className="wn-dot" aria-label="Belum dibaca" />}
                </Link></li>
              })}</ul></section>)}
      </div>
    </section>}
  </div>
}
