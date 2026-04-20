'use client'

import React, { useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Brain, RotateCcw, Sparkles } from 'lucide-react'
import { GameLayout } from '@/components/game/game-layout'
import { GlassCard } from '@/components/game/glass-card'
import { TeamNameInput } from '@/components/game/team-name-input'
import { useLocalGameState } from '@/hooks/use-local-game-state'

// ---------- Question Bank ----------

const categories = [
  {
    name: 'Fun',
    color: '#F97316',
    bg: 'from-orange-500 to-amber-500',
    lightBg: 'bg-orange-50',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    questions: [
      "What's your go-to karaoke song?",
      "If you could have dinner with anyone, dead or alive, who?",
      "What's the most embarrassing thing in your search history?",
      "What's your guilty pleasure TV show?",
      "If you were a pizza topping, what would you be?",
      "What's the weirdest food combo you secretly love?",
      "What's your most-used emoji?",
      "If your life had a theme song, what would it be?",
      "What's the last thing you Googled?",
      "If you could only eat one food for the rest of your life, what?",
      "What's your hidden talent?",
      "What was your childhood dream job?",
    ],
  },
  {
    name: 'Deep',
    color: '#8B5CF6',
    bg: 'from-violet-500 to-purple-600',
    lightBg: 'bg-violet-50',
    textColor: 'text-violet-600',
    borderColor: 'border-violet-200',
    questions: [
      "What's the best advice you've ever received?",
      "What's something you've changed your mind about recently?",
      "What's a skill you wish you'd learned earlier?",
      "If you could solve one world problem, which one?",
      "What's something you're proud of that nobody knows about?",
      "What would you do if you knew you couldn't fail?",
      "What's the biggest risk you've ever taken?",
      "What does success mean to you?",
      "What's a book or movie that changed your perspective?",
      "If you could go back and give your younger self one piece of advice, what would it be?",
    ],
  },
  {
    name: 'Work',
    color: '#3B82F6',
    bg: 'from-blue-500 to-indigo-500',
    lightBg: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    questions: [
      "What's the best project you've ever worked on?",
      "What's one thing you'd change about how our team works?",
      "What's a work skill you want to learn this year?",
      "What's the best meeting you've ever been in?",
      "If you could swap roles with anyone for a day, who?",
      "What's your productivity secret?",
      "What's the most useful feedback you've ever received?",
      "What energizes you most at work?",
      "What's something your team does really well?",
      "If you could automate one thing about your job, what would it be?",
    ],
  },
  {
    name: 'Wild',
    color: '#EC4899',
    bg: 'from-pink-500 to-rose-500',
    lightBg: 'bg-pink-50',
    textColor: 'text-pink-600',
    borderColor: 'border-pink-200',
    questions: [
      "If you were a superhero, what would your power be?",
      "You're stuck on a desert island - you get one app on your phone. Which one?",
      "If you could time travel, past or future?",
      "You have to teach a class on anything. What do you teach?",
      "If aliens landed and you were the first human they met, what would you say?",
      "You can only communicate using one GIF for the rest of the day. Which GIF?",
      "If your life was a movie genre, what would it be?",
      "You wake up as the CEO tomorrow. What's your first decision?",
      "If you could add one rule to the office, what would it be?",
      "You get a billboard anywhere. What does it say?",
    ],
  },
]

// ---------- Helpers ----------

function getRandomQuestion(categoryIndex: number): string {
  const qs = categories[categoryIndex].questions
  return qs[Math.floor(Math.random() * qs.length)]
}

function getCategoryFromAngle(angle: number): number {
  // Normalize to 0-360
  const normalized = ((angle % 360) + 360) % 360
  // The wheel is drawn so category 0 (Fun) starts at 0deg, each segment is 90deg
  // The pointer is at the TOP (270deg in SVG coords / 12 o'clock)
  // After spinning, the "winning" position is what lands at the top
  // Since the wheel rotates clockwise, the top position at angle A
  // points to segment at (360 - A) mod 360 mapped to category index
  const pointerAngle = (360 - normalized) % 360
  if (pointerAngle < 90) return 0 // Fun
  if (pointerAngle < 180) return 1 // Deep
  if (pointerAngle < 270) return 2 // Work
  return 3 // Wild
}

// ---------- SVG Wheel ----------

