'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { resourceMetaFor } from './resource-meta'

/**
 * MarketingHero - the marketing design's "detail hero" for every free
 * tool / game / utility page: back link, eyebrow, split-colour H1, lede,
 * chips, actions on the left; a tinted "stage" card on the right whose
 * button scrolls to the live tool that follows the hero.
 *
 * The props API is unchanged from the previous hero so no page needed
 * editing. Per-route copy (category, glyph, action, tint) comes from the
 * design's own resources map via resource-meta.ts; pages that aren't in
 * that map (e.g. /subprocessors) get a single-column centred hero.
 */
export interface MarketingHeroProps {
  eyebrow: string
  title: string
  emphasis?: string
  emphasisJoiner?: string
  lede: string
  /** Explicit primary link. `null`/undefined = the design's scroll-to-tool action button. */
  primaryCta?: { label: string; href: string } | null
  secondaryCta?: { label: string; href: string }
  trustChips?: string[]
  align?: 'center' | 'left'
  children?: React.ReactNode
}

function splitLastWord(title: string): [string, string] {
  const m = title.trim().match(/^(.*)\s+(\S+)$/)
  return m ? [m[1] + ' ', m[2]] : ['', title]
}

export function MarketingHero({
  eyebrow,
  title,
  emphasis,
  emphasisJoiner = ' ',
  lede,
  primaryCta,
  secondaryCta,
  trustChips,
  align = 'center',
  children,
}: MarketingHeroProps) {
  const pathname = usePathname()
  const meta = resourceMetaFor(pathname)
  const ref = useRef<HTMLElement>(null)

  const scrollToTool = () => {
    const next = ref.current?.nextElementSibling as HTMLElement | null
    if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else window.scrollBy({ top: (ref.current?.offsetHeight ?? 600) - 80, behavior: 'smooth' })
  }

  const chips = trustChips && trustChips.length > 0
    ? trustChips
    : ['No signup', 'Works in your browser', meta?.game ? 'Made for teams' : 'Free forever']
  const [head, tail] = emphasis ? [title + emphasisJoiner, emphasis] : splitLastWord(title)
  const single = !meta && align === 'center'

  return (
    <section className="detail-hero" ref={ref}>
      <div className="detail-hero-grid" style={single ? { gridTemplateColumns: 'minmax(0, 1fr)', justifyItems: 'center', textAlign: 'center' } : undefined}>
        <div className="detail-copy is-visible" data-reveal style={single ? { maxWidth: 760 } : undefined}>
          {meta && (
            <Link className="detail-back" href={meta.game ? '/game' : '/tool'}>← Back to {meta.game ? 'free games' : 'free tools'}</Link>
          )}
          <div className="detail-eyebrow">{meta ? `${meta.category} · Free to use` : eyebrow}</div>
          <h1>{head}<span>{tail}</span></h1>
          <p className="detail-lede">{lede}</p>
          <div className="detail-chips" style={single ? { justifyContent: 'center' } : undefined}>
            {chips.map((c) => <span key={c} className="detail-chip">{c}</span>)}
          </div>
          <div className="detail-actions" style={single ? { justifyContent: 'center' } : undefined}>
            {primaryCta ? (
              <Link className="detail-button primary" href={primaryCta.href}>{primaryCta.label} ↘</Link>
            ) : meta ? (
              <button type="button" className="detail-button primary" onClick={scrollToTool}>{meta.action} ↘</button>
            ) : null}
            <Link className="detail-button" href={secondaryCta?.href ?? '/product'}>{secondaryCta?.label ?? 'See how Reattend works'}</Link>
          </div>
          {children && <div style={{ marginTop: 28 }}>{children}</div>}
        </div>

        {meta && (
          <div className="detail-stage is-visible" data-reveal style={{ ['--delay' as string]: '120ms' }}>
            <div className="detail-stage-window">
              <div className="detail-stage-bar"><span>Live tool</span><span className="detail-stage-dots"><i /><i /><i /></span></div>
              <div className="detail-stage-body">
                <div className="detail-stage-icon">{meta.glyph}</div>
                <h2>{meta.action}</h2>
                <p className="detail-stage-copy">
                  {meta.game
                    ? 'Runs entirely in the browser. Create a room, share the code, play together.'
                    : 'Runs entirely in your browser. Nothing you type here is stored on our servers.'}
                </p>
                <button type="button" className="detail-submit" onClick={scrollToTool}>{meta.action} →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
