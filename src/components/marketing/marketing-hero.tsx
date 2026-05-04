import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * MarketingHero — the eyebrow + serif H1 + lede + CTA cluster pattern from
 * the landing.html hero, reusable for every tool/game/free-utility page.
 *
 * Visual rules (mirrored from /public/landing-design/styles.css):
 * - Eyebrow: mono, uppercase, 11px, with an animated violet pulse dot on the left
 * - H1: Instrument Serif, 56-72px, tight tracking, optional italic emphasis word
 * - Lede: Geist, 18-20px, ink-2 (medium gray), max ~52ch for read width
 * - CTAs: pill buttons, primary filled (dark) + outline secondary
 *
 * The italic-emphasis word is a key landing pattern — `<em>preserved</em>`
 * in the landing's "Your organization's memory, preserved." Keep using it
 * to land the new positioning in 1-2 words per hero.
 */
export interface MarketingHeroProps {
  /** Mono uppercase label that sits above the title. e.g. "Free tool" / "Free team game" */
  eyebrow: string
  /** Plain (non-emphasized) text that opens the title. */
  title: string
  /** Optional italic-serif emphasis word that closes the title. Set both for "Foo bar — emphasized." */
  emphasis?: string
  /** Punctuation between title and emphasis. Defaults to a comma; some use " — " or just space. */
  emphasisJoiner?: string
  /** Subhead paragraph. ~1-2 sentences, max ~52ch read width. */
  lede: string
  /** Optional primary CTA. Pass null/undefined when the hero is followed by a
   *  page-specific action button (e.g., "Start assessment" that needs onClick). */
  primaryCta?: { label: string; href: string } | null
  /** Optional secondary CTA. */
  secondaryCta?: { label: string; href: string }
  /** Optional small social-proof / capability strip below the CTAs (e.g., compliance badges). */
  trustChips?: string[]
  /** Center-align (default) or left-align the hero. Center for tool index pages, left for individual tools where a tool/form sits to the right. */
  align?: 'center' | 'left'
  /** Children render below the lede + CTAs but inside the hero section — useful for inline form or screenshot. */
  children?: React.ReactNode
}

export function MarketingHero({
  eyebrow,
  title,
  emphasis,
  emphasisJoiner = ' ',
  lede,
  primaryCta = { label: 'Try Reattend Enterprise free', href: '/sandbox' },
  secondaryCta,
  trustChips,
  align = 'center',
  children,
}: MarketingHeroProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left'
  const inlineAlign = align === 'center' ? 'mx-auto' : ''
  return (
    <section
      className="relative px-5 sm:px-8"
      style={{ paddingTop: 'clamp(60px, 8vw, 110px)', paddingBottom: 'clamp(40px, 6vw, 80px)' }}
    >
      <div className={`max-w-3xl ${alignClass}`}>
        {/* Eyebrow: mono uppercase + pulsing dot */}
        <div
          className={`inline-flex items-center gap-2 ${inlineAlign}`}
          style={{
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            fontSize: '11px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'oklch(0.52 0.012 270)',
            fontWeight: 500,
            marginBottom: '20px',
          }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: 'oklch(0.45 0.18 280)',
              boxShadow: '0 0 0 3px oklch(0.45 0.18 280 / 0.15)',
              animation: 'mh-pulse 2.4s ease-in-out infinite',
            }}
          />
          {eyebrow}
        </div>

        {/* H1: Instrument Serif, tight tracking, optional italic emphasis */}
        <h1
          style={{
            fontFamily: 'var(--font-display), "Times New Roman", serif',
            fontWeight: 400,
            fontSize: 'clamp(40px, 6vw, 72px)',
            lineHeight: 1.04,
            letterSpacing: '-0.015em',
            color: 'oklch(0.18 0.012 270)',
            marginBottom: '20px',
          }}
        >
          {title}
          {emphasis && (
            <>
              {emphasisJoiner}
              <em style={{ fontStyle: 'italic', color: 'oklch(0.45 0.18 280)' }}>{emphasis}</em>
            </>
          )}
        </h1>

        {/* Lede */}
        <p
          className={inlineAlign}
          style={{
            fontSize: 'clamp(16px, 1.4vw, 19px)',
            lineHeight: 1.55,
            color: 'oklch(0.32 0.012 270)',
            maxWidth: '52ch',
            marginBottom: '28px',
          }}
        >
          {lede}
        </p>

        {/* CTA cluster — both CTAs are optional. Pages with custom action
            buttons (e.g., a phase-changing onClick) pass primaryCta={null}
            and render their own button below the hero. */}
        {(primaryCta || secondaryCta) && (
          <div className={`flex flex-wrap items-center gap-3 ${align === 'center' ? 'justify-center' : ''}`}>
            {primaryCta && (
              <Link
                href={primaryCta.href}
                className="inline-flex items-center gap-1.5 rounded-full px-7 py-3 text-[15px] font-medium transition-colors"
                style={{ background: 'oklch(0.18 0.012 270)', color: 'white' }}
              >
                {primaryCta.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className="inline-flex items-center gap-1.5 rounded-full px-7 py-3 text-[15px] font-medium transition-colors border"
                style={{
                  borderColor: 'oklch(0.88 0.008 270)',
                  background: 'oklch(0.992 0.004 80)',
                  color: 'oklch(0.18 0.012 270)',
                }}
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}

        {/* Trust chips (compliance, etc) */}
        {trustChips && trustChips.length > 0 && (
          <div
            className={`flex flex-wrap items-center gap-x-4 gap-y-2 mt-6 ${align === 'center' ? 'justify-center' : ''}`}
            style={{
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'oklch(0.52 0.012 270)',
            }}
          >
            {trustChips.map((chip, i) => (
              <React.Fragment key={chip}>
                <span>{chip}</span>
                {i < trustChips.length - 1 && (
                  <span style={{ color: 'oklch(0.72 0.008 270)' }}>·</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {children && <div className="mt-10">{children}</div>}
      </div>

      <style>{`
        @keyframes mh-pulse {
          0%, 100% { box-shadow: 0 0 0 3px oklch(0.45 0.18 280 / 0.15); }
          50%      { box-shadow: 0 0 0 6px oklch(0.45 0.18 280 / 0.05); }
        }
      `}</style>
    </section>
  )
}
