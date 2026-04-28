'use client'

// Reattend Enterprise — landing page (light theme).
//
// Inspiration: reflexai.com. Soft cream-violet background, calm
// typography, a warm violet bloom at the top of the hero, and a
// clean product preview on the right. The other sections below the
// hero use a light treatment too so the page reads as one piece;
// we'll iterate on them one at a time.

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight, Brain, GraduationCap, ShieldCheck, Sparkles,
  ChevronDown, Building2, Users, FileText, Briefcase,
  Network, Gavel, Clock,
} from 'lucide-react'
import { TrustStrip } from '@/components/landing/trust-strip'

export default function EnterpriseLanding() {
  return (
    <div className="min-h-screen bg-[#fafaff] text-[#1a1a2e] overflow-hidden selection:bg-violet-300/40 antialiased">
      {/* Soft violet bloom at the top of the page — sets the tone for the
          hero without overpowering the rest of the content below. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_70%_at_50%_-15%,rgba(167,139,250,0.28),rgba(196,181,253,0.18)_30%,rgba(216,180,254,0.10)_55%,transparent_75%)]" />
      </div>
      {/* Subtle grain so the cream background has texture instead of feeling flat */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(15,23,42,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.6) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
        }}
      />

      <Nav />
      <Hero />
      <TrustStripLight />
      <PlaceholderRest />
    </div>
  )
}

// ─── Nav ────────────────────────────────────────────────────────────────

const SOLUTIONS_ITEMS: Array<{ icon: typeof Building2; title: string; desc: string; href: string }> = [
  { icon: Building2, title: 'For Government',     desc: 'On-prem, OCR, retention by statute.',         href: '/pricing' },
  { icon: Briefcase, title: 'For SaaS Teams',     desc: 'Slack + Notion ingest, agents, exit interviews.', href: '/pricing' },
  { icon: Users,     title: 'For HR & People Ops', desc: 'Onboarding genie, handoff agent, exits.',     href: '/pricing' },
  { icon: FileText,  title: 'For Compliance',     desc: 'WORM audit log, DPA, GDPR / CCPA / DPDP.',    href: '/compliance' },
]

function Nav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#fafaff]/85 border-b border-[#1a1a2e]/[0.06]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/icon-128.png" alt="Reattend" width={28} height={28} className="h-7 w-7 rounded-md" unoptimized />
          <div className="leading-tight">
            <div className="text-[14px] font-semibold tracking-tight text-[#1a1a2e]">Reattend</div>
            <div className="text-[9px] font-semibold text-violet-600/80 uppercase tracking-[0.22em]">Enterprise</div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-[13px] text-neutral-600">
          <Link href="/pricing" className="hover:text-[#1a1a2e] transition-colors">Pricing</Link>
          <SolutionsDropdown />
          <Link href="/compliance" className="hover:text-[#1a1a2e] transition-colors">Compliance</Link>
          <Link href="/support" className="hover:text-[#1a1a2e] transition-colors">Support</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[13px] font-medium text-neutral-600 hover:text-[#1a1a2e] transition-colors">
            Sign in
          </Link>
          <Link
            href="/sandbox"
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-colors shadow-[0_8px_30px_-12px_rgba(124,58,237,0.5)]"
          >
            Try free
          </Link>
        </div>
      </div>
    </nav>
  )
}

function SolutionsDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  // Close on outside click and on Escape so the menu doesn't stick around.
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 hover:text-[#1a1a2e] transition-colors"
        aria-expanded={open}
      >
        Solutions
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel — slides down from beneath the nav item. The
          `pt-3` spacer keeps a hover-tolerant gap between trigger and
          panel so the menu doesn't close as the cursor moves down. */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-[460px] z-50"
        >
          <div className="rounded-2xl border border-[#1a1a2e]/[0.08] bg-white shadow-[0_24px_60px_-20px_rgba(124,58,237,0.25)] p-2">
            <div className="grid grid-cols-2 gap-1">
              {SOLUTIONS_ITEMS.map((s) => (
                <Link
                  key={s.title}
                  href={s.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-start gap-3 rounded-xl p-3 hover:bg-violet-50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#1a1a2e] group-hover:text-violet-700 transition-colors">
                      {s.title}
                    </div>
                    <div className="text-[11px] text-neutral-500 leading-snug mt-0.5">{s.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="border-t border-[#1a1a2e]/[0.06] mt-2 pt-2 px-3 pb-1.5 flex items-center justify-between text-[11px] text-neutral-500">
              <span>Not sure which fits?</span>
              <Link href="/sandbox" className="text-violet-600 hover:underline font-semibold">
                Try the sandbox →
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ─── Hero ───────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative">
      <div className="max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-24 md:pb-32 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-violet-600 mb-6">
            AI-native organizational memory
          </p>
          <h1 className="text-[44px] md:text-[64px] leading-[1.04] font-bold tracking-[-0.035em] text-[#1a1a2e]">
            Your organization&apos;s memory,
            <br />
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-700 bg-clip-text text-transparent">
              preserved and resurfaced when needed.
            </span>
          </h1>
          <p className="text-[17px] md:text-[18px] text-neutral-600 mt-7 max-w-[560px] leading-[1.6]">
            Decisions, context, and institutional knowledge. Captured automatically, linked across your org, and brought back at the moment someone needs them — even when the people who knew them have moved on.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-9">
            <Link
              href="mailto:pb@reattend.ai?subject=Book%20a%20demo%20%E2%80%94%20Reattend%20Enterprise"
              className="group inline-flex items-center gap-2 h-12 px-6 rounded-full text-[14px] font-semibold text-white bg-violet-600 hover:bg-violet-700 transition-all shadow-[0_14px_40px_-14px_rgba(124,58,237,0.6)]"
            >
              Book a demo
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/sandbox"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full text-[14px] font-semibold text-[#1a1a2e] border border-[#1a1a2e]/15 bg-white hover:border-[#1a1a2e]/30 hover:bg-violet-50/60 transition-all"
            >
              Take a tour
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-10 text-[12px] text-neutral-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> SOC 2 in-flight</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-violet-600" /> 30-day free trial</span>
            <span className="flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-fuchsia-600" /> On-premise option</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <HeroVisual />
        </motion.div>
      </div>
    </section>
  )
}

// Stylized product preview that sits on the hero right. Renders a faux
// memory card UI (the moment a memory gets resurfaced into a chat
// answer) instead of a real screenshot — keeps the visual crisp at
// every viewport and matches the headline's "preserved + resurfaced"
// promise. Light, soft violet accents.
function HeroVisual() {
  return (
    <div className="relative w-full aspect-[5/4] md:aspect-auto md:h-[520px]">
      {/* Soft halo behind the card stack */}
      <div className="absolute -inset-6 rounded-[40px] bg-[radial-gradient(ellipse_at_center,rgba(167,139,250,0.30),rgba(216,180,254,0.18)_40%,transparent_70%)] blur-2xl -z-10" />

      {/* Top floating "captured" memory chip — small, slightly tilted,
          appears as if it just dropped in. */}
      <div className="absolute top-2 right-6 md:right-10 w-[260px] rotate-[3deg] z-20">
        <div className="rounded-2xl bg-white border border-[#1a1a2e]/[0.08] shadow-[0_24px_60px_-30px_rgba(124,58,237,0.45)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Captured · just now</span>
          </div>
          <div className="text-[13px] font-semibold text-[#1a1a2e] leading-snug">
            BEPS treaty position — align with OECD pillar two.
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Decision · Rajiv Sharma · Q3 sync</div>
        </div>
      </div>

      {/* Center main card — the "resurfaced" answer */}
      <div className="absolute left-2 md:left-0 top-20 md:top-24 w-[88%] md:w-[420px] z-10">
        <div className="rounded-2xl bg-white border border-[#1a1a2e]/[0.08] shadow-[0_30px_70px_-30px_rgba(124,58,237,0.35)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#1a1a2e]/[0.06] bg-violet-50/50">
            <div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white">
              <Brain className="h-3 w-3" strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider">Resurfaced for you</span>
          </div>
          <div className="p-5">
            <div className="text-[13px] text-neutral-500 leading-relaxed">
              <span className="font-medium text-neutral-700">You asked:</span> What did we decide about BEPS last quarter?
            </div>
            <div className="mt-3 pl-3 border-l-2 border-violet-500/40 text-[13px] text-[#1a1a2e] leading-[1.6]">
              The Director of International Taxation locked the treaty position to align with OECD pillar two. <span className="text-violet-700 font-medium">Three downstream artifacts depend on this</span> — reversing now would invalidate all of them.
            </div>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {['Decision · Q3', 'Memo · Safe-harbor', 'Briefing · Q3 audit'].map((s) => (
                <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 font-medium">{s}</span>
              ))}
            </div>
          </div>
          <div className="px-5 py-2.5 border-t border-[#1a1a2e]/[0.06] bg-neutral-50/50 flex items-center justify-between text-[11px] text-neutral-500">
            <span>4 sources cited</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              First captured 8 months ago
            </span>
          </div>
        </div>
      </div>

      {/* Bottom-right "linked" cluster — small chips showing connected memories */}
      <div className="absolute right-2 md:right-2 bottom-4 md:bottom-8 w-[240px] -rotate-[2deg] z-10">
        <div className="rounded-2xl bg-white border border-[#1a1a2e]/[0.08] shadow-[0_24px_60px_-30px_rgba(124,58,237,0.4)] p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Network className="h-3.5 w-3.5 text-violet-600" />
            <span className="text-[11px] font-semibold text-[#1a1a2e]">3 linked memories</span>
          </div>
          <ul className="space-y-2">
            {[
              { icon: Gavel,    label: 'Decision: BEPS treaty', tone: 'bg-violet-100 text-violet-600' },
              { icon: FileText, label: 'Memo: Safe-harbor margins', tone: 'bg-fuchsia-100 text-fuchsia-600' },
              { icon: Brain,    label: 'Briefing: Q3 audit pack', tone: 'bg-blue-100 text-blue-600' },
            ].map((it) => (
              <li key={it.label} className="flex items-center gap-2 text-[11px] text-neutral-700">
                <span className={`h-5 w-5 rounded-md flex items-center justify-center ${it.tone}`}>
                  <it.icon className="h-3 w-3" />
                </span>
                <span className="truncate flex-1">{it.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tiny "stat tile" chip floating top-left */}
      <div className="absolute top-12 left-2 md:left-6 z-0">
        <div className="rounded-xl bg-white/80 backdrop-blur border border-[#1a1a2e]/[0.06] shadow-md px-3 py-2">
          <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-semibold">Memories</div>
          <div className="text-base font-bold text-[#1a1a2e] tabular-nums">8,492</div>
        </div>
      </div>

      {/* Subtle dotted connector between cards (decorative) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none -z-10"
        aria-hidden="true"
      >
        <path
          d="M 80 60 C 160 140, 240 200, 340 260"
          stroke="rgba(167, 139, 250, 0.45)"
          strokeWidth="1"
          strokeDasharray="2,4"
          fill="none"
        />
      </svg>
    </div>
  )
}

// ─── Trust strip — light variant ────────────────────────────────────────

function TrustStripLight() {
  // The TrustStrip component currently has dark styling baked in. We
  // wrap it in a light section so it sits cleanly under the hero until
  // we redesign it. The logos themselves render fine on light bg
  // because they're brightness-0 invert + dim.
  // For now we just render an inline light version directly.
  return (
    <section className="relative py-16 border-y border-[#1a1a2e]/[0.06]">
      <div className="max-w-6xl mx-auto px-6">
        <p className="text-center text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-500 mb-10">
          Employees at these companies are using us
        </p>
        <div className="relative">
          <ul className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-x-6 gap-y-8 items-center">
            {[
              'zomato', 'infosys', 'Namecheap', 'atvi', 'BMGF', 'NTGP', 'gt', '10thlogo', 'udyamini',
            ].map((slug) => (
              <li key={slug} className="flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity duration-300">
                <Image
                  src={`/clients/${slug}.svg`}
                  alt=""
                  width={120}
                  height={36}
                  className="h-7 md:h-8 w-auto object-contain"
                  unoptimized
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

// ─── Placeholder for the rest ───────────────────────────────────────────
// The user wants to redesign each subsequent section together. Rather
// than leaving the previous dark sections (which would clash with the
// new light hero), we render a quiet "more coming" placeholder so the
// page below the hero is intentionally minimal until we get to it.

function PlaceholderRest() {
  return (
    <>
      <section className="py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-violet-600/70 mb-4">More coming</p>
          <h2 className="text-[28px] md:text-[36px] font-bold tracking-[-0.02em] text-[#1a1a2e]">
            We&apos;re redesigning the rest of this page together.
          </h2>
          <p className="text-[15px] text-neutral-500 mt-4 leading-[1.6]">
            Features, the product walkthrough, the decision graph demo, pricing — all next.
            For now, the fastest way to see what Reattend does is to{' '}
            <Link href="/sandbox" className="text-violet-600 font-semibold hover:underline">
              take the sandbox tour
            </Link>
            .
          </p>
        </div>
      </section>

      <footer className="border-t border-[#1a1a2e]/[0.06] bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-neutral-500">
          <p>© {new Date().getFullYear()} Reattend Technologies Private Limited.</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-[#1a1a2e] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#1a1a2e] transition-colors">Terms</Link>
            <Link href="/compliance" className="hover:text-[#1a1a2e] transition-colors">Compliance</Link>
            <Link href="/support" className="hover:text-[#1a1a2e] transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </>
  )
}

// Keep the import to avoid a dead-tree-shaking warning while we
// iterate; we'll wire TrustStrip back in when we redesign that section.
void TrustStrip
