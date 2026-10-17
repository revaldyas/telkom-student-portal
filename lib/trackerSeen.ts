'use client'

/** Penanda "terakhir dilihat" per proyek (di browser) untuk menghitung aktivitas baru. */
const prefix = (meID: number | string) => `tsc-tracker-seen:${meID}:`

export function getSeenMap(meID: number | string): Record<string, string> {
  const map: Record<string, string> = {}
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key && key.startsWith(prefix(meID))) map[key.slice(prefix(meID).length)] = localStorage.getItem(key) || ''
    }
  } catch { /* tanpa penyimpanan, semua dianggap baru dalam 7 hari */ }
  return map
}
export function markSeen(meID: number | string, projectID: number | string) {
  try { localStorage.setItem(`${prefix(meID)}${projectID}`, new Date().toISOString()); window.dispatchEvent(new Event('tsc-tracker-seen')) } catch { /* abaikan */ }
}
