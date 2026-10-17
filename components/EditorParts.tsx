'use client'

import { useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'

export const IMAGE_TYPES = /^image\/(jpeg|png|webp)$/
export const sizeLabel = (bytes: number) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** Area seret-lepas / klik untuk memilih berkas. */
export function DropZone({ accept, multiple = false, onFiles, className = '', children, label }: { accept: string; multiple?: boolean; onFiles: (files: File[]) => void; className?: string; children: ReactNode; label: string }) {
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const drop = (event: DragEvent) => { event.preventDefault(); setOver(false); const files = Array.from(event.dataTransfer.files || []); if (files.length) onFiles(multiple ? files : files.slice(0, 1)) }
  return <div className={`pw-drop ${className}${over ? ' is-over' : ''}`} onDragOver={(event) => { event.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)} onDrop={drop}>
    <button type="button" className="pw-drop-btn" aria-label={label} onClick={() => input.current?.click()}>{children}</button>
    <input ref={input} className="sr-only" type="file" accept={accept} multiple={multiple} tabIndex={-1} onChange={(event) => { const files = Array.from(event.target.files || []); if (files.length) onFiles(files); event.target.value = '' }} />
  </div>
}

/** Input chip (tag) dengan saran cepat. */
export function TagField({ id, label, values, onChange, suggestions = [], max = 12, placeholder }: { id: string; label: string; values: string[]; onChange: (next: string[]) => void; suggestions?: string[]; max?: number; placeholder: string }) {
  const [draft, setDraft] = useState('')
  const add = (raw: string) => {
    const items = raw.split(/[,\n]/).map((item) => item.trim().slice(0, 40)).filter(Boolean)
    if (!items.length) return
    const next = [...values]
    for (const item of items) if (next.length < max && !next.some((existing) => existing.toLowerCase() === item.toLowerCase())) next.push(item)
    onChange(next); setDraft('')
  }
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); add(draft) }
    else if (event.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1))
  }
  const available = suggestions.filter((item) => !values.some((value) => value.toLowerCase() === item.toLowerCase())).slice(0, 8)
  return <div className="pe-field">
    <div className="pe-label"><label htmlFor={id}>{label}</label><span className="pe-count">{values.length}/{max}</span></div>
    <div className="pe-tags" onClick={() => document.getElementById(id)?.focus()}>
      {values.map((value) => <span className="pe-tag" key={value}>{value}<button type="button" aria-label={`Hapus ${value}`} onClick={() => onChange(values.filter((item) => item !== value))}>×</button></span>)}
      {values.length < max && <input id={id} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKey} onBlur={() => add(draft)} placeholder={values.length ? 'Tambah lagi…' : placeholder} maxLength={40} />}
    </div>
    {available.length > 0 && values.length < max && <div className="pe-suggest"><span>Saran:</span>{available.map((item) => <button type="button" key={item} onClick={() => add(item)}>+ {item}</button>)}</div>}
  </div>
}
