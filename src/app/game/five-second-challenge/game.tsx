'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Brain, Play, SkipForward, CheckCircle2, XCircle, RotateCcw, Timer } from 'lucide-react'
import { GameLayout } from '@/components/game/game-layout'
import { GlassCard } from '@/components/game/glass-card'
import { TeamNameInput } from '@/components/game/team-name-input'
import { useLocalGameState } from '@/hooks/use-local-game-state'

const CATEGORIES = [
  'Name 3 pizza toppings',
  'Name 3 dog breeds',
  'Name 3 countries in Europe',
  'Name 3 Marvel superheroes',
  'Name 3 ice cream flavors',
  'Name 3 things in your fridge',
  'Name 3 Taylor Swift songs',
  'Name 3 programming languages',
  'Name 3 Netflix shows',
  'Name 3 board games',
  'Name 3 Olympic sports',
  'Name 3 things that are yellow',
  'Name 3 breakfast foods',
  'Name 3 Disney movies',
  'Name 3 car brands',
  'Name 3 social media platforms',
  'Name 3 things you\'d bring to a desert island',
  'Name 3 famous scientists',
  'Name 3 types of coffee drinks',
  'Name 3 things in your desk drawer',
  'Name 3 apps on your phone',
  'Name 3 holidays',
  'Name 3 types of shoes',
  'Name 3 famous landmarks',
  'Name 3 things that are round',
  'Name 3 vegetables',
  'Name 3 video games',
  'Name 3 musical instruments',
  'Name 3 Harry Potter characters',
  'Name 3 things at a birthday party',
  'Name 3 phobias',
  'Name 3 things that smell good',
  'Name 3 excuses for being late',
  'Name 3 things you do before bed',
  'Name 3 movie villains',
  'Name 3 things in a toolbox',
  'Name 3 words that start with Z',
  'Name 3 team sports',
  'Name 3 types of pasta',
  'Name 3 things on your bucket list',
  'Name 3 cartoon characters',
  'Name 3 things in a hotel room',
  'Name 3 dance moves',
  'Name 3 things at a beach',
  'Name 3 snacks from a vending machine',
]

type GamePhase = 'idle' | 'countdown' | 'buzzer' | 'result'

interface RoundResult {
  category: string
  gotIt: boolean
}

