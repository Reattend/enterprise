'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, Check, History, Calendar, Gavel, Sparkles,
  Network, Eye,
} from 'lucide-react'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'

export default function TimeMachinePage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1a1a2e] overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full bg-gradient-to-br from-amber-200/30 via-orange-100/20 to-transparent blur-3xl pointer-events-none" />

      <SiteNav />

      {/* Hero */}
      <section className="relative pt-10 md:pt-14 pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          <div className="lg:col-span-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 mb-5">
                Time Machine
              </p>
              <h1 className="text-[40px] md:text-[48px] font-bold tracking-[-0.025em] leading-[1.05]">
                Scrub the org through time.
              </h1>
              <p className="text-[15px] text-neutral-600 mt-5 max-w-md leading-relaxed">
                Drag a slider across 24 months. See what the organization knew on any past day. Which decisions were active. Which had been reversed yet, which hadn&apos;t. Every number on the page is a real point-in-time query, not an aggregate.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mt-7">
                <Link href="/sandbox" className="inline-flex items-center gap-1.5 px-5 h-10 bg-[#1a1a2e] text-white text-[13px] font-semibold rounded-full hover:bg-[#2d2b55] transition-colors shadow-md shadow-[#1a1a2e]/15">
                  Try the live sandbox <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link href="/pricing" className="inline-flex items-center gap-1.5 px-5 h-10 bg-white text-[#1a1a2e] text-[13px] font-semibold rounded-full border border-neutral-200 hover:border-neutral-300 transition-colors">
                  See pricing
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <SliderMock />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 md:py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">What it gives you</p>
            <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1]">
              Point-in-time, not just point-in-now.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ColourCard icon={History}  title="24 months of state" copy="Default range. Configurable per-org. Every record, decision, and policy indexed by createdAt, reversedAt, supersededAt." />
            <NeutralCard icon={Calendar} title="Drag or play" copy="Scrub manually for one date, or hit play to animate forward at one tick per 600ms. Counts re-pulse on every scrub." />
            <NeutralCard icon={Gavel}    title="Active decisions panel" copy="Lists every decision active at the slider date. Reversed-since-then decisions vanish; superseded ones show their predecessor." />
            <NeutralCard icon={Sparkles} title="Memory snapshot" copy="Top recent records as of that instant. Click any to jump to the full record (still respects RBAC)." />
            <NeutralCard icon={Network}  title="Anchor by topic / person / dept" copy="Filter the timeline to one entity. Watch a specific person’s decision footprint grow over months." />
            <NeutralCard icon={Eye}      title="Audit-ready" copy="When auditors ask &ldquo;what did the org know about Vendor X on March 3,&rdquo; this is the answer screen." />
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-16 md:py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">When you reach for it</p>
            <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1]">
              Three real moments.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <UseCard n="01" title="The audit question" copy="Counsel asks: &ldquo;What did we know about this counterparty before we signed?&rdquo; Drag to the contract date. Read the active memories." />
            <UseCard n="02" title="The reversal review" copy="Engineering reverses a 2024 architecture decision. Time Machine shows the original context, who decided, what changed since." />
            <UseCard n="03" title="The board narrative" copy="Show your investors decision velocity over 12 months in the same view as the policy and member growth. One slider, one story." />
          </div>
        </div>
      </section>

      <ClosingCTA />
      <SiteFooter />
    </div>
  )
}

