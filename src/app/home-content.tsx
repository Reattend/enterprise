'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, Shield, Building2, GraduationCap, History, Check,
  Plug, Network,
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
      <CapabilityGrid />
      <UseCases />
      <PricingTease />
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
            bullets={['Slack / Notion / MS Teams', '$25 per seat per month', '30-day free trial']}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlanCard name="Team" price="$25" cadence="/seat/month" blurb="For startups and SMBs up to 200 people." />
          <PlanCard name="Enterprise" price="Custom" blurb="Dedicated tenant, SAML+SCIM, residency." highlight />
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
