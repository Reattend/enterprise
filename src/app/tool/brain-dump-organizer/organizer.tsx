'use client'

import React, { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Copy, Check, Download, X, Pencil, RotateCcw, CheckSquare, Lightbulb, HelpCircle, Bell, FileText, Gavel, Brain } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

// --------------- Types ---------------

type CategoryKey = 'tasks' | 'decisions' | 'ideas' | 'questions' | 'reminders' | 'notes'

interface CategorizedItem {
  id: string
  text: string
  category: CategoryKey
}

interface CategoryMeta {
  key: CategoryKey
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}

// --------------- Category Definitions ---------------

const categoryMeta: CategoryMeta[] = [
  { key: 'tasks', label: 'Tasks', icon: CheckSquare, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { key: 'decisions', label: 'Decisions', icon: Gavel, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  { key: 'ideas', label: 'Ideas', icon: Lightbulb, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  { key: 'questions', label: 'Questions', icon: HelpCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  { key: 'reminders', label: 'Reminders', icon: Bell, color: 'text-rose-600', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' },
  { key: 'notes', label: 'Notes', icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
]

// --------------- Deterministic Categorizer ---------------

const taskPatterns = [
  /^(need to|have to|must|should|gotta|gonna|got to|todo|to-do|to do)\b/i,
  /^(finish|complete|do|get|make|send|write|fix|update|set up|schedule|book|cancel|submit|prepare|review|check|call|email|text|buy|order|organize|clean|create|build|deploy|push|merge|ship|file|draft|assign|plan|arrange|confirm)\b/i,
  /\b(asap|urgent|deadline|by (monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|tonight|end of|eod|eow|next week))\b/i,
  /^don'?t forget (to )?/i,
  /^make sure (to )?/i,
  /^(follow up|follow-up)\b/i,
]

const decisionPatterns = [
  /\b(decide|decision|choose|pick|go with|settle on|commit to|agreed|we agreed)\b/i,
  /^(should (we|i|they)|do (we|i) go with|let'?s go with|going with|chosen|decided)\b/i,
  /\b(option (a|b|c|1|2|3)|alternative|either.*or|vs\.?|versus)\b/i,
  /\b(approved|rejected|vetoed|greenlit|green-lit|signed off)\b/i,
]

const ideaPatterns = [
  /^(what if|how about|maybe (we )?(could|should|can)|idea:|wouldn'?t it be|imagine if|we could)\b/i,
  /\b(brainstorm|concept|experiment|explore|prototype|try|pitch|propose|suggestion)\b/i,
  /^(could (we|I)|can we try|let'?s try|worth (trying|exploring|considering))\b/i,
  /\b(innovation|creative|novel|new approach|rethink)\b/i,
]

const questionPatterns = [
  /\?$/,
  /^(who|what|when|where|why|how|which|is |are |do |does |did |can |could |would |will |should |has |have )\b/i,
  /^(wonder|wondering|curious|not sure|unsure|unclear)\b/i,
  /\b(figure out|look into|find out|ask about|check (if|whether|on))\b/i,
]

const reminderPatterns = [
  /^(remember|remind|don'?t forget)\b/i,
  /\b(reminder|due (date|by|on)|deadline|expir(es|ing)|renew(al)?|appoint(ment)?|meeting (at|on|with))\b/i,
  /\b(on (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i,
  /\b(at \d{1,2}(:\d{2})?\s*(am|pm)?)\b/i,
  /\b(\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})\b/,
  /\b(next (week|month|quarter)|end of (week|month|quarter|year)|this (friday|monday|week))\b/i,
]

function categorize(text: string): CategoryKey {
  const trimmed = text.trim()

  // Questions first - strong signal from trailing ?
  if (/\?\s*$/.test(trimmed)) return 'questions'

  // Check patterns with scoring - first match wins for tie-breaking
  const scores: Record<CategoryKey, number> = { tasks: 0, decisions: 0, ideas: 0, questions: 0, reminders: 0, notes: 0 }

  for (const p of taskPatterns) if (p.test(trimmed)) scores.tasks++
  for (const p of decisionPatterns) if (p.test(trimmed)) scores.decisions++
  for (const p of ideaPatterns) if (p.test(trimmed)) scores.ideas++
  for (const p of questionPatterns) if (p.test(trimmed)) scores.questions++
  for (const p of reminderPatterns) if (p.test(trimmed)) scores.reminders++

  // Find highest scoring category
  const maxScore = Math.max(scores.tasks, scores.decisions, scores.ideas, scores.questions, scores.reminders)
  if (maxScore === 0) return 'notes'

  // Priority order for tie-breaking: tasks > decisions > questions > reminders > ideas > notes
  if (scores.tasks === maxScore) return 'tasks'
  if (scores.decisions === maxScore) return 'decisions'
  if (scores.questions === maxScore) return 'questions'
  if (scores.reminders === maxScore) return 'reminders'
  if (scores.ideas === maxScore) return 'ideas'
  return 'notes'
}

function parseAndCategorize(rawText: string): CategorizedItem[] {
  // Split by newlines, bullet points, numbered lists
  const lines = rawText
    .split(/\n/)
    .map(line => line.replace(/^[\s]*[-•*▪▸►➤→]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter(line => line.length > 0)

  return lines.map((text, i) => ({
    id: `item-${i}-${Date.now()}`,
    text,
    category: categorize(text),
  }))
}

// --------------- Helpers ---------------

function generateMarkdown(items: CategorizedItem[]): string {
  let md = '# Brain Dump - Organized\n\n'
  for (const cat of categoryMeta) {
    const catItems = items.filter(i => i.category === cat.key)
    if (catItems.length === 0) continue
    md += `## ${cat.label}\n\n`
    for (const item of catItems) {
      md += `- ${item.text}\n`
    }
    md += '\n'
  }
  md += `---\n*Organized on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*`
  return md
}

function generatePlainText(items: CategorizedItem[]): string {
  const divider = '────────────────────────────────────────'
  let text = 'BRAIN DUMP - ORGANIZED\n\n'
  for (const cat of categoryMeta) {
    const catItems = items.filter(i => i.category === cat.key)
    if (catItems.length === 0) continue
    text += `${cat.label.toUpperCase()}\n${divider}\n`
    for (const item of catItems) {
      text += `  • ${item.text}\n`
    }
    text += '\n'
  }
  text += `Organized on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
  return text
}

// --------------- Shared Design ---------------

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] ${className}`}>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 text-[14px] text-[#1a1a2e] outline-none transition-all placeholder:text-gray-400 focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'

// --------------- Components ---------------

function CategorySection({ meta, items, onRemove, onMove, onEdit }: {
  meta: CategoryMeta
  items: CategorizedItem[]
  onRemove: (id: string) => void
  onMove: (id: string, to: CategoryKey) => void
  onEdit: (id: string, text: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const Icon = meta.icon

  if (items.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <GlassCard className="overflow-hidden">
        <div className={`px-5 py-3 ${meta.bgColor} flex items-center gap-2.5 border-b border-white/60`}>
          <Icon className={`w-4 h-4 ${meta.color}`} />
          <span className={`text-[13px] font-bold ${meta.color}`}>{meta.label}</span>
          <span className="text-[12px] text-gray-400 ml-auto">{items.length}</span>
        </div>
        <div className="divide-y divide-white/40">
          {items.map(item => (
            <div key={item.id} className="group px-5 py-3 flex items-start gap-3 hover:bg-white/40 transition-colors">
              {editingId === item.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { onEdit(item.id, editText); setEditingId(null) }
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                    className={`flex-1 ${inputCls}`}
                  />
                  <button
                    onClick={() => { onEdit(item.id, editText); setEditingId(null) }}
                    className="text-[12px] font-bold text-[#4F46E5] px-2"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <>
                  <p className="flex-1 text-[14px] text-gray-700 leading-relaxed">{item.text}</p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setEditingId(item.id); setEditText(item.text) }}
                      className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    {/* Category move dropdown */}
                    <div className="relative group/move">
                      <button
                        className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors text-[10px] font-bold"
                        title="Move to..."
                      >
                        ↗
                      </button>
                      <div className="absolute right-0 top-full mt-1 bg-white/90 backdrop-blur-xl border border-white/80 rounded-xl shadow-lg py-1.5 min-w-[140px] z-10 hidden group-hover/move:block">
                        {categoryMeta.filter(c => c.key !== meta.key).map(c => {
                          const CIcon = c.icon
                          return (
                            <button
                              key={c.key}
                              onClick={() => onMove(item.id, c.key)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] text-gray-600 hover:bg-white/60 transition-colors"
                            >
                              <CIcon className={`w-3 h-3 ${c.color}`} /> {c.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  )
}

// --------------- Main ---------------

export function BrainDumpOrganizer() {
  const [phase, setPhase] = useState<'input' | 'organized'>('input')
  const [rawText, setRawText] = useState('')
  const [items, setItems] = useState<CategorizedItem[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const handleOrganize = useCallback(() => {
    if (!rawText.trim()) return
    const categorized = parseAndCategorize(rawText)
    setItems(categorized)
    setPhase('organized')
  }, [rawText])

  const handleRemove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  const handleMove = useCallback((id: string, to: CategoryKey) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, category: to } : i))
  }, [])

  const handleEdit = useCallback((id: string, text: string) => {
    if (!text.trim()) return handleRemove(id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, text: text.trim() } : i))
  }, [handleRemove])

  const handleRestart = useCallback(() => {
    setPhase('input')
    setRawText('')
    setItems([])
  }, [])

  const handleCopyText = useCallback(async () => {
    const text = generatePlainText(items)
    try { await navigator.clipboard.writeText(text) } catch {
      const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied('text'); setTimeout(() => setCopied(null), 2000)
  }, [items])

  const handleCopyMarkdown = useCallback(async () => {
    const md = generateMarkdown(items)
    try { await navigator.clipboard.writeText(md) } catch {
      const el = document.createElement('textarea'); el.value = md; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied('md'); setTimeout(() => setCopied(null), 2000)
  }, [items])

  const handleDownload = useCallback(() => {
    const md = generateMarkdown(items)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brain-dump-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [items])

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = { tasks: 0, decisions: 0, ideas: 0, questions: 0, reminders: 0, notes: 0 }
    for (const item of items) counts[item.category]++
    return counts
  }, [items])

  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] relative overflow-hidden">
      {/* Gradient blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />

      <Navbar />

      {/* Header */}
      <section className="relative z-10 pt-12 md:pt-16 pb-6 px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
            Free tool
          </span>
          <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.1]">
            Brain Dump Organizer
          </h1>
          <p className="text-gray-500 mt-3 text-[16px] max-w-lg mx-auto">
            Get everything out of your head. We&apos;ll sort it for you.
          </p>
        </motion.div>
      </section>

      <div className="relative z-10 max-w-[800px] mx-auto px-5 pb-20">
        <AnimatePresence mode="wait">
          {/* ========= INPUT PHASE ========= */}
          {phase === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="mt-6">
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={"Dump everything on your mind.\nNo formatting required.\n\nOne thought per line, or just stream of consciousness.\nBullet points, numbered lists, plain text - all fine."}
                  rows={14}
                  className={`${inputCls} !px-6 !py-5 text-[15px] leading-relaxed resize-none`}
                  autoFocus
                />
                <div className="flex items-center justify-between mt-4">
                  <span className="text-[12px] text-gray-300">
                    {rawText.split('\n').filter(l => l.trim()).length} items
                  </span>
                  <button
                    onClick={handleOrganize}
                    disabled={!rawText.trim()}
                    className="inline-flex items-center gap-2 text-[15px] font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all px-7 py-3.5 rounded-full shadow-[0_4px_16px_rgba(79,70,229,0.3)]"
                  >
                    Organize <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========= ORGANIZED PHASE ========= */}
          {phase === 'organized' && (
            <motion.div
              key="organized"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Summary bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap items-center gap-2 mt-6 mb-8"
              >
                {categoryMeta.map(cat => {
                  const count = categoryCounts[cat.key]
                  if (count === 0) return null
                  const Icon = cat.icon
                  return (
                    <span key={cat.key} className={`inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-full ${cat.bgColor} ${cat.color}`}>
                      <Icon className="w-3 h-3" /> {count} {cat.label}
                    </span>
                  )
                })}
                <span className="text-[12px] text-gray-400 ml-auto">
                  {items.length} items organized
                </span>
              </motion.div>

              {/* Category sections */}
              <div className="space-y-5">
                {categoryMeta.map((cat, i) => (
                  <motion.div
                    key={cat.key}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                  >
                    <CategorySection
                      meta={cat}
                      items={items.filter(item => item.category === cat.key)}
                      onRemove={handleRemove}
                      onMove={handleMove}
                      onEdit={handleEdit}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-wrap items-center gap-3 mt-10 mb-10"
              >
                <button
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-2 text-[13.5px] font-bold bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/30 px-5 py-3 rounded-full transition-all active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                >
                  {copied === 'text' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied === 'text' ? 'Copied!' : 'Copy as text'}
                </button>
                <button
                  onClick={handleCopyMarkdown}
                  className="inline-flex items-center gap-2 text-[13.5px] font-bold bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/30 px-5 py-3 rounded-full transition-all active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                >
                  {copied === 'md' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  {copied === 'md' ? 'Copied!' : 'Copy as Markdown'}
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 text-[13.5px] font-bold bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/30 px-5 py-3 rounded-full transition-all active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                >
                  <Download className="w-4 h-4" /> Download .md
                </button>
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center gap-2 text-[13.5px] font-medium text-gray-500 hover:text-[#1a1a2e] px-5 py-3 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Start over
                </button>
              </motion.div>

              {/* Insight */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 }}
              >
                <GlassCard className="p-6 md:p-8 mb-8">
                  <h3 className="text-[15px] font-bold mb-2">Why this matters</h3>
                  <p className="text-[14px] text-gray-500 leading-relaxed mb-4">
                    Cognitive science calls it &ldquo;open loops.&rdquo; Every unprocessed thought occupies working memory,
                    reducing your capacity to focus and think clearly. The average knowledge worker carries 30 to 50 of these
                    at any given time. Writing them down and organizing them isn&apos;t just productive, it&apos;s restorative.
                  </p>
                  <p className="text-[14.5px] text-[#1a1a2e] font-medium">
                    Your brain is for thinking, not storage.
                  </p>
                </GlassCard>
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
              >
                <section className="relative z-10">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#4F46E5]/10 via-[#818CF8]/5 to-[#C7D2FE]/10 blur-xl" />
                    <div className="relative z-10">
                      <GlassCard className="max-w-[600px] mx-auto p-10 md:p-14 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
                          <Brain className="h-7 w-7 text-[#4F46E5]" />
                        </div>
                        <h3 className="text-[22px] md:text-[26px] font-bold text-[#1a1a2e] mb-3">
                          Store this outside your head
                        </h3>
                        <p className="text-gray-500 text-[15px] max-w-md mx-auto mb-6 leading-relaxed">
                          Reattend turns brain dumps, meeting notes, and scattered context into searchable, AI-enriched memories so you can think freely.
                        </p>
                        <Link
                          href="/register"
                          className="inline-flex items-center gap-2 text-[15px] font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.97] transition-all px-7 py-3.5 rounded-full shadow-[0_4px_16px_rgba(79,70,229,0.3)]"
                        >
                          Try Reattend free <ArrowRight className="w-4 h-4" />
                        </Link>
                      </GlassCard>
                    </div>
                  </div>
                </section>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
  )
}