function SliderMock() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-300/40 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-700">
          <History className="h-3 w-3" /> Time Machine
        </div>
        <div className="text-[11px] text-neutral-500 font-mono">demo-mof / Apr 24 ←→ Apr 26</div>
      </div>
      <div className="text-[18px] font-semibold tracking-tight">As of January 2025</div>
      {/* Sparkline */}
      <div className="flex items-end gap-0.5 h-10 opacity-30">
        {[3, 5, 4, 7, 6, 8, 7, 9, 8, 10, 9, 12, 10, 14, 11].map((v, i) => (
          <div key={i} className={`flex-1 rounded-t ${i < 9 ? 'bg-amber-600' : 'bg-amber-500'}`} style={{ height: `${(v / 14) * 100}%` }} />
        ))}
      </div>
      {/* Slider */}
      <div className="relative h-2 rounded-full bg-neutral-200">
        <div className="absolute left-0 top-0 h-full w-[55%] rounded-full bg-amber-500" />
        <div className="absolute left-[55%] top-1/2 -translate-x-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-amber-600 ring-4 ring-amber-200" />
      </div>
      <div className="flex items-center justify-between text-[10px] text-neutral-500">
        <span>Apr 2024</span>
        <span className="text-[12px] font-bold text-[#1a1a2e]"><Calendar className="h-3 w-3 inline mr-1 text-amber-600" />January 2025</span>
        <span>Apr 2026</span>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 pt-2">
        {[
          { l: 'Active', v: 42, c: 'text-amber-700' },
          { l: 'Reversed', v: 7, c: 'text-rose-600' },
          { l: 'New', v: 12, c: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.l} className="rounded border border-neutral-200 bg-white p-2.5">
            <div className={`text-[20px] font-bold tabular-nums ${s.c}`}>{s.v}</div>
            <div className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400 mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>
      {/* Active decisions */}
      <div className="rounded border border-neutral-200 bg-neutral-50/40 p-3 space-y-1.5">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-neutral-500">Active decisions at Jan 2025</div>
        {['BEPS treaty position adopted', 'Hiring freeze on Level-A roles', 'Cross-border tax escalation path'].map((t) => (
          <div key={t} className="flex items-center gap-2 text-[11px] text-neutral-700">
            <Gavel className="h-3 w-3 text-amber-600 shrink-0" />
            <span className="truncate">{t}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ColourCard({ icon: Icon, title, copy }: { icon: typeof History; title: string; copy: string }) {
  return (
    <div className="relative rounded-2xl p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md overflow-hidden">
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="relative">
        <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center mb-3">
          <Icon className="h-4 w-4 text-white" strokeWidth={2.25} />
        </div>
        <h3 className="text-[15px] font-semibold tracking-tight mb-1.5">{title}</h3>
        <p className="text-[12px] text-white/85 leading-relaxed">{copy}</p>
      </div>
    </div>
  )
}

function NeutralCard({ icon: Icon, title, copy }: { icon: typeof History; title: string; copy: string }) {
  return (
    <div className="rounded-2xl p-5 bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-md hover:shadow-neutral-200/50 transition-all">
      <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center mb-3">
        <Icon className="h-4 w-4 text-[#1a1a2e]" />
      </div>
      <h3 className="text-[15px] font-semibold tracking-tight text-[#1a1a2e] mb-1.5">{title}</h3>
      <p className="text-[12px] text-neutral-600 leading-relaxed">{copy}</p>
    </div>
  )
}

function UseCard({ n, title, copy }: { n: string; title: string; copy: string }) {
  return (
    <div className="rounded-xl bg-white border border-neutral-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-amber-500 text-white text-[13px] font-bold tabular-nums flex items-center justify-center">{n}</div>
      </div>
      <h3 className="text-[16px] font-semibold tracking-tight text-[#1a1a2e] mb-2">{title}</h3>
      <p className="text-[13px] text-neutral-600 leading-relaxed">{copy}</p>
    </div>
  )
}

function ClosingCTA() {
  return (
    <section className="py-20 md:py-24 relative z-10">
      <div className="max-w-3xl mx-auto px-8 text-center">
        <h2 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.025em] leading-[1.1]">
          Replay your org. Any day. Any topic.
        </h2>
        <p className="text-[14px] text-neutral-600 mt-4 max-w-lg mx-auto">
          The sandbox ships with 24 months of seeded history. Scrub it. See decisions appear, reverse, supersede in real time.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-7">
          <Link href="/sandbox" className="inline-flex items-center gap-1.5 px-5 h-10 bg-[#1a1a2e] text-white text-[13px] font-semibold rounded-full hover:bg-[#2d2b55] transition-colors shadow-md shadow-[#1a1a2e]/15">
            Try the sandbox <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="mailto:sales@reattend.com" className="inline-flex items-center gap-1.5 px-5 h-10 bg-white text-[#1a1a2e] text-[13px] font-semibold rounded-full border border-neutral-200 hover:border-neutral-300 transition-colors">
            Talk to sales
          </Link>
        </div>
      </div>
    </section>
  )
}
