'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import DashIcon, { type DashIconName } from '../DashIcon'
import { siteFetch } from '../../lib/siteFetch'
import { isSoundOn, onSoundChange, playChatSound, setSoundOn, unlockAudio } from '../../lib/chatSound'
import './chat.css'

type Person = { id: number; name: string; photo: string | null; subtitle: string | null; role: string }
type Conversation = {
  id: number; kind: 'dm' | 'group' | 'class' | 'project'; refKey: string; title: string; photo: string | null; subtitle: string | null
  lastMessageAt: string | null; preview: string | null; lastSender: string | null; unread: number
  status: string; role: string; invitedBy: string | null; memberCount: number | null; other: Person | null
}
type Message = { id: number; body: string; deleted: boolean; createdAt: string; sender: Person | null }
type ProjectInfo = { title: string; summary: string; year: number | null; slug: string; category: string | null; cover: string | null; published: boolean }
type Detail = { id: number; kind: string; title: string | null; photo: string | null; href: string | null; project: ProjectInfo | null; myRole: string; canEdit: boolean; canRename: boolean; canInvite: boolean; blockedByMe: boolean; people: { person: Person; role: string; status: string; note?: string | null }[] }
type Me = { id: number; name: string; photo: string | null; role: 'student' | 'teacher' }

const tabs = [
  { key: 'all', label: 'Semua' }, { key: 'dm', label: 'Pribadi' }, { key: 'group', label: 'Grup' }, { key: 'class', label: 'Kelas' }, { key: 'project', label: 'Proyek' },
] as const
const kindMeta: Record<string, { icon: DashIconName; label: string; tone: string }> = {
  dm: { icon: 'user', label: 'Pribadi', tone: 'blue' }, group: { icon: 'users', label: 'Grup', tone: 'purple' },
  class: { icon: 'school', label: 'Kelas', tone: 'green' }, project: { icon: 'folder', label: 'Proyek', tone: 'orange' },
}
const emojis = ['😀', '😂', '😊', '😍', '🥰', '😎', '🤔', '😅', '🙏', '👍', '👏', '🙌', '🔥', '✨', '🎉', '💡', '❤️', '💯', '😢', '😮', '🤝', '📌', '✅', '🚀']
const reportReasons = ['Spam', 'Pelecehan atau perundungan', 'Konten tidak pantas', 'Informasi pribadi', 'Lainnya']

async function api<T = unknown>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { message?: string } }> {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, data }
}
const clock = (value: string) => new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
function listTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value), start = new Date(); start.setHours(0, 0, 0, 0)
  if (date.getTime() >= start.getTime()) return clock(value)
  if (date.getTime() >= start.getTime() - 86400000) return 'Kemarin'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
function dayLabel(value: string) {
  const date = new Date(value), start = new Date(); start.setHours(0, 0, 0, 0)
  if (date.getTime() >= start.getTime()) return 'Hari ini'
  if (date.getTime() >= start.getTime() - 86400000) return 'Kemarin'
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
}

function Avatar({ name, photo, size = 44, kind }: { name: string; photo?: string | null; size?: number; kind?: string }) {
  if (kind && kind !== 'dm' && !photo) {
    const meta = kindMeta[kind]
    return <span className={`ch-avatar ch-avatar--${meta?.tone || 'grey'}`} style={{ width: size, height: size }}><DashIcon name={meta?.icon || 'users'} size={Math.round(size * 0.45)} /></span>
  }
  return <span className="ch-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>{photo ? <img src={photo} alt="" loading="lazy" /> : name.slice(0, 1).toUpperCase()}</span>
}

