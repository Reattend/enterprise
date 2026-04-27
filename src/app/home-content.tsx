'use client'

// Reattend Enterprise — landing page.
//
// Dark, premium, Linear-quality. Warm dawn horizon at the top of the
// hero (yellow → pink → fuchsia bloom) bleeds into a near-black body.
// Sand-pouring brain animation on the hero right side. A trust strip
// of customer logos. Three feature panels with their own glyph art.
// A stylized product preview block and a final CTA. Animations are
// minimal and tasteful — fade + 8px slide on whileInView, nothing
// bouncy. Ambient gradient orbs are restrained: one warm horizon,
// one cool aside, no further visual noise.

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowRight, Brain, GraduationCap, ShieldCheck, Lock,
  Sparkles, Network, Gavel, Clock, Users, Zap,
} from 'lucide-react'
import { BrainParticles } from '@/components/landing/brain-particles'
import { TrustStrip } from '@/components/landing/trust-strip'

export default function EnterpriseLanding() {
  return (
    <div className="min-h-screen bg-[#08080c] text-neutral-200 overflow-hidden selection:bg-fuchsia-500/30 selection:text-white antialiased">
      {/* Warm dawn horizon — visible only at the very top, fades quickly. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_60%_at_50%_-20%,rgba(251,191,36,0.18),rgba(244,114,182,0.14)_30%,rgba(168,85,247,0.10)_55%,transparent_75%)]" />
      </div>
      {/* Cool aside accent down the page */}
      <div className="pointer-events-none absolute right-0 top-[50%] -translate-y-1/2 w-[600px] h-[700px] -z-10 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.10),transparent_60%)]" />
      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      <Nav />
      <Hero />
      <TrustStrip />
      <FeatureTriplet />
      <Showcase />
      <FinalCTA />
      <DarkFooter />
    </div>
  )
}

function Nav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#08080c]/70 border-b border-white/[0.05]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icon-128.png" alt="Reattend" width={28} height={28} className="h-7 w-7 rounded-md" unoptimized />
          <div className="leading-tight">
            <div className="text-[14px] font-semibold tracking-tight text-white">Reattend</div>
            <div className="text-[9px] font-semibold text-fuchsia-400/80 uppercase tracking-[0.22em]">Enterprise</div>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-[13px] text-neutral-400">
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/sandbox" className="hover:text-white transition-colors">Sandbox</Link>
          <Link href="/compliance" className="hover:text-white transition-colors">Compliance</Link>
          <Link href="/support" className="hover:text-white transition-colors">Support</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[13px] font-medium text-neutral-300 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/sandbox"
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] font-semibold text-[#0c0816] bg-white hover:bg-neutral-200 transition-colors"
          >
            Try free
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="relative">
      <div className="max-w-6xl mx-auto px-6 pt-24 md:pt-32 pb-24 md:pb-36 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-amber-300/80 mb-6">
            What is Reattend Enterprise?
          </p>
          <h1 className="text-[48px] md:text-[68px] leading-[1.02] font-bold tracking-[-0.035em] text-white">
            Your organization&apos;s
            <br />
            <span className="bg-gradient-to-r from-amber-200 via-fuchsia-300 to-violet-300 bg-clip-text text-transparent">
              memory, preserved.
            </span>
          </h1>
          <p className="text-[17px] md:text-[18px] text-neutral-400 mt-7 max-w-[560px] leading-[1.55]">
            Decisions, context, and institutional knowledge. Captured, linked, and never lost. Even when people leave the room, the team, or the company.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-10">
            <Link
              href="/sandbox"
              className="group inline-flex items-center gap-2 h-12 px-6 rounded-full text-[14px] font-semibold text-[#0c0816] bg-white hover:bg-neutral-100 transition-colors shadow-[0_18px_60px_-18px_rgba(255,255,255,0.4)]"
            >
              Try the sandbox
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full text-[14px] font-semibold text-neutral-200 border border-white/15 hover:border-white/30 hover:bg-white/[0.04] transition-all"
            >
              Sign up free
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-10 text-[12px] text-neutral-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400/80" /> SOC 2 in-flight</span>
            <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-sky-400/80" /> On-premise option</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-fuchsia-400/80" /> No card required</span>
          </div>
        </motion.div>

        {/* Brain particles. Mobile drops the canvas to save battery. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.2 }}
          className="relative h-[460px] md:h-[560px] hidden md:block"
        >
          {/* Soft halo behind the cluster */}
          <div className="absolute inset-x-12 inset-y-12 -z-10 rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.18),rgba(168,85,247,0.10)_40%,transparent_70%)] blur-2xl" />
          <BrainParticles className="absolute inset-0 w-full h-full" />
        </motion.div>
      </div>
    </section>
  )
}

