'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, Check, ListFilterPlus, Database, Sparkles, Network,
  Shield, Server, History, GraduationCap, Bot, Gavel, FileScan,
  Plug, BookOpen, Lock, Building2, MessageSquare, ScrollText,
  HatGlasses, FileText,
} from 'lucide-react'
import { SiteNav } from '@/components/landing/site-nav'
import { SiteFooter } from '@/components/landing/site-footer'

// /product — the long-form catalog of everything Reattend does. Six big
// sections (Capture / Connect / Recall / Run / Govern / Deploy), each
// with sub-features rendered as small bullet cards. Sticky in-page
// section nav at the top so users can jump.

const SECTIONS = [
  { id: 'capture', label: 'Capture' },
  { id: 'connect', label: 'Connect' },
  { id: 'recall',  label: 'Recall' },
  { id: 'run',     label: 'Run' },
  { id: 'govern',  label: 'Govern' },
  { id: 'deploy',  label: 'Deploy' },
] as const

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1a1a2e] overflow-x-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full bg-gradient-to-br from-neutral-200/50 via-neutral-100/30 to-transparent blur-3xl pointer-events-none" />

      <SiteNav />

      <Hero />
      <SectionNav />
      <Capture />
      <Connect />
      <Recall />
      <Run />
      <Govern />
      <Deploy />
      <ClosingCTA />

      <SiteFooter />
    </div>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-10 md:pt-14 pb-12 md:pb-16">
      <div className="max-w-4xl mx-auto px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-5">
            Product overview
          </p>
          <h1 className="text-[40px] md:text-[52px] font-bold tracking-[-0.025em] leading-[1.05] text-[#1a1a2e]">
            Everything Reattend does, in one page.
          </h1>
          <p className="text-[15px] text-neutral-600 mt-5 max-w-xl mx-auto leading-relaxed">
            Six things, in order: capture knowledge as you work, connect it into a graph, recall it on demand, run agents on top of it, govern access, and deploy it where you need it.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-7">
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
    </section>
  )
}

// ─── In-page section nav (sticky) ──────────────────────────────────────────
function SectionNav() {
  return (
    <div className="sticky top-0 z-30 bg-[#FAFAFA]/85 backdrop-blur-md border-y border-neutral-200/60">
      <div className="max-w-6xl mx-auto px-8 h-12 flex items-center gap-6 overflow-x-auto">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="text-[12px] font-semibold uppercase tracking-widest text-neutral-500 hover:text-[#1a1a2e] transition-colors whitespace-nowrap"
          >
            {s.label}
          </a>
        ))}
      </div>
    </div>
  )
}

// ─── Section template ──────────────────────────────────────────────────────
interface FeatureItem {
  icon: typeof Sparkles
  title: string
  copy: string
}

interface SectionProps {
  id: string
  eyebrow: string
  title: string
  copy: string
  bullets: string[]
  items: FeatureItem[]
  tone?: 'neutral' | 'colour'
  toneFrom?: string
  toneTo?: string
}

