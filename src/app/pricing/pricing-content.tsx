'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { Check, Minus, Brain, Sparkles, Users } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { Navbar } from '@/components/landing/navbar'
import { FAQAccordion } from '@/components/landing/faq'
import { Footer } from '@/components/landing/footer'


/* ─── Scroll reveal ─── */
function ScrollReveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}


/* ─── Data ─── */

const plans = [
  {
    key: 'free',
    name: 'Free Forever',
    tagline: 'For individuals. No credit card, no expiry.',
    price: 0,
    priceLabel: '/ forever',
    annualNote: null,
    cta: 'Get started free',
    ctaHref: '/register',
    popular: false,
    icon: Brain,
    color: '#6B7280',
    highlights: [
      'Unlimited memories',
      '20 AI queries / day',
      '10 DeepThink sessions / day',
      'Notion integration',
      'Web app + browser extension',
      'Import from Read.ai, Fireflies, Otter',
      'File upload & bulk import',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'For power users who need unlimited.',
    price: null,
    priceLabel: '',
    annualNote: null,
    cta: 'Coming Soon',
    ctaHref: '#',
    popular: true,
    icon: Sparkles,
    color: '#4F46E5',
    highlights: [
      'Unlimited AI queries',
      'Unlimited DeepThink sessions',
      'All integrations',
      'Semantic search + knowledge graph',
      'Priority support',
      'Early access to new features',
    ],
  },
  {
    key: 'teams',
    name: 'Teams',
    tagline: 'For teams that never lose context.',
    price: null,
    priceLabel: '',
    annualNote: null,
    cta: 'Coming Soon',
    ctaHref: '#',
    popular: false,
    icon: Users,
    color: '#1a1a2e',
    highlights: [
      'Everything in Pro',
      'Shared team memories',
      'Team knowledge base',
      'Admin dashboard + roles',
      'Member management',
      'Bulk onboarding',
    ],
  },
]


/* ─── Comparison table rows ─── */

const tableGroups = [
  {
    title: 'Memories & Capture',
    rows: [
      { label: 'Total memories', free: 'Unlimited', pro: 'Unlimited' },
      { label: 'Web app', free: true, pro: true },
      { label: 'Browser extension', free: true, pro: true },
      { label: 'Ambient screen capture', free: true, pro: true },
    ],
  },
  {
    title: 'AI & Search',
    rows: [
      { label: 'AI queries', free: '20 / day', pro: 'Unlimited' },
      { label: 'Keyword search', free: true, pro: true },
      { label: 'Semantic search', free: false, pro: true },
      { label: 'Knowledge graph', free: false, pro: true },
      { label: 'Writing assist', free: false, pro: true },
    ],
  },
  {
    title: 'Integrations',
    rows: [
      { label: 'Connected integrations', free: '1 of your choice', pro: 'All' },
      { label: 'Gmail', free: 'if chosen', pro: true },
      { label: 'Google Calendar', free: 'if chosen', pro: true },
      { label: 'Google Meet', free: 'if chosen', pro: true },
      { label: 'Slack', free: 'if chosen', pro: true },
      { label: 'Future integrations', free: false, pro: true },
    ],
  },
  {
    title: 'DeepThink',
    rows: [
      { label: 'DeepThink sessions', free: '10 / day', pro: 'Unlimited' },
      { label: 'Document cross-reference', free: true, pro: true },
      { label: 'Pattern recognition', free: true, pro: true },
    ],
  },
  {
    title: 'Teams',
    rows: [
      { label: 'Create / join teams', free: true, pro: true },
      { label: 'Team workspaces', free: true, pro: true },
    ],
  },
  {
    title: 'Support & Data',
    rows: [
      { label: 'Memory retention on downgrade', free: true, pro: true },
      { label: 'Export your data', free: true, pro: true },
      { label: 'Priority support', free: false, pro: true },
      { label: 'Early access to new features', free: false, pro: true },
    ],
  },
]


const faqs = [
  {
    question: 'What is the Free plan?',
    answer: 'Free forever - no trial, no expiry. You get unlimited memory storage, 20 AI queries per day, 10 DeepThink sessions per day, Notion integration, and the browser extension. It\'s a real plan, not a demo.',
  },
  {
    question: 'What does "1 integration of your choice" mean?',
    answer: 'On the free plan, you pick one integration: Gmail, Google Calendar, Google Meet, or Slack. That integration syncs automatically. To connect all of them, upgrade to Pro.',
  },
  {
    question: 'How does "Try Pro free" work?',
    answer: 'Pro plan is coming soon. For now, everyone gets the free plan with 20 AI queries/day, 10 DeepThink sessions, and all core features. When Pro launches, you\'ll get unlimited everything for $20/month.',
  },
  {
    question: 'If I downgrade, do I lose my memories?',
    answer: 'Never. Your memories are always yours. If you drop from Pro to Free, everything you captured stays in your account. You\'ll just be limited to 20 AI queries/day and 1 integration going forward.',
  },
  {
    question: 'What is semantic search?',
    answer: 'Semantic search lets you find memories by meaning, not just exact words. Ask "what did we decide about the partnership deal?" and Reattend finds the relevant memory even if you never used those exact words. It\'s a Pro feature.',
  },
  {
    question: 'How does Teams pricing work?',
    answer: 'Teams is $5/user/month. Each user gets full Pro features plus shared team memories, a team knowledge base, and admin controls. Invite as many people as you want - 20 shared queries per day on the free tier.',
  },
  {
    question: 'Can I switch between monthly and annual billing?',
    answer: 'Yes. Annual billing saves you 2 months ($75/year for Pro vs $108/year monthly). You can switch at any time from your account settings.',
  },
  {
    question: 'Is my data private?',
    answer: 'Yes. Memories are stored securely and are only accessible to you. We use encrypted connections for all integrations and API calls. We never sell your data or use it to train models.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes. Contact us within 15 days of your payment for a full refund, no questions asked.',
  },
]


/* ─── Cell renderer ─── */
type CellValue = boolean | string

function Cell({ value, isHeader = false }: { value: CellValue; isHeader?: boolean }) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isHeader ? 'bg-[#4F46E5]/10' : 'bg-emerald-50'}`}>
          <Check className={`h-3 w-3 ${isHeader ? 'text-[#4F46E5]' : 'text-emerald-600'}`} />
        </div>
      </div>
    )
  }
  if (value === false) {
    return (
      <div className="flex justify-center">
        <Minus className="h-3.5 w-3.5 text-gray-300" />
      </div>
    )
  }
  return (
    <div className="text-center text-[12px] font-medium text-gray-600">{value}</div>
  )
}


/* ─── Page ─── */

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <Navbar />

      {/* ══════════ HERO ══════════ */}
      <section className="relative pt-16 md:pt-24 pb-10 px-5 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-gradient-to-br from-[#4F46E5]/6 via-[#818CF8]/4 to-transparent blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-[760px] mx-auto text-center">
          <ScrollReveal>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4F46E5]/15 bg-[#4F46E5]/5 text-[12px] font-medium text-[#4F46E5] mb-4">
              <Sparkles className="h-3 w-3" /> Pricing
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <h1 className="text-[36px] sm:text-[48px] md:text-[58px] font-bold tracking-[-0.03em] leading-[1.1] mt-2">
              Free forever.{' '}
              <span className="text-[#4F46E5]">Pro coming soon.</span>
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <p className="text-gray-500 mt-4 text-[17px] max-w-lg mx-auto leading-relaxed">
              Start free - no credit card, no trial. 20 queries/day, unlimited memories, DeepThink included.
            </p>
          </ScrollReveal>
        </div>
      </section>


      {/* ══════════ PLAN CARDS ══════════ */}
      <section className="px-5 pb-16">
        <div className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <ScrollReveal key={plan.key} delay={i * 0.1}>
              <div
                className={`relative flex flex-col rounded-2xl border p-6 h-full bg-white transition-all duration-300 hover:shadow-md ${
                  plan.popular
                    ? 'border-[#4F46E5] shadow-[0_8px_40px_rgba(79,70,229,0.12)]'
                    : 'border-gray-200/60 hover:border-[#4F46E5]/20'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-white bg-[#4F46E5] px-3 py-0.5 rounded-full whitespace-nowrap">
                    Most Popular
                  </span>
                )}

                {/* Icon + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${plan.color}12` }}
                  >
                    <plan.icon className="h-4.5 w-4.5" style={{ color: plan.color }} />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold leading-tight">{plan.name}</h3>
                    <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{plan.tagline}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-1">
                  {plan.price !== null ? (
                    <>
                      <span className="text-[38px] font-bold tracking-tight">${plan.price}</span>
                      <span className="text-[13px] text-gray-400 ml-1">{plan.priceLabel}</span>
                    </>
                  ) : (
                    <span className="text-[24px] font-bold tracking-tight text-gray-400">Coming Soon</span>
                  )}
                </div>
                {plan.annualNote ? (
                  <p className="text-[11px] text-[#4F46E5] font-medium mb-5">{plan.annualNote}</p>
                ) : (
                  <div className="mb-5" />
                )}

                {/* Highlights */}
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.highlights.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-gray-600">
                      <Check className="h-3.5 w-3.5 text-[#4F46E5] mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
                  className={`flex items-center justify-center w-full text-center text-[14px] font-semibold rounded-full py-3 transition-all active:scale-[0.97] ${
                    plan.popular
                      ? 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)]'
                      : 'border border-gray-200/60 hover:border-[#4F46E5]/30 bg-gray-50 hover:bg-[#4F46E5]/5 text-gray-700'
                  }`}
                >
                  {plan.cta}
                </Link>
                {plan.popular && (
                  <p className="text-[11px] text-gray-400 text-center mt-2">Pro coming soon · No credit card</p>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>


      {/* ══════════ COMPARISON TABLE ══════════ */}
      <section className="px-5 pb-16 md:pb-20">
        <div className="max-w-[1000px] mx-auto">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-[28px] md:text-[38px] font-bold tracking-[-0.03em]">
              Everything, side by side
            </h2>
            <p className="text-gray-500 mt-2 text-[15px]">Compare every feature across plans.</p>
          </ScrollReveal>

          <ScrollReveal>
            <div className="rounded-2xl border border-gray-200/60 bg-white overflow-hidden">
              {/* Table header - Free vs Pro only (Teams is Coming Soon) */}
              <div className="grid grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_160px_160px] border-b border-gray-100 bg-[#FAFAFA]">
                <div className="px-5 py-4" />
                <div className="px-3 py-4 text-center">
                  <p className="text-[13px] font-bold text-gray-800">Free Forever</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Free</p>
                </div>
                <div className="px-3 py-4 text-center">
                  <p className="text-[13px] font-bold text-[#4F46E5]">Pro</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Coming soon</p>
                </div>
              </div>

              {/* Rows by group */}
              {tableGroups.map((group, gi) => (
                <div key={group.title}>
                  {/* Group header */}
                  <div className="grid grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_160px_160px] bg-gray-50/60 border-y border-gray-100">
                    <div className="px-5 py-2.5 col-span-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{group.title}</span>
                    </div>
                  </div>

                  {/* Feature rows */}
                  {group.rows.map((row, ri) => (
                    <div
                      key={row.label}
                      className={`grid grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_160px_160px] items-center ${
                        ri < group.rows.length - 1 ? 'border-b border-gray-50' : ''
                      } hover:bg-gray-50/40 transition-colors`}
                    >
                      <div className="px-5 py-3">
                        <span className="text-[13px] text-gray-700">{row.label}</span>
                      </div>
                      <div className="px-3 py-3">
                        <Cell value={row.free} />
                      </div>
                      <div className="px-3 py-3">
                        <Cell value={row.pro} isHeader />
                      </div>
                    </div>
                  ))}

                  {/* Spacer between groups */}
                  {gi < tableGroups.length - 1 && <div className="border-b border-gray-100" />}
                </div>
              ))}

              {/* Table footer CTAs */}
              <div className="grid grid-cols-[1fr_120px_120px] md:grid-cols-[1fr_160px_160px] border-t border-gray-100 bg-[#FAFAFA] py-4">
                <div className="px-5 flex items-center">
                  <span className="text-[12px] text-gray-400">Get started today</span>
                </div>
                {plans.map(plan => (
                  <div key={plan.key} className="px-3 flex items-center justify-center">
                    <Link
                      href={plan.ctaHref}
                      className={`text-[12px] font-semibold rounded-full px-3 py-1.5 transition-all whitespace-nowrap ${
                        plan.popular
                          ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                          : 'border border-gray-200/80 text-gray-600 hover:border-[#4F46E5]/30 hover:text-[#4F46E5]'
                      }`}
                    >
                      {plan.key === 'free' ? 'Get Free' : plan.key === 'pro' ? 'Try Pro' : 'Start'}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>


      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="px-5 pb-16 md:pb-20">
        <div className="max-w-[860px] mx-auto">
          <ScrollReveal>
            <div className="rounded-2xl border border-gray-200/60 bg-white p-8 md:p-10">
              <h3 className="text-[22px] md:text-[28px] font-bold tracking-[-0.02em] mb-8 text-center">
                How the Pro trial works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { step: '1', title: 'Sign up free', desc: 'Create your account. No credit card. You\'re on the Free plan immediately.' },
                  { step: '2', title: 'Try Pro for 60 days', desc: 'Inside the dashboard, activate your free Pro trial anytime. Full access, no card needed.' },
                  { step: '3', title: 'Think deeper', desc: 'Use DeepThink to challenge your thinking with an AI that knows your history. Upgrade to Pro when you need unlimited.' },
                ].map(item => (
                  <div key={item.step} className="text-center">
                    <div className="w-10 h-10 rounded-full bg-[#4F46E5]/8 flex items-center justify-center mx-auto mb-3">
                      <span className="text-[14px] font-bold text-[#4F46E5]">{item.step}</span>
                    </div>
                    <h4 className="text-[14px] font-bold mb-1.5">{item.title}</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>


      {/* ══════════ FAQ ══════════ */}
      <section className="px-5 pb-14 md:pb-20 bg-white py-14">
        <div className="max-w-[660px] mx-auto">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-[32px] md:text-[40px] font-bold tracking-[-0.03em]">
              Pricing <span className="text-[#4F46E5]">questions</span>
            </h2>
            <p className="text-gray-500 mt-2 text-[15px]">
              Still unsure?{' '}
              <a href="mailto:pb@reattend.ai" className="text-[#4F46E5] font-medium hover:underline">Email us</a>
            </p>
          </ScrollReveal>
          <FAQAccordion items={faqs} />
        </div>
      </section>


      {/* ══════════ FINAL CTA ══════════ */}
      <section className="py-14 md:py-20 px-5">
        <div className="max-w-[600px] mx-auto text-center">
          <ScrollReveal>
            <div className="rounded-2xl border border-gray-200/60 bg-white p-8 md:p-12 shadow-[0_8px_40px_rgba(0,0,0,0.04)]">
              <div className="w-12 h-12 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-5">
                <Brain className="h-6 w-6 text-[#4F46E5]" />
              </div>
              <h2 className="text-[26px] md:text-[34px] font-bold tracking-[-0.03em] leading-[1.15]">
                Start remembering everything.
              </h2>
              <p className="text-[15px] text-gray-500 mt-3 max-w-sm mx-auto">
                Free forever. Upgrade to Pro when you&apos;re ready. Your memories always stay yours.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.97] transition-all px-8 py-3.5 rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.35)]"
                >
                  Get started free
                </Link>
                <a
                  href="https://calendly.com/pb-reattend/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Talk to us first →
                </a>
              </div>
              <p className="text-[12px] text-gray-400 mt-3">No credit card required.</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}
