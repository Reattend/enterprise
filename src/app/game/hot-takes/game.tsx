'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Plus,
  ChevronRight,
  Trophy,
  Zap,
  TrendingDown,
  Users,
  Play,
} from 'lucide-react'
import { GlassCard } from '@/components/game/glass-card'
import { GameLayout } from '@/components/game/game-layout'
import { TeamNameInput } from '@/components/game/team-name-input'
import { RoomLobby } from '@/components/game/room-lobby'
import { PlayerWaiting } from '@/components/game/player-waiting'
import { RoomBar } from '@/components/game/room-bar'
import { useGameRoom } from '@/hooks/use-game-room'
import { useLocalGameState } from '@/hooks/use-local-game-state'
import type { UseGameRoomReturn } from '@/hooks/use-game-room'

// ---------- Sample Hot Takes ----------

const sampleHotTakes: string[] = [
  'Monday meetings should be banned',
  'Reply-all should require a confirmation dialog',
  'Pineapple belongs on pizza',
  'Remote work is better than office work',
  'Meetings that could be emails should be fined',
  'Dark mode is overrated',
  'Agile is just organized chaos',
  'Coffee is overrated',
  'Open office plans are terrible',
  'Emojis in professional emails are fine',
  'Working from a coffee shop is not real productivity',
  'Stand-ups should be replaced by async check-ins',
  'Unlimited PTO is a trap',
  'Slack is worse than email',
  'AI will replace most meetings',
]

// ---------- Types ----------

interface HotTake {
  id: number
  text: string
  agrees: number
  disagrees: number
}

interface LocalGameState {
  takes: HotTake[]
  nextId: number
  phase: 'submit' | 'vote'
  shuffledTakes: HotTake[]
  currentIndex: number
  finished: boolean
}

const initialLocalState: LocalGameState = {
  takes: sampleHotTakes.map((text, i) => ({
    id: i + 1,
    text,
    agrees: 0,
    disagrees: 0,
  })),
  nextId: sampleHotTakes.length + 1,
  phase: 'submit',
  shuffledTakes: [],
  currentIndex: 0,
  finished: false,
}

// ---------- Shared sub-components ----------

function HotTakesHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-300/40 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-orange-600 mb-6">
        <Flame className="w-3.5 h-3.5" />
        Free team game
      </span>
      <h1 className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1]">
        Hot Takes{' '}
        <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
          Board
        </span>
      </h1>
      <p className="text-gray-500 mt-4 text-[16px] md:text-[18px] max-w-xl mx-auto">
        Submit anonymous hot takes and vote agree or disagree.
        Discover your team&apos;s most controversial opinions.
      </p>
    </motion.div>
  )
}

function HotTakesBgBlobs() {
  return (
    <>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-orange-400/10 via-red-400/8 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-60 -left-40 w-[500px] h-[500px] rounded-full bg-orange-400/8 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-40 w-[500px] h-[500px] rounded-full bg-red-400/8 blur-3xl pointer-events-none" />
    </>
  )
}

function HotTakesHowToPlay() {
  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <GlassCard className="p-8 md:p-10">
          <h2 className="text-[22px] font-bold mb-6 text-center">How to Play</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
                1
              </div>
              <h3 className="font-bold text-[15px] mb-1">Submit hot takes</h3>
              <p className="text-gray-500 text-[13px]">
                Add your anonymous hot takes and unpopular opinions. Start with the samples or write your own.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
                2
              </div>
              <h3 className="font-bold text-[15px] mb-1">Vote as a team</h3>
              <p className="text-gray-500 text-[13px]">
                Each take appears one at a time. Everyone votes agree or disagree. See the split after each vote.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-600 to-red-600 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
                3
              </div>
              <h3 className="font-bold text-[15px] mb-1">See the results</h3>
              <p className="text-gray-500 text-[13px]">
                Discover the most agreed, most controversial, and most disagreed hot takes on your team.
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}

function HotTakesCTA() {
  return (
    <section className="relative z-10 py-16 md:py-20 px-5">
      <div className="max-w-[1200px] mx-auto relative">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#4F46E5]/10 via-[#818CF8]/5 to-[#C7D2FE]/10 blur-xl" />
        <div className="relative z-10">
          <GlassCard className="max-w-[600px] mx-auto p-10 md:p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
              <Brain className="h-7 w-7 text-[#4F46E5]" />
            </div>
            <h2 className="text-[22px] font-bold mb-3 text-[#1a1a2e]">Built by Reattend</h2>
            <p className="text-gray-600 text-[14px] mb-6 max-w-md mx-auto">
              Reattend captures every team decision and makes your knowledge searchable forever.
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
  )
}

