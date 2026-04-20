'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Inbox,
  Sparkles,
  Brain,
  Search,
  Network,
  FolderKanban,
  CheckCircle2,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

// ─── Step card with mock UI illustration ───
function StepIllustration({ step }: { step: number }) {
  if (step === 1) {
    // Inbox / capture illustration
    return (
      <div className="w-full max-w-[260px] mx-auto">
        <div className="bg-white rounded-xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
          <div className="h-7 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 px-3">
            <div className="w-2 h-2 rounded-full bg-red-300" />
            <div className="w-2 h-2 rounded-full bg-amber-300" />
            <div className="w-2 h-2 rounded-full bg-emerald-300" />
          </div>
          <div className="p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center">
                <Inbox className="w-3.5 h-3.5 text-[#4F46E5]" />
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full w-20" />
            </div>
            <div className="bg-[#4F46E5]/5 rounded-lg p-3 border border-[#4F46E5]/10">
              <div className="h-2 bg-[#4F46E5]/20 rounded-full w-full mb-2" />
              <div className="h-2 bg-[#4F46E5]/15 rounded-full w-3/4 mb-2" />
              <div className="h-2 bg-[#4F46E5]/10 rounded-full w-1/2" />
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
              <div className="h-2 bg-emerald-200 rounded-full w-5/6 mb-2" />
              <div className="h-2 bg-emerald-150 rounded-full w-2/3" />
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
              <div className="h-2 bg-amber-200 rounded-full w-4/5 mb-2" />
              <div className="h-2 bg-amber-150 rounded-full w-1/2" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 2) {
    // AI organizing illustration
    return (
      <div className="w-full max-w-[260px] mx-auto">
        <div className="bg-white rounded-xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
          <div className="h-7 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 px-3">
            <div className="w-2 h-2 rounded-full bg-red-300" />
            <div className="w-2 h-2 rounded-full bg-amber-300" />
            <div className="w-2 h-2 rounded-full bg-emerald-300" />
          </div>
          <div className="p-4 space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div className="h-2.5 bg-gray-200 rounded-full w-16" />
              <div className="ml-auto flex gap-1">
                <div className="h-4 px-2 rounded-full bg-[#4F46E5]/10 flex items-center">
                  <div className="h-1.5 bg-[#4F46E5]/40 rounded-full w-8" />
                </div>
                <div className="h-4 px-2 rounded-full bg-emerald-100 flex items-center">
                  <div className="h-1.5 bg-emerald-400/40 rounded-full w-6" />
                </div>
              </div>
            </div>
            {/* Mini kanban columns */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <div className="h-1.5 bg-[#4F46E5]/30 rounded-full w-full" />
                <div className="bg-[#4F46E5]/5 rounded-md p-1.5 border border-[#4F46E5]/10 space-y-1">
                  <div className="h-1.5 bg-[#4F46E5]/20 rounded-full w-full" />
                  <div className="h-1.5 bg-[#4F46E5]/15 rounded-full w-2/3" />
                </div>
                <div className="bg-[#4F46E5]/5 rounded-md p-1.5 border border-[#4F46E5]/10 space-y-1">
                  <div className="h-1.5 bg-[#4F46E5]/20 rounded-full w-4/5" />
                  <div className="h-1.5 bg-[#4F46E5]/15 rounded-full w-1/2" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 bg-emerald-300 rounded-full w-full" />
                <div className="bg-emerald-50 rounded-md p-1.5 border border-emerald-100 space-y-1">
                  <div className="h-1.5 bg-emerald-200 rounded-full w-full" />
                  <div className="h-1.5 bg-emerald-150 rounded-full w-3/4" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 bg-amber-300 rounded-full w-full" />
                <div className="bg-amber-50 rounded-md p-1.5 border border-amber-100 space-y-1">
                  <div className="h-1.5 bg-amber-200 rounded-full w-5/6" />
                  <div className="h-1.5 bg-amber-150 rounded-full w-1/2" />
                </div>
                <div className="bg-amber-50 rounded-md p-1.5 border border-amber-100 space-y-1">
                  <div className="h-1.5 bg-amber-200 rounded-full w-2/3" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 3) {
    // Memory graph illustration
    return (
      <div className="w-full max-w-[260px] mx-auto">
        <div className="bg-white rounded-xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
          <div className="h-7 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 px-3">
            <div className="w-2 h-2 rounded-full bg-red-300" />
            <div className="w-2 h-2 rounded-full bg-amber-300" />
            <div className="w-2 h-2 rounded-full bg-emerald-300" />
          </div>
          <div className="p-4">
            {/* Graph nodes + edges */}
            <svg viewBox="0 0 220 140" className="w-full h-auto">
              {/* Edges */}
              <line x1="60" y1="40" x2="140" y2="30" stroke="#4F46E5" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="4 3" />
              <line x1="60" y1="40" x2="110" y2="90" stroke="#4F46E5" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="4 3" />
              <line x1="140" y1="30" x2="110" y2="90" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="4 3" />
              <line x1="140" y1="30" x2="190" y2="70" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="4 3" />
              <line x1="110" y1="90" x2="50" y2="110" stroke="#4F46E5" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="4 3" />
              <line x1="110" y1="90" x2="170" y2="120" stroke="#EC4899" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="4 3" />
              {/* Nodes */}
              <circle cx="60" cy="40" r="16" fill="#4F46E5" fillOpacity="0.1" stroke="#4F46E5" strokeWidth="1.5" strokeOpacity="0.3" />
              <circle cx="60" cy="40" r="6" fill="#4F46E5" />
              <circle cx="140" cy="30" r="20" fill="#10B981" fillOpacity="0.1" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.3" />
              <circle cx="140" cy="30" r="7" fill="#10B981" />
              <circle cx="110" cy="90" r="22" fill="#4F46E5" fillOpacity="0.1" stroke="#4F46E5" strokeWidth="1.5" strokeOpacity="0.3" />
              <circle cx="110" cy="90" r="8" fill="#4F46E5" />
              <circle cx="190" cy="70" r="14" fill="#F59E0B" fillOpacity="0.1" stroke="#F59E0B" strokeWidth="1.5" strokeOpacity="0.3" />
              <circle cx="190" cy="70" r="5" fill="#F59E0B" />
              <circle cx="50" cy="110" r="12" fill="#8B5CF6" fillOpacity="0.1" stroke="#8B5CF6" strokeWidth="1.5" strokeOpacity="0.3" />
              <circle cx="50" cy="110" r="4.5" fill="#8B5CF6" />
              <circle cx="170" cy="120" r="15" fill="#EC4899" fillOpacity="0.1" stroke="#EC4899" strokeWidth="1.5" strokeOpacity="0.3" />
              <circle cx="170" cy="120" r="5.5" fill="#EC4899" />
              {/* Labels */}
              <text x="60" y="65" textAnchor="middle" fontSize="7" fill="#666" fontWeight="500">Decision</text>
              <text x="140" y="58" textAnchor="middle" fontSize="7" fill="#666" fontWeight="500">Project</text>
              <text x="110" y="120" textAnchor="middle" fontSize="7" fill="#666" fontWeight="500">Meeting</text>
              <text x="190" y="92" textAnchor="middle" fontSize="7" fill="#666" fontWeight="500">Task</text>
            </svg>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Recall / ask AI
  return (
    <div className="w-full max-w-[260px] mx-auto">
      <div className="bg-white rounded-xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
        <div className="h-7 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5 px-3">
          <div className="w-2 h-2 rounded-full bg-red-300" />
          <div className="w-2 h-2 rounded-full bg-amber-300" />
          <div className="w-2 h-2 rounded-full bg-emerald-300" />
        </div>
        <div className="p-4 space-y-3">
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <div className="h-2 bg-gray-300 rounded-full w-32" />
          </div>
          {/* AI response */}
          <div className="bg-[#4F46E5]/5 rounded-lg p-3 border border-[#4F46E5]/10">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-5 h-5 rounded-md bg-[#4F46E5] flex items-center justify-center">
                <Brain className="w-3 h-3 text-white" />
              </div>
              <div className="h-2 bg-[#4F46E5]/30 rounded-full w-10" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2 bg-[#4F46E5]/15 rounded-full w-full" />
              <div className="h-2 bg-[#4F46E5]/12 rounded-full w-5/6" />
              <div className="h-2 bg-[#4F46E5]/10 rounded-full w-4/6" />
            </div>
          </div>
          {/* Source cards */}
          <div className="flex gap-2">
            <div className="flex-1 bg-emerald-50 rounded-md p-2 border border-emerald-100">
              <div className="w-4 h-4 rounded bg-emerald-200 mb-1.5" />
              <div className="h-1.5 bg-emerald-200 rounded-full w-full mb-1" />
              <div className="h-1.5 bg-emerald-150 rounded-full w-2/3" />
            </div>
            <div className="flex-1 bg-amber-50 rounded-md p-2 border border-amber-100">
              <div className="w-4 h-4 rounded bg-amber-200 mb-1.5" />
              <div className="h-1.5 bg-amber-200 rounded-full w-full mb-1" />
              <div className="h-1.5 bg-amber-150 rounded-full w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const steps = [
  {
    num: 1,
    title: 'Capture decisions',
    description: 'Drop in meeting notes, decisions, or context. Paste it, type it, or let integrations pull it in automatically from Slack, email, and more.',
    icon: <Inbox className="w-5 h-5" />,
    color: 'text-[#4F46E5]',
    bg: 'bg-[#4F46E5]/10',
    ring: 'ring-[#4F46E5]/20',
  },
  {
    num: 2,
    title: 'AI enriches it',
    description: 'AI extracts decisions, people, deadlines, and action items. Tags and classifies automatically. You never manage a folder again.',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-purple-600',
    bg: 'bg-purple-500/10',
    ring: 'ring-purple-500/20',
  },
  {
    num: 3,
    title: 'Decisions connect',
    description: 'AI links related decisions and catches contradictions. Same-topic links, cause-and-effect chains, temporal connections - your knowledge graph builds itself.',
    icon: <Network className="w-5 h-5" />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
  },
  {
    num: 4,
    title: 'Recall any decision',
    description: 'Ask "what did we decide about pricing?" and get a sourced answer in seconds. Search by meaning, not keywords. Explore the graph visually.',
    icon: <Brain className="w-5 h-5" />,
    color: 'text-amber-600',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <Navbar />

      {/* Background gradient blobs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[#4F46E5]/[0.04] blur-[100px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full bg-[#7C3AED]/[0.04] blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/[0.03] blur-[120px]" />
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-20 pb-8 px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
            Simple by design
          </span>
          <h1 className="text-[36px] md:text-[50px] font-extrabold tracking-[-0.03em] leading-[1.08]">
            How <span className="text-[#4F46E5]">Reattend</span> works
          </h1>
          <p className="text-[#666] mt-5 text-[16px] md:text-[17px] max-w-2xl mx-auto leading-relaxed">
            From raw decision to organized knowledge in seconds. No filing, no tagging, no busywork.
            Just capture what matters - AI handles the rest.
          </p>
        </motion.div>
      </section>

      {/* Steps - alternating layout with dotted connectors */}
      <section className="relative z-10 px-5 py-12 md:py-20">
        <div className="max-w-5xl mx-auto">
          {steps.map((step, i) => {
            const isEven = i % 2 === 0
            return (
              <div key={step.num} className="relative">
                {/* Dotted connector line (not on last step) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-[85%] h-20 z-0">
                    <svg width="2" height="80" className="overflow-visible">
                      <line x1="1" y1="0" x2="1" y2="80" stroke="#4F46E5" strokeWidth="2" strokeOpacity="0.15" strokeDasharray="6 6" />
                      {/* Arrow at bottom */}
                      <path d="M1 80 L-4 70 L6 70 Z" fill="#4F46E5" fillOpacity="0.2" />
                    </svg>
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className={`relative z-10 flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 md:gap-16 mb-20 md:mb-28`}
                >
                  {/* Illustration side */}
                  <div className="flex-1 flex justify-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                    >
                      <StepIllustration step={step.num} />
                    </motion.div>
                  </div>

                  {/* Content side */}
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl ${step.bg} ring-4 ${step.ring} flex items-center justify-center ${step.color}`}>
                        {step.icon}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[13px] font-bold">
                        {step.num}
                      </div>
                    </div>
                    <h2 className="text-[24px] md:text-[28px] font-bold text-[#1a1a2e] mb-3">
                      {step.title}
                    </h2>
                    <p className="text-[15px] text-[#666] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              </div>
            )
          })}
        </div>
      </section>

      {/* What you get section */}
      <section className="relative z-10 px-5 pb-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4F46E5]/5 text-[#4F46E5] text-[12px] font-semibold tracking-wide uppercase mb-3">
              The result
            </span>
            <h2 className="text-[24px] md:text-[32px] font-bold text-[#1a1a2e]">
              What your team gets
            </h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <Search className="w-5 h-5 text-cyan-600" />, bg: 'bg-cyan-500/10', title: 'Instant recall', desc: 'Find any decision or context in seconds. Search by meaning, not exact words.' },
              { icon: <FolderKanban className="w-5 h-5 text-teal-600" />, bg: 'bg-teal-500/10', title: 'Zero-effort organization', desc: 'Everything filed into projects, tagged, and linked. No folders, no manual work.' },
              { icon: <Network className="w-5 h-5 text-[#4F46E5]" />, bg: 'bg-[#4F46E5]/10', title: 'Visual knowledge graph', desc: 'See how decisions connect. Spot contradictions. Explore your team\'s knowledge visually.' },
              { icon: <Brain className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-500/10', title: 'AI Q&A over everything', desc: '"Who decided to change the API?" - ask in plain English, get answers with sources.' },
              { icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-500/10', title: 'Nothing falls through cracks', desc: 'Action items, pending decisions, and follow-ups surfaced automatically every morning.' },
              { icon: <FolderKanban className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-500/10', title: 'Onboarding in minutes', desc: 'New team members get instant context. No more "ask Sarah, she was there."' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="h-full bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_4px_24px_rgba(79,70,229,0.04)] p-6">
                  <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                    {item.icon}
                  </div>
                  <h3 className="text-[15px] font-bold text-[#1a1a2e] mb-1">{item.title}</h3>
                  <p className="text-[13px] text-[#666] leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-[600px] mx-auto"
        >
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] p-10 md:p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
              <Brain className="h-7 w-7 text-[#4F46E5]" />
            </div>
            <h2 className="text-[22px] font-bold mb-3 text-[#1a1a2e]">Ready to try it?</h2>
            <p className="text-gray-600 text-[14px] mb-6 max-w-md mx-auto">
              Set up in 2 minutes. Start capturing decisions. Let the AI handle the rest.
              Your team&apos;s decision intelligence starts today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
              >
                Start free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/features"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#4F46E5]/20 hover:border-[#4F46E5]/40 text-[#4F46E5] font-bold text-[14px] transition-colors"
              >
                See all features
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
