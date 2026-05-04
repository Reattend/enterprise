'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

/**
 * MarketingNavbar — pixel-mirror of the static landing's topbar
 * (/public/landing-design/landing.html lines 36-56). Used by every page
 * wrapped in <MarketingShell>.
 *
 * Visual rules lifted from /public/landing-design/styles.css `.topbar`:
 * - Sticky, backdrop-blur(14px) + saturate(1.2)
 * - Background: oklch(0.985 0.005 80 / 0.78) — warm cream at 78% opacity
 * - Border bottom: var(--rule-2) — subtle warm border
 * - Brand: Instrument Serif "Reattend" + small "Enterprise" mono tag
 * - Nav items: 14px, ink-2 color, hover lifts to ink + bg-2
 * - 3 CTA pattern: ghost "Sign in" / outline "Try for free" / filled "Book a demo"
 *
 * The existing React Navbar (@/components/landing/navbar) stays untouched
 * so any non-marketing surface that imports it doesn't change.
 */
export function MarketingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Product', href: '/product' },
    { label: 'Integrations', href: '/integrations' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Compliance', href: '/compliance' },
  ]

  // Active state — match by exact path or top-level segment
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : (pathname?.startsWith(href) ?? false)

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        backdropFilter: 'blur(14px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.2)',
        background: 'oklch(0.985 0.005 80 / 0.78)',
        borderBottom: '1px solid oklch(0.93 0.006 270)',
      }}
    >
      <div
        className="mx-auto flex items-center justify-between gap-6"
        style={{
          maxWidth: '1280px',
          padding: '14px clamp(20px, 4vw, 48px)',
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0"
          aria-label="Reattend home"
          style={{
            fontFamily: 'var(--font-display), "Times New Roman", serif',
            fontSize: '22px',
            letterSpacing: '-0.02em',
            color: 'oklch(0.18 0.012 270)',
          }}
        >
          <Image src="/black_logo.svg" alt="Reattend" width={28} height={28} priority style={{ height: '24px', width: 'auto' }} />
          <span>Reattend</span>
          <span
            style={{
              fontFamily: 'var(--font-mono), monospace',
              fontSize: '9px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'oklch(0.52 0.012 270)',
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'oklch(0.92 0.04 285 / 0.5)',
              marginLeft: '4px',
              fontWeight: 500,
            }}
          >
            Enterprise
          </span>
        </Link>

        {/* Desktop nav — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '8px 14px',
                fontSize: '14px',
                color: isActive(item.href) ? 'oklch(0.18 0.012 270)' : 'oklch(0.32 0.012 270)',
                background: isActive(item.href) ? 'oklch(0.97 0.008 80)' : 'transparent',
                borderRadius: '8px',
                transition: 'background 0.18s, color 0.18s',
              }}
              className="hover:bg-[oklch(0.97_0.008_80)] hover:text-[oklch(0.18_0.012_270)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA cluster — desktop */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/login"
            className="hover:bg-[oklch(0.97_0.008_80)] transition-colors"
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '8px',
              color: 'oklch(0.32 0.012 270)',
            }}
          >
            Sign in
          </Link>
          <Link
            href="/sandbox"
            className="hover:border-[oklch(0.18_0.012_270)] transition-all"
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '8px',
              border: '1.5px solid oklch(0.18 0.012 270)',
              color: 'oklch(0.18 0.012 270)',
              background: 'oklch(0.992 0.004 80)',
            }}
          >
            Try for free
          </Link>
          <a
            href="https://calendly.com/pb-reattend/30min"
            target="_blank"
            rel="noreferrer"
            className="transition-all hover:-translate-y-px"
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '8px',
              background: 'oklch(0.18 0.012 270)',
              color: 'oklch(0.985 0.005 80)',
              boxShadow: '0 1px 0 oklch(0.18 0.012 270 / 0.08), 0 4px 14px oklch(0.18 0.012 270 / 0.18)',
            }}
          >
            Book a demo
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden p-2 rounded-lg"
          style={{ color: 'oklch(0.18 0.012 270)' }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div
          className="md:hidden border-t"
          style={{
            background: 'oklch(0.985 0.005 80)',
            borderColor: 'oklch(0.93 0.006 270)',
          }}
        >
          <nav className="flex flex-col px-5 py-4 gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: '10px 12px',
                  fontSize: '15px',
                  color: 'oklch(0.18 0.012 270)',
                  borderRadius: '8px',
                }}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t mt-2 pt-3 flex flex-col gap-2" style={{ borderColor: 'oklch(0.93 0.006 270)' }}>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                style={{
                  padding: '10px 12px',
                  fontSize: '15px',
                  color: 'oklch(0.32 0.012 270)',
                }}
              >
                Sign in
              </Link>
              <Link
                href="/sandbox"
                onClick={() => setMobileOpen(false)}
                className="text-center"
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  border: '1.5px solid oklch(0.18 0.012 270)',
                  color: 'oklch(0.18 0.012 270)',
                  background: 'oklch(0.992 0.004 80)',
                }}
              >
                Try for free
              </Link>
              <a
                href="https://calendly.com/pb-reattend/30min"
                target="_blank"
                rel="noreferrer"
                onClick={() => setMobileOpen(false)}
                className="text-center"
                style={{
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  background: 'oklch(0.18 0.012 270)',
                  color: 'oklch(0.985 0.005 80)',
                }}
              >
                Book a demo
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
