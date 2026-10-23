'use client'

import { useEffect, useState } from 'react'

type Shot = { src: string; alt: string }

/** Sampul dan galeri proyek dengan pratinjau layar penuh (lightbox). */
export function ProjectMedia({ cover, gallery }: { cover: Shot | null; gallery: Shot[] }) {
  const [open, setOpen] = useState<Shot | null>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(null) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])
  return <>
    {cover && <figure className="wd-cover"><button type="button" onClick={() => setOpen(cover)} aria-label="Perbesar gambar sampul"><img src={cover.src} alt={cover.alt} /><span className="wd-zoom" aria-hidden="true">⤢</span></button></figure>}
    {gallery.length > 0 && <section className="wd-section" aria-labelledby="pd-gallery"><h2 id="pd-gallery">Galeri <small>{gallery.length}</small></h2><div className="wd-gallery">{gallery.map((shot, index) => <button type="button" key={`${shot.src}-${index}`} onClick={() => setOpen(shot)} aria-label="Perbesar gambar galeri"><img src={shot.src} alt={shot.alt} loading="lazy" /></button>)}</div></section>}
    {open && <div className="wd-lightbox" role="dialog" aria-modal="true" aria-label="Pratinjau gambar" onClick={() => setOpen(null)}><button type="button" aria-label="Tutup" onClick={() => setOpen(null)}>×</button><img src={open.src} alt={open.alt} onClick={(event) => event.stopPropagation()} /></div>}
  </>
}

export function CopyLinkButton({ className = 'wd-ghost' }: { className?: string }) {
  const [text, setText] = useState('Salin tautan')
  return <button type="button" className={className} onClick={async () => {
    try { await navigator.clipboard.writeText(window.location.href.split('#')[0]); setText('Tautan disalin') } catch { setText('Salin dari bilah alamat') }
    setTimeout(() => setText('Salin tautan'), 2500)
  }}>{text}</button>
}
