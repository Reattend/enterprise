'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Clock,
  Users,
  MessageSquare,
  Globe,
  Zap,
  ChevronDown,
  CheckCircle2,
  Brain,
  Hash,
  Send,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

// ─── Shared Design ───────────────────────────────────────
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] ${className}`}>
      {children}
    </div>
  )
}

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4F46E5]/5 text-[#4F46E5] text-[12px] font-semibold tracking-wide uppercase">
      {children}
    </span>
  )
}

// ─── FAQ Accordion ───────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <GlassCard className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="text-[15px] font-semibold text-[#1a1a2e] pr-4">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#4F46E5] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 -mt-1 text-[14px] text-[#444] leading-relaxed">{answer}</div>
      )}
    </GlassCard>
  )
}

// ─── Props ───────────────────────────────────────────────
interface StandupLandingProps {
  faqItems: Array<{ question: string; answer: string }>
}

export function StandupLanding({ faqItems }: StandupLandingProps) {
  const searchParams = useSearchParams()
  const installed = searchParams.get('installed')
  const error = searchParams.get('error')
  const [showToast, setShowToast] = useState(false)

  useEffect(() => {
    if (installed === 'true') {
      setShowToast(true)
      const t = setTimeout(() => setShowToast(false), 5000)
      return () => clearTimeout(t)
    }
  }, [installed])

  const features = [
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Scheduled DMs',
      desc: 'Bot sends standup questions via DM at the time you pick. No meetings needed.',
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Channel Summaries',
      desc: 'Once everyone responds, a formatted summary is posted to the channel automatically.',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Custom Questions',
      desc: 'Default 3-question format or write your own. Different questions per channel.',
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Timezone Support',
      desc: 'Each standup runs in its own timezone. Perfect for distributed teams.',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Instant Setup',
      desc: 'Install, type /standup setup, pick your schedule. Running in under 60 seconds.',
    },
    {
      icon: <Hash className="w-6 h-6" />,
      title: 'Multi-Channel',
      desc: 'Run different standups in different channels - engineering, design, marketing.',
    },
  ]

  const steps = [
    {
      num: '1',
      title: 'Install to Slack',
      desc: 'Click "Add to Slack" and authorize. Takes 10 seconds.',
      icon: <Zap className="w-5 h-5" />,
    },
    {
      num: '2',
      title: 'Configure in Channel',
      desc: 'Type /standup setup in any channel. Pick questions, time, and timezone.',
      icon: <Hash className="w-5 h-5" />,
    },
    {
      num: '3',
      title: 'Team Gets DMs',
      desc: 'At the scheduled time, each member gets a DM with the questions.',
      icon: <Send className="w-5 h-5" />,
    },
    {
      num: '4',
      title: 'Summary Posted',
      desc: 'Once everyone responds, a formatted summary lands in the channel.',
      icon: <MessageSquare className="w-5 h-5" />,
    },
  ]

  return (
    <div className="min-h-screen bg-[#F5F5FF] relative overflow-hidden">
      {/* Gradient blobs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/[0.04] blur-[100px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full bg-[#7C3AED]/[0.04] blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/[0.03] blur-[120px]" />
      </div>

      <Navbar />

      {/* Toast */}
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-[14px] font-medium flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          Installed! Type /standup setup in any channel to get started.
        </motion.div>
      )}

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg text-[14px] font-medium">
          Installation failed: {error}. Please try again.
        </div>
      )}

      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-28 pb-20">
        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <SectionBadge>Free Forever</SectionBadge>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-[#1a1a2e] tracking-tight leading-[1.1]">
            Async Standups for Slack
            <br />
            <span className="text-[#4F46E5]">Without the $3.50/user/mo</span>
          </h1>
          <p className="mt-5 text-lg text-[#555] max-w-2xl mx-auto leading-relaxed">
            Daily standup DMs, custom questions, scheduled summaries - everything
            Geekbot does, completely free. No credit card, no limits, no catch.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/api/standup/install"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-white font-semibold text-[15px] shadow-lg shadow-[#4F46E5]/25 transition-all hover:shadow-xl hover:shadow-[#4F46E5]/30 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" />
              </svg>
              Add to Slack - It&apos;s Free
            </a>
            <span className="text-[13px] text-[#888]">No credit card required</span>
          </div>
        </motion.section>

        {/* ── How It Works ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <SectionBadge>How It Works</SectionBadge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              Up and running in 60 seconds
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((step) => (
              <GlassCard key={step.num} className="p-6 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] font-bold text-lg mb-3">
                  {step.num}
                </div>
                <h3 className="text-[15px] font-bold text-[#1a1a2e] mb-1.5">{step.title}</h3>
                <p className="text-[13px] text-[#555] leading-relaxed">{step.desc}</p>
              </GlassCard>
            ))}
          </div>
        </motion.section>

        {/* ── Quick Start Guide ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <SectionBadge>Quick Start</SectionBadge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              Get your first standup running
            </h2>
          </div>
          <GlassCard className="p-6 md:p-8 max-w-2xl mx-auto">
            <div className="space-y-6 text-[14px] text-[#444] leading-relaxed">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 text-[#4F46E5] text-[13px] font-bold">1</span>
                <div>
                  <p className="font-bold text-[#1a1a2e] mb-0.5">Install the bot</p>
                  <p>Click <strong>&ldquo;Add to Slack&rdquo;</strong> above and authorize it for your workspace. You&apos;ll be redirected back here when done.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 text-[#4F46E5] text-[13px] font-bold">2</span>
                <div>
                  <p className="font-bold text-[#1a1a2e] mb-0.5">Go to any Slack channel and run setup</p>
                  <p>Type <code className="bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[13px] border border-white/80">/standup setup</code> and hit Enter. A popup will appear where you can:</p>
                  <ul className="mt-1.5 space-y-1 ml-1">
                    <li className="flex items-start gap-2"><span className="text-[#4F46E5] mt-0.5">&#8226;</span>Edit the standup questions (default: yesterday / today / blockers)</li>
                    <li className="flex items-start gap-2"><span className="text-[#4F46E5] mt-0.5">&#8226;</span>Set the time (e.g. 09:00) and timezone</li>
                    <li className="flex items-start gap-2"><span className="text-[#4F46E5] mt-0.5">&#8226;</span>Choose which days to run (Mon–Fri by default)</li>
                  </ul>
                  <p className="mt-1.5">Click <strong>&ldquo;Create Standup&rdquo;</strong> - the bot will confirm in the channel.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 text-[#4F46E5] text-[13px] font-bold">3</span>
                <div>
                  <p className="font-bold text-[#1a1a2e] mb-0.5">Test it right away</p>
                  <p>Don&apos;t want to wait for the scheduled time? Type <code className="bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[13px] border border-white/80">/standup trigger</code> in the same channel. The bot will immediately DM everyone in the channel with the standup questions.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 text-[#4F46E5] text-[13px] font-bold">4</span>
                <div>
                  <p className="font-bold text-[#1a1a2e] mb-0.5">Answer via DM</p>
                  <p>Each team member gets a DM from the bot. Click <strong>&ldquo;Submit Your Update&rdquo;</strong>, fill in your answers in the popup, and submit. Takes 30 seconds.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#4F46E5]/10 flex items-center justify-center shrink-0 text-[#4F46E5] text-[13px] font-bold">5</span>
                <div>
                  <p className="font-bold text-[#1a1a2e] mb-0.5">Summary appears in the channel</p>
                  <p>Once everyone responds (or after 4 hours), a formatted summary with everyone&apos;s answers is automatically posted to the channel. No manual work needed.</p>
                </div>
              </div>
              <div className="border-t border-gray-200/60 pt-4 text-[13px] text-[#888]">
                <strong className="text-[#1a1a2e]">Tip:</strong> Use <code className="bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[12px] border border-white/80">/standup pause</code> to pause and <code className="bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[12px] border border-white/80">/standup resume</code> to restart. Use <code className="bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[12px] border border-white/80">/standup list</code> to see all your configured standups.
              </div>
            </div>
          </GlassCard>
        </motion.section>

        {/* ── Example Summary ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <SectionBadge>Preview</SectionBadge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              What your team sees
            </h2>
          </div>
          <GlassCard className="p-6 md:p-8 max-w-2xl mx-auto">
            <div className="space-y-4 text-[14px]">
              <div className="flex items-center gap-2 text-[16px] font-bold text-[#1a1a2e]">
                <span>📋</span> Standup Summary - Feb 20, 2026
              </div>
              <div className="border-t border-gray-200/60 pt-3">
                <div className="font-semibold text-[#1a1a2e] mb-2">@sarah</div>
                <div className="space-y-2 text-[#444]">
                  <p><span className="font-semibold text-[#1a1a2e]">What did you work on yesterday?</span><br />Finished the auth flow redesign and merged PR #142.</p>
                  <p><span className="font-semibold text-[#1a1a2e]">What are you working on today?</span><br />Starting the dashboard analytics component.</p>
                  <p><span className="font-semibold text-[#1a1a2e]">Any blockers?</span><br />Need design review on the chart mockups.</p>
                </div>
              </div>
              <div className="border-t border-gray-200/60 pt-3">
                <div className="font-semibold text-[#1a1a2e] mb-2">@mike</div>
                <div className="space-y-2 text-[#444]">
                  <p><span className="font-semibold text-[#1a1a2e]">What did you work on yesterday?</span><br />Fixed the performance regression in the search API.</p>
                  <p><span className="font-semibold text-[#1a1a2e]">What are you working on today?</span><br />Writing integration tests for the new endpoints.</p>
                  <p><span className="font-semibold text-[#1a1a2e]">Any blockers?</span><br />None right now!</p>
                </div>
              </div>
              <div className="border-t border-gray-200/60 pt-3 text-[12px] text-[#888]">
                2 team members responded · <span className="italic">Powered by Reattend Standups</span>
                <br />
                Standups fade in Slack. <a href="https://reattend.com" className="text-[#4F46E5] hover:underline">Save them forever with Reattend →</a>
              </div>
            </div>
          </GlassCard>
        </motion.section>

        {/* ── Features ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <SectionBadge>Features</SectionBadge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              Everything you need, nothing you don&apos;t
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <GlassCard key={f.title} className="p-6">
                <div className="w-10 h-10 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] mb-3">
                  {f.icon}
                </div>
                <h3 className="text-[15px] font-bold text-[#1a1a2e] mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-[#555] leading-relaxed">{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </motion.section>

        {/* ── Comparison ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <SectionBadge>Compare</SectionBadge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              vs. Geekbot, Standuply & others
            </h2>
          </div>
          <GlassCard className="overflow-hidden max-w-2xl mx-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-gray-200/60">
                  <th className="text-left p-4 font-semibold text-[#1a1a2e]">Feature</th>
                  <th className="text-center p-4 font-semibold text-[#4F46E5]">Reattend</th>
                  <th className="text-center p-4 font-semibold text-[#888]">Others</th>
                </tr>
              </thead>
              <tbody className="text-[#444]">
                {[
                  ['Price', 'Free forever', '$3.50+/user/mo'],
                  ['Async DMs', '✓', '✓'],
                  ['Custom Questions', '✓', '✓'],
                  ['Channel Summaries', '✓', '✓'],
                  ['Timezone Support', '✓', '✓'],
                  ['User Limit', 'Unlimited', 'Limited on free tier'],
                  ['Channel Limit', 'Unlimited', '1 on free tier'],
                ].map(([feature, us, them]) => (
                  <tr key={feature} className="border-b border-gray-100/60 last:border-0">
                    <td className="p-4 font-medium text-[#1a1a2e]">{feature}</td>
                    <td className="p-4 text-center font-semibold text-[#4F46E5]">{us}</td>
                    <td className="p-4 text-center text-[#888]">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </motion.section>

        {/* ── Commands ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <SectionBadge>Commands</SectionBadge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              Simple slash commands
            </h2>
          </div>
          <GlassCard className="p-6 md:p-8 max-w-2xl mx-auto">
            <div className="space-y-4">
              {[
                { cmd: '/standup setup', desc: 'Configure a standup for the current channel' },
                { cmd: '/standup list', desc: 'View all configured standups' },
                { cmd: '/standup trigger', desc: 'Manually run today\'s standup right now' },
                { cmd: '/standup pause', desc: 'Pause standup for this channel' },
                { cmd: '/standup resume', desc: 'Resume a paused standup' },
              ].map((item) => (
                <div key={item.cmd} className="flex items-start gap-3">
                  <code className="shrink-0 px-2.5 py-1 rounded-lg bg-[#4F46E5]/5 text-[#4F46E5] text-[13px] font-mono font-semibold">
                    {item.cmd}
                  </code>
                  <span className="text-[14px] text-[#555] pt-0.5">{item.desc}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.section>

        {/* ── FAQ ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <SectionBadge>FAQ</SectionBadge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              Frequently asked questions
            </h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {faqItems.map((item) => (
              <FAQItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </motion.section>

        {/* ── CTA ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <GlassCard className="p-10 md:p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/5 to-[#7C3AED]/5" />
            <div className="relative z-10">
              <Brain className="w-10 h-10 text-[#4F46E5] mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] mb-3">
                Stop paying for standups
              </h2>
              <p className="text-[15px] text-[#555] max-w-lg mx-auto mb-6 leading-relaxed">
                Your team&apos;s daily updates shouldn&apos;t cost $3.50/person. Add Reattend
                Standups to Slack in 10 seconds and run async standups for free, forever.
              </p>
              <a
                href="/api/standup/install"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-white font-semibold text-[15px] shadow-lg shadow-[#4F46E5]/25 transition-all hover:shadow-xl hover:shadow-[#4F46E5]/30 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.163 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.163 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.315A2.528 2.528 0 0 1 24 15.163a2.528 2.528 0 0 1-2.522 2.523h-6.315z" />
                </svg>
                Add to Slack - Free Forever
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="mt-6 text-[13px] text-[#888]">
                Your standups disappear in Slack.{' '}
                <Link href="/register" className="text-[#4F46E5] hover:underline font-medium">
                  Reattend remembers them forever →
                </Link>
              </p>
            </div>
          </GlassCard>
        </motion.section>
      </main>

      <Footer />
    </div>
  )
}