const FEATURES: Array<{
  icon: typeof Brain
  title: string
  desc: string
  glyph: 'graph' | 'wave' | 'shield'
}> = [
  {
    icon: Brain,
    title: 'Organizational Memory',
    desc: 'Every decision, meeting, policy, and exit interview lives in one graph. Time-indexed so you can scrub the org back to any month and see what was active, what was reversed, and who knew what.',
    glyph: 'graph',
  },
  {
    icon: GraduationCap,
    title: 'Exit Interview Agent',
    desc: 'When someone gives notice, the AI reads their memory footprint and writes a structured handoff for their successor. Six weeks of ramp time saved per departure.',
    glyph: 'wave',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by Design',
    desc: 'Two-tier RBAC, hash-chained audit log, GDPR-grade controls. On-prem deployment with the AI running entirely on your hardware. Procurement-grade from day one.',
    glyph: 'shield',
  },
]

function FeatureTriplet() {
  return (
    <section className="relative py-28 md:py-36">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.6 }}
          className="max-w-[680px] mb-16"
        >
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-fuchsia-400/80 mb-4">
            What we do
          </p>
          <h2 className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.06] text-white">
            The memory layer your{' '}
            <span className="bg-gradient-to-r from-amber-200 to-fuchsia-300 bg-clip-text text-transparent">
              org has been missing.
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-[#0a0a10] p-8 group hover:bg-[#0d0d14] transition-colors"
            >
              {/* Glyph art */}
              <div className="relative h-32 mb-6 -mx-2">
                <FeatureGlyph kind={f.glyph} />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <f.icon className="h-4 w-4 text-fuchsia-400/80" strokeWidth={2.25} />
                <h3 className="text-[18px] font-semibold text-white">{f.title}</h3>
              </div>
              <p className="text-[14px] text-neutral-400 leading-[1.6]">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Per-feature glyph art — small SVG dot motifs that echo the brain hero
// without dominating the card. Each one suggests its feature visually:
// graph (network nodes), wave (flowing dots), shield (concentric ring).
function FeatureGlyph({ kind }: { kind: 'graph' | 'wave' | 'shield' }) {
  if (kind === 'graph') {
    return (
      <svg viewBox="0 0 220 110" className="absolute inset-0 w-full h-full text-violet-400/80">
        {/* Edges */}
        <g stroke="currentColor" strokeWidth="0.6" opacity="0.4">
          <line x1="40" y1="30" x2="100" y2="55" />
          <line x1="40" y1="30" x2="80" y2="80" />
          <line x1="100" y1="55" x2="160" y2="35" />
          <line x1="100" y1="55" x2="140" y2="85" />
          <line x1="160" y1="35" x2="200" y2="70" />
          <line x1="80" y1="80" x2="140" y2="85" />
          <line x1="140" y1="85" x2="200" y2="70" />
        </g>
        {/* Nodes */}
        {[
          [40, 30, 4], [100, 55, 5], [160, 35, 4], [80, 80, 3], [140, 85, 5], [200, 70, 4],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="currentColor" opacity="0.85" />
        ))}
        {/* Sand grains scattered */}
        {Array.from({ length: 30 }).map((_, i) => {
          const x = (i * 53) % 220
          const y = ((i * 37) % 110)
          return <circle key={`g${i}`} cx={x} cy={y} r="0.7" fill="currentColor" opacity="0.25" />
        })}
      </svg>
    )
  }
  if (kind === 'wave') {
    return (
      <svg viewBox="0 0 220 110" className="absolute inset-0 w-full h-full text-amber-300/80">
        {/* Three flowing rows of dots */}
        {[28, 55, 82].map((y, row) => (
          <g key={y}>
            {Array.from({ length: 22 }).map((_, i) => {
              const x = i * 10 + 6
              const offset = Math.sin((i + row * 2) * 0.5) * 6
              const r = 1 + (i % 5 === 0 ? 1.5 : 0)
              const opacity = 0.25 + (1 - row * 0.25) * 0.55
              return <circle key={i} cx={x} cy={y + offset} r={r} fill="currentColor" opacity={opacity} />
            })}
          </g>
        ))}
      </svg>
    )
  }
  // shield
  return (
    <svg viewBox="0 0 220 110" className="absolute inset-0 w-full h-full text-emerald-300/80">
      <g fill="currentColor">
        {Array.from({ length: 6 }).map((_, ringIdx) => {
          const radius = 12 + ringIdx * 12
          const dotCount = 8 + ringIdx * 4
          const opacity = 0.7 - ringIdx * 0.1
          return Array.from({ length: dotCount }).map((_, i) => {
            const angle = (i / dotCount) * Math.PI * 2
            const x = 110 + Math.cos(angle) * radius
            const y = 55 + Math.sin(angle) * radius * 0.7
            return <circle key={`${ringIdx}-${i}`} cx={x} cy={y} r={ringIdx === 0 ? 2 : 1} opacity={opacity} />
          })
        })}
      </g>
    </svg>
  )
}

