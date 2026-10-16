'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import SkeletonImage from './SkeletonImage'

type Props = {
  name: string
  role: 'student' | 'teacher'
  profilePhoto: string | null
  profileHref: string
  /** Halaman pengeditan profil di portal; null bila belum tersedia untuk peran ini. */
  editHref?: string | null
  onLogout: () => void
}

/** Avatar akun di pojok kanan atas portal; membuka menu profil publik dan keluar. */
export default function WorkspaceAccountMenu({ name, role, profilePhoto, profileHref, editHref = null, onLogout }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const initial = (name.trim().slice(0, 1) || 'A').toUpperCase()

  useEffect(() => {
    function onPointerDown(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown) }
  }, [])

  return <div className="workspace-account-menu" ref={root}>
    <button className="workspace-account-trigger" type="button" aria-label={`Akun ${name}`} aria-haspopup="menu" aria-expanded={open} aria-controls="workspace-account-popover" onClick={() => setOpen((value) => !value)}>
      {profilePhoto ? <SkeletonImage className="workspace-avatar" src={profilePhoto} alt="" /> : <span className="workspace-avatar workspace-avatar-initial" aria-hidden="true">{initial}</span>}
    </button>
    {open && <section className="workspace-account-popover" id="workspace-account-popover" role="menu" aria-label="Menu akun">
      <div className="workspace-account-summary"><strong>{name}</strong><small>{role === 'teacher' ? 'Guru / Mentor' : 'Siswa'}</small></div>
      {editHref && <Link role="menuitem" href={editHref} onClick={() => setOpen(false)}>Edit profil</Link>}
      <Link role="menuitem" href={profileHref} onClick={() => setOpen(false)}>Lihat profil publik</Link>
      <button role="menuitem" type="button" className="workspace-account-logout" onClick={() => { setOpen(false); onLogout() }}>Keluar</button>
    </section>}
  </div>
}
