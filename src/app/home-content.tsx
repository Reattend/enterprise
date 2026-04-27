'use client'

// Reattend Enterprise — landing page.
//
// Dark theme with violet→fuchsia gradient accents, a brain-particle hero
// animation, a trust strip, a feature triplet, and a visual dashboard
// preview. All animations gate on `whileInView` so the page is light on
// first paint and adds richness as the user scrolls. Mobile drops the
// brain animation in favor of a static hero so we don't burn the
// battery on phones.

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowRight, Brain, GraduationCap, ShieldCheck, Sparkles, Network,
  Gavel, Clock, Users, Zap, Lock,
} from 'lucide-react'
import { BrainParticles } from '@/components/landing/brain-particles'
import { TrustStrip } from '@/components/landing/trust-strip'

export default function EnterpriseLanding() {
  return (
    <div className="min-h-screen bg-[#06060c] text-neutral-200 overflow-hidden selection:bg-fuchsia-500/30 selection:text-white">
      {/* Ambient gradient orbs — fixed so they parallax behind the page. */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-fuchsia-600/20 blur-[140px]" />
        <div className="absolute top-[20%] -right-32 w-[700px] h-[700px] rounded-full bg-violet-700/20 blur-[160px]" />
        <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full bg-indigo-700/15 blur-[140px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

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
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#06060c]/70 border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icon-128.png" alt="Reattend" width={28} height={28} className="h-7 w-7 rounded-md" unoptimized />
          <div>
            <span className="text-[15px] font-bold tracking-tight text-white">Reattend</span>
            <span className="text-[9px] font-semibold text-fuchsia-400 ml-1.5 uppercase tracking-[0.2em]">Enterprise</span>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-7 text-[13px] font-medium text-neutral-400">
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/sandbox" className="hover:text-white transition-colors">Sandbox</Link>
          <Link href="/compliance" className="hover:text-white transition-colors">Compliance</Link>
          <Link href="/support" className="hover:text-white transition-colors">Support</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[13px] font-semibold text-neutral-300 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/sandbox"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-[0_8px_30px_-12px_rgba(217,70,239,0.6)]"
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
      <div className="max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-20 md:pb-32 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[11px] font-medium text-neutral-300 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
            New · Sandbox is live, no signup required
          </div>
          <h1 className="text-[44px] md:text-[64px] font-bold leading-[1.02] tracking-[-0.035em] text-white">
            Your organization&apos;s
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              memory, preserved.
            </span>
          </h1>
          <p className="text-[17px] md:text-[18px] text-neutral-400 mt-7 max-w-lg leading-relaxed">
            Decisions, context, and institutional knowledge. Captured, linked, and never lost. Even when people leave the room, the team, or the company.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-9">
            <Link
              href="/sandbox"
              className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all shadow-[0_12px_40px_-12px_rgba(217,70,239,0.65)]"
            >
              Try the sandbox
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-[14px] font-semibold text-neutral-200 border border-white/15 hover:border-white/30 hover:bg-white/[0.04] transition-all"
            >
              Sign up free
            </Link>
          </div>
          <div className="flex items-center gap-6 mt-10 text-[12px] text-neutral-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> SOC 2 in-flight</span>
            <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-sky-400" /> On-premise option</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-fuchsia-400" /> No card required</span>
          </div>
        </motion.div>

        {/* Brain particles — desktop only. On mobile we drop the animation
            for battery and replace with a quieter gradient orb. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="relative h-[440px] md:h-[520px] hidden md:block"
        >
          <div className="absolute inset-0">
            <BrainParticles className="w-full h-full" />
          </div>
          {/* Soft halo behind the brain so the dots glow on the gradient bg */}
          <div className="absolute inset-x-10 inset-y-10 -z-10 rounded-full bg-gradient-to-br from-fuchsia-500/20 via-violet-500/10 to-transparent blur-3xl" />
        </motion.div>
      </div>
    </section>
  )
}

const FEATURES: Array<{
  icon: typeof Brain
  title: string
  desc: string
  accent: string
  iconBg: string
}> = [
  {
    icon: Brain,
    title: 'Organizational Memory',
    desc: 'Every decision, meeting, policy, and exit interview lives in one graph. Time-indexed so you can scrub the org back to any month and see what was active, what was reversed, and who knew what.',
    accent: 'from-violet-500/20 to-fuchsia-500/5',
    iconBg: 'bg-gradient-to-br from-violet-500 to-fuchsia-500',
  },
  {
    icon: GraduationCap,
    title: 'Exit Interview Agent',
    desc: 'When someone gives notice, the AI reads their memory footprint and writes a structured handoff for their successor. Six weeks of ramp time saved per departure.',
    accent: 'from-amber-500/20 to-orange-500/5',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by Design',
    desc: 'Two-tier RBAC, hash-chained audit log, GDPR-grade controls. On-prem deployment with the AI running entirely on your hardware. Procurement-grade from day one.',
    accent: 'from-emerald-500/20 to-cyan-500/5',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-cyan-600',
  },
]

function FeatureTriplet() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-16"
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-fuchsia-400 mb-4">What we do</p>
          <h2 className="text-[36px] md:text-[48px] font-bold tracking-[-0.03em] leading-[1.05] text-white">
            The memory layer your <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">org has been missing.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="relative group"
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10`} />
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-7 h-full hover:border-white/20 hover:bg-white/[0.04] transition-all">
                <div className={`h-11 w-11 rounded-xl ${f.iconBg} flex items-center justify-center mb-5 shadow-md`}>
                  <f.icon className="h-5 w-5 text-white" strokeWidth={2.25} />
                </div>
                <h3 className="text-[18px] font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-[14px] text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Showcase() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-fuchsia-400 mb-4">The product</p>
          <h2 className="text-[34px] md:text-[44px] font-bold tracking-[-0.03em] leading-[1.05] text-white">
            One graph. Every memory. Indexed by time.
          </h2>
          <p className="text-[15px] text-neutral-400 mt-5 leading-relaxed">
            Decisions surface automatically from meetings. Policies stay current with verification cadences. Memories link to people, departments, and the questions they answer. Ask anything; cite everything.
          </p>
        </motion.div>

        {/* Stylized dashboard preview — pure markup, no screenshot.
            Acts as a glanceable promise of the actual product surface. */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-pink-500/20 blur-2xl -z-10" />
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0c0c18] via-[#0a0a14] to-[#0c0816] overflow-hidden shadow-[0_30px_120px_-30px_rgba(0,0,0,0.8)]">
            {/* Faux titlebar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-black/20">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
              <span className="ml-3 text-[11px] text-neutral-500 font-mono">enterprise.reattend.com / app</span>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-12 gap-4 p-6 md:p-8">
              {/* Stat tiles */}
              {[
                { icon: Users,   label: 'Active members', value: '142' },
                { icon: Brain,   label: 'Memories',       value: '8,492', sub: '+128 this week' },
                { icon: Gavel,   label: 'Decisions',      value: '317',   sub: '4 reversed YTD' },
                { icon: Clock,   label: 'Stale',          value: '12',    sub: 'past verify' },
              ].map((t) => (
                <div key={t.label} className="col-span-6 md:col-span-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <t.icon className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-500">{t.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white tabular-nums">{t.value}</div>
                  {t.sub && <div className="text-[11px] text-neutral-500 mt-1">{t.sub}</div>}
                </div>
              ))}

              {/* Chat-style answer */}
              <div className="col-span-12 md:col-span-7 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-fuchsia-400 mb-3">Ask · Chat</div>
                <div className="text-sm text-neutral-300 leading-relaxed">
                  <span className="text-neutral-500">You</span> · What did we decide about the BEPS treaty position last quarter, and what depends on it?
                </div>
                <div className="mt-3 pl-3 border-l-2 border-fuchsia-500/40 text-sm text-neutral-300 leading-relaxed">
                  In Q3 the Director of International Taxation locked the treaty position aligning with OECD pillar two. Three downstream artifacts depend on this decision: the safe-harbor margin worksheet (Jan 25), the transfer-pricing memo to subsidiaries (Feb 9), and the auditor briefing pack (March 11). Reversing now would invalidate all three.
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {['Decision · BEPS treaty position', 'Memo · Safe-harbor margins', 'Briefing · Q3 audit'].map((s) => (
                    <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-400">{s}</span>
                  ))}
                </div>
              </div>

              {/* Memory mix donut placeholder */}
              <div className="col-span-12 md:col-span-5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-violet-400 mb-3">Memory mix</div>
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
  // Minimal SVG donut so the showcase reads as a real chart, no chart-lib
  // dependency just for the marketing page.
  const segments = [
    { pct: 32, color: '#8b5cf6' }, // violet
    { pct: 28, color: '#3b82f6' }, // blue
    { pct: 22, color: '#10b981' }, // emerald
    { pct: 18, color: '#f59e0b' }, // amber
  ]
  const total = 100
  const r = 36
  const circumference = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width="110" height="110" className="-rotate-90 shrink-0">
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
      {segments.map((s, i) => {
        const length = (s.pct / total) * circumference
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
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-fuchsia-600/30 to-pink-500/20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,70,239,0.4),transparent_60%)]" />
          <div className="relative border border-white/10 rounded-3xl px-8 py-16 md:px-16 md:py-20 text-center backdrop-blur-sm bg-black/40">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 text-[11px] font-semibold text-neutral-200 mb-6">
              <Zap className="h-3 w-3 text-fuchsia-300" />
              30-day free trial · no credit card
            </div>
            <h2 className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.05] text-white">
              Give your org a memory.
            </h2>
            <p className="text-[16px] text-neutral-300 mt-5 max-w-xl mx-auto leading-relaxed">
              Try the sandbox in one click, or sign up your team and bring your own memory in.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
              <Link
                href="/sandbox"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-semibold text-[#0c0816] bg-white hover:bg-neutral-100 transition-colors shadow-[0_12px_40px_-12px_rgba(255,255,255,0.4)]"
              >
                Try the sandbox <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-semibold text-white border border-white/20 hover:border-white/40 hover:bg-white/[0.06] transition-all"
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
    <footer className="border-t border-white/[0.06] bg-black/40">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-[13px]">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2 mb-3">
            <Image src="/icon-128.png" alt="Reattend" width={24} height={24} className="h-6 w-6 rounded-md" unoptimized />
            <span className="text-[14px] font-bold tracking-tight text-white">Reattend</span>
          </Link>
          <p className="text-[12px] text-neutral-500 leading-relaxed">Organizational memory, preserved.</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 mb-3">Product</p>
          <ul className="space-y-2 text-neutral-400">
            <li><Link href="/sandbox" className="hover:text-white transition-colors">Sandbox</Link></li>
            <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            <li><Link href="/compliance" className="hover:text-white transition-colors">Compliance</Link></li>
            <li><Link href="/support" className="hover:text-white transition-colors">Support</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 mb-3">Legal</p>
          <ul className="space-y-2 text-neutral-400">
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 mb-3">Get in touch</p>
          <ul className="space-y-2 text-neutral-400">
            <li><a href="mailto:pb@reattend.ai" className="hover:text-white transition-colors">pb@reattend.ai</a></li>
            <li><a href="mailto:security@reattend.ai" className="hover:text-white transition-colors">security@reattend.ai</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.06]">
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