function Showcase() {
  return (
    <section className="relative py-28 md:py-36">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-[640px] mx-auto mb-16"
        >
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-fuchsia-400/80 mb-4">
            The product
          </p>
          <h2 className="text-[36px] md:text-[48px] font-bold tracking-[-0.03em] leading-[1.05] text-white">
            One graph. Every memory. Indexed by time.
          </h2>
          <p className="text-[15px] text-neutral-400 mt-5 leading-[1.6]">
            Decisions surface automatically from meetings. Policies stay current with verification cadences. Every memory links to the people, departments, and questions it answers. Ask anything; cite everything.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute -inset-2 rounded-[28px] bg-gradient-to-br from-violet-500/25 via-fuchsia-500/15 to-amber-300/15 blur-3xl -z-10" />
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c0c14] via-[#09090f] to-[#0c0816] overflow-hidden shadow-[0_40px_140px_-40px_rgba(0,0,0,0.9)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-black/30">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-3 text-[11px] text-neutral-500 font-mono">enterprise.reattend.com / app</span>
            </div>

            <div className="grid grid-cols-12 gap-4 p-6 md:p-8">
              {[
                { icon: Users, label: 'Active members', value: '142' },
                { icon: Brain, label: 'Memories', value: '8,492', sub: '+128 this week' },
                { icon: Gavel, label: 'Decisions', value: '317', sub: '4 reversed YTD' },
                { icon: Clock, label: 'Stale', value: '12', sub: 'past verify' },
              ].map((t) => (
                <div key={t.label} className="col-span-6 md:col-span-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <t.icon className="h-3.5 w-3.5 text-fuchsia-400/80" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">{t.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white tabular-nums">{t.value}</div>
                  {t.sub && <div className="text-[11px] text-neutral-500 mt-1">{t.sub}</div>}
                </div>
              ))}

              <div className="col-span-12 md:col-span-7 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-fuchsia-400/80 mb-3">Ask · Chat</div>
                <div className="text-sm text-neutral-300 leading-[1.6]">
                  <span className="text-neutral-500">You</span> · What did we decide about the BEPS treaty position last quarter, and what depends on it?
                </div>
                <div className="mt-3 pl-3 border-l-2 border-fuchsia-500/40 text-sm text-neutral-300 leading-[1.6]">
                  In Q3 the Director of International Taxation locked the treaty position aligning with OECD pillar two. Three downstream artifacts depend on this decision: the safe-harbor margin worksheet (Jan 25), the transfer-pricing memo to subsidiaries (Feb 9), and the auditor briefing pack (March 11). Reversing now would invalidate all three.
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {['Decision · BEPS treaty position', 'Memo · Safe-harbor margins', 'Briefing · Q3 audit'].map((s) => (
                    <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-400">{s}</span>
                  ))}
                </div>
              </div>

              <div className="col-span-12 md:col-span-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-violet-400/80 mb-3">Memory mix</div>
                <div className="flex items-center gap-5">
                  <DonutMock />
                  <ul className="flex-1 space-y-2 text-[12px]">
                    {[
                      { label: 'Decisions', pct: 32, color: 'bg-violet-500' },
                      { label: 'Meetings',  pct: 28, color: 'bg-blue-500' },
                      { label: 'Insights',  pct: 22, color: 'bg-emerald-500' },
                      { label: 'Notes',     pct: 18, color: 'bg-amber-500' },
                    ].map((s) => (
                      <li key={s.label} className="flex items-center gap-2 text-neutral-400">
                        <span className={`h-2 w-2 rounded-sm ${s.color}`} />
                        <span className="flex-1">{s.label}</span>
                        <span className="font-semibold tabular-nums text-neutral-200">{s.pct}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function DonutMock() {
  const segments = [
    { pct: 32, color: '#a78bfa' },
    { pct: 28, color: '#60a5fa' },
    { pct: 22, color: '#34d399' },
    { pct: 18, color: '#fbbf24' },
  ]
  const r = 36
  const circumference = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width="110" height="110" className="-rotate-90 shrink-0">
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
      {segments.map((s, i) => {
        const length = (s.pct / 100) * circumference
        const dasharray = `${length} ${circumference - length}`
        const dashoffset = -offset
        offset += length
        return (
          <circle
            key={i}
            cx="55"
            cy="55"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="14"
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
          />
        )
      })}
    </svg>
  )
}

function FinalCTA() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.18),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(217,70,239,0.18),transparent_60%)]" />
          <div className="relative border border-white/10 rounded-3xl px-8 py-16 md:px-16 md:py-20 text-center backdrop-blur-sm bg-black/40">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 text-[11px] font-semibold text-neutral-200 mb-7">
              <Zap className="h-3 w-3 text-amber-300" />
              30-day free trial · no credit card
            </div>
            <h2 className="text-[36px] md:text-[56px] font-bold tracking-[-0.03em] leading-[1.05] text-white">
              Give your org a memory.
            </h2>
            <p className="text-[16px] text-neutral-300 mt-5 max-w-[480px] mx-auto leading-[1.6]">
              Try the sandbox in one click, or sign up your team and bring your own memory in.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
              <Link
                href="/sandbox"
                className="inline-flex items-center gap-2 h-12 px-7 rounded-full text-[14px] font-semibold text-[#0c0816] bg-white hover:bg-neutral-100 transition-colors shadow-[0_18px_60px_-18px_rgba(255,255,255,0.4)]"
              >
                Try the sandbox <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 h-12 px-7 rounded-full text-[14px] font-semibold text-white border border-white/20 hover:border-white/40 hover:bg-white/[0.06] transition-all"
              >
                See pricing
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function DarkFooter() {
  return (
    <footer className="border-t border-white/[0.05] bg-black/40">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-[13px]">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2 mb-3">
            <Image src="/icon-128.png" alt="Reattend" width={24} height={24} className="h-6 w-6 rounded-md" unoptimized />
            <span className="text-[14px] font-semibold tracking-tight text-white">Reattend</span>
          </Link>
          <p className="text-[12px] text-neutral-500 leading-[1.6]">Organizational memory, preserved.</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-neutral-500 mb-4">Product</p>
          <ul className="space-y-2.5 text-neutral-400">
            <li><Link href="/sandbox" className="hover:text-white transition-colors">Sandbox</Link></li>
            <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            <li><Link href="/compliance" className="hover:text-white transition-colors">Compliance</Link></li>
            <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-neutral-500 mb-4">Legal</p>
          <ul className="space-y-2.5 text-neutral-400">
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-neutral-500 mb-4">Get in touch</p>
          <ul className="space-y-2.5 text-neutral-400">
            <li><a href="mailto:pb@reattend.ai" className="hover:text-white transition-colors">pb@reattend.ai</a></li>
            <li><a href="mailto:security@reattend.ai" className="hover:text-white transition-colors">security@reattend.ai</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-neutral-500">
          <p>© {new Date().getFullYear()} Reattend Technologies Private Limited. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <Network className="h-3 w-3" />
            <span>Built for organizational memory</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
