'use client'

import React, { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Brain, Sparkles, BarChart3, ChevronRight, RotateCcw } from 'lucide-react'
import { GlassCard } from '@/components/game/glass-card'
import { GameLayout } from '@/components/game/game-layout'
import { TeamNameInput } from '@/components/game/team-name-input'
import { RoomLobby } from '@/components/game/room-lobby'
import { PlayerWaiting } from '@/components/game/player-waiting'
import { RoomBar } from '@/components/game/room-bar'
import { useGameRoom, UseGameRoomReturn } from '@/hooks/use-game-room'
import { useLocalGameState } from '@/hooks/use-local-game-state'

// ---------- Question Pairs ----------

const questionPairs: [string, string][] = [
  ['Coffee', 'Tea'],
  ['Morning person', 'Night owl'],
  ['Tabs', 'Spaces'],
  ['Dogs', 'Cats'],
  ['Summer', 'Winter'],
  ['Beach', 'Mountains'],
  ['Call', 'Text'],
  ['Sweet', 'Savory'],
  ['Book', 'Movie'],
  ['Early bird', 'Late riser'],
  ['Introvert', 'Extrovert'],
  ['Mac', 'Windows'],
  ['Remote', 'Office'],
  ['Cooking', 'Ordering in'],
  ['City', 'Countryside'],
  ['Music', 'Podcasts'],
  ['Planning ahead', 'Going with the flow'],
  ['Solo work', 'Team work'],
  ['Minimalist', 'Maximalist'],
  ['Emoji user', 'No emoji'],
  ['Dark mode', 'Light mode'],
  ['Silence', 'Background music'],
  ['Meetings', 'Async updates'],
  ['Sprints', 'Kanban'],
  ['Big team', 'Small team'],
  ['Startup', 'Enterprise'],
  ['Frontend', 'Backend'],
  ['Strict deadlines', 'Flexible timelines'],
  ['Documentation', 'Ship it'],
  ['Rewrite', 'Refactor'],
]

// ---------- Types ----------

type VoteRecord = {
  left: number
  right: number
  revealed: boolean
}

interface LocalState {
  currentIndex: number
  votes: VoteRecord[]
  phase: 'voting' | 'results' | 'summary'
}

const INITIAL_LOCAL_STATE: LocalState = {
  currentIndex: 0,
  votes: questionPairs.map(() => ({ left: 0, right: 0, revealed: false })),
  phase: 'voting',
}

// ---------- Background Blobs ----------

const BgBlobs = () => (
  <>
    <div className="absolute top-0 left-1/4 w-[700px] h-[600px] rounded-full bg-gradient-to-br from-violet-400/10 via-purple-400/8 to-transparent blur-3xl pointer-events-none" />
    <div className="absolute top-40 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-teal-400/10 via-cyan-400/8 to-transparent blur-3xl pointer-events-none" />
    <div className="absolute bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-violet-400/6 blur-3xl pointer-events-none" />
  </>
)

// ---------- Hero Content ----------

const HeroContent = () => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-300/40 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-violet-600 mb-6">
      <Sparkles className="w-3.5 h-3.5" />
      Free team game
    </span>
    <h1 className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1]">
      This or{' '}
      <span className="bg-gradient-to-r from-violet-500 via-purple-500 to-teal-500 bg-clip-text text-transparent">
        That
      </span>
    </h1>
    <p className="text-gray-500 mt-4 text-[16px] md:text-[18px] max-w-xl mx-auto">
      Rapid-fire binary choices for your team. Click a side to vote,
      then reveal where the group splits. Perfect for TGIF and office fun.
    </p>
  </motion.div>
)

// ---------- How To Play ----------

const HowToPlay = () => (
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
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
              1
            </div>
            <h3 className="font-bold text-[15px] mb-1">Vote on a side</h3>
            <p className="text-gray-500 text-[13px]">Everyone clicks their choice. Multiple people can vote on the same screen.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
              2
            </div>
            <h3 className="font-bold text-[15px] mb-1">Reveal the split</h3>
            <p className="text-gray-500 text-[13px]">The host clicks &ldquo;Show Results&rdquo; to see how the team divides. Debate encouraged.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-teal-500 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
              3
            </div>
            <h3 className="font-bold text-[15px] mb-1">Next question</h3>
            <p className="text-gray-500 text-[13px]">Move through all 30 questions, then see the full summary at the end.</p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  </div>
)

