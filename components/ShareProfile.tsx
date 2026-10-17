'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { coverStyle, gradientPresets, type Appearance } from '../lib/appearance'

type Props = { path: string; name: string; subtitle?: string; photo?: string | null; appearance: Appearance }

const W = 1080
const H = 1350
const COVER_H = 360

async function loadImage(src: string): Promise<ImageBitmap | null> {
  try {
    const response = await fetch(src, { mode: 'cors', credentials: 'omit' })
    if (!response.ok) return null
    return await createImageBitmap(await response.blob())
  } catch { return null }
}

function drawPattern(ctx: CanvasRenderingContext2D, pattern: string) {
  ctx.save()
  ctx.beginPath(); ctx.rect(0, 0, W, COVER_H); ctx.clip()
  ctx.fillStyle = 'rgba(255,255,255,.26)'; ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2
  if (pattern === 'dots') for (let x = 20; x < W; x += 44) for (let y = 20; y < COVER_H; y += 44) { ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill() }
  else if (pattern === 'grid') { for (let x = 0; x < W; x += 56) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, COVER_H); ctx.stroke() } for (let y = 0; y < COVER_H; y += 56) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() } }
  else if (pattern === 'diagonal') for (let x = -COVER_H; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + COVER_H, COVER_H); ctx.stroke() }
  else if (pattern === 'waves') for (let y = 10; y < COVER_H; y += 40) for (let x = 0; x < W; x += 72) { ctx.beginPath(); ctx.arc(x + 36, y, 28, 0, Math.PI); ctx.stroke() }
  else if (pattern === 'circles') { ctx.fillStyle = 'rgba(255,255,255,.16)'; for (const [x, y, r] of [[220, 150, 130], [860, 300, 190], [640, 60, 80]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill() } }
  ctx.restore()
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const words = text.split(/\s+/); let line = ''; let row = 0
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(row === maxLines - 1 ? `${line}…` : line, x, y + row * lineHeight); row += 1; line = word; if (row >= maxLines) return }
    else line = test
  }
  if (line && row < maxLines) ctx.fillText(line, x, y + row * lineHeight)
}

