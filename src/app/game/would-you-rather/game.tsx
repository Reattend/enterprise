'use client'

import React, { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, RotateCcw, Shuffle, Scale, Brain, Eye, ChevronRight, Users } from 'lucide-react'
import { GlassCard } from '@/components/game/glass-card'
import { GameLayout } from '@/components/game/game-layout'
import { TeamNameInput } from '@/components/game/team-name-input'
import { RoomLobby } from '@/components/game/room-lobby'
import { PlayerWaiting } from '@/components/game/player-waiting'
import { RoomBar } from '@/components/game/room-bar'
import { useGameRoom, type UseGameRoomReturn } from '@/hooks/use-game-room'
import { useLocalGameState } from '@/hooks/use-local-game-state'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Question {
  optionA: string
  optionB: string
}

interface LocalGameState {
  currentIndex: number
  votesA: number
  votesB: number
  hasVoted: boolean
  selectedOption: 'A' | 'B' | null
  isFinished: boolean
  questionsOrder: number[] // indices into allQuestions for persistence
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

const allQuestions: Question[] = [
  { optionA: 'Never attend another meeting', optionB: 'Never send another email' },
  { optionA: 'Always work from home', optionB: 'Always work from the office' },
  { optionA: 'Have a 4-day work week', optionB: 'Work 5 days but leave at 3pm' },
  { optionA: 'Know every programming language', optionB: 'Speak every human language' },
  { optionA: 'Have a perfect memory', optionB: 'Be able to speed-read everything' },
  { optionA: 'Be the CEO for a day', optionB: 'Be an intern for a day at your dream company' },
  { optionA: 'Never have another deadline', optionB: 'Never have another meeting' },
  { optionA: 'Have unlimited vacation days', optionB: 'A 50% raise' },
  { optionA: 'Work with your best friend', optionB: 'Work for your idol' },
  { optionA: 'Always know the right answer', optionB: 'Always ask the right question' },
  { optionA: 'Have a standing desk forever', optionB: 'A reclining couch desk' },
  { optionA: 'Give up Slack', optionB: 'Give up email' },
  { optionA: 'Have free lunch every day', optionB: 'Free gym membership' },
  { optionA: 'Be the smartest person in every room', optionB: 'The most liked' },
  { optionA: 'Work on one project for 5 years', optionB: 'Switch projects every month' },
  { optionA: 'Have a personal assistant', optionB: 'A self-driving car' },
  { optionA: 'Never have to do small talk', optionB: 'Never have to do presentations' },
  { optionA: 'Get feedback instantly', optionB: 'Have time to prepare your response' },
  { optionA: 'Have a corner office', optionB: 'The ability to work from anywhere' },
  { optionA: 'Be an expert in one thing', optionB: 'Good at everything' },
  { optionA: 'Start work at 5am and finish at 1pm', optionB: 'Start at 1pm and finish at 9pm' },
  { optionA: 'Only use the command line', optionB: 'Only use voice commands' },
  { optionA: 'Undo the last email you sent', optionB: 'Preview every email before receiving' },
  { optionA: 'Have your meetings recorded and searchable', optionB: 'Never have meetings again' },
  { optionA: 'Always be 10 minutes early', optionB: 'Have perfect time estimation skills' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function shuffledIndices(length: number): number[] {
  return shuffleArray(Array.from({ length }, (_, i) => i))
}

// ---------------------------------------------------------------------------
// Shared: Background blobs
// ---------------------------------------------------------------------------

const bgBlobs = (
  <>
    <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-500/8 via-blue-400/5 to-transparent blur-3xl pointer-events-none" />
    <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-pink-500/8 via-rose-400/5 to-transparent blur-3xl pointer-events-none" />
    <div className="absolute top-80 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />
  </>
)

// ---------------------------------------------------------------------------
// Shared: Hero
// ---------------------------------------------------------------------------

const heroContent = (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
      <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse" />
      Free team game
    </span>
    <h1 className="text-[32px] md:text-[48px] font-bold tracking-[-0.03em] leading-[1.1]">
      Would You <span className="bg-gradient-to-r from-blue-600 via-[#4F46E5] to-pink-600 bg-clip-text text-transparent">Rather</span>
    </h1>
    <p className="text-gray-500 mt-3 text-[15px] md:text-[17px] max-w-lg mx-auto">
      Work-themed dilemmas that reveal how your team thinks. Vote, see the split, debate.
    </p>
  </motion.div>
)

// ---------------------------------------------------------------------------
// Shared: CTA Section
// ---------------------------------------------------------------------------

const ctaSection = (
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

// ---------------------------------------------------------------------------
// Shared: Split Results Bar component
// ---------------------------------------------------------------------------

function ResultsBar({
  votesA,
  votesB,
  optionA,
  optionB,
}: {
  votesA: number
  votesB: number
  optionA: string
  optionB: string
}) {
  const totalVotes = votesA + votesB
  const percentA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 0
  const percentB = totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 0

  return (
    <GlassCard className="p-6 md:p-8 h-full flex flex-col justify-center">
      {/* Vote counts */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-[14px] font-bold text-blue-600">
            {votesA} vote{votesA !== 1 ? 's' : ''}
          </span>
        </div>
        <span className="text-[13px] font-semibold text-gray-400">
          {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-bold text-pink-600">
            {votesB} vote{votesB !== 1 ? 's' : ''}
          </span>
          <div className="w-3 h-3 rounded-full bg-pink-500" />
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-14 md:h-16 rounded-2xl overflow-hidden bg-gray-100">
        <motion.div
          initial={{ width: '50%' }}
          animate={{ width: `${percentA}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center"
        >
          {percentA >= 15 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[18px] md:text-[22px] font-black text-white"
            >
              {percentA}%
            </motion.span>
          )}
        </motion.div>
        <motion.div
          initial={{ width: '50%' }}
          animate={{ width: `${percentB}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-pink-500 to-rose-600 flex items-center justify-center"
        >
          {percentB >= 15 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[18px] md:text-[22px] font-black text-white"
            >
              {percentB}%
            </motion.span>
          )}
        </motion.div>
      </div>

      {/* Option labels under bar */}
      <div className="flex items-start justify-between mt-3 gap-4">
        <p className="text-[12px] md:text-[13px] font-semibold text-blue-600 max-w-[45%] leading-snug">
          {optionA}
        </p>
        <p className="text-[12px] md:text-[13px] font-semibold text-pink-600 max-w-[45%] text-right leading-snug">
          {optionB}
        </p>
      </div>
    </GlassCard>
  )
}

// ---------------------------------------------------------------------------
// Shared: Option Cards
// ---------------------------------------------------------------------------

function OptionCards({
  question,
  hasVoted,
  selectedOption,
  onVote,
}: {
  question: Question
  hasVoted: boolean
  selectedOption: 'A' | 'B' | null
  onVote: (option: 'A' | 'B') => void
}) {
  const [showPulseA, setShowPulseA] = useState(false)
  const [showPulseB, setShowPulseB] = useState(false)

  const handleVote = useCallback((option: 'A' | 'B') => {
    if (hasVoted) return
    if (option === 'A') {
      setShowPulseA(true)
      setTimeout(() => setShowPulseA(false), 600)
    } else {
      setShowPulseB(true)
      setTimeout(() => setShowPulseB(false), 600)
    }
    onVote(option)
  }, [hasVoted, onVote])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
      {/* Option A */}
      <motion.button
        whileHover={!hasVoted ? { scale: 1.02 } : {}}
        whileTap={!hasVoted ? { scale: 0.98 } : {}}
        onClick={() => handleVote('A')}
        disabled={hasVoted}
        className={`relative overflow-hidden rounded-2xl p-8 md:p-10 text-left transition-all min-h-[180px] md:min-h-[220px] flex flex-col justify-center ${
          hasVoted
            ? selectedOption === 'A'
              ? 'ring-4 ring-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]'
              : 'opacity-70'
            : 'hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] cursor-pointer'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.15),transparent_60%)]" />
        {showPulseA && (
          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-white/30"
          />
        )}
        <div className="relative z-10">
          <span className="inline-block text-[12px] font-bold uppercase tracking-widest text-white/60 mb-3">
            Option A
          </span>
          <p className="text-[22px] md:text-[28px] font-bold text-white leading-snug">
            {question.optionA}
          </p>
        </div>
      </motion.button>

      {/* Option B */}
      <motion.button
        whileHover={!hasVoted ? { scale: 1.02 } : {}}
        whileTap={!hasVoted ? { scale: 0.98 } : {}}
        onClick={() => handleVote('B')}
        disabled={hasVoted}
        className={`relative overflow-hidden rounded-2xl p-8 md:p-10 text-left transition-all min-h-[180px] md:min-h-[220px] flex flex-col justify-center ${
          hasVoted
            ? selectedOption === 'B'
              ? 'ring-4 ring-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.3)]'
              : 'opacity-70'
            : 'hover:shadow-[0_12px_40px_rgba(236,72,153,0.2)] cursor-pointer'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-600 to-red-700" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        {showPulseB && (
          <motion.div
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-white/30"
          />
        )}
        <div className="relative z-10">
          <span className="inline-block text-[12px] font-bold uppercase tracking-widest text-white/60 mb-3">
            Option B
          </span>
          <p className="text-[22px] md:text-[28px] font-bold text-white leading-snug">
            {question.optionB}
          </p>
        </div>
      </motion.button>
    </div>
  )
}

// ===========================================================================
// LOCAL MODE
// ===========================================================================

function WouldYouRatherLocal({ playerName }: { playerName: string }) {
  const INITIAL_STATE: LocalGameState = {
    currentIndex: 0,
    votesA: 0,
    votesB: 0,
    hasVoted: false,
    selectedOption: null,
    isFinished: false,
    questionsOrder: shuffledIndices(allQuestions.length),
  }

  const [gameState, setGameState, clearGameState] = useLocalGameState<LocalGameState>(
    'reattend-wyr-local',
    INITIAL_STATE,
  )

  const { currentIndex, votesA, votesB, hasVoted, selectedOption, isFinished, questionsOrder } = gameState

  const question = allQuestions[questionsOrder[currentIndex]] || allQuestions[0]
  const showResult = hasVoted

  const vote = useCallback((option: 'A' | 'B') => {
    if (hasVoted) return
    setGameState((prev) => ({
      ...prev,
      selectedOption: option,
      votesA: option === 'A' ? prev.votesA + 1 : prev.votesA,
      votesB: option === 'B' ? prev.votesB + 1 : prev.votesB,
      hasVoted: true,
    }))
  }, [hasVoted, setGameState])

  const nextQuestion = useCallback(() => {
    if (currentIndex + 1 >= questionsOrder.length) {
      setGameState((prev) => ({ ...prev, isFinished: true }))
    } else {
      setGameState((prev) => ({
        ...prev,
        currentIndex: prev.currentIndex + 1,
        votesA: 0,
        votesB: 0,
        hasVoted: false,
        selectedOption: null,
      }))
    }
  }, [currentIndex, questionsOrder.length, setGameState])

  const resetVotes = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      votesA: 0,
      votesB: 0,
      hasVoted: false,
      selectedOption: null,
    }))
  }, [setGameState])

  const playAgain = useCallback(() => {
    clearGameState()
    // Re-set with new shuffle
    setGameState({
      currentIndex: 0,
      votesA: 0,
      votesB: 0,
      hasVoted: false,
      selectedOption: null,
      isFinished: false,
      questionsOrder: shuffledIndices(allQuestions.length),
    })
  }, [clearGameState, setGameState])

  // ---------- Game content ----------

  const gameContent = (
    <AnimatePresence mode="wait">
      {isFinished ? (
        <motion.div
          key="finished"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-10 md:p-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6">
              <Scale className="w-10 h-10 text-[#4F46E5]" />
            </div>
            <h2 className="text-[28px] md:text-[36px] font-bold mb-3">That&apos;s all {questionsOrder.length} questions!</h2>
            <p className="text-gray-500 text-[16px] mb-8 max-w-md mx-auto">
              Great debates! Want to play again with a fresh shuffle?
            </p>
            <button
              onClick={playAgain}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[16px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              <Shuffle className="w-5 h-5" />
              Play Again
            </button>
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div
          key={`question-${currentIndex}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {/* Question counter */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-[13px] font-semibold text-gray-400 bg-white/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/80">
              Question {currentIndex + 1} of {questionsOrder.length}
            </span>
            <div className="flex items-center gap-2">
              {hasVoted && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={resetVotes}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-[#4F46E5] bg-white/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/80 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Votes
                </motion.button>
              )}
            </div>
          </div>

          {/* "Would You Rather" label */}
          <div className="text-center mb-5">
            <span className="text-[14px] md:text-[16px] font-bold uppercase tracking-widest text-[#4F46E5]/60">
              Would you rather...
            </span>
          </div>

          {/* Options */}
          <OptionCards
            question={question}
            hasVoted={hasVoted}
            selectedOption={selectedOption}
            onVote={vote}
          />

          {/* Progress bar */}
          <div className="mt-6">
            <div className="h-1.5 rounded-full bg-gray-200/60 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-[#4F46E5] to-pink-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + (hasVoted ? 1 : 0)) / questionsOrder.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // ---------- Results panel ----------

  const resultsPanel = (
    <AnimatePresence>
      {showResult && !isFinished && (
        <motion.div
          key={`result-${currentIndex}`}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full flex flex-col"
        >
          <ResultsBar
            votesA={votesA}
            votesB={votesB}
            optionA={question.optionA}
            optionB={question.optionB}
          />

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={resetVotes}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-semibold text-gray-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Votes
            </button>
            <button
              onClick={nextQuestion}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[13px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              {currentIndex + 1 >= questionsOrder.length ? 'See Results' : 'Next Question'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <GameLayout
      heroContent={heroContent}
      showResults={showResult && !isFinished}
      results={resultsPanel}
      ctaSection={ctaSection}
      bgBlobs={bgBlobs}
    >
      {gameContent}
    </GameLayout>
  )
}

// ===========================================================================
// HOST MODE (Big screen)
// ===========================================================================

function WouldYouRatherHost({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const { room, players, isConnected, updateRoom, getActionsOfType, roomCode } = gameRoom

  // Derive state from room
  const roomState = room?.state ?? {}
  const currentIndex: number = roomState.currentIndex ?? 0
  const revealed: boolean = roomState.revealed ?? false
  const phase: string = room?.phase ?? 'lobby'
  const questionsOrder: number[] = roomState.questionsOrder ?? Array.from({ length: allQuestions.length }, (_, i) => i)
  const isFinished = currentIndex >= questionsOrder.length

  const question = allQuestions[questionsOrder[currentIndex]] ?? allQuestions[0]

  // Count votes for the current question
  const voteActions = getActionsOfType('vote')
  const currentVotes = useMemo(() => {
    const filtered = voteActions.filter(
      (a) => a.payload?.questionIndex === currentIndex
    )
    let a = 0
    let b = 0
    // Dedupe by playerId (take last vote per player for current question)
    const latestVotes = new Map<string, 'A' | 'B'>()
    for (const action of filtered) {
      latestVotes.set(action.playerId, action.payload?.choice as 'A' | 'B')
    }
    latestVotes.forEach((choice) => {
      if (choice === 'A') a++
      else if (choice === 'B') b++
    })
    return { votesA: a, votesB: b, total: a + b }
  }, [voteActions, currentIndex])

  // ---------- Host Actions ----------

  const handleStartGame = useCallback(async () => {
    const order = shuffledIndices(allQuestions.length)
    await updateRoom({
      status: 'playing',
      phase: 'voting',
      state: { currentIndex: 0, revealed: false, questionsOrder: order },
    })
  }, [updateRoom])

  const handleRevealResults = useCallback(async () => {
    await updateRoom({
      phase: 'revealed',
      state: { ...roomState, revealed: true },
    })
  }, [updateRoom, roomState])

  const handleNextQuestion = useCallback(async () => {
    const nextIdx = currentIndex + 1
    if (nextIdx >= questionsOrder.length) {
      await updateRoom({
        status: 'finished',
        phase: 'finished',
        state: { ...roomState, currentIndex: nextIdx },
      })
    } else {
      await updateRoom({
        phase: 'voting',
        state: { ...roomState, currentIndex: nextIdx, revealed: false },
      })
    }
  }, [updateRoom, roomState, currentIndex, questionsOrder.length])

  const handlePlayAgain = useCallback(async () => {
    const order = shuffledIndices(allQuestions.length)
    await updateRoom({
      status: 'playing',
      phase: 'voting',
      state: { currentIndex: 0, revealed: false, questionsOrder: order },
    })
  }, [updateRoom])

  // ---------- Lobby ----------

  if (phase === 'lobby' || room?.status === 'lobby') {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
        roomBar={
          roomCode ? (
            <RoomBar
              roomCode={roomCode}
              playerCount={players.length}
              isHost={true}
              isConnected={isConnected}
              accentColor="#3B82F6"
            />
          ) : undefined
        }
      >
        <div className="flex items-center justify-center py-8">
          <div className="w-full max-w-md">
            <RoomLobby
              roomCode={roomCode || ''}
              players={players}
              isHost={true}
              onStart={handleStartGame}
              minPlayers={2}
              accentColor="#3B82F6"
              gameTitle="Would You Rather"
            />
          </div>
        </div>
      </GameLayout>
    )
  }

  // ---------- Finished ----------

  if (isFinished || phase === 'finished') {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
        roomBar={
          roomCode ? (
            <RoomBar
              roomCode={roomCode}
              playerCount={players.length}
              isHost={true}
              isConnected={isConnected}
              accentColor="#3B82F6"
            />
          ) : undefined
        }
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-10 md:p-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6">
              <Scale className="w-10 h-10 text-[#4F46E5]" />
            </div>
            <h2 className="text-[28px] md:text-[36px] font-bold mb-3">
              That&apos;s all {questionsOrder.length} questions!
            </h2>
            <p className="text-gray-500 text-[16px] mb-8 max-w-md mx-auto">
              Great debates with {players.length} players! Want to play again?
            </p>
            <button
              onClick={handlePlayAgain}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[16px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              <Shuffle className="w-5 h-5" />
              Play Again
            </button>
          </GlassCard>
        </motion.div>
      </GameLayout>
    )
  }

  // ---------- Playing (Host Big Screen) ----------

  const showResults = revealed

  const gameContent = (
    <motion.div
      key={`host-question-${currentIndex}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
    >
      {/* Question counter + vote count */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-[13px] font-semibold text-gray-400 bg-white/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/80">
          Question {currentIndex + 1} of {questionsOrder.length}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 bg-white/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/80">
          <Users className="w-3.5 h-3.5" />
          {currentVotes.total} vote{currentVotes.total !== 1 ? 's' : ''} in
        </span>
      </div>

      {/* "Would You Rather" label */}
      <div className="text-center mb-5">
        <span className="text-[14px] md:text-[16px] font-bold uppercase tracking-widest text-[#4F46E5]/60">
          Would you rather...
        </span>
      </div>

      {/* Large option cards (display only for host - not clickable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {/* Option A */}
        <div className="relative overflow-hidden rounded-2xl p-8 md:p-10 text-left min-h-[180px] md:min-h-[220px] flex flex-col justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative z-10">
            <span className="inline-block text-[12px] font-bold uppercase tracking-widest text-white/60 mb-3">
              Option A
            </span>
            <p className="text-[22px] md:text-[28px] font-bold text-white leading-snug">
              {question.optionA}
            </p>
            {!revealed && currentVotes.votesA > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-block mt-4 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[14px] font-bold"
              >
                {currentVotes.votesA} vote{currentVotes.votesA !== 1 ? 's' : ''}
              </motion.span>
            )}
          </div>
        </div>

        {/* Option B */}
        <div className="relative overflow-hidden rounded-2xl p-8 md:p-10 text-left min-h-[180px] md:min-h-[220px] flex flex-col justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-600 to-red-700" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative z-10">
            <span className="inline-block text-[12px] font-bold uppercase tracking-widest text-white/60 mb-3">
              Option B
            </span>
            <p className="text-[22px] md:text-[28px] font-bold text-white leading-snug">
              {question.optionB}
            </p>
            {!revealed && currentVotes.votesB > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-block mt-4 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[14px] font-bold"
              >
                {currentVotes.votesB} vote{currentVotes.votesB !== 1 ? 's' : ''}
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Host controls */}
      <div className="flex items-center justify-center gap-3 mt-6">
        {!revealed ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleRevealResults}
            disabled={currentVotes.total === 0}
            className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-[16px] transition-all active:scale-[0.97] ${
              currentVotes.total === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)]'
            }`}
          >
            <Eye className="w-5 h-5" />
            Reveal Results
          </motion.button>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleNextQuestion}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[16px] transition-all shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.97]"
          >
            {currentIndex + 1 >= questionsOrder.length ? 'Finish Game' : 'Next Question'}
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="h-1.5 rounded-full bg-gray-200/60 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-[#4F46E5] to-pink-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + (revealed ? 1 : 0)) / questionsOrder.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  )

  const resultsPanel = (
    <AnimatePresence>
      {showResults && (
        <motion.div
          key={`host-result-${currentIndex}`}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full"
        >
          <ResultsBar
            votesA={currentVotes.votesA}
            votesB={currentVotes.votesB}
            optionA={question.optionA}
            optionB={question.optionB}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <GameLayout
      heroContent={heroContent}
      showResults={showResults}
      results={resultsPanel}
      ctaSection={ctaSection}
      bgBlobs={bgBlobs}
      roomBar={
        roomCode ? (
          <RoomBar
            roomCode={roomCode}
            playerCount={players.length}
            isHost={true}
            isConnected={isConnected}
            accentColor="#3B82F6"
          />
        ) : undefined
      }
    >
      {gameContent}
    </GameLayout>
  )
}

// ===========================================================================
// PLAYER MODE (Phone view)
// ===========================================================================

function WouldYouRatherPlayer({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const { room, players, isConnected, playerId, playerName, submitAction, getActionsOfType, roomCode } = gameRoom

  const roomState = room?.state ?? {}
  const currentIndex: number = roomState.currentIndex ?? 0
  const revealed: boolean = roomState.revealed ?? false
  const phase: string = room?.phase ?? 'lobby'
  const questionsOrder: number[] = roomState.questionsOrder ?? Array.from({ length: allQuestions.length }, (_, i) => i)
  const isFinished = currentIndex >= questionsOrder.length || phase === 'finished'

  const question = allQuestions[questionsOrder[currentIndex]] ?? allQuestions[0]

  // Check if this player already voted on the current question
  const voteActions = getActionsOfType('vote')
  const hasVotedForCurrent = useMemo(() => {
    return voteActions.some(
      (a) => a.playerId === playerId && a.payload?.questionIndex === currentIndex
    )
  }, [voteActions, playerId, currentIndex])

  const myChoice = useMemo(() => {
    const myVotes = voteActions.filter(
      (a) => a.playerId === playerId && a.payload?.questionIndex === currentIndex
    )
    if (myVotes.length === 0) return null
    return myVotes[myVotes.length - 1].payload?.choice as 'A' | 'B'
  }, [voteActions, playerId, currentIndex])

  // Count votes for results
  const currentVotes = useMemo(() => {
    const filtered = voteActions.filter(
      (a) => a.payload?.questionIndex === currentIndex
    )
    const latestVotes = new Map<string, 'A' | 'B'>()
    for (const action of filtered) {
      latestVotes.set(action.playerId, action.payload?.choice as 'A' | 'B')
    }
    let a = 0
    let b = 0
    latestVotes.forEach((choice) => {
      if (choice === 'A') a++
      else if (choice === 'B') b++
    })
    return { votesA: a, votesB: b }
  }, [voteActions, currentIndex])

  const handleVote = useCallback(async (choice: 'A' | 'B') => {
    if (hasVotedForCurrent) return
    await submitAction('vote', { questionIndex: currentIndex, choice })
  }, [hasVotedForCurrent, submitAction, currentIndex])

  // ---------- Lobby ----------

  if (phase === 'lobby' || room?.status === 'lobby') {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
        roomBar={
          roomCode ? (
            <RoomBar
              roomCode={roomCode}
              playerCount={players.length}
              isHost={false}
              isConnected={isConnected}
              accentColor="#3B82F6"
            />
          ) : undefined
        }
      >
        <div className="flex items-center justify-center py-8">
          <div className="w-full max-w-md">
            <RoomLobby
              roomCode={roomCode || ''}
              players={players}
              isHost={false}
              onStart={() => {}}
              minPlayers={2}
              accentColor="#3B82F6"
              gameTitle="Would You Rather"
            />
          </div>
        </div>
      </GameLayout>
    )
  }

  // ---------- Finished ----------

  if (isFinished) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
        roomBar={
          roomCode ? (
            <RoomBar
              roomCode={roomCode}
              playerCount={players.length}
              isHost={false}
              isConnected={isConnected}
              accentColor="#3B82F6"
            />
          ) : undefined
        }
      >
        <GlassCard className="p-10 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6">
            <Scale className="w-10 h-10 text-[#4F46E5]" />
          </div>
          <h2 className="text-[28px] md:text-[36px] font-bold mb-3">Game Over!</h2>
          <p className="text-gray-500 text-[16px] max-w-md mx-auto">
            Great debates! The host can start a new round.
          </p>
        </GlassCard>
      </GameLayout>
    )
  }

  // ---------- Playing (Player Phone View) ----------

  // If voted and not revealed yet: show waiting
  if (hasVotedForCurrent && !revealed) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
        roomBar={
          roomCode ? (
            <RoomBar
              roomCode={roomCode}
              playerCount={players.length}
              isHost={false}
              isConnected={isConnected}
              accentColor="#3B82F6"
            />
          ) : undefined
        }
      >
        <div className="flex items-center justify-center py-8">
          <div className="w-full max-w-md">
            <PlayerWaiting
              hasSubmitted={true}
              submittedMessage={`You chose Option ${myChoice}!`}
              message="Waiting for host to reveal results..."
              accentColor="#3B82F6"
              roomCode={roomCode || undefined}
            />
          </div>
        </div>
      </GameLayout>
    )
  }

  // If revealed: show the results
  if (revealed) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={true}
        results={
          <motion.div
            key={`player-result-${currentIndex}`}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full"
          >
            <ResultsBar
              votesA={currentVotes.votesA}
              votesB={currentVotes.votesB}
              optionA={question.optionA}
              optionB={question.optionB}
            />
          </motion.div>
        }
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
        roomBar={
          roomCode ? (
            <RoomBar
              roomCode={roomCode}
              playerCount={players.length}
              isHost={false}
              isConnected={isConnected}
              accentColor="#3B82F6"
            />
          ) : undefined
        }
      >
        <motion.div
          key={`player-question-${currentIndex}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-5">
            <span className="text-[13px] font-semibold text-gray-400 bg-white/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/80">
              Question {currentIndex + 1} of {questionsOrder.length}
            </span>
            {myChoice && (
              <span className={`text-[13px] font-semibold px-4 py-1.5 rounded-full border ${
                myChoice === 'A'
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-pink-50 border-pink-200 text-pink-600'
              }`}>
                You chose {myChoice === 'A' ? 'Option A' : 'Option B'}
              </span>
            )}
          </div>

          <div className="text-center mb-5">
            <span className="text-[14px] md:text-[16px] font-bold uppercase tracking-widest text-[#4F46E5]/60">
              Results revealed!
            </span>
          </div>

          {/* Non-clickable option cards showing what was chosen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <div className={`relative overflow-hidden rounded-2xl p-8 md:p-10 text-left min-h-[160px] flex flex-col justify-center ${
              myChoice === 'A' ? 'ring-4 ring-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'opacity-70'
            }`}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.15),transparent_60%)]" />
              <div className="relative z-10">
                <span className="inline-block text-[12px] font-bold uppercase tracking-widest text-white/60 mb-3">Option A</span>
                <p className="text-[20px] md:text-[24px] font-bold text-white leading-snug">{question.optionA}</p>
              </div>
            </div>
            <div className={`relative overflow-hidden rounded-2xl p-8 md:p-10 text-left min-h-[160px] flex flex-col justify-center ${
              myChoice === 'B' ? 'ring-4 ring-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.3)]' : 'opacity-70'
            }`}>
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-600 to-red-700" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
              <div className="relative z-10">
                <span className="inline-block text-[12px] font-bold uppercase tracking-widest text-white/60 mb-3">Option B</span>
                <p className="text-[20px] md:text-[24px] font-bold text-white leading-snug">{question.optionB}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-[13px] text-gray-400">Waiting for host to advance...</span>
          </div>
        </motion.div>
      </GameLayout>
    )
  }

  // ---------- Voting (Player can vote) ----------

  return (
    <GameLayout
      heroContent={heroContent}
      showResults={false}
      ctaSection={ctaSection}
      bgBlobs={bgBlobs}
      roomBar={
        roomCode ? (
          <RoomBar
            roomCode={roomCode}
            playerCount={players.length}
            isHost={false}
            isConnected={isConnected}
            accentColor="#3B82F6"
          />
        ) : undefined
      }
    >
      <motion.div
        key={`player-vote-${currentIndex}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Question counter */}
        <div className="flex items-center justify-center mb-5">
          <span className="text-[13px] font-semibold text-gray-400 bg-white/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/80">
            Question {currentIndex + 1} of {questionsOrder.length}
          </span>
        </div>

        {/* "Would You Rather" label */}
        <div className="text-center mb-5">
          <span className="text-[14px] md:text-[16px] font-bold uppercase tracking-widest text-[#4F46E5]/60">
            Would you rather...
          </span>
        </div>

        {/* Big tap-friendly vote buttons */}
        <div className="grid grid-cols-1 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleVote('A')}
            className="relative overflow-hidden rounded-2xl p-8 md:p-10 text-left min-h-[140px] flex flex-col justify-center cursor-pointer hover:shadow-[0_12px_40px_rgba(59,130,246,0.2)] transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.15),transparent_60%)]" />
            <div className="relative z-10">
              <span className="inline-block text-[12px] font-bold uppercase tracking-widest text-white/60 mb-3">
                Option A
              </span>
              <p className="text-[22px] md:text-[28px] font-bold text-white leading-snug">
                {question.optionA}
              </p>
            </div>
          </motion.button>

          {/* OR divider */}
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center">
              <span className="text-[14px] font-black text-gray-400">OR</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleVote('B')}
            className="relative overflow-hidden rounded-2xl p-8 md:p-10 text-left min-h-[140px] flex flex-col justify-center cursor-pointer hover:shadow-[0_12px_40px_rgba(236,72,153,0.2)] transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-600 to-red-700" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
            <div className="relative z-10">
              <span className="inline-block text-[12px] font-bold uppercase tracking-widest text-white/60 mb-3">
                Option B
              </span>
              <p className="text-[22px] md:text-[28px] font-bold text-white leading-snug">
                {question.optionB}
              </p>
            </div>
          </motion.button>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="h-1.5 rounded-full bg-gray-200/60 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-[#4F46E5] to-pink-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex) / questionsOrder.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </motion.div>
    </GameLayout>
  )
}

// ===========================================================================
// MAIN EXPORT
// ===========================================================================

export function WouldYouRather() {
  const searchParams = useSearchParams()
  const roomCode = searchParams.get('room')

  // Room hook (always instantiated for consistency)
  const gameRoom = useGameRoom({ gameType: 'would-you-rather' })
  const { playerName, setPlayerName, room, isHost, createRoom, joinRoom } = gameRoom

  // Join room flow state
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)

  // Determine the mode
  const hasRoom = !!roomCode || !!room

  // ---------- Name gate ----------

  if (!playerName) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
      >
        <div className="flex items-center justify-center py-8">
          {!showJoinInput ? (
            <TeamNameInput
              onContinue={(name) => {
                setPlayerName(name)
              }}
              showRoomOptions={true}
              onCreateRoom={async () => {
                // The name is already saved to localStorage by TeamNameInput.
                // We need to read it after it was saved.
                const storedName = localStorage.getItem('reattend-game-player-name')
                if (storedName) setPlayerName(storedName)
                // createRoom will be called after name is set, via the effect below
              }}
              onJoinRoom={() => {
                const storedName = localStorage.getItem('reattend-game-player-name')
                if (storedName) setPlayerName(storedName)
                setShowJoinInput(true)
              }}
              accentFrom="#3B82F6"
              accentTo="#6366F1"
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md"
            >
              <GlassCard className="p-8 text-center">
                <h2 className="text-xl font-bold mb-2">Join a Room</h2>
                <p className="text-sm text-gray-500 mb-6">Enter the room code shared by your host.</p>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase())
                    setJoinError(null)
                  }}
                  placeholder="Room code"
                  maxLength={8}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-center text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                />
                {joinError && (
                  <p className="text-red-500 text-sm mb-4">{joinError}</p>
                )}
                <button
                  onClick={async () => {
                    const code = joinCode.trim()
                    if (!code) return
                    try {
                      await joinRoom(code)
                    } catch (err: any) {
                      setJoinError(err.message || 'Failed to join room')
                    }
                  }}
                  disabled={!joinCode.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-[15px] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] bg-gradient-to-r from-blue-500 to-indigo-500"
                >
                  Join Room <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setShowJoinInput(false)
                    setJoinCode('')
                    setJoinError(null)
                  }}
                  className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Back
                </button>
              </GlassCard>
            </motion.div>
          )}
        </div>
      </GameLayout>
    )
  }

  // ---------- Room mode (joined via URL or created/joined a room) ----------

  if (hasRoom) {
    if (isHost) {
      return <WouldYouRatherHost gameRoom={gameRoom} />
    }
    return <WouldYouRatherPlayer gameRoom={gameRoom} />
  }

  // ---------- Post-name, pre-room: show mode selection ----------

  return <WouldYouRatherModeSelect
    playerName={playerName}
    gameRoom={gameRoom}
  />
}

