'use client'

import React, { useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Sparkles, ArrowRight, Check, BookOpen, Users, Tag, Link2,
  AlertTriangle, Search, Rocket, RotateCcw, AlertCircle,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { useDemoStore, type TriageResult } from './demo-store'
import {
  demoExampleNote, typeConfig, seededMemories, askSuggestions,
} from './demo-data'

const DemoGraph = dynamic(
  () => import('./components/demo-graph').then(m => ({ default: m.DemoGraph })),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading graph...</div> }
)

// ─── Entity colors ──────────────────────────────────
const entityColors: Record<string, { color: string; bg: string }> = {
  person: { color: 'text-indigo-700', bg: 'bg-indigo-500/10' },
  org: { color: 'text-blue-700', bg: 'bg-blue-500/10' },
  topic: { color: 'text-violet-700', bg: 'bg-violet-500/10' },
  product: { color: 'text-amber-700', bg: 'bg-amber-500/10' },
  project: { color: 'text-emerald-700', bg: 'bg-emerald-500/10' },
  custom: { color: 'text-gray-700', bg: 'bg-gray-500/10' },
}

// ─── Processing steps ───────────────────────────────
const processSteps = [
  { label: 'Reading your note...', icon: BookOpen },
  { label: 'Extracting entities & dates...', icon: Users },
  { label: 'Classifying type & confidence...', icon: Tag },
  { label: 'Identifying patterns...', icon: Link2 },
]

