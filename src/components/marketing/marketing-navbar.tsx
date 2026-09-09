'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import './resource-shell.css'

/**
 * MarketingNavbar - the marketing design's topbar, as React.
 *
 * Markup and class names mirror public/landing-design (topbar / brand /
 * nav / btn, plus the mobile drawer that mobile-menu.js injects on the
 * static pages) so the extracted, .rshell-scoped stylesheet in
 * resource-shell.css styles both the static HTML and these React pages
 * identically. Behaviour ported from the static scripts:
 *   - site-refresh.js: `has-scrolled` on the topbar past 12px
 *   - mobile-menu.js: right-edge drawer + backdrop, Escape closes
 *   - auth-cta.js: signed-in visitors see one "Go to dashboard" button
 */
const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Product', href: '/product' },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Compliance', href: '/compliance' },
]
const DEMO_URL = 'https://calendly.com/pb-reattend/30min'

export function MarketingNavbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 12)
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    return () => window.removeEventListener('scroll', sync)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.user) setSignedIn(true) })
      .catch(() => { /* silent, same as auth-cta.js */ })
    return () => { cancelled = true }
  }, [])

  const isActive = (href: string) => (href === '/' ? pathname === '/' : (pathname?.startsWith(href) ?? false))

  const ctas = signedIn ? (
    <Link className="btn btn-primary btn-fill" href="/app" style={{ textDecoration: 'none' }}>Go to dashboard</Link>
  ) : (
    <>
      <Link className="btn btn-ghost" href="/login">Sign in</Link>
      <Link className="btn btn-outline" href="/sandbox">Sandbox</Link>
      <a className="btn btn-primary btn-fill" href={DEMO_URL} target="_blank" rel="noreferrer">Book a demo</a>
    </>
  )

  return (
    <>
      <a className="rshell skip" href="#main">Skip to content</a>
      <header className={`rshell topbar${scrolled ? ' has-scrolled' : ''}`}>
        <div className="topbar-inner">
          <Link className="brand" href="/" aria-label="Reattend home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/landing-design/black_logo.svg" alt="" width={30} height={30} />
            <span className="brand-word">Reattend</span>
          </Link>
          <nav className="nav" aria-label="Main navigation">
            {NAV.map((item) => (
              <Link
                key={item.href}
                className={`nav-item${isActive(item.href) ? ' active' : ''}`}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: 8 }}>{ctas}</div>
          <button
            type="button"
            className="mobile-menu-trigger"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer - same DOM mobile-menu.js builds on the static pages */}
      <div className={`rshell mobile-menu-backdrop${open ? ' open' : ''}`} aria-hidden="true" onClick={() => setOpen(false)} />
      <aside className={`rshell mobile-menu-drawer${open ? ' open' : ''}`} aria-hidden={!open} role="dialog" aria-label="Site navigation">
        <div className="mm-head">
          <Link className="mm-brand" href="/" onClick={() => setOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/landing-design/black_logo.svg" alt="" width={30} height={30} />
            <span className="brand-word">Reattend</span>
          </Link>
          <button type="button" className="mm-close" aria-label="Close menu" onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="mm-section-label">Browse</div>
        <nav className="mm-nav">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>
          ))}
          <Link href="/tool" onClick={() => setOpen(false)}>Free tools</Link>
          <Link href="/game" onClick={() => setOpen(false)}>Free games</Link>
        </nav>
        <div className="mm-section-label">Get started</div>
        <div className="mm-cta">
          {signedIn ? (
            <Link className="mm-primary" href="/app" onClick={() => setOpen(false)}>Go to dashboard</Link>
          ) : (
            <>
              <Link className="mm-ghost" href="/login" onClick={() => setOpen(false)}>Sign in</Link>
              <Link className="mm-ghost" href="/sandbox" onClick={() => setOpen(false)}>Sandbox</Link>
              <a className="mm-primary" href={DEMO_URL} target="_blank" rel="noreferrer">Book a demo</a>
            </>
          )}
        </div>
      </aside>
    </>
  )
}
