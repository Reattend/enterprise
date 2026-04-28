'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, Check, Activity, AlertTriangle, ScrollText,
  Sparkles, Building2, Users, Gauge,
} from 'lucide-react'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'

export default function CommandCentrePage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1a1a2e] overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full bg-gradient-to-br from-neutral-200/50 via-neutral-100/30 to-transparent blur-3xl pointer-events-none" />

      <SiteNav />

      {/* Hero */}
      <section className="relative pt-10 md:pt-14 pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          <div className="lg:col-span-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-5">
                Command Centre
              </p>
              <h1 className="text-[40px] md:text-[48px] font-bold tracking-[-0.025em] leading-[1.05]">
                The admin view for the org&apos;s memory.
              </h1>
              <p className="text-[15px] text-neutral-600 mt-5 max-w-md leading-relaxed">
                One screen for the things admins actually need: health score, amnesia signals, decision velocity, and the self-healing scan. Built for the security review and the Monday morning glance.
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
              <CockpitMock />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature grid (colourful) */}
      <section className="py-16 md:py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">What you see</p>
            <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1]">
              Six panels. The whole picture.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ColourCard icon={Gauge} title="Health score" copy="Composite of freshness, completeness, dept coverage, and contradiction count. One number you can track week over week." gradient="from-emerald-500 to-teal-700" />
            <ColourCard icon={AlertTriangle} title="Amnesia signals" copy="Stale memories, orphaned records, contradictions, and silent departments. Click any to see the underlying records." gradient="from-amber-500 to-orange-600" />
            <ColourCard icon={Sparkles} title="Self-healing scan" copy="Run on demand. The AI surfaces stale policies, contradictions, and gaps; admin reviews and acts." gradient="from-violet-600 to-fuchsia-600" />
            <NeutralCard icon={Activity} title="Decision velocity" copy="12-week trend of decisions made vs reversed. Spike of reversals usually means context drift somewhere." />
            <NeutralCard icon={Users} title="Active members" copy="Who logged in this week, who captured, who answered Ask. RBAC roles surfaced inline." />
            <NeutralCard icon={ScrollText} title="Audit log entry" copy="One click to the hash-chained audit log. Verify chain integrity from the same screen." />
          </div>
        </div>
      </section>

      {/* How it helps */}
      <section className="py-16 md:py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">Why it matters</p>
            <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1]">
              The questions admins actually have, answered.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <QuestionCard q="Is our org memory getting better or worse?" a="Health score chart, week over week. Drill into which departments are dragging the number down." />
            <QuestionCard q="What policies are stale right now?" a="Amnesia signals → Stale → list of policies with their last verified date and the dept owners to ping." />
            <QuestionCard q="Did anyone tamper with the audit log?" a="Verify Chain button checks every sha256 link. Surfaces the exact tampered row id if anything fails." />
            <QuestionCard q="Who actually contributes memory?" a="Active members panel ranks captures and answers per user. Tells you who the carriers are." />
          </div>
        </div>
      </section>

      <ClosingCTA />
      <SiteFooter />
    </div>
  )
}

function CockpitMock() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-2xl shadow-neutral-300/40 overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 h-7 border-b border-neutral-200 bg-neutral-50">
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="h-2 w-2 rounded-full bg-neutral-300" />
        <span className="ml-3 text-[10px] text-neutral-400 font-mono">/app/admin · Command Centre</span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400">Enterprise admin</div>
          <div className="text-[18px] font-semibold tracking-tight mt-0.5 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-neutral-500" /> Memory health
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { l: 'Health',  v: '92', good: true },
            { l: 'Memories', v: '1.2k' },
            { l: 'Decisions', v: '47' },
            { l: 'Active', v: '22' },
          ].map((s) => (
            <div key={s.l} className="rounded border border-neutral-200 bg-white p-2">
              <div className="text-[8px] font-semibold uppercase tracking-widest text-neutral-400">{s.l}</div>
              <div className={`text-[18px] font-bold tabular-nums mt-0.5 ${s.good ? 'text-emerald-600' : 'text-[#1a1a2e]'}`}>{s.v}</div>
            </div>
          ))}
        </div>
        <div className="rounded border border-neutral-200 bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-2">Amnesia signals</div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: 'Stale', v: 7, c: 'text-amber-600' },
              { l: 'Orphaned', v: 3, c: 'text-rose-600' },
              { l: 'Contradictions', v: 1, c: 'text-rose-600' },
              { l: 'Silent depts', v: 2, c: 'text-amber-600' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className={`text-[14px] font-bold tabular-nums ${s.c}`}>{s.v}</div>
                <div className="text-[8px] text-neutral-500 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded border border-neutral-200 bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-2">Decision velocity · 12 weeks</div>
          <div className="flex items-end gap-1 h-12">
            {[8, 10, 6, 12, 9, 14, 11, 13, 9, 15, 10, 12].map((v, i) => (
              <div key={i} className="flex-1 rounded-t bg-[#1a1a2e]" style={{ height: `${(v / 15) * 100}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ColourCard({ icon: Icon, title, copy, gradient }: { icon: typeof Gauge; title: string; copy: string; gradient: string }) {
  return (
    <div className={`relative rounded-2xl p-5 bg-gradient-to-br ${gradient} text-white shadow-md overflow-hidden`}>
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

function NeutralCard({ icon: Icon, title, copy }: { icon: typeof Gauge; title: string; copy: string }) {
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

function QuestionCard({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl bg-white border border-neutral-200 p-6">
      <div className="flex items-start gap-2 mb-3">
        <Check className="h-4 w-4 text-[#1a1a2e] mt-0.5 shrink-0" />
        <h3 className="text-[15px] font-semibold text-[#1a1a2e] leading-snug">{q}</h3>
      </div>
      <p className="text-[13px] text-neutral-600 leading-relaxed pl-6">{a}</p>
    </div>
  )
}

function ClosingCTA() {
  return (
    <section className="py-20 md:py-24 relative z-10">
      <div className="max-w-3xl mx-auto px-8 text-center">
        <h2 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.025em] leading-[1.1]">
          See your org from one screen.
        </h2>
        <p className="text-[14px] text-neutral-600 mt-4 max-w-lg mx-auto">
          Spin up a sandbox in 60 seconds. The Command Centre is the first screen you land on as an admin persona.
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
