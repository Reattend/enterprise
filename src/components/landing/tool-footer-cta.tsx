import React from 'react'
import Link from 'next/link'
import { ArrowRight, Brain, Wrench, Gamepad2 } from 'lucide-react'

/**
 * Standard footer CTA + related-discovery strip for any tool/game/free-utility page.
 *
 * Drop this in once at the bottom of a tool page, ABOVE the global <Footer />.
 * Gives every page a consistent conversion moment + cross-promotes the rest of
 * the discovery surfaces (other tools, games, the main product).
 *
 * Usage:
 *   import { ToolFooterCta } from '@/components/landing/tool-footer-cta'
 *   ...
 *   <ToolFooterCta />          // standard "Try Reattend Enterprise free →"
 *   <ToolFooterCta variant="game" />   // tweaks the headline for a game page
 *
 * For new tools we ship from now on, this is the convention. Existing tools
 * have their own per-page CTA wired inline; we'll migrate them opportunistically
 * (e.g., next time we touch the page for content updates).
 *
 * See docs/seo-strategy.md for why discovery footers matter (cross-page
 * authority + reduced bounce + brand reinforcement).
 */
export function ToolFooterCta({
  variant = 'tool',
  headline,
}: {
  variant?: 'tool' | 'game' | 'template'
  /** Override the default headline if a specific page needs custom phrasing */
  headline?: string
}) {
  const defaultHeadline = headline || (
    variant === 'game' ? 'Get past the icebreaker.'
    : variant === 'template' ? 'Templates are a starting point.'
    : 'Free tools are a great start.'
  )

  const subline = variant === 'game'
    ? "Run a team that doesn't forget what it learned about each other. Reattend gives your org a memory that survives every offsite, every quarter, every new hire."
    : variant === 'template'
    ? "When templates aren't enough — when your org's actual decisions, exit interviews, and institutional knowledge need a real home — Reattend is built for that."
    : 'When you outgrow the spreadsheet — when you need real org memory that captures decisions, runs exit interviews, and survives the next person who quits — Reattend is built for that.'

  return (
    <section className="relative max-w-[1200px] mx-auto px-5 my-20">
      {/* The conversion moment. Cream + violet, matches the email shell + Hot Cache panels. */}
      <div className="rounded-2xl bg-gradient-to-br from-[#FBFAF6] via-[#F7F4EC] to-[#EDEBFA] border border-[#E5E0D6] p-10 sm:p-14 text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1A1A2E] mb-3" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
          {defaultHeadline}
        </h2>
        <p className="text-base sm:text-lg text-[#4B5563] max-w-[640px] mx-auto mb-7 leading-relaxed">
          {subline}
        </p>
        <Link
          href="/sandbox"
          className="inline-flex items-center gap-1.5 bg-[#0B0B0F] hover:bg-[#1A1A2E] text-white font-medium text-[15px] px-7 py-3.5 rounded-full transition-colors"
        >
          Try Reattend Enterprise free
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-[#9B9486] mt-3">
          Free tier · No card required · 45-day Pro trial available
        </p>
      </div>

      {/* Related discovery strip — three doors to the rest of the SEO surfaces.
          Reduces bounce rate + spreads internal-link authority across tools/games/main. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <DiscoveryCard
          icon={Brain}
          label="See how it works"
          href="/how-it-works"
          highlight={variant !== 'tool'}
        />
        <DiscoveryCard
          icon={Wrench}
          label="More free tools"
          href="/tool"
          highlight={variant !== 'tool'}
        />
        <DiscoveryCard
          icon={Gamepad2}
          label="Free team games"
          href="/game"
          highlight={variant !== 'game'}
        />
      </div>
    </section>
  )
}

function DiscoveryCard({
  icon: Icon,
  label,
  href,
  highlight,
}: {
  icon: typeof Brain
  label: string
  href: string
  highlight?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between gap-3 px-5 py-4 rounded-xl border transition-all ${
        highlight
          ? 'border-[#5B4FE5]/30 bg-[#EDEBFA] hover:border-[#5B4FE5]/50'
          : 'border-[#E5E0D6] bg-white/60 hover:bg-white/90 hover:border-[#5B4FE5]/30'
      }`}
    >
      <span className="flex items-center gap-3 text-[14px] font-medium text-[#1A1A2E]">
        <Icon className="w-4 h-4 text-[#5B4FE5]" />
        {label}
      </span>
      <ArrowRight className="w-4 h-4 text-[#9B9486] group-hover:text-[#5B4FE5] group-hover:translate-x-0.5 transition-all" />
    </Link>
  )
}
