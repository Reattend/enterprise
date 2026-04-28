'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState } from 'react'
import {
  ArrowRight, Shield, Building2, GraduationCap, History, Check,
  Plug, Network, ListFilterPlus, Database, Sparkles, Plus, Minus,
} from 'lucide-react'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'

// Reattend Enterprise landing. Sandbox-style soft FAFAFA background +
// pastel blob behind the hero. Shared SiteNav and SiteFooter so every
// public page reads as one continuous site. Black on white type, no
// section separators, capability mocks in CSS.

export default function EnterpriseLanding() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1a1a2e] overflow-x-hidden">
      {/* Soft pastel blob behind the hero, same vibe as /sandbox. */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full bg-gradient-to-br from-neutral-200/50 via-neutral-100/30 to-transparent blur-3xl pointer-events-none" />

      <SiteNav />
      <Hero />
      <CompanyMarquee />
      <BigStatement />
      <ThreePillars />
      <HowItWorks />
      <CapabilityGrid />
      <UseCases />
      <Testimonial />
      <PricingTease />
      <FAQ />
      <ClosingCTA />
      <SiteFooter />
    </div>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-10 md:pt-14 pb-16 md:pb-20">
      <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
        <div className="lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-5">
              Enterprise memory platform
            </p>
            <h1 className="text-[40px] md:text-[48px] font-bold tracking-[-0.025em] leading-[1.05] text-[#1a1a2e]">
              Your organization&apos;s memory, preserved.
            </h1>
            <p className="text-[15px] text-neutral-600 mt-5 max-w-md leading-relaxed">
              Decisions, context, and institutional knowledge. Captured, linked, and never lost. Even when people leave, transfer, or retire.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 mt-7">
              <Link
                href="/sandbox"
                className="inline-flex items-center gap-1.5 px-5 h-10 bg-[#1a1a2e] text-white text-[13px] font-semibold rounded-full hover:bg-[#2d2b55] transition-colors shadow-md shadow-[#1a1a2e]/15"
              >
                Try the live sandbox <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 px-5 h-10 bg-white text-[#1a1a2e] text-[13px] font-semibold rounded-full border border-neutral-200 hover:border-neutral-300 transition-colors"
              >
                See pricing
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <CockpitScreenshot />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// CockpitScreenshot — high-fidelity HTML reproduction of the
// /app/admin/<orgId> cockpit. Looks like a real screenshot, no static
// asset to keep in sync.
function CockpitScreenshot() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-2xl shadow-neutral-300/40 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 h-7 border-b border-neutral-200 bg-neutral-50">
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="ml-3 text-[10px] text-neutral-400 font-mono">enterprise.reattend.com/app/admin</span>
      </div>

      <div className="grid grid-cols-12 min-h-[360px]">
        <div className="col-span-3 border-r border-neutral-100 bg-neutral-50/40 p-2.5 space-y-2">
          <div className="rounded bg-[#1a1a2e] text-white text-[9px] font-semibold py-1.5 text-center">Control Room</div>
          <div className="rounded border border-neutral-300 bg-white text-[9px] font-semibold py-1.5 text-center text-neutral-700">Chat</div>
          <div className="space-y-0.5 pt-1">
            {['Home', 'Capture', 'Memories', 'Landscape', 'Wiki', 'Policies', 'Tasks'].map((l, i) => (
              <div key={l} className={`text-[10px] px-2 py-1 rounded ${i === 0 ? 'bg-neutral-100 font-semibold text-[#1a1a2e]' : 'text-neutral-500'}`}>{l}</div>
            ))}
          </div>
        </div>

        <div className="col-span-9 p-4 space-y-3">
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400">Enterprise admin</div>
            <div className="text-[18px] font-semibold tracking-tight text-[#1a1a2e] mt-0.5">Memory health cockpit</div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Health', value: '92' },
              { label: 'Memories', value: '1.2k' },
              { label: 'Decisions', value: '47' },
              { label: 'Active members', value: '22' },
            ].map((s) => (
              <div key={s.label} className="rounded border border-neutral-200 bg-white p-2">
                <div className="text-[8px] font-semibold uppercase tracking-widest text-neutral-400">{s.label}</div>
                <div className="text-[18px] font-bold tabular-nums mt-0.5 text-[#1a1a2e]">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded border border-neutral-200 bg-white p-3">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-2">Amnesia signals</div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { l: 'Stale', v: 7 },
                { l: 'Orphaned', v: 3 },
                { l: 'Contradictions', v: 1 },
                { l: 'Silent depts', v: 2 },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <div className="text-[14px] font-bold tabular-nums text-[#1a1a2e]">{s.v}</div>
                  <div className="text-[8px] text-neutral-500 mt-0.5">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-neutral-200 bg-white p-3 space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-1">Decisions this month</div>
            {[
              'Adopt OECD BEPS 2.0 framework',
              'Hiring freeze on Level-A roles',
              'Reverse 2024 transfer pricing policy',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 text-[11px] text-neutral-700">
                <span className="h-1 w-1 rounded-full bg-[#1a1a2e]" />
                <span className="truncate">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Company marquee ───────────────────────────────────────────────────────
const COMPANIES = [
  'PayPal', 'PayTM', 'Helix', 'Forecaster', 'Grill’d', 'TestSheet',
  'Oak Foundation', 'Delhivery', 'Neville Partners', 'CarryOK Nights',
  'Northridge Tax Consultants', 'Miro Capital', 'EvoFox',
]

function CompanyMarquee() {
  const items = [...COMPANIES, ...COMPANIES]
  return (
    <section className="py-10 relative z-10">
      <div className="max-w-6xl mx-auto px-8">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-6">
          Teams in these companies trust us to never forget
        </p>
        <div className="relative overflow-hidden marquee-mask">
          <div className="flex gap-12 whitespace-nowrap marquee-track">
            {items.map((c, i) => (
              <span key={`${c}-${i}`} className="text-[15px] font-semibold tracking-tight text-neutral-500 shrink-0">{c}</span>
            ))}
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 38s linear infinite;
          will-change: transform;
        }
        .marquee-mask {
          mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
        }
      `}</style>
    </section>
  )
}

// ─── Big statement (Linear-style middle line) ──────────────────────────────
function BigStatement() {
  return (
    <section className="py-20 md:py-24 relative z-10">
      <div className="max-w-3xl mx-auto px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-5 text-center">
          The thesis
        </p>
        <p className="text-[24px] md:text-[30px] font-semibold tracking-[-0.02em] leading-[1.3] text-center text-[#1a1a2e]">
          A new memory layer for the modern organization. Reattend turns every meeting, every decision, every handoff into time-indexed, queryable memory. So when people leave, the knowledge stays.
        </p>
      </div>
    </section>
  )
}

// ─── Capability grid ──────────────────────────────────────────────────────
const CAPABILITIES: Array<{ icon: typeof History; title: string; copy: string; mock: 'time' | 'handoff' | 'compliance' | 'graph' }> = [
  {
    icon: History,
    title: 'Scrub the org through 24 months.',
    copy: 'Time Machine indexes every decision, memory, and policy by point in time. Ask what the org knew on any past date. Every number is a real query, not an aggregate.',
    mock: 'time',
  },
  {
    icon: GraduationCap,
    title: 'When someone leaves, the knowledge stays.',
    copy: 'Exit Interview Agent reads the departing person’s memory footprint, asks 10 to 15 grounded questions, and writes the handoff doc. Six weeks of ramp time, gone.',
    mock: 'handoff',
  },
  {
    icon: Network,
    title: 'Decisions you can trace, not just find.',
    copy: 'Every decision is linked to its predecessors, the policies it impacts, and the memories that informed it. Click any node to see the chain.',
    mock: 'graph',
  },
  {
    icon: Shield,
    title: 'Procurement-grade by default.',
    copy: 'Two-tier RBAC with eight record-visibility rules. Hash-chained WORM audit log. GDPR controls live, SOC 2 in progress, on-premise deployment available.',
    mock: 'compliance',
  },
]

// ─── Three pillars (colourful #1) ──────────────────────────────────────────
// Three deep-gradient cards summarizing the product as a Capture → Connect →
// Recall loop. Bold visuals in an otherwise restrained page; the user
// asked for a colourful section, this is one of the two.
const PILLARS: Array<{
  icon: typeof ListFilterPlus
  title: string
  copy: string
  gradient: string
  ring: string
}> = [
  {
    icon: ListFilterPlus,
    title: 'Capture',
    copy: 'Every meeting note, every decision, every email thread. Brain-dump it, paste it, drag a PDF in. The AI parses what matters.',
    gradient: 'from-violet-600 via-fuchsia-600 to-pink-600',
    ring: 'ring-violet-500/30',
  },
  {
    icon: Network,
    title: 'Connect',
    copy: 'Memories link to decisions, decisions to policies, policies to people. The graph fills itself as you work.',
    gradient: 'from-amber-500 via-orange-600 to-rose-600',
    ring: 'ring-amber-500/30',
  },
  {
    icon: History,
    title: 'Recall',
    copy: 'Ask in plain English. Scrub through 24 months. See what the org knew on any past day. Even after the person who knew it has left.',
    gradient: 'from-emerald-500 via-teal-600 to-cyan-700',
    ring: 'ring-emerald-500/30',
  },
]

function ThreePillars() {
  return (
    <section className="py-16 md:py-20 relative z-10">
      <div className="max-w-6xl mx-auto px-8">
        <div className="max-w-2xl mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">The loop</p>
          <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1a1a2e]">
            Capture, connect, recall. Forever.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`relative rounded-2xl p-6 bg-gradient-to-br ${p.gradient} text-white shadow-xl ring-2 ${p.ring} overflow-hidden`}
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="relative">
                <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-5">
                  <p.icon className="h-5 w-5 text-white" strokeWidth={2.25} />
                </div>
                <h3 className="text-[20px] font-bold tracking-tight mb-2">{p.title}</h3>
                <p className="text-[13px] text-white/85 leading-relaxed">{p.copy}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How it works (3 numbered steps) ───────────────────────────────────────
const STEPS: Array<{ n: string; title: string; copy: string; icon: typeof ListFilterPlus }> = [
  {
    n: '01',
    title: 'Drop in what you know.',
    copy: 'Brain-dump notes, paste a Slack thread, save a Gmail conversation, drag a contract PDF. Five seconds in.',
    icon: ListFilterPlus,
  },
  {
    n: '02',
    title: 'AI structures it.',
    copy: 'The model classifies, links, deduplicates, and adds it to the right department\'s memory. RBAC is enforced before the LLM ever sees a record.',
    icon: Database,
  },
  {
    n: '03',
    title: 'Recall on demand.',
    copy: 'Ask anything. Scrub through time. Run an exit-interview agent the day someone leaves. The memory is yours, indexed.',
    icon: Sparkles,
  },
]

function HowItWorks() {
  return (
    <section className="py-16 md:py-20 relative z-10">
      <div className="max-w-6xl mx-auto px-8">
        <div className="max-w-2xl mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">How it works</p>
          <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1a1a2e]">
            Three steps. No consultants required.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-xl bg-white border border-neutral-200 p-6 hover:border-neutral-300 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 rounded-lg bg-[#1a1a2e] text-white text-[13px] font-bold tabular-nums flex items-center justify-center">
                  {s.n}
                </div>
                <s.icon className="h-4 w-4 text-neutral-500" />
              </div>
              <h3 className="text-[16px] font-semibold tracking-tight text-[#1a1a2e] mb-2">{s.title}</h3>
              <p className="text-[13px] text-neutral-600 leading-relaxed">{s.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CapabilityGrid() {
  return (
    <section id="capabilities" className="py-16 md:py-20 relative z-10">
      <div className="max-w-6xl mx-auto px-8">
        <div className="max-w-2xl mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">Capabilities</p>
          <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1a1a2e]">
            What you actually do with it.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CAPABILITIES.map((c) => (
            <CapabilityCard key={c.title} {...c} />
          ))}
        </div>
      </div>
    </section>
  )
}

function CapabilityCard({ icon: Icon, title, copy, mock }: typeof CAPABILITIES[number]) {
  return (
    <div className="rounded-xl bg-white border border-neutral-200 overflow-hidden hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50 transition-all">
      <div className="aspect-[16/9] border-b border-neutral-100 bg-neutral-50/60">
        <CapabilityMock kind={mock} />
      </div>
      <div className="p-5">
        <Icon className="h-4 w-4 text-neutral-700 mb-3" />
        <h3 className="text-[16px] font-semibold tracking-tight text-[#1a1a2e] mb-1.5">{title}</h3>
        <p className="text-[13px] text-neutral-600 leading-relaxed">{copy}</p>
      </div>
    </div>
  )
}

function CapabilityMock({ kind }: { kind: 'time' | 'handoff' | 'compliance' | 'graph' }) {
  if (kind === 'time') {
    return (
      <div className="h-full p-4 flex flex-col">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-neutral-500 mb-2">As of January 2025</div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { l: 'Active', v: '42' },
            { l: 'Reversed', v: '7' },
            { l: 'New', v: '12' },
          ].map((s) => (
            <div key={s.l} className="rounded bg-white border border-neutral-200 p-2">
              <div className="text-[14px] font-bold tabular-nums text-[#1a1a2e]">{s.v}</div>
              <div className="text-[8px] text-neutral-500">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-auto">
          <div className="h-1 flex-1 rounded-full bg-neutral-200 overflow-hidden">
            <div className="h-full w-[72%] bg-[#1a1a2e] rounded-full" />
          </div>
          <span className="text-[9px] font-mono text-neutral-500 tabular-nums">Apr 24 ←→ Apr 26</span>
        </div>
      </div>
    )
  }
  if (kind === 'handoff') {
    return (
      <div className="h-full p-4 flex flex-col gap-1.5">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-neutral-500">Handoff doc</div>
        <div className="text-[12px] font-semibold text-[#1a1a2e]">Director, International Taxation</div>
        {[
          { t: 'Active projects', b: 'BEPS treaty thread is the load-bearing one.' },
          { t: 'Relationships', b: 'Meera, Priya, Arjun. Meet first.' },
          { t: 'Gotchas', b: 'BEPS form maps blank year to 2020 silently.' },
        ].map((s) => (
          <div key={s.t} className="rounded border border-neutral-100 bg-white p-1.5">
            <div className="text-[8px] font-semibold uppercase tracking-widest text-neutral-500">{s.t}</div>
            <div className="text-[10px] text-neutral-700 leading-snug">{s.b}</div>
          </div>
        ))}
      </div>
    )
  }
  if (kind === 'compliance') {
    return (
      <div className="h-full p-4 flex flex-col gap-1.5">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-neutral-500 mb-1">Controls</div>
        {[
          { l: 'Encryption · KMS', s: 'live' },
          { l: 'GDPR self-export', s: 'live' },
          { l: 'WORM audit log', s: 'live' },
          { l: 'SOC 2 Type I', s: 'q1' },
          { l: 'StateRAMP / CJIS', s: 'avail' },
        ].map((c) => (
          <div key={c.l} className="flex items-center justify-between text-[11px] text-neutral-700">
            <span className="truncate">{c.l}</span>
            <span className={`text-[8px] font-bold uppercase tracking-widest ${c.s === 'live' ? 'text-[#1a1a2e]' : 'text-neutral-400'}`}>{c.s}</span>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="h-full p-4 flex items-center justify-center">
      <svg viewBox="0 0 320 160" className="w-full h-full" fill="none">
        {[
          [60, 80, 160, 50], [60, 80, 160, 110], [160, 50, 260, 40],
          [160, 50, 260, 90], [160, 110, 260, 130], [160, 110, 260, 90],
        ].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d4d4d8" strokeWidth="1" />
        ))}
        {[
          { x: 60, y: 80, r: 9, fill: '#1a1a2e' },
          { x: 160, y: 50, r: 7, fill: '#404040' },
          { x: 160, y: 110, r: 7, fill: '#404040' },
          { x: 260, y: 40, r: 5, fill: '#737373' },
          { x: 260, y: 90, r: 5, fill: '#737373' },
          { x: 260, y: 130, r: 5, fill: '#737373' },
        ].map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={n.fill} />
        ))}
      </svg>
    </div>
  )
}

// ─── Use cases ─────────────────────────────────────────────────────────────
function UseCases() {
  return (
    <section className="py-16 md:py-20 relative z-10">
      <div className="max-w-6xl mx-auto px-8">
        <div className="max-w-2xl mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">Two ICPs</p>
          <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1a1a2e]">
            Built for teams that can&apos;t afford to forget.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <UseCaseCard
            badge="Government & secure orgs"
            icon={Building2}
            title="Paper-heavy. Admin-turnover-heavy. On-prem-required."
            copy="A trainer dispatches to scan paper. The OCR pipeline produces searchable memory at legal-grade accuracy. The AI runs on your hardware. Zero egress."
            bullets={['Trainer-assisted onboarding', 'StateRAMP + CJIS controls', 'Air-gapped deployment']}
            cta={{ label: 'Government track', href: '/pricing#government' }}
          />
          <UseCaseCard
            badge="SaaS & startups"
            icon={Plug}
            title="Slack + Notion + MS Teams. Hooked up in a day."
            copy="Cloud-native. Your decision graph fills itself from the conversations and docs your team already has."
            bullets={['Slack / Notion / MS Teams', 'From $19 per seat per month', '30-day free trial']}
            cta={{ label: 'See team pricing', href: '/pricing#team' }}
          />
        </div>
      </div>
    </section>
  )
}

function UseCaseCard({ badge, icon: Icon, title, copy, bullets, cta }: {
  badge: string
  icon: typeof Building2
  title: string
  copy: string
  bullets: string[]
  cta: { label: string; href: string }
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-7 hover:border-neutral-300 transition-colors">
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-widest text-neutral-700 bg-neutral-100 mb-5">
        <Icon className="h-3 w-3" /> {badge}
      </div>
      <h3 className="text-[18px] md:text-[20px] font-semibold tracking-tight leading-tight mb-3 text-[#1a1a2e]">{title}</h3>
      <p className="text-[13px] text-neutral-600 leading-relaxed mb-5">{copy}</p>
      <ul className="space-y-2 mb-6">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[13px] text-neutral-700">
            <Check className="h-3.5 w-3.5 text-[#1a1a2e] mt-0.5 shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <Link href={cta.href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1a1a2e] hover:underline">
        {cta.label} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

// ─── Pricing tease ─────────────────────────────────────────────────────────
// ─── Testimonial (colourful #2) ────────────────────────────────────────────
// Single bold pull-quote on a vibrant gradient panel. Breaks the page's
// neutral rhythm right after Use Cases, sets up Pricing.
function Testimonial() {
  return (
    <section className="py-16 md:py-20 relative z-10">
      <div className="max-w-6xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4 }}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 px-8 md:px-16 py-14 md:py-20 shadow-2xl"
        >
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
          <div className="relative max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 mb-5">
              Why we built it
            </p>
            <blockquote className="text-[24px] md:text-[32px] font-semibold tracking-[-0.02em] leading-[1.25] text-white">
              &ldquo;The most expensive thing in any organization is the knowledge that walks out the door on a Friday afternoon. Reattend exists so that no decision, no relationship, no hard-won insight ever has to be re-discovered.&rdquo;
            </blockquote>
            <div className="flex items-center gap-3 mt-7">
              <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-[14px]">
                P
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white">Partha Jyoti Bhuyan</div>
                <div className="text-[11px] text-white/70">Founder, Reattend</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function PricingTease() {
  return (
    <section className="py-16 md:py-20 relative z-10">
      <div className="max-w-6xl mx-auto px-8">
        <div className="max-w-2xl mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">Pricing</p>
          <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1a1a2e]">
            Pick your plan by deployment.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PlanCard name="Team" price="$19" cadence="/seat/month" blurb="Org memory, decisions, agents, Chrome extension. The full memory layer." />
          <PlanCard name="Pro" price="$29" cadence="/seat/month" blurb="Everything in Team plus the meeting recorder bot. Replaces Fireflies / Otter." highlight />
          <PlanCard name="Enterprise" price="Custom" blurb="Dedicated tenant, SAML+SCIM, residency, customer-managed KMS." />
          <PlanCard name="Government" price="Quote" blurb="On-premise, air-gapped, trainer dispatched." />
        </div>
        <div className="mt-8">
          <Link href="/pricing" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1a1a2e] hover:underline">
            See full pricing matrix <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function PlanCard({ name, price, cadence, blurb, highlight }: { name: string; price: string; cadence?: string; blurb: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-5 ${highlight ? 'bg-[#1a1a2e] text-white' : 'bg-white border border-neutral-200 text-[#1a1a2e]'}`}>
      <div className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${highlight ? 'text-neutral-400' : 'text-neutral-500'}`}>{name}</div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-[26px] font-bold tracking-tight">{price}</span>
        {cadence && <span className={`text-[12px] ${highlight ? 'text-neutral-400' : 'text-neutral-500'}`}>{cadence}</span>}
      </div>
      <p className={`text-[12px] leading-relaxed ${highlight ? 'text-neutral-300' : 'text-neutral-600'}`}>{blurb}</p>
    </div>
  )
}

// ─── Closing CTA ───────────────────────────────────────────────────────────
// ─── FAQ ───────────────────────────────────────────────────────────────────
const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'How is this different from a wiki?',
    a: 'Wikis are write-once, decay-fast, and require manual upkeep. Reattend captures memory as you work, links it automatically, and indexes everything by point in time so you can replay what the org knew on any past date.',
  },
  {
    q: 'Can we run it on our own infrastructure?',
    a: 'Yes. The Government and Enterprise plans both support on-premise deployment. The full stack runs inside your network, including the AI inference engine via on-prem Rabbit. Zero data egress to Reattend.',
  },
  {
    q: 'How do you protect customer data?',
    a: 'Two-tier RBAC enforced at the database query layer, eight record-visibility rules, hash-chained WORM audit log, encryption at rest and in transit, customer-managed KMS on Enterprise. We never train AI models on customer content.',
  },
  {
    q: 'How fast can we go live?',
    a: 'Team plan: 30 minutes (Slack + Notion connectors are one-click). Enterprise dedicated: 1 to 2 weeks. Government on-premise with paper digitization: 6 to 12 weeks depending on legacy archive size.',
  },
  {
    q: 'What about hallucinations?',
    a: 'Every answer cites the exact source memory. The Oracle mode shows the passage from the memory that informed each claim. If the memory does not have it, the AI says so explicitly in an Unknowns section.',
  },
  {
    q: 'What if we want to leave?',
    a: 'Self-serve GDPR-grade data export from settings (one-click JSON bundle). For org-level export, contact us and we deliver a full SQL dump within 5 business days.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-neutral-200 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-[15px] font-semibold text-[#1a1a2e] group-hover:text-neutral-700 transition-colors">{q}</span>
        <span className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${open ? 'bg-[#1a1a2e] text-white' : 'bg-neutral-100 text-neutral-500'}`}>
          {open ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </span>
      </button>
      {open && (
        <p className="text-[14px] text-neutral-600 leading-relaxed pb-5 pr-12">{a}</p>
      )}
    </div>
  )
}

function FAQ() {
  return (
    <section className="py-16 md:py-20 relative z-10">
      <div className="max-w-3xl mx-auto px-8">
        <div className="text-center mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">FAQ</p>
          <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1a1a2e]">
            Questions, answered.
          </h2>
        </div>
        <div className="rounded-2xl bg-white border border-neutral-200 px-6">
          {FAQS.map((f) => (
            <FAQItem key={f.q} {...f} />
          ))}
        </div>
        <p className="text-center text-[12px] text-neutral-500 mt-6">
          More on our <Link href="/compliance" className="text-[#1a1a2e] font-semibold hover:underline">compliance page</Link> and at <a href="mailto:pb@reattend.ai" className="text-[#1a1a2e] font-semibold hover:underline">pb@reattend.ai</a>.
        </p>
      </div>
    </section>
  )
}

function ClosingCTA() {
  return (
    <section className="py-20 md:py-24 relative z-10">
      <div className="max-w-3xl mx-auto px-8 text-center">
        <h2 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1a1a2e]">
          Stop losing institutional memory.
        </h2>
        <p className="text-[14px] text-neutral-600 mt-4 max-w-lg mx-auto">
          Try the live sandbox in your browser. Five role personas, full demo data, no signup. See what it feels like.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-7">
          <Link
            href="/sandbox"
            className="inline-flex items-center gap-1.5 px-5 h-10 bg-[#1a1a2e] text-white text-[13px] font-semibold rounded-full hover:bg-[#2d2b55] transition-colors shadow-md shadow-[#1a1a2e]/15"
          >
            Try the sandbox <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="mailto:sales@reattend.com"
            className="inline-flex items-center gap-1.5 px-5 h-10 bg-white text-[#1a1a2e] text-[13px] font-semibold rounded-full border border-neutral-200 hover:border-neutral-300 transition-colors"
          >
            Talk to sales
          </Link>
        </div>
      </div>
    </section>
  )
}
