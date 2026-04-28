'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, Check, Sparkles, Brain, Users, FileText,
  Bot, Calendar, Clock,
} from 'lucide-react'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'

export default function OnboardingGeniePage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1a1a2e] overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full bg-gradient-to-br from-emerald-200/30 via-teal-100/20 to-transparent blur-3xl pointer-events-none" />

      <SiteNav />

      <section className="relative pt-10 md:pt-14 pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          <div className="lg:col-span-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 mb-5">
                Onboarding Genie
              </p>
              <h1 className="text-[40px] md:text-[48px] font-bold tracking-[-0.025em] leading-[1.05]">
                Day one shouldn&apos;t be a blank page.
              </h1>
              <p className="text-[15px] text-neutral-600 mt-5 max-w-md leading-relaxed">
                Fill in a new hire&apos;s name, role, and department. The Genie reads the dept&apos;s memory graph and writes them a personalized first-week packet. Decisions to know, people to meet, policies to ack, agents to try.
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
              <PacketMock />
            </motion.div>
          </div>
        </div>
      </section>

      {/* What's in the packet */}
      <section className="py-16 md:py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">What&apos;s in it</p>
            <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1]">
              Six sections. Specific to their role.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ColourCard icon={Brain}    title="Decisions to read" copy="The 8 to 12 active decisions in their dept that load-bear on their job. Ranked by recency and dependency count." />
            <ColourCard icon={Users}    title="People to meet" copy="Five colleagues, ranked by how often their names co-appear in dept memory. With a one-line &quot;why this person&quot;." />
            <ColourCard icon={FileText} title="Policies to ack" copy="Every policy that applies to their role with a status (acked / pending / not applicable). Acks land in the audit log." />
            <NeutralCard icon={Bot}     title="Agents to try" copy="The four agents most useful for their dept. Click any to open it in Chat with a starter question." />
            <NeutralCard icon={Calendar}title="Recurring meetings" copy="Standing dept calendar invites the new hire should accept. Pulled from calendar_events." />
            <NeutralCard icon={Sparkles}title="Glossary" copy="The acronyms the dept uses without explaining (BEPS, MAP, CBDT, etc.). Each with a one-line definition." />
          </div>
        </div>
      </section>

      {/* Why it works */}
      <section className="py-16 md:py-20 relative z-10">
        <div className="max-w-6xl mx-auto px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">Why it works</p>
            <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1]">
              The first week, structured.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Pillar n="01" title="Personalized" copy="Same role, different department gets a different packet. Dept memory drives the picks." />
            <Pillar n="02" title="Grounded" copy="Every recommendation cites the underlying memory record. Not generic, not invented." />
            <Pillar n="03" title="Markdown export" copy="Manager exports the packet as markdown, prints it, walks the new hire through it on day one." />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 md:py-16 relative z-10">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { v: '8-12', l: 'Decisions surfaced' },
            { v: '5', l: 'People to meet' },
            { v: '60s', l: 'To generate a packet' },
            { v: 'PDF', l: 'or markdown export' },
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

function PacketMock() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-neutral-300/40 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-600" />
        <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-700">First-week packet</div>
      </div>
      <div>
        <div className="text-[18px] font-semibold tracking-tight">Welcome, Kavya</div>
        <div className="text-[12px] text-neutral-500">Joining International Taxation · Director track · Day 1: April 28</div>
      </div>

      <div className="space-y-2 pt-2">
        <Section icon={Brain} title="Decisions to read first" count={9}>
          BEPS treaty position · Cross-border MAP escalation · Q4 advance ruling …
        </Section>
        <Section icon={Users} title="People to meet" count={5}>
          Aarti (Secretary) · Hiroshi (JS) · Adaeze (your peer in International Taxation) …
        </Section>
        <Section icon={FileText} title="Policies pending ack" count={3}>
          Code of Conduct · Information Security · Travel Reimbursement
        </Section>
        <Section icon={Bot} title="Agents to try" count={4}>
          Decision Lookup · Policy Helper · BEPS Q&amp;A · Tribal Knowledge
        </Section>
      </div>

      <div className="border-t border-neutral-100 pt-3 flex items-center justify-between text-[11px]">
        <span className="text-neutral-500 inline-flex items-center gap-1.5"><Clock className="h-3 w-3" /> Generated 60s ago</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
          <Check className="h-3 w-3" /> Saved as memory
        </span>
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, count, children }: { icon: typeof Brain; title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-50/40 p-2.5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-emerald-600" />
          <span className="text-[9px] font-semibold uppercase tracking-widest text-emerald-700">{title}</span>
        </div>
        <span className="text-[9px] font-semibold tabular-nums text-neutral-500">{count}</span>
      </div>
      <div className="text-[11px] text-neutral-700 leading-snug">{children}</div>
    </div>
  )
}

function ColourCard({ icon: Icon, title, copy }: { icon: typeof Brain; title: string; copy: string }) {
  return (
    <div className="relative rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md overflow-hidden">
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

function NeutralCard({ icon: Icon, title, copy }: { icon: typeof Brain; title: string; copy: string }) {
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

function Pillar({ n, title, copy }: { n: string; title: string; copy: string }) {
  return (
    <div className="rounded-xl bg-white border border-neutral-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white text-[13px] font-bold tabular-nums flex items-center justify-center">{n}</div>
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
          Make day one feel like week three.
        </h2>
        <p className="text-[14px] text-neutral-600 mt-4 max-w-lg mx-auto">
          Generate a packet against the sandbox demo org. See the decisions, people, and policies the Genie picks for an incoming Director.
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
