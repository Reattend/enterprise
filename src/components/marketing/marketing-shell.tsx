'use client'

import React, { type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MarketingNavbar } from './marketing-navbar'
import { MarketingFooter } from './marketing-footer'
import { resourceMetaFor, type ResourceMeta } from './resource-meta'
import './resource-shell.css'

/**
 * MarketingShell - the canonical wrapper for every marketing page outside
 * the static HTML (tools, games, free utilities, sub-processors, ...).
 *
 * Renders the marketing design's chrome (topbar, tinted detail page,
 * footer) around whatever the page puts inside. The per-route tint and
 * the trailing "Keep exploring" / closing sections come from the design's
 * resources map (resource-meta.ts). Only shell rules are styled - see
 * resource-shell.css - so page bodies keep their own (Tailwind) styling
 * and behaviour untouched.
 */
export function MarketingShell({
  children,
  withNavbar = true,
  withFooter = true,
}: {
  children: React.ReactNode
  withNavbar?: boolean
  withFooter?: boolean
}) {
  const pathname = usePathname()
  const meta = resourceMetaFor(pathname)
  return (
    <div className="rshell detail-page" style={{ ['--detail-tint' as string]: meta?.tint ?? '#f3f7df' } as CSSProperties}>
      {withNavbar && <MarketingNavbar />}
      <main id="main" className="detail-main detail-page-body">
        {children}
        {meta && <ResourceExtras meta={meta} />}
      </main>
      {withFooter && <MarketingFooter />}
    </div>
  )
}

/** The design's trailing sections for a free resource page. */
export function ResourceExtras({ meta }: { meta: ResourceMeta }) {
  const related = meta.game
    ? [['/game', 'Explore every team game'], ['/game/icebreaker-spinner', 'Try Icebreaker Spinner'], ['/game/team-bingo', 'Play Team Bingo']]
    : [['/tool', 'Explore every free tool'], ['/tool/brain-dump-organizer', 'Try Brain Dump Organizer'], ['/free-daily-planner', 'Open the Daily Planner']]
  return (
    <>
      <section className="detail-section is-visible" data-reveal>
        <div className="detail-section-intro">
          <div>
            <div className="detail-eyebrow">Keep exploring</div>
            <h2>More ways to make room.</h2>
          </div>
          <p>Use another free resource, or see how Reattend keeps the useful context after the moment passes.</p>
        </div>
        <div className="detail-related">
          {related.map(([href, label]) => (
            <Link key={href} href={href}><span>{label}</span><span>↗</span></Link>
          ))}
        </div>
      </section>
      <section className="detail-closing is-visible" data-reveal>
        <div className="detail-eyebrow">A little less remembering</div>
        <h2>Keep the useful context after the moment passes.</h2>
        <p>Reattend connects the thoughts, decisions and conversations behind the work, so you can find them when they matter again.</p>
        <div className="detail-actions">
          <Link className="detail-button primary" href="/register">Start for free ↘</Link>
          <Link className="detail-button" href="/product">See how Reattend works</Link>
        </div>
      </section>
    </>
  )
}