// ─── Bold markdown helper ───────────────────────────
function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-indigo-600 font-semibold">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export function DemoExperience() {
  const {
    phase, setPhase,
    noteText, setNoteText,
    triageResult, setTriageResult,
    processStep, setProcessStep,
    seededCount, incrementSeeded,
    contradictionRevealed, revealContradiction,
    selectedQuestion, setSelectedQuestion,
    answerProgress, setAnswerProgress,
    reset,
  } = useDemoStore()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isAutoFilling = useRef(false)
  const apiDone = useRef(false)
  const [autoFilling, setAutoFilling] = React.useState(false)
  const [error, setError] = React.useState('')

  // ─── Typewriter auto-fill ─────────────────────────
  useEffect(() => {
    if (!autoFilling) return
    isAutoFilling.current = true
    let i = 0
    const interval = setInterval(() => {
      i++
      setNoteText(demoExampleNote.slice(0, i))
      if (i >= demoExampleNote.length) {
        clearInterval(interval)
        setAutoFilling(false)
        isAutoFilling.current = false
      }
    }, 12)
    return () => { clearInterval(interval); isAutoFilling.current = false }
  }, [autoFilling, setNoteText])

  // ─── Processing stepper ───────────────────────────
  useEffect(() => {
    if (phase !== 'processing') return
    if (processStep >= 3) return
    const timer = setTimeout(() => setProcessStep(processStep + 1), 2000)
    return () => clearTimeout(timer)
  }, [phase, processStep, setProcessStep])

  // When API done + step >= 3, transition to enriched
  useEffect(() => {
    if (phase !== 'processing') return
    if (processStep >= 3 && apiDone.current) {
      const timer = setTimeout(() => setPhase('enriched'), 800)
      return () => clearTimeout(timer)
    }
  }, [phase, processStep, setPhase])

  // ─── Seeding interval ─────────────────────────────
  useEffect(() => {
    if (phase !== 'compounding') return
    if (seededCount >= 5) return
    const timer = setTimeout(() => incrementSeeded(), 1800)
    return () => clearTimeout(timer)
  }, [phase, seededCount, incrementSeeded])

  // After all seeded, reveal contradiction
  useEffect(() => {
    if (phase !== 'compounding' || seededCount < 5 || contradictionRevealed) return
    const timer = setTimeout(() => revealContradiction(), 1200)
    return () => clearTimeout(timer)
  }, [phase, seededCount, contradictionRevealed, revealContradiction])

  // ─── Answer typewriter ────────────────────────────
  useEffect(() => {
    if (phase !== 'answering' || selectedQuestion === null) return
    const answer = askSuggestions[selectedQuestion].answer
    if (answerProgress >= answer.length) return
    const timer = setTimeout(() => setAnswerProgress(answerProgress + 1), 8)
    return () => clearTimeout(timer)
  }, [phase, selectedQuestion, answerProgress, setAnswerProgress])

  // ─── Handlers ─────────────────────────────────────
  const handleAutoFill = () => {
    if (autoFilling) return
    setNoteText('')
    setAutoFilling(true)
    textareaRef.current?.focus()
  }

  const handleAnalyze = useCallback(async () => {
    if (!noteText.trim() || noteText.trim().length < 20 || isAutoFilling.current) return

    setPhase('processing')
    setProcessStep(0)
    apiDone.current = false
    setError('')

    try {
      const res = await fetch('/api/demo/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: noteText.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Analysis failed (${res.status})`)
      }

      const data: TriageResult = await res.json()
      setTriageResult(data)
      apiDone.current = true
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
      setPhase('input')
    }
  }, [noteText, setPhase, setProcessStep, setTriageResult])

  const handleAskQuestion = (idx: number) => {
    setSelectedQuestion(idx)
    setAnswerProgress(0)
    setPhase('answering')
  }

  const handleReset = () => {
    reset()
    apiDone.current = false
    setAutoFilling(false)
    setError('')
  }

  const canAnalyze = noteText.trim().length >= 20 && !autoFilling

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F5FF] via-white to-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-5 pt-10 pb-20">
        {/* Hero - changes per phase */}
        <AnimatePresence mode="wait">
          {(phase === 'input' || phase === 'processing') && (
            <motion.div key="hero-input" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 text-xs font-semibold mb-4">
                <Brain className="h-3.5 w-3.5" />
                Interactive Demo
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-3">Paste a note. Watch AI transform it.</h1>
              <p className="text-gray-500 text-base max-w-xl mx-auto">Add any meeting note, decision, or thought. Our AI will extract entities, classify it, and find patterns in seconds.</p>
            </motion.div>
          )}

          {phase === 'enriched' && (
            <motion.div key="hero-enriched" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold mb-4">
                <Check className="h-3.5 w-3.5" />
                AI Analysis Complete
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1a2e] mb-2">Your note, enriched by AI</h1>
              <p className="text-gray-500 text-sm">This is what Reattend does with every note. But the magic happens when memories compound.</p>
            </motion.div>
          )}

          {phase === 'compounding' && (
            <motion.div key="hero-compound" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1a2e] mb-2">Watch memories compound</h1>
              <p className="text-gray-500 text-sm">One note is useful. But as more memories flow in, Reattend finds the connections you&apos;d miss.</p>
            </motion.div>
          )}

          {(phase === 'asking' || phase === 'answering') && (
            <motion.div key="hero-ask" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1a2e] mb-2">Now ask your memories anything</h1>
              <p className="text-gray-500 text-sm">This isn&apos;t search. It&apos;s understanding, with temporal and causal reasoning across all your context.</p>
            </motion.div>
          )}

          {phase === 'finale' && (
            <motion.div key="hero-finale" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1a2e]">Memory compounds with time.</h1>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Phase: Input ═══ */}
        <AnimatePresence mode="wait">
          {phase === 'input' && (
            <motion.div key="input" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-lg overflow-hidden">
                  <div className="p-6">
                    <textarea
                      ref={textareaRef}
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Paste your meeting notes, a decision, a project update, or any text..."
                      rows={5}
                      className="w-full resize-none rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-3 text-[15px] text-[#1a1a2e] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all"
                      disabled={autoFilling}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <button onClick={handleAutoFill} disabled={autoFilling} className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                        <Sparkles className="h-3 w-3" />
                        Try an example
                      </button>
                      <span className="text-xs text-gray-400">{noteText.length > 0 ? `${noteText.length} chars` : 'Min 20 characters'}</span>
                    </div>
                  </div>
                  <div className="px-6 pb-6">
                    <button
                      onClick={handleAnalyze}
                      disabled={!canAnalyze}
                      className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                        canAnalyze
                          ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 shadow-md animate-glow-pulse'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Brain className="h-4 w-4" />
                      Analyze with AI
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-red-600 justify-center">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                <p className="text-center text-[11px] text-gray-400 mt-3">Your text is analyzed in real time and never stored.</p>
              </div>
            </motion.div>
          )}

          {/* ═══ Phase: Processing ═══ */}
          {phase === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-lg overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-[#1a1a2e]">Analyzing your note</h2>
                        <p className="text-xs text-gray-500">Watch how Reattend processes your content</p>
                      </div>
                    </div>

                    <div className="border-l-[3px] border-indigo-500 bg-indigo-50/50 rounded-r-lg px-4 py-2.5 mb-5">
                      <p className="text-sm text-gray-500 italic line-clamp-2">&quot;{noteText}&quot;</p>
                    </div>

                    <div className="space-y-3">
                      {processSteps.map((step, i) => {
                        const isCompleted = processStep > i
                        const isActive = processStep === i
                        const Icon = step.icon
                        return (
                          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              {isCompleted ? (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <Check className="h-3.5 w-3.5 text-white" />
                                </motion.div>
                              ) : isActive ? (
                                <div className="relative">
                                  <div className="h-7 w-7 rounded-full bg-indigo-500 flex items-center justify-center">
                                    <Icon className="h-3.5 w-3.5 text-white" />
                                  </div>
                                  <span className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" style={{ animationDuration: '1.5s' }} />
                                </div>
                              ) : (
                                <div className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center">
                                  <Icon className="h-3.5 w-3.5 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <p className={`text-sm font-medium ${isActive ? 'text-indigo-600' : isCompleted ? 'text-[#1a1a2e]' : 'text-gray-400'}`}>
                              {step.label}
                            </p>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ Phase: Enriched ═══ */}
          {phase === 'enriched' && triageResult && (
            <motion.div key="enriched" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <div className="max-w-2xl mx-auto space-y-4">
                {/* Memory card */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200/80 shadow-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-xl ${typeConfig[triageResult.record_type]?.bg || 'bg-gray-100'} flex items-center justify-center text-xl flex-shrink-0`}>
                      {typeConfig[triageResult.record_type]?.emoji || '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeConfig[triageResult.record_type]?.bg || 'bg-gray-100'} ${typeConfig[triageResult.record_type]?.color || 'text-gray-600'}`}>
                          {typeConfig[triageResult.record_type]?.label || triageResult.record_type}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">{triageResult.title}</h3>
                      <p className="text-sm text-gray-500">{triageResult.summary}</p>
                    </div>
                  </div>

                  {/* Entities */}
                  {triageResult.entities.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-wrap gap-1.5">
                        {triageResult.entities.map((e, i) => {
                          const ec = entityColors[e.kind] || entityColors.custom
                          return (
                            <span key={i} className={`text-xs font-medium px-2 py-0.5 rounded-full ${ec.bg} ${ec.color}`}>
                              {e.name}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {triageResult.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {triageResult.tags.map((tag) => (
                        <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">#{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Confidence */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-500">AI Confidence</span>
                      <span className="text-xs font-bold text-emerald-600">{Math.round(triageResult.confidence * 100)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${triageResult.confidence * 100}%` }} transition={{ duration: 0.8, delay: 0.3 }} className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" />
                    </div>
                  </div>
                </motion.div>

                {/* Next button */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  <button
                    onClick={() => setPhase('compounding')}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:from-indigo-600 hover:to-violet-600 shadow-md animate-glow-pulse transition-all"
                  >
                    Watch it compound
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ═══ Phase: Compounding ═══ */}
          {phase === 'compounding' && (
            <motion.div key="compounding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Memory cards */}
                <div className="space-y-3">
                  {/* User's memory */}
                  {triageResult && (
                    <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{typeConfig[triageResult.record_type]?.emoji || '📝'}</span>
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${typeConfig[triageResult.record_type]?.bg || 'bg-gray-100'} ${typeConfig[triageResult.record_type]?.color || 'text-gray-600'}`}>
                          {typeConfig[triageResult.record_type]?.label || 'Note'}
                        </span>
                        <span className="text-[11px] text-indigo-500 font-medium ml-auto">Your note</span>
                      </div>
                      <h4 className="text-sm font-semibold text-[#1a1a2e]">{triageResult.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{triageResult.summary}</p>
                    </div>
                  )}

                  {/* Seeded memories */}
                  {seededMemories.slice(0, seededCount).map((mem, i) => (
                    <motion.div
                      key={mem.id}
                      initial={{ opacity: 0, y: 12, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{typeConfig[mem.type]?.emoji || '📝'}</span>
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${typeConfig[mem.type]?.bg || 'bg-gray-100'} ${typeConfig[mem.type]?.color || 'text-gray-600'}`}>
                          {typeConfig[mem.type]?.label || 'Note'}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-[#1a1a2e]">{mem.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{mem.summary}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <Link2 className="h-3 w-3 text-indigo-500" />
                        <span className="text-[11px] text-indigo-600 font-medium">{mem.relationLabel}</span>
                      </div>
                    </motion.div>
                  ))}

                  {/* Contradiction alert */}
                  <AnimatePresence>
                    {contradictionRevealed && (
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="bg-red-50 rounded-xl border border-red-200 shadow-sm p-4"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-semibold text-red-700">Conflict detected</span>
                        </div>
                        <p className="text-xs text-red-600 leading-relaxed">
                          March 28 deadline is a hard lock, but Alex hasn&apos;t finished the auth flow and Jordan is already stretched thin. Sprint 14 has a resource conflict.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Right: Graph */}
                <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden h-[420px] lg:h-auto">
                  <DemoGraph
                    visibleCount={seededCount + 1}
                    showContradiction={contradictionRevealed}
                    userTitle={triageResult?.title || 'Your note'}
                    userType={triageResult?.record_type || 'note'}
                  />
                </div>
              </div>

              {/* Next button */}
              <AnimatePresence>
                {contradictionRevealed && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6 max-w-md mx-auto">
                    <button
                      onClick={() => setPhase('asking')}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:from-indigo-600 hover:to-violet-600 shadow-md animate-glow-pulse transition-all"
                    >
                      <Search className="h-4 w-4" />
                      Now ask your memories
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══ Phase: Asking ═══ */}
          {phase === 'asking' && (
            <motion.div key="asking" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                      <Search className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#1a1a2e]">Ask your memories</h2>
                      <p className="text-xs text-gray-500">Pick a question to see how Reattend answers with full context</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {askSuggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleAskQuestion(i)}
                        className="w-full text-left px-4 py-3 rounded-xl border border-gray-200/80 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
                      >
                        <span className="text-sm text-[#1a1a2e] group-hover:text-indigo-600 font-medium">{s.question}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ Phase: Answering ═══ */}
          {phase === 'answering' && selectedQuestion !== null && (
            <motion.div key="answering" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <div className="max-w-2xl mx-auto space-y-4">
                {/* Question */}
                <div className="flex justify-end">
                  <div className="bg-indigo-500 text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
                    <p className="text-sm">{askSuggestions[selectedQuestion].question}</p>
                  </div>
                </div>

                {/* Answer */}
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-bl-md border border-gray-200/80 shadow-sm px-5 py-4 max-w-full">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                        <Brain className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-gray-400">Reattend AI</span>
                    </div>
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {renderBold(askSuggestions[selectedQuestion].answer.slice(0, answerProgress))}
                      {answerProgress < askSuggestions[selectedQuestion].answer.length && (
                        <span className="inline-block w-0.5 h-4 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
                      )}
                    </div>

                    {/* Referenced memories */}
                    {answerProgress >= askSuggestions[selectedQuestion].answer.length && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Sources from your memories</p>
                        <div className="flex flex-wrap gap-1.5">
                          {askSuggestions[selectedQuestion].refs.map((ref) => (
                            <span key={ref} className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 font-medium">{ref}</span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Next button */}
                {answerProgress >= askSuggestions[selectedQuestion].answer.length && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    <button
                      onClick={() => setPhase('finale')}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:from-indigo-600 hover:to-violet-600 shadow-md animate-glow-pulse transition-all"
                    >
                      See the full picture
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ Phase: Finale ═══ */}
          {phase === 'finale' && (
            <motion.div key="finale" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-xl p-8 sm:p-10 text-center text-white">
                  <p className="text-indigo-200 text-sm font-medium mb-4">This was 6 memories in under 2 minutes.</p>

                  {/* Stats */}
                  <div className="flex items-center justify-center gap-6 sm:gap-8 mb-6">
                    {[
                      { n: '6', label: 'memories' },
                      { n: '8', label: 'connections' },
                      { n: '1', label: 'risk detected' },
                      { n: '0', label: 'context lost' },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <p className="text-2xl font-bold">{s.n}</p>
                        <p className="text-[11px] text-indigo-200">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-bold mb-3">
                    You generate hundreds of memories every week.
                  </h2>
                  <p className="text-indigo-100 text-sm mb-8 max-w-md mx-auto">
                    Every meeting, decision, and insight: connected, searchable, never lost. Temporal relationships tracked. Contradictions caught. Context that compounds.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
                    >
                      <Rocket className="h-4 w-4" />
                      Start free, never lose context again
                    </Link>
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Try with your own note
                    </button>
                  </div>

                  <Link href="/import-and-see" className="inline-flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white mt-4 transition-colors">
                    Or analyze a note in detail
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {phase === 'finale' && <Footer />}
    </div>
  )
}
