'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type NotificationItem = { id: string; title: string; message: string; href: string; createdAt?: string }
type Props = { accountID: string | number }

export default function WorkspaceNotifications({ accountID }: Props) {
  const pathname = usePathname()
  const root = useRef<HTMLDivElement>(null)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [seen, setSeen] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
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

  return <div className="workspace-notifications" ref={root}>
    <button className="workspace-notification-trigger" type="button" aria-label={unread ? `Notifikasi, ${unread} belum dibaca` : 'Notifikasi'} aria-expanded={open} aria-controls="workspace-notification-menu" onClick={() => setOpen((value) => !value)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      {unread > 0 && <span className="workspace-notification-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <section className="workspace-notification-menu" id="workspace-notification-menu" aria-label="Notifikasi portal">
      <header><div><strong>Notifikasi</strong><small>{unread ? `${unread} belum dibaca` : 'Semua sudah dibaca'}</small></div>{unread > 0 && <button type="button" onClick={markAllRead}>Tandai dibaca</button>}</header>
      {loading ? <p className="workspace-notification-empty">Memuat notifikasi…</p> : error ? <p className="workspace-notification-empty">{error}</p> : items.length === 0 ? <p className="workspace-notification-empty">Belum ada notifikasi baru.</p> : <ul>{items.map((item) => <li key={item.id}><Link href={item.href} onClick={() => markRead(item.id)} className={!seen.includes(item.id) ? 'is-unread' : ''}><span className="workspace-notification-dot" aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.message}</small>{item.createdAt && <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</time>}</span></Link></li>)}</ul>}
    </section>}
  </div>
}
