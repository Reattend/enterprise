'use client'

// The Legend — canonical "everything Reattend Enterprise can do for you" page.
//
// Accessible to every role. Groups features by job-to-be-done and surfaces
// the role gating inline so members see admin-only rows greyed out with
// "Ask an admin" rather than missing entirely. Source of truth is
// src/lib/enterprise/rbac.ts — if it's not here, it doesn't exist yet.

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAppStore } from '@/stores/app-store'
import {
  BookOpen, Sparkles, BrainCircuit, Network, Brain, Users, FileText, Bot,
  Gavel, History, Crown, Zap, Mic, UserPlus, Radar, ArrowRightLeft, Clock,
  ScrollText, Activity, Building2, Plug, Settings, Shield, ShieldCheck, Search, Command,
  MessageSquare, Target, AlertTriangle, GraduationCap, Glasses,
  KeyboardIcon, Keyboard, Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type RoleKey = 'super_admin' | 'admin' | 'member' | 'guest'

const ROLE_META: Record<RoleKey, { label: string; tone: string }> = {
  super_admin: { label: 'Super admin', tone: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  admin:       { label: 'Admin',       tone: 'bg-violet-500/15 text-violet-600 border-violet-500/30' },
  member:      { label: 'Member',      tone: 'bg-sky-500/15 text-sky-600 border-sky-500/30' },
  guest:       { label: 'Guest',       tone: 'bg-slate-500/15 text-slate-600 border-slate-500/30' },
}

interface Feature {
  title: string
  desc: string
  icon: any
  href?: string
  shortcut?: string
  who: RoleKey[]
  status?: 'live' | 'beta' | 'soon'
}

const SECTIONS: Array<{ title: string; blurb: string; features: Feature[] }> = [
  {
    title: 'Capture — get memory in',
    blurb: 'Four ways to turn raw thought into structured, searchable memory.',
    features: [
      {
        title: 'Brain Dump (Firehose)',
        desc: 'Paste or talk through a stream-of-consciousness dump. Claude parses it into decisions, open questions, action items, and facts — you review and commit in one click.',
        icon: BrainCircuit,
        href: '/app/brain-dump',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'File upload',
        desc: 'Drag PDF, Word, image, audio, or video (up to 20MB). Text extracted, indexed, and linked to related memories in the background.',
        icon: FileText,
        href: '/app/brain-dump',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Link capture',
        desc: 'Paste any URL. The ingest pipeline fetches the page, extracts key content, and saves it as a memory.',
        icon: BookOpen,
        href: '/app/brain-dump',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Voice capture',
        desc: 'Tap the mic, speak for up to 2 minutes. Groq Whisper transcribes, Claude enriches. Works from Brain Dump or the ⌘N drawer.',
        icon: Mic,
        shortcut: '⌘N',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Quick capture drawer',
        desc: 'Slide-in panel for scoped single-memory capture. Pick team + project. Fastest way in while mid-task.',
        icon: Command,
        shortcut: '⌘N',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
    ],
  },
  {
    title: 'Ask — get answers with citations',
    blurb: 'Two modes backed by the same retrieval pipeline. Every answer grounded in your own memory, not the open web.',
    features: [
      {
        title: 'Chat mode',
        desc: 'Fast multi-turn conversational Q&A. Streams answer, cites sources, suggests 3 follow-ups, persists the thread.',
        icon: Sparkles,
        href: '/app/ask',
        shortcut: '⌘K then enter',
        who: ['super_admin', 'admin', 'member', 'guest'],
        status: 'live',
      },
      {
        title: 'Oracle mode',
        desc: 'Deep-research mode. Scans 150 candidates, Claude Haiku reranks top 30, produces a structured 5-section dossier (Situation / Evidence / Risks / Recommendations / Unknowns). ~30s.',
        icon: Crown,
        href: '/app/ask?mode=oracle',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Global search',
        desc: 'Hybrid FTS + semantic search across every record you have access to. Results respect RBAC; nothing leaks.',
        icon: Search,
        href: '/app/search',
        shortcut: '⌘K',
        who: ['super_admin', 'admin', 'member', 'guest'],
        status: 'live',
      },
      {
        title: 'Who Should I Ask?',
        desc: 'Ranks the top 5 colleagues most likely to have context on your topic, scored by authored records × 3 + decisions made × 5 + entity mentions × 2 + recency × 1.5.',
        icon: Users,
        shortcut: '⌘⇧K',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Memory Resurface',
        desc: 'Shows what was decided or discussed this same week 1, 2, 3, and 5 years ago. Hidden on orgs younger than a year.',
        icon: Clock,
        href: '/app',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Anonymous Ask',
        desc: 'Ask a sensitive question (HR / compliance / reporting) without attribution. Same RBAC applies — you still only see what you could already access — but your identity is stripped from the audit log. One-shot, no thread saved.',
        icon: Shield,
        href: '/app/anonymous-ask',
        who: ['super_admin', 'admin', 'member', 'guest'],
        status: 'live',
      },
      {
        title: 'Meeting Prep',
        desc: 'Home card showing the next 8h of meetings with a Claude-written brief: heads-up, related memories, open questions. Add meetings manually until calendar sync lands.',
        icon: Clock,
        href: '/app',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Trending',
        desc: 'Home card listing the 5 most-viewed memories in the last 7 days. Hidden on orgs with no views yet. Respects RBAC — you only see what you can access.',
        icon: Sparkles,
        href: '/app',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Announcements',
        desc: 'Org-wide pinned banner at the top of every page until dismissed. Admin publishes; members see (and can dismiss per-user).',
        icon: Sparkles,
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Prompt library',
        desc: 'Shared, reusable prompts inside Ask. Any team member can add; usage count bubbles the best ones up. Click to drop into Chat or Oracle.',
        icon: Sparkles,
        href: '/app/ask',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Trust badges on memories',
        desc: 'Every memory shows one of: Verified / Unverified / Stale / Contradicted. Owners set a verify-every-N-days cadence; stale badge appears when the cadence lapses.',
        icon: ShieldCheck,
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Passage highlighting in Oracle',
        desc: 'Each source citation shows the exact paragraph or sentence from the memory that informed the dossier. Grounded evidence, one click away.',
        icon: Target,
        href: '/app/ask?mode=oracle',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
    ],
  },
  {
    title: 'Your org\'s knowledge',
    blurb: 'Raw records vs. rolled-up encyclopedia vs. relationship/time projections. Same data, different lenses.',
    features: [
      {
        title: 'Memory (records)',
        desc: 'Every record you can see. Filter by type, tag, department. Grid, list, or timeline view.',
        icon: Brain,
        href: '/app/memories',
        who: ['super_admin', 'admin', 'member', 'guest'],
        status: 'live',
      },
      {
        title: 'Wiki — Topics, People, Hierarchy',
        desc: 'Auto-generated encyclopedia. Three lenses: by department tree, by topic/tag, by person (with "knowledge at risk" flags for sole-source-of-truth individuals).',
        icon: BookOpen,
        href: '/app/wiki',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Landscape — Temporal',
        desc: 'Scrub through 24 months of org state. See what decisions were active, what hadn\'t been reversed yet, what existed vs what came later.',
        icon: History,
        href: '/app/landscape?mode=temporal',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Landscape — Causal',
        desc: 'Interactive graph of records + their relationship edges (contradicts, leads_to, supersedes, related). Zoom, click, trace chains.',
        icon: Network,
        href: '/app/landscape?mode=causal',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Policies',
        desc: 'Living rulebook. Members acknowledge; pending acks surface on Home. Admins author, publish, archive.',
        icon: FileText,
        href: '/app/policies',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Agents',
        desc: 'Purpose-built Claude agents — 10 seeded (HR, Legal, Finance, Onboarding, Customer Success, etc.). Admins can click "Run now" to fire an agent over recent memory; output is saved as a new memory. Activity tab shows every system run.',
        icon: Bot,
        href: '/app/agents',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Draft email reply (action agent)',
        desc: 'Paste an email thread; Claude writes a memory-grounded reply. Copy out to Gmail/Outlook. Real send via Slack/email connectors lands in Sprint P.',
        icon: Sparkles,
        href: '/app/compose/email-reply',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Draft team broadcast (action agent)',
        desc: 'Pick a decision or topic; Claude writes Slack + email versions of the announcement. Copy to your channel or inbox.',
        icon: Sparkles,
        href: '/app/compose/broadcast',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Tasks',
        desc: 'Action items extracted from memories, meetings, and decisions. Scoped to you.',
        icon: Zap,
        href: '/app/tasks',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
    ],
  },
  {
    title: 'Amnesia-specific — why Reattend exists',
    blurb: 'The features that make Reattend Enterprise distinctly ours. Glean can\'t copy these without our decision graph.',
    features: [
      {
        title: 'Decisions log',
        desc: 'Every decision logged with context, rationale, and outcome. Who decided, when, what it replaced, what it supersedes. Browse by status: active / reversed / superseded / archived.',
        icon: Gavel,
        href: '/app/admin',
        who: ['super_admin', 'admin'],
        status: 'live',
      },
      {
        title: 'Blast Radius simulator',
        desc: '"If we reverse this decision, what breaks?" Shows linked memories, policies citing it, predecessor/successor chains, people who would need to be in the room. Score: 0-50+.',
        icon: Radar,
        who: ['super_admin', 'admin'],
        status: 'live',
      },
      {
        title: 'Onboarding Genie',
        desc: 'New hire form → Claude reads the department\'s memory graph → personalized first-week packet (decisions to know, people to meet, policies to ack, agents to try). Markdown export.',
        icon: UserPlus,
        who: ['super_admin', 'admin'],
        status: 'live',
      },
      {
        title: 'Exit Interview Agent',
        desc: 'When someone gives notice, Claude pre-reads their memory footprint and asks 10-15 targeted questions. Each answer becomes a memory. Output: a structured handoff doc their successor can follow on day one.',
        icon: GraduationCap,
        who: ['super_admin', 'admin'],
        status: 'live',
      },
      {
        title: 'Handoff Generator',
        desc: 'One click: "Maya is taking over Project Atlas from Raj." Pulls Raj\'s authored memories, decisions made, relationships, and policies touched. Claude writes a personalized handoff doc.',
        icon: ArrowRightLeft,
        who: ['super_admin', 'admin'],
        status: 'live',
      },
      {
        title: 'Self-healing dashboard',
        desc: 'Detects stale policies, unresolved contradictions, knowledge gaps, decisions with no documented context. Org health score + remediation checklist.',
        icon: AlertTriangle,
        who: ['super_admin', 'admin'],
        status: 'live',
      },
      {
        title: 'Transfer Protocol',
        desc: 'When someone leaves, their knowledge doesn\'t. Memory ownership moves to the successor; originals stay linked for provenance.',
        icon: ArrowRightLeft,
        who: ['super_admin', 'admin'],
        status: 'live',
      },
    ],
  },
  {
    title: 'Daily-use hooks',
    blurb: 'Ambient surfaces so Reattend is the first thing you open, not the last thing you remember.',
    features: [
      {
        title: 'Start My Day',
        desc: 'Daily briefing on Home. 3-4 sentences of Claude-synthesized focus + what shifted since your last visit.',
        icon: Sparkles,
        href: '/app',
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Reasoning trace',
        desc: 'Every Chat answer shows a replayable pipeline trace — retrieval candidates, rerank, synthesis — so you can trust the provenance.',
        icon: Target,
        who: ['super_admin', 'admin', 'member'],
        status: 'live',
      },
      {
        title: 'Audit log (admin)',
        desc: 'Every query, access, role change, export, agent run — timestamped with actor, IP, resource. Hash-chain WORM: every row sha256-linked to the prior row; a "Verify chain" button walks the log and surfaces tamper. Searchable, CSV-exportable, retained per plan.',
        icon: ScrollText,
        who: ['super_admin', 'admin'],
        status: 'live',
      },
      {
        title: 'GDPR data controls (every user)',
        desc: 'In Settings → Data controls: download everything Reattend holds on you as JSON, or invoke right-to-erasure (irreversible). Erasure anonymises audit markers but keeps shared memory content for org continuity.',
        icon: Shield,
        href: '/app/settings',
        who: ['super_admin', 'admin', 'member', 'guest'],
        status: 'live',
      },
      {
        title: 'Compliance page (public)',
        desc: 'Public-facing compliance stance at /compliance — certifications roadmap (SOC 2 I Q1 post-launch, II Q2+, StateRAMP Y2), controls we actually have today, data residency, encryption specifics. Sales hands this to procurement.',
        icon: Shield,
        href: '/compliance',
        who: ['super_admin', 'admin', 'member', 'guest'],
        status: 'live',
      },
      {
        title: 'Analytics (admin)',
        desc: 'Where adoption is flowing: active members, memories created, decisions logged, queries fired, stale memory count, most-viewed records, reach by department. Windowed 7/30/90 days.',
        icon: Activity,
        who: ['super_admin', 'admin'],
        status: 'live',
      },
      {
        title: 'Memory Cockpit (admin)',
        desc: 'Org-wide control panel. Members, departments, decisions, policies, agents, integrations, self-healing, audit, analytics, settings — all one click from the top-left org pill.',
        icon: Activity,
        who: ['super_admin', 'admin'],
        status: 'live',
      },
      {
        title: 'OCR pipeline (admin)',
        desc: 'Batch-upload scanned documents. Tesseract extracts text, PII redaction masks sensitive data (SSN, phone, email, credit card, bank account, DOB, address). Low-confidence pages flagged for human review. Quality dashboard shows avg confidence + flag rate. Gov-track hero feature.',
        icon: FileText,
        who: ['super_admin', 'admin'],
        status: 'live',
      },
      {
        title: 'Legal hold + retention (gov track)',
        desc: 'Every memory supports a legal-hold flag (freezes edits and deletion) plus a retention_until date (earliest purge date — 7/50 years for compliance). Gov-schema foundation; UI in admin-only tools.',
        icon: Shield,
        who: ['super_admin', 'admin'],
        status: 'live',
      },
    ],
  },
  {
    title: 'Not yet — on the roadmap',
    blurb: 'What we\'re building next. Vote by sending feedback (pink topbar icon).',
    features: [
      {
        title: 'Gmail / Slack / Calendar ingest',
        desc: 'Real OAuth + incremental sync via Nango. Ships right before GA.',
        icon: Plug,
        status: 'soon',
        who: ['super_admin', 'admin', 'member'],
      },
      {
        title: 'More action agents (send, schedule, file ticket)',
        desc: 'Send to Slack, create Linear/Jira tickets, schedule follow-ups, update Notion pages. Listed as "coming soon" in /app/agents until Nango connectors ship in Sprint P.',
        icon: Bot,
        status: 'soon',
        who: ['super_admin', 'admin', 'member'],
      },
      {
        title: 'Slack / Teams bot',
        desc: 'Ask inline without leaving Slack. Auto-propose decisions from pinned threads.',
        icon: MessageSquare,
        status: 'soon',
        who: ['super_admin', 'admin', 'member'],
      },
      {
        title: 'Chrome extension (Sprint M)',
        desc: 'Capture memory + ask questions from any tab. Floating pin + right-click menu + ambient related-memory card on whitelisted pages. Available on GitHub; Chrome Web Store pending.',
        icon: Glasses,
        status: 'live',
        who: ['super_admin', 'admin', 'member'],
      },
    ],
  },
]

const SHORTCUTS: Array<{ keys: string; desc: string }> = [
  { keys: '⌘K',      desc: 'Global search — memories, decisions, policies, people' },
  { keys: '⌘⇧K',     desc: 'Who Should I Ask? — rank experts for a topic' },
  { keys: '⌘N',      desc: 'Open the Quick Capture drawer' },
  { keys: 'G then M', desc: 'Go to Memory' },
  { keys: 'G then W', desc: 'Go to Wiki' },
  { keys: 'G then A', desc: 'Go to Ask' },
  { keys: 'G then L', desc: 'Go to Landscape' },
  { keys: 'G then P', desc: 'Go to Policies' },
  { keys: '?',        desc: 'Show all shortcuts' },
  { keys: 'Esc',      desc: 'Close drawer / dialog' },
]

const GLOSSARY: Array<{ term: string; desc: string }> = [
  { term: 'Memory',   desc: 'Any unit of institutional knowledge — a meeting note, a decision, a lesson learned, an insight. The core record type.' },
  { term: 'Decision', desc: 'A memory elevated to a load-bearing choice — with context, rationale, outcome, and a status (active / superseded / reversed / archived).' },
  { term: 'Policy',   desc: 'An org-level rule requiring acknowledgment. Authored by admins, acked by members, versioned.' },
  { term: 'Agent',    desc: 'A Claude persona with a system prompt + knowledge scope. "Policy Helper" answers only from policies; "Decision Historian" knows your decision graph.' },
  { term: 'Department', desc: 'A node in your Org → Division → Team hierarchy. RBAC is department-level: HR sees HR, Engineering sees Engineering, admins see all.' },
  { term: 'Visibility', desc: 'Per-record access control: private (you only), team (workspace), department, or org-wide. Cross-dept sharing via explicit grants.' },
  { term: 'Transfer',   desc: 'Role succession: when someone leaves, memory ownership moves to the incoming person. Originals stay linked for provenance.' },
  { term: 'Blast Radius', desc: 'The downstream impact of reversing a decision — memories, policies, successor decisions, people affected. Scored 0-50+.' },
]

export default function LegendPage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const activeOrg = useAppStore((s) => s.enterpriseOrgs).find((o) => o.orgId === activeOrgId)
  const myRole: RoleKey = (activeOrg?.role === 'super_admin' || activeOrg?.role === 'admin' || activeOrg?.role === 'member' || activeOrg?.role === 'guest')
    ? activeOrg.role
    : 'member'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8 pb-12"
    >
      {/* Hero */}
      <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
          <BookOpen className="h-3.5 w-3.5" /> The Legend
        </div>
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight mb-2">
          Everything Reattend Enterprise can do for you
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          One page with every feature, scoped by role, linked, and named.
          Bookmark this. If something isn&apos;t here, it doesn&apos;t exist yet — which means you
          can request it via the pink feedback icon in the topbar.
        </p>
        {activeOrg && (
          <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${ROLE_META[myRole].tone}`}>
            <span className="opacity-70">You are in {activeOrg.orgName} as</span>
            <strong>{ROLE_META[myRole].label}</strong>
          </div>
        )}
      </div>

      {/* Role legend inline */}
      <div className="rounded-xl border bg-card p-4 flex items-center gap-2 flex-wrap text-xs">
        <span className="text-muted-foreground">Role access pills:</span>
        {(['super_admin', 'admin', 'member', 'guest'] as RoleKey[]).map((r) => (
          <span key={r} className={`px-2 py-0.5 rounded-full border ${ROLE_META[r].tone}`}>{ROLE_META[r].label}</span>
        ))}
        <span className="text-muted-foreground ml-auto">
          Source of truth: <code className="bg-muted/50 px-1 rounded text-[10px]">src/lib/enterprise/rbac.ts</code>
        </span>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-3">
          <div>
            <h2 className="font-display text-2xl tracking-tight">{section.title}</h2>
            <p className="text-sm text-muted-foreground">{section.blurb}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.features.map((f, i) => {
              const Icon = f.icon
              const youCan = f.who.includes(myRole)
              const isSoon = f.status === 'soon'
              const Wrapper: any = f.href && youCan && !isSoon ? Link : 'div'
              const wrapperProps = f.href && youCan && !isSoon ? { href: f.href } : {}
              return (
                <Wrapper
                  key={i}
                  {...wrapperProps}
                  className={`rounded-xl border bg-card p-4 transition-colors ${
                    !youCan || isSoon
                      ? 'opacity-60'
                      : f.href
                        ? 'hover:border-primary/40 hover:bg-muted/20 cursor-pointer'
                        : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-semibold">{f.title}</h3>
                        {isSoon && <Badge variant="outline" className="text-[9px] bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/30">Coming soon</Badge>}
                        {f.shortcut && (
                          <kbd className="text-[10px] font-mono bg-muted/70 text-muted-foreground px-1.5 py-0.5 rounded">{f.shortcut}</kbd>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                      <div className="mt-2 flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] text-muted-foreground/70">Available to:</span>
                        {(['super_admin', 'admin', 'member', 'guest'] as RoleKey[]).map((r) => (
                          <span
                            key={r}
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                              f.who.includes(r) ? ROLE_META[r].tone : 'text-muted-foreground/40 border-border line-through'
                            }`}
                            title={f.who.includes(r) ? 'Has access' : 'No access'}
                          >
                            {ROLE_META[r].label.replace(' admin', '').replace('Super', 'Sup')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Wrapper>
              )
            })}
          </div>
        </section>
      ))}

      {/* Shortcuts */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight flex items-center gap-2">
            <Keyboard className="h-5 w-5" /> Keyboard shortcuts
          </h2>
          <p className="text-sm text-muted-foreground">Muscle-memory accelerators. Power users live in these.</p>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden divide-y">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">{s.desc}</span>
              <kbd className="text-[11px] font-mono bg-muted px-2 py-1 rounded border">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </section>

      {/* Glossary */}
      <section className="space-y-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight flex items-center gap-2">
            <Info className="h-5 w-5" /> Glossary
          </h2>
          <p className="text-sm text-muted-foreground">Terms we use with specific meaning.</p>
        </div>
        <div className="rounded-xl border bg-card overflow-hidden divide-y">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="px-4 py-3">
              <div className="text-sm font-semibold">{g.term}</div>
              <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">{g.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Security footnote */}
      <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Two-tier RBAC, always on.</strong> Every record has a visibility
            (private, team, department, org-wide). Search, chat, graph, and timeline all filter to what you
            can actually see — nothing leaks through an AI answer or a rerank. Admins read across departments
            in their org; members see only theirs; guests see only what&apos;s explicitly shared. Source of truth:
            {' '}<code className="bg-background px-1 py-0.5 rounded text-[10px]">src/lib/enterprise/rbac.ts</code>.
          </div>
        </div>
      </section>
    </motion.div>
  )
}
