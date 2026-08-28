import React from 'react'
import { MarketingNavbar } from './marketing-navbar'
import { MarketingFooter } from './marketing-footer'

/**
 * MarketingShell - the canonical wrapper for every marketing page outside
 * the static landing.html (tools, games, free utilities, comparison pages,
 * use-case pages, glossary, blog, help center, etc).
 *
 * Inherits the design language from /public/landing-design/styles.css so
 * marketing surfaces feel like one continuous brand. Tokens (oklch palette,
 * Instrument Serif headings, paper-grain background) match the landing
 * verbatim - see that CSS file for the source of truth.
 *
 * Usage:
 *   <MarketingShell>
 *     <MarketingHero eyebrow="Free tool" title="Memory Debt Calculator"
 *                    emphasis="Calculator" lede="..." />
 *     ... your tool body here ...
 *     <ToolFooterCta />
 *   </MarketingShell>
 */
export function MarketingShell({
  children,
  /** Set to false on pages that need a custom hero immediately (rare). */
  withNavbar = true,
  /** Set to false to skip the global Footer (rare; e.g. fullscreen game). */
  withFooter = true,
}: {
  children: React.ReactNode
  withNavbar?: boolean
  withFooter?: boolean
}) {
  return (
    <div
      className="min-h-screen text-[oklch(0.18_0.012_270)] overflow-x-hidden relative"
      style={{
        background: 'oklch(1 0 0)',
        fontFamily: 'var(--font-inter), -apple-system, system-ui, sans-serif',
      }}
    >
      {/* Paper-grain texture - same dot pattern as the landing.html, kept
          subtle so it adds warmth without being noisy under content. */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        aria-hidden="true"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 20% 30%, oklch(0.4 0.01 270 / 0.03) 50%, transparent 51%),
            radial-gradient(1px 1px at 70% 80%, oklch(0.4 0.01 270 / 0.025) 50%, transparent 51%),
            radial-gradient(1px 1px at 40% 60%, oklch(0.4 0.01 270 / 0.02) 50%, transparent 51%)
          `,
          backgroundSize: '220px 220px, 180px 180px, 140px 140px',
          mixBlendMode: 'multiply',
          opacity: 0.6,
        }}
      />
      {withNavbar && <MarketingNavbar />}
      <main className="relative z-[2]">
        {children}
      </main>
      {withFooter && <MarketingFooter />}
    </div>
  )
}