function WheelSVG() {
  // 4 segments, each 90 degrees
  const size = 400
  const center = size / 2
  const radius = size / 2 - 4

  function describeArc(startAngle: number, endAngle: number): string {
    const startRad = (Math.PI / 180) * startAngle
    const endRad = (Math.PI / 180) * endAngle
    const x1 = center + radius * Math.cos(startRad)
    const y1 = center + radius * Math.sin(startRad)
    const x2 = center + radius * Math.cos(endRad)
    const y2 = center + radius * Math.sin(endRad)
    return `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`
  }

  function labelPosition(startAngle: number, endAngle: number) {
    const midAngle = (startAngle + endAngle) / 2
    const midRad = (Math.PI / 180) * midAngle
    const labelRadius = radius * 0.6
    return {
      x: center + labelRadius * Math.cos(midRad),
      y: center + labelRadius * Math.sin(midRad),
      rotation: midAngle,
    }
  }

  const segments = [
    { start: 0, end: 90, color: categories[0].color, label: categories[0].name },
    { start: 90, end: 180, color: categories[1].color, label: categories[1].name },
    { start: 180, end: 270, color: categories[2].color, label: categories[2].name },
    { start: 270, end: 360, color: categories[3].color, label: categories[3].name },
  ]

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.12))' }}>
      <defs>
        {segments.map((seg, i) => (
          <linearGradient key={`grad-${i}`} id={`seg-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={seg.color} stopOpacity="1" />
            <stop offset="100%" stopColor={seg.color} stopOpacity="0.75" />
          </linearGradient>
        ))}
      </defs>

      {/* Outer ring */}
      <circle cx={center} cy={center} r={radius + 2} fill="none" stroke="white" strokeWidth="4" />

      {/* Segments */}
      {segments.map((seg, i) => (
        <path
          key={i}
          d={describeArc(seg.start, seg.end)}
          fill={`url(#seg-grad-${i})`}
          stroke="white"
          strokeWidth="3"
        />
      ))}

      {/* Labels */}
      {segments.map((seg, i) => {
        const pos = labelPosition(seg.start, seg.end)
        // Flip text for bottom segments so they're readable
        const textAngle = pos.rotation > 90 && pos.rotation < 270
          ? pos.rotation + 180
          : pos.rotation
        return (
          <text
            key={`label-${i}`}
            x={pos.x}
            y={pos.y}
            fill="white"
            fontSize="22"
            fontWeight="800"
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(${textAngle}, ${pos.x}, ${pos.y})`}
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)', letterSpacing: '0.05em' }}
          >
            {seg.label.toUpperCase()}
          </text>
        )
      })}

      {/* Center circle */}
      <circle cx={center} cy={center} r="36" fill="white" stroke="#e5e7eb" strokeWidth="2" />
      <circle cx={center} cy={center} r="28" fill="white" />
      <text x={center} y={center} fill="#6B7280" fontSize="11" fontWeight="700" textAnchor="middle" dominantBaseline="central" style={{ letterSpacing: '0.08em' }}>
        SPIN
      </text>
    </svg>
  )
}

// ---------- Persisted State Shape ----------

interface SpinnerGameState {
  playerName: string
  lastCategory: number | null
  spinCount: number
}

const INITIAL_GAME_STATE: SpinnerGameState = {
  playerName: '',
  lastCategory: null,
  spinCount: 0,
}

// ---------- Main Component ----------

export function IcebreakerSpinner() {
  const [gameState, setGameState] = useLocalGameState<SpinnerGameState>(
    'reattend-icebreaker-spinner',
    INITIAL_GAME_STATE,
  )

  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<{ category: number; question: string } | null>(null)
  const [showResult, setShowResult] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)

  const hasName = !!gameState.playerName

  // ---------- Callbacks ----------

  const handleNameContinue = useCallback((name: string) => {
    setGameState((prev) => ({ ...prev, playerName: name }))
  }, [setGameState])

  const spin = useCallback(() => {
    if (spinning) return

    setShowResult(false)
    setResult(null)
    setSpinning(true)

    // Spin between 5 and 8 full rotations + a random offset
    const extraRotation = 1800 + Math.random() * 1080 // 5-8 full spins
    const randomOffset = Math.random() * 360
    const newRotation = rotation + extraRotation + randomOffset

    setRotation(newRotation)

    // After the spin animation finishes (3.5s), show the result
    setTimeout(() => {
      const categoryIndex = getCategoryFromAngle(newRotation)
      const question = getRandomQuestion(categoryIndex)
      setResult({ category: categoryIndex, question })
      setShowResult(true)
      setSpinning(false)
      setGameState((prev) => ({
        ...prev,
        lastCategory: categoryIndex,
        spinCount: prev.spinCount + 1,
      }))
    }, 3600)
  }, [spinning, rotation, setGameState])

  const activeCategory = result ? categories[result.category] : null

  // ---------- Background blobs ----------

  const bgBlobs = (
    <>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-orange-400/10 via-pink-400/8 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-60 -left-40 w-[500px] h-[500px] rounded-full bg-amber-400/8 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-40 w-[500px] h-[500px] rounded-full bg-violet-400/8 blur-3xl pointer-events-none" />
    </>
  )

  // ---------- Hero ----------

  const heroContent = (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-300/40 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-orange-600 mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        Free team game
      </span>
      <h1 className="text-[36px] md:text-[52px] font-bold tracking-[-0.03em] leading-[1.1]">
        Icebreaker{' '}
        <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">
          Spinner
        </span>
      </h1>
      <p className="text-gray-500 mt-4 text-[16px] md:text-[18px] max-w-xl mx-auto">
        Spin the wheel, answer the question. Four categories from fun to deep.
        Perfect for TGIF, team meetings, and breaking the ice.
      </p>
    </motion.div>
  )

  // ---------- How to Play ----------

  const howToPlay = (
    <div className="max-w-3xl mx-auto">
      <GlassCard className="p-8 md:p-10">
        <h2 className="text-[22px] font-bold mb-6 text-center">How to Play</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
              1
            </div>
            <h3 className="font-bold text-[15px] mb-1">Spin the wheel</h3>
            <p className="text-gray-500 text-[13px]">Click the button and watch the wheel pick a category for you.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
              2
            </div>
            <h3 className="font-bold text-[15px] mb-1">Read the question</h3>
            <p className="text-gray-500 text-[13px]">A random question appears. Read it out loud to the group.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center text-[18px] font-bold mx-auto mb-3">
              3
            </div>
            <h3 className="font-bold text-[15px] mb-1">Answer and pass</h3>
            <p className="text-gray-500 text-[13px]">Answer, laugh, debate - then pass the spin to the next person.</p>
          </div>
        </div>
      </GlassCard>
    </div>
  )

  // ---------- CTA Section ----------

  const ctaSection = (
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

  // ---------- Result panel (right side after spin) ----------

  const resultPanel = (
    <AnimatePresence mode="wait">
      {showResult && result && activeCategory && (
        <motion.div
          key={`${result.category}-${result.question}`}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`
            rounded-3xl border-2 ${activeCategory.borderColor} ${activeCategory.lightBg}
            p-8 md:p-12 text-center shadow-[0_12px_48px_rgba(0,0,0,0.08)]
            h-full flex flex-col items-center justify-center
          `}
        >
          {/* Category badge */}
          <span className={`
            inline-flex items-center gap-2 px-4 py-1.5 rounded-full
            bg-gradient-to-r ${activeCategory.bg} text-white
            text-[13px] font-bold uppercase tracking-wider mb-6
          `}>
            {activeCategory.name}
          </span>

          {/* Question */}
          <p className="text-[24px] sm:text-[30px] md:text-[36px] font-bold leading-[1.3] text-[#1a1a2e]">
            {result.question}
          </p>

          {/* Player hint */}
          <p className="text-gray-400 text-[14px] mt-6">
            {gameState.playerName}, read it out loud and let the team answer!
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // ---------- Spinner game area (children of GameLayout) ----------

  const gameArea = (
    <div className="flex flex-col items-center gap-8">
      {/* Pointer + Wheel */}
      <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] md:w-[400px] md:h-[400px]">
        {/* Pointer triangle */}
        <div className="absolute top-[-18px] left-1/2 -translate-x-1/2 z-20">
          <svg width="36" height="24" viewBox="0 0 36 24">
            <polygon points="18,24 0,0 36,0" fill="#1a1a2e" />
          </svg>
        </div>

        {/* Spinning wheel */}
        <div
          ref={wheelRef}
          className="w-full h-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
              : 'none',
          }}
        >
          <WheelSVG />
        </div>
      </div>

      {/* Spin button */}
      <motion.button
        onClick={spin}
        disabled={spinning}
        className={`
          relative px-10 py-4 rounded-full font-bold text-[18px] text-white
          transition-all active:scale-[0.97]
          ${spinning
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-orange-500 via-pink-500 to-violet-500 hover:shadow-[0_8px_32px_rgba(249,115,22,0.4)] shadow-[0_4px_16px_rgba(249,115,22,0.3)]'
          }
        `}
        whileHover={!spinning ? { scale: 1.04 } : {}}
        whileTap={!spinning ? { scale: 0.97 } : {}}
      >
        {spinning ? (
          <span className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 animate-spin" />
            Spinning...
          </span>
        ) : result ? (
          <span className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Spin Again
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Spin the Wheel
          </span>
        )}
      </motion.button>

      {/* Empty state hint before first spin */}
      {!showResult && !spinning && !result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-gray-400 text-[15px]">
            Hit the button and see where the wheel takes you!
          </p>
          <div className="flex items-center justify-center gap-3 mt-4">
            {categories.map((cat, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1 rounded-full"
                style={{ backgroundColor: cat.color + '18', color: cat.color }}
              >
                {cat.name}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )

  // ---------- Name gate ----------

  if (!hasName) {
    return (
      <GameLayout
        heroContent={heroContent}
        showResults={false}
        howToPlay={howToPlay}
        ctaSection={ctaSection}
        bgBlobs={bgBlobs}
      >
        <div className="flex items-center justify-center py-8">
          <TeamNameInput
            onContinue={handleNameContinue}
            showRoomOptions={false}
            accentColor="orange"
            accentFrom="#F97316"
            accentTo="#F59E0B"
          />
        </div>
      </GameLayout>
    )
  }

  // ---------- Main game ----------

  return (
    <GameLayout
      heroContent={heroContent}
      showResults={showResult && !!result}
      results={resultPanel}
      howToPlay={howToPlay}
      ctaSection={ctaSection}
      bgBlobs={bgBlobs}
    >
      {gameArea}
    </GameLayout>
  )
}
