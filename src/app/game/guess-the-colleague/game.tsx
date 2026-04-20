'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  UserSearch,
  Plus,
  Trash2,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Check,
  X,
  Trophy,
  Crown,
  Send,
  Users,
} from 'lucide-react'
import { GlassCard } from '@/components/game/glass-card'
import { GameLayout } from '@/components/game/game-layout'
import { TeamNameInput } from '@/components/game/team-name-input'
import { RoomLobby } from '@/components/game/room-lobby'
import { PlayerWaiting } from '@/components/game/player-waiting'
import { RoomBar } from '@/components/game/room-bar'
import { useGameRoom, UseGameRoomReturn } from '@/hooks/use-game-room'
import { useLocalGameState } from '@/hooks/use-local-game-state'

// ---------- Types ----------

interface Player {
  name: string
  fact: string
}

interface RoundResult {
  player: Player
  guessedName: string
  correct: boolean
}

interface LocalGameState {
  phase: 'setup' | 'play' | 'results'
  players: Player[]
  shuffledPlayers: Player[]
  currentIndex: number
  guessedName: string | null
  showAnswer: boolean
  results: RoundResult[]
  score: number
}

// ---------- Helpers ----------

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function getRankingMessage(percentage: number): string {
  if (percentage <= 30) return 'Do you even know your team?'
  if (percentage <= 60) return 'Not bad, but room to grow!'
  if (percentage <= 80) return 'Your team knows each other well!'
  return "You're basically telepathic!"
}

// ---------- Placeholder facts ----------

const placeholderFacts = [
  'I once won a hot dog eating contest',
  'I can speak 4 languages',
  'I have a pet iguana named Steve',
  'I was on TV when I was 5',
  "I can solve a Rubik's cube in under a minute",
]

// ---------- Constants ----------

const INITIAL_LOCAL_STATE: LocalGameState = {
  phase: 'setup',
  players: [],
  shuffledPlayers: [],
  currentIndex: 0,
  guessedName: null,
  showAnswer: false,
  results: [],
  score: 0,
}

// ============================================================================
// LOCAL MODE COMPONENT
// ============================================================================

