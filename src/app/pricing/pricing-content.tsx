'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Check, Building2, Shield, Sparkles, Users, GraduationCap, Brain, FileText, FileScan } from 'lucide-react'

interface Tier {
  id: 'team' | 'enterprise' | 'government'
  name: string
  price: string
  priceCadence?: string
  blurb: string
  cta: { label: string; href: string; primary?: boolean }
  highlight?: boolean
  features: Array<{ label: string; included: boolean | string }>
}

const TIERS: Tier[] = [
  {
    id: 'team',
    name: 'Team',
    price: '$25',
    priceCadence: '/seat/month',
    blurb: 'For startups & SMBs up to 200 people who live in Slack + Notion + Google.',
    cta: { label: 'Start 30-day trial', href: '/register', primary: true },
    features: [
      { label: 'Up to 200 seats', included: true },
      { label: 'Org hierarchy + two-tier RBAC', included: true },
      { label: 'Decision log + Blast Radius', included: true },
      { label: 'Time Machine (24-month history)', included: true },
      { label: 'Onboarding Genie', included: true },
      { label: 'Exit Interview Agent + Handoff Generator', included: true },
      { label: 'Self-healing dashboard', included: true },
      { label: 'Oracle Mode + Chat (Claude-powered)', included: true },
      { label: 'Chrome extension + ambient surfacing', included: true },
      { label: 'Slack / Notion / MS Teams integrations', included: true },
      { label: 'OCR pipeline (basic — image-only)', included: true },
      { label: 'GDPR data controls + WORM audit log', included: true },
      { label: 'SAML SSO', included: 'available' },
      { label: 'On-premise / dedicated tenant', included: false },
      { label: 'StateRAMP / CJIS controls', included: false },
      { label: 'Assisted onboarding + paper digitization', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    blurb: 'For 200+ seats, regulated industries, or anyone needing dedicated infrastructure.',
    cta: { label: 'Talk to sales', href: 'mailto:sales@reattend.com', primary: true },
    highlight: true,
    features: [
      { label: 'Unlimited seats', included: true },
      { label: 'Everything in Team', included: true },
      { label: 'SAML SSO + SCIM provisioning', included: true },
      { label: 'Dedicated tenant (Postgres + isolated app)', included: true },
      { label: 'EU / US / APAC data residency', included: true },
      { label: 'Customer-managed KMS', included: true },
      { label: 'Advanced OCR (multi-page PDF + cloud Textract)', included: true },
      { label: 'Field-level encryption (opt-in)', included: true },
      { label: 'SOC 2 Type II report (when available)', included: true },
      { label: 'Priority support + named CSM', included: true },
      { label: 'Custom retention + legal hold workflows', included: true },
      { label: 'On-premise deployment', included: 'optional' },
      { label: 'BAA for HIPAA', included: 'optional' },
    ],
  },
  {
    id: 'government',
    name: 'Government',
    price: 'Quote',
    blurb: 'For state, federal, and law-enforcement-adjacent orgs. On-prem first; assisted onboarding included.',
    cta: { label: 'Request quote', href: 'mailto:gov@reattend.com', primary: true },
    features: [
      { label: 'Everything in Enterprise', included: true },
      { label: 'On-premise deployment (default)', included: true },
      { label: 'On-prem Rabbit LLM — zero egress', included: true },
      { label: 'Assisted onboarding (trainer dispatched)', included: true },
      { label: 'Paper digitization (we scan + OCR your archives)', included: true },
      { label: 'StateRAMP Moderate alignment + SSP', included: true },
      { label: 'CJIS addendum + management control agreement', included: true },
      { label: 'PIV / CAC card authentication', included: 'on request' },
      { label: 'FedRAMP Moderate prep', included: 'roadmap' },
      { label: 'FIPS-validated crypto modules', included: 'optional' },
      { label: 'Air-gapped deployment', included: 'optional' },
    ],
  },
]

export default function PricingContent() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/black_logo.svg" alt="Reattend" width={32} height={32} className="h-8 w-8" unoptimized />
          <div>
            <span className="text-[17px] font-bold text-[#1a1a2e] tracking-tight">Reattend</span>
            <span className="text-[10px] font-semibold text-neutral-400 ml-1.5 uppercase tracking-wider">Enterprise</span>
          </div>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/compliance" className="text-[13px] font-medium text-neutral-600 hover:text-[#1a1a2e]">Compliance</Link>
          <Link href="/login" className="text-[13px] font-semibold text-[#1a1a2e]">Sign in →</Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center pt-8 pb-12">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[40px] md:text-[52px] font-bold tracking-[-0.03em] leading-tight text-[#1a1a2e]"
          >
            Three plans, one product.
          </motion.h1>
          <p className="text-[16px] text-neutral-500 mt-4 max-w-xl mx-auto leading-relaxed">
            Same memory engine, same RBAC, same security posture. The plans differ in deployment, scale, and how
            much we hold your hand.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className={`rounded-2xl border bg-white p-6 flex flex-col ${
                tier.highlight ? 'border-[#1a1a2e] shadow-[0_8px_30px_rgba(26,26,46,0.12)] md:scale-[1.02]' : 'border-neutral-200'
              }`}
            >
              <div className="flex items-baseline gap-2 mb-2">
                <h2 className="text-[20px] font-bold text-[#1a1a2e]">{tier.name}</h2>
                {tier.highlight && (
                  <span className="text-[9px] font-bold tracking-wider text-white bg-[#1a1a2e] px-2 py-0.5 rounded-full uppercase">Most picked</span>
                )}
              </div>
              <p className="text-[12px] text-neutral-500 leading-relaxed mb-5 min-h-[34px]">{tier.blurb}</p>
              <div className="mb-5">
                <span className="text-[36px] font-bold text-[#1a1a2e] tracking-tight">{tier.price}</span>
                {tier.priceCadence && <span className="text-[13px] text-neutral-500 ml-1">{tier.priceCadence}</span>}
              </div>
              <Link
                href={tier.cta.href}
                className={`block text-center px-5 py-3 rounded-full text-[13px] font-semibold transition-all mb-6 ${
                  tier.cta.primary
                    ? 'bg-[#1a1a2e] text-white hover:bg-[#2d2b55]'
                    : 'border border-neutral-300 text-[#1a1a2e] hover:border-neutral-400'
                }`}
              >
                {tier.cta.label}
              </Link>
              <ul className="space-y-2 text-[13px] text-neutral-700">
                {tier.features.map((f) => (
                  <li key={f.label} className="flex items-start gap-2">
                    {f.included === true ? (
                      <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : f.included === false ? (
                      <span className="h-4 w-4 shrink-0 text-neutral-300 text-center text-[14px] leading-4">—</span>
                    ) : (
                      <span className="h-4 w-4 shrink-0 mt-0.5 text-[10px] font-semibold text-amber-600 leading-4">★</span>
                    )}
                    <span className={f.included === false ? 'text-neutral-400 line-through' : ''}>
                      {f.label}
                      {typeof f.included === 'string' && (
                        <span className="ml-1.5 text-[10px] font-semibold text-amber-600 uppercase tracking-wider">({f.included})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          {[
            { icon: Brain, title: 'Decision graph + Blast Radius', desc: 'Every decision logged with rationale + alternatives. "If we reverse this, what breaks?" — calculated, not guessed.' },
            { icon: GraduationCap, title: 'Exit Interview Agent', desc: 'Claude pre-reads the departing person\'s memory footprint, asks 10-15 targeted questions, writes the handoff doc.' },
            { icon: Building2, title: 'Onboarding Genie', desc: 'New hire form → personalized first-week packet (decisions to know, people to meet, policies to ack).' },
            { icon: FileScan, title: 'OCR pipeline', desc: 'Scanned PDF / image → Tesseract or Textract → PII redaction → searchable memory record.' },
            { icon: Shield, title: 'WORM audit log', desc: 'Every audit row sha256-linked to the prior. Tamper-detectable. Verify chain on demand.' },
            { icon: Users, title: 'Two-tier RBAC', desc: 'Org role + dept role. Record-level visibility. The LLM never sees what the user can\'t.' },
            { icon: Sparkles, title: 'Time Machine', desc: 'Scrub through 24 months. See what the org knew at any point — what was decided, reversed, what existed.' },
            { icon: FileText, title: 'GDPR controls', desc: 'Self-serve data export + right-to-erasure. Hashed marker for regulator verification.' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <f.icon className="h-5 w-5 text-[#1a1a2e] mb-2" />
              <h3 className="text-[14px] font-semibold text-[#1a1a2e]">{f.title}</h3>
              <p className="text-[12px] text-neutral-500 mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white border border-neutral-200 p-8 max-w-3xl mx-auto">
          <h2 className="text-[20px] font-bold text-[#1a1a2e] mb-5">A few quick answers</h2>
          <div className="space-y-5">
            {[
              { q: 'Is there a free trial?', a: '30 days on the Team plan, no credit card required. Enterprise + Government go through sales — we want to make sure you land on the right deployment.' },
              { q: 'Per-seat — what counts as a seat?', a: 'Any active user with an org membership. Guests (read-only on explicit shares) don\'t count. Admins do.' },
              { q: 'On-prem — what does that actually mean?', a: 'The full stack runs inside your network: app, database, and the LLM (via on-prem Rabbit). Zero egress to Reattend. Customer manages updates on their cadence; we provide signed tarball releases.' },
              { q: 'How fast can we go live?', a: 'Team: 30 minutes (Slack + Notion connectors are 1-click). Enterprise dedicated: 1-2 weeks. Government on-prem with paper digitization: 6-12 weeks depending on legacy archive size.' },
              { q: 'What about the LLM provider?', a: 'Default: Anthropic Claude (answering) + Groq Llama 3.3 (triage). Year-2 we ship on-prem Rabbit so the model lives on your hardware. You can swap at any time.' },
            ].map((f) => (
              <div key={f.q}>
                <h3 className="text-[14px] font-semibold text-[#1a1a2e]">{f.q}</h3>
                <p className="text-[13px] text-neutral-600 mt-1 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center mt-12">
          <p className="text-[13px] text-neutral-500">
            Questions? <a href="mailto:sales@reattend.com" className="text-[#1a1a2e] font-semibold hover:underline">sales@reattend.com</a> · Security review? <a href="mailto:trust@reattend.com" className="text-[#1a1a2e] font-semibold hover:underline">trust@reattend.com</a>
          </p>
        </div>
      </main>
    </div>
  )
}
