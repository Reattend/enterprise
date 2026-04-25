import { Metadata } from 'next'
import Link from 'next/link'
import {
  Shield, CheckCircle2, Clock, AlertTriangle, Lock, FileText, Database,
  Globe2, Eye, KeyRound, Network, Award, Scale, BookOpen,
} from 'lucide-react'
import { LegalFooter } from '@/components/enterprise/legal-footer'

export const metadata: Metadata = {
  title: 'Compliance · Reattend Enterprise',
  description: 'Encryption, audit integrity, GDPR, SOC 2 roadmap, StateRAMP preparation, CJIS addendum. Reattend Enterprise compliance stance and roadmap.',
}

interface ControlRow {
  name: string
  status: 'live' | 'q1' | 'q2' | 'y2' | 'on_request'
  note: string
}

const STATUS: Record<ControlRow['status'], { label: string; icon: any; cls: string }> = {
  live:       { label: 'Live',               icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  q1:         { label: 'Q1 post-launch',     icon: Clock,        cls: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  q2:         { label: 'Q2 post-launch',     icon: Clock,        cls: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  y2:         { label: 'Year 2',             icon: Clock,        cls: 'bg-slate-500/10 text-slate-600 border-slate-500/30' },
  on_request: { label: 'On request',         icon: AlertTriangle, cls: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/30' },
}

const CERTS: ControlRow[] = [
  { name: 'SOC 2 Type I',               status: 'q1',         note: 'Audit kicks off at launch; report expected in Q1 post-launch.' },
  { name: 'SOC 2 Type II',              status: 'q2',         note: 'Begins after Type I lands; 6-month observation period.' },
  { name: 'GDPR alignment',             status: 'live',       note: 'Self-service data export + right-to-erasure in user settings. DPA available.' },
  { name: 'CCPA / CPRA alignment',      status: 'live',       note: 'Covered by the same export + erasure flow.' },
  { name: 'HIPAA',                      status: 'on_request', note: 'BAA available for healthcare clients on the Enterprise plan.' },
  { name: 'StateRAMP Moderate',         status: 'y2',         note: 'Security plan document in preparation; full certification is a Year-2 target.' },
  { name: 'CJIS addendum',              status: 'on_request', note: 'Control mapping document available for law-enforcement-adjacent gov clients.' },
  { name: 'FedRAMP Moderate',           status: 'y2',         note: 'Dependent on federal gov demand signal; paperwork roadmap exists.' },
  { name: 'ISO 27001',                  status: 'y2',         note: 'Year-2 target once SOC 2 Type II is in hand.' },
]

const CONTROLS: Array<{
  title: string
  icon: any
  items: string[]
}> = [
  {
    title: 'Encryption',
    icon: Lock,
    items: [
      'TLS 1.2+ everywhere in transit.',
      'At rest: SQLite WAL + encrypted filesystem on droplet deployments; Postgres + pg_tde on managed deployments; customer-managed KMS on on-prem deployments.',
      'Field-level encryption available on request for the content column of sensitive records (opt-in, per-org).',
    ],
  },
  {
    title: 'Audit integrity (WORM)',
    icon: Eye,
    items: [
      'Every audit row is hash-chained to its predecessor (sha256 of prev + row payload).',
      'Admin cockpit exposes a "verify chain" endpoint that walks the full log and reports tamper on any broken link with the exact row id.',
      'No admin API exposes update or delete on audit rows — corrections are written as new rows.',
      'Retention is configurable per-org (default infinite for gov, 7 years for SMB).',
    ],
  },
  {
    title: 'Access control',
    icon: KeyRound,
    items: [
      'Two-tier RBAC: organisation role (super_admin / admin / member / guest) + per-department role (dept_head / manager / member / viewer).',
      'Record-level visibility: private, team, department, org-wide.',
      'RBAC is enforced at query time (FTS, semantic, graph, Chat, Oracle, Time Machine) — nothing leaks through an AI answer.',
      'Test suite ships with 36 RBAC assertions; every build runs them.',
    ],
  },
  {
    title: 'Authentication',
    icon: Shield,
    items: [
      'Email + password with NextAuth, magic links, Google sign-in.',
      'SAML SSO via admin cockpit — metadata-XML-based config for Okta, Entra ID, Google Workspace, OneLogin.',
      'SCIM 2.0 provisioning available on the Enterprise plan.',
      'Session storage is HttpOnly, SameSite=Lax, rotates on privilege change.',
    ],
  },
  {
    title: 'Data handling',
    icon: Database,
    items: [
      'PII redaction pipeline on OCR ingest: SSN, US phone, email, Luhn-verified credit cards, ABA-verified routing numbers, bank accounts, DOB, addresses.',
      'Legal hold per record — freezes edits + deletion.',
      'Retention schedules per record type (1yr / 7yr / 50yr).',
      'GDPR data export (self-serve JSON bundle) + right-to-erasure (irreversible, audited with hashed marker).',
      'Customer data never used to train foundation models.',
    ],
  },
  {
    title: 'Deployment options',
    icon: Globe2,
    items: [
      'SaaS — managed by Reattend, US-East or EU-West data residency.',
      'Dedicated tenant — single-tenant Postgres + isolated app cluster for regulated customers.',
      'On-premise — full stack runs inside the customer\'s network, including the LLM (via on-prem Rabbit deployment). Zero egress to Reattend.',
    ],
  },
  {
    title: 'AI model governance',
    icon: Network,
    items: [
      'Default stack: managed frontier AI for answering plus a fast model for triage and re-ranking.',
      'Every Q&A is ground-truthed against the customer\'s own memory — answers show citations and a passage from each source.',
      'No cross-customer data flow. Model calls send only the retrieved records + the question.',
      'On-prem customers swap the model stack for Rabbit with no code path change.',
    ],
  },
]

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Shield className="h-3.5 w-3.5" /> Compliance
          </div>
          <h1 className="font-display text-4xl tracking-tight">Security, audit, and compliance</h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Reattend Enterprise is built for organisations where &ldquo;who knew what when&rdquo; is a
            load-bearing question. That means honest audit trails, tamper-detectable logs, enforceable
            retention, and deployment choices that fit the regulated side of the market. This page is
            our current stance and the roadmap — not a brochure.
          </p>
        </div>

        {/* Certifications table */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-4 w-4 text-primary" />
            <h2 className="text-xl font-semibold">Certifications &amp; attestations</h2>
          </div>
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="divide-y">
              {CERTS.map((c) => {
                const s = STATUS[c.status]
                const Icon = s.icon
                return (
                  <div key={c.name} className="p-4 flex items-start gap-3">
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${c.status === 'live' ? 'text-emerald-500' : c.status === 'on_request' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold">{c.name}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{c.note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Customers on the Enterprise plan can request our security &amp; privacy questionnaire packet,
            pentest summary, and DPA by emailing <a className="text-primary hover:underline" href="mailto:security@reattend.com">security@reattend.com</a>.
          </p>
        </section>

        {/* Controls */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Scale className="h-4 w-4 text-primary" />
            <h2 className="text-xl font-semibold">What&apos;s actually built today</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CONTROLS.map((c) => {
              const Icon = c.icon
              return (
                <div key={c.title} className="rounded-2xl border bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold">{c.title}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {c.items.map((it, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2 leading-relaxed">
                        <span className="text-primary mt-0.5">·</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>

        {/* Data residency */}
        <section className="rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-6">
          <div className="flex items-center gap-2 mb-3">
            <Globe2 className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Data residency</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h3 className="font-semibold">US regions</h3>
              <p className="text-xs text-muted-foreground mt-1">US-East (default) or US-West on request. Government clients land in AWS GovCloud–adjacent infrastructure.</p>
            </div>
            <div>
              <h3 className="font-semibold">EU regions</h3>
              <p className="text-xs text-muted-foreground mt-1">EU-West (Frankfurt / Dublin). GDPR-native. DPA available on every plan.</p>
            </div>
            <div>
              <h3 className="font-semibold">On-premise</h3>
              <p className="text-xs text-muted-foreground mt-1">The full stack runs inside your network. The LLM (via on-prem Rabbit) runs on your hardware. Zero egress.</p>
            </div>
          </div>
        </section>

        {/* Reporting */}
        <section className="rounded-2xl border border-primary/25 bg-primary/5 p-6">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Security disclosures</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Coordinated disclosure welcome. Email <a className="text-primary hover:underline" href="mailto:security@reattend.com">security@reattend.com</a> with a clear
            repro. We acknowledge within 48 hours, patch within 72 hours for critical issues, and credit
            researchers publicly once the fix ships unless you ask otherwise.
          </p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Link href="/privacy" className="text-xs text-primary hover:underline">Privacy policy →</Link>
            <Link href="/terms" className="text-xs text-primary hover:underline">Terms of service →</Link>
            <Link href="/security" className="text-xs text-primary hover:underline">Public security overview →</Link>
            <a href="mailto:security@reattend.com" className="text-xs text-primary hover:underline">security@reattend.com</a>
          </div>
        </section>

        <div className="text-center pt-6 text-xs text-muted-foreground">
          Last reviewed: {new Date().toISOString().slice(0, 10)} · Questions? <a className="text-primary hover:underline" href="mailto:trust@reattend.com">trust@reattend.com</a>
        </div>
      </div>

      <LegalFooter />
    </div>
  )
}
