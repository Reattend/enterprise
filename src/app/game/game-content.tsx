'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  Compass,
  Grid3X3,
  Scale,
  Eye,
  Timer,
  ToggleLeft,
  HelpCircle,
  Flame,
  UserSearch,
  Trophy,
  Gamepad2,
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

interface Game {
  title: string
  description: string
  href: string
  icon: React.ElementType
  color: string
  bg: string
  badge?: string
  players: string
  multiplayer?: boolean
}

const games: Game[] = [
  {
    title: 'Icebreaker Spinner',
    description: 'Spin the wheel, answer the question. Four categories of icebreakers from fun to deep. Perfect for kicking off any team gathering.',
    href: '/game/icebreaker-spinner',
    icon: Compass,
    color: 'text-orange-600',
    bg: 'bg-gradient-to-br from-orange-500/20 to-amber-500/10',
    badge: 'Popular',
    players: '2-50 players',
  },
  {
    title: 'Team Bingo',
    description: '"Find someone who..." bingo cards for team bonding. Use our defaults or add your own. Print or play on screen.',
    href: '/game/team-bingo',
    icon: Grid3X3,
    color: 'text-pink-600',
    bg: 'bg-gradient-to-br from-pink-500/20 to-rose-500/10',
    badge: 'Popular',
    players: '5-50 players',
    multiplayer: true,
  },
  {
    title: 'Would You Rather',
    description: 'Work-themed dilemmas that reveal how your team thinks. Vote, see the split, debate. Surprisingly revealing.',
    href: '/game/would-you-rather',
    icon: Scale,
    color: 'text-blue-600',
    bg: 'bg-gradient-to-br from-blue-500/20 to-indigo-500/10',
    players: '3-50 players',
    multiplayer: true,
  },
  {
    title: 'Two Truths & A Lie',
    description: 'The classic icebreaker, digitized. Each person enters three statements. The team guesses which one is the lie.',
    href: '/game/two-truths-one-lie',
    icon: Eye,
    color: 'text-emerald-600',
    bg: 'bg-gradient-to-br from-emerald-500/20 to-green-500/10',
    players: '3-20 players',
    multiplayer: true,
  },
  {
    title: '5-Second Challenge',
    description: 'Name 3 things in 5 seconds. Sounds easy until the timer starts. Random categories, maximum pressure, pure chaos.',
    href: '/game/five-second-challenge',
    icon: Timer,
    color: 'text-red-600',
    bg: 'bg-gradient-to-br from-red-500/20 to-orange-500/10',
    players: '2-30 players',
  },
  {
    title: 'This or That',
    description: 'Rapid-fire binary choices. Coffee or tea? Tabs or spaces? See where your team splits and bond over your differences.',
    href: '/game/this-or-that',
    icon: ToggleLeft,
    color: 'text-violet-600',
    bg: 'bg-gradient-to-br from-violet-500/20 to-purple-500/10',
    players: '2-50 players',
    multiplayer: true,
  },
  {
    title: 'Team Trivia',
    description: 'Create custom trivia about your team or company. Share a link and see who really knows the squad.',
    href: '/game/team-trivia',
    icon: HelpCircle,
    color: 'text-amber-600',
    bg: 'bg-gradient-to-br from-amber-500/20 to-yellow-500/10',
    players: '2-50 players',
    multiplayer: true,
  },
  {
    title: 'Hot Takes',
    description: 'Submit anonymous hot takes. Vote agree or disagree. Discover your team\'s most controversial opinions.',
    href: '/game/hot-takes',
    icon: Flame,
    color: 'text-orange-600',
    bg: 'bg-gradient-to-br from-orange-500/20 to-red-500/10',
    players: '4-50 players',
    multiplayer: true,
  },
  {
    title: 'Guess the Colleague',
    description: 'Everyone submits a fun fact anonymously. Guess who said what. The team game that builds real connections.',
    href: '/game/guess-the-colleague',
    icon: UserSearch,
    color: 'text-cyan-600',
    bg: 'bg-gradient-to-br from-cyan-500/20 to-teal-500/10',
    players: '4-30 players',
    multiplayer: true,
  },
  {
    title: 'Team Superlatives',
    description: '"Most likely to reply-all by accident." Vote on fun categories and crown your team\'s superstars.',
    href: '/game/team-superlatives',
    icon: Trophy,
    color: 'text-yellow-600',
    bg: 'bg-gradient-to-br from-yellow-500/20 to-amber-500/10',
    players: '4-30 players',
    multiplayer: true,
  },
]

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <Navbar />

      {/* Background gradient blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#F59E0B]/5 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-40 w-[500px] h-[500px] rounded-full bg-[#EC4899]/5 blur-3xl pointer-events-none" />

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-20 pb-12 px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse" />
            {games.length} free team games
          </span>
          <h1 className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1]">
            Free <span className="bg-gradient-to-r from-[#4F46E5] via-[#EC4899] to-[#F59E0B] bg-clip-text text-transparent">Team Games</span>
          </h1>
          <p className="text-gray-500 mt-4 text-[16px] md:text-[18px] max-w-xl mx-auto">
            TGIF-ready games for team bonding. No signup, no install, no awkward silence. Just fun.
          </p>
        </motion.div>
      </section>

      {/* Join Room Banner */}
      <section className="relative z-10 px-5 pb-8">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/play"
            className="group flex items-center justify-between gap-4 px-6 py-4 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#EC4899] text-white shadow-[0_8px_32px_rgba(79,70,229,0.2)] hover:shadow-[0_12px_48px_rgba(79,70,229,0.3)] hover:scale-[1.01] transition-all"
          >
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-6 h-6" />
              <div>
                <p className="font-bold text-[15px]">Have a room code?</p>
                <p className="text-[13px] text-white/70">Join your team&apos;s game from your phone</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Games Grid */}
      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((game, i) => (
            <motion.div
              key={game.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 + 0.1 }}
            >
              <Link
                href={game.href}
                className="group flex flex-col items-start gap-4 p-6 h-full rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_8px_32px_rgba(79,70,229,0.06)] hover:shadow-[0_12px_48px_rgba(79,70,229,0.14)] hover:scale-[1.02] transition-all"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`w-12 h-12 rounded-xl ${game.bg} flex items-center justify-center shrink-0`}>
                    <game.icon className={`w-6 h-6 ${game.color}`} />
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {game.multiplayer && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] bg-[#4F46E5]/10 px-2 py-0.5 rounded-full">
                        Multiplayer
                      </span>
                    )}
                    {game.badge && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-[#4F46E5] to-[#EC4899] px-2 py-0.5 rounded-full">
                        {game.badge}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-[17px] font-bold group-hover:text-[#4F46E5] transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">
                    {game.description}
                  </p>
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                    {game.players}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#4F46E5]">
                    Play now <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 md:py-28 px-5">
        <div className="max-w-[1200px] mx-auto relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#4F46E5]/10 via-[#818CF8]/5 to-[#C7D2FE]/10 blur-xl" />
          <div className="relative z-10">
            <GlassCard className="max-w-[600px] mx-auto p-10 md:p-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
                <Brain className="h-7 w-7 text-[#4F46E5]" />
              </div>
              <h2 className="text-[22px] font-bold mb-3 text-[#1a1a2e]">Built by Reattend</h2>
              <p className="text-gray-600 text-[14px] mb-6 max-w-md mx-auto">
                Reattend captures every team decision, catches contradictions, and makes your knowledge searchable forever. Games are just the start.
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
