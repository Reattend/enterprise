'use client'

// Reattend Enterprise — landing page (Stripe design language).
//
// Hero: animated gradient mesh, white display type overlay, two CTAs.
// Trust strip: colored client logos on white.
// Feature triplet: light tinted cards on white background.
// Showcase: a tinted "studio" section with a stylized product preview.
// Final CTA: a second gradient mesh panel with white headline.
// Footer: soft slate, simple four-column.

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowRight, Brain, GraduationCap, ShieldCheck, Sparkles,
  Users, Gavel, Clock, Zap, Network,
} from 'lucide-react'
import { GradientMesh } from '@/components/landing/gradient-mesh'
import { TrustStrip } from '@/components/landing/trust-strip'

export default function EnterpriseLanding() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-fuchsia-500/30 selection:text-white antialiased">
      <Hero />
      <TrustStrip />
      <FeatureTriplet />
      <Showcase />
      <FinalCTA />
      <Footer />
    </div>
  )
}

function Nav({ tone }: { tone: 'on-mesh' | 'on-light' }) {
  // The nav lives inside its parent section so it inherits its color
  // backdrop. Two tones: on the gradient mesh (white text), on light
  // sections (slate text). Used by Hero and FinalCTA.
  const linkClass = tone === 'on-mesh'
    ? 'text-white/80 hover:text-white'
    : 'text-slate-600 hover:text-slate-900'
  const ctaClass = tone === 'on-mesh'
    ? 'bg-white text-slate-900 hover:bg-slate-100'
    : 'bg-slate-900 text-white hover:bg-slate-800'
  return (
    <nav className="relative z-20">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icon-128.png" alt="Reattend" width={32} height={32} className="h-8 w-8 rounded-lg" unoptimized />
          <div className="leading-tight">
            <div className={`text-[15px] font-semibold tracking-tight ${tone === 'on-mesh' ? 'text-white' : 'text-slate-900'}`}>Reattend</div>
            <div className={`text-[9px] font-semibold uppercase tracking-[0.22em] ${tone === 'on-mesh' ? 'text-white/60' : 'text-slate-400'}`}>Enterprise</div>
          </div>
        </Link>
        <div className={`hidden md:flex items-center gap-8 text-[14px] ${linkClass}`}>
          <Link href="/pricing" className="transition-colors">Pricing</Link>
          <Link href="/sandbox" className="transition-colors">Sandbox</Link>
          <Link href="/compliance" className="transition-colors">Compliance</Link>
          <Link href="/support" className="transition-colors">Support</Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className={`text-[14px] font-medium transition-colors ${linkClass}`}>
            Sign in
          </Link>
          <Link
            href="/sandbox"
            className={`inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] font-semibold transition-colors ${ctaClass}`}
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden text-white">
      <GradientMesh />
      {/* Soft top-edge darkening so the nav contrasts no matter where the
          blobs happen to be when the page loads */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/30 to-transparent z-10 pointer-events-none" />

      <div className="relative z-10">
        <Nav tone="on-mesh" />

        <div className="max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-28 md:pb-40 text-center">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[12px] font-medium tracking-[0.18em] uppercase text-white/60 mb-7">
              Reattend Enterprise
            </p>
            <h1 className="text-[52px] md:text-[88px] leading-[0.98] font-semibold tracking-[-0.035em] text-white max-w-4xl mx-auto">
              Your organization&apos;s memory,{' '}
              <span className="italic font-medium text-white/80">preserved.</span>
            </h1>
            <p className="text-[17px] md:text-[20px] text-white/75 mt-8 max-w-2xl mx-auto leading-[1.55]">
              Decisions, context, and institutional knowledge. Captured, linked, and never lost — even when people leave the room, the team, or the company.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-12">
              <Link
                href="/sandbox"
                className="group inline-flex items-center gap-2 h-12 px-6 rounded-full text-[14px] font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-[0_18px_60px_-18px_rgba(255,255,255,0.4)]"
              >
                Try the sandbox
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full text-[14px] font-semibold text-white border border-white/30 hover:border-white/60 hover:bg-white/[0.06] transition-all"
              >
                See pricing
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 mt-10 text-[12px] text-white/60">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> SOC 2 in-flight</span>
              <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-amber-200" /> 30-day free trial</span>
              <span className="flex items-center gap-1.5"><Network className="h-3.5 w-3.5 text-pink-200" /> On-premise option</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

const FEATURES: Array<{
  icon: typeof Brain
  title: string
  desc: string
  tint: string
  iconBg: string
}> = [
  {
    icon: Brain,
    title: 'Organizational Memory',
    desc: 'Every decision, meeting, policy, and exit interview lives in one graph. Time-indexed so you can scrub the org back to any month and see what was active, what was reversed, and who knew what.',
    tint: 'from-violet-100 to-fuchsia-50',
    iconBg: 'bg-gradient-to-br from-violet-500 to-fuchsia-500',
  },
  {
    icon: GraduationCap,
    title: 'Exit Interview Agent',
    desc: 'When someone gives notice, the AI reads their memory footprint and writes a structured handoff for their successor. Six weeks of ramp time saved per departure.',
    tint: 'from-amber-100 to-orange-50',
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by Design',
    desc: 'Two-tier RBAC, hash-chained audit log, GDPR-grade controls. On-premise deployment with the AI running entirely on your hardware. Procurement-grade from day one.',
    tint: 'from-emerald-100 to-cyan-50',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-cyan-600',
  },
]

function FeatureTriplet() {
  return (
    <section className="relative bg-white py-28 md:py-36">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.6 }}
          className="max-w-[680px] mb-16"
        >
          <p className="text-[12px] font-medium tracking-[0.18em] uppercase text-slate-500 mb-5">
            Built for organizational continuity
          </p>
          <h2 className="text-[36px] md:text-[52px] font-semibold tracking-[-0.03em] leading-[1.06] text-slate-900">
            The memory layer your <span className="italic text-slate-600">org has been missing.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={`relative rounded-2xl bg-gradient-to-br ${f.tint} border border-slate-200/80 p-7 hover:shadow-[0_30px_80px_-30px_rgba(15,23,42,0.18)] transition-shadow`}
            >
              <div className={`h-11 w-11 rounded-xl ${f.iconBg} flex items-center justify-center mb-5 shadow-md`}>
                <f.icon className="h-5 w-5 text-white" strokeWidth={2.25} />
              </div>
              <h3 className="text-[18px] font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-[14px] text-slate-600 leading-[1.6]">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Showcase() {
  return (
    <section className="relative bg-gradient-to-b from-rose-50 via-fuchsia-50/40 to-white py-28 md:py-36 overflow-hidden">
      {/* Soft tinted backdrop ovals */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-pink-200/40 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-violet-200/30 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-[680px] mx-auto mb-16"
        >
          <p className="text-[12px] font-medium tracking-[0.18em] uppercase text-fuchsia-600 mb-5">
            The product
          </p>
          <h2 className="text-[36px] md:text-[52px] font-semibold tracking-[-0.03em] leading-[1.05] text-slate-900">
            One graph. Every memory. Indexed by time.
          </h2>
          <p className="text-[16px] text-slate-600 mt-6 leading-[1.6]">
            Decisions surface from meetings. Policies stay current with verification cadences. Every memory links to the people, departments, and questions it answers. Ask anything; cite everything.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Halo behind the frame */}
          <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-br from-fuchsia-300/40 via-violet-300/30 to-pink-200/30 blur-2xl -z-10" />

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_40px_120px_-30px_rgba(15,23,42,0.25)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 bg-slate-50">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 text-[11px] text-slate-500 font-mono">enterprise.reattend.com / app</span>
            </div>

            <div className="grid grid-cols-12 gap-4 p-6 md:p-8 bg-slate-50/40">
              {[
                { icon: Users, label: 'Active members', value: '142' },
                { icon: Brain, label: 'Memories', value: '8,492', sub: '+128 this week' },
                { icon: Gavel, label: 'Decisions', value: '317', sub: '4 reversed YTD' },
                { icon: Clock, label: 'Stale', value: '12', sub: 'past verify' },
              ].map((t) => (
                <div key={t.label} className="col-span-6 md:col-span-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <t.icon className="h-3.5 w-3.5 text-fuchsia-600" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">{t.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 tabular-nums">{t.value}</div>
                  {t.sub && <div className="text-[11px] text-slate-500 mt-1">{t.sub}</div>}
                </div>
              ))}

              <div className="col-span-12 md:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-fuchsia-600 mb-3">Ask · Chat</div>
                <div className="text-sm text-slate-700 leading-[1.6]">
                  <span className="text-slate-400">You</span> · What did we decide about the BEPS treaty position last quarter, and what depends on it?
                </div>
                <div className="mt-3 pl-3 border-l-2 border-fuchsia-400 text-sm text-slate-700 leading-[1.6]">
                  In Q3 the Director of International Taxation locked the treaty position aligning with OECD pillar two. Three downstream artifacts depend on this decision: the safe-harbor margin worksheet (Jan 25), the transfer-pricing memo to subsidiaries (Feb 9), and the auditor briefing pack (March 11). Reversing now would invalidate all three.
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {['Decision · BEPS treaty position', 'Memo · Safe-harbor margins', 'Briefing · Q3 audit'].map((s) => (
                    <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600">{s}</span>
                  ))}
                </div>
              </div>

              <div className="col-span-12 md:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-violet-600 mb-3">Memory mix</div>
                <div className="flex items-center gap-5">
                  <DonutMock />
                  <ul className="flex-1 space-y-2 text-[12px]">
                    {[
                      { label: 'Decisions', pct: 32, color: 'bg-violet-500' },
                      { label: 'Meetings',  pct: 28, color: 'bg-blue-500' },
                      { label: 'Insights',  pct: 22, color: 'bg-emerald-500' },
                      { label: 'Notes',     pct: 18, color: 'bg-amber-500' },
                    ].map((s) => (
                      <li key={s.label} className="flex items-center gap-2 text-slate-600">
                        <span className={`h-2 w-2 rounded-sm ${s.color}`} />
                        <span className="flex-1">{s.label}</span>
                        <span className="font-semibold tabular-nums text-slate-900">{s.pct}%</span>
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
    { pct: 32, color: '#8b5cf6' },
    { pct: 28, color: '#3b82f6' },
    { pct: 22, color: '#10b981' },
    { pct: 18, color: '#f59e0b' },
  ]
  const r = 36
  const circumference = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width="110" height="110" className="-rotate-90 shrink-0">
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="14" />
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
    <section className="relative isolate overflow-hidden text-white py-28 md:py-36">
      <GradientMesh />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/15 to-transparent z-10 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold text-white mb-7">
            <Zap className="h-3 w-3 text-amber-300" />
            30-day free trial · no credit card
          </div>
          <h2 className="text-[44px] md:text-[64px] font-semibold tracking-[-0.03em] leading-[1.05]">
            Give your org a memory.
          </h2>
          <p className="text-[17px] text-white/80 mt-6 max-w-[520px] mx-auto leading-[1.6]">
            Try the sandbox in one click, or sign up your team and bring your own memory in.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
            <Link
              href="/sandbox"
              className="inline-flex items-center gap-2 h-12 px-7 rounded-full text-[14px] font-semibold text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-[0_18px_60px_-18px_rgba(255,255,255,0.5)]"
            >
              Try the sandbox <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 h-12 px-7 rounded-full text-[14px] font-semibold text-white border border-white/30 hover:border-white/60 hover:bg-white/[0.06] transition-all"
            >
              See pricing
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-[14px]">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2 mb-3">
            <Image src="/icon-128.png" alt="Reattend" width={28} height={28} className="h-7 w-7 rounded-lg" unoptimized />
            <span className="text-[15px] font-semibold tracking-tight text-slate-900">Reattend</span>
          </Link>
          <p className="text-[13px] text-slate-500 leading-[1.6] max-w-[260px]">Organizational memory, preserved.</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500 mb-4">Product</p>
          <ul className="space-y-2.5 text-slate-700">
            <li><Link href="/sandbox" className="hover:text-slate-900 transition-colors">Sandbox</Link></li>
            <li><Link href="/pricing" className="hover:text-slate-900 transition-colors">Pricing</Link></li>
            <li><Link href="/compliance" className="hover:text-slate-900 transition-colors">Compliance</Link></li>
            <li><Link href="/support" className="hover:text-slate-900 transition-colors">Support</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500 mb-4">Legal</p>
          <ul className="space-y-2.5 text-slate-700">
            <li><Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-slate-500 mb-4">Get in touch</p>
          <ul className="space-y-2.5 text-slate-700">
            <li><a href="mailto:pb@reattend.ai" className="hover:text-slate-900 transition-colors">pb@reattend.ai</a></li>
            <li><a href="mailto:security@reattend.ai" className="hover:text-slate-900 transition-colors">security@reattend.ai</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-slate-500">
          <p>© {new Date().getFullYear()} Reattend Technologies Private Limited. All rights reserved.</p>
          <div>Built for organizational memory</div>
        </div>
      </div>
    </footer>
  )
}
