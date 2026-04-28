'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, Check, GraduationCap, MessageSquare, FileText,
  Users, Briefcase, AlertTriangle,
} from 'lucide-react'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'

export default function ExitInterviewPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1a1a2e] overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full bg-gradient-to-br from-violet-200/30 via-fuchsia-100/20 to-transparent blur-3xl pointer-events-none" />

      <SiteNav />

      <section className="relative pt-10 md:pt-14 pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          <div className="lg:col-span-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 mb-5">
                Exit Interview Agent
              </p>
              <h1 className="text-[40px] md:text-[48px] font-bold tracking-[-0.025em] leading-[1.05]">
                When people leave, the knowledge stays.
              </h1>
              <p className="text-[15px] text-neutral-600 mt-5 max-w-md leading-relaxed">
                The AI reads the departing person&apos;s memory footprint, writes 10 to 15 grounded questions, captures the answers, then assembles a structured handoff doc. The successor reads it on day one. Six weeks of ramp time, gone.
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
              <HandoffMock />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">How it works</p>
            <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1]">
              Three steps. The day someone gives notice.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Step n="01" title="Start the interview" copy="Pick the departing person + their role. The AI scans their authored memories, decisions made, relationships, and policies touched." />
            <Step n="02" title="They answer in their own time" copy="10 to 15 grounded questions land in their inbox. Each question references the specific memories that prompted it. They answer in 2 to 5 sentences each." />
            <Step n="03" title="Handoff doc generates" copy="Sections: Summary · Active Projects · Relationships · Tribal Knowledge · Gotchas · Open Loops · First Week Checklist. Saved as a memory record." />
          </div>
        </div>
      </section>

      {/* Sections in the handoff (colourful) */}
      <section className="py-16 md:py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">What the handoff covers</p>
            <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1]">
              Seven sections. Every one specific.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ColourCard icon={FileText}    title="Summary" copy="The single most important thing. Two sentences." />
            <ColourCard icon={Briefcase}   title="Active projects" copy="State, contact, next action, blocker. The minimum to keep momentum." />
            <ColourCard icon={Users}       title="Relationships" copy="Three people the successor must introduce themselves to in week one." />
            <ColourCard icon={MessageSquare} title="Tribal knowledge" copy="The Tuesday 9am informal call. The vendor who responds best to a phone call. The unwritten rules." />
            <NeutralCard icon={AlertTriangle} title="Gotchas" copy="The form silently mapping blank year to 2020. The integration that breaks every Friday." />
            <NeutralCard icon={Check}      title="Open loops" copy="In-flight emails, half-finished decisions, escalations the next person needs to close." />
            <NeutralCard icon={GraduationCap} title="First-week checklist" copy="Read these memories. Meet these people. Run these agents. Six concrete items." />
            <NeutralCard icon={MessageSquare} title="Q&amp;A archive" copy="Every question and answer from the interview, kept verbatim and searchable." />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 md:py-16 relative z-10">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { v: '6 wks', l: 'Ramp time saved per departure' },
            { v: '15 min', l: 'To start an interview' },
            { v: '7', l: 'Handoff sections' },
            { v: '∞', l: 'Times the successor can re-read' },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-[36px] md:text-[44px] font-bold tabular-nums text-[#1a1a2e]">{s.v}</div>
              <div className="text-[12px] text-neutral-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <ClosingCTA />
      <SiteFooter />
    </div>
  )
}

function HandoffMock() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-300/40 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-violet-600" />
        <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-700">Handoff doc</div>
      </div>
      <div>
        <div className="text-[18px] font-semibold tracking-tight">Rajiv Sharma</div>
        <div className="text-[12px] text-neutral-500">Director, International Taxation · 4 years tenure</div>
      </div>
      <div className="space-y-2 pt-2">
        <Section title="Summary">
          BEPS treaty thread is mid-flight and has no clear successor. Read the brief on day one.
        </Section>
        <Section title="Active projects">
          BEPS · MAP escalation · Q4 advance ruling. State, contact, next action attached to each.
        </Section>
        <Section title="Relationships">
          Meera (EU), Priya (CBDT), Arjun (Legal). Introduce yourself in week one.
        </Section>
        <Section title="Gotchas">
          BEPS form silently maps blank year to 2020. Always set the year explicitly.
        </Section>
      </div>
      <div className="border-t border-neutral-100 pt-3 flex items-center justify-between text-[11px]">
        <span className="text-neutral-500">Saved as memory · April 2026</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
          <Check className="h-3 w-3" /> Complete
        </span>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-50/40 p-2.5">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-violet-700 mb-1">{title}</div>
      <div className="text-[12px] text-neutral-700 leading-snug">{children}</div>
    </div>
  )
}

function ColourCard({ icon: Icon, title, copy }: { icon: typeof GraduationCap; title: string; copy: string }) {
  return (
    <div className="relative rounded-2xl p-5 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md overflow-hidden">
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

function NeutralCard({ icon: Icon, title, copy }: { icon: typeof GraduationCap; title: string; copy: string }) {
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

function Step({ n, title, copy }: { n: string; title: string; copy: string }) {
  return (
    <div className="rounded-xl bg-white border border-neutral-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-violet-600 text-white text-[13px] font-bold tabular-nums flex items-center justify-center">{n}</div>
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
          Stop losing six weeks every time someone leaves.
        </h2>
        <p className="text-[14px] text-neutral-600 mt-4 max-w-lg mx-auto">
          The sandbox includes a completed exit interview. See the questions, the answers, and the handoff doc that drops out the other side.
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
