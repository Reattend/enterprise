'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Inbox,
  Brain,
  Search,
  FolderKanban,
  Network,
  Layout,
  Users,
  Shield,
  Zap,
  Sparkles,
  MessageSquare,
  GitBranch,
  Tag,
  FileText,
  Clock,
  Globe,
  Plug,
  Bell,
  Eye,
  Hash,
  Mic,
  Monitor,
  CalendarDays,
  BookOpen,
  Video,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

// ─── Feature Card ───
interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  accent: string
  iconBg: string
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 + 0.1 }}
      className="group relative"
    >
      <div className="relative h-full rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_4px_24px_rgba(79,70,229,0.04)] hover:shadow-[0_8px_40px_rgba(79,70,229,0.12)] transition-all duration-300 p-6 overflow-hidden">
        {/* Subtle gradient accent on hover */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full ${feature.accent} opacity-0 group-hover:opacity-100 blur-3xl transition-opacity duration-500 -translate-y-1/2 translate-x-1/2`} />

        <div className="relative z-10">
          <div className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
            {feature.icon}
          </div>
          <h3 className="text-[16px] font-bold text-[#1a1a2e] mb-2 group-hover:text-[#4F46E5] transition-colors">
            {feature.title}
          </h3>
          <p className="text-[13px] text-[#666] leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Category Data ───
interface Category {
  title: string
  subtitle: string
  gradient: string
  features: Feature[]
}

const categories: Category[] = [
  {
    title: 'Capture',
    subtitle: 'Get knowledge in, fast',
    gradient: 'from-violet-500/10 to-indigo-500/10',
    features: [
      {
        icon: <Inbox className="w-5.5 h-5.5 text-violet-600" />,
        title: 'Smart Inbox',
        description: 'Drop in decisions, notes, links, snippets - anything worth tracking. AI triages and files everything automatically.',
        accent: 'bg-violet-400/20',
        iconBg: 'bg-violet-500/10',
      },
      {
        icon: <Zap className="w-5.5 h-5.5 text-amber-600" />,
        title: 'Quick Capture',
        description: 'Capture a decision in under 5 seconds. Type it, paste it, or use keyboard shortcuts. Zero friction.',
        accent: 'bg-amber-400/20',
        iconBg: 'bg-amber-500/10',
      },
      {
        icon: <Plug className="w-5.5 h-5.5 text-emerald-600" />,
        title: 'Integrations',
        description: 'Pull in context from Slack, Google Drive, Notion, Jira, GitHub, Zoom, and more. Your tools, connected.',
        accent: 'bg-emerald-400/20',
        iconBg: 'bg-emerald-500/10',
      },
      {
        icon: <MessageSquare className="w-5.5 h-5.5 text-blue-600" />,
        title: 'Meeting Capture',
        description: 'Record meetings, capture transcripts, and extract decisions and action items. Never miss what was decided.',
        accent: 'bg-blue-400/20',
        iconBg: 'bg-blue-500/10',
      },
    ],
  },
  {
    title: 'Organize',
    subtitle: 'AI does the filing',
    gradient: 'from-emerald-500/10 to-teal-500/10',
    features: [
      {
        icon: <Sparkles className="w-5.5 h-5.5 text-[#4F46E5]" />,
        title: 'AI Triage Agent',
        description: 'Every new item is automatically analyzed, tagged, linked to related decisions, and filed into the right project.',
        accent: 'bg-indigo-400/20',
        iconBg: 'bg-[#4F46E5]/10',
      },
      {
        icon: <FolderKanban className="w-5.5 h-5.5 text-teal-600" />,
        title: 'Auto Projects',
        description: 'AI suggests project groupings based on your content. Approve with one click. No manual folder management.',
        accent: 'bg-teal-400/20',
        iconBg: 'bg-teal-500/10',
      },
      {
        icon: <Tag className="w-5.5 h-5.5 text-orange-600" />,
        title: 'Smart Tags & Entities',
        description: 'People, topics, tools, and concepts are automatically extracted and linked. Your knowledge graph builds itself.',
        accent: 'bg-orange-400/20',
        iconBg: 'bg-orange-500/10',
      },
      {
        icon: <GitBranch className="w-5.5 h-5.5 text-pink-600" />,
        title: 'Auto Linking',
        description: 'Related decisions are connected automatically - same topic, same people, cause and effect, contradictions.',
        accent: 'bg-pink-400/20',
        iconBg: 'bg-pink-500/10',
      },
    ],
  },
  {
    title: 'Recall',
    subtitle: 'Find anything, instantly',
    gradient: 'from-blue-500/10 to-cyan-500/10',
    features: [
      {
        icon: <Brain className="w-5.5 h-5.5 text-purple-600" />,
        title: 'Ask AI',
        description: 'Ask questions in plain English. "What did we decide about pricing?" - and get answers with sources.',
        accent: 'bg-purple-400/20',
        iconBg: 'bg-purple-500/10',
      },
      {
        icon: <Search className="w-5.5 h-5.5 text-cyan-600" />,
        title: 'Semantic Search',
        description: 'Search by meaning, not keywords. Find the decision about "that CI thing from last month" even if you never typed those words.',
        accent: 'bg-cyan-400/20',
        iconBg: 'bg-cyan-500/10',
      },
      {
        icon: <Network className="w-5.5 h-5.5 text-[#4F46E5]" />,
        title: 'Knowledge Graph',
        description: 'See how decisions connect. Explore a visual graph of your team\'s knowledge - filter by time, people, projects.',
        accent: 'bg-indigo-400/20',
        iconBg: 'bg-[#4F46E5]/10',
      },
      {
        icon: <Clock className="w-5.5 h-5.5 text-rose-600" />,
        title: 'Start Today',
        description: 'Every morning, get a briefing of yesterday\'s decisions, pending action items, and relevant context for today.',
        accent: 'bg-rose-400/20',
        iconBg: 'bg-rose-500/10',
      },
    ],
  },
  {
    title: 'Collaborate',
    subtitle: 'Your team\'s shared brain',
    gradient: 'from-amber-500/10 to-orange-500/10',
    features: [
      {
        icon: <Users className="w-5.5 h-5.5 text-blue-600" />,
        title: 'Team Workspaces',
        description: 'Personal + team workspaces. Share what matters, keep what\'s private. Full access control.',
        accent: 'bg-blue-400/20',
        iconBg: 'bg-blue-500/10',
      },
      {
        icon: <Layout className="w-5.5 h-5.5 text-amber-600" />,
        title: 'Whiteboard / Canvas',
        description: 'Spatially organize decisions on a Miro-like canvas. Drag, connect, annotate. Think visually.',
        accent: 'bg-amber-400/20',
        iconBg: 'bg-amber-500/10',
      },
      {
        icon: <Bell className="w-5.5 h-5.5 text-red-600" />,
        title: 'Smart Notifications',
        description: 'Get notified about pending decisions, action items, and relevant updates. Never drop the ball.',
        accent: 'bg-red-400/20',
        iconBg: 'bg-red-500/10',
      },
      {
        icon: <FileText className="w-5.5 h-5.5 text-emerald-600" />,
        title: 'Activity Feed',
        description: 'See what your team captured, decided, and linked. Full transparency without the noise.',
        accent: 'bg-emerald-400/20',
        iconBg: 'bg-emerald-500/10',
      },
    ],
  },
  {
    title: 'Security & Privacy',
    subtitle: 'Your data, your rules',
    gradient: 'from-slate-500/10 to-gray-500/10',
    features: [
      {
        icon: <Shield className="w-5.5 h-5.5 text-slate-700" />,
        title: 'Privacy First',
        description: 'Your knowledge stays yours. We don\'t sell data, don\'t train on your content, and give you full deletion control.',
        accent: 'bg-slate-400/20',
        iconBg: 'bg-slate-500/10',
      },
      {
        icon: <Eye className="w-5.5 h-5.5 text-[#4F46E5]" />,
        title: 'Access Control',
        description: 'Role-based permissions. Personal vs shared workspaces. You decide who sees what.',
        accent: 'bg-indigo-400/20',
        iconBg: 'bg-[#4F46E5]/10',
      },
    ],
  },
  {
    title: 'Free Tools',
    subtitle: 'Useful on their own, better with Reattend',
    gradient: 'from-indigo-500/10 to-violet-500/10',
    features: [
      {
        icon: <Hash className="w-5.5 h-5.5 text-[#4F46E5]" />,
        title: 'Slack Standup Bot',
        description: 'Async daily standups in Slack. Automated DMs, scheduled summaries, custom questions. Free Geekbot alternative.',
        accent: 'bg-indigo-400/20',
        iconBg: 'bg-[#4F46E5]/10',
      },
      {
        icon: <Video className="w-5.5 h-5.5 text-red-600" />,
        title: 'Meeting Recorder',
        description: 'Record meetings in your browser. Transcripts and summaries sent to everyone automatically.',
        accent: 'bg-red-400/20',
        iconBg: 'bg-red-500/10',
      },
      {
        icon: <Monitor className="w-5.5 h-5.5 text-cyan-600" />,
        title: 'Screen Recorder',
        description: 'Record your screen with one click. No installs, no signups. Download instantly.',
        accent: 'bg-cyan-400/20',
        iconBg: 'bg-cyan-500/10',
      },
      {
        icon: <Mic className="w-5.5 h-5.5 text-orange-600" />,
        title: 'Voice Recorder',
        description: 'Record voice memos in your browser. Simple, private, works offline.',
        accent: 'bg-orange-400/20',
        iconBg: 'bg-orange-500/10',
      },
      {
        icon: <CalendarDays className="w-5.5 h-5.5 text-teal-600" />,
        title: 'Daily Planner',
        description: 'Plan your day with time blocks, priorities, and focus sessions. Distraction-free.',
        accent: 'bg-teal-400/20',
        iconBg: 'bg-teal-500/10',
      },
      {
        icon: <BookOpen className="w-5.5 h-5.5 text-indigo-600" />,
        title: 'Work Journal',
        description: 'Track what you accomplished each day. Build a record you can look back on.',
        accent: 'bg-indigo-400/20',
        iconBg: 'bg-indigo-500/10',
      },
    ],
  },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <Navbar />

      {/* Background gradient blobs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-[#4F46E5]/[0.04] blur-[100px]" />
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] rounded-full bg-[#7C3AED]/[0.04] blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/[0.03] blur-[120px]" />
      </div>

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-20 pb-12 px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
            Decision intelligence features
          </span>
          <h1 className="text-[36px] md:text-[50px] font-extrabold tracking-[-0.03em] leading-[1.08]">
            Features that make
            <br />
            <span className="text-[#4F46E5]">decisions stick</span>
          </h1>
          <p className="text-[#666] mt-5 text-[16px] md:text-[17px] max-w-2xl mx-auto leading-relaxed">
            Capture decisions, let AI track contradictions, and recall any decision or context instantly.
            Your team&apos;s decision intelligence - always tracking, always connecting.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[15px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              Start free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/tool"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-[#4F46E5]/20 hover:border-[#4F46E5]/40 text-[#4F46E5] font-bold text-[15px] transition-colors"
            >
              Explore free tools
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Feature Categories */}
      {categories.map((category) => (
        <section key={category.title} className="relative z-10 px-5 pb-16">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r ${category.gradient} text-[12px] font-semibold tracking-wide uppercase text-[#4F46E5] mb-3`}>
                {category.title}
              </div>
              <h2 className="text-[24px] md:text-[28px] font-bold text-[#1a1a2e]">{category.subtitle}</h2>
            </motion.div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {category.features.map((feature, i) => (
                <FeatureCard key={feature.title} feature={feature} index={i} />
              ))}
            </div>
          </div>
        </section>
      ))}

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
            <h2 className="text-[22px] font-bold mb-3 text-[#1a1a2e]">Ready to stop re-deciding?</h2>
            <p className="text-gray-600 text-[14px] mb-6 max-w-md mx-auto">
              Your team&apos;s decisions deserve better than scattered docs and forgotten Slack threads.
              Give them a permanent home.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              Try Reattend free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  )
}