export default function ShareProfile({ path, name, subtitle, photo, appearance }: Props) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [qr, setQr] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const profileURL = `${window.location.origin}${path}`
    setUrl(profileURL)
    void QRCode.toDataURL(profileURL, { margin: 1, width: 640, errorCorrectionLevel: 'M', color: { dark: '#17181b', light: '#ffffff' } }).then(setQr).catch(() => setQr(''))
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, path])

  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(url); setNotice('Tautan profil disalin.') } catch { setNotice('Salin manual: ' + url) }
  }, [url])

  const share = useCallback(async () => {
    try { await navigator.share({ title: `Profil ${name} — TEL-CREATION`, url }) } catch { /* dibatalkan */ }
  }, [name, url])

  const download = useCallback(async () => {
    if (!qr) return
    setBusy(true); setNotice('')
    try {
      const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('canvas')
      const accent = appearance.accent
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H)
      // cover
      const cover = appearance.coverMode === 'image' && appearance.coverImage ? await loadImage(appearance.coverImage) : null
      if (cover) {
        const scale = Math.max(W / cover.width, COVER_H / cover.height)
        ctx.drawImage(cover, (W - cover.width * scale) / 2, (COVER_H - cover.height * scale) / 2, cover.width * scale, cover.height * scale)
      } else {
        const stops = (gradientPresets.find((item) => item.id === appearance.gradient) || gradientPresets[0]).stops
        const gradient = ctx.createLinearGradient(0, 0, W, COVER_H)
        gradient.addColorStop(0, stops[0]); gradient.addColorStop(0.55, stops[1]); gradient.addColorStop(1, stops[2])
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, COVER_H)
      }
      drawPattern(ctx, appearance.pattern)
      // avatar
      const size = 280; const ax = W / 2 - size / 2; const ay = COVER_H - size / 2
      const photoBitmap = photo ? await loadImage(photo) : null
      ctx.save()
      if (appearance.avatarShape === 'rounded') roundedRect(ctx, ax - 10, ay - 10, size + 20, size + 20, 70); else { ctx.beginPath(); ctx.arc(W / 2, ay + size / 2, size / 2 + 10, 0, Math.PI * 2) }
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore()
      ctx.save()
      if (appearance.avatarShape === 'rounded') roundedRect(ctx, ax, ay, size, size, 60); else { ctx.beginPath(); ctx.arc(W / 2, ay + size / 2, size / 2, 0, Math.PI * 2) }
      ctx.clip()
      if (photoBitmap) {
        const scale = Math.max(size / photoBitmap.width, size / photoBitmap.height)
        ctx.drawImage(photoBitmap, ax + (size - photoBitmap.width * scale) / 2, ay + (size - photoBitmap.height * scale) / 2, photoBitmap.width * scale, photoBitmap.height * scale)
      } else {
        ctx.fillStyle = accent; ctx.fillRect(ax, ay, size, size)
        ctx.fillStyle = '#fff'; ctx.font = '800 130px Manrope, DM Sans, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name.slice(0, 1).toUpperCase(), W / 2, ay + size / 2 + 6)
      }
      ctx.restore()
      // teks
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
      ctx.fillStyle = '#17181b'; ctx.font = '800 68px Manrope, DM Sans, sans-serif'
      wrapText(ctx, name, W / 2, COVER_H + 230, W - 160, 76, 2)
      ctx.fillStyle = '#6b6d73'; ctx.font = '600 32px DM Sans, sans-serif'
      if (subtitle) ctx.fillText(subtitle, W / 2, COVER_H + 320)
      if (appearance.tagline) { ctx.fillStyle = accent; ctx.font = '700 32px DM Sans, sans-serif'; wrapText(ctx, appearance.tagline, W / 2, COVER_H + 372, W - 200, 42, 2) }
      // QR
      const qrImage = new Image(); qrImage.src = qr; await qrImage.decode()
      const qrSize = 330; const qx = W / 2 - qrSize / 2; const qy = COVER_H + 440
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = accent; ctx.lineWidth = 8
      roundedRect(ctx, qx - 24, qy - 24, qrSize + 48, qrSize + 48, 36); ctx.fill(); ctx.stroke()
      ctx.drawImage(qrImage, qx, qy, qrSize, qrSize)
      ctx.fillStyle = '#17181b'; ctx.font = '700 30px DM Sans, sans-serif'; ctx.fillText('Pindai untuk melihat profil', W / 2, qy + qrSize + 80)
      // brand
      ctx.font = '800 36px Sora, Manrope, sans-serif'
      const left = 'TEL'; const right = '-CREATION'
      const total = ctx.measureText(left + right).width
      ctx.textAlign = 'left'; ctx.fillStyle = '#17181b'; ctx.fillText(left, W / 2 - total / 2, H - 52)
      ctx.fillStyle = accent; ctx.fillText(right, W / 2 - total / 2 + ctx.measureText(left).width, H - 52)
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('blob')
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob)
      link.download = `kartu-profil-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'profil'}.png`
      link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 2000)
      setNotice('Kartu profil diunduh.')
    } catch { setNotice('Kartu belum dapat dibuat. Coba lagi.') }
    finally { setBusy(false) }
  }, [appearance, name, photo, qr, subtitle])

  return <>
    <button type="button" className="pf-share-btn" onClick={() => { setNotice(''); setOpen(true) }}><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>Bagikan profil</button>
    {open && <div className="sc-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <div className="sc-dialog" role="dialog" aria-modal="true" aria-label="Bagikan profil" style={{ ['--sc-accent' as string]: appearance.accent }}>
        <button ref={closeRef} type="button" className="sc-close" aria-label="Tutup" onClick={() => setOpen(false)}>×</button>
        <div className="sc-card">
          <div className="sc-cover" style={coverStyle(appearance)} />
          <span className={`sc-avatar${appearance.avatarShape === 'rounded' ? ' is-rounded' : ''}`}>{photo ? <img src={photo} alt="" /> : <b>{name.slice(0, 1).toUpperCase()}</b>}</span>
          <h2>{name}</h2>
          {subtitle && <p className="sc-sub">{subtitle}</p>}
          {appearance.tagline && <p className="sc-tag">{appearance.tagline}</p>}
          <div className="sc-qr">{qr ? <img src={qr} alt={`Kode QR menuju profil ${name}`} /> : <span className="sk" />}</div>
          <p className="sc-scan">Pindai untuk melihat profil</p>
          <p className="sc-brand"><span>TEL</span><b>-CREATION</b></p>
        </div>
        <div className="sc-actions">
          <button type="button" className="sc-primary" disabled={busy || !qr} onClick={() => void download()}>{busy ? 'Membuat…' : 'Unduh kartu (PNG)'}</button>
          <button type="button" onClick={() => void copy()}>Salin tautan</button>
          {typeof navigator !== 'undefined' && 'share' in navigator && <button type="button" onClick={() => void share()}>Bagikan…</button>}
        </div>
        <p className="sc-url" title={url}>{url}</p>
        {notice && <p className="sc-notice" role="status">{notice}</p>}
      </div>
    </div>}
  </>
}
