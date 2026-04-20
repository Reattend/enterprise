'use client'

import React, { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Copy, Check, Download, Plus, X, Brain } from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

// --------------- Types ---------------

interface DecisionForm {
  title: string
  date: string
  people: string[]
  context: string
  decision: string
  tradeoffs: string
  followUpDate: string
}

const emptyForm: DecisionForm = {
  title: '',
  date: new Date().toISOString().split('T')[0],
  people: [''],
  context: '',
  decision: '',
  tradeoffs: '',
  followUpDate: '',
}

// --------------- Helpers ---------------

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function encodeForm(form: DecisionForm): string {
  const data = {
    t: form.title,
    d: form.date,
    p: form.people.filter(Boolean),
    cx: form.context,
    dc: form.decision,
    tr: form.tradeoffs,
    fd: form.followUpDate,
  }
  return btoa(encodeURIComponent(JSON.stringify(data)))
}

function decodeForm(encoded: string): DecisionForm | null {
  try {
    const data = JSON.parse(decodeURIComponent(atob(encoded)))
    return {
      title: data.t || '',
      date: data.d || '',
      people: data.p?.length ? data.p : [''],
      context: data.cx || '',
      decision: data.dc || '',
      tradeoffs: data.tr || '',
      followUpDate: data.fd || '',
    }
  } catch {
    return null
  }
}

function generateMarkdown(form: DecisionForm): string {
  const people = form.people.filter(Boolean)
  let md = `# Decision Record: ${form.title}\n\n`
  md += `**Date:** ${formatDate(form.date)}\n\n`
  if (people.length > 0) {
    md += `**Decision Makers:** ${people.join(', ')}\n\n`
  }
  md += `---\n\n`
  md += `## Context\n\n${form.context}\n\n`
  md += `## Decision\n\n${form.decision}\n\n`
  if (form.tradeoffs) {
    md += `## Trade-offs & Risks\n\n${form.tradeoffs}\n\n`
  }
  if (form.followUpDate) {
    md += `## Follow-up\n\n**Review by:** ${formatDate(form.followUpDate)}\n\n`
  }
  md += `---\n\n*Recorded on ${formatDate(form.date)}*`
  return md
}

