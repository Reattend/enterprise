'use client'

import React, { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Plus,
  Play,
  RotateCcw,
  Trash2,
  ChevronRight,
  Trophy,
  CheckCircle2,
  XCircle,
  Users,
  Brain,
  Eye,
  Send,
  Crown,
  Target,
  Shield,
} from 'lucide-react'
import { GlassCard } from '@/components/game/glass-card'
import { GameLayout } from '@/components/game/game-layout'
import { TeamNameInput } from '@/components/game/team-name-input'
import { RoomLobby } from '@/components/game/room-lobby'
import { PlayerWaiting } from '@/components/game/player-waiting'
import { RoomBar } from '@/components/game/room-bar'
import { useGameRoom, type UseGameRoomReturn } from '@/hooks/use-game-room'
import { useLocalGameState } from '@/hooks/use-local-game-state'

// --------------- Types ---------------

interface Player {
  name: string
  statements: [string, string, string]
  lieIndex: number // 0, 1, or 2 - which statement is the lie
}

interface RoundResult {
  playerName: string
  guessedCorrectly: boolean
  lieStatement: string
}

type LocalPhase = 'setup' | 'play' | 'results'

interface LocalGameState {
  phase: LocalPhase
  players: Player[]
  results: RoundResult[]
}

const INITIAL_LOCAL_STATE: LocalGameState = {
  phase: 'setup',
  players: [],
  results: [],
}

// Room phases for multiplayer
type RoomPhase = 'submitting' | 'guessing' | 'reveal' | 'results'

// Submission action payload
interface SubmissionPayload {
  statements: [string, string, string]
  lieIndex: number
  playerName: string
}

// Guess action payload
interface GuessPayload {
  roundIndex: number
  guessedIndex: number
  playerName: string
}

// --------------- Helpers ---------------

function shuffleStatements(
  statements: [string, string, string],
  lieIndex: number
): { shuffled: string[]; shuffledLieIndex: number } {
  const indexed = statements.map((s, i) => ({ text: s, originalIndex: i }))
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indexed[i], indexed[j]] = [indexed[j], indexed[i]]
  }
  const shuffledLieIndex = indexed.findIndex(
    (item) => item.originalIndex === lieIndex
  )
  return {
    shuffled: indexed.map((item) => item.text),
    shuffledLieIndex,
  }
}

// --------------- Shared Content ---------------

function HeroContent({ phase }: { phase?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-emerald-600 mb-6">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Free team game
      </span>
      <h1 className="text-[36px] md:text-[50px] font-bold tracking-[-0.03em] leading-[1.08]">
        Two Truths & A Lie
      </h1>
      <p className="text-gray-500 mt-4 text-[17px] leading-relaxed max-w-xl mx-auto">
        The classic icebreaker, digitized. Each person shares two truths and one
        lie. The team guesses which is the lie.
      </p>

      {(!phase || phase === 'setup') && (
        <div className="mt-6 flex items-center justify-center gap-2 text-[14px] text-gray-400">
          <Users className="w-4 h-4" />
          <span>2+ players - perfect for TGIF, team meetings, and offsites</span>
        </div>
      )}
    </motion.div>
  )
}

