import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

/**
 * MarketingFooter — pixel-mirror of the static landing's footer
 * (/public/landing-design/landing.html lines 818-873).
 *
 * Visual rules from /public/landing-design/styles.css `.footer-grid`:
 * - Cream-warm background matching the rest of the marketing surfaces
 *   (no dark navbar — that was the old React Footer aesthetic)
 * - Top border: var(--rule), padding 48px var(--pad) 32px
 * - 5-col grid (2fr 1fr 1fr 1fr 1fr); 2-col on mobile
 * - h5 column headers: mono uppercase, 11px, ink-3
 * - Links: 14px, ink-2, padding 4px 0, hover → ink
 * - Brand column: serif Reattend + Enterprise tag + tagline (max-width 32ch)
 * - Bottom strip: mono uppercase 11px, copyright + minor links
 *
 * Column structure expanded from landing.html to include our new
 * surfaces (Resources mega-column with Free Tools, Free Games, Glossary,
 * Use Cases). Same intent as the existing dark React <Footer>, but
 * styled to match the static landing.
 */
export function MarketingFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid oklch(0.88 0.008 270)',
        padding: '48px clamp(20px, 4vw, 48px) 32px',
        background: 'oklch(0.985 0.005 80)',
      }}
      role="contentinfo"
    >
      {/* 5-col grid — 2fr brand + 4 link columns */}
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
              fontFamily: 'var(--font-display), "Times New Roman", serif',
              fontSize: '22px',
              letterSpacing: '-0.02em',
              color: 'oklch(0.18 0.012 270)',
            }}
          >
            <Image src="/black_logo.svg" alt="Reattend" width={28} height={28} style={{ height: '24px', width: 'auto' }} />
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
          <p
            style={{
              fontSize: '13px',
              maxWidth: '32ch',
              marginTop: '14px',
              color: 'oklch(0.32 0.012 270)',
              lineHeight: 1.55,
            }}
          >
            Organizational memory that never forgets. Built by Reattend Technologies Private Limited.
          </p>
          {/* Sister content domain — see docs/organizational-amnesia-domains.md */}
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
              style={{ color: 'oklch(0.45 0.18 280)', textDecoration: 'underline' }}
            >
              organizationalamnesia.com
            </a>
            .
          </p>
        </div>

        {/* Link columns */}
        <FooterCol
          title="Product"
          links={[
            { label: 'Pricing', href: '/pricing' },
            { label: 'Sandbox', href: '/sandbox' },
            { label: 'How it works', href: '/how-it-works' },
            { label: 'Features', href: '/features' },
            { label: 'Integrations', href: '/integrations' },
            { label: 'Compliance', href: '/compliance' },
            { label: 'Free tools', href: '/tool' },
          ]}
        />
        <FooterCol
          title="Resources"
          links={[
            { label: 'Blog', href: '/blog' },
            { label: 'Glossary', href: '/glossary' },
            { label: 'Use cases', href: '/use-case' },
            { label: 'Help center', href: '/help' },
            { label: 'Free tools', href: '/tool' },
            { label: 'Free games', href: '/game' },
          ]}
        />
        <FooterCol
          title="Developers"
          links={[
            { label: 'MCP server', href: '/mcp' },
            { label: 'GitHub Action', href: '/mcp#github-action' },
            { label: 'REST API', href: '/mcp#api' },
            { label: 'API docs', href: '/docs' },
            { label: 'GitHub', href: 'https://github.com/Reattend' },
            { label: 'npm package', href: 'https://www.npmjs.com/package/@reattend/mcp' },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { label: 'About', href: '/about' },
            { label: 'Contact', href: 'mailto:pb@reattend.ai' },
            { label: 'Privacy', href: '/privacy' },
            { label: 'Terms', href: '/terms' },
            { label: 'Refund', href: '/refund' },
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
          fontFamily: 'var(--font-mono), monospace',
          fontSize: '11px',
          color: 'oklch(0.52 0.012 270)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <span>© {new Date().getFullYear()} Reattend Technologies Private Limited</span>
        <span className="flex items-center gap-6">
          <Link href="/privacy" style={{ color: 'inherit' }}>Privacy</Link>
          <Link href="/terms" style={{ color: 'inherit' }}>Terms</Link>
          <Link href="/compliance" style={{ color: 'inherit' }}>Compliance</Link>
          <a
            href="https://stats.uptimerobot.com/KNL7AXsPis"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit' }}
            className="flex items-center gap-1.5"
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: 'oklch(0.7 0.18 145)' }}
            />
            Status
          </a>
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
        {links.map((link) => (
          <li key={link.label}>
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
