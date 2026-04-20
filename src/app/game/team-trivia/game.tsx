'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  Plus,
  Trash2,
  Check,
  X,
  Trophy,
  Share2,
  Copy,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Pencil,
  Play,
  Eye,
  Users,
  Crown,
} from 'lucide-react'
import { GlassCard } from '@/components/game/glass-card'
import { GameLayout } from '@/components/game/game-layout'
import { TeamNameInput } from '@/components/game/team-name-input'
import { RoomLobby } from '@/components/game/room-lobby'
import { PlayerWaiting } from '@/components/game/player-waiting'
import { RoomBar } from '@/components/game/room-bar'
import { useGameRoom } from '@/hooks/use-game-room'
import type { UseGameRoomReturn } from '@/hooks/use-game-room'
import { useLocalGameState } from '@/hooks/use-local-game-state'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Question {
  id: string
  text: string
  options: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
}

type Mode = 'home' | 'create' | 'play'
type GameMode = 'local' | 'host' | 'player'
type HostPhase = 'lobby' | 'answering' | 'reveal' | 'leaderboard'

interface LocalState {
  mode: Mode
  quizQuestions: Question[]
  playSession: number
  current: number
  selected: number | null
  revealed: boolean
  score: number
  finished: boolean
}

const INITIAL_LOCAL_STATE: LocalState = {
  mode: 'home',
  quizQuestions: [],
  playSession: 0,
  current: 0,
  selected: null,
  revealed: false,
  score: 0,
  finished: false,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function emptyQuestion(): Question {
  return { id: uid(), text: '', options: ['', '', '', ''], correct: 0 }
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

const OPTION_COLORS = {
  idle: [
    'bg-blue-500 hover:bg-blue-600 text-white',
    'bg-emerald-500 hover:bg-emerald-600 text-white',
    'bg-orange-500 hover:bg-orange-600 text-white',
    'bg-pink-500 hover:bg-pink-600 text-white',
  ],
  selected: [
    'bg-blue-600 text-white ring-4 ring-blue-300',
    'bg-emerald-600 text-white ring-4 ring-emerald-300',
    'bg-orange-600 text-white ring-4 ring-orange-300',
    'bg-pink-600 text-white ring-4 ring-pink-300',
  ],
  correct: 'bg-emerald-500 text-white ring-4 ring-emerald-300',
  wrong: 'bg-red-500 text-white ring-4 ring-red-300',
}

const HOST_OPTION_COLORS = [
  { bg: 'bg-blue-500', ring: 'ring-blue-300', label: 'A' },
  { bg: 'bg-emerald-500', ring: 'ring-emerald-300', label: 'B' },
  { bg: 'bg-orange-500', ring: 'ring-orange-300', label: 'C' },
  { bg: 'bg-pink-500', ring: 'ring-pink-300', label: 'D' },
]

const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 's1',
    text: 'What year was the first iPhone released?',
    options: ['2005', '2006', '2007', '2008'],
    correct: 2,
  },
  {
    id: 's2',
    text: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correct: 1,
  },
  {
    id: 's3',
    text: 'How many bones are in the adult human body?',
    options: ['186', '196', '206', '216'],
    correct: 2,
  },
  {
    id: 's4',
    text: "What is the world's most popular programming language?",
    options: ['Python', 'JavaScript', 'Java', 'C++'],
    correct: 1,
  },
  {
    id: 's5',
    text: 'In which country did the Olympic Games originate?',
    options: ['Italy', 'Egypt', 'Greece', 'China'],
    correct: 2,
  },
  {
    id: 's6',
    text: 'What does "HTTP" stand for?',
    options: [
      'HyperText Transfer Protocol',
      'High Tech Transfer Process',
      'Hyper Transfer Text Protocol',
      'High Text Transfer Protocol',
    ],
    correct: 0,
  },
  {
    id: 's7',
    text: 'How many minutes are in a full week?',
    options: ['1,440', '7,200', '10,080', '14,400'],
    correct: 2,
  },
  {
    id: 's8',
    text: 'What animal can sleep for 3 years?',
    options: ['Bear', 'Sloth', 'Snail', 'Koala'],
    correct: 2,
  },
  {
    id: 's9',
    text: 'Which company created the first computer mouse?',
    options: ['Apple', 'Microsoft', 'IBM', 'Xerox'],
    correct: 3,
  },
  {
    id: 's10',
    text: 'What is the smallest country in the world?',
    options: ['Monaco', 'Vatican City', 'San Marino', 'Liechtenstein'],
    correct: 1,
  },
]

function encodeQuiz(questions: Question[]): string {
  try {
    const minimal = questions.map((q) => ({
      t: q.text,
      o: q.options,
      c: q.correct,
    }))
    return btoa(encodeURIComponent(JSON.stringify(minimal)))
  } catch {
    return ''
  }
}

function decodeQuiz(hash: string): Question[] | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(hash)))
    if (!Array.isArray(parsed)) return null
    return parsed.map(
      (item: {
        t: string
        o: [string, string, string, string]
        c: 0 | 1 | 2 | 3
      }) => ({
        id: uid(),
        text: item.t,
        options: item.o,
        correct: item.c,
      })
    )
  } catch {
    return null
  }
}

function getScoreMessage(percent: number): { text: string; emoji: string } {
  if (percent <= 30) return { text: 'Room for improvement!', emoji: '' }
  if (percent <= 60) return { text: 'Not bad! You know some things.', emoji: '' }
  if (percent <= 80) return { text: 'Impressive! You really pay attention.', emoji: '' }
  return { text: 'Team trivia champion!', emoji: '' }
}