interface ScoreHistory {
  rounds: number
  score: number
  history: RoundResult[]
  playerName: string
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const INITIAL_SCORE: ScoreHistory = {
  rounds: 0,
  score: 0,
  history: [],
  playerName: '',
}

export function FiveSecondChallenge() {
  // Team name gate
  const [playerName, setPlayerName] = useState<string | null>(null)

  // Persisted score history
  const [savedState, setSavedState, clearSavedState] = useLocalGameState<ScoreHistory>(
    'reattend-5sec-score',
    INITIAL_SCORE,
  )

  // Game state
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [category, setCategory] = useState('')
  const [timeLeft, setTimeLeft] = useState(5)
  const [rounds, setRounds] = useState(0)
  const [score, setScore] = useState(0)
  const [history, setHistory] = useState<RoundResult[]>([])
  const [shuffledCategories, setShuffledCategories] = useState<string[]>([])
  const [categoryIndex, setCategoryIndex] = useState(0)
  const [screenFlash, setScreenFlash] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const [lastResult, setLastResult] = useState<boolean | null>(null)

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (savedState.rounds > 0) {
      setRounds(savedState.rounds)
      setScore(savedState.score)
      setHistory(savedState.history)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize shuffled categories
  useEffect(() => {
    setShuffledCategories(shuffleArray(CATEGORIES))
  }, [])

  // Persist score changes to localStorage
  const persistScore = useCallback(
    (newRounds: number, newScore: number, newHistory: RoundResult[]) => {
      setSavedState({
        rounds: newRounds,
        score: newScore,
        history: newHistory,
        playerName: playerName || '',
      })
    },
    [setSavedState, playerName],
  )

  const getNextCategory = useCallback(() => {
    let idx = categoryIndex
    if (idx >= shuffledCategories.length) {
      const reshuffled = shuffleArray(CATEGORIES)
      setShuffledCategories(reshuffled)
      idx = 0
    }
    const cat = shuffledCategories[idx] || CATEGORIES[0]
    setCategoryIndex(idx + 1)
    return cat
  }, [categoryIndex, shuffledCategories])

  const startRound = useCallback(() => {
    const nextCat = getNextCategory()
    setCategory(nextCat)
    setTimeLeft(5)
    setPhase('countdown')
    setScreenFlash(false)
    setLastResult(null)
    startTimeRef.current = Date.now()

    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const remaining = Math.max(0, 5 - elapsed)
      const displayTime = Math.ceil(remaining)

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current)
        setTimeLeft(0)
        setPhase('buzzer')
        setScreenFlash(true)
        setTimeout(() => setScreenFlash(false), 600)
      } else {
        setTimeLeft(displayTime)
      }
    }, 50)
  }, [getNextCategory])

  const handleResult = useCallback(
    (gotIt: boolean) => {
      const newRounds = rounds + 1
      const newScore = gotIt ? score + 1 : score
      const newHistory = [...history, { category, gotIt }]
      setRounds(newRounds)
      setScore(newScore)
      setHistory(newHistory)
      setLastResult(gotIt)
      setPhase('result')
      persistScore(newRounds, newScore, newHistory)
    },
    [rounds, score, history, category, persistScore],
  )

  const resetGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('idle')
    setRounds(0)
    setScore(0)
    setHistory([])
    setCategoryIndex(0)
    setShuffledCategories(shuffleArray(CATEGORIES))
    setScreenFlash(false)
    setLastResult(null)
    clearSavedState()
  }, [clearSavedState])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const getTimerColor = () => {
    if (phase === 'buzzer') return '#EF4444'
    if (timeLeft >= 4) return '#22C55E'
    if (timeLeft === 3) return '#EAB308'
    return '#EF4444'
  }

  const circumference = 2 * Math.PI * 90
  const dashOffset = phase === 'idle' ? 0 : circumference * (1 - timeLeft / 5)

  // Whether to show the results panel (side panel on desktop, stacked on mobile)
  const showResults = phase === 'buzzer' || phase === 'result'

  // Handle name submission
  const handleNameContinue = useCallback(
    (name: string) => {
      setPlayerName(name)
      // If we have a saved state with a matching name, restore it
      if (savedState.playerName === name && savedState.rounds > 0) {
        setRounds(savedState.rounds)
        setScore(savedState.score)
        setHistory(savedState.history)
      }
    },
    [savedState],
  )

  // ---------- Content Sections ----------

  const heroContent = (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-red-600 mb-4">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        Free team game
      </span>
      <h1 className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1]">
        <span className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">5-Second</span> Challenge
      </h1>
      <p className="text-gray-500 mt-3 text-[16px] md:text-[18px] max-w-xl mx-auto">
        Name 3 things in 5 seconds. Sounds easy until the timer starts.
      </p>
    </motion.div>
  )

  const howToPlayContent = (
    <div className="max-w-2xl mx-auto">
      <GlassCard className="p-8">
        <h3 className="text-[18px] font-bold mb-4">How to play</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-red-100 text-red-600 text-[13px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <p className="text-[14px] text-gray-600">Hit start. A random category appears on screen.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-600 text-[13px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <p className="text-[14px] text-gray-600">The player has exactly 5 seconds to name 3 things.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 text-[13px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <p className="text-[14px] text-gray-600">When time's up, the group judges: Pass or Got it!</p>
          </div>
        </div>
      </GlassCard>
    </div>
  )

  const ctaSectionContent = (
    <section className="relative z-10 py-20 md:py-28 px-5">
      <div className="max-w-[1200px] mx-auto relative">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500/10 via-orange-500/5 to-amber-500/10 blur-xl" />
        <div className="relative z-10">
          <GlassCard className="max-w-[600px] mx-auto p-10 md:p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <Brain className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-[22px] font-bold mb-3 text-[#1a1a2e]">Built by Reattend</h2>
            <p className="text-gray-600 text-[14px] mb-6 max-w-md mx-auto">
              Reattend captures every team decision and makes your knowledge searchable forever.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(239,68,68,0.3)] active:scale-[0.98]"
            >
              Try Reattend free <ArrowRight className="w-4 h-4" />
            </Link>
          </GlassCard>
        </div>
      </div>
    </section>
  )

  const bgBlobs = (
    <>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-red-500/8 via-orange-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-500/5 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-40 w-[500px] h-[500px] rounded-full bg-red-500/5 blur-3xl pointer-events-none" />
    </>
  )

  // ---------- Results Panel (right side on desktop, below on mobile) ----------

  const resultsPanel = (
    <GlassCard className="p-6 md:p-8 h-full">
      {/* Last round result */}
      {lastResult !== null && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className={`flex items-center gap-3 p-4 rounded-xl ${lastResult ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {lastResult ? (
              <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500 shrink-0" />
            )}
            <div>
              <p className={`text-[15px] font-bold ${lastResult ? 'text-green-700' : 'text-red-700'}`}>
                {lastResult ? 'Got it!' : 'Time\'s up!'}
              </p>
              <p className="text-[13px] text-gray-500">{category}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Score summary */}
      <div className="flex items-center justify-around mb-6">
        <div className="text-center">
          <p className="text-[36px] font-black text-green-500">{score}</p>
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">Correct</p>
        </div>
        <div className="w-px h-12 bg-gray-200" />
        <div className="text-center">
          <p className="text-[36px] font-black text-red-400">{rounds - score}</p>
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">Missed</p>
        </div>
        <div className="w-px h-12 bg-gray-200" />
        <div className="text-center">
          <p className="text-[36px] font-black text-gray-700">{rounds}</p>
          <p className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">Rounds</p>
        </div>
      </div>

      {/* Round history */}
      {history.length > 0 && (
        <div>
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">History</p>
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {[...history].reverse().map((item, i) => (
              <div
                key={history.length - 1 - i}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] ${
                  item.gotIt ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {item.gotIt ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 shrink-0" />
                )}
                <span className="truncate font-medium">{item.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reset button */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={resetGame}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Game
        </button>
      </div>
    </GlassCard>
  )

  // ---------- Game Area (main children of GameLayout) ----------

  const gameArea = (
    <>
      {/* Screen flash on buzzer */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-red-500 z-50 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Score bar (visible when game has rounds but not showing results panel) */}
      {rounds > 0 && !showResults && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-6 mb-4"
        >
          <div className="flex items-center gap-4 px-6 py-2.5 rounded-full bg-white/70 backdrop-blur-xl border border-white/80 shadow-sm">
            <span className="text-[14px] font-medium text-gray-500">Round {rounds}</span>
            <span className="w-px h-4 bg-gray-200" />
            <span className="text-[14px] font-bold text-green-600">{score} correct</span>
            <span className="w-px h-4 bg-gray-200" />
            <span className="text-[14px] font-bold text-red-500">{rounds - score} missed</span>
            <button
              onClick={resetGame}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Reset game"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Name tag */}
      {playerName && (
        <div className="flex items-center justify-center mb-4">
          <span className="text-[13px] font-medium text-gray-400">
            Playing as <span className="font-bold text-gray-600">{playerName}</span>
          </span>
        </div>
      )}

      <GlassCard className="p-8 md:p-12 min-h-[460px] flex flex-col items-center justify-center shadow-[0_8px_32px_rgba(239,68,68,0.08)]">
        <AnimatePresence mode="wait">
          {/* IDLE STATE */}
          {phase === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-8"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500/10 to-orange-500/10 flex items-center justify-center">
                <Timer className="w-16 h-16 text-red-500/60" />
              </div>
              <div className="text-center">
                <h2 className="text-[22px] md:text-[28px] font-bold mb-2">Ready to play?</h2>
                <p className="text-gray-500 text-[15px] max-w-sm">
                  A category appears. You have 5 seconds to name 3 things. No hesitation, no repeats, no passes.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={startRound}
                className="flex items-center gap-3 px-10 py-5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold text-[20px] shadow-[0_8px_30px_rgba(239,68,68,0.35)] transition-all"
              >
                <Play className="w-7 h-7 fill-white" />
                Start
              </motion.button>
            </motion.div>
          )}

          {/* COUNTDOWN STATE */}
          {phase === 'countdown' && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-8 w-full"
            >
              {/* Category prompt */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center"
              >
                <p className="text-[24px] md:text-[32px] lg:text-[38px] font-bold leading-tight">
                  {category}
                </p>
              </motion.div>

              {/* SVG circular timer */}
              <div className="relative">
                <motion.div
                  animate={timeLeft <= 2 ? {
                    scale: [1, 1.04, 1],
                  } : {}}
                  transition={timeLeft <= 2 ? {
                    duration: 0.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  } : {}}
                >
                  <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="8"
                    />
                    {/* Animated progress circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke={getTimerColor()}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      style={{
                        transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease',
                      }}
                    />
                  </svg>
                  {/* Center digit */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={timeLeft}
                        initial={{ opacity: 0, scale: 1.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                        className="text-[72px] font-black tabular-nums"
                        style={{ color: getTimerColor() }}
                      >
                        {timeLeft}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>

              <p className="text-gray-400 text-[14px] font-medium animate-pulse">
                GO GO GO!
              </p>
            </motion.div>
          )}

          {/* BUZZER STATE */}
          {phase === 'buzzer' && (
            <motion.div
              key="buzzer"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-8 w-full"
            >
              {/* Category reminder */}
              <p className="text-gray-400 text-[15px] font-medium text-center">{category}</p>

              {/* BUZZER text with shake */}
              <motion.div
                animate={{
                  x: [0, -8, 8, -6, 6, -3, 3, 0],
                  rotate: [0, -2, 2, -1, 1, 0],
                }}
                transition={{ duration: 0.5 }}
              >
                <motion.h2
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="text-[56px] md:text-[72px] font-black text-red-500 tracking-tight"
                >
                  BUZZER!
                </motion.h2>
              </motion.div>

              <p className="text-gray-500 text-[16px] font-medium">Time's up! Did they get all 3?</p>

              {/* Pass / Got it buttons */}
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleResult(false)}
                  className="flex items-center gap-2.5 px-8 py-4 rounded-full border-2 border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[18px] transition-all"
                >
                  <XCircle className="w-6 h-6" />
                  Pass
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleResult(true)}
                  className="flex items-center gap-2.5 px-8 py-4 rounded-full border-2 border-green-200 bg-green-50 hover:bg-green-100 text-green-600 font-bold text-[18px] transition-all"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  Got it!
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* RESULT STATE */}
          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center gap-8"
            >
              {/* Result feedback */}
              <div className={`flex items-center gap-3 px-6 py-3 rounded-full ${lastResult ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {lastResult ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={`text-[16px] font-bold ${lastResult ? 'text-green-700' : 'text-red-700'}`}>
                  {lastResult ? 'Nailed it!' : 'Not this time!'}
                </span>
              </div>

              {/* Next round button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={startRound}
                className="flex items-center gap-3 px-10 py-5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold text-[20px] shadow-[0_8px_30px_rgba(239,68,68,0.35)] transition-all"
              >
                <SkipForward className="w-6 h-6" />
                Next Round
              </motion.button>

              <button
                onClick={resetGame}
                className="text-gray-400 hover:text-gray-600 text-[14px] font-medium transition-colors"
              >
                Reset game
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </>
  )

  // ---------- Team Name Gate ----------

  if (!playerName) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        howToPlay={howToPlayContent}
        ctaSection={ctaSectionContent}
        bgBlobs={bgBlobs}
      >
        <TeamNameInput
          onContinue={handleNameContinue}
          showRoomOptions={false}
          accentColor="red"
          accentFrom="#EF4444"
          accentTo="#F97316"
        />
      </GameLayout>
    )
  }

  // ---------- Main Game ----------

  return (
    <GameLayout
      heroContent={heroContent}
      showResults={showResults}
      results={resultsPanel}
      howToPlay={howToPlayContent}
      ctaSection={ctaSectionContent}
      bgBlobs={bgBlobs}
    >
      {gameArea}
    </GameLayout>
  )
}