function LocalMode({ playerName }: { playerName: string }) {
  const [savedState, setSavedState, clearSavedState] = useLocalGameState<LocalGameState>(
    'reattend-guess-colleague',
    INITIAL_LOCAL_STATE,
  )

  // Hydrate from localStorage
  const [phase, setPhase] = useState<'setup' | 'play' | 'results'>(savedState.phase)
  const [players, setPlayers] = useState<Player[]>(savedState.players)
  const [shuffledPlayers, setShuffledPlayers] = useState<Player[]>(savedState.shuffledPlayers)
  const [currentIndex, setCurrentIndex] = useState(savedState.currentIndex)
  const [guessedName, setGuessedName] = useState<string | null>(savedState.guessedName)
  const [showAnswer, setShowAnswer] = useState(savedState.showAnswer)
  const [results, setResults] = useState<RoundResult[]>(savedState.results)
  const [score, setScore] = useState(savedState.score)

  // Setup inputs
  const [nameInput, setNameInput] = useState('')
  const [factInput, setFactInput] = useState('')
  const [setupError, setSetupError] = useState('')

  // Persist state changes
  useEffect(() => {
    setSavedState({
      phase,
      players,
      shuffledPlayers,
      currentIndex,
      guessedName,
      showAnswer,
      results,
      score,
    })
  }, [phase, players, shuffledPlayers, currentIndex, guessedName, showAnswer, results, score, setSavedState])

  // ---------- Setup handlers ----------

  const addPlayer = useCallback(() => {
    const trimmedName = nameInput.trim()
    const trimmedFact = factInput.trim()

    if (!trimmedName) {
      setSetupError('Please enter a name.')
      return
    }
    if (!trimmedFact) {
      setSetupError('Please enter a fun fact.')
      return
    }
    if (players.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setSetupError('That name is already added.')
      return
    }

    setPlayers((prev) => [...prev, { name: trimmedName, fact: trimmedFact }])
    setNameInput('')
    setFactInput('')
    setSetupError('')
  }, [nameInput, factInput, players])

  const removePlayer = useCallback((index: number) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const startGame = useCallback(() => {
    if (players.length < 3) {
      setSetupError('You need at least 3 players to start.')
      return
    }
    const shuffled = shuffleArray(players)
    setShuffledPlayers(shuffled)
    setCurrentIndex(0)
    setGuessedName(null)
    setShowAnswer(false)
    setResults([])
    setScore(0)
    setPhase('play')
  }, [players])

  // ---------- Play handlers ----------

  const handleGuess = useCallback(
    (name: string) => {
      if (showAnswer) return
      const currentPlayer = shuffledPlayers[currentIndex]
      const isCorrect = name === currentPlayer.name
      setGuessedName(name)
      setShowAnswer(true)
      if (isCorrect) {
        setScore((prev) => prev + 1)
      }
      setResults((prev) => [
        ...prev,
        {
          player: currentPlayer,
          guessedName: name,
          correct: isCorrect,
        },
      ])
    },
    [showAnswer, shuffledPlayers, currentIndex],
  )

  const nextFact = useCallback(() => {
    if (currentIndex + 1 >= shuffledPlayers.length) {
      setPhase('results')
    } else {
      setCurrentIndex((prev) => prev + 1)
      setGuessedName(null)
      setShowAnswer(false)
    }
  }, [currentIndex, shuffledPlayers.length])

  // ---------- Results handlers ----------

  const playAgain = useCallback(() => {
    setPhase('setup')
    setPlayers([])
    setNameInput('')
    setFactInput('')
    setSetupError('')
    setShuffledPlayers([])
    setCurrentIndex(0)
    setGuessedName(null)
    setShowAnswer(false)
    setResults([])
    setScore(0)
    clearSavedState()
  }, [clearSavedState])

  // ---------- Derived ----------

  const totalRounds = shuffledPlayers.length
  const progress = totalRounds > 0 ? ((currentIndex + (showAnswer ? 1 : 0)) / totalRounds) * 100 : 0
  const percentage = totalRounds > 0 ? Math.round((score / totalRounds) * 100) : 0
  const currentFact = shuffledPlayers[currentIndex]?.fact || ''
  const currentActualName = shuffledPlayers[currentIndex]?.name || ''
  const placeholderIndex = players.length % placeholderFacts.length

  // ---------- Results Panel ----------

  const resultsPanel = phase === 'results' ? (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Score card */}
      <GlassCard className="p-8 md:p-12 text-center mb-6">
        <div className="text-[60px] md:text-[80px] font-bold bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 bg-clip-text text-transparent leading-none mb-2">
          {score}/{totalRounds}
        </div>
        <p className="text-gray-400 text-[15px] mb-4">{percentage}% correct</p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-[20px] md:text-[24px] font-bold text-[#1a1a2e]"
        >
          {getRankingMessage(percentage)}
        </motion.p>
      </GlassCard>

      {/* Breakdown */}
      <GlassCard className="p-6 md:p-8 mb-6">
        <h3 className="text-[16px] font-bold mb-4">Round by Round</h3>
        <div className="space-y-3">
          {results.map((result, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className={`
                flex items-start gap-3 px-4 py-3 rounded-xl border
                ${result.correct ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'}
              `}
            >
              <div
                className={`
                w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
                ${result.correct ? 'bg-emerald-500' : 'bg-red-500'}
              `}
              >
                {result.correct ? <Check className="w-3.5 h-3.5 text-white" /> : <X className="w-3.5 h-3.5 text-white" />}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] text-gray-600 leading-snug">&ldquo;{result.player.fact}&rdquo;</p>
                <p className="text-[13px] font-semibold mt-1">
                  <span className="text-gray-500">Said by:</span>{' '}
                  <span className={result.correct ? 'text-emerald-600' : 'text-red-600'}>{result.player.name}</span>
                  {!result.correct && (
                    <span className="text-gray-400 font-normal"> (guessed {result.guessedName})</span>
                  )}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* Play again */}
      <motion.button
        onClick={playAgain}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white font-bold text-[17px] shadow-[0_6px_24px_rgba(20,184,166,0.35)] hover:shadow-[0_8px_32px_rgba(20,184,166,0.45)] transition-all"
      >
        <RotateCcw className="w-5 h-5" />
        Play Again
      </motion.button>
    </motion.div>
  ) : null

  // ---------- Game Area ----------

  const gameArea = (
    <AnimatePresence mode="wait">
      {/* ==================== PHASE 1: SETUP ==================== */}
      {phase === 'setup' && (
        <motion.div
          key="setup"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {/* Playing as */}
          <div className="flex items-center justify-center mb-4">
            <span className="text-[13px] font-medium text-gray-400">
              Playing as <span className="font-bold text-gray-600">{playerName}</span>
            </span>
          </div>

          {/* Add player form */}
          <GlassCard className="p-6 md:p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <UserSearch className="w-5 h-5 text-teal-600" />
              </div>
              <h2 className="text-[20px] font-bold">Add Players</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value)
                    setSetupError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      document.getElementById('fact-input')?.focus()
                    }
                  }}
                  placeholder="e.g. Sarah"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all placeholder:text-gray-300"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-600 mb-1.5">
                  Fun fact about themselves
                </label>
                <input
                  id="fact-input"
                  type="text"
                  value={factInput}
                  onChange={(e) => {
                    setFactInput(e.target.value)
                    setSetupError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addPlayer()
                    }
                  }}
                  placeholder={placeholderFacts[placeholderIndex]}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-[15px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all placeholder:text-gray-300"
                />
              </div>

              {setupError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-[13px] font-medium"
                >
                  {setupError}
                </motion.p>
              )}

              <motion.button
                onClick={addPlayer}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-[15px] transition-colors shadow-[0_4px_14px_rgba(20,184,166,0.3)]"
              >
                <Plus className="w-4 h-4" />
                Add Player
              </motion.button>
            </div>
          </GlassCard>

          {/* Player list */}
          {players.length > 0 && (
            <GlassCard className="p-6 md:p-8 mb-6">
              <h3 className="text-[16px] font-bold mb-4">
                Players ({players.length})
                {players.length < 3 && (
                  <span className="text-gray-400 font-normal text-[13px] ml-2">- need at least 3</span>
                )}
              </h3>
              <div className="space-y-2">
                {players.map((player, i) => (
                  <motion.div
                    key={`${player.name}-${i}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-100 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-[13px] font-bold shrink-0">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[14px] truncate">{player.name}</p>
                        <p className="text-gray-400 text-[12px]">***</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removePlayer(i)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Start game button */}
          <motion.button
            onClick={startGame}
            disabled={players.length < 3}
            whileHover={players.length >= 3 ? { scale: 1.02 } : {}}
            whileTap={players.length >= 3 ? { scale: 0.98 } : {}}
            className={`
              w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold text-[17px] transition-all
              ${
                players.length >= 3
                  ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-[0_6px_24px_rgba(20,184,166,0.35)] hover:shadow-[0_8px_32px_rgba(20,184,166,0.45)]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            Start Game
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}

      {/* ==================== PHASE 2: PLAY ==================== */}
      {phase === 'play' && (
        <motion.div
          key="play"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-gray-500">
                Fact {currentIndex + 1} of {totalRounds}
              </span>
              <span className="text-[13px] font-bold text-teal-600">
                Score: {score}/{currentIndex + (showAnswer ? 1 : 0)}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-gray-200/60 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Fact card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -16 }}
              transition={{ duration: 0.4 }}
              className={`
                rounded-2xl border-2 p-8 md:p-12 text-center mb-6 shadow-[0_12px_48px_rgba(0,0,0,0.08)]
                ${
                  showAnswer
                    ? guessedName === currentActualName
                      ? 'border-emerald-300 bg-emerald-50/80'
                      : 'border-red-300 bg-red-50/80'
                    : 'border-teal-200 bg-white/80 backdrop-blur-xl'
                }
              `}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 text-teal-600 text-[13px] font-bold uppercase tracking-wider mb-6">
                <UserSearch className="w-3.5 h-3.5" />
                Who said this?
              </span>

              <p className="text-[24px] sm:text-[30px] md:text-[36px] font-bold leading-[1.3] text-[#1a1a2e]">
                &ldquo;{currentFact}&rdquo;
              </p>

              {/* Answer reveal */}
              <AnimatePresence>
                {showAnswer && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="mt-6"
                  >
                    {guessedName === currentActualName ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-600">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[20px] md:text-[24px] font-bold">Yes! It was {currentActualName}!</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-red-600">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                          <X className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[20px] md:text-[24px] font-bold">
                          Nope! It was actually {currentActualName}!
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>

          {/* Player name buttons */}
          {!showAnswer && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {players.map((player, i) => (
                <motion.button
                  key={`${player.name}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleGuess(player.name)}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-4 py-4 rounded-xl bg-white border-2 border-gray-100 hover:border-teal-300 hover:bg-teal-50/50 font-bold text-[15px] md:text-[17px] text-[#1a1a2e] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(20,184,166,0.15)]"
                >
                  {player.name}
                </motion.button>
              ))}
            </div>
          )}

          {/* Next fact button */}
          {showAnswer && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={nextFact}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white font-bold text-[17px] shadow-[0_6px_24px_rgba(20,184,166,0.35)] hover:shadow-[0_8px_32px_rgba(20,184,166,0.45)] transition-all"
            >
              {currentIndex + 1 >= totalRounds ? 'See Results' : 'Next Fact'}
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Results phase shows in the results panel via GameLayout */}
      {phase === 'results' && (
        <motion.div
          key="results-placeholder"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="md:hidden"
        >
          {/* Mobile: results render below via GameLayout */}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return { gameArea, resultsPanel, showResults: phase === 'results' }
}

// ============================================================================
// HOST MODE COMPONENT
// ============================================================================

function HostMode({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const roomPhase = gameRoom.room?.phase || 'lobby'
  const roomState = (gameRoom.room?.state as any) || {}
  const submissions = gameRoom.getActionsOfType('submit_fact')

  // Derive state from room
  const currentIndex = roomState.currentIndex ?? 0
  const revealed = roomState.revealed ?? false
  const shuffledSubmissions = roomState.shuffledSubmissions as Array<{ playerName: string; fact: string }> | undefined
  const hostGuesses = (roomState.hostGuesses as Array<{ guessedName: string; correct: boolean }>) || []

  const currentSubmission = shuffledSubmissions?.[currentIndex]
  const totalRounds = shuffledSubmissions?.length || 0
  const score = hostGuesses.filter((g) => g.correct).length

  // All player names for guess buttons
  const allPlayerNames = useMemo(() => {
    return gameRoom.players.filter((p) => !p.isHost).map((p) => p.name)
  }, [gameRoom.players])

  // ---------- Host Handlers ----------

  const handleStartGame = useCallback(async () => {
    // Gather all submitted facts and shuffle them
    const facts = submissions.map((action) => {
      const player = gameRoom.players.find((p) => p.playerId === action.playerId)
      return {
        playerName: player?.name || 'Unknown',
        fact: (action.payload as any)?.fact || '',
      }
    })
    const shuffled = shuffleArray(facts)

    await gameRoom.updateRoom({
      phase: 'guessing',
      state: {
        shuffledSubmissions: shuffled,
        currentIndex: 0,
        revealed: false,
        hostGuesses: [],
      },
    })
  }, [submissions, gameRoom])

  const handleHostGuess = useCallback(
    async (name: string) => {
      if (revealed || !currentSubmission) return

      const isCorrect = name === currentSubmission.playerName
      const newGuesses = [...hostGuesses, { guessedName: name, correct: isCorrect }]

      await gameRoom.updateRoom({
        phase: 'reveal',
        state: {
          ...roomState,
          revealed: true,
          hostGuesses: newGuesses,
          lastGuessedName: name,
        },
      })
    },
    [revealed, currentSubmission, hostGuesses, roomState, gameRoom],
  )

  const handleNextFact = useCallback(async () => {
    if (currentIndex + 1 >= totalRounds) {
      await gameRoom.updateRoom({
        phase: 'results',
        state: {
          ...roomState,
          revealed: false,
        },
      })
    } else {
      await gameRoom.updateRoom({
        phase: 'guessing',
        state: {
          ...roomState,
          currentIndex: currentIndex + 1,
          revealed: false,
          lastGuessedName: null,
        },
      })
    }
  }, [currentIndex, totalRounds, roomState, gameRoom])

  const handlePlayAgain = useCallback(async () => {
    await gameRoom.updateRoom({
      phase: 'submitting',
      state: {},
    })
  }, [gameRoom])

  const handleStartSubmitting = useCallback(async () => {
    await gameRoom.updateRoom({
      phase: 'submitting',
      state: {},
    })
  }, [gameRoom])

  // ---------- Render ----------

  // Lobby
  if (roomPhase === 'lobby') {
    return (
      <div className="space-y-4">
        <RoomLobby
          roomCode={gameRoom.roomCode!}
          players={gameRoom.players}
          isHost={true}
          onStart={handleStartSubmitting}
          minPlayers={3}
          accentColor="#0891B2"
          gameTitle="Guess the Colleague"
        />
      </div>
    )
  }

  // Submitting phase - waiting for players to submit facts
  if (roomPhase === 'submitting') {
    const submittedCount = submissions.length
    const nonHostPlayers = gameRoom.players.filter((p) => !p.isHost)
    const totalPlayers = nonHostPlayers.length

    return (
      <div className="space-y-4">
        <GlassCard className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 mx-auto mb-6 flex items-center justify-center">
            <UserSearch className="w-8 h-8 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Waiting for Fun Facts</h2>
          <p className="text-sm text-gray-500 mb-6">
            Players are submitting their fun facts on their phones.
          </p>

          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="text-[48px] font-black text-teal-600">
              {submittedCount}
            </div>
            <div className="text-[24px] text-gray-400 font-bold">/</div>
            <div className="text-[48px] font-black text-gray-300">
              {totalPlayers}
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-6">facts submitted</p>

          {/* Show who has submitted */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {nonHostPlayers.map((player) => {
              const hasSubmitted = submissions.some((s) => s.playerId === player.playerId)
              return (
                <span
                  key={player.playerId}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                    hasSubmitted
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {hasSubmitted && <Check className="w-3 h-3" />}
                  {player.name}
                </span>
              )
            })}
          </div>

          {submittedCount >= 3 && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleStartGame}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white font-bold text-[15px] shadow-[0_6px_24px_rgba(20,184,166,0.35)] transition-all"
            >
              Start Guessing ({submittedCount} facts)
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          )}
        </GlassCard>
      </div>
    )
  }

  // Guessing / Reveal phase
  if (roomPhase === 'guessing' || roomPhase === 'reveal') {
    const lastGuessedName = roomState.lastGuessedName as string | null

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] font-semibold text-gray-500">
              Fact {currentIndex + 1} of {totalRounds}
            </span>
            <span className="text-[13px] font-bold text-teal-600">
              Score: {score}/{currentIndex + (revealed ? 1 : 0)}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-gray-200/60 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
              animate={{ width: `${((currentIndex + (revealed ? 1 : 0)) / totalRounds) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Fact card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -16 }}
            transition={{ duration: 0.4 }}
            className={`
              rounded-2xl border-2 p-8 md:p-12 text-center mb-6 shadow-[0_12px_48px_rgba(0,0,0,0.08)]
              ${
                revealed
                  ? lastGuessedName === currentSubmission?.playerName
                    ? 'border-emerald-300 bg-emerald-50/80'
                    : 'border-red-300 bg-red-50/80'
                  : 'border-teal-200 bg-white/80 backdrop-blur-xl'
              }
            `}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 text-teal-600 text-[13px] font-bold uppercase tracking-wider mb-6">
              <UserSearch className="w-3.5 h-3.5" />
              Who said this?
            </span>

            <p className="text-[24px] sm:text-[30px] md:text-[36px] font-bold leading-[1.3] text-[#1a1a2e]">
              &ldquo;{currentSubmission?.fact}&rdquo;
            </p>

            {/* Answer reveal */}
            <AnimatePresence>
              {revealed && currentSubmission && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="mt-6"
                >
                  {lastGuessedName === currentSubmission.playerName ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[20px] md:text-[24px] font-bold">
                        Yes! It was {currentSubmission.playerName}!
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-red-600">
                      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                        <X className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[20px] md:text-[24px] font-bold">
                        Nope! It was actually {currentSubmission.playerName}!
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>

        {/* Player name buttons (host picks) */}
        {!revealed && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {allPlayerNames.map((name, i) => (
              <motion.button
                key={name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleHostGuess(name)}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="px-4 py-4 rounded-xl bg-white border-2 border-gray-100 hover:border-teal-300 hover:bg-teal-50/50 font-bold text-[15px] md:text-[17px] text-[#1a1a2e] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(20,184,166,0.15)]"
              >
                {name}
              </motion.button>
            ))}
          </div>
        )}

        {/* Next fact button */}
        {revealed && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={handleNextFact}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white font-bold text-[17px] shadow-[0_6px_24px_rgba(20,184,166,0.35)] hover:shadow-[0_8px_32px_rgba(20,184,166,0.45)] transition-all"
          >
            {currentIndex + 1 >= totalRounds ? 'See Results' : 'Next Fact'}
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </motion.div>
    )
  }

  // Results phase (host view)
  if (roomPhase === 'results') {
    const finalGuesses = (roomState.hostGuesses as Array<{ guessedName: string; correct: boolean }>) || []
    const finalSubmissions = (roomState.shuffledSubmissions as Array<{ playerName: string; fact: string }>) || []
    const finalScore = finalGuesses.filter((g) => g.correct).length
    const finalTotal = finalSubmissions.length
    const finalPercentage = finalTotal > 0 ? Math.round((finalScore / finalTotal) * 100) : 0

    // Collect player guesses for scoreboard
    const playerGuesses = gameRoom.getActionsOfType('guess')

    // Build per-player scoreboard
    const playerScores: Record<string, { name: string; correct: number; total: number }> = {}
    gameRoom.players.forEach((p) => {
      if (!p.isHost) {
        playerScores[p.playerId] = { name: p.name, correct: 0, total: 0 }
      }
    })
    playerGuesses.forEach((action) => {
      const payload = action.payload as any
      if (playerScores[action.playerId]) {
        playerScores[action.playerId].total += 1
        const roundIdx = payload.roundIndex ?? 0
        const guessed = payload.guessedName
        const actual = finalSubmissions[roundIdx]?.playerName
        if (guessed === actual) {
          playerScores[action.playerId].correct += 1
        }
      }
    })

    const sortedScores = Object.values(playerScores).sort((a, b) => b.correct - a.correct)

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Team score card */}
        <GlassCard className="p-8 md:p-12 text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_32px_rgba(20,184,166,0.3)]">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div className="text-[60px] md:text-[80px] font-bold bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 bg-clip-text text-transparent leading-none mb-2">
            {finalScore}/{finalTotal}
          </div>
          <p className="text-gray-400 text-[15px] mb-4">{finalPercentage}% correct (team guess)</p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[20px] md:text-[24px] font-bold text-[#1a1a2e]"
          >
            {getRankingMessage(finalPercentage)}
          </motion.p>
        </GlassCard>

        {/* Player scoreboard */}
        {sortedScores.length > 0 && (
          <GlassCard className="p-6 md:p-8 mb-6">
            <h3 className="text-[16px] font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-teal-600" />
              Player Scoreboard
            </h3>
            <div className="space-y-2">
              {sortedScores.map((ps, i) => (
                <motion.div
                  key={ps.name}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[16px] font-bold text-gray-300 w-6 text-center">
                      {i === 0 ? <Crown className="w-5 h-5 text-amber-500 inline" /> : `${i + 1}`}
                    </span>
                    <span className="font-semibold text-[14px]">{ps.name}</span>
                  </div>
                  <span className="text-[14px] font-bold text-teal-600">
                    {ps.correct}/{ps.total}
                  </span>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Round breakdown */}
        <GlassCard className="p-6 md:p-8 mb-6">
          <h3 className="text-[16px] font-bold mb-4">Fun Fact Highlights</h3>
          <div className="space-y-3">
            {finalSubmissions.map((sub, i) => {
              const guess = finalGuesses[i]
              const isCorrect = guess?.correct ?? false
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className={`
                    flex items-start gap-3 px-4 py-3 rounded-xl border
                    ${isCorrect ? 'bg-emerald-50/60 border-emerald-200' : 'bg-red-50/60 border-red-200'}
                  `}
                >
                  <div
                    className={`
                    w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
                    ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}
                  `}
                  >
                    {isCorrect ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] text-gray-600 leading-snug">&ldquo;{sub.fact}&rdquo;</p>
                    <p className="text-[13px] font-semibold mt-1">
                      <span className="text-gray-500">Said by:</span>{' '}
                      <span className={isCorrect ? 'text-emerald-600' : 'text-red-600'}>{sub.playerName}</span>
                      {!isCorrect && guess && (
                        <span className="text-gray-400 font-normal"> (guessed {guess.guessedName})</span>
                      )}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </GlassCard>

        {/* Play again */}
        <motion.button
          onClick={handlePlayAgain}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white font-bold text-[17px] shadow-[0_6px_24px_rgba(20,184,166,0.35)] hover:shadow-[0_8px_32px_rgba(20,184,166,0.45)] transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          Play Again
        </motion.button>
      </motion.div>
    )
  }

  return null
}

// ============================================================================
// PLAYER MODE COMPONENT
// ============================================================================

function PlayerMode({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const roomPhase = gameRoom.room?.phase || 'lobby'
  const roomState = (gameRoom.room?.state as any) || {}
  const submissions = gameRoom.getActionsOfType('submit_fact')

  // Player's own submission
  const mySubmission = submissions.find((s) => s.playerId === gameRoom.playerId)
  const hasSubmitted = !!mySubmission

  // Fact input
  const [factInput, setFactInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Guessing state
  const myGuesses = gameRoom.getActionsOfType('guess').filter((a) => a.playerId === gameRoom.playerId)

  const shuffledSubmissions = roomState.shuffledSubmissions as Array<{ playerName: string; fact: string }> | undefined
  const currentIndex = roomState.currentIndex ?? 0
  const revealed = roomState.revealed ?? false
  const lastGuessedName = roomState.lastGuessedName as string | null
  const totalRounds = shuffledSubmissions?.length || 0
  const currentSubmission = shuffledSubmissions?.[currentIndex]

  // All player names for guessing
  const allPlayerNames = useMemo(() => {
    return gameRoom.players.filter((p) => !p.isHost).map((p) => p.name)
  }, [gameRoom.players])

  // Check if player already guessed this round
  const hasGuessedThisRound = myGuesses.some(
    (g) => (g.payload as any)?.roundIndex === currentIndex,
  )

  // ---------- Handlers ----------

  const handleSubmitFact = useCallback(async () => {
    const trimmed = factInput.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await gameRoom.submitAction('submit_fact', { fact: trimmed })
      setFactInput('')
    } catch {
      // error handled by hook
    } finally {
      setSubmitting(false)
    }
  }, [factInput, submitting, gameRoom])

  const handleGuess = useCallback(
    async (name: string) => {
      if (hasGuessedThisRound) return
      try {
        await gameRoom.submitAction('guess', {
          roundIndex: currentIndex,
          guessedName: name,
        })
      } catch {
        // error handled by hook
      }
    },
    [hasGuessedThisRound, currentIndex, gameRoom],
  )

  // ---------- Render ----------

  // Lobby - waiting for host
  if (roomPhase === 'lobby') {
    return (
      <PlayerWaiting
        message="Waiting for the host to start..."
        accentColor="#0891B2"
        roomCode={gameRoom.roomCode || undefined}
      />
    )
  }

  // Submitting phase
  if (roomPhase === 'submitting') {
    if (hasSubmitted) {
      return (
        <PlayerWaiting
          hasSubmitted={true}
          submittedMessage="Fun fact submitted!"
          message="Waiting for everyone else to submit..."
          accentColor="#0891B2"
          roomCode={gameRoom.roomCode || undefined}
        />
      )
    }

    return (
      <GlassCard className="p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 mx-auto mb-4 flex items-center justify-center">
            <UserSearch className="w-7 h-7 text-teal-600" />
          </div>
          <h2 className="text-lg font-bold mb-1">Share a Fun Fact</h2>
          <p className="text-sm text-gray-500">
            Enter something interesting about yourself. It will be shown anonymously for the team to guess!
          </p>
        </div>

        <div className="space-y-4">
          <textarea
            value={factInput}
            onChange={(e) => setFactInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmitFact()
              }
            }}
            placeholder="e.g. I once won a hot dog eating contest"
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 resize-none transition-all"
          />

          <motion.button
            onClick={handleSubmitFact}
            disabled={!factInput.trim() || submitting}
            whileHover={factInput.trim() ? { scale: 1.02 } : {}}
            whileTap={factInput.trim() ? { scale: 0.98 } : {}}
            className={`
              w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-[15px] transition-all
              ${
                factInput.trim() && !submitting
                  ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-[0_4px_14px_rgba(20,184,166,0.3)]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting...' : 'Submit Fun Fact'}
          </motion.button>
        </div>
      </GlassCard>
    )
  }

  // Guessing phase (player view)
  if (roomPhase === 'guessing') {
    if (!currentSubmission) {
      return (
        <PlayerWaiting
          message="Waiting for the next round..."
          accentColor="#0891B2"
          roomCode={gameRoom.roomCode || undefined}
        />
      )
    }

    // Already guessed this round
    if (hasGuessedThisRound) {
      return (
        <PlayerWaiting
          hasSubmitted={true}
          submittedMessage="Guess submitted!"
          message="Waiting for the host to reveal the answer..."
          accentColor="#0891B2"
          roomCode={gameRoom.roomCode || undefined}
        />
      )
    }

    return (
      <div>
        {/* Progress */}
        <div className="mb-4 text-center">
          <span className="text-[13px] font-semibold text-gray-500">
            Fact {currentIndex + 1} of {totalRounds}
          </span>
        </div>

        {/* Fact card */}
        <GlassCard className="p-6 md:p-8 text-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 text-teal-600 text-[13px] font-bold uppercase tracking-wider mb-4">
            <UserSearch className="w-3.5 h-3.5" />
            Who said this?
          </span>
          <p className="text-[20px] sm:text-[24px] font-bold leading-[1.3] text-[#1a1a2e]">
            &ldquo;{currentSubmission.fact}&rdquo;
          </p>
        </GlassCard>

        {/* Player name buttons */}
        <div className="grid grid-cols-2 gap-3">
          {allPlayerNames.map((name, i) => (
            <motion.button
              key={name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => handleGuess(name)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-3.5 rounded-xl bg-white border-2 border-gray-100 hover:border-teal-300 hover:bg-teal-50/50 font-bold text-[14px] text-[#1a1a2e] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              {name}
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  // Reveal phase (player view)
  if (roomPhase === 'reveal') {
    const myGuessForRound = myGuesses.find((g) => (g.payload as any)?.roundIndex === currentIndex)
    const myGuessedName = (myGuessForRound?.payload as any)?.guessedName
    const actualName = currentSubmission?.playerName
    const gotItRight = myGuessedName === actualName

    return (
      <GlassCard className="p-6 md:p-8 text-center">
        <p className="text-[18px] sm:text-[22px] font-bold leading-[1.3] text-[#1a1a2e] mb-4">
          &ldquo;{currentSubmission?.fact}&rdquo;
        </p>

        <div className="mb-4">
          {myGuessedName ? (
            gotItRight ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-50 border border-emerald-200"
              >
                <Check className="w-5 h-5 text-emerald-500" />
                <span className="font-bold text-emerald-700">
                  Correct! It was {actualName}!
                </span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-50 border border-red-200"
              >
                <X className="w-5 h-5 text-red-500" />
                <span className="font-bold text-red-700">
                  Wrong! It was {actualName}. You guessed {myGuessedName}.
                </span>
              </motion.div>
            )
          ) : (
            <div className="text-gray-500 text-sm">
              The answer is <span className="font-bold text-teal-600">{actualName}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-gray-400">Waiting for the host to continue...</p>
      </GlassCard>
    )
  }

  // Results phase (player view)
  if (roomPhase === 'results') {
    const finalSubmissions = (roomState.shuffledSubmissions as Array<{ playerName: string; fact: string }>) || []
    const allMyGuesses = myGuesses
    const myScore = allMyGuesses.reduce((count, g) => {
      const payload = g.payload as any
      const roundIdx = payload.roundIndex ?? 0
      const actual = finalSubmissions[roundIdx]?.playerName
      return payload.guessedName === actual ? count + 1 : count
    }, 0)
    const myTotal = allMyGuesses.length
    const myPercentage = myTotal > 0 ? Math.round((myScore / myTotal) * 100) : 0

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassCard className="p-8 text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-[0_6px_20px_rgba(20,184,166,0.3)]">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-lg font-bold mb-2">Your Score</h2>
          <div className="text-[48px] font-bold bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 bg-clip-text text-transparent leading-none mb-2">
            {myScore}/{myTotal}
          </div>
          <p className="text-gray-400 text-[14px] mb-3">{myPercentage}% correct</p>
          <p className="text-[16px] font-bold text-[#1a1a2e]">{getRankingMessage(myPercentage)}</p>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-[14px] font-bold mb-3">Your Guesses</h3>
          <div className="space-y-2">
            {allMyGuesses.map((g, i) => {
              const payload = g.payload as any
              const roundIdx = payload.roundIndex ?? 0
              const actual = finalSubmissions[roundIdx]?.playerName
              const fact = finalSubmissions[roundIdx]?.fact
              const isCorrect = payload.guessedName === actual

              return (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg text-[13px] ${
                    isCorrect ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {isCorrect ? (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className="text-gray-600 truncate">&ldquo;{fact}&rdquo;</p>
                    <p className="font-semibold mt-0.5">
                      <span className={isCorrect ? 'text-emerald-600' : 'text-red-600'}>{actual}</span>
                      {!isCorrect && (
                        <span className="text-gray-400 font-normal"> (you guessed {payload.guessedName})</span>
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </motion.div>
    )
  }

  // Fallback
  return (
    <PlayerWaiting
      message="Waiting for the game to start..."
      accentColor="#0891B2"
      roomCode={gameRoom.roomCode || undefined}
    />
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GuessTheColleague() {
  const searchParams = useSearchParams()
  const urlRoomCode = searchParams.get('room')

  // Team name gate
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [mode, setMode] = useState<'local' | 'creating' | 'joining'>('local')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')

  // Game room hook (always initialized, used only in multiplayer)
  const gameRoom = useGameRoom({ gameType: 'guess-the-colleague' })

  // Determine if we are in a multiplayer room
  const isInRoom = !!gameRoom.roomCode || !!urlRoomCode
  const isHost = gameRoom.isHost

  // Handle name submission
  const handleNameContinue = useCallback(
    (name: string) => {
      setPlayerName(name)
      gameRoom.setPlayerName(name)
    },
    [gameRoom],
  )

  // Handle room creation
  const handleCreateRoom = useCallback(async () => {
    setMode('creating')
    try {
      await gameRoom.createRoom()
    } catch {
      setMode('local')
    }
  }, [gameRoom])

  // Handle join room
  const handleJoinRoom = useCallback(() => {
    setMode('joining')
  }, [])

  const handleJoinSubmit = useCallback(async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code) {
      setJoinError('Please enter a room code.')
      return
    }
    setJoinError('')
    try {
      await gameRoom.joinRoom(code)
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join room.')
    }
  }, [joinCode, gameRoom])

  // ---------- Content Sections ----------

  const heroContent = (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-300/40 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-teal-600 mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        Free team game
      </span>
      <h1 className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1]">
        Guess the{' '}
        <span className="bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
          Colleague
        </span>
      </h1>
      <p className="text-gray-500 mt-4 text-[16px] md:text-[18px] max-w-xl mx-auto">
        Everyone submits a fun fact anonymously. The team guesses who said what. The game that builds real connections.
      </p>
    </motion.div>
  )

  const bgBlobs = (
    <>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-cyan-400/10 via-teal-400/8 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-60 -left-40 w-[500px] h-[500px] rounded-full bg-teal-400/8 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-400/8 blur-3xl pointer-events-none" />
    </>
  )

  const howToPlayContent = (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(20,184,166,0.06)] p-8 md:p-10"
      >
        <h2 className="text-[22px] font-bold mb-6 text-center">How to Play</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
              1
            </div>
            <h3 className="font-bold text-[15px] mb-1">Add players</h3>
            <p className="text-gray-500 text-[13px]">
              Each person submits their name and a fun fact about themselves.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
              2
            </div>
            <h3 className="font-bold text-[15px] mb-1">Guess who</h3>
            <p className="text-gray-500 text-[13px]">
              A fun fact appears on screen. The team discusses and picks who said it.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
              3
            </div>
            <h3 className="font-bold text-[15px] mb-1">See results</h3>
            <p className="text-gray-500 text-[13px]">
              Find out how well your team really knows each other. Try to beat your score!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )

  const ctaSectionContent = (
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

  // ---------- Room Bar ----------

  const roomBar = isInRoom && gameRoom.roomCode ? (
    <RoomBar
      roomCode={gameRoom.roomCode}
      playerCount={gameRoom.players.length}
      isHost={isHost}
      isConnected={gameRoom.isConnected}
      accentColor="#0891B2"
    />
  ) : undefined

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
          showRoomOptions={true}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          accentFrom="#0891B2"
          accentTo="#14B8A6"
        />
      </GameLayout>
    )
  }

  // ---------- Join Room UI ----------

  if (mode === 'joining' && !isInRoom) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        howToPlay={howToPlayContent}
        ctaSection={ctaSectionContent}
        bgBlobs={bgBlobs}
      >
        <div className="w-full max-w-md mx-auto">
          <GlassCard className="p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 mx-auto mb-4 flex items-center justify-center">
              <Users className="w-7 h-7 text-teal-600" />
            </div>
            <h2 className="text-lg font-bold mb-2">Join a Room</h2>
            <p className="text-sm text-gray-500 mb-6">Enter the room code shared by your host.</p>

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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-center text-2xl font-mono font-bold tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 mb-4 placeholder:text-gray-300 placeholder:tracking-[0.3em]"
            />

            {joinError && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-[13px] font-medium mb-3"
              >
                {joinError}
              </motion.p>
            )}

            <button
              onClick={handleJoinSubmit}
              disabled={!joinCode.trim() || gameRoom.isLoading}
              className={`
                w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-[15px] transition-all
                ${
                  joinCode.trim() && !gameRoom.isLoading
                    ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 text-white shadow-[0_4px_14px_rgba(20,184,166,0.3)]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {gameRoom.isLoading ? 'Joining...' : 'Join Game'}
            </button>

            <button
              onClick={() => setMode('local')}
              className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Back
            </button>
          </GlassCard>
        </div>
      </GameLayout>
    )
  }

  // ---------- Creating room - show loading ----------

  if (mode === 'creating' && !isInRoom) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        howToPlay={howToPlayContent}
        ctaSection={ctaSectionContent}
        bgBlobs={bgBlobs}
      >
        <div className="w-full max-w-md mx-auto">
          <GlassCard className="p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-gray-600 font-medium">Creating room...</p>
          </GlassCard>
        </div>
      </GameLayout>
    )
  }

  // ---------- Multiplayer: Host Mode ----------

  if (isInRoom && isHost) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        howToPlay={howToPlayContent}
        ctaSection={ctaSectionContent}
        bgBlobs={bgBlobs}
        roomBar={roomBar}
      >
        <HostMode gameRoom={gameRoom} />
      </GameLayout>
    )
  }

  // ---------- Multiplayer: Player Mode ----------

  if (isInRoom && !isHost) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        howToPlay={howToPlayContent}
        ctaSection={ctaSectionContent}
        bgBlobs={bgBlobs}
        roomBar={roomBar}
      >
        <PlayerMode gameRoom={gameRoom} />
      </GameLayout>
    )
  }

  // ---------- Local Mode ----------

  const localMode = LocalMode({ playerName })

  return (
    <GameLayout
      heroContent={heroContent}
      showResults={localMode.showResults}
      results={localMode.resultsPanel}
      howToPlay={howToPlayContent}
      ctaSection={ctaSectionContent}
      bgBlobs={bgBlobs}
    >
      {localMode.gameArea}
    </GameLayout>
  )
}
