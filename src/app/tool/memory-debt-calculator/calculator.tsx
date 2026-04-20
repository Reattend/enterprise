'use client'

import React, { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Share2, Check, RotateCcw, Brain } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

// ── Shared Styles ──────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] ${className}`}>
      {children}
    </div>
  )
}

// --------------- Data ---------------

const questions = [
  { id: 1, text: 'After a meeting, I struggle to recall the key decisions that were made.', category: 0 },
  { id: 2, text: 'Important decisions get revisited because nobody remembers the original rationale.', category: 0 },
  { id: 3, text: 'Meeting notes are incomplete, lost, or never taken.', category: 0 },
  { id: 4, text: 'New team members take weeks to get up to speed because context isn\'t documented.', category: 1 },
  { id: 5, text: 'When someone leaves the team, critical knowledge leaves with them.', category: 1 },
  { id: 6, text: 'I spend significant time searching for information I know exists somewhere.', category: 2 },
  { id: 7, text: 'The same questions get asked repeatedly because answers aren\'t easily findable.', category: 2 },
  { id: 8, text: 'Different teams unknowingly work on overlapping problems.', category: 3 },
  { id: 9, text: 'I frequently discover relevant past work only after completing my own.', category: 3 },
  { id: 10, text: 'Important context lives in private messages and individual notes, not shared spaces.', category: 3 },
]

const categories = [
  { name: 'Meeting & Decision Recall', questionCount: 3 },
  { name: 'Context & Onboarding', questionCount: 2 },
  { name: 'Search & Retrieval', questionCount: 2 },
  { name: 'Collaboration Gaps', questionCount: 3 },
]

const scaleLabels = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always']

