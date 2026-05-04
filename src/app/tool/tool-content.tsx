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
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { MarketingHero } from '@/components/marketing/marketing-hero'
import { ToolFooterCta } from '@/components/landing/tool-footer-cta'

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

// Token shorthands so the cards below stay readable.
const INK = 'oklch(0.18 0.012 270)'
const INK_2 = 'oklch(0.32 0.012 270)'
const INK_3 = 'oklch(0.52 0.012 270)'
const RULE = 'oklch(0.88 0.008 270)'
const PAPER = 'oklch(0.992 0.004 80)'
const ACCENT = 'oklch(0.45 0.18 280)'

export default function ToolsPage() {
  const totalTools = categories.reduce((sum, c) => sum + c.tools.length, 0)

  return (
    <MarketingShell>
      <MarketingHero
        eyebrow={`${totalTools} free tools`}
        title="Free"
        emphasis="tools"
        emphasisJoiner=" "
        lede="Slack apps, productivity tools, recorders, and knowledge utilities — all free, no signup required. Built by the team behind Reattend Enterprise."
        primaryCta={{ label: 'Try Reattend Enterprise free', href: '/sandbox' }}
        secondaryCta={{ label: 'See how it works', href: '/how-it-works' }}
      />

      {/* Tool categories */}
      {categories.map((category) => (
        <section key={category.title} className="relative px-5 sm:px-8 pb-16">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.4 }}
              className="mb-6"
            >
              <h2
                style={{
                  fontFamily: 'var(--font-display), serif',
                  fontWeight: 400,
                  fontSize: 'clamp(24px, 2.5vw, 32px)',
                  letterSpacing: '-0.015em',
                  color: INK,
                }}
              >
                {category.title}
              </h2>
              <p style={{ fontSize: '14px', color: INK_3, marginTop: '6px' }}>
                {category.subtitle}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.tools.map((tool, i) => (
                <motion.div
                  key={tool.href}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                >
                  <Link
                    href={tool.href}
                    className="group flex flex-col items-start gap-4 p-6 h-full rounded-2xl transition-all hover:-translate-y-0.5"
                    style={{
                      background: PAPER,
                      border: `1px solid ${RULE}`,
                      boxShadow: '0 1px 2px oklch(0.4 0.01 270 / 0.04)',
                    }}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'oklch(0.92 0.04 285)' }}
                      >
                        <tool.icon className="w-5 h-5" style={{ color: ACCENT }} />
                      </div>
                      {tool.badge && (
                        <span
                          className="ml-auto text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            color: 'white',
                            background: ACCENT,
                            fontFamily: 'var(--font-mono), monospace',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3
                        style={{
                          fontFamily: 'var(--font-display), serif',
                          fontWeight: 400,
                          fontSize: '20px',
                          letterSpacing: '-0.01em',
                          color: INK,
                          lineHeight: 1.2,
                        }}
                      >
                        {tool.title}
                      </h3>
                      <p
                        style={{
                          fontSize: '13.5px',
                          color: INK_2,
                          marginTop: '8px',
                          lineHeight: 1.55,
                        }}
                      >
                        {tool.description}
                      </p>
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 mt-auto"
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: ACCENT,
                      }}
                    >
                      Try it free
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <ToolFooterCta variant="tool" headline="Free tools are a great start." />
    </MarketingShell>
  )
}