// ---------- CTA Section ----------

const CtaSection = () => (
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

// ---------- Split Screen Voting Buttons ----------

function VotingButtons({
  currentPair,
  onVote,
  disabled,
  leftCount,
  rightCount,
  showCounts,
}: {
  currentPair: [string, string]
  onVote: (side: 'left' | 'right') => void
  disabled: boolean
  leftCount?: number
  rightCount?: number
  showCounts?: boolean
}) {
  const [hoveredSide, setHoveredSide] = useState<'left' | 'right' | null>(null)

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4" style={{ minHeight: '340px' }}>
      {/* Left option - Violet */}
      <motion.button
        onClick={() => onVote('left')}
        onMouseEnter={() => setHoveredSide('left')}
        onMouseLeave={() => setHoveredSide(null)}
        className={`
          relative rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer
          transition-all duration-300 border-2
          ${hoveredSide === 'left' ? 'border-violet-400 shadow-[0_12px_40px_rgba(139,92,246,0.3)]' : 'border-transparent shadow-[0_8px_32px_rgba(139,92,246,0.15)]'}
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={disabled}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-violet-600 to-purple-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 md:p-10 min-h-[300px] md:min-h-[340px]">
          <span className="text-white/60 text-[13px] md:text-[14px] font-semibold uppercase tracking-wider mb-3">
            Option A
          </span>
          <span className="text-white text-[28px] sm:text-[36px] md:text-[48px] lg:text-[56px] font-extrabold leading-[1.1] text-center">
            {currentPair[0]}
          </span>
          {showCounts && leftCount !== undefined && leftCount > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[14px] md:text-[16px] font-bold"
            >
              {leftCount} vote{leftCount !== 1 ? 's' : ''}
            </motion.span>
          )}
        </div>
      </motion.button>

      {/* Right option - Teal/Cyan */}
      <motion.button
        onClick={() => onVote('right')}
        onMouseEnter={() => setHoveredSide('right')}
        onMouseLeave={() => setHoveredSide(null)}
        className={`
          relative rounded-2xl md:rounded-3xl overflow-hidden cursor-pointer
          transition-all duration-300 border-2
          ${hoveredSide === 'right' ? 'border-teal-400 shadow-[0_12px_40px_rgba(20,184,166,0.3)]' : 'border-transparent shadow-[0_8px_32px_rgba(20,184,166,0.15)]'}
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={disabled}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-600" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 md:p-10 min-h-[300px] md:min-h-[340px]">
          <span className="text-white/60 text-[13px] md:text-[14px] font-semibold uppercase tracking-wider mb-3">
            Option B
          </span>
          <span className="text-white text-[28px] sm:text-[36px] md:text-[48px] lg:text-[56px] font-extrabold leading-[1.1] text-center">
            {currentPair[1]}
          </span>
          {showCounts && rightCount !== undefined && rightCount > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[14px] md:text-[16px] font-bold"
            >
              {rightCount} vote{rightCount !== 1 ? 's' : ''}
            </motion.span>
          )}
        </div>
      </motion.button>
    </div>
  )
}

// ---------- Results Bar ----------

