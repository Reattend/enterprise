'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, ArrowRight, Brain, Users, Tag, Link2, Check,
  Calendar, Lightbulb, FolderOpen, ChevronDown, ChevronUp,
  RotateCcw, Rocket, AlertCircle, BookOpen,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

// ─── Type config (mirrors demo-data) ────────────────
const typeConfig: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  decision: { label: 'Decision', color: 'text-violet-600', bg: 'bg-violet-500/10', emoji: '⚖️' },
  meeting: { label: 'Meeting', color: 'text-blue-600', bg: 'bg-blue-500/10', emoji: '🤝' },
  idea: { label: 'Idea', color: 'text-amber-600', bg: 'bg-amber-500/10', emoji: '💡' },
  insight: { label: 'Insight', color: 'text-emerald-600', bg: 'bg-emerald-500/10', emoji: '🔍' },
  context: { label: 'Context', color: 'text-slate-600', bg: 'bg-slate-500/10', emoji: '📎' },
  tasklike: { label: 'Task', color: 'text-red-600', bg: 'bg-red-500/10', emoji: '✅' },
  note: { label: 'Note', color: 'text-gray-600', bg: 'bg-gray-500/10', emoji: '📝' },
}

const entityColors: Record<string, { color: string; bg: string }> = {
  person: { color: 'text-indigo-700', bg: 'bg-indigo-500/10' },
  org: { color: 'text-blue-700', bg: 'bg-blue-500/10' },
  topic: { color: 'text-violet-700', bg: 'bg-violet-500/10' },
  product: { color: 'text-amber-700', bg: 'bg-amber-500/10' },
  project: { color: 'text-emerald-700', bg: 'bg-emerald-500/10' },
  custom: { color: 'text-gray-700', bg: 'bg-gray-500/10' },
}

// ─── Example notes ──────────────────────────────────
const exampleNotes = [
  `Met with Sarah and Alex from the design team to review the Q2 roadmap. We decided to prioritize the mobile app redesign over the analytics dashboard. Sarah will lead the mobile effort with a 6-week timeline starting March 10. Alex raised concerns about the API migration blocking the dashboard work, so we agreed to revisit after Sprint 14 wraps up. Key risk: the backend team is already stretched thin with the auth system overhaul.`,
  `Had a great brainstorming session about reducing customer churn. Key insight: users who don't set up integrations in the first week are 3x more likely to cancel. Proposed solution: add a guided onboarding wizard that prompts integration setup on day 2. Jessica from support confirmed this matches the top complaint in tickets. Need to validate with product analytics before committing resources.`,
  `Decision: We're switching from REST to GraphQL for the internal dashboard API. Reasons: 1) reduces over-fetching by 60%, 2) frontend team can iterate faster without backend changes, 3) aligns with our microservices migration. Timeline: migration starts April 1, target completion by end of Q2. Risk: learning curve for the backend team. Mitigation: schedule 2 training sessions next week.`,
]

// ─── Processing phases ──────────────────────────────
type ProcessPhase = 'reading' | 'extracting' | 'classifying' | 'patterns' | 'done'

const processSteps: { key: ProcessPhase; label: string; icon: React.ElementType }[] = [
  { key: 'reading', label: 'Reading your note...', icon: BookOpen },
  { key: 'extracting', label: 'Extracting entities & dates...', icon: Users },
  { key: 'classifying', label: 'Classifying type & confidence...', icon: Tag },
  { key: 'patterns', label: 'Identifying patterns...', icon: Link2 },
]

const phaseSequence: ProcessPhase[] = ['reading', 'extracting', 'classifying', 'patterns', 'done']

// ─── Types ──────────────────────────────────────────
interface TriageResult {
  should_store: boolean
  record_type: string
  title: string
  summary: string
  tags: string[]
  entities: { kind: string; name: string }[]
  dates: { date: string; label: string; type: string }[]
  confidence: number
  proposed_projects: { name: string; confidence: number; reason: string }[]
  suggested_links: { query_text: string; reason: string }[]
  why_kept_or_dropped: string
}

type Phase = 'input' | 'processing' | 'results' | 'error'

interface ImporterProps {
  faqItems: { q: string; a: string }[]
}

