'use client'

import { Hamburger, Link, Logout, useNav } from '@payloadcms/ui'
import { EntityType } from '@payloadcms/ui/shared'
import { formatAdminURL } from 'payload/shared'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'

type NavEntity = { label: string; slug: string; type: typeof EntityType.collection | typeof EntityType.global }
type NavGroup = { label: string; entities: NavEntity[] }

function GroupIcon({ name }: { name: string }) {
  const normalized = name.toLocaleLowerCase('id')
  let path = 'M4 5.5h16v13H4z M8 9h8 M8 13h5'
  if (normalized.includes('pengguna')) path = 'M16 19v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V19 M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M16 11a3 3 0 1 0 0-6 M17 14h1a3 3 0 0 1 3 3v2'
  else if (normalized.includes('akademik')) path = 'M3 8 12 3l9 5-9 5-9-5z M6 10v5l6 3 6-3v-5 M21 8v6'
  else if (normalized.includes('penghargaan')) path = 'M8 4h8v5a4 4 0 0 1-8 0V4z M8 6H5v2a4 4 0 0 0 4 4 M16 6h3v2a4 4 0 0 1-4 4 M12 13v4 M8 21h8 M9 17h6'
  else if (normalized.includes('media')) path = 'M4 5h16v14H4z M7 15l3-3 2 2 3-4 3 5 M8 9h.01'
  else if (normalized.includes('administrasi')) path = 'M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z M9 12l2 2 4-4'
  return <svg aria-hidden="true" className="custom-nav__group-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
}

export function PayloadNavClient({
  groups,
  adminRoute,
  logo,
}: {
  groups: NavGroup[]
  adminRoute: string
  logo: ReactNode
}) {
  const { hydrated, navOpen, navRef, shouldAnimate, setNavOpen } = useNav()
  const pathname = usePathname()
  const [closedGroups, setClosedGroups] = useState<string[]>([])

  const toggleGroup = (label: string) => {
    setClosedGroups((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label])
  }

  return (
    <>
      <aside className={['nav', navOpen && 'nav--nav-open', shouldAnimate && 'nav--nav-animate', hydrated && 'nav--nav-hydrated'].filter(Boolean).join(' ')} inert={!navOpen}>
        <div className="nav__scroll" ref={navRef}>
          <div className="custom-nav__brand">
            {logo}
          </div>
          <nav className="nav__wrap custom-nav__wrap" aria-label="Navigasi admin">
            <div className="custom-nav__caption">MENU UTAMA</div>
            {groups.map(({ label, entities }) => {
              const isOpen = !closedGroups.includes(label)
              return (
                <section className="custom-nav__group" key={label}>
                  <button className="custom-nav__group-button" type="button" aria-expanded={isOpen} onClick={() => toggleGroup(label)}>
                    <GroupIcon name={label} />
                    <span>{label}</span>
                    <svg className={`custom-nav__chevron${isOpen ? ' is-open' : ''}`} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  {isOpen && <div className="custom-nav__items">
                    {entities.map(({ label: itemLabel, slug, type }) => {
                      const href = formatAdminURL({ adminRoute, path: type === EntityType.collection ? `/collections/${slug}` : `/globals/${slug}` })
                      const active = pathname.startsWith(href) && [undefined, '/'].includes(pathname[href.length])
                      return pathname === href
                        ? <div className={`nav__link custom-nav__item${active ? ' is-active' : ''}`} id={`nav-${slug}`} key={`${type}-${slug}`} aria-current="page"><span className="nav__link-label">{itemLabel}</span></div>
                        : <Link className={`nav__link custom-nav__item${active ? ' is-active' : ''}`} href={href} id={`nav-${slug}`} key={`${type}-${slug}`} prefetch={false}><span className="nav__link-label">{itemLabel}</span>{active && <span className="custom-nav__active-dot" />}</Link>
                    })}
                  </div>}
                </section>
              )
            })}
            <div className="nav__controls custom-nav__bottom"><Logout /></div>
          </nav>
        </div>
      </aside>
      <div className="nav__header">
        <div className="nav__header-content">
          <button className="nav__mobile-close" onClick={() => setNavOpen(false)} tabIndex={!navOpen ? -1 : undefined} type="button" aria-label="Tutup navigasi"><Hamburger isActive /></button>
        </div>
      </div>
    </>
  )
}