const scoreBands = [
  { max: 20, label: 'Low Debt', color: '#22C55E', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { max: 40, label: 'Moderate', color: '#EAB308', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  { max: 60, label: 'Significant', color: '#F97316', bg: 'bg-orange-50', text: 'text-orange-700' },
  { max: 80, label: 'High', color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700' },
  { max: 100, label: 'Critical', color: '#DC2626', bg: 'bg-red-100', text: 'text-red-800' },
]

const diagnoses: Record<string, string> = {
  'Low Debt': 'Your team has strong knowledge management habits. Decisions are well-documented, context is shared effectively, and information is easy to find. Keep building on these foundations.',
  'Moderate': 'Your team has reasonable knowledge practices, but there are areas where information falls through the cracks. Small improvements in documentation and knowledge sharing could make a meaningful difference.',
  'Significant': 'Your team is losing a notable amount of institutional knowledge. Important decisions, context, and information regularly get lost or siloed. This is likely slowing your team down and causing repeated work.',
  'High': 'Knowledge loss is a serious problem for your team. Critical context is regularly lost, decisions get revisited unnecessarily, and team members spend significant time searching for information. This is costing your organization real productivity.',
  'Critical': 'Your team is experiencing severe knowledge debt. Institutional memory is almost entirely dependent on individuals rather than systems. This creates major risks around employee turnover, slows onboarding to a crawl, and leads to constant duplication of effort.',
}

const recommendations: Record<number, string[]> = {
  0: [
    'Establish a consistent meeting notes practice. Even brief summaries of key decisions and action items make a difference.',
    'Create a central decision log where rationale is captured alongside outcomes.',
  ],
  1: [
    'Build onboarding documentation that evolves with your team, not a one-time effort.',
    'Encourage knowledge transfer sessions when team members transition roles or leave.',
  ],
  2: [
    'Consolidate information into fewer, well-organized locations rather than scattering across tools.',
    'Invest in search. If your team can\'t find it, it might as well not exist.',
  ],
  3: [
    'Create regular cross-team visibility into ongoing work and recent discoveries.',
    'Establish a shared knowledge graph or wiki that connects related work across teams.',
  ],
}

// --------------- Helpers ---------------

function getBand(score: number) {
  return scoreBands.find(b => score <= b.max) || scoreBands[scoreBands.length - 1]
}

function calculateResults(answers: number[]) {
  const rawSum = answers.reduce((a, b) => a + b, 0)
  const overall = Math.round(((rawSum - 10) / 40) * 100)

  const catScores = categories.map((cat, i) => {
    const catAnswers = questions.filter(q => q.category === i).map(q => answers[q.id - 1])
    const catSum = catAnswers.reduce((a, b) => a + b, 0)
    const maxRange = cat.questionCount * 4
    return Math.round(((catSum - cat.questionCount) / maxRange) * 100)
  })

  return { overall, catScores }
}

// --------------- Components ---------------

function ScoreGauge({ score, size = 180 }: { score: number; size?: number }) {
  const band = getBand(score)
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(79,70,229,0.1)"
          strokeWidth={10}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={band.color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-[42px] font-bold tracking-tight"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-[13px] text-gray-400 -mt-1">out of 100</span>
      </div>
    </div>
  )
}

function CategoryBar({ name, score, delay }: { name: string; score: number; delay: number }) {
  const band = getBand(score)
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13.5px] font-bold text-[#1a1a2e]">{name}</span>
        <span className="text-[13px] font-bold" style={{ color: band.color }}>{score}</span>
      </div>
      <div className="h-2.5 bg-[#4F46E5]/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: band.color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ delay, duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// --------------- Main ---------------

export function MemoryDebtCalculator() {
  const searchParams = useSearchParams()

  const sharedScore = searchParams.get('s')
  const sharedCats = searchParams.get('c')

  const [phase, setPhase] = useState<'intro' | 'quiz' | 'results'>(
    sharedScore ? 'results' : 'intro'
  )
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<number[]>(new Array(10).fill(0))
  const [results, setResults] = useState<{ overall: number; catScores: number[] } | null>(
    sharedScore && sharedCats
      ? { overall: parseInt(sharedScore), catScores: sharedCats.split(',').map(Number) }
      : null
  )
  const [copied, setCopied] = useState(false)

  const handleAnswer = useCallback((value: number) => {
    setAnswers(prev => {
      const next = [...prev]
      next[currentQ] = value
      return next
    })
  }, [currentQ])

  const handleNext = useCallback(() => {
    if (currentQ < 9) {
      setCurrentQ(prev => prev + 1)
    } else {
      const res = calculateResults(answers)
      setResults(res)
      setPhase('results')
      const params = new URLSearchParams()
      params.set('s', String(res.overall))
      params.set('c', res.catScores.join(','))
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
    }
  }, [currentQ, answers])

  const handleBack = useCallback(() => {
    if (currentQ > 0) setCurrentQ(prev => prev - 1)
  }, [currentQ])

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const input = document.createElement('input')
      input.value = window.location.href
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  const handleRestart = useCallback(() => {
    setPhase('intro')
    setCurrentQ(0)
    setAnswers(new Array(10).fill(0))
    setResults(null)
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const weakestCategories = useMemo(() => {
    if (!results) return []
    const indexed = results.catScores.map((s, i) => ({ score: s, index: i }))
    indexed.sort((a, b) => b.score - a.score)
    return indexed.slice(0, 2).map(c => c.index)
  }, [results])

  const band = results ? getBand(results.overall) : null

  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
      <Navbar />

      {/* Background gradient blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">
        {/* ========= INTRO ========= */}
        {phase === 'intro' && (
          <motion.section
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 pt-20 md:pt-28 pb-20 px-5 text-center"
          >
            <div className="max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
                <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                Free assessment
              </span>
              <h1 className="text-[36px] md:text-[50px] font-bold tracking-[-0.03em] leading-[1.08]">
                Memory Debt <span className="text-[#4F46E5]">Calculator</span>
              </h1>
              <p className="text-gray-500 mt-5 text-[17px] leading-relaxed max-w-lg mx-auto">
                Find out how much knowledge your team is silently losing. Answer 10 quick questions and get your Memory Debt Score with a personalized breakdown.
              </p>
              <button
                onClick={() => setPhase('quiz')}
                className="mt-8 inline-flex items-center gap-2 text-[15px] font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.98] transition-all px-8 py-4 rounded-full shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
              >
                Start Assessment <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[13px] text-gray-400 mt-4">Takes about 2 minutes. No signup required.</p>
            </div>
          </motion.section>
        )}

        {/* ========= QUIZ ========= */}
        {phase === 'quiz' && (
          <motion.section
            key="quiz"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 pt-12 md:pt-16 pb-20 px-5"
          >
            <div className="max-w-[640px] mx-auto">
              {/* Progress */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium text-gray-400">
                    Question {currentQ + 1} of 10
                  </span>
                  <span className="text-[13px] font-medium text-gray-400">
                    {categories[questions[currentQ].category].name}
                  </span>
                </div>
                <div className="h-1.5 bg-[#4F46E5]/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#4F46E5] rounded-full"
                    animate={{ width: `${((currentQ + 1) / 10) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Question */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQ}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                >
                  <h2 className="text-[20px] md:text-[24px] font-bold leading-snug mb-8">
                    {questions[currentQ].text}
                  </h2>

                  {/* Scale */}
                  <div className="flex gap-2 md:gap-3">
                    {scaleLabels.map((label, i) => {
                      const value = i + 1
                      const selected = answers[currentQ] === value
                      return (
                        <button
                          key={value}
                          onClick={() => handleAnswer(value)}
                          className={`flex-1 flex flex-col items-center gap-1.5 py-4 md:py-5 rounded-xl border-2 transition-all text-center ${
                            selected
                              ? 'border-[#4F46E5] bg-[#4F46E5]/5'
                              : 'border-white/80 bg-white/40 hover:border-[#4F46E5]/30'
                          }`}
                        >
                          <span className={`text-[18px] md:text-[20px] font-bold ${selected ? 'text-[#4F46E5]' : 'text-gray-300'}`}>
                            {value}
                          </span>
                          <span className={`text-[10px] md:text-[11px] font-medium leading-tight ${selected ? 'text-[#4F46E5]' : 'text-gray-400'}`}>
                            {label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-10">
                <button
                  onClick={handleBack}
                  disabled={currentQ === 0}
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-gray-500 hover:text-[#1a1a2e] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={answers[currentQ] === 0}
                  className="inline-flex items-center gap-1.5 text-[14px] font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all px-6 py-3 rounded-full shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
                >
                  {currentQ === 9 ? 'See Results' : 'Next'} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* ========= RESULTS ========= */}
        {phase === 'results' && results && band && (
          <motion.section
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 pt-12 md:pt-16 pb-20 px-5"
          >
            <div className="max-w-[800px] mx-auto">
              {/* Score */}
              <div className="text-center mb-12">
                <p className="text-[13px] font-bold uppercase tracking-wider text-gray-400 mb-6">
                  Your Memory Debt Score
                </p>
                <ScoreGauge score={results.overall} />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <span className={`inline-block mt-4 text-[14px] font-bold px-4 py-1.5 rounded-full ${band.bg} ${band.text}`}>
                    {band.label}
                  </span>
                </motion.div>
              </div>

              {/* Diagnosis */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <GlassCard className="p-6 md:p-8 mb-8">
                  <h3 className="text-[16px] font-bold mb-3">What this means</h3>
                  <p className="text-[14.5px] text-gray-600 leading-relaxed">
                    {diagnoses[band.label]}
                  </p>
                </GlassCard>
              </motion.div>

              {/* Category Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <GlassCard className="p-6 md:p-8 mb-8">
                  <h3 className="text-[16px] font-bold mb-5">Category Breakdown</h3>
                  <div className="space-y-5">
                    {categories.map((cat, i) => (
                      <CategoryBar
                        key={cat.name}
                        name={cat.name}
                        score={results.catScores[i]}
                        delay={1.3 + i * 0.15}
                      />
                    ))}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Recommendations */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6 }}
              >
                <GlassCard className="p-6 md:p-8 mb-8">
                  <h3 className="text-[16px] font-bold mb-4">Where to start</h3>
                  <div className="space-y-6">
                    {weakestCategories.map(catIdx => (
                      <div key={catIdx}>
                        <p className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                          {categories[catIdx].name}
                        </p>
                        <ul className="space-y-2">
                          {recommendations[catIdx].map((rec, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-[14px] text-gray-600 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]/40 mt-2 shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 }}
                className="flex flex-col sm:flex-row items-center gap-3 mb-12"
              >
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 text-[13.5px] font-bold bg-white/60 border border-white/80 hover:border-[#4F46E5]/30 px-5 py-3 rounded-full transition-all active:scale-[0.98]"
                >
                  {copied ? <Check className="w-4 h-4 text-[#4F46E5]" /> : <Share2 className="w-4 h-4" />}
                  {copied ? 'Link copied!' : 'Share results'}
                </button>
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center gap-2 text-[13.5px] font-medium text-gray-500 hover:text-[#1a1a2e] px-5 py-3 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Take again
                </button>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2 }}
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#4F46E5]/10 via-[#818CF8]/5 to-[#C7D2FE]/10 blur-xl" />
                  <div className="relative z-10">
                    <GlassCard className="px-8 py-12 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
                        <Brain className="h-7 w-7 text-[#4F46E5]" />
                      </div>
                      <h3 className="text-[22px] md:text-[26px] font-bold text-[#1a1a2e] mb-3">
                        Reduce your memory debt
                      </h3>
                      <p className="text-gray-600 text-[15px] max-w-md mx-auto mb-6 leading-relaxed">
                        Reattend helps teams capture, organize, and recall knowledge automatically so nothing gets lost.
                      </p>
                      <Link
                        href="/register"
                        className="inline-flex items-center gap-2 text-[15px] font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.98] transition-all px-7 py-3.5 rounded-full shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
                      >
                        Try Reattend free <ArrowRight className="w-4 h-4" />
                      </Link>
                    </GlassCard>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}