// ─── FAQ Accordion ──────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-200/60 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="text-[15px] font-medium text-[#1a1a2e]">{q}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-[14px] text-gray-500 pb-4 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────
export function Importer({ faqItems }: ImporterProps) {
  const [phase, setPhase] = useState<Phase>('input')
  const [text, setText] = useState('')
  const [processPhase, setProcessPhase] = useState<ProcessPhase>('reading')
  const [result, setResult] = useState<TriageResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isAutoFilling, setIsAutoFilling] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const apiDone = useRef(false)

  // Typewriter effect
  useEffect(() => {
    if (!isAutoFilling) return
    const target = exampleNotes[Math.floor(Math.random() * exampleNotes.length)]
    let i = 0
    const interval = setInterval(() => {
      i++
      setText(target.slice(0, i))
      if (i >= target.length) {
        clearInterval(interval)
        setIsAutoFilling(false)
      }
    }, 12)
    return () => clearInterval(interval)
  }, [isAutoFilling])

  // Auto-advance processing phases (visual only)
  useEffect(() => {
    if (phase !== 'processing') return
    if (processPhase === 'done') return

    const idx = phaseSequence.indexOf(processPhase)
    if (idx < 0 || idx >= phaseSequence.length - 2) return // stop before 'done' - API controls that

    const timer = setTimeout(() => {
      setProcessPhase(phaseSequence[idx + 1])
    }, 2000)
    return () => clearTimeout(timer)
  }, [phase, processPhase])

  // When API resolves + we reach 'patterns', go to done
  useEffect(() => {
    if (phase !== 'processing') return
    if (processPhase === 'patterns' && apiDone.current) {
      const timer = setTimeout(() => setProcessPhase('done'), 1000)
      return () => clearTimeout(timer)
    }
  }, [phase, processPhase])

  // When processPhase reaches 'done', transition to results
  useEffect(() => {
    if (processPhase === 'done' && phase === 'processing') {
      const timer = setTimeout(() => setPhase('results'), 600)
      return () => clearTimeout(timer)
    }
  }, [processPhase, phase])

  const handleAutoFill = () => {
    if (isAutoFilling) return
    setText('')
    setIsAutoFilling(true)
    textareaRef.current?.focus()
  }

  const handleAnalyze = useCallback(async () => {
    if (!text.trim() || text.trim().length < 20 || isAutoFilling) return

    setPhase('processing')
    setProcessPhase('reading')
    apiDone.current = false
    setResult(null)
    setErrorMsg('')

    try {
      const res = await fetch('/api/demo/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Analysis failed (${res.status})`)
      }

      const data: TriageResult = await res.json()
      setResult(data)
      apiDone.current = true

      // If we've already passed 'patterns', go to done immediately
      if (phaseSequence.indexOf(processPhase) >= phaseSequence.indexOf('patterns')) {
        setProcessPhase('done')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      setPhase('error')
    }
  }, [text, isAutoFilling])

  const handleReset = () => {
    setPhase('input')
    setText('')
    setProcessPhase('reading')
    setResult(null)
    setErrorMsg('')
    apiDone.current = false
  }

  const canAnalyze = text.trim().length >= 20 && !isAutoFilling

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F5FF] via-white to-white">
      <Navbar />

      <main className="max-w-3xl mx-auto px-5 pt-12 pb-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 text-xs font-semibold mb-4">
            <Brain className="h-3.5 w-3.5" />
            Real AI Analysis
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1a1a2e] mb-3">
            Import and See
          </h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Paste any note, meeting summary, or decision. Watch our AI extract entities,
            classify the type, and find patterns in seconds.
          </p>
        </motion.div>

        {/* ═══ Phase: Input ═══ */}
        <AnimatePresence mode="wait">
          {phase === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-lg overflow-hidden">
                <div className="p-6">
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your meeting notes, a decision you made, a project update, or any text you'd normally want to remember..."
                    rows={6}
                    className="w-full resize-none rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-3 text-[15px] text-[#1a1a2e] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/30 transition-all"
                    disabled={isAutoFilling}
                  />

                  <div className="flex items-center justify-between mt-3">
                    <button
                      onClick={handleAutoFill}
                      disabled={isAutoFilling}
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 transition-colors font-medium"
                    >
                      <Sparkles className="h-3 w-3" />
                      Try an example
                    </button>
                    <span className="text-xs text-gray-400">
                      {text.length > 0 ? `${text.length} characters` : 'Min 20 characters'}
                    </span>
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

              <p className="text-center text-[11px] text-gray-400 mt-3">
                Your text is analyzed in real time and never stored. Up to 5 free analyses per hour.
              </p>
            </motion.div>
          )}

          {/* ═══ Phase: Processing ═══ */}
          {phase === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-lg overflow-hidden">
                <div className="px-6 pt-6 pb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[#1a1a2e]">Analyzing your note</h2>
                      <p className="text-xs text-gray-500">Watch how Reattend processes your content</p>
                    </div>
                  </div>
                </div>

                {/* Quoted text */}
                <div className="px-6 mb-4">
                  <div className="border-l-[3px] border-indigo-500 bg-indigo-50/50 rounded-r-lg px-4 py-2.5">
                    <p className="text-sm text-gray-500 italic line-clamp-3">&quot;{text}&quot;</p>
                  </div>
                </div>

                {/* Steps */}
                <div className="px-6 pb-6">
                  <div className="space-y-3">
                    {processSteps.map((step, i) => {
                      const stepIdx = phaseSequence.indexOf(step.key)
                      const currentIdx = phaseSequence.indexOf(processPhase)
                      const isCompleted = currentIdx > stepIdx
                      const isActive = processPhase === step.key
                      const isFuture = currentIdx < stepIdx
                      const Icon = step.icon

                      return (
                        <motion.div
                          key={step.key}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-3"
                        >
                          <div className="relative flex-shrink-0">
                            {isCompleted ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center"
                              >
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

                          <p className={`text-sm font-medium ${
                            isFuture ? 'text-gray-400' : isActive ? 'text-indigo-600' : 'text-[#1a1a2e]'
                          }`}>
                            {isCompleted ? step.label.replace('...', '') : step.label}
                            {isCompleted && ' ✓'}
                          </p>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Done state */}
                  <AnimatePresence>
                    {processPhase === 'done' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200"
                      >
                        <Check className="h-4 w-4 text-emerald-500" />
                        <p className="text-sm font-medium text-emerald-600">Analysis complete!</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══ Phase: Error ═══ */}
          {phase === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              <div className="bg-white rounded-2xl border border-red-200/80 shadow-lg p-6 text-center">
                <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <h2 className="text-lg font-bold text-[#1a1a2e] mb-2">Analysis Failed</h2>
                <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-sm font-medium text-[#1a1a2e] hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ Phase: Results ═══ */}
          {phase === 'results' && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Card 1: Memory Overview */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-lg p-6"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl ${typeConfig[result.record_type]?.bg || 'bg-gray-100'} flex items-center justify-center text-xl flex-shrink-0`}>
                    {typeConfig[result.record_type]?.emoji || '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeConfig[result.record_type]?.bg || 'bg-gray-100'} ${typeConfig[result.record_type]?.color || 'text-gray-600'}`}>
                        {typeConfig[result.record_type]?.label || result.record_type}
                      </span>
                      {result.should_store && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                          Worth keeping
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-[#1a1a2e] mb-1">{result.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{result.summary}</p>
                  </div>
                </div>

                {/* Confidence bar */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-500">AI Confidence</span>
                    <span className="text-xs font-bold text-emerald-600">{Math.round(result.confidence * 100)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.confidence * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Entities */}
              {result.entities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white rounded-2xl border border-gray-200/80 shadow-lg p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="h-4 w-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-[#1a1a2e]">Extracted Entities</h3>
                    <span className="text-xs text-gray-400">{result.entities.length} found</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.entities.map((entity, i) => {
                      const ec = entityColors[entity.kind] || entityColors.custom
                      return (
                        <motion.span
                          key={`${entity.kind}-${entity.name}-${i}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 + i * 0.05 }}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${ec.bg} ${ec.color}`}
                        >
                          <span className="text-[10px] uppercase tracking-wider opacity-60">{entity.kind}</span>
                          {entity.name}
                        </motion.span>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* Card 3: Tags & Dates */}
              {(result.tags.length > 0 || result.dates.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white rounded-2xl border border-gray-200/80 shadow-lg p-6"
                >
                  {/* Tags */}
                  {result.tags.length > 0 && (
                    <div className="mb-4 last:mb-0">
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className="h-4 w-4 text-violet-500" />
                        <h3 className="text-sm font-bold text-[#1a1a2e]">Tags</h3>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.tags.map((tag, i) => (
                          <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  {result.dates.length > 0 && (
                    <div className={result.tags.length > 0 ? 'pt-4 border-t border-gray-100' : ''}>
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-bold text-[#1a1a2e]">Dates & Deadlines</h3>
                      </div>
                      <div className="space-y-2">
                        {result.dates.map((d, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-3 w-3 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-[#1a1a2e]">{d.label}</span>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium flex-shrink-0">
                              {d.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Card 4: AI Insights */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-[#1a1a2e]">AI Insights</h3>
                </div>

                {/* Why kept */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Why this is worth remembering</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{result.why_kept_or_dropped}</p>
                </div>

                {/* Projects */}
                {result.proposed_projects.length > 0 && (
                  <div className="mb-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderOpen className="h-3.5 w-3.5 text-emerald-500" />
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Suggested Projects</p>
                    </div>
                    <div className="space-y-2">
                      {result.proposed_projects.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1a1a2e]">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.reason}</p>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 flex-shrink-0">
                            {Math.round(p.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested connections */}
                {result.suggested_links.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className="h-3.5 w-3.5 text-indigo-500" />
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Would Connect To</p>
                    </div>
                    <div className="space-y-1.5">
                      {result.suggested_links.map((l, i) => (
                        <div key={i} className="text-sm text-gray-600">
                          <span className="font-medium text-indigo-600">&quot;{l.query_text}&quot;</span>
                          <span className="text-gray-400 mx-1.5">|</span>
                          <span>{l.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Card 5: CTA */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg p-6 text-center text-white"
              >
                <h3 className="text-lg font-bold mb-2">
                  This is just one note.
                </h3>
                <p className="text-indigo-100 text-sm mb-6">
                  Imagine hundreds, all connected in a living memory graph. Entities linked,
                  contradictions flagged, patterns surfaced automatically.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors shadow-md"
                  >
                    <Rocket className="h-4 w-4" />
                    Sign up free
                  </Link>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Try another note
                  </button>
                  <Link
                    href="/demo"
                    className="inline-flex items-center gap-2 text-sm text-indigo-200 hover:text-white transition-colors"
                  >
                    See the full demo
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAQ Section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <h2 className="text-2xl font-bold text-[#1a1a2e] text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm px-6">
            {faqItems.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  )
}