// ===========================================================================
// MODE SELECT (after name entered, before local/room)
// ===========================================================================

function WouldYouRatherModeSelect({
  playerName,
  gameRoom,
}: {
  playerName: string
  gameRoom: UseGameRoomReturn
}) {
  const { createRoom, joinRoom, isLoading, error: roomError } = gameRoom
  const [mode, setMode] = useState<'select' | 'local' | 'join'>('select')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)

  // Creating a room
  const handleCreateRoom = useCallback(async () => {
    try {
      await createRoom()
    } catch {
      // error handled by hook
    }
  }, [createRoom])

  // Joining a room
  const handleJoinRoom = useCallback(async () => {
    const code = joinCode.trim()
    if (!code) return
    setJoinError(null)
    try {
      await joinRoom(code)
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join room')
    }
  }, [joinCode, joinRoom])

  // If mode is "local", render the local game directly
  if (mode === 'local') {
    return <WouldYouRatherLocal playerName={playerName} />
  }

  return (
    <GameLayout
      heroContent={heroContent}
      showResults={false}
      ctaSection={ctaSection}
      bgBlobs={bgBlobs}
    >
      <div className="flex items-center justify-center py-8">
        <div className="w-full max-w-md space-y-4">
          <AnimatePresence mode="wait">
            {mode === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <GlassCard className="p-6 text-center">
                  <p className="text-sm text-gray-500 mb-1">Playing as</p>
                  <p className="text-lg font-bold text-[#1a1a2e]">{playerName}</p>
                </GlassCard>

                {/* Play Solo */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode('local')}
                  className="w-full"
                >
                  <GlassCard className="p-6 text-left hover:shadow-[0_12px_40px_rgba(79,70,229,0.1)] transition-shadow cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <Scale className="w-6 h-6 text-[#4F46E5]" />
                      </div>
                      <div>
                        <h3 className="text-[16px] font-bold text-[#1a1a2e]">Play on This Screen</h3>
                        <p className="text-[13px] text-gray-500">Everyone votes on the same device</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 ml-auto flex-shrink-0" />
                    </div>
                  </GlassCard>
                </motion.button>

                {/* Create Room */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateRoom}
                  disabled={isLoading}
                  className="w-full"
                >
                  <GlassCard className="p-6 text-left hover:shadow-[0_12px_40px_rgba(59,130,246,0.1)] transition-shadow cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-[16px] font-bold text-[#1a1a2e]">
                          {isLoading ? 'Creating...' : 'Create a Room'}
                        </h3>
                        <p className="text-[13px] text-gray-500">Host a game, players join on their phones</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 ml-auto flex-shrink-0" />
                    </div>
                  </GlassCard>
                </motion.button>

                {/* Join Room */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setMode('join')}
                  className="w-full"
                >
                  <GlassCard className="p-6 text-left hover:shadow-[0_12px_40px_rgba(99,102,241,0.1)] transition-shadow cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <ArrowRight className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-[16px] font-bold text-[#1a1a2e]">Join a Room</h3>
                        <p className="text-[13px] text-gray-500">Enter a room code to join as a player</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 ml-auto flex-shrink-0" />
                    </div>
                  </GlassCard>
                </motion.button>

                {roomError && (
                  <p className="text-red-500 text-sm text-center">{roomError}</p>
                )}
              </motion.div>
            )}

            {mode === 'join' && (
              <motion.div
                key="join"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <GlassCard className="p-8 text-center">
                  <h2 className="text-xl font-bold mb-2">Join a Room</h2>
                  <p className="text-sm text-gray-500 mb-6">Enter the room code shared by your host.</p>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase())
                      setJoinError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleJoinRoom()
                    }}
                    placeholder="Room code"
                    maxLength={8}
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-center text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                  />
                  {(joinError || roomError) && (
                    <p className="text-red-500 text-sm mb-4">{joinError || roomError}</p>
                  )}
                  <button
                    onClick={handleJoinRoom}
                    disabled={!joinCode.trim() || isLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-[15px] transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] bg-gradient-to-r from-blue-500 to-indigo-500"
                  >
                    {isLoading ? 'Joining...' : 'Join Room'} <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setMode('select')
                      setJoinCode('')
                      setJoinError(null)
                    }}
                    className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Back
                  </button>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </GameLayout>
  )
}