function Section({ id, eyebrow, title, copy, bullets, items, tone = 'neutral', toneFrom, toneTo }: SectionProps) {
  const isColour = tone === 'colour'
  return (
    <section id={id} className="py-16 md:py-20 relative z-10 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-10">
          <div className="lg:col-span-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 mb-4">{eyebrow}</p>
            <h2 className="text-[28px] md:text-[34px] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1a1a2e]">{title}</h2>
          </div>
          <div className="lg:col-span-7">
            <p className="text-[15px] text-neutral-600 leading-relaxed mb-5">{copy}</p>
            <ul className="space-y-2">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[13px] text-neutral-700">
                  <Check className="h-3.5 w-3.5 text-[#1a1a2e] mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((it) => (
            <FeatureCard key={it.title} {...it} colour={isColour} from={toneFrom} to={toneTo} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon: Icon, title, copy, colour, from, to }: FeatureItem & { colour: boolean; from?: string; to?: string }) {
  if (colour && from && to) {
    return (
      <div className={`relative rounded-2xl p-5 bg-gradient-to-br ${from} ${to} text-white shadow-md overflow-hidden`}>
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative">
          <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center mb-3">
            <Icon className="h-4 w-4 text-white" strokeWidth={2.25} />
          </div>
          <h3 className="text-[14px] font-semibold tracking-tight mb-1.5">{title}</h3>
          <p className="text-[12px] text-white/85 leading-relaxed">{copy}</p>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-2xl p-5 bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-md hover:shadow-neutral-200/50 transition-all">
      <div className="h-9 w-9 rounded-lg bg-neutral-100 flex items-center justify-center mb-3">
        <Icon className="h-4 w-4 text-[#1a1a2e]" />
      </div>
      <h3 className="text-[14px] font-semibold tracking-tight text-[#1a1a2e] mb-1.5">{title}</h3>
      <p className="text-[12px] text-neutral-600 leading-relaxed">{copy}</p>
    </div>
  )
}

// ─── Capture (colourful) ──────────────────────────────────────────────────
function Capture() {
  return (
    <Section
      id="capture"
      eyebrow="01 · Capture"
      title="Get knowledge in, fast."
      copy="Memory only matters if it lives in the system. Reattend gives you a dozen ways to capture, none of which require leaving the tool you were already in."
      bullets={[
        'Six-second brain-dump in the browser; the AI parses it into structured items',
        'Chrome extension on every whitelisted work app',
        'OCR pipeline that turns scanned PDFs into searchable memory',
        'Voice notes via Whisper, transcribed and triaged automatically',
      ]}
      items={[
        { icon: ListFilterPlus, title: 'Brain Dump', copy: 'Paste a wall of text or talk for two minutes. The AI splits it into decisions, questions, action items, and facts.' },
        { icon: Plug,           title: 'Chrome extension', copy: 'Floating R-pin captures the title, URL, and selection on whitelisted pages. Right-click anywhere to send to Reattend.' },
        { icon: FileScan,       title: 'OCR pipeline', copy: 'Drag scanned PDFs or images. PII redaction, confidence scoring, multi-language. Gov-grade accuracy.' },
        { icon: BookOpen,       title: 'Integrations', copy: 'Slack, Notion, MS Teams. Your decision graph fills itself from the conversations and docs your team already has.' },
      ]}
      tone="colour"
      toneFrom="from-violet-600"
      toneTo="to-fuchsia-600"
    />
  )
}

// ─── Connect ──────────────────────────────────────────────────────────────
function Connect() {
  return (
    <Section
      id="connect"
      eyebrow="02 · Connect"
      title="Memories link themselves."
      copy="Every record gets typed, tagged, and connected to the records it relates to. The graph builds itself as you work, so you never have to maintain a wiki."
      bullets={[
        'AI-inferred record links: contradicts, supersedes, leads_to, related',
        'Decisions chained by predecessor and successor; reverse one and see the blast radius',
        'Departments and teams arranged in a hierarchy that mirrors your org chart',
        'Workspace ↔ department links scope visibility correctly by default',
      ]}
      items={[
        { icon: Network,  title: 'Memory graph', copy: 'Every record is a node, every link is an edge. Drag, click, and trace chains in the Board view.' },
        { icon: Gavel,    title: 'Decision log', copy: 'Every decision logged with rationale, alternatives, and outcome. Chain superseded ones together.' },
        { icon: Sparkles, title: 'Blast Radius', copy: '"If we reverse this, what breaks?" — calculated from explicit references, not guessed.' },
        { icon: Building2,title: 'Org tree', copy: 'Department → Division → Team. Roles cascade access automatically.' },
      ]}
    />
  )
}

// ─── Recall (colourful) ───────────────────────────────────────────────────
function Recall() {
  return (
    <Section
      id="recall"
      eyebrow="03 · Recall"
      title="Ask anything. Scrub through time."
      copy="Two surfaces, one corpus. Chat for fast questions, Deepthink for the structured five-section dossier. Time Machine to see what the org knew on any past day."
      bullets={[
        'Streaming chat with citations on every claim',
        'Deepthink mode: 150 candidates → reranker → 5-section dossier with passage highlights',
        'Time Machine: scrub the org through 24 months of state',
        'Anonymous Ask for HR / compliance questions where attribution stays private',
      ]}
      items={[
        { icon: MessageSquare, title: 'Chat',       copy: 'Conversational Q&A in 2 to 3 seconds. Every answer cites the underlying memory record.' },
        { icon: Sparkles,      title: 'Deepthink',  copy: 'Pull 150 candidates, rerank, write a Situation / Evidence / Risks / Recommendations / Unknowns dossier.' },
        { icon: History,       title: 'Time Machine', copy: 'Scrub through 24 months. See active decisions, existing memories, and reversed ones at any past instant.' },
        { icon: HatGlasses,    title: 'Anonymous Ask', copy: 'For HR and compliance questions. Asker stripped from the audit trail; answer is public.' },
      ]}
      tone="colour"
      toneFrom="from-emerald-500"
      toneTo="to-teal-700"
    />
  )
}

// ─── Run ──────────────────────────────────────────────────────────────────
function Run() {
  return (
    <Section
      id="run"
      eyebrow="04 · Run"
      title="Agents that do, not just answer."
      copy="Ten seeded agents. Each is Chat with a specific knowledge scope and persona. Plus action agents that produce drafts ready to send."
      bullets={[
        'Exit Interview Agent reads memory, asks 10 to 15 grounded questions, writes a handoff doc',
        'Onboarding Genie produces a personalized first-week packet for new hires',
        'Action agents draft email replies and team broadcasts ready to copy out',
        'Run Now button fires any agent against recent memory and saves the result',
      ]}
      items={[
        { icon: GraduationCap, title: 'Exit Interview', copy: 'Six weeks of ramp time saved. The handoff doc is a saved memory the successor can read on day one.' },
        { icon: Bot,           title: 'Onboarding Genie', copy: 'New hire form → first-week packet (decisions, people, policies, agents to try).' },
        { icon: ListFilterPlus,title: 'Action agents',  copy: 'Draft email reply, draft team broadcast. Ready to copy out. Real-send via Slack/email lands soon.' },
        { icon: Sparkles,      title: 'Run Now',        copy: 'Admin-only. Triggers an agent over recent memory; result saves as a new memory record.' },
      ]}
    />
  )
}

// ─── Govern ───────────────────────────────────────────────────────────────
function Govern() {
  return (
    <Section
      id="govern"
      eyebrow="05 · Govern"
      title="Procurement-grade by default."
      copy="Two-tier RBAC enforced at the database query layer. Hash-chained WORM audit log. SAML SSO. Customer-managed KMS on Enterprise. The model literally never receives memories the user can't see."
      bullets={[
        'Eight record-visibility rules: creator, private, team, department, org-wide, explicit shares, admin override, non-enterprise fallback',
        'Org role + per-department role; cascade access via parent-of relationships',
        'WORM audit log: every privileged write is sha256-chained to the previous one',
        'GDPR-grade self-export and right-to-erasure live in user settings',
      ]}
      items={[
        { icon: Shield,    title: 'Two-tier RBAC',     copy: 'Org role plus department role. 36 RBAC test assertions run on every build.' },
        { icon: ScrollText,title: 'WORM audit log',    copy: 'Tamper-evident. Verify chain on demand; surfaces the exact tampered row id if anyone modifies history.' },
        { icon: Lock,      title: 'SAML SSO',          copy: 'Domain-routed. Email-domain match bounces the user to your IdP before the OTP path runs.' },
        { icon: FileText,  title: 'GDPR controls',     copy: 'One-click export bundle. Typed-confirmation right-to-erasure. Hashed marker for regulator verification.' },
      ]}
    />
  )
}

// ─── Deploy ───────────────────────────────────────────────────────────────
function Deploy() {
  return (
    <Section
      id="deploy"
      eyebrow="06 · Deploy"
      title="Where it runs is your call."
      copy="SaaS for SMBs and startups. Dedicated tenant for Enterprise. Air-gapped on-premise for Government. The AI inference engine swaps to on-prem Rabbit with no code path change."
      bullets={[
        'SaaS: cloud-native, single-tenant data per org, hosted in your region of choice',
        'Enterprise: dedicated tenant, Postgres + isolated app, customer-managed KMS, EU/US/APAC residency',
        'Government on-premise: zero egress, AI runs on your hardware, trainer dispatched for paper digitization',
        'StateRAMP Moderate prep, CJIS addendum on request, SOC 2 Type I in progress',
      ]}
      items={[
        { icon: Server,    title: 'SaaS',            copy: 'Cloud-native. 30-minute setup. Slack + Notion connectors are one-click.' },
        { icon: Building2, title: 'Enterprise',      copy: 'Dedicated tenant, SAML+SCIM, residency. SOC 2 / DPA participation included.' },
        { icon: Lock,      title: 'On-premise',      copy: 'Full stack inside your network, including the AI. Customer manages updates on their cadence.' },
        { icon: Shield,    title: 'Compliance prep', copy: 'StateRAMP Moderate, CJIS addendum, SOC 2 Type I. See /compliance for the full roadmap.' },
      ]}
    />
  )
}

// ─── Closing CTA ───────────────────────────────────────────────────────────
function ClosingCTA() {
  return (
    <section className="py-20 md:py-24 relative z-10">
      <div className="max-w-3xl mx-auto px-8 text-center">
        <h2 className="text-[28px] md:text-[36px] font-semibold tracking-[-0.025em] leading-[1.1] text-[#1a1a2e]">
          Want to see it run on real data?
        </h2>
        <p className="text-[14px] text-neutral-600 mt-4 max-w-lg mx-auto">
          The sandbox spins up a synthetic Ministry of Finance org with five role personas. Every surface is reachable; every AI feature is wired to scripted answers so you can poke around without burning credits.
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
