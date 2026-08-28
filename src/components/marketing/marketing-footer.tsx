import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

/**
 * MarketingFooter - mirrors the static landing's footer
 * (/public/landing-design/landing.html, canonical footer block).
 *
 * Column structure and links are kept identical to the static footer on
 * purpose - every marketing surface (static HTML or React) should show the
 * same footer. If a link needs to change, change it in both landing.html
 * and here.
 *
 * Visual rules from /public/landing-design/styles.css `.footer-grid`:
 * - White background matching the rest of the marketing surfaces
 * - Top border: var(--rule), padding 48px var(--pad) 32px
 * - 5-col grid (2fr 1fr 1fr 1fr 1fr); 2-col on mobile
 * - h5 column headers: mono uppercase, 11px, ink-3
 * - Links: 14px, ink-2, padding 4px 0, hover → ink
 * - Brand column: sans-serif Reattend wordmark + tagline (max-width 32ch)
 * - Bottom strip: mono uppercase 11px, copyright + minor links
 */
export function MarketingFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid oklch(0.88 0.008 270)',
        padding: '48px clamp(20px, 4vw, 48px) 32px',
        background: 'oklch(1 0 0)',
      }}
      role="contentinfo"
    >
      {/* 5-col grid - 2fr brand + 4 link columns */}
      <div
        className="mx-auto grid gap-10"
        style={{
          maxWidth: '1280px',
          gridTemplateColumns: 'minmax(0, 2fr) repeat(4, minmax(0, 1fr))',
        }}
      >
        {/* Brand column */}
        <div className="col-span-2 sm:col-span-1" style={{ gridColumn: 'span 1 / span 1' }}>
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="Reattend home"
            style={{
              fontFamily: 'var(--font-inter), -apple-system, system-ui, sans-serif',
              fontSize: '22px',
              letterSpacing: '-0.02em',
              color: 'oklch(0.18 0.012 270)',
            }}
          >
            <Image src="/black_logo.svg" alt="Reattend" width={28} height={28} style={{ height: '24px', width: 'auto' }} />
            <span>Reattend</span>
          </Link>
          <p
            style={{
              fontSize: '13px',
              maxWidth: '32ch',
              marginTop: '14px',
              color: 'oklch(0.32 0.012 270)',
              lineHeight: 1.55,
            }}
          >
            Organizational memory for teams that can&apos;t afford to forget. Built by Reattend Technologies Private Limited.
          </p>
          {/* Sister content domain - see docs/organizational-amnesia-domains.md */}
          <p
            style={{
              fontSize: '12px',
              maxWidth: '32ch',
              marginTop: '10px',
              color: 'oklch(0.52 0.012 270)',
              lineHeight: 1.55,
            }}
          >
            Researching the problem? Read our essays at{' '}
            <a
              href="https://organizationalamnesia.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#146b47', textDecoration: 'underline' }}
            >
              organizationalamnesia.com
            </a>
            .
          </p>
        </div>

        {/* Link columns - identical to landing.html's canonical footer */}
        <FooterCol
          title="Product"
          links={[
            { label: 'Product', href: '/product' },
            { label: 'Pricing', href: '/pricing' },
            { label: 'Compliance', href: '/compliance' },
            { label: 'Sign in', href: '/login' },
            { label: 'Integrations', href: '/integrations' },
          ]}
        />
        <FooterCol
          title="Capabilities"
          links={[
            { label: 'Capture', href: '/product#capture' },
            { label: 'Connect', href: '/product#connect' },
            { label: 'Recall', href: '/product#recall' },
            { label: 'Run', href: '/product#run' },
            { label: 'Govern', href: '/product#govern' },
            { label: 'Deploy', href: '/product#deploy' },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { label: 'About', href: '/about' },
            { label: 'Careers', href: '/coming-soon' },
            { label: 'Press', href: '/coming-soon' },
            { label: 'Privacy', href: '/privacy' },
            { label: 'Terms', href: '/terms' },
          ]}
        />
        <FooterCol
          title="Resources"
          links={[
            { label: 'Blog', href: '/blog' },
            { label: 'Glossary', href: '/glossary' },
            { label: 'Help center', href: '/help' },
            { label: 'Free tools', href: '/tool' },
            { label: 'Free games', href: '/game' },
            { label: 'Trust', href: '/compliance' },
            { label: 'Status', href: 'https://stats.uptimerobot.com/KNL7AXsPis' },
          ]}
        />
      </div>

      {/* Bottom strip */}
      <div
        className="mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{
          maxWidth: '1280px',
          margin: '32px auto 0',
          borderTop: '1px solid oklch(0.93 0.006 270)',
          paddingTop: '20px',
          fontSize: '14px',
          color: 'oklch(0.52 0.012 270)',
        }}
      >
        <span>© {new Date().getFullYear()} Reattend Technologies Private Limited</span>
        <span className="flex items-center gap-6">
          <Link href="/privacy" style={{ color: 'inherit' }}>Privacy</Link>
          <Link href="/terms" style={{ color: 'inherit' }}>Terms</Link>
          <Link href="/compliance" style={{ color: 'inherit' }}>Compliance</Link>
          <Link href="/support" style={{ color: 'inherit' }}>Support</Link>
        </span>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: Array<{ label: string; href: string }>
}) {
  return (
    <div>
      <h5
        style={{
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '11px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'oklch(0.52 0.012 270)',
          fontWeight: 500,
          margin: '0 0 14px',
        }}
      >
        {title}
      </h5>
      <ul className="m-0 p-0 list-none">
        {links.map((link, i) => (
          <li key={`${link.label}-${i}`}>
            {link.href.startsWith('/') || link.href.startsWith('mailto:') ? (
              <Link
                href={link.href}
                style={{
                  display: 'block',
                  padding: '4px 0',
                  color: 'oklch(0.32 0.012 270)',
                  fontSize: '14px',
                  transition: 'color 0.15s',
                }}
                className="hover:text-[oklch(0.18_0.012_270)]"
              >
                {link.label}
              </Link>
            ) : (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  padding: '4px 0',
                  color: 'oklch(0.32 0.012 270)',
                  fontSize: '14px',
                  transition: 'color 0.15s',
                }}
                className="hover:text-[oklch(0.18_0.012_270)]"
              >
                {link.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