/** Shared leaderboard results component used by both local and host modes */
function LeaderboardResults({
  takes,
  onPlayAgain,
}: {
  takes: HotTake[]
  onPlayAgain?: () => void
}) {
  const voted = takes.filter((t) => t.agrees + t.disagrees > 0)

  const sorted = [...voted].sort((a, b) => {
    const aPct = a.agrees / (a.agrees + a.disagrees)
    const bPct = b.agrees / (b.agrees + b.disagrees)
    return bPct - aPct
  })

  const mostAgreed = sorted[0] || null
  const mostDisagreed = sorted[sorted.length - 1] || null

  const mostControversial =
    [...voted].sort((a, b) => {
      const aTotal = a.agrees + a.disagrees
      const bTotal = b.agrees + b.disagrees
      const aDiff = Math.abs(a.agrees / aTotal - 0.5)
      const bDiff = Math.abs(b.agrees / bTotal - 0.5)
      return aDiff - bDiff
    })[0] || null

  const cards = [
    {
      label: 'Most Agreed',
      icon: <ThumbsUp className="w-6 h-6" />,
      take: mostAgreed,
      color: 'from-emerald-500 to-green-500',
      lightBg: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-600',
      badgeIcon: <Trophy className="w-4 h-4" />,
    },
    {
      label: 'Most Controversial',
      icon: <Zap className="w-6 h-6" />,
      take: mostControversial,
      color: 'from-orange-500 to-red-500',
      lightBg: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-600',
      badgeIcon: <Flame className="w-4 h-4" />,
    },
    {
      label: 'Most Disagreed',
      icon: <ThumbsDown className="w-6 h-6" />,
      take: mostDisagreed,
      color: 'from-red-500 to-rose-500',
      lightBg: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-600',
      badgeIcon: <TrendingDown className="w-4 h-4" />,
    },
  ]

  return (
    <div>
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_32px_rgba(249,115,22,0.3)]">
            <Trophy className="w-10 h-10 text-white" />
          </div>
        </motion.div>
        <h2 className="text-[28px] md:text-[36px] font-bold">
          The{' '}
          <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
            Results
          </span>{' '}
          Are In
        </h2>
        <p className="text-gray-500 text-[15px] mt-2">
          Here are your team&apos;s hottest takes
        </p>
      </div>

      <div className="space-y-4">
        {cards.map((card, i) => {
          if (!card.take) return null
          const total = card.take.agrees + card.take.disagrees
          const aPct = total > 0 ? Math.round((card.take.agrees / total) * 100) : 0
          const dPct = total > 0 ? 100 - aPct : 0
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
              className={`${card.lightBg} border-2 ${card.borderColor} rounded-2xl p-6 md:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)]`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${card.color} text-white text-[12px] font-bold uppercase tracking-wider`}
                >
                  {card.badgeIcon}
                  {card.label}
                </span>
              </div>
              <p className="text-[20px] md:text-[24px] font-bold text-[#1a1a2e] mb-4">
                &ldquo;{card.take.text}&rdquo;
              </p>
              <div className="flex items-center justify-between text-[13px] font-bold mb-1.5">
                <span className="text-emerald-600">{aPct}% Agree</span>
                <span className="text-red-500">{dPct}% Disagree</span>
              </div>
              <div className="w-full h-4 bg-white rounded-full overflow-hidden flex">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${aPct}%` }}
                  transition={{ duration: 0.8, delay: 0.4 + i * 0.15 }}
                />
                <motion.div
                  className="h-full bg-gradient-to-r from-red-400 to-red-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${dPct}%` }}
                  transition={{ duration: 0.8, delay: 0.4 + i * 0.15 }}
                />
              </div>
              <p className="text-gray-400 text-[12px] mt-1.5">
                {total} vote{total !== 1 ? 's' : ''}
              </p>
            </motion.div>
          )
        })}
      </div>

      {onPlayAgain && (
        <div className="text-center mt-8">
          <motion.button
            onClick={onPlayAgain}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-[16px] shadow-[0_4px_16px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_24px_rgba(249,115,22,0.4)] transition-all"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <Flame className="w-5 h-5" />
            Play Again
          </motion.button>
        </div>
      )}
    </div>
  )
}

// ==========================================================================
// LOCAL MODE
// ==========================================================================

