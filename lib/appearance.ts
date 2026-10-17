/** Pengaturan tampilan profil publik (cover, pola, warna) yang dipakai profil, editor, dan kartu bagikan. */
export type CoverMode = 'gradient' | 'image'
export type AvatarShape = 'circle' | 'rounded'

export type Appearance = {
  coverMode: CoverMode
  gradient: string
  pattern: string
  accent: string
  avatarShape: AvatarShape
  tagline: string
  coverImage: string | null
}

export const gradientPresets: { id: string; label: string; stops: [string, string, string] }[] = [
  { id: 'telkom', label: 'Telkom', stops: ['#3a0d12', '#8e1020', '#e50914'] },
  { id: 'senja', label: 'Senja', stops: ['#2b1055', '#7597de', '#f7797d'] },
  { id: 'samudra', label: 'Samudra', stops: ['#06202b', '#077a7d', '#7ae7c7'] },
  { id: 'hutan', label: 'Hutan', stops: ['#0b2b1f', '#1f7a4d', '#b4e33d'] },
  { id: 'galaksi', label: 'Galaksi', stops: ['#0f0c29', '#302b63', '#7b2ff7'] },
  { id: 'emas', label: 'Emas', stops: ['#2a1a00', '#b8730b', '#f5c542'] },
  { id: 'malam', label: 'Malam', stops: ['#0d0e10', '#25272d', '#4a4d57'] },
  { id: 'permen', label: 'Permen', stops: ['#4a1b6d', '#d946a8', '#ffb86b'] },
]

export const patternPresets: { id: string; label: string }[] = [
  { id: 'none', label: 'Polos' },
  { id: 'dots', label: 'Titik' },
  { id: 'grid', label: 'Kisi' },
  { id: 'diagonal', label: 'Garis miring' },
  { id: 'waves', label: 'Gelombang' },
  { id: 'circles', label: 'Lingkaran' },
]

export const accentPresets = ['#e50914', '#2563eb', '#7c3aed', '#0f9d8a', '#e8710a', '#d946a8', '#17181b']

export const defaultAppearance: Appearance = {
  coverMode: 'gradient', gradient: 'telkom', pattern: 'dots', accent: '#e50914', avatarShape: 'circle', tagline: '', coverImage: null,
}

export const isHexColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)

/** Mengubah data mentah (API/CMS) menjadi Appearance yang aman dipakai. */
export function normalizeAppearance(raw: Partial<Record<keyof Appearance, unknown>> | null | undefined): Appearance {
  const gradient = gradientPresets.some((item) => item.id === raw?.gradient) ? String(raw?.gradient) : defaultAppearance.gradient
  const pattern = patternPresets.some((item) => item.id === raw?.pattern) ? String(raw?.pattern) : defaultAppearance.pattern
  return {
    coverMode: raw?.coverMode === 'image' && raw?.coverImage ? 'image' : 'gradient',
    gradient, pattern,
    accent: isHexColor(raw?.accent) ? raw.accent : defaultAppearance.accent,
    avatarShape: raw?.avatarShape === 'rounded' ? 'rounded' : 'circle',
    tagline: typeof raw?.tagline === 'string' ? raw.tagline.slice(0, 80) : '',
    coverImage: typeof raw?.coverImage === 'string' && raw.coverImage ? raw.coverImage : null,
  }
}

export const gradientCSS = (id: string) => {
  const stops = (gradientPresets.find((item) => item.id === id) || gradientPresets[0]).stops
  return `linear-gradient(135deg, ${stops[0]} 0%, ${stops[1]} 55%, ${stops[2]} 100%)`
}

/** Pola dekoratif sebagai CSS background (ditumpuk di atas gradien/gambar). */
export const patternCSS = (id: string): { image: string; size?: string } | null => {
  switch (id) {
    case 'dots': return { image: 'radial-gradient(rgba(255,255,255,.28) 1.6px, transparent 1.8px)', size: '22px 22px' }
    case 'grid': return { image: 'linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)', size: '28px 28px' }
    case 'diagonal': return { image: 'repeating-linear-gradient(135deg, rgba(255,255,255,.14) 0 2px, transparent 2px 16px)' }
    case 'waves': return { image: 'radial-gradient(circle at 50% 0, transparent 14px, rgba(255,255,255,.2) 15px, transparent 17px)', size: '36px 20px' }
    case 'circles': return { image: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,.18) 0 60px, transparent 61px), radial-gradient(circle at 80% 70%, rgba(255,255,255,.12) 0 90px, transparent 91px), radial-gradient(circle at 60% 15%, rgba(255,255,255,.1) 0 40px, transparent 41px)' }
    default: return null
  }
}

/** Gaya inline untuk elemen cover. */
export function coverStyle(appearance: Appearance): { backgroundImage: string; backgroundSize: string; backgroundPosition?: string } {
  const pattern = patternCSS(appearance.pattern)
  const base = appearance.coverMode === 'image' && appearance.coverImage ? `url("${appearance.coverImage}")` : gradientCSS(appearance.gradient)
  return {
    backgroundImage: [pattern?.image, base].filter(Boolean).join(', '),
    backgroundSize: [pattern ? (pattern.size || 'cover') : null, 'cover'].filter(Boolean).join(', '),
    backgroundPosition: 'center',
  }
}
