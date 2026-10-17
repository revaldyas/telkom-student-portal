'use client'

import type { ReactNode } from 'react'

export type Member = { id: number; name: string; photo: string | null; subtitle: string | null; role: 'owner' | 'member' | 'mentor'; note: string | null; online: boolean; lastSeen: string | null }
export type Status = 'todo' | 'doing' | 'review' | 'done'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type ChecklistItem = { id: string; text: string; done: boolean }
export type Task = {
  id: number; projectID: number; title: string; description: string; status: Status; priority: Priority; assignees: number[]
  dueDate: string | null; position: number; labels: string[]; checklist: ChecklistItem[]; createdBy: number | null
  completedAt: string | null; createdAt: string; updatedAt: string; commentCount: number
}
export type Activity = { id: number; taskID: number | null; action: string; summary: string; createdAt: string; actor: { id: number; name: string; photo: string | null } | null; meta: Record<string, unknown> }

export const statuses: { key: Status; label: string; tone: string; hint: string }[] = [
  { key: 'todo', label: 'Direncanakan', tone: 'grey', hint: 'Belum dimulai' },
  { key: 'doing', label: 'Dikerjakan', tone: 'blue', hint: 'Sedang berjalan' },
  { key: 'review', label: 'Review', tone: 'purple', hint: 'Menunggu pemeriksaan' },
  { key: 'done', label: 'Selesai', tone: 'green', hint: 'Sudah rampung' },
]
export const priorities: { key: Priority; label: string; tone: string }[] = [
  { key: 'low', label: 'Rendah', tone: 'grey' }, { key: 'medium', label: 'Sedang', tone: 'blue' }, { key: 'high', label: 'Tinggi', tone: 'orange' }, { key: 'urgent', label: 'Mendesak', tone: 'red' },
]
export const statusOf = (key: Status) => statuses.find((item) => item.key === key)!
export const priorityOf = (key: Priority) => priorities.find((item) => item.key === key)!

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { message?: string } }> {
  const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, data }
}

export function dueInfo(task: Pick<Task, 'dueDate' | 'status'>) {
  if (!task.dueDate) return null
  const due = new Date(task.dueDate)
  const days = Math.ceil((new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()) / 86400000)
  const label = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(due)
  if (task.status === 'done') return { label, tone: 'done', text: label }
  if (days < 0) return { label, tone: 'overdue', text: `${label} · telat ${-days} hr` }
  if (days === 0) return { label, tone: 'soon', text: 'Hari ini' }
  if (days <= 3) return { label, tone: 'soon', text: `${label} · ${days} hr lagi` }
  return { label, tone: 'ok', text: label }
}
export function ago(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} mnt lalu`
  if (minutes < 1440) return `${Math.round(minutes / 60)} jam lalu`
  if (minutes < 10080) return `${Math.round(minutes / 1440)} hari lalu`
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
export const lastSeenText = (member: Pick<Member, 'online' | 'lastSeen'>) => member.online ? 'Online' : member.lastSeen ? `Terlihat ${ago(member.lastSeen)}` : 'Offline'

export function Av({ name, photo, size = 32, online, ring = false }: { name: string; photo?: string | null; size?: number; online?: boolean; ring?: boolean }) {
  return <span className={`tk-av${ring ? ' has-ring' : ''}`} style={{ width: size, height: size, fontSize: size * 0.4 }} title={name}>
    {photo ? <img src={photo} alt="" loading="lazy" /> : name.slice(0, 1).toUpperCase()}
    {online !== undefined && <i className={`tk-dot${online ? ' is-online' : ''}`} style={{ width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28) }} aria-label={online ? 'Online' : 'Offline'} />}
  </span>
}

export function Stack({ ids, team, size = 24, max = 3 }: { ids: number[]; team: Member[]; size?: number; max?: number }) {
  const people = ids.map((id) => team.find((member) => member.id === id)).filter((member): member is Member => Boolean(member))
  if (!people.length) return <span className="tk-unassigned" title="Belum ditugaskan"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg></span>
  return <span className="tk-stack">{people.slice(0, max).map((member) => <Av key={member.id} name={member.name} photo={member.photo} size={size} online={member.online} ring />)}{people.length > max && <span className="tk-more" style={{ width: size, height: size }}>+{people.length - max}</span>}</span>
}

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`tk-pill tk-pill--${tone}`}>{children}</span>
}
