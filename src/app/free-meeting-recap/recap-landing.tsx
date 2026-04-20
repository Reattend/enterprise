'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Users,
  MessageSquare,
  Zap,
  ChevronDown,
  Brain,
  ClipboardList,
  CheckSquare,
  Shield,
  FileText,
  Download,
  ListChecks,
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
interface RecapLandingProps {
  faqItems: Array<{ q: string; a: string }>
}

export default function RecapLanding({ faqItems }: RecapLandingProps) {
  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Team-Powered Recaps',
      desc: 'Everyone contributes their perspective. Multiple people, one clean summary.',
    },
    {
      icon: <ClipboardList className="w-6 h-6" />,
      title: 'Structured Collection',
      desc: 'Three focused fields: Decisions, Action Items, Notes. No rambling, just signal.',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'No AI Required',
      desc: 'Human input beats hallucinated AI summaries. Your team knows what happened - we just organize it.',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Free Forever',
      desc: 'No per-user pricing. No limits. No credit card. Microsoft charges $30/user/mo for this.',
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Works Everywhere',
      desc: 'Channels, group chats, 1:1 conversations. Wherever your team meets in Teams.',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Live Updates',
      desc: 'The recap card updates in real-time as people submit. See who has contributed at a glance.',
    },
  ]

  const steps = [
    {
      num: '1',
      title: 'Set Up (5 minutes)',
      desc: 'Register a free Azure Bot and install the app in Teams. We guide you through every step.',
      icon: <Download className="w-5 h-5" />,
    },
    {
      num: '2',
      title: '@Recap recap',
      desc: 'After any meeting, mention the bot. It posts a form for everyone to fill in.',
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      num: '3',
      title: 'Team Fills In',
      desc: 'Everyone adds what was decided, action items, and notes. Takes 30 seconds.',
      icon: <ListChecks className="w-5 h-5" />,
    },
    {
      num: '4',
      title: '@Recap done',
      desc: 'The bot compiles all responses into one organized summary card.',
      icon: <CheckSquare className="w-5 h-5" />,
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

      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-28 pb-20">
        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <SectionBadge>Free Alternative to Copilot Recaps</SectionBadge>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-[#1a1a2e] tracking-tight leading-[1.1]">
            Meeting Recaps for
            <br />
            <span className="text-[#4F46E5]">Microsoft Teams</span>
          </h1>
          <p className="mt-5 text-lg text-[#555] max-w-2xl mx-auto leading-relaxed">
            Capture decisions, action items, and notes from your team after every meeting.
            No AI hallucinations, no $30/user/month. Just your team&apos;s real input, organized.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#setup"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[15px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/api/teams-recap/manifest"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-[#4F46E5]/20 hover:border-[#4F46E5]/40 text-[#4F46E5] font-bold text-[15px] transition-colors active:scale-[0.98]"
            >
              <Download className="w-4 h-4" /> Download App
            </a>
          </div>
          <p className="mt-3 text-[13px] text-[#888]">
            Free forever. No per-user pricing. 10,000 messages/month on Azure free tier.
          </p>
        </motion.section>

        {/* ── Copilot Comparison ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-8">
            <SectionBadge>Why Switch</SectionBadge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              vs Microsoft Copilot Recaps
            </h2>
          </div>
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-5 font-semibold text-[#1a1a2e]">Feature</th>
                    <th className="text-center p-5 font-semibold text-[#4F46E5]">Recap Bot</th>
                    <th className="text-center p-5 font-semibold text-[#888]">Copilot</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Price', 'Free', '$30/user/mo'],
                    ['Setup time', '5 minutes', 'Enterprise license'],
                    ['Accuracy', 'Human input = 100% accurate', 'AI can hallucinate'],
                    ['Multiple perspectives', 'Everyone contributes', 'Single AI summary'],
                    ['Action item tracking', 'Explicit from team', 'AI-guessed'],
                    ['Works without recording', 'Yes', 'Needs recording + transcription'],
                    ['Data stays private', 'Your infrastructure', 'Microsoft cloud'],
                  ].map(([feature, us, them], i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="p-4 pl-5 text-[#333] font-medium">{feature}</td>
                      <td className="p-4 text-center text-[#4F46E5] font-semibold">{us}</td>
                      <td className="p-4 text-center text-[#888]">{them}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
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
              4 steps to better meeting recaps
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <GlassCard className="p-6 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] text-[14px] font-bold">
                      {step.num}
                    </div>
                    <div className="text-[#4F46E5]">{step.icon}</div>
                  </div>
                  <h3 className="text-[15px] font-bold text-[#1a1a2e] mb-1">{step.title}</h3>
                  <p className="text-[13px] text-[#666] leading-relaxed">{step.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Example Recap ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-8">
            <SectionBadge>Example</SectionBadge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              What a recap looks like
            </h2>
          </div>
          <GlassCard className="p-6 md:p-8 max-w-2xl mx-auto">
            <div className="space-y-4 text-[14px]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-[#4F46E5] flex items-center justify-center">
                  <ClipboardList className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-[#4F46E5] text-[16px]">Meeting Recap Summary</span>
              </div>
              <div className="text-[13px] text-[#888]">
                Thursday, February 20, 2026 &middot; 3 team members contributed &middot; Started by Sarah
              </div>
              <div className="pt-2">
                <div className="font-bold text-[#4F46E5] mb-2">Decisions</div>
                <div className="space-y-1.5 text-[#333]">
                  <p><strong>Sarah:</strong> Moving to weekly releases starting March. QA will own the sign-off checklist.</p>
                  <p><strong>James:</strong> Agreed to sunset the v1 API by end of Q2. Migration guide needs to be done first.</p>
                </div>
              </div>
              <div className="pt-2">
                <div className="font-bold text-[#4F46E5] mb-2">Action Items</div>
                <div className="space-y-1.5 text-[#333]">
                  <p><strong>Sarah:</strong> Create release checklist template by Friday</p>
                  <p><strong>James:</strong> Draft v1 API migration guide, share by March 1</p>
                  <p><strong>Priya:</strong> Update CI pipeline for weekly release cadence</p>
                </div>
              </div>
              <div className="pt-2">
                <div className="font-bold text-[#4F46E5] mb-2">Notes</div>
                <div className="space-y-1.5 text-[#333]">
                  <p><strong>Priya:</strong> Customer feedback on v2 has been positive. No major blockers from engineering side.</p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-200 text-[12px] text-[#999]">
                Powered by <strong>Reattend</strong> | Your team&apos;s shared memory<br />
                Meeting recaps disappear in Teams. Save them forever &rarr; reattend.com
              </div>
            </div>
          </GlassCard>
        </motion.section>

        {/* ── Features Grid ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-10">
            <SectionBadge>Features</SectionBadge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              Built for real teams
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <GlassCard className="p-6 h-full">
                  <div className="w-11 h-11 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5] mb-3">
                    {f.icon}
                  </div>
                  <h3 className="text-[15px] font-bold text-[#1a1a2e] mb-1">{f.title}</h3>
                  <p className="text-[13px] text-[#666] leading-relaxed">{f.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Quick Start Guide ── */}
        <motion.section
          id="setup"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-8">
            <SectionBadge>Quick Start Guide</SectionBadge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              Set up in 5 minutes
            </h2>
          </div>
          <GlassCard className="p-6 md:p-8 max-w-3xl mx-auto">
            <div className="space-y-8 text-[14px]">
              {/* Step 1 */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[13px] font-bold flex-shrink-0">1</div>
                  <h3 className="text-[16px] font-bold text-[#1a1a2e]">Register an Azure Bot (Free)</h3>
                </div>
                <ol className="ml-11 space-y-2 text-[#555] list-decimal list-outside pl-4">
                  <li>Go to <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-[#4F46E5] font-medium hover:underline">portal.azure.com</a> (free account)</li>
                  <li>Search <strong>&quot;Azure Bot&quot;</strong> &rarr; Create</li>
                  <li>Fill in:
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-[13px]">
                      <li>Bot handle: any unique name (e.g. &quot;meeting-recap-bot&quot;)</li>
                      <li>Pricing tier: <strong>F0 (Free)</strong> - 10,000 messages/month</li>
                      <li>Type of App: <strong>Multi Tenant</strong></li>
                      <li>Creation type: <strong>Create new Microsoft App ID</strong></li>
                    </ul>
                  </li>
                  <li>After creation, go to <strong>Configuration</strong>:
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-[13px]">
                      <li>Messaging endpoint: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[12px]">https://reattend.com/api/teams-recap/messages</code></li>
                      <li>Copy the <strong>Microsoft App ID</strong></li>
                    </ul>
                  </li>
                  <li>Go to <strong>Configuration &rarr; Manage Password</strong> &rarr; <strong>New client secret</strong> &rarr; Copy the value</li>
                  <li>Under <strong>Channels</strong>, click <strong>Microsoft Teams</strong> to enable it</li>
                </ol>
              </div>

              {/* Step 2 */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[13px] font-bold flex-shrink-0">2</div>
                  <h3 className="text-[16px] font-bold text-[#1a1a2e]">Download &amp; Install the Teams App</h3>
                </div>
                <ol className="ml-11 space-y-2 text-[#555] list-decimal list-outside pl-4">
                  <li>Click the <strong>&quot;Download App&quot;</strong> button above to get the Teams manifest ZIP</li>
                  <li>In Microsoft Teams, go to <strong>Apps &rarr; Manage your apps &rarr; Upload a custom app</strong></li>
                  <li>Upload the ZIP file</li>
                  <li>Add the bot to a channel or group chat</li>
                </ol>
              </div>

              {/* Step 3 */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#4F46E5] text-white flex items-center justify-center text-[13px] font-bold flex-shrink-0">3</div>
                  <h3 className="text-[16px] font-bold text-[#1a1a2e]">Start Collecting Recaps</h3>
                </div>
                <ol className="ml-11 space-y-2 text-[#555] list-decimal list-outside pl-4">
                  <li>After a meeting, type <strong>@Recap recap</strong> in the channel</li>
                  <li>A form card appears - everyone fills in decisions, action items, notes</li>
                  <li>When ready, type <strong>@Recap done</strong> to compile the summary</li>
                  <li>The bot posts a clean, organized recap card</li>
                </ol>
              </div>

              {/* Commands reference */}
              <div className="pt-4 border-t border-gray-100">
                <h4 className="font-bold text-[#1a1a2e] mb-3">Commands Reference</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { cmd: '@Recap recap', desc: 'Start a new recap form' },
                    { cmd: '@Recap done', desc: 'Compile the summary' },
                    { cmd: '@Recap help', desc: 'Show help' },
                  ].map((c) => (
                    <div key={c.cmd} className="bg-gray-50 rounded-lg p-3">
                      <code className="text-[#4F46E5] text-[13px] font-semibold">{c.cmd}</code>
                      <p className="text-[12px] text-[#888] mt-1">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
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
          <div className="text-center mb-8">
            <SectionBadge>FAQ</SectionBadge>
            <h2 className="mt-3 text-2xl md:text-3xl font-bold text-[#1a1a2e]">
              Common questions
            </h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {faqItems.map((item) => (
              <FAQItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </div>
        </motion.section>

        {/* ── CTA ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <GlassCard className="p-10 md:p-14 text-center max-w-[600px] mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
              <Brain className="h-7 w-7 text-[#4F46E5]" />
            </div>
            <h2 className="text-[22px] font-bold mb-3 text-[#1a1a2e]">
              Stop losing meeting context
            </h2>
            <p className="text-gray-600 text-[14px] mb-6 max-w-md mx-auto">
              Meeting recaps fade in Teams. Reattend captures, organizes, and recalls your team&apos;s knowledge automatically - so nothing falls through the cracks.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="#setup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
              >
                Set Up Free <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-[#4F46E5]/20 hover:border-[#4F46E5]/40 text-[#4F46E5] font-bold text-[14px] transition-colors"
              >
                Try Reattend <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </GlassCard>
        </motion.section>
      </main>

      <Footer />
    </div>
  )
}
