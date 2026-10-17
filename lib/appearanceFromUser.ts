import { normalizeAppearance, type Appearance } from './appearance'

type UserLike = { appearance?: { coverMode?: string | null; gradient?: string | null; pattern?: string | null; accent?: string | null; avatarShape?: string | null; tagline?: string | null; coverImage?: unknown } | null }

/** Menyusun pengaturan tampilan publik dari dokumen pengguna (tanpa data sensitif). */
export function appearanceFromUser(user: UserLike): Appearance {
  const raw = user.appearance || {}
  const cover = raw.coverImage && typeof raw.coverImage === 'object' ? (raw.coverImage as { url?: string | null }).url || null : null
  return normalizeAppearance({ ...raw, coverImage: cover })
}
