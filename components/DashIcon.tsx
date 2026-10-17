import type { ReactNode } from 'react'

export type DashIconName = 'image' | 'check' | 'clock' | 'edit' | 'alert' | 'heart' | 'chat' | 'users' | 'spark' | 'trophy' | 'user' | 'plus' | 'arrow' | 'folder' | 'school' | 'chart'

const paths: Record<DashIconName, ReactNode> = {
  image: <><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 9" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.8 2.8L16.5 9.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  edit: <path d="M4 20h4L19 9a2.800 2.800 0 0 0-4-4L4 16v4ZM13.500 6.500l4 4" />,
  alert: <><path d="M12 3 2.500 20h19L12 3Z" /><path d="M12 10v4M12 17.500h.01" /></>,
  heart: <path d="M12 20s-7.500-4.600-9.600-9.200C1 7.500 3 4 6.400 4c2 0 3.600 1.100 4.600 2.700h2C14 5.100 15.600 4 17.600 4 21 4 23 7.500 21.600 10.800 19.500 15.400 12 20 12 20Z" />,
  chat: <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />,
  users: <><circle cx="9" cy="8" r="3.200" /><path d="M3 20a6 6 0 0 1 12 0M16 4.600a3.200 3.200 0 0 1 0 6.100M21 20a5.500 5.500 0 0 0-3.500-5.100" /></>,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.500 2.500M15.500 15.500 18 18M18 6l-2.500 2.500M8.500 15.500 6 18" />,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M7 17 17 7M8 7h9v9" />,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2.500h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  school: <><path d="M3 9.500 12 5l9 4.500-9 4.500L3 9.500Z" /><path d="M7 12v4.500c0 1 2.200 2.500 5 2.500s5-1.500 5-2.500V12" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
}

export default function DashIcon({ name, size = 20 }: { name: DashIconName; size?: number }) {
  return <svg className="ds-icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