function generatePlainText(form: DecisionForm): string {
  const people = form.people.filter(Boolean)
  const divider = '────────────────────────────────────────'
  let text = `DECISION RECORD: ${form.title.toUpperCase()}\n\n`
  text += `Date: ${formatDate(form.date)}\n`
  if (people.length > 0) {
    text += `Decision Makers: ${people.join(', ')}\n`
  }
  text += `\n${divider}\n\n`
  text += `CONTEXT\n${form.context}\n\n`
  text += `DECISION\n${form.decision}\n`
  if (form.tradeoffs) {
    text += `\nTRADE-OFFS & RISKS\n${form.tradeoffs}\n`
  }
  if (form.followUpDate) {
    text += `\nFOLLOW-UP\nReview by: ${formatDate(form.followUpDate)}\n`
  }
  text += `\n${divider}\nRecorded on ${formatDate(form.date)}`
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

function InputField({ label, value, onChange, placeholder, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-[#1a1a2e] mb-1.5">
        {label}{required && <span className="text-[#4F46E5] ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder, required = false, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean; rows?: number
}) {
  return (
    <div>
      <label className="block text-[13px] font-bold text-[#1a1a2e] mb-1.5">
        {label}{required && <span className="text-[#4F46E5] ml-0.5">*</span>}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${inputCls} resize-none leading-relaxed`}
      />
    </div>
  )
}

// --------------- Main ---------------

export function DecisionLogGenerator() {
  const searchParams = useSearchParams()
  const sharedData = searchParams.get('d')

  const [form, setForm] = useState<DecisionForm>(() => {
    if (sharedData) {
      const decoded = decodeForm(sharedData)
      if (decoded) return decoded
    }
    return { ...emptyForm }
  })
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>(sharedData ? 'preview' : 'edit')
  const [copied, setCopied] = useState<string | null>(null)
  const [personInput, setPersonInput] = useState('')

  const updateField = useCallback(<K extends keyof DecisionForm>(key: K, value: DecisionForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  const addPerson = useCallback(() => {
    if (personInput.trim()) {
      setForm(prev => ({ ...prev, people: [...prev.people.filter(Boolean), personInput.trim()] }))
      setPersonInput('')
    }
  }, [personInput])

  const removePerson = useCallback((index: number) => {
    setForm(prev => ({
      ...prev,
      people: prev.people.filter((_, i) => i !== index),
    }))
  }, [])

  const handlePersonKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addPerson()
    }
  }, [addPerson])

  const isValid = useMemo(() => {
    return form.title.trim() && form.context.trim() && form.decision.trim()
  }, [form.title, form.context, form.decision])

  const handleGenerate = useCallback(() => {
    if (!isValid) return
    setViewMode('preview')
    const encoded = encodeForm(form)
    window.history.replaceState({}, '', `${window.location.pathname}?d=${encoded}`)
  }, [form, isValid])

  const handleEdit = useCallback(() => {
    setViewMode('edit')
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const handleCopyText = useCallback(async () => {
    const text = generatePlainText(form)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied('text')
    setTimeout(() => setCopied(null), 2000)
  }, [form])

  const handleCopyMarkdown = useCallback(async () => {
    const md = generateMarkdown(form)
    try {
      await navigator.clipboard.writeText(md)
    } catch {
      const el = document.createElement('textarea')
      el.value = md
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied('md')
    setTimeout(() => setCopied(null), 2000)
  }, [form])

  const handleShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      const el = document.createElement('input')
      el.value = window.location.href
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied('link')
    setTimeout(() => setCopied(null), 2000)
  }, [])

  const handleDownloadMarkdown = useCallback(() => {
    const md = generateMarkdown(form)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `decision-${form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'record'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [form])

  const people = form.people.filter(Boolean)

  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] relative overflow-hidden">
      {/* Gradient blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />

      <Navbar />

      {/* Header */}
      <section className="relative z-10 pt-12 md:pt-16 pb-8 px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
            Free tool
          </span>
          <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.1]">
            Decision Log Generator
          </h1>
          <p className="text-gray-500 mt-3 text-[16px] max-w-lg mx-auto">
            Turn meeting outcomes into clean, structured decision records.
          </p>
        </motion.div>
      </section>

      <div className="relative z-10 max-w-[1100px] mx-auto px-5 pb-20">
        {viewMode === 'edit' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Form */}
            <div className="space-y-5">
              <InputField
                label="Decision Title"
                value={form.title}
                onChange={v => updateField('title', v)}
                placeholder="e.g., Switch from REST to GraphQL API"
                required
              />

              <InputField
                label="Date"
                value={form.date}
                onChange={v => updateField('date', v)}
                placeholder=""
                type="date"
              />

              {/* People */}
              <div>
                <label className="block text-[13px] font-bold text-[#1a1a2e] mb-1.5">
                  People Involved
                </label>
                {people.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {people.map((person, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[12.5px] font-medium bg-[#4F46E5]/10 text-[#4F46E5] px-2.5 py-1 rounded-lg"
                      >
                        {person}
                        <button onClick={() => removePerson(i)} className="text-[#4F46E5]/50 hover:text-[#4F46E5]">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={personInput}
                    onChange={e => setPersonInput(e.target.value)}
                    onKeyDown={handlePersonKeyDown}
                    placeholder="Add a name and press Enter"
                    className={`flex-1 ${inputCls}`}
                  />
                  <button
                    onClick={addPerson}
                    disabled={!personInput.trim()}
                    className="px-3 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/30 disabled:opacity-30 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <TextArea
                label="Context"
                value={form.context}
                onChange={v => updateField('context', v)}
                placeholder="What prompted this decision? What problem were you solving?"
                required
                rows={4}
              />

              <TextArea
                label="Decision"
                value={form.decision}
                onChange={v => updateField('decision', v)}
                placeholder="What was decided? Be specific and concrete."
                required
                rows={4}
              />

              <TextArea
                label="Trade-offs & Risks"
                value={form.tradeoffs}
                onChange={v => updateField('tradeoffs', v)}
                placeholder="What alternatives were considered? What are the downsides?"
                rows={3}
              />

              <InputField
                label="Follow-up Date"
                value={form.followUpDate}
                onChange={v => updateField('followUpDate', v)}
                placeholder=""
                type="date"
              />

              <button
                onClick={handleGenerate}
                disabled={!isValid}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 text-[15px] font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all px-6 py-4 rounded-full shadow-[0_4px_16px_rgba(79,70,229,0.3)]"
              >
                Generate Decision Log <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Live Preview */}
            <div className="lg:sticky lg:top-[80px] lg:self-start">
              <GlassCard>
                <div className="px-6 py-4 border-b border-white/60">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-gray-400">Live Preview</span>
                </div>
                <div className="p-6 md:p-8">
                  {form.title ? (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-[20px] font-bold text-[#1a1a2e] leading-tight">
                          {form.title}
                        </h3>
                        {form.date && (
                          <p className="text-[13px] text-gray-400 mt-1">{formatDate(form.date)}</p>
                        )}
                      </div>

                      {people.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Decision Makers</p>
                          <p className="text-[14px] text-gray-700">{people.join(', ')}</p>
                        </div>
                      )}

                      {form.context && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Context</p>
                          <p className="text-[14px] text-gray-600 leading-relaxed whitespace-pre-wrap">{form.context}</p>
                        </div>
                      )}

                      {form.decision && (
                        <div className="bg-[#4F46E5]/5 rounded-xl p-4">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Decision</p>
                          <p className="text-[14.5px] text-[#1a1a2e] font-medium leading-relaxed whitespace-pre-wrap">{form.decision}</p>
                        </div>
                      )}

                      {form.tradeoffs && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Trade-offs & Risks</p>
                          <p className="text-[14px] text-gray-600 leading-relaxed whitespace-pre-wrap">{form.tradeoffs}</p>
                        </div>
                      )}

                      {form.followUpDate && (
                        <div className="flex items-center gap-2 text-[13px] text-gray-500 pt-2 border-t border-white/60">
                          <span className="font-medium">Follow-up:</span> {formatDate(form.followUpDate)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-[14px] text-gray-300">Start typing to see your decision log</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          </motion.div>
        ) : (
          /* ========= PREVIEW / GENERATED VIEW ========= */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-[800px] mx-auto"
          >
            {/* Generated Record */}
            <GlassCard className="mb-8 overflow-hidden">
              <div className="px-6 md:px-8 py-4 border-b border-white/60 flex items-center justify-between">
                <span className="text-[12px] font-bold uppercase tracking-wider text-gray-400">Decision Record</span>
                <button
                  onClick={handleEdit}
                  className="text-[12.5px] font-medium text-gray-500 hover:text-[#1a1a2e] transition-colors"
                >
                  Edit
                </button>
              </div>
              <div className="p-6 md:p-10">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-[24px] md:text-[28px] font-bold text-[#1a1a2e] leading-tight">
                      {form.title}
                    </h2>
                    {form.date && (
                      <p className="text-[14px] text-gray-400 mt-1.5">{formatDate(form.date)}</p>
                    )}
                  </div>

                  {people.length > 0 && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Decision Makers</p>
                      <div className="flex flex-wrap gap-2">
                        {people.map((person, i) => (
                          <span key={i} className="text-[13px] font-medium bg-[#4F46E5]/10 text-[#4F46E5] px-3 py-1 rounded-lg">
                            {person}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-white/60 pt-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Context</p>
                    <p className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-wrap">{form.context}</p>
                  </div>

                  <div className="bg-[#4F46E5]/5 rounded-xl p-5 md:p-6">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Decision</p>
                    <p className="text-[16px] text-[#1a1a2e] font-medium leading-relaxed whitespace-pre-wrap">{form.decision}</p>
                  </div>

                  {form.tradeoffs && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Trade-offs & Risks</p>
                      <p className="text-[15px] text-gray-600 leading-relaxed whitespace-pre-wrap">{form.tradeoffs}</p>
                    </div>
                  )}

                  {form.followUpDate && (
                    <div className="border-t border-white/60 pt-4">
                      <p className="text-[13px] text-gray-500">
                        <span className="font-bold">Review by:</span> {formatDate(form.followUpDate)}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-white/60 pt-4">
                    <p className="text-[12px] text-gray-300 italic">
                      Recorded on {formatDate(form.date)}
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Export Actions */}
            <div className="flex flex-wrap items-center gap-3 mb-10">
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
                onClick={handleDownloadMarkdown}
                className="inline-flex items-center gap-2 text-[13.5px] font-bold bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/30 px-5 py-3 rounded-full transition-all active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
              >
                <Download className="w-4 h-4" /> Download .md
              </button>
              <button
                onClick={handleShareLink}
                className="inline-flex items-center gap-2 text-[13.5px] font-bold bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/30 px-5 py-3 rounded-full transition-all active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
              >
                {copied === 'link' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied === 'link' ? 'Link copied!' : 'Share link'}
              </button>
            </div>

            {/* Insight */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassCard className="p-6 md:p-8 mb-8">
                <h3 className="text-[15px] font-bold mb-2">Why decisions get forgotten</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed mb-4">
                  Research shows that within 72 hours, teams lose up to 80% of the context behind a decision.
                  The decision itself might survive in a Slack message or a ticket, but the rationale,
                  the trade-offs, and the people involved quietly disappear. Months later, the same decision gets
                  re-litigated because nobody can explain <em>why</em> it was made.
                </p>
                <p className="text-[14.5px] text-[#1a1a2e] font-medium">
                  Most teams don&apos;t lose alignment. They lose records.
                </p>
              </GlassCard>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <section className="relative z-10">
                <div className="max-w-[1200px] mx-auto relative">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#4F46E5]/10 via-[#818CF8]/5 to-[#C7D2FE]/10 blur-xl" />
                  <div className="relative z-10">
                    <GlassCard className="max-w-[600px] mx-auto p-10 md:p-14 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
                        <Brain className="h-7 w-7 text-[#4F46E5]" />
                      </div>
                      <h3 className="text-[22px] md:text-[26px] font-bold text-[#1a1a2e] mb-3">
                        Save this as a memory
                      </h3>
                      <p className="text-gray-500 text-[15px] max-w-md mx-auto mb-6 leading-relaxed">
                        Reattend turns decisions, meeting notes, and team context into searchable, AI-enriched memories so nothing gets lost.
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
      </div>

      <Footer />
    </div>
  )
}
