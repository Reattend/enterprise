'use client'

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  X,
  Shuffle,
  Printer,
  Star,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Grid3X3,
  Brain,
  Trash2,
  Users,
  Crown,
  Trophy,
} from 'lucide-react'
import { GlassCard } from '@/components/game/glass-card'
import { GameLayout } from '@/components/game/game-layout'
import { TeamNameInput } from '@/components/game/team-name-input'
import { RoomLobby } from '@/components/game/room-lobby'
import { PlayerWaiting } from '@/components/game/player-waiting'
import { RoomBar } from '@/components/game/room-bar'
import { useGameRoom, UseGameRoomReturn } from '@/hooks/use-game-room'
import { useLocalGameState } from '@/hooks/use-local-game-state'

// ---------------------------------------------------------------------------
// Constants & defaults
// ---------------------------------------------------------------------------

const DEFAULT_ITEMS = [
  'Has been to more than 5 countries',
  'Speaks more than 2 languages',
  'Has a pet',
  'Plays a musical instrument',
  'Was born in a different city',
  'Has run a marathon',
  'Can cook a full meal',
  'Has met someone famous',
  'Owns more than 50 books',
  'Has worked here over 2 years',
  'Can solve a Rubik\'s cube',
  'Has a hidden talent',
  'Wakes up before 6am',
  'Is a night owl',
  'Has a tattoo',
  'Has been skydiving',
  'Plays video games',
  'Watches anime',
  'Can do a handstand',
  'Has a side project',
  'Was a team captain in school',
  'Has visited all continents',
  'Can whistle a tune',
  'Drinks more than 3 coffees a day',
  'Has a plant at their desk',
  'Has binge-watched a show in one sitting',
  'Is a morning person',
  'Can name all team members',
  'Has a creative hobby',
  'Has changed careers',
  'Has won a contest or competition',
  'Can do a cartwheel',
  'Has tried a food they hated',
  'Has a twin or looks like someone famous',
  'Knows how to juggle',
]

const PASTEL_COLORS = [
  'bg-pink-50',
  'bg-purple-50',
  'bg-indigo-50',
  'bg-blue-50',
  'bg-cyan-50',
  'bg-teal-50',
  'bg-emerald-50',
  'bg-lime-50',
  'bg-amber-50',
  'bg-orange-50',
  'bg-rose-50',
  'bg-violet-50',
  'bg-sky-50',
  'bg-fuchsia-50',
  'bg-yellow-50',
  'bg-green-50',
  'bg-red-50',
  'bg-slate-50',
  'bg-stone-50',
  'bg-zinc-50',
  'bg-pink-100',
  'bg-purple-100',
  'bg-blue-100',
  'bg-amber-100',
  'bg-rose-100',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Seeded PRNG — mulberry32 */
function seededRandom(seed: number): () => number {
  let t = seed
  return () => {
    t = (t + 0x6d2b79f5) | 0
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

/** Simple string-to-number hash */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    hash = ((hash << 5) - hash + c) | 0
  }
  return Math.abs(hash)
}

function generateCard(items: string[]): string[] {
  const shuffled = shuffle(items)
  const selected = shuffled.slice(0, 24)
  // Insert FREE space in the center (index 12)
  selected.splice(12, 0, 'FREE')
  return selected
}

/** Deterministic card from a player id + item list */
function generateSeededCard(items: string[], playerId: string): string[] {
  const rng = seededRandom(hashString(playerId))
  const indices = items.map((_, i) => i)
  // Fisher-Yates with seeded RNG
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  const selected = indices.slice(0, 24).map((i) => items[i])
  selected.splice(12, 0, 'FREE')
  return selected
}

// Check all bingo win conditions
function checkBingo(marked: Set<number>): number[][] {
  const winLines: number[][] = []

  // Rows
  for (let r = 0; r < 5; r++) {
    const row = [r * 5, r * 5 + 1, r * 5 + 2, r * 5 + 3, r * 5 + 4]
    if (row.every((i) => marked.has(i))) winLines.push(row)
  }
  // Columns
  for (let c = 0; c < 5; c++) {
    const col = [c, c + 5, c + 10, c + 15, c + 20]
    if (col.every((i) => marked.has(i))) winLines.push(col)
  }
  // Diagonals
  const diag1 = [0, 6, 12, 18, 24]
  const diag2 = [4, 8, 12, 16, 20]
  if (diag1.every((i) => marked.has(i))) winLines.push(diag1)
  if (diag2.every((i) => marked.has(i))) winLines.push(diag2)

  return winLines
}

// ---------------------------------------------------------------------------
// Confetti
// ---------------------------------------------------------------------------

interface Particle {
  id: number
  x: number
  y: number
  color: string
  rotation: number
  scale: number
  velocityX: number
  velocityY: number
}

function ConfettiOverlay({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([])
  const animationRef = useRef<number>()
  const colors = ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6']

  useEffect(() => {
    if (!active) {
      setParticles([])
      return
    }

    const newParticles: Particle[] = []
    for (let i = 0; i < 80; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 1,
        velocityX: (Math.random() - 0.5) * 3,
        velocityY: 2 + Math.random() * 4,
      })
    }
    setParticles(newParticles)

    let frame = 0
    const animate = () => {
      frame++
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.velocityX * 0.3,
            y: p.y + p.velocityY * 0.4,
            rotation: p.rotation + (Math.random() - 0.5) * 10,
          }))
          .filter((p) => p.y < 120)
      )
      if (frame < 200) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  if (!active && particles.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            transition: 'none',
          }}
        />
      ))}
    </div>
  )
}