function CtaSection() {
  return (
    <section className="relative z-10 px-5 pb-20">
      <div className="max-w-[600px] mx-auto relative">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-400/5 to-emerald-200/10 blur-xl" />
        <div className="relative z-10">
          <GlassCard className="p-10 md:p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <Brain className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-[12px] font-bold uppercase tracking-wider text-gray-400 mb-4">
              Built by Reattend
            </p>
            <h3 className="text-[20px] md:text-[24px] font-bold text-[#1a1a2e] mb-3">
              Remember every team decision
            </h3>
            <p className="text-gray-500 text-[15px] max-w-md mx-auto mb-6 leading-relaxed">
              Reattend captures every team decision and makes your knowledge
              searchable forever.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-[15px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] transition-all px-7 py-3.5 rounded-full shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
            >
              Try Reattend free <ArrowRight className="w-4 h-4" />
            </Link>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}

function BgBlobs() {
  return (
    <>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-emerald-500/8 via-emerald-400/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
    </>
  )
}

// ===============================================================
// LOCAL MODE: Setup Phase
// ===============================================================

function LocalSetupPhase({ onStart }: { onStart: (players: Player[]) => void }) {
  const [players, setPlayers] = useState<Player[]>([])
  const [name, setName] = useState('')
  const [statements, setStatements] = useState(['', '', ''])
  const [lieIndex, setLieIndex] = useState<number>(0)
  const [showForm, setShowForm] = useState(true)
  const [error, setError] = useState('')

  const handleAddPlayer = useCallback(() => {
    setError('')
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter a name.')
      return
    }
    if (
      players.some(
        (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      setError('A player with this name already exists.')
      return
    }
    const trimmedStatements = statements.map((s) => s.trim())
    if (trimmedStatements.some((s) => !s)) {
      setError('Please fill in all three statements.')
      return
    }

    const newPlayer: Player = {
      name: trimmedName,
      statements: trimmedStatements as [string, string, string],
      lieIndex,
    }

    setPlayers((prev) => [...prev, newPlayer])
    setName('')
    setStatements(['', '', ''])
    setLieIndex(0)
    setShowForm(false)
  }, [name, statements, lieIndex, players])

  const handleRemovePlayer = useCallback((index: number) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <div className="max-w-[600px] mx-auto">
      {/* Player list */}
      {players.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h3 className="text-[15px] font-bold text-gray-700 mb-3">
            Players added ({players.length})
          </h3>
          <div className="space-y-2">
            {players.map((player, i) => (
              <motion.div
                key={player.name}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[13px] font-bold text-emerald-700">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[14px] font-semibold text-[#1a1a2e]">
                      {player.name}
                    </span>
                    <span className="text-[12px] text-gray-400">
                      3 statements ready
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemovePlayer(i)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Add player form */}
      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <GlassCard className="p-6 md:p-8">
              <h3 className="text-[17px] font-bold text-[#1a1a2e] mb-5">
                {players.length === 0
                  ? 'Add the first player'
                  : 'Add another player'}
              </h3>

              {/* Name */}
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah"
                  className="w-full px-4 py-3 rounded-xl bg-white/70 border border-white/80 text-[14px] text-[#1a1a2e] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 transition-all"
                />
              </div>

              {/* Statements */}
              <div className="mb-5 space-y-3">
                <label className="block text-[13px] font-semibold text-gray-600 mb-1">
                  Enter 3 statements (2 truths and 1 lie)
                </label>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex items-center gap-2 pt-3">
                      <input
                        type="radio"
                        name="lieSelect"
                        checked={lieIndex === i}
                        onChange={() => setLieIndex(i)}
                        className="w-4 h-4 text-red-500 accent-red-500 cursor-pointer"
                      />
                      <span className="text-[11px] text-red-400 font-medium w-6">
                        {lieIndex === i ? 'LIE' : ''}
                      </span>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={statements[i]}
                        onChange={(e) => {
                          const updated = [...statements]
                          updated[i] = e.target.value
                          setStatements(updated)
                        }}
                        placeholder={`Statement ${i + 1}`}
                        className="w-full px-4 py-3 rounded-xl bg-white/70 border border-white/80 text-[14px] text-[#1a1a2e] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 transition-all"
                      />
                    </div>
                  </div>
                ))}
                <p className="text-[12px] text-gray-400 ml-[52px]">
                  Select the radio button next to the statement that is the lie.
                </p>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-[13px] mb-4"
                >
                  {error}
                </motion.p>
              )}

              <button
                onClick={handleAddPlayer}
                className="inline-flex items-center gap-2 text-[14px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] transition-all px-6 py-3 rounded-full shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
              >
                <Plus className="w-4 h-4" />
                Add Player
              </button>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div
            key="addMore"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-center gap-3"
          >
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 text-[14px] font-bold text-emerald-600 bg-white/70 hover:bg-white/90 border border-emerald-200 active:scale-[0.97] transition-all px-5 py-3 rounded-full"
            >
              <Plus className="w-4 h-4" />
              Add Another Player
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start game */}
      {players.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center"
        >
          <button
            onClick={() => onStart(players)}
            className="inline-flex items-center gap-2 text-[16px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] transition-all px-8 py-4 rounded-full shadow-[0_4px_20px_rgba(16,185,129,0.35)]"
          >
            <Play className="w-5 h-5" />
            Start Game
          </button>
          <p className="text-[13px] text-gray-400 mt-2">
            {players.length} players ready
          </p>
        </motion.div>
      )}
    </div>
  )
}

// ===============================================================
// LOCAL MODE: Play Phase
// ===============================================================

