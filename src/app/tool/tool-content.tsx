'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Calculator,
  FileText,
  Wind,
  Clock,
  MessageSquare,
  Brain,
  Mic,
  Monitor,
  Video,
  CalendarDays,
  BookOpen,
  GitBranch,
  Hash,
  ClipboardList,
  DollarSign,
  Table2,
  Users,
  RotateCcw,
  Target,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] ${className}`}>
      {children}
    </div>
  )
}

interface Tool {
  title: string
  description: string
  href: string
  icon: React.ElementType
  color: string
  bg: string
  badge?: string
}

interface ToolCategory {
  title: string
  subtitle: string
  tools: Tool[]
}

const categories: ToolCategory[] = [
  {
    title: 'Free Slack Apps',
    subtitle: 'Install directly into your Slack workspace',
    tools: [
      {
        title: 'Async Standup Bot',
        description: 'Run daily standups in Slack without meetings. Automated DMs, scheduled summaries, custom questions. Free Geekbot alternative.',
        href: '/free-standup-bot',
        icon: Hash,
        color: 'text-[#4F46E5]',
        bg: 'bg-[#4F46E5]/10',
        badge: 'New',
      },
      {
        title: 'Memory Match',
        description: 'A team game that reveals how differently people remember the same conversation. Anonymous, async, and surprisingly eye-opening.',
        href: '/tool/slack-memory-match',
        icon: MessageSquare,
        color: 'text-blue-600',
        bg: 'bg-blue-500/10',
      },
    ],
  },
  {
    title: 'Free MS Teams Apps',
    subtitle: 'Install directly into your Microsoft Teams workspace',
    tools: [
      {
        title: 'Meeting Recap Collector',
        description: 'Capture decisions, action items, and notes from your team after every meeting. Free alternative to Microsoft Copilot recaps ($30/user/mo).',
        href: '/free-meeting-recap',
        icon: ClipboardList,
        color: 'text-[#4F46E5]',
        bg: 'bg-[#4F46E5]/10',
        badge: 'New',
      },
    ],
  },
  {
    title: 'Knowledge Tools',
    subtitle: 'Understand and organize how your team manages knowledge',
    tools: [
      {
        title: 'Memory Debt Calculator',
        description: 'Find out how much knowledge your team is silently losing. A quick 10-question assessment that reveals hidden knowledge gaps.',
        href: '/tool/memory-debt-calculator',
        icon: Calculator,
        color: 'text-[#4F46E5]',
        bg: 'bg-[#4F46E5]/10',
      },
      {
        title: 'Decision Log Generator',
        description: 'Turn messy meeting outcomes into clean, structured decision records. Capture context, rationale, and next steps.',
        href: '/tool/decision-log-generator',
        icon: FileText,
        color: 'text-emerald-600',
        bg: 'bg-emerald-500/10',
      },
      {
        title: 'Brain Dump Organizer',
        description: 'Dump everything on your mind and watch it organize itself. Tasks, decisions, ideas, questions - sorted instantly.',
        href: '/tool/brain-dump-organizer',
        icon: Wind,
        color: 'text-amber-600',
        bg: 'bg-amber-500/10',
      },
      {
        title: 'Context Recall Timeline',
        description: 'Reconstruct what happened and when. Build a visual timeline of meetings, decisions, and notes.',
        href: '/tool/context-recall-timeline',
        icon: Clock,
        color: 'text-purple-600',
        bg: 'bg-purple-500/10',
      },
    ],
  },
  {
    title: 'Recording Tools',
    subtitle: 'Capture meetings, screen activity, and voice notes',
    tools: [
      {
        title: 'Meeting Recorder',
        description: 'Record meetings directly in your browser. Get transcripts and summaries sent to everyone automatically.',
        href: '/record',
        icon: Video,
        color: 'text-red-600',
        bg: 'bg-red-500/10',
      },
      {
        title: 'Screen Recorder',
        description: 'Record your screen with one click. No installs, no signups. Download instantly.',
        href: '/free-screen-recorder',
        icon: Monitor,
        color: 'text-cyan-600',
        bg: 'bg-cyan-500/10',
      },
      {
        title: 'Voice Recorder',
        description: 'Record voice memos directly in your browser. Simple, private, and works offline.',
        href: '/free-voice-recorder',
        icon: Mic,
        color: 'text-orange-600',
        bg: 'bg-orange-500/10',
      },
    ],
  },
  {
    title: 'Productivity Tools',
    subtitle: 'Plan your day and track your work',
    tools: [
      {
        title: 'Daily Planner',
        description: 'Plan your day with a simple, distraction-free planner. Time blocks, priorities, and focus sessions.',
        href: '/free-daily-planner',
        icon: CalendarDays,
        color: 'text-teal-600',
        bg: 'bg-teal-500/10',
      },
      {
        title: 'Work Journal',
        description: 'Track what you accomplished each day. Build a record of your work that you can look back on.',
        href: '/free-work-journal',
        icon: BookOpen,
        color: 'text-indigo-600',
        bg: 'bg-indigo-500/10',
      },
      {
        title: 'Timeline Maker',
        description: 'Create beautiful timelines for projects, milestones, and events. Export and share with your team.',
        href: '/free-timeline-maker',
        icon: GitBranch,
        color: 'text-pink-600',
        bg: 'bg-pink-500/10',
      },
    ],
  },
  {
    title: 'Team Management Tools',
    subtitle: 'Templates and calculators for managers and team leads',
    tools: [
      {
        title: 'Meeting Cost Calculator',
        description: 'Calculate the true cost of your meetings. See how much your team spends per week, month, and year.',
        href: '/free-meeting-cost-calculator',
        icon: DollarSign,
        color: 'text-[#4F46E5]',
        bg: 'bg-[#4F46E5]/10',
        badge: 'New',
      },
      {
        title: 'RACI Chart Generator',
        description: 'Create a RACI matrix in minutes. Define tasks, assign roles, and export as PDF.',
        href: '/free-raci-chart-generator',
        icon: Table2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-500/10',
        badge: 'New',
      },
      {
        title: '1-on-1 Meeting Template',
        description: 'Build better 1-on-1 agendas with proven question templates. Customize and export as PDF.',
        href: '/free-one-on-one-template',
        icon: Users,
        color: 'text-blue-600',
        bg: 'bg-blue-500/10',
        badge: 'New',
      },
      {
        title: 'Retrospective Template',
        description: 'Generate sprint retro templates. Start/Stop/Continue, 4Ls, Mad/Sad/Glad, and more formats.',
        href: '/free-retrospective-template',
        icon: RotateCcw,
        color: 'text-amber-600',
        bg: 'bg-amber-500/10',
        badge: 'New',
      },
      {
        title: 'OKR Template',
        description: 'Create Objectives and Key Results for your team. Start from examples or build your own. Export as PDF.',
        href: '/free-okr-template',
        icon: Target,
        color: 'text-purple-600',
        bg: 'bg-purple-500/10',
        badge: 'New',
      },
    ],
  },
]

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
      <Navbar />

      {/* Background gradient blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-20 pb-12 px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
            {categories.reduce((sum, c) => sum + c.tools.length, 0)} free tools
          </span>
          <h1 className="text-[36px] md:text-[46px] font-bold tracking-[-0.03em] leading-[1.1]">
            Free <span className="text-[#4F46E5]">Tools</span>
          </h1>
          <p className="text-gray-500 mt-4 text-[16px] max-w-xl mx-auto">
            Slack apps, productivity tools, recorders, and knowledge utilities - all free, no signup required.
          </p>
        </motion.div>
      </section>

      {/* Tool Categories */}
      {categories.map((category) => (
        <section key={category.title} className="relative z-10 px-5 pb-16">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <h2 className="text-[22px] font-bold text-[#1a1a2e]">{category.title}</h2>
              <p className="text-[14px] text-gray-500 mt-1">{category.subtitle}</p>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {category.tools.map((tool, i) => (
                <motion.div
                  key={tool.href}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 + 0.15 }}
                >
                  <Link
                    href={tool.href}
                    className="group flex flex-col items-start gap-4 p-6 h-full rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_rgba(79,70,229,0.06)] hover:shadow-[0_8px_40px_rgba(79,70,229,0.12)] transition-all"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={`w-11 h-11 rounded-xl ${tool.bg} flex items-center justify-center shrink-0`}>
                        <tool.icon className={`w-5 h-5 ${tool.color}`} />
                      </div>
                      {tool.badge && (
                        <span className="ml-auto text-[11px] font-bold uppercase tracking-wider text-white bg-[#4F46E5] px-2 py-0.5 rounded-full">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[16px] font-bold group-hover:text-[#4F46E5] transition-colors">
                        {tool.title}
                      </h3>
                      <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
                        {tool.description}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#4F46E5] mt-auto">
                      Try it free <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="relative z-10 py-20 md:py-28 px-5">
        <div className="max-w-[1200px] mx-auto relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#4F46E5]/10 via-[#818CF8]/5 to-[#C7D2FE]/10 blur-xl" />
          <div className="relative z-10">
            <GlassCard className="max-w-[600px] mx-auto p-10 md:p-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
                <Brain className="h-7 w-7 text-[#4F46E5]" />
              </div>
              <h2 className="text-[22px] font-bold mb-3 text-[#1a1a2e]">Ready for the full picture?</h2>
              <p className="text-gray-600 text-[14px] mb-6 max-w-md mx-auto">
                Reattend captures, organizes, and recalls your team&apos;s knowledge automatically - so nothing falls through the cracks.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
              >
                Try Reattend free <ArrowRight className="w-4 h-4" />
              </Link>
            </GlassCard>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