// ---------------------------------------------------------------------------
// Create Mode
// ---------------------------------------------------------------------------

function CreateMode({
  onStart,
  onBack,
  initialQuestions,
}: {
  onStart: (questions: Question[]) => void
  onBack: () => void
  initialQuestions?: Question[]
}) {
  const [questions, setQuestions] = useState<Question[]>(
    initialQuestions && initialQuestions.length > 0
      ? initialQuestions
      : [emptyQuestion()]
  )
  const [copied, setCopied] = useState(false)

  function updateQuestion(
    id: string,
    field: keyof Question,
    value: string | number | [string, string, string, string]
  ) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    )
  }

  function updateOption(id: string, optIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q
        const opts = [...q.options] as [string, string, string, string]
        opts[optIndex] = value
        return { ...q, options: opts }
      })
    )
  }

  function addQuestion() {
    if (questions.length >= 20) return
    setQuestions((prev) => [...prev, emptyQuestion()])
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const validQuestions = questions.filter(
    (q) => q.text.trim() && q.options.every((o) => o.trim())
  )

  const canStart = validQuestions.length >= 3

  function handleShare() {
    if (!canStart) return
    const hash = encodeQuiz(validQuestions)
    const url = `${window.location.origin}${window.location.pathname}#${hash}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onBack}
          className="text-[13px] text-amber-700 hover:text-amber-900 font-medium transition-colors"
        >
          &larr; Back
        </button>
        <span className="text-[13px] text-gray-500">
          {validQuestions.length} valid / {questions.length} total (min 3)
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {questions.map((q, qi) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <GlassCard className="p-5 md:p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="text-[13px] font-bold text-amber-700">
                  Question {qi + 1}
                </span>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Type your question..."
                value={q.text}
                onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/80 text-[14px] focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 mb-4 placeholder:text-gray-400"
              />

              <div className="grid sm:grid-cols-2 gap-3">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestion(q.id, 'correct', oi)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0 transition-all ${
                        q.correct === oi
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title={
                        q.correct === oi ? 'Correct answer' : 'Mark as correct'
                      }
                    >
                      {q.correct === oi ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        OPTION_LABELS[oi]
                      )}
                    </button>
                    <input
                      type="text"
                      placeholder={`Option ${OPTION_LABELS[oi]}`}
                      value={opt}
                      onChange={(e) => updateOption(q.id, oi, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white/80 text-[13px] focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 placeholder:text-gray-400"
                    />
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </AnimatePresence>

      {questions.length < 20 && (
        <button
          onClick={addQuestion}
          className="w-full py-3 rounded-xl border-2 border-dashed border-amber-300 text-amber-700 text-[14px] font-medium flex items-center justify-center gap-2 hover:border-amber-400 hover:bg-amber-50/50 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={() => canStart && onStart(validQuestions)}
          disabled={!canStart}
          className={`flex-1 py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
            canStart
              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
          }`}
        >
          <Play className="w-4 h-4" /> Start Quiz
        </button>
        <button
          onClick={handleShare}
          disabled={!canStart}
          className={`py-3 px-5 rounded-xl text-[14px] font-medium flex items-center justify-center gap-2 transition-all ${
            canStart
              ? 'bg-white/70 border border-amber-300 text-amber-700 hover:bg-amber-50'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" /> Link copied!
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" /> Share Quiz Link
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Play Mode (local)
// ---------------------------------------------------------------------------

function PlayMode({
  questions,
  onBack,
  onPlayAgain,
  localState,
  setLocalState,
}: {
  questions: Question[]
  onBack: () => void
  onPlayAgain: () => void
  localState: LocalState
  setLocalState: (s: LocalState | ((prev: LocalState) => LocalState)) => void
}) {
  const { current, selected, revealed, score, finished } = localState

  const q = questions[current]
  const progress = ((current + (revealed ? 1 : 0)) / questions.length) * 100
  const percent = Math.round((score / questions.length) * 100)
  const scoreMsg = getScoreMessage(percent)

  function handleSelect(idx: number) {
    if (revealed) return
    const isCorrect = idx === q.correct
    setLocalState((prev) => ({
      ...prev,
      selected: idx,
      revealed: true,
      score: isCorrect ? prev.score + 1 : prev.score,
    }))
  }

  function handleNext() {
    if (current + 1 >= questions.length) {
      setLocalState((prev) => ({ ...prev, finished: true }))
    } else {
      setLocalState((prev) => ({
        ...prev,
        current: prev.current + 1,
        selected: null,
        revealed: false,
      }))
    }
  }

  if (finished) {
    return (
      <div className="max-w-lg mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <GlassCard className="p-8 md:p-10">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <Trophy className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-[24px] md:text-[28px] font-bold text-[#1a1a2e] mb-2">
              Quiz Complete!
            </h2>
            <div className="text-[48px] font-bold text-amber-600 mb-1">
              {score}/{questions.length}
            </div>
            <div className="text-[15px] text-gray-500 mb-2">
              {percent}% correct
            </div>
            <p className="text-[17px] font-semibold text-[#1a1a2e] mb-6">
              {scoreMsg.text}
            </p>

            {/* Score bar */}
            <div className="w-full bg-gray-100 rounded-full h-3 mb-8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={onPlayAgain}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-500/25"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-xl bg-white/70 border border-amber-300 text-amber-700 font-medium text-[14px] flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors"
              >
                <Pencil className="w-4 h-4" /> Create New Quiz
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium text-gray-500">
            Question {current + 1} of {questions.length}
          </span>
          <span className="text-[13px] font-bold text-amber-700">
            {score}/{current + (revealed ? 1 : 0)} correct
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
        >
          <GlassCard className="p-6 md:p-8 mb-5">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <HelpCircle className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-[18px] md:text-[22px] font-bold text-[#1a1a2e] leading-snug">
                {q.text}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {q.options.map((opt, oi) => {
                let btnClass = OPTION_COLORS.idle[oi]

                if (revealed) {
                  if (oi === q.correct) {
                    btnClass = OPTION_COLORS.correct
                  } else if (oi === selected && oi !== q.correct) {
                    btnClass = OPTION_COLORS.wrong
                  } else {
                    btnClass = 'bg-gray-200 text-gray-500'
                  }
                }

                return (
                  <motion.button
                    key={oi}
                    onClick={() => handleSelect(oi)}
                    disabled={revealed}
                    whileHover={!revealed ? { scale: 1.02 } : {}}
                    whileTap={!revealed ? { scale: 0.98 } : {}}
                    className={`relative w-full py-4 px-5 rounded-xl text-left font-semibold text-[14px] md:text-[15px] transition-all ${btnClass} ${
                      revealed ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-[12px] font-bold shrink-0">
                        {OPTION_LABELS[oi]}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {revealed && oi === q.correct && (
                        <Check className="w-5 h-5 shrink-0" />
                      )}
                      {revealed && oi === selected && oi !== q.correct && (
                        <X className="w-5 h-5 shrink-0" />
                      )}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </GlassCard>

          {/* Feedback + Next */}
          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between"
              >
                <span
                  className={`text-[15px] font-bold ${
                    selected === q.correct ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {selected === q.correct
                    ? 'Correct!'
                    : `Wrong - answer was ${OPTION_LABELS[q.correct]}`}
                </span>
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[14px] flex items-center gap-2 transition-colors shadow-md shadow-amber-500/25"
                >
                  {current + 1 >= questions.length ? 'See Results' : 'Next'}{' '}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Host View
// ---------------------------------------------------------------------------

function HostView({
  questions,
  gameRoom,
}: {
  questions: Question[]
  gameRoom: UseGameRoomReturn
}) {
  const roomState = gameRoom.room?.state || {}
  const phase = (gameRoom.room?.phase || 'answering') as HostPhase
  const currentIndex: number = roomState.currentIndex ?? 0
  const scores: Record<string, number> = roomState.scores ?? {}

  const q = questions[currentIndex]
  const answerActions = gameRoom.getActionsOfType('answer')

  // Answers for current question
  const currentAnswers = useMemo(() => {
    return answerActions.filter(
      (a) => a.payload?.questionIndex === currentIndex
    )
  }, [answerActions, currentIndex])

  const answerCount = currentAnswers.length
  const playerCount = gameRoom.players.filter((p) => !p.isHost).length

  // Calculate who got it right on reveal
  const correctPlayers = useMemo(() => {
    if (phase !== 'reveal' && phase !== 'leaderboard') return []
    return currentAnswers
      .filter((a) => a.payload?.optionIndex === q?.correct)
      .map((a) => {
        const player = gameRoom.players.find(
          (p) => p.playerId === a.playerId
        )
        return player?.name || 'Unknown'
      })
  }, [phase, currentAnswers, q, gameRoom.players])

  // Compute leaderboard from all answers
  const leaderboard = useMemo(() => {
    const allScores: Record<string, number> = { ...scores }

    // If we're on reveal, also count current round
    if (phase === 'reveal' || phase === 'leaderboard') {
      currentAnswers.forEach((a) => {
        if (a.payload?.optionIndex === q?.correct) {
          allScores[a.playerId] = (allScores[a.playerId] || 0)
        }
      })
    }

    return gameRoom.players
      .filter((p) => !p.isHost)
      .map((p) => ({
        playerId: p.playerId,
        name: p.name,
        score: allScores[p.playerId] || 0,
      }))
      .sort((a, b) => b.score - a.score)
  }, [scores, gameRoom.players, phase, currentAnswers, q])

  // Start the game (called from lobby, transitions to first question)
  const startGame = useCallback(async () => {
    await gameRoom.updateRoom({
      status: 'playing',
      phase: 'answering',
      state: {
        currentIndex: 0,
        scores: {},
        questions: questions.map((qq) => ({
          text: qq.text,
          options: qq.options,
          correct: qq.correct,
        })),
        totalQuestions: questions.length,
      },
    })
  }, [gameRoom, questions])

  const revealAnswer = useCallback(async () => {
    // Compute new scores
    const newScores = { ...scores }
    currentAnswers.forEach((a) => {
      if (a.payload?.optionIndex === q?.correct) {
        newScores[a.playerId] = (newScores[a.playerId] || 0) + 1
      }
    })

    await gameRoom.updateRoom({
      phase: 'reveal',
      state: {
        ...roomState,
        scores: newScores,
      },
    })
  }, [gameRoom, roomState, scores, currentAnswers, q])

  const nextQuestion = useCallback(async () => {
    if (currentIndex + 1 >= questions.length) {
      await gameRoom.updateRoom({
        phase: 'leaderboard',
        state: { ...roomState, currentIndex: currentIndex },
      })
    } else {
      await gameRoom.updateRoom({
        phase: 'answering',
        state: { ...roomState, currentIndex: currentIndex + 1 },
      })
    }
  }, [gameRoom, roomState, currentIndex, questions.length])

  const showLeaderboard = useCallback(async () => {
    await gameRoom.updateRoom({
      phase: 'leaderboard',
      state: roomState,
    })
  }, [gameRoom, roomState])

  if (!q) return null

  // Leaderboard screen
  if (phase === 'leaderboard') {
    return (
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <GlassCard className="p-8 md:p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <Trophy className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-[28px] md:text-[36px] font-bold text-[#1a1a2e] mb-6">
              Leaderboard
            </h2>

            <div className="space-y-3 mb-8">
              {leaderboard.map((entry, i) => (
                <motion.div
                  key={entry.playerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-4 px-5 py-4 rounded-xl ${
                    i === 0
                      ? 'bg-amber-50 border-2 border-amber-300'
                      : i === 1
                      ? 'bg-gray-50 border-2 border-gray-300'
                      : i === 2
                      ? 'bg-orange-50 border-2 border-orange-300'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-[18px] shrink-0 ${
                      i === 0
                        ? 'bg-amber-500 text-white'
                        : i === 1
                        ? 'bg-gray-400 text-white'
                        : i === 2
                        ? 'bg-orange-400 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-left text-[17px] font-bold text-[#1a1a2e]">
                    {entry.name}
                  </span>
                  <span className="text-[20px] font-black text-amber-600">
                    {entry.score}
                    <span className="text-[14px] text-gray-400 font-medium">
                      /{questions.length}
                    </span>
                  </span>
                </motion.div>
              ))}

              {leaderboard.length === 0 && (
                <p className="text-gray-400 text-[15px] py-4">
                  No players have scored yet.
                </p>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    )
  }

  // Question view (answering / reveal)
  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium text-gray-500">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-[13px] font-bold text-amber-700">
            <Users className="w-3.5 h-3.5 inline mr-1" />
            {answerCount}/{playerCount} answered
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
            animate={{
              width: `${((currentIndex + (phase === 'reveal' ? 1 : 0)) / questions.length) * 100}%`,
            }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`host-q-${currentIndex}-${phase}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <GlassCard className="p-6 md:p-8 mb-5">
            <div className="flex items-start gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <HelpCircle className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-[20px] md:text-[26px] font-bold text-[#1a1a2e] leading-snug">
                {q.text}
              </h2>
            </div>

            {/* 4 colored option cards */}
            <div className="grid sm:grid-cols-2 gap-3">
              {q.options.map((opt, oi) => {
                const color = HOST_OPTION_COLORS[oi]
                let extraClass = ''

                if (phase === 'reveal') {
                  if (oi === q.correct) {
                    extraClass = 'ring-4 ring-emerald-400 scale-105'
                  } else {
                    extraClass = 'opacity-50'
                  }
                }

                return (
                  <motion.div
                    key={oi}
                    className={`${color.bg} text-white rounded-xl py-5 px-5 font-semibold text-[15px] md:text-[17px] transition-all ${extraClass}`}
                    layout
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-[13px] font-bold shrink-0">
                        {color.label}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {phase === 'reveal' && oi === q.correct && (
                        <Check className="w-6 h-6 shrink-0" />
                      )}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            {/* Reveal info */}
            <AnimatePresence>
              {phase === 'reveal' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200"
                >
                  <p className="text-emerald-700 font-bold text-[15px] mb-1">
                    Correct: {OPTION_LABELS[q.correct]} - {q.options[q.correct]}
                  </p>
                  {correctPlayers.length > 0 ? (
                    <p className="text-emerald-600 text-[13px]">
                      Got it right: {correctPlayers.join(', ')}
                    </p>
                  ) : (
                    <p className="text-emerald-600 text-[13px]">
                      Nobody got it right this round!
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>

          {/* Host controls */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {phase === 'answering' && (
              <button
                onClick={revealAnswer}
                className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[14px] flex items-center gap-2 transition-colors shadow-md shadow-amber-500/25"
              >
                <Eye className="w-4 h-4" /> Reveal Answer
              </button>
            )}

            {phase === 'reveal' && (
              <>
                <button
                  onClick={nextQuestion}
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[14px] flex items-center gap-2 transition-colors shadow-md shadow-amber-500/25"
                >
                  {currentIndex + 1 >= questions.length
                    ? 'Show Leaderboard'
                    : 'Next Question'}{' '}
                  <ArrowRight className="w-4 h-4" />
                </button>
                {currentIndex + 1 < questions.length && (
                  <button
                    onClick={showLeaderboard}
                    className="px-5 py-3 rounded-xl bg-white/70 border border-amber-300 text-amber-700 font-medium text-[14px] flex items-center gap-2 hover:bg-amber-50 transition-colors"
                  >
                    <Trophy className="w-4 h-4" /> Leaderboard
                  </button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Player View
// ---------------------------------------------------------------------------

function PlayerView({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const roomState = gameRoom.room?.state || {}
  const phase = (gameRoom.room?.phase || 'lobby') as string
  const currentIndex: number = roomState.currentIndex ?? 0
  const totalQuestions: number = roomState.totalQuestions ?? 0
  const questions: Array<{
    text: string
    options: [string, string, string, string]
    correct: 0 | 1 | 2 | 3
  }> = roomState.questions ?? []
  const scores: Record<string, number> = roomState.scores ?? {}

  const q = questions[currentIndex]
  const answerActions = gameRoom.getActionsOfType('answer')

  // Check if player already answered this question
  const myAnswer = useMemo(() => {
    return answerActions.find(
      (a) =>
        a.playerId === gameRoom.playerId &&
        a.payload?.questionIndex === currentIndex
    )
  }, [answerActions, gameRoom.playerId, currentIndex])

  const hasSubmitted = !!myAnswer

  // On reveal, check if player was correct
  const wasCorrect = useMemo(() => {
    if (!myAnswer || !q) return false
    return myAnswer.payload?.optionIndex === q.correct
  }, [myAnswer, q])

  const handleAnswer = useCallback(
    async (optionIndex: number) => {
      if (hasSubmitted) return
      await gameRoom.submitAction('answer', {
        questionIndex: currentIndex,
        optionIndex,
      })
    },
    [gameRoom, currentIndex, hasSubmitted]
  )

  // Leaderboard view for player
  if (phase === 'leaderboard') {
    const myScore = scores[gameRoom.playerId] || 0
    const allPlayers = gameRoom.players
      .filter((p) => !p.isHost)
      .map((p) => ({
        playerId: p.playerId,
        name: p.name,
        score: scores[p.playerId] || 0,
      }))
      .sort((a, b) => b.score - a.score)

    const myRank = allPlayers.findIndex(
      (p) => p.playerId === gameRoom.playerId
    )

    return (
      <div className="max-w-md mx-auto">
        <GlassCard className="p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-7 h-7 text-amber-600" />
          </div>
          <h2 className="text-[22px] font-bold mb-1">Final Results</h2>
          <div className="text-[48px] font-black text-amber-600 leading-none mb-1">
            #{myRank + 1}
          </div>
          <p className="text-gray-500 text-[15px] mb-2">
            {myScore}/{totalQuestions} correct
          </p>
          <p className="text-[16px] font-semibold text-[#1a1a2e] mb-6">
            {getScoreMessage(
              totalQuestions > 0
                ? Math.round((myScore / totalQuestions) * 100)
                : 0
            ).text}
          </p>

          <div className="space-y-2">
            {allPlayers.map((p, i) => (
              <div
                key={p.playerId}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] ${
                  p.playerId === gameRoom.playerId
                    ? 'bg-amber-50 border-2 border-amber-300 font-bold'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-800 text-[12px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-left">{p.name}</span>
                <span className="font-bold text-amber-600">
                  {p.score}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    )
  }

  if (!q) {
    return (
      <PlayerWaiting
        message="Waiting for the host to start..."
        accentColor="#D97706"
        roomCode={gameRoom.roomCode || undefined}
      />
    )
  }

  // If answered and waiting
  if (hasSubmitted && phase === 'answering') {
    return (
      <PlayerWaiting
        hasSubmitted
        submittedMessage="Answer locked in!"
        message="Waiting for the host to reveal..."
        accentColor="#D97706"
        roomCode={gameRoom.roomCode || undefined}
      />
    )
  }

  // Reveal phase - show result
  if (phase === 'reveal' && hasSubmitted) {
    return (
      <div className="max-w-md mx-auto">
        <GlassCard className="p-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                wasCorrect ? 'bg-emerald-100' : 'bg-red-100'
              }`}
            >
              {wasCorrect ? (
                <Check className="w-8 h-8 text-emerald-600" />
              ) : (
                <X className="w-8 h-8 text-red-500" />
              )}
            </div>
            <h3
              className={`text-[22px] font-bold mb-2 ${
                wasCorrect ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {wasCorrect ? 'Correct!' : 'Wrong!'}
            </h3>
            <p className="text-gray-500 text-[14px] mb-1">
              The answer was{' '}
              <span className="font-bold text-[#1a1a2e]">
                {OPTION_LABELS[q.correct]}: {q.options[q.correct]}
              </span>
            </p>
            <p className="text-gray-400 text-[13px] mt-4">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
          </motion.div>
        </GlassCard>
      </div>
    )
  }

  // Answer selection view
  return (
    <div className="max-w-md mx-auto">
      <GlassCard className="p-6">
        <div className="text-center mb-5">
          <span className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <h2 className="text-[17px] md:text-[20px] font-bold text-[#1a1a2e] mt-2 leading-snug">
            {q.text}
          </h2>
        </div>

        <div className="space-y-3">
          {q.options.map((opt, oi) => {
            const color = HOST_OPTION_COLORS[oi]
            return (
              <motion.button
                key={oi}
                onClick={() => handleAnswer(oi)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className={`${color.bg} w-full py-4 px-5 rounded-xl text-white font-semibold text-[15px] text-left transition-all active:scale-95`}
              >
                <span className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-[13px] font-bold shrink-0">
                    {color.label}
                  </span>
                  <span className="flex-1">{opt}</span>
                </span>
              </motion.button>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Background Blobs
// ---------------------------------------------------------------------------

function AmberBlobs() {
  return (
    <>
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-400/8 via-yellow-300/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-orange-400/6 via-amber-300/4 to-transparent blur-3xl pointer-events-none" />
    </>
  )
}

// ---------------------------------------------------------------------------
// Hero Content
// ---------------------------------------------------------------------------

function HeroContent() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/30 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-amber-700 mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        Free team game
      </span>
      <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.1]">
        Team Trivia <span className="text-amber-600">Maker</span>
      </h1>
      <p className="text-gray-500 mt-4 text-[15px] max-w-xl mx-auto">
        Create custom trivia quizzes about your team or company. Share a link
        and play together. Perfect for TGIF and team bonding.
      </p>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// CTA Section
// ---------------------------------------------------------------------------

function CTASection() {
  return (
    <section className="relative z-10 px-5 pb-20">
      <div className="max-w-2xl mx-auto">
        <GlassCard className="p-6 md:p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-6 h-6 text-amber-600" />
          </div>
          <h2 className="text-[17px] font-bold text-[#1a1a2e] mb-2">
            Built by Reattend
          </h2>
          <p className="text-[14px] text-gray-500 mb-5 max-w-md mx-auto">
            Reattend captures every team decision and makes your knowledge
            searchable forever.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(180,140,20,0.3)]"
          >
            Try Reattend free <ArrowRight className="w-4 h-4" />
          </Link>
        </GlassCard>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TeamTrivia() {
  const searchParams = useSearchParams()
  const roomCode = searchParams.get('room')

  const gameRoom = useGameRoom({ gameType: 'team-trivia' })

  // Determine game mode
  const gameMode: GameMode = useMemo(() => {
    if (!roomCode && !gameRoom.roomCode) return 'local'
    if (gameRoom.isHost) return 'host'
    return 'player'
  }, [roomCode, gameRoom.roomCode, gameRoom.isHost])

  // ---------- Local mode state with persistence ----------

  const [localState, setLocalState, clearLocalState] =
    useLocalGameState<LocalState>('reattend-trivia-local', INITIAL_LOCAL_STATE)

  const [hashQuestions, setHashQuestions] = useState<Question[] | null>(null)
  const [needsName, setNeedsName] = useState(false)
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  // Check URL hash for shared quiz on mount (local mode only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (roomCode) return // Don't process hash in room mode
    const hash = window.location.hash.slice(1)
    if (hash) {
      const decoded = decodeQuiz(hash)
      if (decoded && decoded.length >= 1) {
        setHashQuestions(decoded)
        setLocalState((prev) => ({
          ...prev,
          mode: 'play',
          quizQuestions: decoded,
          current: 0,
          selected: null,
          revealed: false,
          score: 0,
          finished: false,
        }))
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Local mode callbacks ----------

  const handleStartFromCreate = useCallback(
    (questions: Question[]) => {
      setLocalState((prev) => ({
        ...prev,
        mode: 'play',
        quizQuestions: questions,
        current: 0,
        selected: null,
        revealed: false,
        score: 0,
        finished: false,
        playSession: prev.playSession + 1,
      }))
    },
    [setLocalState]
  )

  const handlePlaySample = useCallback(() => {
    setLocalState((prev) => ({
      ...prev,
      mode: 'play',
      quizQuestions: SAMPLE_QUESTIONS,
      current: 0,
      selected: null,
      revealed: false,
      score: 0,
      finished: false,
      playSession: prev.playSession + 1,
    }))
  }, [setLocalState])

  const handlePlayAgain = useCallback(() => {
    setLocalState((prev) => ({
      ...prev,
      current: 0,
      selected: null,
      revealed: false,
      score: 0,
      finished: false,
      playSession: prev.playSession + 1,
    }))
  }, [setLocalState])

  const handleGoHome = useCallback(() => {
    setLocalState((prev) => ({
      ...prev,
      mode: 'home',
      current: 0,
      selected: null,
      revealed: false,
      score: 0,
      finished: false,
    }))
    setHashQuestions(null)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [setLocalState])

  // ---------- Multiplayer name flow ----------

  const handleNameContinue = useCallback(
    (name: string) => {
      gameRoom.setPlayerName(name)
      setNeedsName(false)
    },
    [gameRoom]
  )

  const handleCreateRoom = useCallback(() => {
    setNeedsName(false)
    // Go to create mode, then host will start room after creating quiz
    setLocalState((prev) => ({ ...prev, mode: 'create' }))
  }, [setLocalState])

  const handleJoinRoom = useCallback(() => {
    setNeedsName(false)
    setShowJoinInput(true)
  }, [])

  const handleJoinSubmit = useCallback(async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    try {
      await gameRoom.joinRoom(code)
      setShowJoinInput(false)
      setJoinCode('')
    } catch {
      // Error handled by gameRoom hook
    }
  }, [joinCode, gameRoom])

  // Host starts a room after creating quiz
  const handleHostStartRoom = useCallback(
    async (questions: Question[]) => {
      try {
        await gameRoom.createRoom({
          questions: questions.map((q) => ({
            text: q.text,
            options: q.options,
            correct: q.correct,
          })),
        })
        // Store questions for host view
        setLocalState((prev) => ({ ...prev, quizQuestions: questions }))
      } catch {
        // Error handled by gameRoom hook
      }
    },
    [gameRoom, setLocalState]
  )

  // Determine if we need name input for multiplayer
  const needsNameInput =
    gameMode !== 'local' && !gameRoom.playerName && !needsName

  // Player mode with room code but no name yet
  useEffect(() => {
    if (roomCode && !gameRoom.playerName) {
      setNeedsName(true)
    }
  }, [roomCode, gameRoom.playerName])

  // ---------- Determine if room is in lobby ----------
  const isInLobby =
    gameRoom.room?.status === 'lobby' || gameRoom.room?.phase === 'lobby'

  // Build the room bar if in a room
  const roomBar =
    gameRoom.roomCode && gameRoom.room ? (
      <RoomBar
        roomCode={gameRoom.roomCode}
        playerCount={gameRoom.players.length}
        isHost={gameRoom.isHost}
        isConnected={gameRoom.isConnected}
        accentColor="#D97706"
      />
    ) : undefined

  // ---------- Render: Name input for multiplayer ----------

  if (needsName || needsNameInput) {
    return (
      <GameLayout
        heroContent={<HeroContent />}
        showResults={false}
        bgBlobs={<AmberBlobs />}
        ctaSection={<CTASection />}
      >
        <TeamNameInput
          onContinue={handleNameContinue}
          showRoomOptions={!roomCode}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          accentFrom="#D97706"
          accentTo="#F59E0B"
        />
      </GameLayout>
    )
  }

  // ---------- Render: Join room input ----------

  if (showJoinInput) {
    return (
      <GameLayout
        heroContent={<HeroContent />}
        showResults={false}
        bgBlobs={<AmberBlobs />}
        ctaSection={<CTASection />}
      >
        <div className="max-w-md mx-auto">
          <GlassCard className="p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 mx-auto mb-5 flex items-center justify-center">
              <Users className="w-7 h-7 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Join a Room</h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter the room code shared by your host.
            </p>

            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinSubmit()}
              placeholder="ABCD12"
              maxLength={8}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-center text-2xl font-mono font-bold tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent mb-4 uppercase"
            />

            {gameRoom.error && (
              <p className="text-red-500 text-[13px] mb-3">{gameRoom.error}</p>
            )}

            <button
              onClick={handleJoinSubmit}
              disabled={!joinCode.trim() || gameRoom.isLoading}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[15px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-500/25"
            >
              {gameRoom.isLoading ? 'Joining...' : 'Join Room'}
            </button>

            <button
              onClick={() => {
                setShowJoinInput(false)
                setJoinCode('')
              }}
              className="mt-3 text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
            >
              &larr; Back
            </button>
          </GlassCard>
        </div>
      </GameLayout>
    )
  }

  // ---------- Render: HOST mode ----------

  if (gameMode === 'host') {
    // If lobby, show lobby + quiz creation
    if (isInLobby || !gameRoom.room) {
      // If room exists, show lobby waiting screen
      if (gameRoom.roomCode && gameRoom.room) {
        const hostQuestions = localState.quizQuestions.length > 0
          ? localState.quizQuestions
          : (gameRoom.room?.config?.questions || []).map(
              (q: { text: string; options: [string, string, string, string]; correct: 0 | 1 | 2 | 3 }) => ({
                id: uid(),
                text: q.text,
                options: q.options,
                correct: q.correct,
              })
            )

        return (
          <GameLayout
            heroContent={<HeroContent />}
            showResults={false}
            bgBlobs={<AmberBlobs />}
            roomBar={roomBar}
            ctaSection={<CTASection />}
          >
            <div className="max-w-md mx-auto">
              <RoomLobby
                roomCode={gameRoom.roomCode}
                players={gameRoom.players}
                isHost
                onStart={() => {
                  // Use the questions from config or local state
                  const qs = hostQuestions
                  if (qs.length > 0) {
                    gameRoom.updateRoom({
                      status: 'playing',
                      phase: 'answering',
                      state: {
                        currentIndex: 0,
                        scores: {},
                        questions: qs.map(
                          (qq: Question) => ({
                            text: qq.text,
                            options: qq.options,
                            correct: qq.correct,
                          })
                        ),
                        totalQuestions: qs.length,
                      },
                    })
                  }
                }}
                minPlayers={1}
                accentColor="#D97706"
                gameTitle="Team Trivia"
              />
            </div>
          </GameLayout>
        )
      }

      // No room yet - show create mode to build quiz first
      return (
        <GameLayout
          heroContent={<HeroContent />}
          showResults={false}
          bgBlobs={<AmberBlobs />}
          ctaSection={<CTASection />}
        >
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-600" />
              <span className="text-[13px] font-medium text-amber-700">
                Host mode - Create your quiz, then start a room
              </span>
            </div>
            <CreateMode
              onStart={(questions) => handleHostStartRoom(questions)}
              onBack={() => {
                // Go back to local mode
                setLocalState((prev) => ({ ...prev, mode: 'home' }))
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href)
                  url.searchParams.delete('room')
                  window.history.replaceState({}, '', url.toString())
                }
              }}
              initialQuestions={hashQuestions || undefined}
            />
          </div>
        </GameLayout>
      )
    }

    // Game is in progress (host view)
    const hostQuestions: Question[] = (
      gameRoom.room?.state?.questions || []
    ).map(
      (q: {
        text: string
        options: [string, string, string, string]
        correct: 0 | 1 | 2 | 3
      }) => ({
        id: uid(),
        text: q.text,
        options: q.options,
        correct: q.correct,
      })
    )

    return (
      <GameLayout
        heroContent={<HeroContent />}
        showResults={false}
        bgBlobs={<AmberBlobs />}
        roomBar={roomBar}
        ctaSection={<CTASection />}
      >
        <HostView questions={hostQuestions} gameRoom={gameRoom} />
      </GameLayout>
    )
  }

  // ---------- Render: PLAYER mode ----------

  if (gameMode === 'player') {
    // If room is in lobby
    if (isInLobby && gameRoom.room) {
      return (
        <GameLayout
          heroContent={<HeroContent />}
          showResults={false}
          bgBlobs={<AmberBlobs />}
          roomBar={roomBar}
          ctaSection={<CTASection />}
        >
          <div className="max-w-md mx-auto">
            <RoomLobby
              roomCode={gameRoom.roomCode!}
              players={gameRoom.players}
              isHost={false}
              onStart={() => {}}
              accentColor="#D97706"
              gameTitle="Team Trivia"
            />
          </div>
        </GameLayout>
      )
    }

    // Waiting to connect
    if (!gameRoom.room) {
      return (
        <GameLayout
          heroContent={<HeroContent />}
          showResults={false}
          bgBlobs={<AmberBlobs />}
          ctaSection={<CTASection />}
        >
          <div className="max-w-md mx-auto">
            {gameRoom.error ? (
              <GlassCard className="p-8 text-center">
                <p className="text-red-500 font-bold mb-4">{gameRoom.error}</p>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const url = new URL(window.location.href)
                      url.searchParams.delete('room')
                      window.history.replaceState({}, '', url.toString())
                      window.location.reload()
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[14px] transition-colors"
                >
                  Go Home
                </button>
              </GlassCard>
            ) : (
              <PlayerWaiting
                message="Connecting to room..."
                accentColor="#D97706"
                roomCode={roomCode || undefined}
              />
            )}
          </div>
        </GameLayout>
      )
    }

    // Game in progress (player view)
    return (
      <GameLayout
        heroContent={<HeroContent />}
        showResults={false}
        bgBlobs={<AmberBlobs />}
        roomBar={roomBar}
        ctaSection={<CTASection />}
      >
        <PlayerView gameRoom={gameRoom} />
      </GameLayout>
    )
  }

  // ---------- Render: LOCAL mode ----------

  const { mode } = localState

  return (
    <GameLayout
      heroContent={<HeroContent />}
      showResults={localState.finished}
      results={
        localState.finished && localState.quizQuestions.length > 0 ? (
          <div className="text-center">
            <GlassCard className="p-6 md:p-8">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-[22px] font-bold text-[#1a1a2e] mb-1">
                Quiz Complete!
              </h3>
              <div className="text-[40px] font-bold text-amber-600 mb-1">
                {localState.score}/{localState.quizQuestions.length}
              </div>
              <div className="text-[14px] text-gray-500 mb-4">
                {Math.round(
                  (localState.score / localState.quizQuestions.length) * 100
                )}
                % correct
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-6 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.round(
                      (localState.score / localState.quizQuestions.length) * 100
                    )}%`,
                  }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handlePlayAgain}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-500/25"
                >
                  <RotateCcw className="w-4 h-4" /> Play Again
                </button>
                <button
                  onClick={handleGoHome}
                  className="px-5 py-2.5 rounded-xl bg-white/70 border border-amber-300 text-amber-700 font-medium text-[14px] flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> New Quiz
                </button>
              </div>
            </GlassCard>
          </div>
        ) : undefined
      }
      bgBlobs={<AmberBlobs />}
      ctaSection={<CTASection />}
    >
      {/* Home mode */}
      {mode === 'home' && (
        <div className="max-w-lg mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#1a1a2e]">
                    Create Your Own Quiz
                  </h2>
                  <p className="text-[13px] text-gray-500">
                    Add custom questions about your team
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setLocalState((prev) => ({ ...prev, mode: 'create' }))
                }
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-500/25"
              >
                <Plus className="w-4 h-4" /> Create Quiz
              </button>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Play className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#1a1a2e]">
                    Try Sample Quiz
                  </h2>
                  <p className="text-[13px] text-gray-500">
                    10 fun general knowledge questions
                  </p>
                </div>
              </div>
              <button
                onClick={handlePlaySample}
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-colors shadow-md shadow-blue-500/25"
              >
                <Play className="w-4 h-4" /> Play Now
              </button>
            </GlassCard>
          </motion.div>

          {/* Multiplayer option */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <GlassCard className="p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#1a1a2e]">
                    Multiplayer Room
                  </h2>
                  <p className="text-[13px] text-gray-500">
                    Host a live trivia for your team
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setNeedsName(true)}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-500/25"
                >
                  <Crown className="w-4 h-4" /> Host Game
                </button>
                <button
                  onClick={() => {
                    if (!gameRoom.playerName) {
                      setNeedsName(true)
                    } else {
                      setShowJoinInput(true)
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/70 border border-amber-300 text-amber-700 font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-amber-50 transition-colors"
                >
                  <Users className="w-4 h-4" /> Join Room
                </button>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <GlassCard className="p-5 text-center">
              <div className="flex items-center justify-center gap-2 text-[13px] text-gray-500">
                <Copy className="w-3.5 h-3.5" />
                <span>
                  Got a shared quiz link? Paste it in your browser to play!
                </span>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* Create mode */}
      {mode === 'create' && (
        <div className="max-w-2xl mx-auto">
          <CreateMode
            onStart={handleStartFromCreate}
            onBack={handleGoHome}
            initialQuestions={hashQuestions || undefined}
          />
        </div>
      )}

      {/* Play mode */}
      {mode === 'play' && localState.quizQuestions.length > 0 && (
        <PlayMode
          key={`play-${localState.playSession}`}
          questions={localState.quizQuestions}
          onBack={handleGoHome}
          onPlayAgain={handlePlayAgain}
          localState={localState}
          setLocalState={setLocalState}
        />
      )}
    </GameLayout>
  )
}
