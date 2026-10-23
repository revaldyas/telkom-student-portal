'use client'

import Link from 'next/link'
import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import '../app/(site)/auth.css'

const icons = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
  lock: <><rect x="4" y="10" width="16" height="10" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  id: <><rect x="3" y="5" width="18" height="14" rx="3" /><circle cx="9" cy="11" r="2" /><path d="M6 16c.6-1.600 1.700-2.400 3-2.400s2.400.8 3 2.400M14.500 10h4M14.500 13.500h3" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2.500h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  board: <><rect x="3" y="4" width="5" height="16" rx="1.500" /><rect x="10" y="4" width="5" height="10" rx="1.500" /><rect x="17" y="4" width="4" height="13" rx="1.500" /></>,
  chat: <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>,
  eye: <><path d="M2 12s3.500-7 10-7 10 7 10 7-3.500 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18M10.600 5.100A10.600 10.600 0 0 1 12 5c6.500 0 10 7 10 7a17 17 0 0 1-3.200 4M6.600 6.600C3.700 8.400 2 12 2 12s3.500 7 10 7a9.700 9.700 0 0 0 4.400-1" /><path d="M9.900 9.900a3 3 0 0 0 4.200 4.200" /></>,
  check: <path d="m5 12.500 4.500 4.500L19 7.500" />,
  alert: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.500h.01" /></>,
}
export type AuthIcon = keyof typeof icons
export const AuthSvg = ({ name, size = 18 }: { name: AuthIcon; size?: number }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>

type FieldProps = { label: string; icon: AuthIcon; hint?: ReactNode; error?: string; trailing?: ReactNode } & InputHTMLAttributes<HTMLInputElement>
export function Field({ label, icon, hint, error, trailing, id, ...input }: FieldProps) {
  return <div className={`au-field${error ? ' has-error' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <div className="au-input"><span className="au-input-icon"><AuthSvg name={icon} /></span><input id={id} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? `${id}-note` : undefined} {...input} />{trailing}</div>
    {(error || hint) && <p id={`${id}-note`} className={error ? 'au-error-text' : 'au-hint-text'}>{error || hint}</p>}
  </div>
}

export function PasswordField({ label, id, onCaps, ...rest }: Omit<FieldProps, 'icon' | 'type' | 'trailing'> & { onCaps?: (on: boolean) => void }) {
  const [shown, setShown] = useState(false)
  return <Field {...rest} id={id} label={label} icon="lock" type={shown ? 'text' : 'password'}
    onKeyUp={(event) => onCaps?.(event.getModifierState('CapsLock'))}
    trailing={<button type="button" className="au-eye" aria-label={shown ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} aria-pressed={shown} onClick={() => setShown((value) => !value)}><AuthSvg name={shown ? 'eyeOff' : 'eye'} /></button>} />
}

type Side = { kicker: string; title: ReactNode; text: string; points: { icon: AuthIcon; title: string; text: string }[] }
export default function AuthShell({ side, children }: { side: Side; children: ReactNode }) {
  return <main className="au">
    <aside className="au-side">
      <Link href="/" className="au-brand" aria-label="TEL-CREATION — Beranda"><img className="tel-creation-mark" src="/brand/telkom-schools.png" alt="" /><span className="tel-creation-wordmark"><span className="tel-creation-name">TEL</span><span className="tel-creation-accent">-CREATION</span></span></Link>
      <div className="au-side-copy"><span className="au-kicker"><i aria-hidden="true" />{side.kicker}</span><h1>{side.title}</h1><p>{side.text}</p></div>
      <ul className="au-points">{side.points.map((point) => <li key={point.title}><span><AuthSvg name={point.icon} size={20} /></span><div><strong>{point.title}</strong><small>{point.text}</small></div></li>)}</ul>
      <div className="au-side-foot">SMK TELKOM · CREATE WHAT’S NEXT</div>
    </aside>
    <section className="au-main"><div className="au-card">{children}</div></section>
  </main>
}