function LocalPlayPhase({
  players,
  onFinish,
}: {
  players: Player[]
  onFinish: (results: RoundResult[]) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [guessedIndex, setGuessedIndex] = useState<number | null>(null)
  const [results, setResults] = useState<RoundResult[]>([])
  const [revealed, setRevealed] = useState(false)

  const currentPlayer = players[currentIndex]

  const shuffledData = useMemo(() => {
    return players.map((p) => shuffleStatements(p.statements, p.lieIndex))
  }, [players])

  const { shuffled, shuffledLieIndex } = shuffledData[currentIndex]
  const score = results.filter((r) => r.guessedCorrectly).length

  const handleGuess = useCallback(
    (index: number) => {
      if (revealed) return
      setGuessedIndex(index)
      setRevealed(true)

      const correct = index === shuffledLieIndex
      setResults((prev) => [
        ...prev,
        {
          playerName: currentPlayer.name,
          guessedCorrectly: correct,
          lieStatement: shuffled[shuffledLieIndex],
        },
      ])
    },
    [revealed, shuffledLieIndex, currentPlayer.name, shuffled]
  )

  const handleNext = useCallback(() => {
    const nextIdx = currentIndex + 1
    if (nextIdx >= players.length) {
      onFinish(results)
    } else {
      setCurrentIndex(nextIdx)
      setGuessedIndex(null)
      setRevealed(false)
    }
  }, [currentIndex, players.length, results, onFinish])

  const isCorrect = guessedIndex === shuffledLieIndex

  return (
    <div className="max-w-[700px] mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-[13px] text-gray-500 mb-2">
          <span>
            Player {currentIndex + 1} of {players.length}
          </span>
          <span>
            Score: {score} / {results.length > 0 ? results.length : 0}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 overflow-hidden">
          <motion.div
            className="h-full bg-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${(currentIndex / players.length) * 100}%`,
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Current player */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPlayer.name}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.35 }}
        >
          {/* Player name */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-[24px] font-bold text-emerald-700">
                {currentPlayer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <h2 className="text-[28px] md:text-[36px] font-bold text-[#1a1a2e]">
              {currentPlayer.name}
            </h2>
            <p className="text-gray-500 text-[15px] mt-1">
              Which statement is the lie?
            </p>
          </div>

          {/* Statement cards */}
          <StatementCards
            shuffled={shuffled}
            shuffledLieIndex={shuffledLieIndex}
            revealed={revealed}
            guessedIndex={guessedIndex}
            isCorrect={isCorrect}
            onGuess={handleGuess}
          />

          {/* Result message */}
          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="mt-8 text-center"
              >
                {isCorrect ? (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: [0.9, 1.05, 1] }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <motion.div
                        animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                      >
                        <Trophy className="w-7 h-7 text-emerald-500" />
                      </motion.div>
                      <div className="text-left">
                        <p className="text-[16px] font-bold text-emerald-700">
                          Correct! That was the lie!
                        </p>
                        <p className="text-[13px] text-emerald-500 mt-0.5">
                          Nice detective work.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-red-50 border border-red-200">
                    <XCircle className="w-7 h-7 text-red-400" />
                    <div className="text-left">
                      <p className="text-[16px] font-bold text-red-600">
                        Wrong!
                      </p>
                      <p className="text-[13px] text-red-400 mt-0.5">
                        The lie was: &quot;{shuffled[shuffledLieIndex]}&quot;
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 text-[15px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] transition-all px-7 py-3.5 rounded-full shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
                  >
                    {currentIndex + 1 < players.length ? (
                      <>
                        Next Player <ChevronRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        See Results <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ===============================================================
// Shared: Statement Cards Component
// ===============================================================

function StatementCards({
  shuffled,
  shuffledLieIndex,
  revealed,
  guessedIndex,
  isCorrect,
  onGuess,
  large = false,
}: {
  shuffled: string[]
  shuffledLieIndex: number
  revealed: boolean
  guessedIndex: number | null
  isCorrect: boolean
  onGuess: (index: number) => void
  large?: boolean
}) {
  return (
    <div className="space-y-4">
      {shuffled.map((statement, i) => {
        let cardStyle =
          'bg-white/70 border-white/80 hover:border-emerald-300 hover:shadow-[0_4px_20px_rgba(16,185,129,0.1)] cursor-pointer'
        let numberStyle = 'bg-emerald-50 text-emerald-600'

        if (revealed) {
          if (i === shuffledLieIndex) {
            cardStyle =
              'bg-red-50/80 border-red-200 shadow-[0_4px_20px_rgba(239,68,68,0.12)]'
            numberStyle = 'bg-red-100 text-red-600'
          } else {
            cardStyle =
              'bg-emerald-50/80 border-emerald-200 shadow-[0_4px_20px_rgba(16,185,129,0.12)]'
            numberStyle = 'bg-emerald-100 text-emerald-600'
          }
        } else if (guessedIndex === i) {
          cardStyle =
            'bg-emerald-50/60 border-emerald-300 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
        }

        return (
          <motion.button
            key={i}
            onClick={() => onGuess(i)}
            disabled={revealed}
            initial={{ opacity: 0, y: 16 }}
            animate={
              revealed && i === guessedIndex && !isCorrect
                ? {
                    opacity: 1,
                    y: 0,
                    x: [0, -8, 8, -6, 6, -3, 3, 0],
                  }
                : { opacity: 1, y: 0 }
            }
            transition={
              revealed && i === guessedIndex && !isCorrect
                ? { duration: 0.5, ease: 'easeInOut' }
                : { delay: i * 0.08 }
            }
            className={`w-full flex items-start gap-4 ${large ? 'p-6 md:p-8' : 'p-5 md:p-6'} rounded-2xl border backdrop-blur-xl transition-all text-left ${cardStyle} ${!revealed ? 'active:scale-[0.98]' : ''}`}
          >
            <div
              className={`${large ? 'w-12 h-12 text-[20px]' : 'w-10 h-10 text-[16px]'} rounded-full flex items-center justify-center shrink-0 font-bold transition-colors ${numberStyle}`}
            >
              {i + 1}
            </div>
            <span
              className={`${large ? 'text-[20px] md:text-[26px]' : 'text-[16px] md:text-[18px]'} leading-relaxed text-[#1a1a2e] pt-1.5`}
            >
              {statement}
            </span>
            {revealed && i === shuffledLieIndex && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto shrink-0 mt-1.5"
              >
                <XCircle className={`${large ? 'w-7 h-7' : 'w-6 h-6'} text-red-400`} />
              </motion.span>
            )}
            {revealed && i !== shuffledLieIndex && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto shrink-0 mt-1.5"
              >
                <CheckCircle2
                  className={`${large ? 'w-7 h-7' : 'w-6 h-6'} text-emerald-400`}
                />
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

// ===============================================================
// LOCAL MODE: Results Panel
// ===============================================================

function LocalResultsPanel({
  results,
  onPlayAgain,
}: {
  results: RoundResult[]
  onPlayAgain: () => void
}) {
  const correctCount = results.filter((r) => r.guessedCorrectly).length
  const total = results.length
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Score card */}
      <GlassCard className="p-8 md:p-10 text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 15,
            delay: 0.2,
          }}
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <Trophy className="w-10 h-10 text-emerald-500" />
          </div>
        </motion.div>
        <h2 className="text-[32px] md:text-[40px] font-bold text-[#1a1a2e]">
          {correctCount} / {total}
        </h2>
        <p className="text-gray-500 text-[16px] mt-1">
          {percentage >= 80
            ? 'Amazing! You really know your teammates!'
            : percentage >= 50
              ? 'Not bad! Good guessing skills.'
              : 'Tricky bunch! Better luck next time.'}
        </p>
        <div className="mt-5 w-full h-3 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          />
        </div>
        <p className="text-[13px] text-gray-400 mt-2">{percentage}% accuracy</p>
      </GlassCard>

      {/* Player breakdown */}
      <GlassCard className="overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-white/60">
          <span className="text-[13px] font-bold uppercase tracking-wider text-gray-400">
            Round Breakdown
          </span>
        </div>
        <div className="divide-y divide-white/60">
          {results.map((result, i) => (
            <motion.div
              key={result.playerName}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="px-6 py-4 flex items-center gap-4"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  result.guessedCorrectly ? 'bg-emerald-100' : 'bg-red-50'
                }`}
              >
                {result.guessedCorrectly ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[#1a1a2e]">
                  {result.playerName}
                </p>
                {!result.guessedCorrectly && (
                  <p className="text-[12px] text-gray-400 truncate">
                    Lie: &quot;{result.lieStatement}&quot;
                  </p>
                )}
              </div>
              <span
                className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${
                  result.guessedCorrectly
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-red-50 text-red-400'
                }`}
              >
                {result.guessedCorrectly ? 'Caught!' : 'Fooled'}
              </span>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Play again */}
      <div className="text-center">
        <button
          onClick={onPlayAgain}
          className="inline-flex items-center gap-2 text-[15px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] transition-all px-7 py-3.5 rounded-full shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
        >
          <RotateCcw className="w-4 h-4" />
          Play Again
        </button>
      </div>
    </motion.div>
  )
}

// ===============================================================
// HOST MODE: Host View
// ===============================================================

function HostView({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const roomPhase = (gameRoom.room?.phase as RoomPhase) || 'submitting'
  const roomState = gameRoom.room?.state || {}
  const currentIndex: number = roomState.currentIndex ?? 0

  const submissions = useMemo(
    () => gameRoom.getActionsOfType('submit_statements'),
    [gameRoom]
  )

  const guesses = useMemo(
    () => gameRoom.getActionsOfType('guess_lie'),
    [gameRoom]
  )

  // Build player data from submissions
  const playerSubmissions: SubmissionPayload[] = useMemo(() => {
    return submissions.map((a) => a.payload as unknown as SubmissionPayload)
  }, [submissions])

  const currentSubmission = playerSubmissions[currentIndex]

  // Shuffled data for current round (deterministic per round via roomState seed if available)
  const shuffledData = useMemo(() => {
    if (!currentSubmission) return null
    return shuffleStatements(
      currentSubmission.statements,
      currentSubmission.lieIndex
    )
  }, [currentSubmission])

  // Guesses for current round
  const currentRoundGuesses = useMemo(() => {
    return guesses.filter(
      (a) => (a.payload as unknown as GuessPayload).roundIndex === currentIndex
    )
  }, [guesses, currentIndex])

  // Calculate scores for results
  const scoreBoard = useMemo(() => {
    if (roomPhase !== 'results') return []

    // Who guessed correctly the most (best detective)
    const detectiveScores: Record<string, { correct: number; total: number; name: string }> = {}
    // Who fooled the most (best liar)
    const liarScores: Record<string, { fooled: number; total: number; name: string }> = {}

    playerSubmissions.forEach((sub, roundIdx) => {
      const roundGuesses = guesses.filter(
        (a) => (a.payload as unknown as GuessPayload).roundIndex === roundIdx
      )

      // Initialize liar score
      if (!liarScores[sub.playerName]) {
        liarScores[sub.playerName] = { fooled: 0, total: 0, name: sub.playerName }
      }

      roundGuesses.forEach((g) => {
        const gPayload = g.payload as unknown as GuessPayload
        const gName = gPayload.playerName || 'Unknown'

        if (!detectiveScores[gName]) {
          detectiveScores[gName] = { correct: 0, total: 0, name: gName }
        }
        detectiveScores[gName].total += 1

        if (gPayload.guessedIndex === sub.lieIndex) {
          detectiveScores[gName].correct += 1
        } else {
          liarScores[sub.playerName].fooled += 1
        }
        liarScores[sub.playerName].total += 1
      })
    })

    return { detectiveScores, liarScores }
  }, [roomPhase, guesses, playerSubmissions])

  // ---- Host controls ----

  const startGuessing = useCallback(async () => {
    if (submissions.length < 2) return
    await gameRoom.updateRoom({
      phase: 'guessing',
      status: 'playing',
      state: { currentIndex: 0, totalRounds: submissions.length },
    })
  }, [gameRoom, submissions.length])

  const revealLie = useCallback(async () => {
    await gameRoom.updateRoom({
      phase: 'reveal',
      state: { ...roomState, revealed: true },
    })
  }, [gameRoom, roomState])

  const nextRound = useCallback(async () => {
    const nextIdx = currentIndex + 1
    if (nextIdx >= playerSubmissions.length) {
      await gameRoom.updateRoom({
        phase: 'results',
        status: 'finished',
        state: { ...roomState, currentIndex: nextIdx },
      })
    } else {
      await gameRoom.updateRoom({
        phase: 'guessing',
        state: { ...roomState, currentIndex: nextIdx, revealed: false },
      })
    }
  }, [gameRoom, roomState, currentIndex, playerSubmissions.length])

  const resetRoom = useCallback(async () => {
    await gameRoom.updateRoom({
      phase: 'submitting',
      status: 'lobby',
      state: {},
    })
  }, [gameRoom])

  // ---- Render ----

  // Submitting phase - lobby view
  if (roomPhase === 'submitting') {
    return (
      <div className="max-w-[600px] mx-auto">
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-[22px] font-bold mb-2">
            Waiting for Submissions
          </h2>
          <p className="text-gray-500 text-[15px] mb-6">
            Players submit their 2 truths and 1 lie from their phones.
          </p>

          {/* Submission count */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Users className="w-4 h-4 text-emerald-500" />
              <span className="text-[16px] font-bold text-emerald-700">
                {submissions.length} / {gameRoom.players.length} submitted
              </span>
            </div>

            {/* Players list with submission status */}
            <div className="space-y-2 max-w-sm mx-auto">
              {gameRoom.players.map((player) => {
                const hasSubmitted = submissions.some(
                  (s) => s.playerId === player.playerId
                )
                return (
                  <div
                    key={player.playerId}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl ${
                      hasSubmitted
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <span className="text-[14px] font-medium">
                      {player.name}
                      {player.isHost && (
                        <span className="text-[10px] text-emerald-500 font-bold uppercase ml-1.5">
                          Host
                        </span>
                      )}
                    </span>
                    {hasSubmitted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'linear',
                        }}
                        className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <button
            onClick={startGuessing}
            disabled={submissions.length < 2}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-white font-bold text-[15px] transition-all active:scale-[0.98] ${
              submissions.length >= 2
                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_16px_rgba(16,185,129,0.3)]'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4" />
            {submissions.length >= 2
              ? 'Start Guessing'
              : `Need ${2 - submissions.length} more submissions`}
          </button>
        </GlassCard>
      </div>
    )
  }

  // Guessing / Reveal phase - show statements on big screen
  if (roomPhase === 'guessing' || roomPhase === 'reveal') {
    if (!currentSubmission || !shuffledData) {
      return (
        <div className="max-w-[600px] mx-auto">
          <GlassCard className="p-8 text-center">
            <p className="text-gray-500">Loading round...</p>
          </GlassCard>
        </div>
      )
    }

    const isRevealed = roomPhase === 'reveal'

    return (
      <div className="max-w-[800px] mx-auto">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-[13px] text-gray-500 mb-2">
            <span>
              Round {currentIndex + 1} of {playerSubmissions.length}
            </span>
            <span>
              {currentRoundGuesses.length} guesses received
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/60 border border-white/80 overflow-hidden">
            <motion.div
              className="h-full bg-emerald-400 rounded-full"
              animate={{
                width: `${((currentIndex + 1) / playerSubmissions.length) * 100}%`,
              }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {/* Player name */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-[32px] font-bold text-emerald-700">
              {currentSubmission.playerName.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-[32px] md:text-[44px] font-bold text-[#1a1a2e]">
            {currentSubmission.playerName}
          </h2>
          <p className="text-gray-500 text-[17px] mt-1">
            {isRevealed
              ? 'The lie has been revealed!'
              : 'Which statement is the lie?'}
          </p>
        </div>

        {/* Statements - large for big screen */}
        <StatementCards
          shuffled={shuffledData.shuffled}
          shuffledLieIndex={shuffledData.shuffledLieIndex}
          revealed={isRevealed}
          guessedIndex={null}
          isCorrect={false}
          onGuess={() => {}}
          large
        />

        {/* Host controls */}
        <div className="mt-8 text-center">
          {!isRevealed && (
            <button
              onClick={revealLie}
              className="inline-flex items-center gap-2 text-[16px] font-bold text-white bg-red-500 hover:bg-red-600 active:scale-[0.97] transition-all px-8 py-4 rounded-full shadow-[0_4px_20px_rgba(239,68,68,0.35)]"
            >
              <Eye className="w-5 h-5" />
              Reveal the Lie
            </button>
          )}
          {isRevealed && (
            <button
              onClick={nextRound}
              className="inline-flex items-center gap-2 text-[16px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] transition-all px-8 py-4 rounded-full shadow-[0_4px_20px_rgba(16,185,129,0.35)]"
            >
              {currentIndex + 1 < playerSubmissions.length ? (
                <>
                  Next Round <ChevronRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  See Results <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Results phase
  if (roomPhase === 'results' && scoreBoard) {
    const { detectiveScores, liarScores } = scoreBoard as {
      detectiveScores: Record<string, { correct: number; total: number; name: string }>
      liarScores: Record<string, { fooled: number; total: number; name: string }>
    }

    const detectiveRanking = Object.values(detectiveScores).sort(
      (a, b) => b.correct - a.correct
    )
    const liarRanking = Object.values(liarScores).sort(
      (a, b) => b.fooled - a.fooled
    )

    return (
      <div className="max-w-[700px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
            >
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-emerald-500" />
              </div>
            </motion.div>
            <h2 className="text-[32px] md:text-[40px] font-bold text-[#1a1a2e]">
              Game Results
            </h2>
            <p className="text-gray-500 mt-1">
              {playerSubmissions.length} rounds played
            </p>
          </div>

          {/* Best Detective */}
          {detectiveRanking.length > 0 && (
            <GlassCard className="p-6 md:p-8 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-emerald-500" />
                <h3 className="text-[17px] font-bold text-[#1a1a2e]">
                  Best Detective
                </h3>
              </div>
              <div className="space-y-3">
                {detectiveRanking.map((entry, i) => (
                  <motion.div
                    key={entry.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${
                        i === 0
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {i === 0 ? (
                        <Crown className="w-4 h-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className="text-[15px] font-semibold flex-1">
                      {entry.name}
                    </span>
                    <span className="text-[14px] font-bold text-emerald-600">
                      {entry.correct}/{entry.total} correct
                    </span>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Best Liar */}
          {liarRanking.length > 0 && (
            <GlassCard className="p-6 md:p-8 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-red-400" />
                <h3 className="text-[17px] font-bold text-[#1a1a2e]">
                  Best Liar
                </h3>
              </div>
              <div className="space-y-3">
                {liarRanking.map((entry, i) => (
                  <motion.div
                    key={entry.name}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${
                        i === 0
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {i === 0 ? (
                        <Crown className="w-4 h-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    <span className="text-[15px] font-semibold flex-1">
                      {entry.name}
                    </span>
                    <span className="text-[14px] font-bold text-red-500">
                      Fooled {entry.fooled} time{entry.fooled !== 1 ? 's' : ''}
                    </span>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Play again */}
          <div className="text-center">
            <button
              onClick={resetRoom}
              className="inline-flex items-center gap-2 text-[15px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] transition-all px-7 py-3.5 rounded-full shadow-[0_4px_16px_rgba(16,185,129,0.3)]"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return null
}

// ===============================================================
// PLAYER MODE: Player View
// ===============================================================

function PlayerView({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const roomPhase = (gameRoom.room?.phase as RoomPhase) || 'submitting'
  const roomState = gameRoom.room?.state || {}
  const currentIndex: number = roomState.currentIndex ?? 0

  // Check if player has submitted
  const mySubmissions = useMemo(
    () =>
      gameRoom
        .getActionsOfType('submit_statements')
        .filter((a) => a.playerId === gameRoom.playerId),
    [gameRoom]
  )
  const hasSubmitted = mySubmissions.length > 0

  // Check if player has guessed this round
  const myGuesses = useMemo(
    () =>
      gameRoom
        .getActionsOfType('guess_lie')
        .filter(
          (a) =>
            a.playerId === gameRoom.playerId &&
            (a.payload as unknown as GuessPayload).roundIndex === currentIndex
        ),
    [gameRoom, currentIndex]
  )
  const hasGuessedThisRound = myGuesses.length > 0

  // Get all submissions for display
  const allSubmissions = useMemo(
    () => gameRoom.getActionsOfType('submit_statements'),
    [gameRoom]
  )
  const currentSubmission = allSubmissions[currentIndex]
    ?.payload as unknown as SubmissionPayload | undefined

  // Shuffled data for current round
  const shuffledData = useMemo(() => {
    if (!currentSubmission) return null
    return shuffleStatements(
      currentSubmission.statements,
      currentSubmission.lieIndex
    )
  }, [currentSubmission])

  // My score across all rounds
  const myScore = useMemo(() => {
    const allGuesses = gameRoom
      .getActionsOfType('guess_lie')
      .filter((a) => a.playerId === gameRoom.playerId)

    let correct = 0
    allGuesses.forEach((g) => {
      const gPayload = g.payload as unknown as GuessPayload
      const sub = allSubmissions[gPayload.roundIndex]
        ?.payload as unknown as SubmissionPayload | undefined
      if (sub && gPayload.guessedIndex === sub.lieIndex) {
        correct++
      }
    })
    return correct
  }, [gameRoom, allSubmissions])

  // ---- Submission state ----
  const [statements, setStatements] = useState<string[]>(['', '', ''])
  const [lieIndex, setLieIndex] = useState<number>(0)
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    setSubmitError('')
    const trimmed = statements.map((s) => s.trim())
    if (trimmed.some((s) => !s)) {
      setSubmitError('Please fill in all three statements.')
      return
    }

    setIsSubmitting(true)
    try {
      await gameRoom.submitAction('submit_statements', {
        statements: trimmed as [string, string, string],
        lieIndex,
        playerName: gameRoom.playerName || 'Unknown',
      })
    } catch {
      setSubmitError('Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [statements, lieIndex, gameRoom])

  const handleGuess = useCallback(
    async (guessedIndex: number) => {
      if (hasGuessedThisRound) return
      try {
        await gameRoom.submitAction('guess_lie', {
          roundIndex: currentIndex,
          guessedIndex,
          playerName: gameRoom.playerName || 'Unknown',
        })
      } catch {
        // Error already handled by hook
      }
    },
    [gameRoom, currentIndex, hasGuessedThisRound]
  )

  // ---- Render ----

  // Submitting phase - player enters their statements
  if (roomPhase === 'submitting') {
    if (hasSubmitted) {
      return (
        <div className="max-w-md mx-auto">
          <PlayerWaiting
            hasSubmitted
            submittedMessage="Your statements are submitted!"
            message="Waiting for everyone else to submit..."
            accentColor="#059669"
            roomCode={gameRoom.roomCode || undefined}
          />
        </div>
      )
    }

    return (
      <div className="max-w-md mx-auto">
        <GlassCard className="p-6">
          <h3 className="text-[18px] font-bold text-[#1a1a2e] mb-2">
            Your Statements
          </h3>
          <p className="text-[14px] text-gray-500 mb-5">
            Enter 2 truths and 1 lie. Mark which is the lie.
          </p>

          <div className="space-y-3 mb-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex items-center gap-2 pt-3">
                  <input
                    type="radio"
                    name="playerLieSelect"
                    checked={lieIndex === i}
                    onChange={() => setLieIndex(i)}
                    className="w-4 h-4 text-red-500 accent-red-500 cursor-pointer"
                  />
                  <span className="text-[11px] text-red-400 font-medium w-6">
                    {lieIndex === i ? 'LIE' : ''}
                  </span>
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={statements[i]}
                    onChange={(e) => {
                      const updated = [...statements]
                      updated[i] = e.target.value
                      setStatements(updated)
                    }}
                    placeholder={`Statement ${i + 1}`}
                    className="w-full px-4 py-3 rounded-xl bg-white/70 border border-white/80 text-[14px] text-[#1a1a2e] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 transition-all"
                  />
                </div>
              </div>
            ))}
            <p className="text-[12px] text-gray-400 ml-[52px]">
              Select the radio button next to the lie.
            </p>
          </div>

          {submitError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-[13px] mb-4"
            >
              {submitError}
            </motion.p>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 text-[15px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] transition-all px-6 py-3.5 rounded-full shadow-[0_4px_16px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Statements'}
          </button>
        </GlassCard>
      </div>
    )
  }

  // Guessing phase - player picks which is the lie
  if (roomPhase === 'guessing') {
    if (!currentSubmission || !shuffledData) {
      return (
        <div className="max-w-md mx-auto">
          <PlayerWaiting
            message="Loading round..."
            accentColor="#059669"
          />
        </div>
      )
    }

    // If this is the player's own round, they wait
    if (currentSubmission.playerName === gameRoom.playerName) {
      return (
        <div className="max-w-md mx-auto">
          <PlayerWaiting
            hasSubmitted
            submittedMessage="This is your round!"
            message="Sit tight while others guess your lie."
            accentColor="#059669"
            roomCode={gameRoom.roomCode || undefined}
          />
        </div>
      )
    }

    if (hasGuessedThisRound) {
      return (
        <div className="max-w-md mx-auto">
          <PlayerWaiting
            hasSubmitted
            submittedMessage="Guess submitted!"
            message="Waiting for the host to reveal the lie..."
            accentColor="#059669"
            roomCode={gameRoom.roomCode || undefined}
          />
        </div>
      )
    }

    return (
      <div className="max-w-md mx-auto">
        <GlassCard className="p-6">
          <div className="text-center mb-5">
            <p className="text-[13px] text-gray-400 mb-1">
              Round {currentIndex + 1} - {currentSubmission.playerName}
            </p>
            <h3 className="text-[18px] font-bold text-[#1a1a2e]">
              Which is the lie?
            </h3>
          </div>

          <div className="space-y-3">
            {shuffledData.shuffled.map((statement, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => handleGuess(i)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/70 border border-white/80 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[15px] font-bold shrink-0">
                  {i + 1}
                </div>
                <span className="text-[15px] text-[#1a1a2e]">{statement}</span>
              </motion.button>
            ))}
          </div>
        </GlassCard>
      </div>
    )
  }

  // Reveal phase - show if they guessed right
  if (roomPhase === 'reveal') {
    if (!currentSubmission || !shuffledData) {
      return (
        <div className="max-w-md mx-auto">
          <PlayerWaiting
            message="Revealing..."
            accentColor="#059669"
          />
        </div>
      )
    }

    const myGuessForThisRound = gameRoom
      .getActionsOfType('guess_lie')
      .find(
        (a) =>
          a.playerId === gameRoom.playerId &&
          (a.payload as unknown as GuessPayload).roundIndex === currentIndex
      )

    const myGuessedIndex = myGuessForThisRound
      ? (myGuessForThisRound.payload as unknown as GuessPayload).guessedIndex
      : null

    const isMyRound = currentSubmission.playerName === gameRoom.playerName
    const guessedCorrectly =
      myGuessedIndex !== null &&
      myGuessedIndex === currentSubmission.lieIndex

    return (
      <div className="max-w-md mx-auto">
        <GlassCard className="p-6 text-center">
          <div className="mb-4">
            <p className="text-[13px] text-gray-400 mb-1">
              {currentSubmission.playerName}&apos;s round
            </p>
          </div>

          {isMyRound ? (
            <div className="py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="text-[17px] font-bold text-[#1a1a2e]">
                Your lie was revealed!
              </p>
              <p className="text-gray-500 text-[14px] mt-1">
                The lie was: &quot;{currentSubmission.statements[currentSubmission.lieIndex]}&quot;
              </p>
            </div>
          ) : myGuessedIndex !== null ? (
            <div className="py-4">
              {guessedCorrectly ? (
                <>
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </div>
                  <p className="text-[17px] font-bold text-emerald-700">
                    You got it right!
                  </p>
                  <p className="text-gray-500 text-[14px] mt-1">
                    Nice detective work.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                    <XCircle className="w-7 h-7 text-red-400" />
                  </div>
                  <p className="text-[17px] font-bold text-red-600">
                    Wrong guess!
                  </p>
                  <p className="text-gray-500 text-[14px] mt-1">
                    The lie was: &quot;{currentSubmission.statements[currentSubmission.lieIndex]}&quot;
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="py-4">
              <p className="text-gray-500 text-[15px]">
                You did not guess this round.
              </p>
              <p className="text-gray-400 text-[14px] mt-1">
                The lie was: &quot;{currentSubmission.statements[currentSubmission.lieIndex]}&quot;
              </p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[13px] text-gray-400">
              Your score: <span className="font-bold text-emerald-600">{myScore}</span> correct
            </p>
          </div>
        </GlassCard>
      </div>
    )
  }

  // Results phase - show player's own score
  if (roomPhase === 'results') {
    const totalRounds = allSubmissions.length
    const percentage =
      totalRounds > 0 ? Math.round((myScore / totalRounds) * 100) : 0

    return (
      <div className="max-w-md mx-auto">
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-[28px] font-bold text-[#1a1a2e] mb-1">
            {myScore} / {totalRounds}
          </h2>
          <p className="text-gray-500 text-[15px] mb-4">
            {percentage >= 80
              ? 'Amazing detective skills!'
              : percentage >= 50
                ? 'Good guessing!'
                : 'They fooled you!'}
          </p>
          <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden mb-2">
            <motion.div
              className="h-full rounded-full bg-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[13px] text-gray-400">{percentage}% accuracy</p>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-[13px] text-gray-500">
              Check the big screen for full results!
            </p>
          </div>
        </GlassCard>
      </div>
    )
  }

  return null
}

// ===============================================================
// MAIN COMPONENT
// ===============================================================

export function TwoTruthsOneLie() {
  // Team name gate
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [joinRoomCode, setJoinRoomCode] = useState<string | null>(null)
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [joinCodeInput, setJoinCodeInput] = useState('')

  // Game room hook
  const gameRoom = useGameRoom({ gameType: 'two-truths-one-lie' })

  // Local game state with persistence
  const [localState, setLocalState, clearLocalState] =
    useLocalGameState<LocalGameState>('reattend-2t1l-state', INITIAL_LOCAL_STATE)

  // Determine mode
  const isRoomMode = !!gameRoom.roomCode || !!joinRoomCode
  const isHost = gameRoom.isHost
  const isPlayer = isRoomMode && !isHost && !!gameRoom.room

  // ---- Local mode handlers ----
  const handleLocalStart = useCallback(
    (players: Player[]) => {
      setLocalState({ phase: 'play', players, results: [] })
    },
    [setLocalState]
  )

  const handleLocalFinish = useCallback(
    (results: RoundResult[]) => {
      setLocalState((prev) => ({ ...prev, phase: 'results', results }))
    },
    [setLocalState]
  )

  const handleLocalPlayAgain = useCallback(() => {
    clearLocalState()
  }, [clearLocalState])

  // ---- Room mode handlers ----
  const handleCreateRoom = useCallback(async () => {
    try {
      await gameRoom.createRoom()
    } catch {
      // Error handled by hook
    }
  }, [gameRoom])

  const handleJoinRoom = useCallback(() => {
    setShowJoinInput(true)
  }, [])

  const handleJoinSubmit = useCallback(async () => {
    const code = joinCodeInput.trim().toUpperCase()
    if (!code) return
    setJoinRoomCode(code)
    try {
      await gameRoom.joinRoom(code)
      setShowJoinInput(false)
    } catch {
      setJoinRoomCode(null)
    }
  }, [joinCodeInput, gameRoom])

  const handleNameContinue = useCallback(
    (name: string) => {
      setPlayerName(name)
      gameRoom.setPlayerName(name)
    },
    [gameRoom]
  )

  // ---- Shared layout pieces ----

  const heroContent = <HeroContent phase={localState.phase} />

  const bgBlobs = <BgBlobs />

  const ctaSection = <CtaSection />

  const roomBar = gameRoom.roomCode ? (
    <RoomBar
      roomCode={gameRoom.roomCode}
      playerCount={gameRoom.players.length}
      isHost={gameRoom.isHost}
      isConnected={gameRoom.isConnected}
      accentColor="#059669"
    />
  ) : undefined

  // ---- Team name gate ----

  if (!playerName) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        bgBlobs={bgBlobs}
        ctaSection={ctaSection}
      >
        <div className="max-w-md mx-auto">
          <TeamNameInput
            onContinue={handleNameContinue}
            showRoomOptions
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            accentFrom="#059669"
            accentTo="#10B981"
          />

          {/* Join room input */}
          <AnimatePresence>
            {showJoinInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4"
              >
                <GlassCard className="p-6">
                  <h3 className="text-[15px] font-bold mb-3">
                    Enter Room Code
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) =>
                        setJoinCodeInput(e.target.value.toUpperCase())
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleJoinSubmit()
                      }}
                      placeholder="e.g. ABCD"
                      maxLength={8}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-center text-[18px] font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-400/40 uppercase"
                      autoFocus
                    />
                    <button
                      onClick={handleJoinSubmit}
                      disabled={!joinCodeInput.trim()}
                      className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[14px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Join
                    </button>
                  </div>
                  <button
                    onClick={() => setShowJoinInput(false)}
                    className="text-[13px] text-gray-400 hover:text-gray-600 mt-3 transition-colors"
                  >
                    Cancel
                  </button>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GameLayout>
    )
  }

  // ---- Room mode: Lobby (before game starts) ----

  if (gameRoom.roomCode && !gameRoom.room) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        bgBlobs={bgBlobs}
        ctaSection={ctaSection}
        roomBar={roomBar}
      >
        <div className="max-w-md mx-auto text-center">
          <PlayerWaiting
            message={
              gameRoom.isLoading
                ? 'Connecting to room...'
                : gameRoom.error || 'Waiting for room data...'
            }
            accentColor="#059669"
          />
        </div>
      </GameLayout>
    )
  }

  if (
    gameRoom.roomCode &&
    gameRoom.room &&
    gameRoom.room.phase === 'lobby'
  ) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        bgBlobs={bgBlobs}
        ctaSection={ctaSection}
        roomBar={roomBar}
      >
        <div className="max-w-md mx-auto">
          <RoomLobby
            roomCode={gameRoom.roomCode}
            players={gameRoom.players}
            isHost={gameRoom.isHost}
            onStart={async () => {
              await gameRoom.updateRoom({
                phase: 'submitting',
                status: 'playing',
                state: {},
              })
            }}
            minPlayers={2}
            accentColor="#059669"
            gameTitle="Two Truths & A Lie"
          />
        </div>
      </GameLayout>
    )
  }

  // ---- Room mode: Host View ----

  if (isRoomMode && isHost && gameRoom.room) {
    const roomPhase = gameRoom.room.phase as RoomPhase
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={roomPhase === 'results'}
        bgBlobs={bgBlobs}
        ctaSection={ctaSection}
        roomBar={roomBar}
      >
        <HostView gameRoom={gameRoom} />
      </GameLayout>
    )
  }

  // ---- Room mode: Player View ----

  if (isRoomMode && isPlayer && gameRoom.room) {
    const roomPhase = gameRoom.room.phase as RoomPhase
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        bgBlobs={bgBlobs}
        ctaSection={ctaSection}
        roomBar={roomBar}
      >
        <PlayerView gameRoom={gameRoom} />
      </GameLayout>
    )
  }

  // ---- Local mode ----

  const showLocalResults = localState.phase === 'results'

  const localResults =
    localState.phase === 'results' ? (
      <LocalResultsPanel
        results={localState.results}
        onPlayAgain={handleLocalPlayAgain}
      />
    ) : undefined

  return (
    <GameLayout
      heroContent={heroContent}
      showResults={showLocalResults}
      results={localResults}
      bgBlobs={bgBlobs}
      ctaSection={ctaSection}
    >
      <AnimatePresence mode="wait">
        {localState.phase === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LocalSetupPhase onStart={handleLocalStart} />
          </motion.div>
        )}
        {localState.phase === 'play' && (
          <motion.div
            key="play"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LocalPlayPhase
              players={localState.players}
              onFinish={handleLocalFinish}
            />
          </motion.div>
        )}
        {localState.phase === 'results' && (
          <motion.div
            key="results-local-game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* On mobile, results show stacked below via GameLayout */}
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-[22px] font-bold text-[#1a1a2e]">
                Game Complete!
              </h2>
              <p className="text-gray-500 text-[15px] mt-1">
                Check the results panel for your score.
              </p>
              <button
                onClick={handleLocalPlayAgain}
                className="mt-6 inline-flex items-center gap-2 text-[14px] font-bold text-emerald-600 bg-white/70 hover:bg-white/90 border border-emerald-200 active:scale-[0.97] transition-all px-5 py-3 rounded-full"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameLayout>
  )
}
