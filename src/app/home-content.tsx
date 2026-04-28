'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowRight, Shield, Lock, Building2, GraduationCap,
  Sparkles, Gavel, History, Check, Plug, Server,
} from 'lucide-react'

// Reattend Enterprise landing — Stripe-inspired light theme. Big serif-y
// display headline, refined whitespace, alternating feature rows with a
// product-mock card on the right of each, customer logo wall, stats strip,
// dual use-case cards, pricing teaser, big closing CTA, multi-column footer.
//
// No full-page gradient mesh. Subtle pastel section backgrounds break up
// the page rhythm without competing for attention with the product mocks.

export default function EnterpriseLanding() {
  return (
    <div className="min-h-screen bg-white text-[#1a1a2e] overflow-x-hidden">
      <Nav />
      <Hero />
      <LogoWall />
      <FeatureMemory />
      <FeatureExit />
      <FeatureSecure />
      <Stats />
      <UseCases />
      <PricingTease />
      <ClosingCTA />
      <SiteFooter />
    </div>
  )
}

// ─── Nav ───────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-neutral-200/60">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/icon-128.png" alt="Reattend" width={28} height={28} className="h-7 w-7 rounded-md" unoptimized />
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-tight">Reattend</div>
            <div className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest">Enterprise</div>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-[13px] font-medium text-neutral-600">
          <a href="#product" className="hover:text-[#1a1a2e] transition-colors">Product</a>
          <Link href="/pricing" className="hover:text-[#1a1a2e] transition-colors">Pricing</Link>
          <Link href="/compliance" className="hover:text-[#1a1a2e] transition-colors">Compliance</Link>
          <Link href="/sandbox" className="hover:text-[#1a1a2e] transition-colors">Sandbox</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[13px] font-semibold text-neutral-700 hover:text-[#1a1a2e] transition-colors">
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1a1a2e] text-white text-[13px] font-semibold rounded-full hover:bg-[#2d2b55] transition-colors"
          >
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-16 md:pt-24 pb-24 overflow-hidden">
      {/* Soft pastel wash behind the hero, no animated gradient. */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-50/60 via-white to-white pointer-events-none" />
      <div className="absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-violet-200/30 blur-3xl pointer-events-none" />
      <div className="absolute top-40 left-[-10%] h-[420px] w-[420px] rounded-full bg-amber-200/25 blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100/70 text-violet-700 text-[11px] font-semibold uppercase tracking-widest mb-6">
              <Sparkles className="h-3 w-3" /> Enterprise memory platform
            </div>
            <h1 className="text-[44px] md:text-[64px] font-bold tracking-[-0.035em] leading-[1.05]">
              Your organization&apos;s <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">memory, preserved.</span>
            </h1>
            <p className="text-[18px] text-neutral-600 mt-6 max-w-xl leading-relaxed">
              Decisions, context, and institutional knowledge — captured, linked, and never lost. Even when people leave, transfer, or retire.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-9">
              <Link
                href="/sandbox"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a1a2e] text-white text-[14px] font-semibold rounded-full hover:bg-[#2d2b55] transition-all shadow-md shadow-[#1a1a2e]/15"
              >
                Try the live sandbox <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#1a1a2e] text-[14px] font-semibold rounded-full border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
              >
                See pricing
              </Link>
            </div>
            <div className="flex items-center gap-5 mt-8 text-[12px] text-neutral-500">
              <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-emerald-600" /> SOC 2 in progress</span>
              <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-blue-600" /> On-premise deployment</span>
              <span className="hidden sm:inline-flex items-center gap-1.5"><Server className="h-3.5 w-3.5 text-violet-600" /> Customer-managed KMS</span>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <HeroProductMock />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function HeroProductMock() {
  return (
    <div className="relative">
      {/* Floating background card */}
      <div className="absolute -top-4 -right-3 w-full h-full rounded-3xl bg-violet-200/50 blur-md transform rotate-2" />
      <div className="relative rounded-3xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-300/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-violet-600" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-600">Decision · April 22, 2026</span>
        </div>
        <h3 className="text-[18px] font-semibold leading-snug">Adopt OECD BEPS 2.0 framework for international taxation</h3>
        <p className="text-[13px] text-neutral-600 leading-relaxed">
          Aligning with OECD pillar framework reduces tax arbitrage and secures ~$4B in additional revenue per year. Replaces the 2024 unilateral position.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
            <Check className="h-3 w-3" /> Active
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-semibold border border-violet-200">
            12 dependent decisions
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
            5 policies impacted
          </span>
        </div>
        <div className="border-t border-neutral-100 pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Blast radius</div>
          <div className="flex items-center gap-2 text-[12px] text-neutral-600">
            <div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
              <div className="h-full w-[68%] bg-gradient-to-r from-amber-400 to-rose-500" />
            </div>
            <span className="text-[12px] font-semibold text-rose-600 tabular-nums">68 / Systemic</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Logo wall ──────────────────────────────────────────────────────────────
function LogoWall() {
  const labels = ['Ministry of Finance', 'CBDT', 'Acme Tax', 'Oakridge Capital', 'Helix Bio', 'Northwind Health']
  return (
    <section className="border-y border-neutral-100 bg-neutral-50/40">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-6">
          Built for organizations that can&apos;t afford to forget
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-neutral-500">
          {labels.map((l) => (
            <span key={l} className="text-[14px] font-semibold tracking-tight grayscale opacity-70">{l}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Feature row ───────────────────────────────────────────────────────────
function FeatureMemory() {
  return (
    <FeatureRow
      eyebrow="Time Machine"
      eyebrowColor="text-amber-600"
      title="Decisions never decay."
      copy="Scrub the org through 24 months of state. See what was active when, what got reversed, and what depends on what — every number is a real point-in-time query."
      bullets={[
        'Hash-chained decision log',
        'Blast Radius scoring on every decision',
        'Self-healing on stale + contradicted memory',
      ]}
      visual={
        <ProductCard tone="amber">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 flex items-center gap-1.5 mb-3">
            <History className="h-3 w-3" /> Time Machine
          </div>
          <div className="text-[20px] font-bold tracking-tight mb-3">As of January 2025</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Stat label="Decisions active" value="42" tone="amber" />
            <Stat label="Already reversed" value="7" tone="rose" />
          </div>
          <div className="space-y-1.5 text-[12px] text-neutral-700">
            <RowDot color="bg-amber-500" text="BEPS treaty position adopted" />
            <RowDot color="bg-amber-500" text="Hiring freeze on Level-A roles" />
            <RowDot color="bg-rose-400" text="2024 transfer pricing policy ↺" />
          </div>
        </ProductCard>
      }
      reverse={false}
    />
  )
}

function FeatureExit() {
  return (
    <FeatureRow
      eyebrow="Exit Interview Agent"
      eyebrowColor="text-violet-600"
      title="When people leave, the knowledge stays."
      copy="The AI reads the departing person's memory footprint, asks 10–15 grounded questions, and writes a structured handoff doc. Six weeks of ramp time, gone."
      bullets={[
        'Question generation from authored memory',
        'Tribal knowledge captured before it walks out',
        'Successor briefing as a saved memory record',
      ]}
      visual={
        <ProductCard tone="violet">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-600 flex items-center gap-1.5 mb-3">
            <GraduationCap className="h-3 w-3" /> Handoff doc
          </div>
          <div className="text-[14px] font-semibold mb-2">Rajiv Sharma · Director, International Taxation</div>
          <p className="text-[12px] text-neutral-500 leading-relaxed mb-4">4 years tenure. 47 decisions authored. 6 weeks of context to transfer.</p>
          <div className="space-y-2">
            <HandoffSection title="Active projects" body="3 in flight, BEPS treaty thread is the load-bearing one." />
            <HandoffSection title="Relationships" body="Meera (EU), Priya (CBDT), Arjun (Legal) — meet first." />
            <HandoffSection title="Gotchas" body="BEPS form silently maps blank year to 2020. Always set explicitly." />
          </div>
        </ProductCard>
      }
      reverse
    />
  )
}

function FeatureSecure() {
  return (
    <FeatureRow
      eyebrow="Procurement-grade"
      eyebrowColor="text-blue-600"
      title="Built for the security review."
      copy="Two-tier RBAC with eight record-visibility rules. Hash-chained WORM audit log. GDPR controls live today, SOC 2 in progress, StateRAMP + CJIS prep on request."
      bullets={[
        'Org role + per-department role',
        'Customer-managed KMS · BYO encryption',
        'On-premise deployment with the AI on your hardware',
      ]}
      visual={
        <ProductCard tone="blue">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 flex items-center gap-1.5 mb-3">
            <Shield className="h-3 w-3" /> Compliance posture
          </div>
          <div className="space-y-2.5">
            <Control name="Encryption at rest + in transit" status="live" />
            <Control name="GDPR self-export + erasure" status="live" />
            <Control name="WORM audit log (sha256-chained)" status="live" />
            <Control name="Two-tier RBAC + 8 visibility rules" status="live" />
            <Control name="SOC 2 Type I" status="q1" />
            <Control name="StateRAMP Moderate" status="prep" />
            <Control name="On-premise / air-gapped" status="available" />
          </div>
        </ProductCard>
      }
      reverse={false}
    />
  )
}

interface FeatureRowProps {
  eyebrow: string
  eyebrowColor: string
  title: string
  copy: string
  bullets: string[]
  visual: React.ReactNode
  reverse: boolean
}

function FeatureRow({ eyebrow, eyebrowColor, title, copy, bullets, visual, reverse }: FeatureRowProps) {
  return (
    <section id="product" className="py-20 md:py-28 border-t border-neutral-100">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className={`lg:col-span-6 ${reverse ? 'lg:order-2' : ''}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-widest ${eyebrowColor} mb-4`}>{eyebrow}</p>
          <h2 className="text-[34px] md:text-[44px] font-bold tracking-[-0.025em] leading-[1.1]">{title}</h2>
          <p className="text-[16px] text-neutral-600 mt-5 leading-relaxed max-w-lg">{copy}</p>
          <ul className="mt-6 space-y-2.5">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-[14px] text-neutral-700">
                <Check className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={`lg:col-span-6 ${reverse ? 'lg:order-1' : ''}`}>
          {visual}
        </div>
      </div>
    </section>
  )
}

// ─── Reusable mock visuals ─────────────────────────────────────────────────
function ProductCard({ children, tone }: { children: React.ReactNode; tone: 'amber' | 'violet' | 'blue' }) {
  const bg = {
    amber: 'bg-gradient-to-br from-amber-100/50 to-orange-100/30',
    violet: 'bg-gradient-to-br from-violet-100/50 to-fuchsia-100/30',
    blue: 'bg-gradient-to-br from-blue-100/50 to-sky-100/30',
  }[tone]
  return (
    <div className={`relative p-6 rounded-3xl ${bg}`}>
      <div className="rounded-2xl bg-white border border-neutral-200/70 p-5 shadow-xl shadow-neutral-300/30">
        {children}
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'rose' }) {
  const c = { amber: 'text-amber-700', rose: 'text-rose-600' }[tone]
  return (
    <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-3">
      <div className={`text-[22px] font-bold tabular-nums ${c}`}>{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mt-0.5">{label}</div>
    </div>
  )
}

function RowDot({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      <span className="truncate">{text}</span>
    </div>
  )
}

function HandoffSection({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-50/50 p-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-600 mb-1">{title}</div>
      <div className="text-[12px] text-neutral-700 leading-snug">{body}</div>
    </div>
  )
}

function Control({ name, status }: { name: string; status: 'live' | 'q1' | 'prep' | 'available' }) {
  const meta = {
    live:      { label: 'Live',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    q1:        { label: 'Q1',          cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    prep:      { label: 'In prep',     cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    available: { label: 'Available',   cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  }[status]
  return (
    <div className="flex items-center justify-between gap-3 text-[13px] text-neutral-700">
      <span className="truncate">{name}</span>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.cls} shrink-0`}>{meta.label}</span>
    </div>
  )
}

// ─── Stats strip ───────────────────────────────────────────────────────────
function Stats() {
  const items = [
    { value: '8', label: 'Record-visibility rules', icon: Shield },
    { value: '24mo', label: 'Point-in-time history', icon: History },
    { value: '<2s', label: 'Median answer latency', icon: Sparkles },
    { value: '36', label: 'RBAC test assertions', icon: Lock },
  ]
  return (
    <section className="py-16 border-t border-neutral-100 bg-gradient-to-b from-white to-neutral-50/40">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((it) => (
          <div key={it.label} className="text-center">
            <it.icon className="h-5 w-5 text-violet-600 mx-auto mb-2" />
            <div className="text-[36px] md:text-[44px] font-bold tracking-tight tabular-nums">{it.value}</div>
            <div className="text-[12px] text-neutral-500 mt-1">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Use cases ─────────────────────────────────────────────────────────────
function UseCases() {
  return (
    <section className="py-24 border-t border-neutral-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">Two ICPs, one product</p>
          <h2 className="text-[34px] md:text-[44px] font-bold tracking-[-0.025em] leading-[1.1]">Built for the orgs Glean misses.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UseCaseCard
            tone="violet"
            badge="Government & secure orgs"
            icon={Building2}
            title="Paper-heavy. Admin-turnover-heavy. On-prem-required."
            copy="A trainer dispatches to scan paper. OCR pipeline produces searchable memory at legal-grade accuracy. The LLM runs on your hardware. Zero egress."
            bullets={['Trainer-assisted onboarding', 'StateRAMP + CJIS controls', 'Air-gapped deployment']}
            cta={{ label: 'Government track', href: '/pricing#government' }}
          />
          <UseCaseCard
            tone="emerald"
            badge="SaaS & startups"
            icon={Plug}
            title="Slack + Notion + MS Teams. Hooked up in a day."
            copy="Cloud-native, Nango-connected. Your decision graph fills itself from the conversations and docs your team already has."
            bullets={['Slack / Notion / MS Teams', '$25 per seat per month', '30-day free trial']}
            cta={{ label: 'See team pricing', href: '/pricing#team' }}
          />
        </div>
      </div>
    </section>
  )
}

interface UseCaseCardProps {
  tone: 'violet' | 'emerald'
  badge: string
  icon: typeof Building2
  title: string
  copy: string
  bullets: string[]
  cta: { label: string; href: string }
}

function UseCaseCard({ tone, badge, icon: Icon, title, copy, bullets, cta }: UseCaseCardProps) {
  const ring = tone === 'violet' ? 'ring-violet-500/20 bg-violet-50/30' : 'ring-emerald-500/20 bg-emerald-50/30'
  const accent = tone === 'violet' ? 'text-violet-700 bg-violet-100/70' : 'text-emerald-700 bg-emerald-100/70'
  return (
    <div className={`rounded-3xl ring-1 ${ring} p-8 hover:shadow-xl hover:shadow-neutral-200/50 transition-shadow`}>
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest ${accent} mb-5`}>
        <Icon className="h-3 w-3" /> {badge}
      </div>
      <h3 className="text-[22px] md:text-[26px] font-bold tracking-tight leading-tight mb-3">{title}</h3>
      <p className="text-[14px] text-neutral-600 leading-relaxed mb-5">{copy}</p>
      <ul className="space-y-2 mb-6">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[13px] text-neutral-700">
            <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
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
    <section className="py-24 border-t border-neutral-100 bg-neutral-50/40">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-3">Pricing</p>
          <h2 className="text-[34px] md:text-[44px] font-bold tracking-[-0.025em] leading-[1.1]">Pick your plan by deployment.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <PlanCard name="Team" price="$25" cadence="/seat/month" blurb="For startups and SMBs up to 200 people." />
          <PlanCard name="Enterprise" price="Custom" blurb="Dedicated tenant, SAML+SCIM, residency." highlight />
          <PlanCard name="Government" price="Quote" blurb="On-premise, air-gapped, trainer dispatched." />
        </div>
        <div className="text-center mt-8">
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
    <div className={`rounded-2xl p-6 ${highlight ? 'bg-[#1a1a2e] text-white border border-[#1a1a2e]' : 'bg-white border border-neutral-200'}`}>
      <div className="text-[11px] font-semibold uppercase tracking-widest opacity-70 mb-2">{name}</div>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-[32px] font-bold tracking-tight">{price}</span>
        {cadence && <span className={`text-[12px] ${highlight ? 'text-neutral-400' : 'text-neutral-500'}`}>{cadence}</span>}
      </div>
      <p className={`text-[13px] leading-relaxed ${highlight ? 'text-neutral-300' : 'text-neutral-600'}`}>{blurb}</p>
    </div>
  )
}

// ─── Closing CTA ───────────────────────────────────────────────────────────
function ClosingCTA() {
  return (
    <section className="py-24 border-t border-neutral-100">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.05]">
          Stop losing institutional <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">memory.</span>
        </h2>
        <p className="text-[16px] text-neutral-600 mt-5 max-w-xl mx-auto">
          Try the live sandbox in your browser. Five role personas, full demo data, no signup. See what it feels like.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-9">
          <Link
            href="/sandbox"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#1a1a2e] text-white text-[14px] font-semibold rounded-full hover:bg-[#2d2b55] transition-all shadow-md shadow-[#1a1a2e]/15"
          >
            Try the sandbox <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="mailto:sales@reattend.com"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#1a1a2e] text-[14px] font-semibold rounded-full border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
          >
            Talk to sales
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Footer (multi-column, Stripe-y) ───────────────────────────────────────
function SiteFooter() {
  const cols: Array<{ heading: string; links: Array<{ label: string; href: string; external?: boolean }> }> = [
    {
      heading: 'Product',
      links: [
        { label: 'Sandbox', href: '/sandbox' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Compliance', href: '/compliance' },
        { label: 'Sign in', href: '/login' },
      ],
    },
    {
      heading: 'Capabilities',
      links: [
        { label: 'Memory cockpit', href: '/sandbox' },
        { label: 'Time Machine', href: '/sandbox' },
        { label: 'Exit Interview Agent', href: '/sandbox' },
        { label: 'Onboarding Genie', href: '/sandbox' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms & Conditions', href: '/terms' },
        { label: 'Support', href: '/support' },
        { label: 'Contact', href: 'mailto:pb@reattend.ai', external: true },
      ],
    },
  ]
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/icon-128.png" alt="Reattend" width={28} height={28} className="h-7 w-7 rounded-md" unoptimized />
            <div className="leading-tight">
              <div className="text-[15px] font-bold tracking-tight">Reattend</div>
              <div className="text-[9px] font-semibold text-neutral-400 uppercase tracking-widest">Enterprise</div>
            </div>
          </Link>
          <p className="text-[13px] text-neutral-500 mt-4 max-w-xs leading-relaxed">
            Organizational memory for teams that can&apos;t afford to forget. Built by Reattend Technologies Private Limited.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.heading}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-4">{c.heading}</p>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.href} className="text-[13px] text-neutral-600 hover:text-[#1a1a2e] transition-colors">{l.label}</a>
                  ) : (
                    <Link href={l.href} className="text-[13px] text-neutral-600 hover:text-[#1a1a2e] transition-colors">{l.label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-neutral-500">
          <p>&copy; {new Date().getFullYear()} Reattend Technologies Private Limited.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-[#1a1a2e] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#1a1a2e] transition-colors">Terms</Link>
            <Link href="/compliance" className="hover:text-[#1a1a2e] transition-colors">Compliance</Link>
            <Link href="/support" className="hover:text-[#1a1a2e] transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
