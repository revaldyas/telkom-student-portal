'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export type DropdownOption = { value: string; label: string; count?: number }

export function Dropdown({ label, value, options, allLabel, onChange }: { label: string; value: string; options: DropdownOption[]; allLabel?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) { if (event.key === 'Escape') setOpen(false); return }
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close) }
  }, [open])
  const selected = options.find((option) => option.value === value)
  const choose = (next: string) => { onChange(next); setOpen(false) }
  return <div className={`kl-dd${open ? ' is-open' : ''}${value && allLabel !== undefined ? ' is-set' : ''}`} ref={ref}>
    <button type="button" className="kl-dd-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}><span className="kl-dd-label">{label}</span><strong>{selected ? selected.label : allLabel}</strong><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
    {open && <ul className="kl-dd-menu" role="listbox" aria-label={label}>
      {allLabel !== undefined && <li><button type="button" role="option" aria-selected={!value} className={!value ? 'is-active' : ''} onClick={() => choose('')}>{allLabel}</button></li>}
      {options.map((option) => <li key={option.value}><button type="button" role="option" aria-selected={value === option.value} className={value === option.value ? 'is-active' : ''} onClick={() => choose(option.value)}><span>{option.label}</span>{option.count !== undefined && <small>{option.count}</small>}</button></li>)}
    </ul>}
  </div>
}


export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return <label className="kl-search"><span className="sr-only">{label}</span><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{value && <button type="button" aria-label="Hapus pencarian" onClick={() => onChange('')}>×</button>}</label>
}

export function ListingHead({ crumb, title, count, lead }: { crumb: string; title: string; count: string | null; lead?: string }) {
  return <header className="kl-head"><p className="kl-crumb"><Link href="/">Beranda</Link> / {crumb}</p><h1>{title} {count === null ? <span className="sk sk-count" role="status" aria-label="Menghitung" /> : <span className="kl-count">{count}</span>}</h1>{lead && <p className="kl-lead">{lead}</p>}</header>
}