function HotTakesLocal({ playerName }: { playerName: string }) {
  const [gameState, setGameState, clearGameState] = useLocalGameState<LocalGameState>(
    'reattend-hot-takes-local',
    initialLocalState
  )

  const { takes, nextId, phase, shuffledTakes, currentIndex, finished } = gameState

  const [inputText, setInputText] = useState('')
  const [hasVoted, setHasVoted] = useState(false)

  // ---------- Submit Phase Handlers ----------

  const addTake = useCallback(() => {
    const trimmed = inputText.trim()
    if (!trimmed) return
    setGameState((prev) => ({
      ...prev,
      takes: [...prev.takes, { id: prev.nextId, text: trimmed, agrees: 0, disagrees: 0 }],
      nextId: prev.nextId + 1,
    }))
    setInputText('')
  }, [inputText, setGameState])

  const removeTake = useCallback(
    (id: number) => {
      setGameState((prev) => ({
        ...prev,
        takes: prev.takes.filter((t) => t.id !== id),
      }))
    },
    [setGameState]
  )

  const startVoting = useCallback(() => {
    const shuffled = [...takes].sort(() => Math.random() - 0.5)
    setGameState((prev) => ({
      ...prev,
      phase: 'vote',
      shuffledTakes: shuffled,
      currentIndex: 0,
      finished: false,
    }))
    setHasVoted(false)
  }, [takes, setGameState])

  // ---------- Vote Phase Handlers ----------

  const vote = useCallback(
    (type: 'agree' | 'disagree') => {
      if (hasVoted) return
      const takeId = shuffledTakes[currentIndex].id
      setGameState((prev) => ({
        ...prev,
        shuffledTakes: prev.shuffledTakes.map((t) =>
          t.id === takeId
            ? {
                ...t,
                agrees: type === 'agree' ? t.agrees + 1 : t.agrees,
                disagrees: type === 'disagree' ? t.disagrees + 1 : t.disagrees,
              }
            : t
        ),
      }))
      setHasVoted(true)
    },
    [hasVoted, shuffledTakes, currentIndex, setGameState]
  )

  const nextTake = useCallback(() => {
    if (currentIndex + 1 >= shuffledTakes.length) {
      setGameState((prev) => ({ ...prev, finished: true }))
    } else {
      setGameState((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }))
      setHasVoted(false)
    }
  }, [currentIndex, shuffledTakes.length, setGameState])

  const goBackToSubmit = useCallback(() => {
    clearGameState()
    setHasVoted(false)
  }, [clearGameState])

  // ---------- Render helpers ----------

  const currentTake = shuffledTakes[currentIndex] || null
  const currentTotal = currentTake ? currentTake.agrees + currentTake.disagrees : 0
  const agreePercent = currentTotal > 0 ? Math.round((currentTake!.agrees / currentTotal) * 100) : 0
  const disagreePercent = currentTotal > 0 ? 100 - agreePercent : 0

  const resultsContent = finished ? (
    <LeaderboardResults takes={shuffledTakes} onPlayAgain={goBackToSubmit} />
  ) : null

  const gameContent = (
    <AnimatePresence mode="wait">
      {/* ========== SUBMIT PHASE ========== */}
      {phase === 'submit' && (
        <motion.div
          key="submit"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {/* Input area */}
          <GlassCard className="p-6 md:p-8 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-[18px] font-bold">Add a Hot Take</h2>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  addTake()
                }
              }}
              placeholder="Type your anonymous hot take or unpopular opinion..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[16px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none transition-all"
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-[13px] text-gray-400">
                {takes.length} hot take{takes.length !== 1 ? 's' : ''} ready
              </span>
              <motion.button
                onClick={addTake}
                disabled={!inputText.trim()}
                className={`
                  inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-[14px] transition-all
                  ${
                    inputText.trim()
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-[0_4px_14px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_20px_rgba(249,115,22,0.4)]'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
                whileHover={inputText.trim() ? { scale: 1.03 } : {}}
                whileTap={inputText.trim() ? { scale: 0.97 } : {}}
              >
                <Plus className="w-4 h-4" />
                Add Hot Take
              </motion.button>
            </div>
          </GlassCard>

          {/* Takes list */}
          <GlassCard className="p-6 md:p-8 mb-6">
            <h3 className="text-[16px] font-bold mb-4 flex items-center gap-2">
              <span className="text-orange-500">{takes.length}</span> Hot Takes Queued
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <AnimatePresence>
                {takes.map((take) => (
                  <motion.div
                    key={take.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 group"
                  >
                    <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-[14px] text-gray-700 flex-1">{take.text}</span>
                    <button
                      onClick={() => removeTake(take.id)}
                      className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-[18px] leading-none flex-shrink-0"
                      aria-label="Remove take"
                    >
                      &times;
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </GlassCard>

          {/* Start Voting button */}
          <div className="text-center">
            <motion.button
              onClick={startVoting}
              disabled={takes.length < 5}
              className={`
                inline-flex items-center gap-2 px-10 py-4 rounded-full font-bold text-[18px] transition-all
                ${
                  takes.length >= 5
                    ? 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white shadow-[0_6px_24px_rgba(249,115,22,0.35)] hover:shadow-[0_8px_32px_rgba(249,115,22,0.45)]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
              whileHover={takes.length >= 5 ? { scale: 1.04 } : {}}
              whileTap={takes.length >= 5 ? { scale: 0.97 } : {}}
            >
              <Flame className="w-5 h-5" />
              Start Voting
              <ChevronRight className="w-5 h-5" />
            </motion.button>
            {takes.length < 5 && (
              <p className="text-gray-400 text-[13px] mt-3">
                Need at least 5 hot takes to start voting ({5 - takes.length} more needed)
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* ========== VOTE PHASE ========== */}
      {phase === 'vote' && !finished && (
        <motion.div
          key="vote"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {/* Progress */}
          <div className="text-center mb-6">
            <span className="text-[13px] text-gray-400 font-medium">
              Take {currentIndex + 1} of {shuffledTakes.length}
            </span>
            <div className="w-full max-w-xs mx-auto mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${((currentIndex + 1) / shuffledTakes.length) * 100}%`,
                }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Hot Take Card */}
          <AnimatePresence mode="wait">
            {currentTake && (
              <motion.div
                key={currentTake.id}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="bg-white/70 backdrop-blur-xl border-2 border-orange-200 rounded-3xl shadow-[0_12px_48px_rgba(249,115,22,0.1)] p-8 md:p-12 text-center mb-8"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-6 shadow-[0_6px_20px_rgba(249,115,22,0.3)]">
                  <Flame className="w-8 h-8 text-white" />
                </div>

                <p className="text-[24px] sm:text-[30px] md:text-[36px] font-bold leading-[1.3] text-[#1a1a2e]">
                  &ldquo;{currentTake.text}&rdquo;
                </p>

                {/* Vote buttons */}
                {!hasVoted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-center gap-4 mt-8"
                  >
                    <motion.button
                      onClick={() => vote('agree')}
                      className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[18px] shadow-[0_6px_20px_rgba(16,185,129,0.3)] transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ThumbsUp className="w-6 h-6" />
                      Agree
                    </motion.button>
                    <motion.button
                      onClick={() => vote('disagree')}
                      className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-[18px] shadow-[0_6px_20px_rgba(239,68,68,0.3)] transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ThumbsDown className="w-6 h-6" />
                      Disagree
                    </motion.button>
                  </motion.div>
                )}

                {/* Vote results bar */}
                {hasVoted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-8"
                  >
                    <div className="flex items-center justify-between text-[14px] font-bold mb-2">
                      <span className="text-emerald-600 flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" /> {agreePercent}% Agree
                      </span>
                      <span className="text-red-500 flex items-center gap-1">
                        Disagree {disagreePercent}% <ThumbsDown className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden flex">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center"
                        initial={{ width: 0 }}
                        animate={{ width: `${agreePercent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      >
                        {agreePercent >= 15 && (
                          <span className="text-white text-[11px] font-bold">
                            {currentTake.agrees}
                          </span>
                        )}
                      </motion.div>
                      <motion.div
                        className="h-full bg-gradient-to-r from-red-400 to-red-500 flex items-center justify-center"
                        initial={{ width: 0 }}
                        animate={{ width: `${disagreePercent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      >
                        {disagreePercent >= 15 && (
                          <span className="text-white text-[11px] font-bold">
                            {currentTake.disagrees}
                          </span>
                        )}
                      </motion.div>
                    </div>
                    <p className="text-gray-400 text-[12px] mt-2">
                      {currentTotal} vote{currentTotal !== 1 ? 's' : ''} total
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next / Finish buttons */}
          <div className="text-center flex items-center justify-center gap-4">
            {hasVoted && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={nextTake}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-[16px] shadow-[0_4px_16px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_24px_rgba(249,115,22,0.4)] transition-all"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                {currentIndex + 1 >= shuffledTakes.length ? (
                  <>
                    <Trophy className="w-5 h-5" />
                    See Results
                  </>
                ) : (
                  <>
                    Next Take
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <GameLayout
      showResults={finished}
      heroContent={<HotTakesHero />}
      bgBlobs={<HotTakesBgBlobs />}
      howToPlay={<HotTakesHowToPlay />}
      ctaSection={<HotTakesCTA />}
      results={resultsContent}
    >
      {gameContent}
    </GameLayout>
  )
}

// ==========================================================================
// HOST MODE (big screen / projector view)
// ==========================================================================

function HotTakesHost({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const { room, players, updateRoom, getActionsOfType, isConnected } = gameRoom

  const roomPhase = room?.phase || 'lobby'
  const roomState = room?.state || {}

  // Derive takes from actions
  const submissions = useMemo(() => getActionsOfType('submit_take'), [getActionsOfType])
  const votes = useMemo(() => getActionsOfType('vote'), [getActionsOfType])

  // Build takes list with vote tallies
  const allTakes: HotTake[] = useMemo(() => {
    return submissions.map((action, i) => {
      const takeId = action.id
      const takeVotes = votes.filter((v) => v.payload?.takeId === takeId)
      return {
        id: i,
        text: (action.payload?.text as string) || '',
        agrees: takeVotes.filter((v) => v.payload?.vote === 'agree').length,
        disagrees: takeVotes.filter((v) => v.payload?.vote === 'disagree').length,
      }
    })
  }, [submissions, votes])

  const currentTakeIndex: number = roomState.currentTakeIndex ?? 0
  const currentTake = allTakes[currentTakeIndex] || null
  const currentSubmission = submissions[currentTakeIndex] || null

  // Votes for the current take
  const currentTakeVotes = useMemo(() => {
    if (!currentSubmission) return { agrees: 0, disagrees: 0, total: 0 }
    const takeVotes = votes.filter((v) => v.payload?.takeId === currentSubmission.id)
    const agrees = takeVotes.filter((v) => v.payload?.vote === 'agree').length
    const disagrees = takeVotes.filter((v) => v.payload?.vote === 'disagree').length
    return { agrees, disagrees, total: agrees + disagrees }
  }, [currentSubmission, votes])

  const agreePercent =
    currentTakeVotes.total > 0
      ? Math.round((currentTakeVotes.agrees / currentTakeVotes.total) * 100)
      : 0
  const disagreePercent = currentTakeVotes.total > 0 ? 100 - agreePercent : 0

  // ---------- Host controls ----------

  const handleStartVoting = useCallback(async () => {
    await updateRoom({
      phase: 'voting',
      status: 'playing',
      state: { currentTakeIndex: 0 },
    })
  }, [updateRoom])

  const handleNextTake = useCallback(async () => {
    const nextIndex = currentTakeIndex + 1
    if (nextIndex >= allTakes.length) {
      await updateRoom({
        phase: 'results',
        state: { currentTakeIndex },
      })
    } else {
      await updateRoom({
        phase: 'voting',
        state: { currentTakeIndex: nextIndex },
      })
    }
  }, [currentTakeIndex, allTakes.length, updateRoom])

  const handleShowResults = useCallback(async () => {
    await updateRoom({
      phase: 'results',
      state: { currentTakeIndex },
    })
  }, [updateRoom, currentTakeIndex])

  const handlePlayAgain = useCallback(async () => {
    await updateRoom({
      phase: 'submitting',
      status: 'playing',
      state: { currentTakeIndex: 0 },
    })
  }, [updateRoom])

  // ---------- Render ----------

  // Results leaderboard for host
  const resultsContent =
    roomPhase === 'results' ? (
      <LeaderboardResults takes={allTakes} onPlayAgain={handlePlayAgain} />
    ) : null

  const gameContent = (
    <AnimatePresence mode="wait">
      {/* ========== SUBMITTING PHASE ========== */}
      {roomPhase === 'submitting' && (
        <motion.div
          key="host-submitting"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <GlassCard className="p-8 md:p-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-6 shadow-[0_6px_20px_rgba(249,115,22,0.3)]">
              <Flame className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-[28px] md:text-[36px] font-bold mb-3">
              Waiting for{' '}
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Hot Takes
              </span>
              ...
            </h2>
            <p className="text-gray-500 text-[16px] mb-8">
              Players are submitting their anonymous hot takes on their phones.
            </p>

            {/* Live counter */}
            <motion.div
              key={submissions.length}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-orange-50 border-2 border-orange-200 mb-8"
            >
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="text-[24px] font-black text-orange-600">{submissions.length}</span>
              <span className="text-[16px] font-medium text-orange-600">
                take{submissions.length !== 1 ? 's' : ''} submitted
              </span>
            </motion.div>

            {/* Player list */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                {players.length} player{players.length !== 1 ? 's' : ''} connected
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              {players.map((player) => {
                const hasSubmitted = submissions.some((s) => s.playerId === player.playerId)
                return (
                  <span
                    key={player.playerId}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      hasSubmitted
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {hasSubmitted && <span className="text-emerald-500">&#10003;</span>}
                    {player.name}
                  </span>
                )
              })}
            </div>

            {/* Start Voting button */}
            <motion.button
              onClick={handleStartVoting}
              disabled={submissions.length < 2}
              className={`
                inline-flex items-center gap-2 px-10 py-4 rounded-full font-bold text-[18px] transition-all
                ${
                  submissions.length >= 2
                    ? 'bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 text-white shadow-[0_6px_24px_rgba(249,115,22,0.35)] hover:shadow-[0_8px_32px_rgba(249,115,22,0.45)]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
              `}
              whileHover={submissions.length >= 2 ? { scale: 1.04 } : {}}
              whileTap={submissions.length >= 2 ? { scale: 0.97 } : {}}
            >
              <Play className="w-5 h-5" />
              Start Voting
            </motion.button>
            {submissions.length < 2 && (
              <p className="text-gray-400 text-[13px] mt-3">
                Need at least 2 submissions to start
              </p>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* ========== VOTING PHASE ========== */}
      {roomPhase === 'voting' && (
        <motion.div
          key="host-voting"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {/* Progress */}
          <div className="text-center mb-6">
            <span className="text-[13px] text-gray-400 font-medium">
              Take {currentTakeIndex + 1} of {allTakes.length}
            </span>
            <div className="w-full max-w-xs mx-auto mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${((currentTakeIndex + 1) / Math.max(allTakes.length, 1)) * 100}%`,
                }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Hot Take Card */}
          <AnimatePresence mode="wait">
            {currentTake && (
              <motion.div
                key={currentSubmission?.id || currentTakeIndex}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="bg-white/70 backdrop-blur-xl border-2 border-orange-200 rounded-3xl shadow-[0_12px_48px_rgba(249,115,22,0.1)] p-8 md:p-12 text-center mb-8"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-6 shadow-[0_6px_20px_rgba(249,115,22,0.3)]">
                  <Flame className="w-8 h-8 text-white" />
                </div>

                <p className="text-[24px] sm:text-[30px] md:text-[36px] font-bold leading-[1.3] text-[#1a1a2e]">
                  &ldquo;{currentTake.text}&rdquo;
                </p>

                {/* Live vote tally */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8"
                >
                  {currentTakeVotes.total > 0 ? (
                    <>
                      <div className="flex items-center justify-between text-[14px] font-bold mb-2">
                        <span className="text-emerald-600 flex items-center gap-1">
                          <ThumbsUp className="w-4 h-4" /> {agreePercent}% Agree
                        </span>
                        <span className="text-red-500 flex items-center gap-1">
                          Disagree {disagreePercent}% <ThumbsDown className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="w-full h-6 bg-gray-100 rounded-full overflow-hidden flex">
                        <motion.div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center"
                          initial={{ width: 0 }}
                          animate={{ width: `${agreePercent}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        >
                          {agreePercent >= 15 && (
                            <span className="text-white text-[11px] font-bold">
                              {currentTakeVotes.agrees}
                            </span>
                          )}
                        </motion.div>
                        <motion.div
                          className="h-full bg-gradient-to-r from-red-400 to-red-500 flex items-center justify-center"
                          initial={{ width: 0 }}
                          animate={{ width: `${disagreePercent}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        >
                          {disagreePercent >= 15 && (
                            <span className="text-white text-[11px] font-bold">
                              {currentTakeVotes.disagrees}
                            </span>
                          )}
                        </motion.div>
                      </div>
                      <p className="text-gray-400 text-[12px] mt-2">
                        {currentTakeVotes.total} vote{currentTakeVotes.total !== 1 ? 's' : ''} total
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full"
                      />
                      <span className="text-gray-400 text-[14px]">Waiting for votes...</span>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Host control buttons */}
          <div className="text-center flex items-center justify-center gap-4">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleNextTake}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-[16px] shadow-[0_4px_16px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_24px_rgba(249,115,22,0.4)] transition-all"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              {currentTakeIndex + 1 >= allTakes.length ? (
                <>
                  <Trophy className="w-5 h-5" />
                  Show Results
                </>
              ) : (
                <>
                  Next Take
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </motion.button>

            {currentTakeIndex + 1 < allTakes.length && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleShowResults}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border-2 border-orange-300 text-orange-600 font-bold text-[14px] hover:bg-orange-50 transition-all"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <Trophy className="w-4 h-4" />
                Skip to Results
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <GameLayout
      showResults={roomPhase === 'results'}
      heroContent={<HotTakesHero />}
      bgBlobs={<HotTakesBgBlobs />}
      howToPlay={<HotTakesHowToPlay />}
      ctaSection={<HotTakesCTA />}
      results={resultsContent}
      roomBar={
        gameRoom.roomCode ? (
          <RoomBar
            roomCode={gameRoom.roomCode}
            playerCount={players.length}
            isHost={true}
            isConnected={isConnected}
            accentColor="#F97316"
          />
        ) : undefined
      }
    >
      {gameContent}
    </GameLayout>
  )
}

// ==========================================================================
// PLAYER MODE (phone view)
// ==========================================================================

function HotTakesPlayer({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const { room, players, submitAction, getActionsOfType, playerId, isConnected } = gameRoom

  const roomPhase = room?.phase || 'lobby'
  const roomState = room?.state || {}

  const [takeText, setTakeText] = useState('')
  const [hasSubmittedTake, setHasSubmittedTake] = useState(false)
  const [votedTakeIds, setVotedTakeIds] = useState<Set<string>>(new Set())

  // Derive takes from actions
  const submissions = useMemo(() => getActionsOfType('submit_take'), [getActionsOfType])
  const allVotes = useMemo(() => getActionsOfType('vote'), [getActionsOfType])

  // Check if this player already submitted (in case of page refresh)
  const mySubmission = useMemo(
    () => submissions.find((s) => s.playerId === playerId),
    [submissions, playerId]
  )

  useEffect(() => {
    if (mySubmission) setHasSubmittedTake(true)
  }, [mySubmission])

  // Rebuild votedTakeIds from existing votes by this player on reload
  useEffect(() => {
    const myVotes = allVotes.filter((v) => v.playerId === playerId)
    if (myVotes.length > 0) {
      setVotedTakeIds(new Set(myVotes.map((v) => v.payload?.takeId as string)))
    }
  }, [allVotes, playerId])

  const currentTakeIndex: number = roomState.currentTakeIndex ?? 0
  const currentSubmission = submissions[currentTakeIndex] || null
  const hasVotedOnCurrent = currentSubmission ? votedTakeIds.has(currentSubmission.id) : false

  // ---------- Handlers ----------

  const handleSubmitTake = useCallback(async () => {
    const trimmed = takeText.trim()
    if (!trimmed || hasSubmittedTake) return
    await submitAction('submit_take', { text: trimmed })
    setTakeText('')
    setHasSubmittedTake(true)
  }, [takeText, hasSubmittedTake, submitAction])

  const handleVote = useCallback(
    async (voteType: 'agree' | 'disagree') => {
      if (!currentSubmission || hasVotedOnCurrent) return
      await submitAction('vote', {
        takeId: currentSubmission.id,
        vote: voteType,
      })
      setVotedTakeIds((prev) => new Set(prev).add(currentSubmission.id))
    },
    [currentSubmission, hasVotedOnCurrent, submitAction]
  )

  // ---------- Render ----------

  return (
    <GameLayout
      showResults={false}
      heroContent={
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-300/40 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-orange-600 mb-4">
            <Flame className="w-3.5 h-3.5" />
            Hot Takes
          </span>
          <h1 className="text-[28px] md:text-[36px] font-bold tracking-[-0.03em] leading-[1.1]">
            <span className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 bg-clip-text text-transparent">
              Your Turn
            </span>
          </h1>
        </motion.div>
      }
      bgBlobs={<HotTakesBgBlobs />}
      roomBar={
        gameRoom.roomCode ? (
          <RoomBar
            roomCode={gameRoom.roomCode}
            playerCount={players.length}
            isHost={false}
            isConnected={isConnected}
            accentColor="#F97316"
          />
        ) : undefined
      }
    >
      <AnimatePresence mode="wait">
        {/* ========== SUBMITTING PHASE ========== */}
        {roomPhase === 'submitting' && !hasSubmittedTake && (
          <motion.div
            key="player-submit"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-500" />
                <h2 className="text-[18px] font-bold">Your Hot Take</h2>
              </div>
              <textarea
                value={takeText}
                onChange={(e) => setTakeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmitTake()
                  }
                }}
                placeholder="Type your anonymous hot take..."
                rows={4}
                autoFocus
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[16px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 resize-none transition-all"
              />
              <motion.button
                onClick={handleSubmitTake}
                disabled={!takeText.trim()}
                className={`
                  w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-[18px] transition-all
                  ${
                    takeText.trim()
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-[0_6px_20px_rgba(249,115,22,0.3)]'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
                whileHover={takeText.trim() ? { scale: 1.02 } : {}}
                whileTap={takeText.trim() ? { scale: 0.97 } : {}}
              >
                <Flame className="w-5 h-5" />
                Submit Hot Take
              </motion.button>
            </GlassCard>
          </motion.div>
        )}

        {/* Submitted + waiting */}
        {roomPhase === 'submitting' && hasSubmittedTake && (
          <motion.div
            key="player-submit-waiting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <PlayerWaiting
              hasSubmitted
              submittedMessage="Hot take submitted!"
              message="Waiting for the host to start voting..."
              accentColor="#F97316"
              roomCode={gameRoom.roomCode || undefined}
            />
          </motion.div>
        )}

        {/* ========== VOTING PHASE ========== */}
        {roomPhase === 'voting' && !hasVotedOnCurrent && currentSubmission && (
          <motion.div
            key={`player-vote-${currentSubmission.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <GlassCard className="p-6 md:p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4 shadow-[0_4px_16px_rgba(249,115,22,0.3)]">
                <Flame className="w-7 h-7 text-white" />
              </div>

              <p className="text-[13px] text-gray-400 font-medium mb-2">
                Take {currentTakeIndex + 1} of {submissions.length}
              </p>

              <p className="text-[22px] sm:text-[26px] font-bold leading-[1.3] text-[#1a1a2e] mb-8">
                &ldquo;{(currentSubmission.payload?.text as string) || ''}&rdquo;
              </p>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => handleVote('agree')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[18px] shadow-[0_6px_20px_rgba(16,185,129,0.3)] transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ThumbsUp className="w-6 h-6" />
                  Agree
                </motion.button>
                <motion.button
                  onClick={() => handleVote('disagree')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-[18px] shadow-[0_6px_20px_rgba(239,68,68,0.3)] transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ThumbsDown className="w-6 h-6" />
                  Disagree
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Voted on current, waiting for host */}
        {roomPhase === 'voting' && hasVotedOnCurrent && (
          <motion.div
            key="player-vote-waiting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <PlayerWaiting
              hasSubmitted
              submittedMessage="Vote recorded!"
              message="Waiting for the next take..."
              accentColor="#F97316"
              roomCode={gameRoom.roomCode || undefined}
            />
          </motion.div>
        )}

        {/* ========== RESULTS PHASE ========== */}
        {roomPhase === 'results' && (
          <motion.div
            key="player-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <GlassCard className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_32px_rgba(249,115,22,0.3)]">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
              </motion.div>
              <h2 className="text-[24px] font-bold mb-2">
                Game{' '}
                <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  Over!
                </span>
              </h2>
              <p className="text-gray-500 text-[15px]">
                Check the big screen for the results.
              </p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </GameLayout>
  )
}

// ==========================================================================
// ROOM MODE WRAPPER
// ==========================================================================

function HotTakesRoom({ playerName }: { playerName: string }) {
  const gameRoom = useGameRoom({ gameType: 'hot-takes' })

  // If no room exists yet, show lobby / joining state
  if (!gameRoom.room) {
    if (gameRoom.isLoading) {
      return (
        <GameLayout
          showResults={false}
          heroContent={<HotTakesHero />}
          bgBlobs={<HotTakesBgBlobs />}
        >
          <div className="text-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-gray-500">Connecting to room...</p>
          </div>
        </GameLayout>
      )
    }

    if (gameRoom.error) {
      return (
        <GameLayout
          showResults={false}
          heroContent={<HotTakesHero />}
          bgBlobs={<HotTakesBgBlobs />}
        >
          <GlassCard className="p-8 text-center">
            <p className="text-red-500 font-medium mb-4">{gameRoom.error}</p>
            <Link
              href="/game/hot-takes"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-[14px]"
            >
              <ArrowRight className="w-4 h-4" />
              Back to Hot Takes
            </Link>
          </GlassCard>
        </GameLayout>
      )
    }

    // Show lobby (waiting to join / host creating room)
    return (
      <GameLayout
        showResults={false}
        heroContent={<HotTakesHero />}
        bgBlobs={<HotTakesBgBlobs />}
      >
        <RoomLobby
          roomCode={gameRoom.roomCode || '----'}
          players={gameRoom.players}
          isHost={gameRoom.isHost}
          onStart={async () => {
            await gameRoom.updateRoom({
              phase: 'submitting',
              status: 'playing',
              state: { currentTakeIndex: 0 },
            })
          }}
          minPlayers={2}
          accentColor="#F97316"
          gameTitle="Hot Takes"
        />
      </GameLayout>
    )
  }

  // Room is in lobby phase
  if (gameRoom.room.status === 'lobby') {
    return (
      <GameLayout
        showResults={false}
        heroContent={<HotTakesHero />}
        bgBlobs={<HotTakesBgBlobs />}
        roomBar={
          gameRoom.roomCode ? (
            <RoomBar
              roomCode={gameRoom.roomCode}
              playerCount={gameRoom.players.length}
              isHost={gameRoom.isHost}
              isConnected={gameRoom.isConnected}
              accentColor="#F97316"
            />
          ) : undefined
        }
      >
        <RoomLobby
          roomCode={gameRoom.roomCode || '----'}
          players={gameRoom.players}
          isHost={gameRoom.isHost}
          onStart={async () => {
            await gameRoom.updateRoom({
              phase: 'submitting',
              status: 'playing',
              state: { currentTakeIndex: 0 },
            })
          }}
          minPlayers={2}
          accentColor="#F97316"
          gameTitle="Hot Takes"
        />
      </GameLayout>
    )
  }

  // Game is active or finished — delegate to host or player view
  if (gameRoom.isHost) {
    return <HotTakesHost gameRoom={gameRoom} />
  }
  return <HotTakesPlayer gameRoom={gameRoom} />
}

// ==========================================================================
// MAIN ENTRY COMPONENT
// ==========================================================================

export function HotTakes() {
  const searchParams = useSearchParams()
  const roomCode = searchParams.get('room')

  const [playerName, setPlayerName] = useState<string | null>(null)
  const [mode, setMode] = useState<'undecided' | 'local' | 'room'>('undecided')

  // Hydrate player name from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('reattend-game-player-name')
    if (stored) setPlayerName(stored)
  }, [])

  // If URL has ?room=, auto-decide room mode
  useEffect(() => {
    if (roomCode) setMode('room')
  }, [roomCode])

  const handleNameContinue = useCallback(
    (name: string) => {
      localStorage.setItem('reattend-game-player-name', name)
      setPlayerName(name)
      // If no room code, and mode is undecided, go local
      if (!roomCode && mode === 'undecided') {
        setMode('local')
      }
    },
    [roomCode, mode]
  )

  const handleCreateRoom = useCallback(() => {
    setMode('room')
  }, [])

  const handleJoinRoom = useCallback(() => {
    // The TeamNameInput "Join Room" triggers this. We set mode to room, and
    // the user will be prompted for a code via the lobby flow below.
    setMode('room')
  }, [])

  // Step 1: Need player name
  if (!playerName) {
    return (
      <GameLayout
        showResults={false}
        heroContent={<HotTakesHero />}
        bgBlobs={<HotTakesBgBlobs />}
        howToPlay={<HotTakesHowToPlay />}
        ctaSection={<HotTakesCTA />}
      >
        <TeamNameInput
          onContinue={handleNameContinue}
          showRoomOptions={!roomCode}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          accentFrom="#F97316"
          accentTo="#EF4444"
        />
      </GameLayout>
    )
  }

  // Step 2: Have name but need to pick mode (or mode already decided)
  if (mode === 'undecided' && !roomCode) {
    // Show the team name input with room options (they already have a name, so auto-continue)
    return (
      <GameLayout
        showResults={false}
        heroContent={<HotTakesHero />}
        bgBlobs={<HotTakesBgBlobs />}
        howToPlay={<HotTakesHowToPlay />}
        ctaSection={<HotTakesCTA />}
      >
        <TeamNameInput
          onContinue={() => setMode('local')}
          showRoomOptions={true}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          accentFrom="#F97316"
          accentTo="#EF4444"
        />
      </GameLayout>
    )
  }

  // Step 3a: Room mode (join room flow when no ?room= param)
  if (mode === 'room' && !roomCode) {
    return <HotTakesRoomCreator playerName={playerName} />
  }

  // Step 3b: Room mode with room code
  if (mode === 'room' && roomCode) {
    return <HotTakesRoom playerName={playerName} />
  }

  // Step 3c: Local mode
  return <HotTakesLocal playerName={playerName} />
}

// ---------- Room Creator (when user clicks "Create Room" or "Join Room" without a code) ----------

function HotTakesRoomCreator({ playerName }: { playerName: string }) {
  const gameRoom = useGameRoom({ gameType: 'hot-takes' })
  const [joinCode, setJoinCode] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = useCallback(async () => {
    setIsCreating(true)
    try {
      await gameRoom.createRoom()
    } catch {
      // error is in gameRoom.error
    } finally {
      setIsCreating(false)
    }
  }, [gameRoom])

  const handleJoin = useCallback(async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    try {
      await gameRoom.joinRoom(code)
    } catch {
      // error is in gameRoom.error
    }
  }, [joinCode, gameRoom])

  // Once we have a room, render the full room flow
  if (gameRoom.room) {
    if (gameRoom.room.status === 'lobby') {
      return (
        <GameLayout
          showResults={false}
          heroContent={<HotTakesHero />}
          bgBlobs={<HotTakesBgBlobs />}
          roomBar={
            gameRoom.roomCode ? (
              <RoomBar
                roomCode={gameRoom.roomCode}
                playerCount={gameRoom.players.length}
                isHost={gameRoom.isHost}
                isConnected={gameRoom.isConnected}
                accentColor="#F97316"
              />
            ) : undefined
          }
        >
          <RoomLobby
            roomCode={gameRoom.roomCode || '----'}
            players={gameRoom.players}
            isHost={gameRoom.isHost}
            onStart={async () => {
              await gameRoom.updateRoom({
                phase: 'submitting',
                status: 'playing',
                state: { currentTakeIndex: 0 },
              })
            }}
            minPlayers={2}
            accentColor="#F97316"
            gameTitle="Hot Takes"
          />
        </GameLayout>
      )
    }

    // Game active/finished
    if (gameRoom.isHost) {
      return <HotTakesHost gameRoom={gameRoom} />
    }
    return <HotTakesPlayer gameRoom={gameRoom} />
  }

  // No room yet — show create/join UI
  return (
    <GameLayout
      showResults={false}
      heroContent={<HotTakesHero />}
      bgBlobs={<HotTakesBgBlobs />}
      howToPlay={<HotTakesHowToPlay />}
      ctaSection={<HotTakesCTA />}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto"
      >
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/10 flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-orange-500" />
          </div>

          <h2 className="text-xl font-bold mb-2">Multiplayer</h2>
          <p className="text-sm text-gray-500 mb-6">
            Playing as <span className="font-bold text-orange-600">{playerName}</span>
          </p>

          {gameRoom.error && (
            <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {gameRoom.error}
            </div>
          )}

          {!showJoin ? (
            <div className="space-y-3">
              <motion.button
                onClick={handleCreate}
                disabled={isCreating || gameRoom.isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-[15px] transition-all shadow-[0_4px_16px_rgba(249,115,22,0.3)] disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isCreating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Room
                  </>
                )}
              </motion.button>
              <button
                onClick={() => setShowJoin(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-2 border-orange-300 text-orange-600 font-bold text-[15px] transition-all hover:bg-orange-50"
              >
                <Users className="w-4 h-4" />
                Join Room
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleJoin()
                }}
                placeholder="Enter room code"
                maxLength={6}
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-center text-lg font-mono font-bold tracking-[0.2em] uppercase focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowJoin(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-500 font-medium text-[14px] hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <motion.button
                  onClick={handleJoin}
                  disabled={!joinCode.trim() || gameRoom.isLoading}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-[14px] transition-all
                    ${
                      joinCode.trim()
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-[0_4px_16px_rgba(249,115,22,0.3)]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                  whileHover={joinCode.trim() ? { scale: 1.02 } : {}}
                  whileTap={joinCode.trim() ? { scale: 0.98 } : {}}
                >
                  {gameRoom.isLoading ? 'Joining...' : 'Join'}
                </motion.button>
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </GameLayout>
  )
}