function ResultsBar({
  leftPercent,
  rightPercent,
  leftLabel,
  rightLabel,
  totalVotes,
}: {
  leftPercent: number
  rightPercent: number
  leftLabel: string
  rightLabel: string
  totalVotes: number
}) {
  return (
    <GlassCard className="p-6 md:p-8">
      {/* Vote bar */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-violet-600 font-bold text-[16px] md:text-[20px] min-w-[60px] text-right">
          {leftPercent}%
        </span>
        <div className="flex-1 h-10 md:h-12 rounded-full overflow-hidden bg-gray-100 flex">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-l-full flex items-center justify-end pr-3"
            initial={{ width: '50%' }}
            animate={{ width: `${leftPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {leftPercent >= 15 && (
              <span className="text-white text-[12px] md:text-[14px] font-bold whitespace-nowrap">
                {leftLabel}
              </span>
            )}
          </motion.div>
          <motion.div
            className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-r-full flex items-center justify-start pl-3"
            initial={{ width: '50%' }}
            animate={{ width: `${rightPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {rightPercent >= 15 && (
              <span className="text-white text-[12px] md:text-[14px] font-bold whitespace-nowrap">
                {rightLabel}
              </span>
            )}
          </motion.div>
        </div>
        <span className="text-teal-600 font-bold text-[16px] md:text-[20px] min-w-[60px]">
          {rightPercent}%
        </span>
      </div>
      <div className="text-center text-gray-400 text-[13px]">
        {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
      </div>
    </GlassCard>
  )
}

// ---------- Summary Screen ----------

function SummaryScreen({
  votes,
  onRestart,
}: {
  votes: VoteRecord[]
  onRestart: () => void
}) {
  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-8">
        <h2 className="text-[28px] md:text-[40px] font-bold">
          Game{' '}
          <span className="bg-gradient-to-r from-violet-500 to-teal-500 bg-clip-text text-transparent">
            Summary
          </span>
        </h2>
        <p className="text-gray-500 mt-2 text-[15px]">
          Here is how your team split on every question.
        </p>
      </div>

      <div className="space-y-3">
        {questionPairs.map(([left, right], idx) => {
          const v = votes[idx]
          const total = v.left + v.right
          const lp = total > 0 ? Math.round((v.left / total) * 100) : 50
          const rp = total > 0 ? 100 - lp : 50
          const hasVotes = total > 0

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <GlassCard className="p-4 md:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium text-gray-400">
                    Q{idx + 1}
                  </span>
                  {hasVotes && (
                    <span className="text-[12px] text-gray-400">
                      {total} vote{total !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-violet-600 font-bold text-[14px] md:text-[16px] min-w-[80px] md:min-w-[120px] text-right truncate">
                    {left}
                  </span>
                  <div className="flex-1 h-7 md:h-8 rounded-full overflow-hidden bg-gray-100 flex">
                    {hasVotes ? (
                      <>
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-l-full flex items-center justify-center"
                          style={{ width: `${lp}%` }}
                        >
                          {lp >= 20 && (
                            <span className="text-white text-[11px] md:text-[12px] font-bold">{lp}%</span>
                          )}
                        </div>
                        <div
                          className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-r-full flex items-center justify-center"
                          style={{ width: `${rp}%` }}
                        >
                          {rp >= 20 && (
                            <span className="text-white text-[11px] md:text-[12px] font-bold">{rp}%</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="h-full w-full bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-400 text-[11px]">No votes</span>
                      </div>
                    )}
                  </div>
                  <span className="text-teal-600 font-bold text-[14px] md:text-[16px] min-w-[80px] md:min-w-[120px] truncate">
                    {right}
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>

      {/* Play again */}
      <div className="text-center mt-8">
        <motion.button
          onClick={onRestart}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-[16px] bg-gradient-to-r from-violet-500 to-teal-500 text-white hover:shadow-[0_8px_32px_rgba(139,92,246,0.3)] shadow-[0_4px_16px_rgba(139,92,246,0.2)] transition-all active:scale-[0.97]"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <RotateCcw className="w-5 h-5" />
          Play Again
        </motion.button>
      </div>
    </motion.div>
  )
}

// ==========================================================================
// LOCAL MODE
// ==========================================================================

function LocalMode() {
  const [gameState, setGameState, clearGameState] = useLocalGameState<LocalState>(
    'reattend-this-or-that-local',
    INITIAL_LOCAL_STATE,
  )

  const { currentIndex, votes, phase } = gameState

  const currentPair = questionPairs[currentIndex]
  const currentVotes = votes[currentIndex]
  const totalVotes = currentVotes.left + currentVotes.right

  const castVote = useCallback((side: 'left' | 'right') => {
    if (phase !== 'voting') return
    setGameState((prev) => {
      const updated = [...prev.votes]
      updated[currentIndex] = {
        ...updated[currentIndex],
        [side]: updated[currentIndex][side] + 1,
      }
      return { ...prev, votes: updated }
    })
  }, [currentIndex, phase, setGameState])

  const showResults = useCallback(() => {
    setGameState((prev) => {
      const updated = [...prev.votes]
      updated[prev.currentIndex] = { ...updated[prev.currentIndex], revealed: true }
      return { ...prev, votes: updated, phase: 'results' }
    })
  }, [setGameState])

  const nextQuestion = useCallback(() => {
    setGameState((prev) => {
      if (prev.currentIndex < questionPairs.length - 1) {
        return { ...prev, currentIndex: prev.currentIndex + 1, phase: 'voting' }
      }
      return { ...prev, phase: 'summary' }
    })
  }, [setGameState])

  const restart = useCallback(() => {
    clearGameState()
  }, [clearGameState])

  const leftPercent = totalVotes > 0 ? Math.round((currentVotes.left / totalVotes) * 100) : 50
  const rightPercent = totalVotes > 0 ? 100 - leftPercent : 50

  const showResult = phase === 'results' || phase === 'summary'

  // Build the game content (children)
  const gameContent = (
    <AnimatePresence mode="wait">
      {phase !== 'summary' ? (
        <motion.div
          key={`question-${currentIndex}`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.4 }}
        >
          {/* Progress indicator */}
          <div className="text-center mb-4">
            <span className="text-[14px] font-semibold text-gray-400">
              Question {currentIndex + 1} of {questionPairs.length}
            </span>
            <div className="w-full max-w-xs mx-auto mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-teal-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / questionPairs.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Split screen voting area */}
          <div className="mt-6">
            <VotingButtons
              currentPair={currentPair}
              onVote={castVote}
              disabled={phase === 'results'}
              leftCount={currentVotes.left}
              rightCount={currentVotes.right}
              showCounts={phase === 'voting'}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {phase === 'voting' && (
              <motion.button
                onClick={showResults}
                disabled={totalVotes === 0}
                className={`
                  inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-[16px]
                  transition-all active:scale-[0.97]
                  ${totalVotes === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-500 to-teal-500 text-white hover:shadow-[0_8px_32px_rgba(139,92,246,0.3)] shadow-[0_4px_16px_rgba(139,92,246,0.2)]'
                  }
                `}
                whileHover={totalVotes > 0 ? { scale: 1.03 } : {}}
                whileTap={totalVotes > 0 ? { scale: 0.97 } : {}}
              >
                <BarChart3 className="w-5 h-5" />
                Show Results
              </motion.button>
            )}

            {phase === 'results' && (
              <motion.button
                onClick={nextQuestion}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-[16px] bg-gradient-to-r from-violet-500 to-teal-500 text-white hover:shadow-[0_8px_32px_rgba(139,92,246,0.3)] shadow-[0_4px_16px_rgba(139,92,246,0.2)] transition-all active:scale-[0.97]"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {currentIndex < questionPairs.length - 1 ? (
                  <>
                    Next Question
                    <ChevronRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    View Summary
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      ) : (
        <SummaryScreen votes={votes} onRestart={restart} />
      )}
    </AnimatePresence>
  )

  // Build the results panel
  const resultsContent = phase === 'results' ? (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <ResultsBar
        leftPercent={leftPercent}
        rightPercent={rightPercent}
        leftLabel={currentPair[0]}
        rightLabel={currentPair[1]}
        totalVotes={totalVotes}
      />
    </motion.div>
  ) : undefined

  return (
    <GameLayout
      showResults={phase === 'results'}
      heroContent={<HeroContent />}
      howToPlay={<HowToPlay />}
      ctaSection={<CtaSection />}
      bgBlobs={<BgBlobs />}
      results={resultsContent}
    >
      {gameContent}
    </GameLayout>
  )
}

// ==========================================================================
// HOST MODE
// ==========================================================================

function HostMode({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const roomState = gameRoom.room?.state as { currentIndex?: number; revealed?: boolean } | null
  const currentIndex = roomState?.currentIndex ?? 0
  const revealed = roomState?.revealed ?? false
  const roomPhase = (gameRoom.room?.phase ?? 'lobby') as string

  const currentPair = questionPairs[currentIndex] ?? questionPairs[0]

  // Tally votes for the current pair from actions
  const voteTally = useMemo(() => {
    const voteActions = gameRoom.getActionsOfType('vote')
    // Only count votes for the current pair index
    // Each player should only have one vote per pair
    const seenPlayers = new Set<string>()
    let left = 0
    let right = 0
    for (const action of voteActions) {
      const payload = action.payload as { pairIndex?: number; choice?: string }
      if (payload.pairIndex === currentIndex && !seenPlayers.has(action.playerId)) {
        seenPlayers.add(action.playerId)
        if (payload.choice === 'left') left++
        if (payload.choice === 'right') right++
      }
    }
    return { left, right }
  }, [gameRoom, currentIndex])

  const totalVotes = voteTally.left + voteTally.right
  const leftPercent = totalVotes > 0 ? Math.round((voteTally.left / totalVotes) * 100) : 50
  const rightPercent = totalVotes > 0 ? 100 - leftPercent : 50

  // Collect all votes for summary
  const allVotes: VoteRecord[] = useMemo(() => {
    const voteActions = gameRoom.getActionsOfType('vote')
    return questionPairs.map((_, idx) => {
      const seenPlayers = new Set<string>()
      let left = 0
      let right = 0
      for (const action of voteActions) {
        const payload = action.payload as { pairIndex?: number; choice?: string }
        if (payload.pairIndex === idx && !seenPlayers.has(action.playerId)) {
          seenPlayers.add(action.playerId)
          if (payload.choice === 'left') left++
          if (payload.choice === 'right') right++
        }
      }
      return { left, right, revealed: true }
    })
  }, [gameRoom])

  const handleStartGame = useCallback(() => {
    gameRoom.updateRoom({
      phase: 'playing',
      state: { currentIndex: 0, revealed: false },
    })
  }, [gameRoom])

  const handleReveal = useCallback(() => {
    gameRoom.updateRoom({
      phase: 'playing',
      state: { currentIndex, revealed: true },
    })
  }, [gameRoom, currentIndex])

  const handleNext = useCallback(() => {
    if (currentIndex < questionPairs.length - 1) {
      gameRoom.updateRoom({
        phase: 'playing',
        state: { currentIndex: currentIndex + 1, revealed: false },
      })
    } else {
      gameRoom.updateRoom({
        phase: 'summary',
        state: { currentIndex, revealed: true },
      })
    }
  }, [gameRoom, currentIndex])

  const handleRestart = useCallback(() => {
    gameRoom.updateRoom({
      phase: 'playing',
      state: { currentIndex: 0, revealed: false },
    })
  }, [gameRoom])

  // Lobby phase
  if (roomPhase === 'lobby' || roomPhase === 'waiting') {
    return (
      <GameLayout
        showResults={false}
        heroContent={<HeroContent />}
        howToPlay={<HowToPlay />}
        ctaSection={<CtaSection />}
        bgBlobs={<BgBlobs />}
        roomBar={
          gameRoom.roomCode ? (
            <RoomBar
              roomCode={gameRoom.roomCode}
              playerCount={gameRoom.players.length}
              isHost={true}
              isConnected={gameRoom.isConnected}
              accentColor="#7C3AED"
            />
          ) : undefined
        }
      >
        <div className="max-w-md mx-auto">
          <RoomLobby
            roomCode={gameRoom.roomCode!}
            players={gameRoom.players}
            isHost={true}
            onStart={handleStartGame}
            minPlayers={2}
            accentColor="#7C3AED"
            gameTitle="This or That"
          />
        </div>
      </GameLayout>
    )
  }

  // Summary phase
  if (roomPhase === 'summary') {
    return (
      <GameLayout
        showResults={false}
        heroContent={<HeroContent />}
        ctaSection={<CtaSection />}
        bgBlobs={<BgBlobs />}
        roomBar={
          gameRoom.roomCode ? (
            <RoomBar
              roomCode={gameRoom.roomCode}
              playerCount={gameRoom.players.length}
              isHost={true}
              isConnected={gameRoom.isConnected}
              accentColor="#7C3AED"
            />
          ) : undefined
        }
      >
        <SummaryScreen votes={allVotes} onRestart={handleRestart} />
      </GameLayout>
    )
  }

  // Playing phase
  const resultsContent = revealed ? (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <ResultsBar
        leftPercent={leftPercent}
        rightPercent={rightPercent}
        leftLabel={currentPair[0]}
        rightLabel={currentPair[1]}
        totalVotes={totalVotes}
      />
    </motion.div>
  ) : undefined

  return (
    <GameLayout
      showResults={revealed}
      heroContent={<HeroContent />}
      ctaSection={<CtaSection />}
      bgBlobs={<BgBlobs />}
      roomBar={
        gameRoom.roomCode ? (
          <RoomBar
            roomCode={gameRoom.roomCode}
            playerCount={gameRoom.players.length}
            isHost={true}
            isConnected={gameRoom.isConnected}
            accentColor="#7C3AED"
          />
        ) : undefined
      }
      results={resultsContent}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`host-question-${currentIndex}`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.4 }}
        >
          {/* Progress indicator */}
          <div className="text-center mb-4">
            <span className="text-[14px] font-semibold text-gray-400">
              Question {currentIndex + 1} of {questionPairs.length}
            </span>
            <div className="w-full max-w-xs mx-auto mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-teal-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / questionPairs.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>

          {/* Split screen display (host sees the pair and live vote counts) */}
          <div className="mt-6">
            <VotingButtons
              currentPair={currentPair}
              onVote={() => {}} // host doesn't vote by tapping
              disabled={true}
              leftCount={voteTally.left}
              rightCount={voteTally.right}
              showCounts={true}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-4 mt-6">
            {!revealed && (
              <motion.button
                onClick={handleReveal}
                disabled={totalVotes === 0}
                className={`
                  inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-[16px]
                  transition-all active:scale-[0.97]
                  ${totalVotes === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-violet-500 to-teal-500 text-white hover:shadow-[0_8px_32px_rgba(139,92,246,0.3)] shadow-[0_4px_16px_rgba(139,92,246,0.2)]'
                  }
                `}
                whileHover={totalVotes > 0 ? { scale: 1.03 } : {}}
                whileTap={totalVotes > 0 ? { scale: 0.97 } : {}}
              >
                <BarChart3 className="w-5 h-5" />
                Reveal
              </motion.button>
            )}

            {revealed && (
              <motion.button
                onClick={handleNext}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-[16px] bg-gradient-to-r from-violet-500 to-teal-500 text-white hover:shadow-[0_8px_32px_rgba(139,92,246,0.3)] shadow-[0_4px_16px_rgba(139,92,246,0.2)] transition-all active:scale-[0.97]"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {currentIndex < questionPairs.length - 1 ? (
                  <>
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    View Summary
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </GameLayout>
  )
}

// ==========================================================================
// PLAYER MODE
// ==========================================================================

function PlayerMode({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const roomState = gameRoom.room?.state as { currentIndex?: number; revealed?: boolean } | null
  const currentIndex = roomState?.currentIndex ?? 0
  const roomPhase = (gameRoom.room?.phase ?? 'lobby') as string

  const currentPair = questionPairs[currentIndex] ?? questionPairs[0]

  // Check if this player has already voted on the current pair
  const hasVotedOnCurrent = useMemo(() => {
    const myActions = gameRoom.getPlayerActions(gameRoom.playerId, 'vote')
    return myActions.some((a) => {
      const payload = a.payload as { pairIndex?: number }
      return payload.pairIndex === currentIndex
    })
  }, [gameRoom, currentIndex])

  const handleVote = useCallback(
    (side: 'left' | 'right') => {
      if (hasVotedOnCurrent) return
      gameRoom.submitAction('vote', { pairIndex: currentIndex, choice: side })
    },
    [gameRoom, currentIndex, hasVotedOnCurrent],
  )

  // Lobby / waiting for host to start
  if (roomPhase === 'lobby' || roomPhase === 'waiting') {
    return (
      <GameLayout
        showResults={false}
        heroContent={<HeroContent />}
        bgBlobs={<BgBlobs />}
        roomBar={
          gameRoom.roomCode ? (
            <RoomBar
              roomCode={gameRoom.roomCode}
              playerCount={gameRoom.players.length}
              isHost={false}
              isConnected={gameRoom.isConnected}
              accentColor="#7C3AED"
            />
          ) : undefined
        }
      >
        <div className="max-w-md mx-auto">
          <RoomLobby
            roomCode={gameRoom.roomCode!}
            players={gameRoom.players}
            isHost={false}
            onStart={() => {}}
            minPlayers={2}
            accentColor="#7C3AED"
            gameTitle="This or That"
          />
        </div>
      </GameLayout>
    )
  }

  // Summary phase - player just sees a waiting/done message
  if (roomPhase === 'summary') {
    return (
      <GameLayout
        showResults={false}
        heroContent={<HeroContent />}
        bgBlobs={<BgBlobs />}
        roomBar={
          gameRoom.roomCode ? (
            <RoomBar
              roomCode={gameRoom.roomCode}
              playerCount={gameRoom.players.length}
              isHost={false}
              isConnected={gameRoom.isConnected}
              accentColor="#7C3AED"
            />
          ) : undefined
        }
      >
        <div className="max-w-md mx-auto">
          <PlayerWaiting
            hasSubmitted={true}
            submittedMessage="Game complete!"
            message="The host is viewing the summary."
            accentColor="#7C3AED"
            roomCode={gameRoom.roomCode ?? undefined}
          />
        </div>
      </GameLayout>
    )
  }

  // Playing phase - show the current pair for voting OR waiting state
  if (hasVotedOnCurrent) {
    return (
      <GameLayout
        showResults={false}
        heroContent={<HeroContent />}
        bgBlobs={<BgBlobs />}
        roomBar={
          gameRoom.roomCode ? (
            <RoomBar
              roomCode={gameRoom.roomCode}
              playerCount={gameRoom.players.length}
              isHost={false}
              isConnected={gameRoom.isConnected}
              accentColor="#7C3AED"
            />
          ) : undefined
        }
      >
        <div className="max-w-md mx-auto">
          <PlayerWaiting
            hasSubmitted={true}
            submittedMessage="Vote submitted!"
            message="Waiting for the host to reveal results..."
            accentColor="#7C3AED"
            roomCode={gameRoom.roomCode ?? undefined}
          />
        </div>
      </GameLayout>
    )
  }

  return (
    <GameLayout
      showResults={false}
      heroContent={<HeroContent />}
      bgBlobs={<BgBlobs />}
      roomBar={
        gameRoom.roomCode ? (
          <RoomBar
            roomCode={gameRoom.roomCode}
            playerCount={gameRoom.players.length}
            isHost={false}
            isConnected={gameRoom.isConnected}
            accentColor="#7C3AED"
          />
        ) : undefined
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`player-question-${currentIndex}`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.4 }}
        >
          {/* Progress indicator */}
          <div className="text-center mb-4">
            <span className="text-[14px] font-semibold text-gray-400">
              Question {currentIndex + 1} of {questionPairs.length}
            </span>
          </div>

          {/* Split screen voting area */}
          <div className="mt-6">
            <VotingButtons
              currentPair={currentPair}
              onVote={handleVote}
              disabled={false}
              showCounts={false}
            />
          </div>

          <p className="text-center text-gray-400 text-[14px] mt-4 font-medium">
            Tap your choice!
          </p>
        </motion.div>
      </AnimatePresence>
    </GameLayout>
  )
}

// ==========================================================================
// MAIN COMPONENT - Mode Router
// ==========================================================================

export function ThisOrThat() {
  const gameRoom = useGameRoom({ gameType: 'this-or-that' })
  const [flowState, setFlowState] = useState<'name' | 'join' | 'lobby' | 'local' | 'room'>('name')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')

  // Determine mode from URL
  const hasRoom = !!gameRoom.roomCode

  // If we already have a room (e.g. from URL ?room=CODE), jump straight to room mode
  // once we have a player name
  if (hasRoom && gameRoom.room && flowState !== 'room') {
    // Auto-advance if we're connected
    if (gameRoom.playerName) {
      // Force into room mode
      setTimeout(() => setFlowState('room'), 0)
    }
  }

  // ---- Flow: name input ----
  const handleNameContinue = useCallback(
    (name: string) => {
      gameRoom.setPlayerName(name)
      // If URL has room code, join it
      if (hasRoom) {
        setFlowState('room')
      } else {
        setFlowState('local')
      }
    },
    [gameRoom, hasRoom],
  )

  const handleCreateRoom = useCallback(async () => {
    try {
      await gameRoom.createRoom()
      setFlowState('room')
    } catch {
      // error shown via gameRoom.error
    }
  }, [gameRoom])

  const handleJoinRoom = useCallback(() => {
    setFlowState('join')
  }, [])

  const handleJoinSubmit = useCallback(async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) {
      setJoinError('Please enter a room code.')
      return
    }
    try {
      setJoinError('')
      await gameRoom.joinRoom(code)
      setFlowState('room')
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join room.')
    }
  }, [joinCode, gameRoom])

  // ---- Name input screen ----
  if (flowState === 'name' && !hasRoom) {
    return (
      <GameLayout
        showResults={false}
        heroContent={<HeroContent />}
        howToPlay={<HowToPlay />}
        ctaSection={<CtaSection />}
        bgBlobs={<BgBlobs />}
      >
        <TeamNameInput
          onContinue={handleNameContinue}
          showRoomOptions={true}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          accentFrom="#7C3AED"
          accentTo="#06B6D4"
        />
      </GameLayout>
    )
  }

  // ---- Join room screen ----
  if (flowState === 'join') {
    return (
      <GameLayout
        showResults={false}
        heroContent={<HeroContent />}
        howToPlay={<HowToPlay />}
        ctaSection={<CtaSection />}
        bgBlobs={<BgBlobs />}
      >
        <div className="max-w-md mx-auto">
          <GlassCard className="p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Join a Room</h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter the room code shared by the host.
            </p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase())
                setJoinError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoinSubmit()
              }}
              placeholder="ABCDEF"
              maxLength={10}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-center text-2xl font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent mb-4 uppercase"
            />
            {joinError && (
              <p className="text-red-500 text-sm mb-4">{joinError}</p>
            )}
            {gameRoom.error && (
              <p className="text-red-500 text-sm mb-4">{gameRoom.error}</p>
            )}
            <button
              onClick={handleJoinSubmit}
              disabled={!joinCode.trim() || gameRoom.isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-[15px] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{
                background: joinCode.trim() ? 'linear-gradient(135deg, #7C3AED, #06B6D4)' : '#d1d5db',
              }}
            >
              {gameRoom.isLoading ? 'Joining...' : 'Join Room'}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFlowState('name')}
              className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Back
            </button>
          </GlassCard>
        </div>
      </GameLayout>
    )
  }

  // ---- Waiting for name when URL has room code ----
  if (hasRoom && !gameRoom.playerName) {
    return (
      <GameLayout
        showResults={false}
        heroContent={<HeroContent />}
        bgBlobs={<BgBlobs />}
      >
        <TeamNameInput
          onContinue={handleNameContinue}
          showRoomOptions={false}
          accentFrom="#7C3AED"
          accentTo="#06B6D4"
        />
      </GameLayout>
    )
  }

  // ---- Room mode (host or player) ----
  if (flowState === 'room' || hasRoom) {
    if (gameRoom.isHost) {
      return <HostMode gameRoom={gameRoom} />
    }
    return <PlayerMode gameRoom={gameRoom} />
  }

  // ---- Local mode (default) ----
  return <LocalMode />
}