function UserPicker({ selected, onToggle, exclude = [], single = false, onPick }: { selected?: Person[]; onToggle?: (person: Person) => void; exclude?: number[]; single?: boolean; onPick?: (person: Person) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Person[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let active = true
    setLoading(true)
    const timer = setTimeout(async () => {
      const result = await api<{ users: Person[] }>(`/api/chat/users?q=${encodeURIComponent(query)}`)
      if (active) { setResults(result.ok ? result.data.users : []); setLoading(false) }
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [query])
  const shown = results.filter((person) => !exclude.includes(person.id))
  return <div className="ch-picker">
    <label className="ch-search"><DashIcon name="user" size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama siswa atau guru…" /></label>
    <ul>{loading && !shown.length ? <li className="ch-picker-note">Mencari…</li> : shown.length ? shown.map((person) => {
      const on = selected?.some((item) => item.id === person.id)
      return <li key={person.id}><button type="button" className={on ? 'is-on' : ''} onClick={() => (single ? onPick?.(person) : onToggle?.(person))}><Avatar name={person.name} photo={person.photo} size={38} /><span><strong>{person.name}</strong><small>{person.subtitle || (person.role === 'teacher' ? 'Guru' : 'Siswa')}</small></span>{!single && <i aria-hidden="true">{on ? '✓' : '+'}</i>}</button></li>
    }) : <li className="ch-picker-note">Tidak ada pengguna ditemukan.</li>}</ul>
  </div>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') onClose() }; document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey) }, [onClose])
  return <div className="ch-modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="ch-modal" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button type="button" aria-label="Tutup" onClick={onClose}>×</button></header>{children}</div></div>
}

export default function ChatApp({ me }: { me: Me }) {
  const [inbox, setInbox] = useState<Conversation[]>([])
  const [inboxLoading, setInboxLoading] = useState(true)
  const [activeID, setActiveID] = useState<number | null>(null)
  const [tab, setTab] = useState<(typeof tabs)[number]['key']>('all')
  const [search, setSearch] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [infoOpen, setInfoOpen] = useState(false)
  const [mobileThread, setMobileThread] = useState(false)
  const [newOpen, setNewOpen] = useState<null | 'dm' | 'group'>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [reporting, setReporting] = useState<Message | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState<Person[]>([])
  const [inviteList, setInviteList] = useState<Person[]>([])
  const [atBottom, setAtBottom] = useState(true)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [soundOn, setSoundState] = useState(true)
  const knownUnread = useRef<Record<number, number> | null>(null)
  const atBottomRef = useRef(true)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const composer = useRef<HTMLTextAreaElement>(null)
  const [newBelow, setNewBelow] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const lastID = useRef(0)
  const activeRef = useRef<number | null>(null)
  const readSent = useRef(0)
  activeRef.current = activeID

  const flash = useCallback((message: string) => { setToast(message); setTimeout(() => setToast(''), 3200) }, [])
  useEffect(() => { unlockAudio(); setSoundState(isSoundOn()); return onSoundChange(() => setSoundState(isSoundOn())) }, [])
  const loadInbox = useCallback(async () => {
    const result = await api<{ conversations: Conversation[] }>('/api/chat/conversations')
    if (result.ok) {
      // Bunyi bila ada pesan baru di percakapan lain, atau di percakapan terbuka saat tab tidak terlihat.
      const previous = knownUnread.current
      const next: Record<number, number> = {}
      let incoming = false
      for (const item of result.data.conversations) {
        next[item.id] = item.unread
        const isOpenAndSeen = item.id === activeRef.current && !document.hidden && atBottomRef.current
        if (previous && item.status === 'active' && item.unread > (previous[item.id] ?? 0) && !isOpenAndSeen) incoming = true
      }
      knownUnread.current = next
      if (incoming) playChatSound('ping')
      setInbox(result.data.conversations)
    }
    setInboxLoading(false)
  }, [])

  useEffect(() => {
    void loadInbox()
    const timer = setInterval(() => { if (!document.hidden) void loadInbox() }, 10000)
    return () => clearInterval(timer)
  }, [loadInbox])

  const select = useCallback((id: number | null) => {
    setActiveID(id); setMobileThread(id !== null); setInfoOpen(false); setNewBelow(0)
    const params = new URLSearchParams(window.location.search)
    params.delete('dm'); params.delete('room')
    if (id === null) params.delete('c'); else params.set('c', String(id))
    const query = params.toString()
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname)
  }, [])

  // Tautan langsung: ?c=ID, ?dm=userID, atau ?room=class:ID / project:ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const dm = params.get('dm'), room = params.get('room'), conversation = params.get('c')
    void (async () => {
      if (dm) { const result = await api<{ id: number }>('/api/chat/conversations', { method: 'POST', body: JSON.stringify({ type: 'dm', userID: Number(dm) }) }); if (result.ok) { await loadInbox(); select(result.data.id) } else flash(result.data.message || 'Pesan belum dapat dibuka.') }
      else if (room) { const result = await api<{ id: number }>('/api/chat/conversations', { method: 'POST', body: JSON.stringify({ type: 'room', refKey: room }) }); if (result.ok) { await loadInbox(); select(result.data.id) } else flash(result.data.message || 'Ruang belum dapat dibuka.') }
      else if (conversation) setActiveID(Number(conversation))
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scrollToBottom = useCallback((smooth = false) => {
    const element = scroller.current
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const markRead = useCallback(async (id: number, last: number) => {
    if (last <= readSent.current) return
    readSent.current = last
    await api(`/api/chat/conversations/${id}/read`, { method: 'POST', body: JSON.stringify({ lastID: last }) })
    setInbox((current) => current.map((item) => item.id === id ? { ...item, unread: 0 } : item))
    window.dispatchEvent(new Event('tsc-pulse')) // perbarui lencana sidebar segera
  }, [])

  // Memuat percakapan terpilih
  useEffect(() => {
    if (activeID === null) { setMessages([]); setDetail(null); return }
    let cancelled = false
    setThreadLoading(true); setMessages([]); setDetail(null); lastID.current = 0; readSent.current = 0; setError('')
    void (async () => {
      const [list, info] = await Promise.all([
        api<{ messages: Message[]; hasMore: boolean }>(`/api/chat/conversations/${activeID}/messages`),
        api<Detail>(`/api/chat/conversations/${activeID}`),
      ])
      if (cancelled) return
      if (!list.ok || !info.ok) { setError(list.data.message || info.data.message || 'Percakapan tidak dapat dibuka.'); setThreadLoading(false); return }
      setMessages(list.data.messages); setHasMore(list.data.hasMore); setDetail(info.data)
      lastID.current = list.data.messages.at(-1)?.id || 0
      setThreadLoading(false)
      requestAnimationFrame(() => scrollToBottom())
      if (lastID.current) void markRead(activeID, lastID.current)
    })()
    return () => { cancelled = true }
  }, [activeID, markRead, scrollToBottom])

  // Polling pesan baru
  useEffect(() => {
    if (activeID === null) return
    const timer = setInterval(async () => {
      if (document.hidden || activeRef.current !== activeID) return
      const result = await api<{ messages: Message[] }>(`/api/chat/conversations/${activeID}/messages?after=${lastID.current}`)
      if (!result.ok || !result.data.messages.length || activeRef.current !== activeID) return
      const fresh = result.data.messages
      lastID.current = fresh.at(-1)!.id
      setMessages((current) => { const known = new Set(current.map((item) => item.id)); return [...current, ...fresh.filter((item) => !known.has(item.id))] })
      const element = scroller.current
      const near = !element || element.scrollHeight - element.scrollTop - element.clientHeight < 140
      if (fresh.some((item) => item.sender?.id !== me.id) && !document.hidden) playChatSound('pop')
      if (near) { requestAnimationFrame(() => scrollToBottom(true)); void markRead(activeID, lastID.current) } else setNewBelow((count) => count + fresh.filter((item) => item.sender?.id !== me.id).length)
    }, 3500)
    return () => clearInterval(timer)
  }, [activeID, markRead, me.id, scrollToBottom])

  async function loadOlder() {
    if (activeID === null || !messages.length) return
    const element = scroller.current, before = element?.scrollHeight || 0
    const result = await api<{ messages: Message[]; hasMore: boolean }>(`/api/chat/conversations/${activeID}/messages?before=${messages[0].id}`)
    if (!result.ok) return
    setMessages((current) => [...result.data.messages, ...current]); setHasMore(result.data.hasMore)
    requestAnimationFrame(() => { if (element) element.scrollTop = element.scrollHeight - before })
  }

  async function send() {
    const body = text.trim()
    if (!body || activeID === null || sending) return
    setSending(true); setError('')
    const result = await api<{ message: Message }>(`/api/chat/conversations/${activeID}/messages`, { method: 'POST', body: JSON.stringify({ text: body }) })
    setSending(false)
    if (!result.ok) { setError(result.data.message || 'Pesan belum terkirim.'); return }
    setText(''); setEmojiOpen(false); lastID.current = Math.max(lastID.current, result.data.message.id)
    setMessages((current) => current.some((item) => item.id === result.data.message.id) ? current : [...current, result.data.message])
    requestAnimationFrame(() => scrollToBottom(true))
    void loadInbox()
  }
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }

  async function startDM(person: Person) {
    const result = await api<{ id: number }>('/api/chat/conversations', { method: 'POST', body: JSON.stringify({ type: 'dm', userID: person.id }) })
    if (!result.ok) { flash(result.data.message || 'Pesan belum dapat dibuat.'); return }
    setNewOpen(null); await loadInbox(); select(result.data.id)
  }
  async function createGroup() {
    const result = await api<{ id: number }>('/api/chat/conversations', { method: 'POST', body: JSON.stringify({ type: 'group', title: groupName, memberIDs: groupMembers.map((person) => person.id) }) })
    if (!result.ok) { flash(result.data.message || 'Grup belum dapat dibuat.'); return }
    setNewOpen(null); setGroupName(''); setGroupMembers([]); await loadInbox(); select(result.data.id); flash('Grup dibuat. Undangan sudah dikirim ke anggota.')
  }
  async function respond(item: Conversation, action: 'accept' | 'decline') {
    const result = await api(`/api/chat/conversations/${item.id}/respond`, { method: 'POST', body: JSON.stringify({ action }) })
    if (!result.ok) { flash('Undangan belum dapat diproses.'); return }
    await loadInbox(); if (action === 'accept') select(item.id)
  }
  async function invite() {
    if (activeID === null || !inviteList.length) return
    const result = await api<{ invited: number }>(`/api/chat/conversations/${activeID}/members`, { method: 'POST', body: JSON.stringify({ userIDs: inviteList.map((person) => person.id) }) })
    setInviteOpen(false); setInviteList([])
    if (!result.ok) { flash(result.data.message || 'Undangan belum terkirim.'); return }
    flash(`${result.data.invited} undangan terkirim.`)
    const info = await api<Detail>(`/api/chat/conversations/${activeID}`); if (info.ok) setDetail(info.data)
  }
  async function leave(userID: number | 'me') {
    if (activeID === null) return
    const result = await api(`/api/chat/conversations/${activeID}/members/${userID}`, { method: 'DELETE' })
    if (!result.ok) { flash(result.data.message || 'Belum berhasil.'); return }
    if (userID === 'me') { select(null); await loadInbox(); flash('Kamu keluar dari grup.') }
    else { const info = await api<Detail>(`/api/chat/conversations/${activeID}`); if (info.ok) setDetail(info.data) }
  }
  async function toggleBlock(person: Person) {
    const blocked = detail?.blockedByMe
    const result = await api(blocked ? `/api/chat/blocks?userID=${person.id}` : '/api/chat/blocks', { method: blocked ? 'DELETE' : 'POST', body: blocked ? undefined : JSON.stringify({ userID: person.id }) })
    if (!result.ok) { flash('Belum berhasil.'); return }
    setDetail((current) => current ? { ...current, blockedByMe: !blocked } : current)
    flash(blocked ? `${person.name} dibuka blokirnya.` : `${person.name} diblokir. Kamu tidak akan menerima pesannya.`)
  }
  async function report(reason: string) {
    if (!reporting) return
    const result = await api('/api/chat/reports', { method: 'POST', body: JSON.stringify({ messageID: reporting.id, reason }) })
    setReporting(null)
    flash(result.ok ? 'Laporan terkirim. Terima kasih, tim sekolah akan meninjaunya.' : (result.data as { message?: string }).message || 'Laporan belum terkirim.')
  }

  async function reloadInfo() {
    if (activeID === null) return
    const info = await api<Detail>(`/api/chat/conversations/${activeID}`)
    if (info.ok) setDetail(info.data)
    await loadInbox()
  }
  async function patchConversation(body: Record<string, unknown>) {
    if (activeID === null) return false
    const result = await api(`/api/chat/conversations/${activeID}`, { method: 'PATCH', body: JSON.stringify(body) })
    if (!result.ok) { flash((result.data as { message?: string }).message || 'Perubahan belum tersimpan.'); return false }
    await reloadInfo()
    return true
  }
  async function changePhoto(file: File | undefined) {
    if (!file) return
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { flash('Foto harus berformat JPG, PNG, atau WebP.'); return }
    if (file.size > 8 * 1024 * 1024) { flash('Ukuran foto maksimal 8 MB.'); return }
    setPhotoBusy(true)
    try {
      const body = new FormData(); body.append('file', file); body.append('alt', `Foto ${detail?.title || 'percakapan'}`)
      const response = await siteFetch('/api/uploads', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.errors?.[0]?.message || data.message || 'Foto belum berhasil diunggah.')
      if (await patchConversation({ photoID: data.doc?.id })) flash('Foto diperbarui.')
    } catch (cause) { flash(cause instanceof Error ? cause.message : 'Foto belum berhasil diunggah.') }
    finally { setPhotoBusy(false); if (photoInput.current) photoInput.current.value = '' }
  }
  async function saveName() {
    const title = nameDraft.trim()
    if (title.length < 2) { flash('Nama grup minimal 2 karakter.'); return }
    if (title === (detail?.title || '')) { setEditingName(false); return }
    if (await patchConversation({ title })) { setEditingName(false); flash('Nama grup diperbarui.') }
  }

  const totalUnread = useMemo(() => inbox.filter((item) => item.status === 'active').reduce((sum, item) => sum + item.unread, 0), [inbox])
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s/, '')
    document.title = totalUnread > 0 ? `(${totalUnread}) ${base}` : base
    return () => { document.title = base }
  }, [totalUnread])

  const active = inbox.find((item) => item.id === activeID) || null
  const invites = inbox.filter((item) => item.status === 'invited')
  const list = useMemo(() => inbox.filter((item) => item.status === 'active' && (tab === 'all' || item.kind === tab) && (!search.trim() || `${item.title} ${item.preview || ''}`.toLowerCase().includes(search.trim().toLowerCase()))), [inbox, tab, search])
  const counts = useMemo(() => { const map: Record<string, number> = { all: 0 }; for (const item of inbox) if (item.status === 'active') { map.all += item.unread; map[item.kind] = (map[item.kind] || 0) + item.unread } return map }, [inbox])
  const peer = detail?.people.find((entry) => entry.person.id !== me.id)?.person || active?.other || null
  const title = active?.title || detail?.title || 'Percakapan'
  const isGroupLike = active ? active.kind !== 'dm' : detail ? detail.kind !== 'dm' : false

  const rendered = useMemo(() => {
    const rows: ({ type: 'day'; label: string; key: string } | { type: 'msg'; msg: Message; first: boolean; mine: boolean; key: number })[] = []
    let previous: Message | null = null
    for (const msg of messages) {
      const day = new Date(msg.createdAt).toDateString()
      if (!previous || new Date(previous.createdAt).toDateString() !== day) rows.push({ type: 'day', label: dayLabel(msg.createdAt), key: `d-${msg.id}` })
      const first = !previous || previous.sender?.id !== msg.sender?.id || new Date(previous.createdAt).toDateString() !== day || Date.parse(msg.createdAt) - Date.parse(previous.createdAt) > 5 * 60000
      rows.push({ type: 'msg', msg, first, mine: msg.sender?.id === me.id, key: msg.id })
      previous = msg
    }
    return rows
  }, [messages, me.id])

  return <div className="ch">
    <aside className={`ch-list${mobileThread ? ' is-hidden' : ''}`}>
      <header><h1>Pesan</h1><div className="ch-list-actions"><button type="button" className={`ch-sound${soundOn ? ' is-on' : ''}`} aria-pressed={soundOn} aria-label={soundOn ? 'Matikan suara notifikasi' : 'Nyalakan suara notifikasi'} title={soundOn ? 'Suara notifikasi aktif' : 'Suara notifikasi mati'} onClick={() => { const next = !soundOn; setSoundOn(next); if (next) playChatSound('ping') }}>{soundOn ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg> : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-9.300-5M6 8c0 7-3 7-3 9h14M10 21h4M3 3l18 18" /></svg>}</button><button type="button" className="ch-new" onClick={() => setNewOpen('dm')}><DashIcon name="plus" size={16} />Baru</button></div></header>
      <label className="ch-search"><DashIcon name="chat" size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari percakapan…" /></label>
      <div className="ch-tabs" role="tablist">{tabs.map((item) => <button type="button" role="tab" aria-selected={tab === item.key} key={item.key} className={tab === item.key ? 'is-active' : ''} onClick={() => setTab(item.key)}>{item.label}{counts[item.key] ? <b>{counts[item.key]}</b> : null}</button>)}</div>
      <div className="ch-scroll">
        {invites.length > 0 && <section className="ch-invites"><h3>Undangan grup</h3>{invites.map((item) => <div className="ch-invite" key={item.id}><Avatar name={item.title} kind="group" size={40} /><div><strong>{item.title}</strong><small>{item.invitedBy ? `Dari ${item.invitedBy}` : 'Undangan baru'}</small></div><div className="ch-invite-actions"><button type="button" onClick={() => void respond(item, 'accept')}>Terima</button><button type="button" className="is-ghost" onClick={() => void respond(item, 'decline')}>Tolak</button></div></div>)}</section>}
        {inboxLoading ? <ul className="ch-skel">{[0, 1, 2, 3].map((index) => <li key={index}><span className="sk" /><div><span className="sk" /><span className="sk" /></div></li>)}</ul>
          : list.length ? <ul className="ch-items">{list.map((item) => <li key={item.id}><button type="button" className={`ch-item${item.id === activeID ? ' is-active' : ''}${item.unread ? ' is-unread' : ''}`} onClick={() => select(item.id)}>
            <Avatar name={item.title} photo={item.photo} kind={item.kind} size={48} />
            <span className="ch-item-text"><span className="ch-item-top"><strong>{item.title}</strong><time>{listTime(item.lastMessageAt)}</time></span><span className="ch-item-bottom"><small>{item.preview ? `${item.kind !== 'dm' && item.lastSender ? `${item.lastSender.split(' ')[0]}: ` : ''}${item.preview}` : item.kind === 'dm' ? 'Mulai percakapan' : item.kind === 'class' ? 'Ruang kelas — belum ada pesan' : item.kind === 'project' ? 'Chat tim proyek — belum ada pesan' : 'Belum ada pesan'}</small>{item.unread > 0 && <b>{item.unread > 99 ? '99+' : item.unread}</b>}</span></span>
          </button></li>)}</ul>
            : <div className="ch-empty-list"><span aria-hidden="true">💬</span><strong>{search ? 'Tidak ditemukan' : 'Belum ada percakapan'}</strong><p>{search ? 'Coba kata kunci lain.' : 'Mulai pesan pribadi atau buat grup baru.'}</p>{!search && <button type="button" onClick={() => setNewOpen('dm')}>Pesan baru</button>}</div>}
      </div>
    </aside>

    <section className={`ch-thread${mobileThread ? '' : ' is-hidden'}`}>
      {activeID === null ? <div className="ch-welcome"><span aria-hidden="true">💬</span><h2>Pilih percakapan</h2><p>Kirim pesan ke teman, guru, atau ngobrol bareng kelas dan tim proyekmu.</p><button type="button" onClick={() => setNewOpen('dm')}><DashIcon name="plus" size={16} />Pesan baru</button></div> : <>
        <header className="ch-thread-head">
          <button type="button" className="ch-back" aria-label="Kembali ke daftar" onClick={() => select(null)}>←</button>
          <Avatar name={title} photo={active?.photo} kind={active?.kind} size={42} />
          <button type="button" className="ch-head-title" onClick={() => setInfoOpen((value) => !value)}><strong>{title}</strong><small>{active?.kind === 'dm' ? (peer?.subtitle || 'Pesan pribadi') : `${kindMeta[active?.kind || 'group']?.label || 'Grup'}${active?.memberCount ? ` · ${active.memberCount} anggota` : ''}`}</small></button>
          <button type="button" className={`ch-info-btn${infoOpen ? ' is-on' : ''}`} aria-label="Info percakapan" aria-pressed={infoOpen} onClick={() => setInfoOpen((value) => !value)}>ⓘ</button>
        </header>
        <div className="ch-body">
          <div className="ch-messages" ref={scroller} onScroll={(event) => { const element = event.currentTarget; const near = element.scrollHeight - element.scrollTop - element.clientHeight < 140; setAtBottom(near); atBottomRef.current = near; if (near) { setNewBelow(0); if (activeID !== null && lastID.current) void markRead(activeID, lastID.current) } }}>
            {threadLoading ? <div className="ch-loading">Memuat pesan…</div> : error && !messages.length ? <div className="ch-loading">{error}</div> : <>
              {hasMore && <button type="button" className="ch-older" onClick={() => void loadOlder()}>Muat pesan sebelumnya</button>}
              {!messages.length && <div className="ch-first"><Avatar name={title} photo={active?.photo} kind={active?.kind} size={72} /><strong>{title}</strong><p>{active?.kind === 'dm' ? 'Ini awal percakapanmu. Sapa dulu 👋' : 'Belum ada pesan. Jadilah yang pertama menyapa 👋'}</p></div>}
              {rendered.map((row) => row.type === 'day' ? <div className="ch-day" key={row.key}><span>{row.label}</span></div> : <div className={`ch-msg${row.mine ? ' is-mine' : ''}${row.first ? ' is-first' : ''}`} key={row.key}>
                {!row.mine && isGroupLike && <span className="ch-msg-avatar">{row.first && row.msg.sender ? <Avatar name={row.msg.sender.name} photo={row.msg.sender.photo} size={32} /> : null}</span>}
                <div className="ch-bubble-wrap">
                  {!row.mine && isGroupLike && row.first && <span className="ch-sender">{row.msg.sender?.name || 'Pengguna'}{row.msg.sender?.role === 'teacher' && <em>Guru</em>}</span>}
                  <div className={`ch-bubble${row.msg.deleted ? ' is-deleted' : ''}`}>{row.msg.deleted ? 'Pesan dihapus' : row.msg.body}<time>{clock(row.msg.createdAt)}</time>{!row.mine && !row.msg.deleted && <button type="button" className="ch-flag" aria-label="Laporkan pesan" title="Laporkan pesan" onClick={() => setReporting(row.msg)}>⚑</button>}</div>
                </div>
              </div>)}
            </>}
            {!atBottom && newBelow > 0 && <button type="button" className="ch-newbelow" onClick={() => { scrollToBottom(true); setNewBelow(0); if (activeID !== null && lastID.current) void markRead(activeID, lastID.current) }}>↓ {newBelow} pesan baru</button>}
          </div>

          {infoOpen && detail && <aside className="ch-info" aria-label="Info percakapan">
            <header><strong>Info {detail.kind === 'dm' ? 'kontak' : detail.kind === 'group' ? 'grup' : detail.kind === 'class' ? 'kelas' : 'proyek'}</strong><button type="button" aria-label="Tutup info" onClick={() => setInfoOpen(false)}>×</button></header>
            {detail.kind === 'project' && detail.project && <section className="ch-proj">
              <div className="ch-proj-cover">{detail.project.cover ? <img src={detail.project.cover} alt="" /> : <span aria-hidden="true">{detail.project.title.slice(0, 1).toUpperCase()}</span>}<em className={detail.project.published ? 'is-pub' : ''}>{detail.project.published ? 'Terbit' : 'Draf'}</em></div>
              <div className="ch-proj-body"><span className="ch-proj-label">Proyek</span><h3>{detail.project.title}</h3>
                <div className="ch-info-meta">{detail.project.category && <span className="ch-kind ch-kind--orange">{detail.project.category}</span>}{detail.project.year && <span className="ch-kind">{detail.project.year}</span>}</div>
                {detail.project.summary && <p>{detail.project.summary}</p>}
                <a className="ch-proj-btn" href={`/proyek/${detail.project.slug}`}>Buka halaman proyek <DashIcon name="arrow" size={14} /></a></div>
            </section>}
            <section className={`ch-info-hero${detail.kind === 'project' && detail.project ? ' is-compact' : ''}`}>
              <div className="ch-photo">
                <Avatar name={title} photo={detail.photo || active?.photo} kind={detail.kind} size={96} />
                {detail.canEdit && <><button type="button" className="ch-photo-btn" aria-label="Ubah foto" title="Ubah foto" disabled={photoBusy} onClick={() => photoInput.current?.click()}>{photoBusy ? '…' : '📷'}</button><input ref={photoInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" tabIndex={-1} onChange={(event) => void changePhoto(event.target.files?.[0])} /></>}
              </div>
              {detail.kind === 'project' && detail.project && <span className="ch-photo-label">Foto ruang chat</span>}
              {editingName
                ? <form className="ch-rename" onSubmit={(event) => { event.preventDefault(); void saveName() }}><input autoFocus value={nameDraft} maxLength={60} onChange={(event) => setNameDraft(event.target.value)} aria-label="Nama grup" /><div><button type="submit" className="ch-primary">Simpan</button><button type="button" className="ch-ghost" onClick={() => setEditingName(false)}>Batal</button></div></form>
                : <h3>{title}{detail.canRename && <button type="button" className="ch-edit" aria-label="Ubah nama grup" title="Ubah nama grup" onClick={() => { setNameDraft(detail.title || ''); setEditingName(true) }}>✎</button>}</h3>}
              <div className="ch-info-meta"><span className={`ch-kind ch-kind--${kindMeta[detail.kind]?.tone || 'grey'}`}><DashIcon name={kindMeta[detail.kind]?.icon || 'users'} size={13} />{kindMeta[detail.kind]?.label || 'Grup'}</span>{detail.kind === 'dm' ? (peer?.subtitle && <span className="ch-kind">{peer.subtitle}</span>) : <span className="ch-kind">{detail.people.length} anggota</span>}</div>
              {detail.canEdit && detail.photo && <button type="button" className="ch-link" onClick={() => void patchConversation({ photoID: null }).then((done) => done && flash('Foto dihapus.'))}>Hapus foto</button>}
              {detail.href && detail.kind !== 'project' && <a className="ch-info-link" href={detail.href}>{detail.kind === 'project' ? 'Buka halaman proyek' : 'Lihat profil'} <DashIcon name="arrow" size={13} /></a>}
            </section>
            {detail.kind === 'class' && <p className="ch-info-note">Ruang kelas otomatis untuk semua siswa dan guru di kelas ini.</p>}
            {detail.kind === 'project' && <p className="ch-info-note">💬 Ruang obrolan tim proyek. Semua anggota dan guru pembimbing ada di sini. {detail.canEdit && 'Anggota tim dapat mengganti foto ruang ini.'}</p>}
            {detail.kind === 'dm' && peer && <div className="ch-info-actions"><button type="button" className={detail.blockedByMe ? '' : 'is-danger'} onClick={() => void toggleBlock(peer)}>{detail.blockedByMe ? 'Buka blokir' : 'Blokir pengguna'}</button></div>}
            {detail.kind !== 'dm' && (() => {
              const team = detail.kind === 'project' ? detail.people.filter((entry) => entry.role !== 'teacher') : detail.people
              const mentors = detail.kind === 'project' ? detail.people.filter((entry) => entry.role === 'teacher') : []
              const row = ({ person, role, status, note }: Detail['people'][number]) => <li key={person.id}><Avatar name={person.name} photo={person.photo} size={36} /><span className="ch-member-text"><strong>{person.name}{person.id === me.id && ' (kamu)'}</strong><small>{note || person.subtitle || (person.role === 'teacher' ? 'Guru' : 'Siswa')}</small></span>{role === 'owner' && <em>Pemilik</em>}{role === 'teacher' && detail.kind === 'class' && <em>Guru</em>}{status === 'invited' && <em className="is-soft">Diundang</em>}{detail.canInvite && role !== 'owner' && person.id !== me.id && <button type="button" aria-label={`Keluarkan ${person.name}`} onClick={() => void leave(person.id)}>×</button>}</li>
              return <>
                <section className="ch-info-card"><div className="ch-info-section"><h4>{detail.kind === 'project' ? 'Tim proyek' : 'Anggota'} <b>{team.length}</b></h4>{detail.canInvite && <button type="button" className="ch-link" onClick={() => setInviteOpen(true)}>+ Undang</button>}</div><ul className="ch-members">{team.map(row)}</ul></section>
                {mentors.length > 0 && <section className="ch-info-card"><div className="ch-info-section"><h4>Guru pembimbing <b>{mentors.length}</b></h4></div><ul className="ch-members">{mentors.map(row)}</ul></section>}
              </>
            })()}
            {detail.kind === 'group' && <div className="ch-info-actions"><button type="button" className="is-danger" onClick={() => void leave('me')}>Keluar dari grup</button></div>}
          </aside>}
        </div>
        <footer className="ch-composer">
          {detail?.blockedByMe ? <p className="ch-blocked">Kamu memblokir pengguna ini. <button type="button" onClick={() => peer && void toggleBlock(peer)}>Buka blokir</button> untuk mengirim pesan.</p> : <>
            {error && messages.length > 0 && <p className="ch-error" role="alert">{error}</p>}
            <div className="ch-input">{emojiOpen && <div className="ch-emoji" role="listbox" aria-label="Pilih emoji">{emojis.map((emoji) => <button type="button" key={emoji} onClick={() => { setText((value) => `${value}${emoji}`); composer.current?.focus() }}>{emoji}</button>)}</div>}<button type="button" className="ch-emoji-btn" aria-label="Pilih emoji" aria-expanded={emojiOpen} onClick={() => setEmojiOpen((value) => !value)}>☺</button><textarea ref={composer} value={text} rows={1} maxLength={2000} onChange={(event) => { setText(event.target.value); event.target.style.height = 'auto'; event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px` }} onKeyDown={onKey} placeholder="Tulis pesan… (Enter kirim, Shift+Enter baris baru)" aria-label="Tulis pesan" disabled={threadLoading || Boolean(error && !messages.length)} />
              <button type="button" className="ch-send" onClick={() => void send()} disabled={!text.trim() || sending} aria-label="Kirim pesan"><DashIcon name="arrow" size={18} /></button></div>
            {text.length > 1800 && <small className="ch-count">{text.length}/2000</small>}</>}
        </footer>
      </>}
    </section>

    {newOpen && <Modal title={newOpen === 'dm' ? 'Pesan baru' : 'Buat grup'} onClose={() => { setNewOpen(null); setGroupMembers([]); setGroupName('') }}>
      <div className="ch-modal-tabs"><button type="button" className={newOpen === 'dm' ? 'is-active' : ''} onClick={() => setNewOpen('dm')}>Pesan pribadi</button><button type="button" className={newOpen === 'group' ? 'is-active' : ''} onClick={() => setNewOpen('group')}>Grup baru</button></div>
      {newOpen === 'dm' ? <UserPicker single onPick={(person) => void startDM(person)} /> : <>
        <label className="ch-field"><span>Nama grup</span><input value={groupName} maxLength={60} onChange={(event) => setGroupName(event.target.value)} placeholder="Contoh: Tim Lomba UI/UX" /></label>
        {groupMembers.length > 0 && <div className="ch-chips">{groupMembers.map((person) => <span key={person.id}>{person.name}<button type="button" aria-label={`Hapus ${person.name}`} onClick={() => setGroupMembers((list) => list.filter((item) => item.id !== person.id))}>×</button></span>)}</div>}
        <UserPicker selected={groupMembers} onToggle={(person) => setGroupMembers((list) => list.some((item) => item.id === person.id) ? list.filter((item) => item.id !== person.id) : [...list, person])} />
        <footer><button type="button" className="ch-primary" disabled={groupName.trim().length < 2} onClick={() => void createGroup()}>Buat grup{groupMembers.length ? ` · ${groupMembers.length} undangan` : ''}</button></footer></>}
    </Modal>}
    {inviteOpen && <Modal title="Undang ke grup" onClose={() => { setInviteOpen(false); setInviteList([]) }}>
      {inviteList.length > 0 && <div className="ch-chips">{inviteList.map((person) => <span key={person.id}>{person.name}<button type="button" aria-label={`Hapus ${person.name}`} onClick={() => setInviteList((list) => list.filter((item) => item.id !== person.id))}>×</button></span>)}</div>}
      <UserPicker selected={inviteList} exclude={detail?.people.map((entry) => entry.person.id) || []} onToggle={(person) => setInviteList((list) => list.some((item) => item.id === person.id) ? list.filter((item) => item.id !== person.id) : [...list, person])} />
      <footer><button type="button" className="ch-primary" disabled={!inviteList.length} onClick={() => void invite()}>Kirim undangan{inviteList.length ? ` (${inviteList.length})` : ''}</button></footer>
    </Modal>}
    {reporting && <Modal title="Laporkan pesan" onClose={() => setReporting(null)}>
      <p className="ch-report-quote">“{reporting.body.slice(0, 160)}”</p>
      <ul className="ch-reasons">{reportReasons.map((reason) => <li key={reason}><button type="button" onClick={() => void report(reason)}>{reason}</button></li>)}</ul>
      <small className="ch-muted">Laporan dikirim ke tim sekolah. Pengirim tidak akan tahu siapa yang melapor.</small>
    </Modal>}
    {toast && <p className="ch-toast" role="status">{toast}</p>}
  </div>
}
