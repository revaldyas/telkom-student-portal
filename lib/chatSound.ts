'use client'

/** Bunyi notifikasi chat dibuat dengan Web Audio (tanpa berkas audio) dan bisa dimatikan pengguna. */
const KEY = 'tsc-chat-sound'
const EVENT = 'tsc-chat-sound-change'
let context: AudioContext | null = null
let lastPlayed = 0
let unlockBound = false

export const isSoundOn = () => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } }

export function setSoundOn(on: boolean) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* tetap berfungsi tanpa penyimpanan */ }
  window.dispatchEvent(new Event(EVENT))
}
export const onSoundChange = (handler: () => void) => { window.addEventListener(EVENT, handler); return () => window.removeEventListener(EVENT, handler) }

function getContext() {
  if (typeof window === 'undefined') return null
  if (!context) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    context = new Ctor()
  }
  return context
}

/** Browser memblokir audio sebelum ada interaksi; buka kuncinya pada klik atau ketukan pertama. */
export function unlockAudio() {
  if (unlockBound || typeof window === 'undefined') return
  unlockBound = true
  const resume = () => {
    void getContext()?.resume().catch(() => null)
    window.removeEventListener('pointerdown', resume); window.removeEventListener('keydown', resume)
  }
  window.addEventListener('pointerdown', resume, { once: false }); window.addEventListener('keydown', resume, { once: false })
}

/** variant "ping": dua nada naik (pesan di percakapan lain / tab tidak aktif). "pop": satu nada pendek (percakapan terbuka). */
export function playChatSound(variant: 'ping' | 'pop' = 'ping') {
  if (!isSoundOn()) return
  const now = Date.now()
  if (now - lastPlayed < 900) return
  const audio = getContext()
  if (!audio || audio.state === 'suspended') { void audio?.resume().catch(() => null); if (!audio || audio.state !== 'running') return }
  lastPlayed = now
  const notes = variant === 'ping' ? [{ f: 880, t: 0, d: 0.16 }, { f: 1318.5, t: 0.11, d: 0.28 }] : [{ f: 740, t: 0, d: 0.14 }]
  const volume = variant === 'ping' ? 0.14 : 0.08
  for (const note of notes) {
    const oscillator = audio.createOscillator(), gain = audio.createGain()
    oscillator.type = 'sine'; oscillator.frequency.value = note.f
    const start = audio.currentTime + note.t
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.d)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(start); oscillator.stop(start + note.d + 0.05)
  }
}