function BingoWinBanner({ playerName }: { playerName?: string }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] pointer-events-none"
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-pink-200 px-10 py-8 text-center">
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Sparkles className="w-12 h-12 text-pink-500 mx-auto mb-3" />
        </motion.div>
        <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
          BINGO!
        </h2>
        <p className="text-gray-500 mt-2 text-sm font-medium">
          {playerName ? `${playerName} got 5 in a row!` : 'You got 5 in a row!'}
        </p>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Persisted local state shape
// ---------------------------------------------------------------------------

interface BingoLocalState {
  playerName: string
  items: string[]
  card: string[]
  marked: number[] // stored as array for JSON serialization
  mode: 'setup' | 'play'
  hasWon: boolean
}

const INITIAL_LOCAL_STATE: BingoLocalState = {
  playerName: '',
  items: [...DEFAULT_ITEMS],
  card: [],
  marked: [12],
  mode: 'setup',
  hasWon: false,
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/** The 5x5 bingo grid. Used in local, host-preview, and player modes. */
function BingoGrid({
  card,
  marked,
  winCells,
  onToggle,
  disabled = false,
}: {
  card: string[]
  marked: Set<number>
  winCells: Set<number>
  onToggle: (index: number) => void
  disabled?: boolean
}) {
  return (
    <div className="print-card bg-white/80 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(236,72,153,0.08)] p-4 md:p-6">
      {/* Header row */}
      <div className="grid grid-cols-5 gap-1 mb-1">
        {['B', 'I', 'N', 'G', 'O'].map((letter) => (
          <div
            key={letter}
            className="text-center py-2 text-xl md:text-2xl font-extrabold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent"
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Bingo grid */}
      <div className="grid grid-cols-5 gap-1">
        {card.map((cell, i) => {
          const isFree = i === 12
          const isMarked = marked.has(i)
          const isWinCell = winCells.has(i)
          const pastelBg = PASTEL_COLORS[i % PASTEL_COLORS.length]

          return (
            <motion.button
              key={`${cell}-${i}`}
              onClick={() => !disabled && onToggle(i)}
              whileTap={!isFree && !disabled ? { scale: 0.95 } : undefined}
              className={`
                bingo-cell relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-1.5 md:p-2 transition-all select-none
                ${disabled && !isFree ? 'cursor-default' : isFree ? 'cursor-default' : 'cursor-pointer'}
                ${
                  isMarked
                    ? isWinCell
                      ? 'bg-gradient-to-br from-pink-400 to-rose-400 border-pink-500 text-white shadow-lg shadow-pink-200'
                      : 'bg-gradient-to-br from-emerald-400 to-green-400 border-emerald-500 text-white shadow-lg shadow-emerald-200'
                    : `${pastelBg} border-white/60 hover:border-pink-300/60 hover:shadow-md`
                }
              `}
            >
              {isFree ? (
                <div className="flex flex-col items-center justify-center gap-0.5">
                  <Star className={`w-5 h-5 md:w-7 md:h-7 ${isMarked ? 'text-white fill-white' : 'text-pink-400 fill-pink-400'}`} />
                  <span className={`text-[9px] md:text-[11px] font-bold uppercase tracking-wider ${isMarked ? 'text-white' : 'text-pink-500'}`}>
                    Free
                  </span>
                </div>
              ) : (
                <>
                  <span
                    className={`text-[9px] md:text-[11px] leading-tight text-center font-medium ${
                      isMarked ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {cell}
                  </span>
                  {isMarked && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1"
                    >
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Instructions */}
      <p className="text-center text-[11px] text-gray-400 mt-4 no-print">
        Click a cell when you find someone who matches. Get 5 in a row, column, or diagonal for BINGO!
      </p>
    </div>
  )
}

/** Bingo results panel (celebration + stats) */
function BingoResults({
  markedCount,
  winLineCount,
  playerName,
}: {
  markedCount: number
  winLineCount: number
  playerName?: string
}) {
  return (
    <GlassCard className="p-8 md:p-10 h-full flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-pink-200">
          <Trophy className="w-10 h-10 text-white" />
        </div>
      </motion.div>

      <h3 className="text-2xl font-extrabold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent mb-2">
        BINGO!
      </h3>
      {playerName && (
        <p className="text-gray-600 font-semibold mb-4">{playerName} wins!</p>
      )}

      <div className="space-y-3 w-full max-w-[200px]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Cells marked</span>
          <span className="font-bold text-gray-800">{markedCount}/24</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">BINGO lines</span>
          <span className="font-bold text-pink-600">{winLineCount}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-400 to-green-400 border border-emerald-500" />
          <span>Marked</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-pink-400 to-rose-400 border border-pink-500" />
          <span>BINGO line</span>
        </div>
      </div>
    </GlassCard>
  )
}

/** Setup panel for editing bingo items */
function SetupPanel({
  items,
  setItems,
  onGenerate,
}: {
  items: string[]
  setItems: (items: string[]) => void
  onGenerate: () => void
}) {
  const [newItem, setNewItem] = useState('')

  const handleAddItem = useCallback(() => {
    const trimmed = newItem.trim()
    if (trimmed && !items.includes(trimmed)) {
      setItems([...items, trimmed])
      setNewItem('')
    }
  }, [newItem, items, setItems])

  const handleRemoveItem = useCallback(
    (index: number) => {
      setItems(items.filter((_, i) => i !== index))
    },
    [items, setItems]
  )

  return (
    <GlassCard className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1a1a2e]">Setup Your Bingo Card</h2>
          <p className="text-sm text-gray-500 mt-1">
            You need at least 24 items. You have{' '}
            <span className={`font-bold ${items.length >= 24 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {items.length}
            </span>{' '}
            items.
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 flex items-center justify-center">
          <Grid3X3 className="w-5 h-5 text-pink-600" />
        </div>
      </div>

      {/* Add new item */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
          placeholder="Add a custom item, e.g. Has traveled solo..."
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200/80 bg-white/80 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400/40 focus:border-pink-300 transition-all"
        />
        <button
          onClick={handleAddItem}
          disabled={!newItem.trim()}
          className="px-4 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold text-sm transition-all active:scale-[0.97] flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Items list */}
      <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto pr-1">
        {items.map((item, i) => (
          <motion.div
            key={`${item}-${i}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            layout
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200/50 text-[12px] text-gray-700 font-medium hover:border-pink-300/80 transition-colors"
          >
            <span className="max-w-[240px] truncate">{item}</span>
            <button
              onClick={() => handleRemoveItem(i)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-rose-500 -mr-1"
              aria-label={`Remove "${item}"`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100">
        <button
          onClick={() => setItems([...DEFAULT_ITEMS])}
          className="px-4 py-2.5 rounded-xl border border-gray-200/80 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        >
          <Shuffle className="w-3.5 h-3.5" />
          Reset defaults
        </button>
        <button
          onClick={() => setItems([])}
          className="px-4 py-2.5 rounded-xl border border-gray-200/80 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear all
        </button>
        <div className="flex-1" />
        <button
          onClick={onGenerate}
          disabled={items.length < 24}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-all active:scale-[0.97] shadow-[0_4px_14px_rgba(236,72,153,0.3)] disabled:shadow-none flex items-center gap-2"
        >
          Generate Cards
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </GlassCard>
  )
}

// ---------------------------------------------------------------------------
// Shared layout pieces
// ---------------------------------------------------------------------------

function useBingoLayoutParts() {
  const bgBlobs = useMemo(
    () => (
      <>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-pink-400/8 via-rose-400/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-rose-300/5 blur-3xl pointer-events-none" />
        <div className="absolute top-80 -right-40 w-[500px] h-[500px] rounded-full bg-pink-400/5 blur-3xl pointer-events-none" />
      </>
    ),
    []
  )

  const heroContent = useMemo(
    () => (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-pink-300/30 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-pink-600 mb-5">
          <Grid3X3 className="w-3.5 h-3.5" />
          Free team game
        </span>
        <h1 className="text-[32px] md:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.1]">
          Team{' '}
          <span className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 bg-clip-text text-transparent">
            Bingo
          </span>{' '}
          Generator
        </h1>
        <p className="text-gray-500 mt-3 text-[15px] md:text-[17px] max-w-lg mx-auto">
          &quot;Find someone who...&quot; bingo cards for TGIF, team meetings, and office bonding.
          Custom or pre-made prompts. Print or play on screen.
        </p>
      </motion.div>
    ),
    []
  )

  const ctaSection = useMemo(
    () => (
      <section className="relative z-10 py-16 md:py-24 px-5 no-print">
        <div className="max-w-[1200px] mx-auto relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-500/10 via-rose-400/5 to-purple-400/10 blur-xl" />
          <div className="relative z-10">
            <GlassCard className="max-w-[600px] mx-auto p-10 md:p-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/10 flex items-center justify-center mx-auto mb-6">
                <Brain className="h-7 w-7 text-pink-600" />
              </div>
              <h2 className="text-[22px] font-bold mb-3 text-[#1a1a2e]">Built by Reattend</h2>
              <p className="text-gray-600 text-[14px] mb-6 max-w-md mx-auto">
                Reattend captures every team decision and makes your knowledge searchable forever.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(236,72,153,0.3)] active:scale-[0.98]"
              >
                Try Reattend free <ArrowRight className="w-4 h-4" />
              </Link>
            </GlassCard>
          </div>
        </div>
      </section>
    ),
    []
  )

  return { bgBlobs, heroContent, ctaSection }
}

// ---------------------------------------------------------------------------
// Print styles (shared across modes)
// ---------------------------------------------------------------------------

function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        nav, footer, .no-print {
          display: none !important;
        }
        body {
          background: white !important;
        }
        .print-card {
          box-shadow: none !important;
          border: 2px solid #e5e7eb !important;
        }
        .bingo-cell {
          border: 1px solid #d1d5db !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `}</style>
  )
}

// ---------------------------------------------------------------------------
// LOCAL MODE
// ---------------------------------------------------------------------------

function LocalMode() {
  const { bgBlobs, heroContent, ctaSection } = useBingoLayoutParts()

  const [gameState, setGameState] = useLocalGameState<BingoLocalState>(
    'reattend-team-bingo',
    INITIAL_LOCAL_STATE,
  )

  const [showBingo, setShowBingo] = useState(false)
  const [winLines, setWinLines] = useState<number[][]>([])

  // Derive marked as a Set from the stored array
  const marked = useMemo(() => new Set(gameState.marked), [gameState.marked])
  const winCellSet = useMemo(() => new Set(winLines.flat()), [winLines])

  // Recompute winLines from persisted state on mount
  useEffect(() => {
    if (gameState.card.length === 25) {
      const wins = checkBingo(marked)
      setWinLines(wins)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasName = !!gameState.playerName

  // -- Handlers --

  const handleNameContinue = useCallback(
    (name: string) => {
      setGameState((prev) => ({ ...prev, playerName: name }))
    },
    [setGameState],
  )

  const handleSetItems = useCallback(
    (items: string[]) => {
      setGameState((prev) => ({ ...prev, items }))
    },
    [setGameState],
  )

  const handleGenerate = useCallback(() => {
    if (gameState.items.length < 24) return
    const newCard = generateCard(gameState.items)
    setGameState((prev) => ({
      ...prev,
      card: newCard,
      marked: [12],
      mode: 'play',
      hasWon: false,
    }))
    setWinLines([])
    setShowBingo(false)
  }, [gameState.items, setGameState])

  const handleNewCard = useCallback(() => {
    const newCard = generateCard(gameState.items)
    setGameState((prev) => ({
      ...prev,
      card: newCard,
      marked: [12],
      hasWon: false,
    }))
    setWinLines([])
    setShowBingo(false)
  }, [gameState.items, setGameState])

  const handleToggleCell = useCallback(
    (index: number) => {
      if (index === 12) return
      setGameState((prev) => {
        const mSet = new Set(prev.marked)
        if (mSet.has(index)) {
          mSet.delete(index)
        } else {
          mSet.add(index)
        }
        const wins = checkBingo(mSet)
        setWinLines(wins)
        if (wins.length > 0 && !prev.hasWon) {
          setShowBingo(true)
          setTimeout(() => setShowBingo(false), 3500)
          return { ...prev, marked: Array.from(mSet), hasWon: true }
        }
        return { ...prev, marked: Array.from(mSet) }
      })
    },
    [setGameState],
  )

  const handleBackToSetup = useCallback(() => {
    setGameState((prev) => ({ ...prev, mode: 'setup', card: [], marked: [12], hasWon: false }))
    setWinLines([])
    setShowBingo(false)
  }, [setGameState])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const hasBingo = winLines.length > 0

  // -- Name gate --
  if (!hasName) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
      >
        <PrintStyles />
        <div className="flex items-center justify-center py-8">
          <TeamNameInput
            onContinue={handleNameContinue}
            showRoomOptions={true}
            accentFrom="#DB2777"
            accentTo="#F43F5E"
          />
        </div>
      </GameLayout>
    )
  }

  // -- Setup mode --
  if (gameState.mode === 'setup') {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
      >
        <PrintStyles />
        <AnimatePresence mode="wait">
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <SetupPanel items={gameState.items} setItems={handleSetItems} onGenerate={handleGenerate} />
          </motion.div>
        </AnimatePresence>
      </GameLayout>
    )
  }

  // -- Play mode --
  const resultsPanel = hasBingo ? (
    <BingoResults
      markedCount={marked.size - 1}
      winLineCount={winLines.length}
      playerName={gameState.playerName}
    />
  ) : undefined

  return (
    <>
      <PrintStyles />
      <ConfettiOverlay active={showBingo} />
      <AnimatePresence>{showBingo && <BingoWinBanner />}</AnimatePresence>

      <GameLayout
        heroContent={heroContent}
        showResults={hasBingo}
        results={resultsPanel}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key="play"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Action bar */}
            <div className="flex items-center justify-between mb-5 no-print">
              <button
                onClick={handleBackToSetup}
                className="px-4 py-2.5 rounded-xl border border-gray-200/80 bg-white/70 backdrop-blur-sm text-sm font-medium text-gray-600 hover:bg-white transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to setup
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleNewCard}
                  className="px-4 py-2.5 rounded-xl border border-pink-200/60 bg-white/70 backdrop-blur-sm text-sm font-semibold text-pink-600 hover:bg-pink-50 transition-colors flex items-center gap-1.5"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  New Card
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 rounded-xl border border-gray-200/80 bg-white/70 backdrop-blur-sm text-sm font-medium text-gray-600 hover:bg-white transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
              </div>
            </div>

            <BingoGrid
              card={gameState.card}
              marked={marked}
              winCells={winCellSet}
              onToggle={handleToggleCell}
            />

            {/* Score info (only when no results panel showing) */}
            {!hasBingo && (
              <div className="flex items-center justify-center gap-4 mt-4 no-print">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-400 to-green-400 border border-emerald-500" />
                  <span>Marked</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-pink-400 to-rose-400 border border-pink-500" />
                  <span>BINGO line</span>
                </div>
                <div className="text-sm text-gray-500">
                  {marked.size - 1}/24 found
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </GameLayout>
    </>
  )
}

// ---------------------------------------------------------------------------
// HOST MODE
// ---------------------------------------------------------------------------

function HostMode({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const { bgBlobs, heroContent, ctaSection } = useBingoLayoutParts()

  const [items, setItems] = useState<string[]>([...DEFAULT_ITEMS])
  const [showBingo, setShowBingo] = useState(false)
  const [bingoWinner, setBingoWinner] = useState<string | null>(null)

  const room = gameRoom.room
  const phase = room?.phase ?? 'lobby'

  // Derive player marks from actions
  const markActions = gameRoom.getActionsOfType('mark_cell')
  const bingoActions = gameRoom.getActionsOfType('bingo')

  // When a new bingo action arrives, celebrate
  const lastBingoRef = useRef<string | null>(null)
  useEffect(() => {
    if (bingoActions.length > 0) {
      const latest = bingoActions[bingoActions.length - 1]
      if (latest.id !== lastBingoRef.current) {
        lastBingoRef.current = latest.id
        const winnerPlayer = gameRoom.players.find((p) => p.playerId === latest.playerId)
        setBingoWinner(winnerPlayer?.name ?? 'A player')
        setShowBingo(true)
        setTimeout(() => setShowBingo(false), 4500)
      }
    }
  }, [bingoActions, gameRoom.players])

  // Build per-player mark counts
  const playerMarkCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const action of markActions) {
      counts[action.playerId] = (counts[action.playerId] ?? 0) + 1
    }
    return counts
  }, [markActions])

  // -- Handlers --

  const handleSetItems = useCallback((newItems: string[]) => {
    setItems(newItems)
  }, [])

  const handleStartGame = useCallback(async () => {
    if (items.length < 24) return
    try {
      await gameRoom.updateRoom({
        phase: 'playing',
        state: { items },
      })
    } catch {
      // error displayed via gameRoom.error
    }
  }, [items, gameRoom])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const roomBar = gameRoom.roomCode ? (
    <RoomBar
      roomCode={gameRoom.roomCode}
      playerCount={gameRoom.players.length}
      isHost={true}
      isConnected={gameRoom.isConnected}
      accentColor="#DB2777"
    />
  ) : null

  // -- Lobby phase --
  if (phase === 'lobby' || !room) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
        roomBar={roomBar}
      >
        <PrintStyles />
        <div className="space-y-6">
          {gameRoom.roomCode && (
            <RoomLobby
              roomCode={gameRoom.roomCode}
              players={gameRoom.players}
              isHost={true}
              onStart={handleStartGame}
              minPlayers={1}
              accentColor="#DB2777"
              gameTitle="Team Bingo"
            />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key="host-setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SetupPanel items={items} setItems={handleSetItems} onGenerate={handleStartGame} />
            </motion.div>
          </AnimatePresence>
        </div>
      </GameLayout>
    )
  }

  // -- Playing phase: master view --
  const roomItems: string[] = room.state?.items ?? items
  const hasBingoWinner = bingoActions.length > 0

  const masterResults = hasBingoWinner ? (
    <BingoResults
      markedCount={0}
      winLineCount={bingoActions.length}
      playerName={bingoWinner ?? undefined}
    />
  ) : undefined

  return (
    <>
      <PrintStyles />
      <ConfettiOverlay active={showBingo} />
      <AnimatePresence>
        {showBingo && <BingoWinBanner playerName={bingoWinner ?? undefined} />}
      </AnimatePresence>

      <GameLayout
        heroContent={heroContent}
        showResults={hasBingoWinner}
        results={masterResults}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
        roomBar={roomBar}
      >
        <GlassCard className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#1a1a2e] flex items-center gap-2">
                <Crown className="w-5 h-5 text-pink-500" />
                Host Dashboard
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {gameRoom.players.length} player{gameRoom.players.length !== 1 ? 's' : ''} connected
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl border border-gray-200/80 bg-white/70 backdrop-blur-sm text-sm font-medium text-gray-600 hover:bg-white transition-colors flex items-center gap-1.5 no-print"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>

          {/* Player status grid */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Players</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {gameRoom.players.map((player) => {
                const pMarks = playerMarkCounts[player.playerId] ?? 0
                const hasBingoed = bingoActions.some((a) => a.playerId === player.playerId)
                return (
                  <div
                    key={player.playerId}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium
                      ${hasBingoed
                        ? 'bg-gradient-to-r from-pink-50 to-rose-50 border-pink-300 text-pink-700'
                        : 'bg-white/60 border-gray-200/80 text-gray-700'
                      }
                    `}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <span className="truncate flex-1">{player.name}</span>
                    <span className={`text-xs font-bold ${hasBingoed ? 'text-pink-500' : 'text-gray-400'}`}>
                      {hasBingoed ? 'BINGO!' : `${pMarks}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Master prompts list */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Bingo Prompts ({roomItems.length})
            </h3>
            <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto pr-1">
              {roomItems.map((item, i) => (
                <span
                  key={`${item}-${i}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200/50 text-[12px] text-gray-700 font-medium"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </GlassCard>
      </GameLayout>
    </>
  )
}

// ---------------------------------------------------------------------------
// PLAYER MODE
// ---------------------------------------------------------------------------

function PlayerMode({ gameRoom }: { gameRoom: UseGameRoomReturn }) {
  const { bgBlobs, heroContent, ctaSection } = useBingoLayoutParts()

  const [showBingo, setShowBingo] = useState(false)
  const [winLines, setWinLines] = useState<number[][]>([])
  const [hasWon, setHasWon] = useState(false)
  const [marked, setMarked] = useState<Set<number>>(new Set([12]))

  const room = gameRoom.room
  const phase = room?.phase ?? 'lobby'
  const roomItems: string[] = room?.state?.items ?? []

  // Generate a deterministic card for this player once items are available
  const card = useMemo(() => {
    if (roomItems.length < 24) return []
    return generateSeededCard(roomItems, gameRoom.playerId)
  }, [roomItems, gameRoom.playerId])

  const winCellSet = useMemo(() => new Set(winLines.flat()), [winLines])

  // -- Handlers --

  const handleToggleCell = useCallback(
    (index: number) => {
      if (index === 12) return
      setMarked((prev) => {
        const next = new Set(prev)
        if (next.has(index)) {
          next.delete(index)
        } else {
          next.add(index)
        }

        // Sync to room
        gameRoom.submitAction('mark_cell', { cellIndex: index, marked: next.has(index) }).catch(() => {})

        // Check for bingo
        const wins = checkBingo(next)
        setWinLines(wins)
        if (wins.length > 0 && !hasWon) {
          setHasWon(true)
          setShowBingo(true)
          setTimeout(() => setShowBingo(false), 3500)
          // Notify host
          gameRoom.submitAction('bingo', { winLines: wins.map((l) => [...l]) }).catch(() => {})
        }

        return next
      })
    },
    [hasWon, gameRoom],
  )

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const roomBar = gameRoom.roomCode ? (
    <RoomBar
      roomCode={gameRoom.roomCode}
      playerCount={gameRoom.players.length}
      isHost={false}
      isConnected={gameRoom.isConnected}
      accentColor="#DB2777"
    />
  ) : null

  // -- Waiting in lobby --
  if (phase === 'lobby' || roomItems.length < 24) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
        roomBar={roomBar}
      >
        <PrintStyles />
        <div className="flex items-center justify-center py-8">
          <PlayerWaiting
            message="The host is setting up the bingo prompts..."
            accentColor="#DB2777"
            roomCode={gameRoom.roomCode ?? undefined}
          />
        </div>
      </GameLayout>
    )
  }

  // -- Playing --
  const hasBingo = winLines.length > 0

  const resultsPanel = hasBingo ? (
    <BingoResults
      markedCount={marked.size - 1}
      winLineCount={winLines.length}
      playerName={gameRoom.playerName ?? undefined}
    />
  ) : undefined

  return (
    <>
      <PrintStyles />
      <ConfettiOverlay active={showBingo} />
      <AnimatePresence>{showBingo && <BingoWinBanner />}</AnimatePresence>

      <GameLayout
        heroContent={heroContent}
        showResults={hasBingo}
        results={resultsPanel}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
        roomBar={roomBar}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key="player-play"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Action bar */}
            <div className="flex items-center justify-between mb-5 no-print">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>{gameRoom.playerName}</span>
              </div>
              <button
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-xl border border-gray-200/80 bg-white/70 backdrop-blur-sm text-sm font-medium text-gray-600 hover:bg-white transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>

            <BingoGrid
              card={card}
              marked={marked}
              winCells={winCellSet}
              onToggle={handleToggleCell}
            />

            {/* Score info */}
            {!hasBingo && (
              <div className="flex items-center justify-center gap-4 mt-4 no-print">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-400 to-green-400 border border-emerald-500" />
                  <span>Marked</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-pink-400 to-rose-400 border border-pink-500" />
                  <span>BINGO line</span>
                </div>
                <div className="text-sm text-gray-500">
                  {marked.size - 1}/24 found
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </GameLayout>
    </>
  )
}

// ---------------------------------------------------------------------------
// JOIN FLOW (for multiplayer — shown before host/player mode when no name)
// ---------------------------------------------------------------------------

function JoinFlow({
  gameRoom,
  onReady,
}: {
  gameRoom: UseGameRoomReturn
  onReady: () => void
}) {
  const { bgBlobs, heroContent, ctaSection } = useBingoLayoutParts()
  const [joinCode, setJoinCode] = useState('')
  const [flowStep, setFlowStep] = useState<'name' | 'choice' | 'join_code'>('name')

  const handleNameContinue = useCallback(
    (name: string) => {
      gameRoom.setPlayerName(name)
      setFlowStep('choice')
    },
    [gameRoom],
  )

  const handleCreateRoom = useCallback(async () => {
    try {
      await gameRoom.createRoom()
      onReady()
    } catch {
      // error in gameRoom.error
    }
  }, [gameRoom, onReady])

  const handleJoinRoom = useCallback(async () => {
    if (!joinCode.trim()) return
    try {
      await gameRoom.joinRoom(joinCode.trim().toUpperCase())
      onReady()
    } catch {
      // error in gameRoom.error
    }
  }, [gameRoom, joinCode, onReady])

  return (
    <GameLayout
      heroContent={heroContent}
      showResults={false}
      ctaSection={ctaSection}
      bgBlobs={bgBlobs}
    >
      <div className="flex items-center justify-center py-8">
        <AnimatePresence mode="wait">
          {flowStep === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TeamNameInput
                onContinue={handleNameContinue}
                showRoomOptions={false}
                accentFrom="#DB2777"
                accentTo="#F43F5E"
              />
            </motion.div>
          )}

          {flowStep === 'choice' && (
            <motion.div
              key="choice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <GlassCard className="p-8 text-center space-y-4">
                <h2 className="text-xl font-bold">Join or Create</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Playing as <span className="font-bold text-pink-600">{gameRoom.playerName}</span>
                </p>

                <button
                  onClick={handleCreateRoom}
                  disabled={gameRoom.isLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-[15px] transition-all active:scale-[0.98] bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-700 hover:to-rose-600 disabled:opacity-50"
                >
                  <Crown className="w-4 h-4" />
                  Create Room (Host)
                </button>

                <button
                  onClick={() => setFlowStep('join_code')}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-pink-300 text-pink-600 font-bold text-[15px] transition-all active:scale-[0.98] hover:bg-pink-50"
                >
                  <Users className="w-4 h-4" />
                  Join Room
                </button>

                {gameRoom.error && (
                  <p className="text-rose-500 text-sm">{gameRoom.error}</p>
                )}
              </GlassCard>
            </motion.div>
          )}

          {flowStep === 'join_code' && (
            <motion.div
              key="join-code"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md"
            >
              <GlassCard className="p-8 text-center space-y-4">
                <h2 className="text-xl font-bold">Enter Room Code</h2>
                <p className="text-sm text-gray-500">
                  Ask the host for the room code
                </p>

                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                  placeholder="ABCD"
                  maxLength={8}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-center text-2xl font-mono font-bold tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                />

                <button
                  onClick={handleJoinRoom}
                  disabled={!joinCode.trim() || gameRoom.isLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-[15px] transition-all active:scale-[0.98] bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-700 hover:to-rose-600 disabled:opacity-50"
                >
                  Join Game <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setFlowStep('choice')}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Back
                </button>

                {gameRoom.error && (
                  <p className="text-rose-500 text-sm">{gameRoom.error}</p>
                )}
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GameLayout>
  )
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT: mode router
// ---------------------------------------------------------------------------

export function TeamBingo() {
  const searchParams = useSearchParams()
  const urlRoomCode = searchParams.get('room')

  const gameRoom = useGameRoom({ gameType: 'team-bingo' })

  const [multiplayerReady, setMultiplayerReady] = useState(false)

  // Determine mode
  // - No room param and not in a room => local
  // - Room param or in a room => multiplayer
  const inRoom = !!(urlRoomCode || gameRoom.roomCode)

  // If we're in a room, wait for the join flow to complete
  // (useGameRoom auto-joins if player has a name and URL has a code)
  const isMultiplayer = inRoom || multiplayerReady

  // LOCAL MODE: no room code at all and user hasn't opted into multiplayer
  if (!isMultiplayer) {
    return <LocalMode />
  }

  // MULTIPLAYER: need name + room
  if (!gameRoom.room && !multiplayerReady) {
    // Show the join/create flow
    return (
      <JoinFlow
        gameRoom={gameRoom}
        onReady={() => setMultiplayerReady(true)}
      />
    )
  }

  // Waiting for room data to load (auto-join in progress)
  if (!gameRoom.room) {
    if (gameRoom.playerName) {
      // Auto-join is happening via the hook
      return (
        <ConnectingScreen roomCode={urlRoomCode ?? undefined} />
      )
    }
    // No name yet — show join flow
    return (
      <JoinFlow
        gameRoom={gameRoom}
        onReady={() => setMultiplayerReady(true)}
      />
    )
  }

  // Multiplayer: determine host vs player
  if (gameRoom.isHost) {
    return <HostMode gameRoom={gameRoom} />
  }

  return <PlayerMode gameRoom={gameRoom} />
}

/** Shown while auto-joining a room (has name + URL room code, waiting for API) */
function ConnectingScreen({ roomCode }: { roomCode?: string }) {
  const { bgBlobs, heroContent, ctaSection } = useBingoLayoutParts()
  return (
    <GameLayout heroContent={heroContent} showResults={false} ctaSection={ctaSection} bgBlobs={bgBlobs}>
      <PrintStyles />
      <div className="flex items-center justify-center py-8">
        <PlayerWaiting
          message="Connecting to room..."
          accentColor="#DB2777"
          roomCode={roomCode}
        />
      </div>
    </GameLayout>
  )
}
