'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Copy, Check, Download, Mail, ArrowRight,
  Bookmark, Plus, Trash2, Pencil, FileText, Calendar, Brain,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { FAQAccordion } from '@/components/landing/faq'
import { Reveal } from '@/components/landing/reveal'

// ── Types ──────────────────────────────────────────────────

interface TimelineEntry {
  id: string
  startDate: string
  endDate: string
  title: string
  description: string
}

const FAQS = [
  { question: 'Is this timeline maker really free?', answer: 'Yes, 100% free. No hidden fees, no premium tier, no account needed. Create as many timelines as you want.' },
  { question: 'Where is my data stored?', answer: 'Your data stays entirely in your browser. Nothing is uploaded to any server. Export your timeline before closing the page.' },
  { question: 'Can I use this for work projects?', answer: 'Absolutely. This free timeline generator is designed for project timelines, work history, event sequences, and decision logs. Export as Markdown, PDF, JSON, or plain text.' },
  { question: 'How is this different from other timeline tools?', answer: 'Most timeline tools require accounts, store your data on their servers, or push you toward a paid plan. This tool runs entirely in your browser with zero data collection. You create, you export, you own it.' },
]

// ── Helpers ────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10) }

function todayStr() { return new Date().toISOString().split('T')[0] }

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function dateLabel(e: TimelineEntry) {
  if (e.endDate && e.endDate !== e.startDate) {
    return `${fmtDate(e.startDate)} - ${fmtDate(e.endDate)}`
  }
  return fmtDate(e.startDate)
}

function sortedEntries(entries: TimelineEntry[]) {
  return [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate))
}

function dateRange(entries: TimelineEntry[]) {
  if (entries.length === 0) return ''
  const sorted = sortedEntries(entries)
  const first = sorted[0].startDate
  const last = sorted[sorted.length - 1].endDate || sorted[sorted.length - 1].startDate
  return `${fmtDate(first)} - ${fmtDate(last)}`
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Content Generation ─────────────────────────────────────

function toText(entries: TimelineEntry[]) {
  const sorted = sortedEntries(entries)
  const lines = ['Timeline', '═'.repeat(44), '']
  sorted.forEach(e => {
    lines.push(`${dateLabel(e)}`)
    lines.push(`  ${e.title}`)
    if (e.description.trim()) lines.push(`  ${e.description}`)
    lines.push('')
  })
  lines.push('─'.repeat(44))
  lines.push('Created with Reattend Timeline Maker | reattend.com/free-timeline-maker')
  return lines.join('\n')
}

function toMarkdown(entries: TimelineEntry[]) {
  const sorted = sortedEntries(entries)
  const lines = ['# Timeline', '']
  sorted.forEach(e => {
    lines.push(`## ${dateLabel(e)} - ${e.title}`)
    if (e.description.trim()) lines.push('', e.description)
    lines.push('')
  })
  lines.push('---', '*Created with [Reattend Timeline Maker](https://reattend.com/free-timeline-maker)*')
  return lines.join('\n')
}

function toJson(entries: TimelineEntry[]) {
  const sorted = sortedEntries(entries)
  const data = sorted.map(e => ({
    startDate: e.startDate,
    ...(e.endDate && e.endDate !== e.startDate ? { endDate: e.endDate } : {}),
    title: e.title,
    ...(e.description.trim() ? { description: e.description } : {}),
  }))
  return JSON.stringify({ timeline: data, exportedAt: new Date().toISOString() }, null, 2)
}

// ── Reusable ──────────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] ${className}`}>
      {children}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────

export function TimelineMaker() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [timelineTitle, setTimelineTitle] = useState('')
  const [context, setContext] = useState('')
  const [whyMatters, setWhyMatters] = useState('')

  const sorted = sortedEntries(entries)

  const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 text-[14px] text-[#1a1a2e] outline-none transition-all placeholder:text-gray-400 focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'

  // ── Entry Management ─────────────────────────────────────

  const addEntry = () => {
    if (!title.trim() || !startDate) return
    setEntries(prev => [...prev, { id: uid(), startDate, endDate, title: title.trim(), description: description.trim() }])
    setTitle('')
    setDescription('')
    setEndDate('')
  }

  const updateEntry = (id: string, field: keyof Omit<TimelineEntry, 'id'>, value: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    if (editingId === id) setEditingId(null)
  }

  // ── Export ───────────────────────────────────────────────

  const dl = (content: string, name: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const copyTimeline = async () => {
    await navigator.clipboard.writeText(toText(entries))
    setCopied('text')
    setTimeout(() => setCopied(null), 2000)
  }

  const downloadMd = () => dl(toMarkdown(entries), 'timeline.md', 'text/markdown')
  const downloadJson = () => dl(toJson(entries), 'timeline.json', 'application/json')

  const downloadPdf = () => {
    const rows = sortedEntries(entries).map(e => {
      const dl = dateLabel(e)
      return `<div style="display:flex;gap:16px;margin-bottom:20px">
<div style="width:140px;shrink:0;text-align:right;font-size:12px;color:#888;padding-top:2px">${esc(dl)}</div>
<div style="width:2px;background:#e5e7eb;shrink:0;border-radius:1px"></div>
<div style="flex:1"><strong style="font-size:14px">${esc(e.title)}</strong>${e.description.trim() ? `<p style="margin:4px 0 0;font-size:13px;color:#555">${esc(e.description).replace(/\n/g, '<br>')}</p>` : ''}</div></div>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Timeline</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:740px;margin:40px auto;padding:0 24px;color:#1a1a2e;font-size:14px;line-height:1.5}
h1{font-size:22px;margin-bottom:24px}.footer{margin-top:32px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#bbb}</style>
</head><body><h1>Timeline</h1>${rows}<p class="footer">Created with Reattend Timeline Maker | reattend.com/free-timeline-maker</p></body></html>`

    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300) }
  }

  // ── Memory Bridge ────────────────────────────────────────

  const saveToReattend = async () => {
    const keyEvents = sorted.map(e => `${dateLabel(e)}: ${e.title}`).join('\n')
    const text = [
      'Timeline memory',
      '',
      timelineTitle.trim() ? `Title: ${timelineTitle}` : '',
      entries.length > 0 ? `Date range: ${dateRange(entries)}` : '',
      `Key events:\n${keyEvents}`,
      context.trim() ? `Context: ${context}` : '',
      whyMatters.trim() ? `Why this matters: ${whyMatters}` : '',
    ].filter(Boolean).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied('bridge')
    setTimeout(() => setCopied(null), 3000)
    window.open('/register', '_blank')
  }

  const emailTimeline = () => {
    const subject = encodeURIComponent(`Timeline${timelineTitle.trim() ? ` - ${timelineTitle}` : ''}`)
    const body = encodeURIComponent(toText(entries) + '\n\nSave this to Reattend for long-term recall:\nhttps://reattend.com/register')
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const copyRecall = async () => {
    const text = [
      timelineTitle.trim() ? `Timeline: ${timelineTitle}` : 'Timeline',
      entries.length > 0 ? `Range: ${dateRange(entries)}` : '',
      `${entries.length} events`,
      context.trim() ? `Context: ${context}` : '',
    ].filter(Boolean).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied('recall')
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-16 md:pt-24 pb-10 md:pb-14 px-5 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-[1200px] mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-5">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5]">
              <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
              Free tool
            </span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-[36px] sm:text-[46px] md:text-[56px] font-bold tracking-[-0.03em] leading-[1.1]">
            Free Timeline <span className="text-[#4F46E5]">Maker</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.2 }} className="text-gray-500 mt-4 text-[17px] md:text-[19px] max-w-lg mx-auto">
            Create a timeline instantly. Free forever. No login. Nothing is stored.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {['100% free', 'No account', 'Nothing stored', 'Browser-only'].map(badge => (
              <span
                key={badge}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-white/80 text-[12px] font-medium text-gray-600 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
              >
                <Check className="w-3 h-3 text-[#4F46E5]" />
                {badge}
              </span>
            ))}
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-[12px] text-gray-400 mt-4">
            Runs entirely in your browser. Your data never leaves your device.
          </motion.p>
        </div>
      </section>

      {/* Tool */}
      <section className="px-5 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="max-w-[720px] mx-auto"
        >

          {/* ── Add Entry Form ──────────────────────────── */}
          <GlassCard className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#4F46E5]" />
              </div>
              <h2 className="text-[15px] font-bold text-[#1a1a2e]">Add Event</h2>
            </div>

            <div className="space-y-4">
              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">
                    End date <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    min={startDate}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[12px] font-medium text-gray-500 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && title.trim()) addEntry() }}
                  placeholder="e.g. Project kickoff, Design review, Sprint 3..."
                  className={inputCls}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[12px] font-medium text-gray-500 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Additional details or context..."
                  rows={2}
                  className={`${inputCls} resize-none leading-relaxed`}
                />
              </div>
            </div>

            <button
              onClick={addEntry}
              disabled={!title.trim() || !startDate}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-[14px] transition-all active:scale-[0.98] shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
            >
              <Plus className="w-4 h-4" /> Add to Timeline
            </button>
          </GlassCard>

          {/* ── Timeline Visualization ──────────────────── */}
          {sorted.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-bold text-[#1a1a2e]">
                  Timeline <span className="text-gray-400 font-normal">({entries.length} events)</span>
                </h2>
                <span className="text-[12px] text-gray-400">{dateRange(entries)}</span>
              </div>

              <div className="relative mb-6">
                {/* Vertical line */}
                <div className="absolute left-[83px] top-0 bottom-0 w-[2px] bg-[#4F46E5]/10" />

                <div className="space-y-0">
                  {sorted.map((entry) => {
                    const isEditing = editingId === entry.id
                    const isRange = entry.endDate && entry.endDate !== entry.startDate

                    return (
                      <div key={entry.id} className="relative flex group">
                        {/* Date column */}
                        <div className="w-[76px] shrink-0 text-right pr-4 pt-5">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input
                                type="date"
                                value={entry.startDate}
                                onChange={e => updateEntry(entry.id, 'startDate', e.target.value)}
                                className="w-full px-1 py-0.5 rounded border border-white/80 bg-white/70 text-[11px] outline-none focus:border-[#4F46E5]/40"
                              />
                              <input
                                type="date"
                                value={entry.endDate}
                                onChange={e => updateEntry(entry.id, 'endDate', e.target.value)}
                                placeholder="End"
                                className="w-full px-1 py-0.5 rounded border border-white/80 bg-white/70 text-[11px] outline-none focus:border-[#4F46E5]/40"
                              />
                            </div>
                          ) : (
                            <>
                              <span className="text-[12px] font-medium text-gray-500 leading-tight block">
                                {fmtDate(entry.startDate)}
                              </span>
                              {isRange && (
                                <span className="text-[11px] text-gray-400 block mt-0.5">
                                  to {fmtDate(entry.endDate)}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Dot */}
                        <div className="relative shrink-0 flex items-start pt-5" style={{ width: 14 }}>
                          <div className={`w-3 h-3 rounded-full border-2 border-[#F5F5FF] ${isRange ? 'bg-[#4F46E5]' : 'bg-gray-400'}`}
                            style={{ marginLeft: -5, boxShadow: '0 0 0 2px rgba(79,70,229,0.15)' }}
                          />
                          {isRange && (
                            <div className="absolute left-[0.5px] top-[28px] bottom-0 w-[3px] bg-[#4F46E5]/15 rounded-full"
                              style={{ height: 16 }}
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pl-4 pb-6 pt-3">
                          <GlassCard className="p-4">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={entry.title}
                                  onChange={e => updateEntry(entry.id, 'title', e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg border border-white/80 bg-white/70 text-[14px] font-semibold outline-none focus:border-[#4F46E5]/40"
                                />
                                <textarea
                                  value={entry.description}
                                  onChange={e => updateEntry(entry.id, 'description', e.target.value)}
                                  placeholder="Description..."
                                  rows={2}
                                  className="w-full px-2 py-1.5 rounded-lg border border-white/80 bg-white/70 text-[13px] outline-none focus:border-[#4F46E5]/40 resize-none"
                                />
                              </div>
                            ) : (
                              <>
                                <h3 className="text-[14px] font-semibold text-[#1a1a2e]">{entry.title}</h3>
                                {entry.description.trim() && (
                                  <p className="text-[13px] text-gray-500 mt-1 leading-relaxed whitespace-pre-wrap">{entry.description}</p>
                                )}
                              </>
                            )}

                            {/* Entry actions */}
                            <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingId(isEditing ? null : entry.id)}
                                className={`p-1 rounded hover:bg-white/80 transition-colors ${isEditing ? 'text-[#4F46E5]' : 'text-gray-400 hover:text-gray-600'}`}
                                title={isEditing ? 'Done' : 'Edit'}
                              >
                                {isEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => deleteEntry(entry.id)}
                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </GlassCard>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ── Export ───────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: copied === 'text' ? 'Copied!' : 'Copy', icon: copied === 'text' ? <Check className="w-3.5 h-3.5 text-[#4F46E5]" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />, action: copyTimeline },
                  { label: 'Markdown', icon: <FileText className="w-3.5 h-3.5 text-gray-500" />, action: downloadMd },
                  { label: 'PDF', icon: <Download className="w-3.5 h-3.5 text-gray-500" />, action: downloadPdf },
                  { label: 'JSON', icon: <Download className="w-3.5 h-3.5 text-gray-500" />, action: downloadJson },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    className="flex items-center justify-center gap-2 py-3 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/20 hover:shadow-[0_4px_12px_rgba(79,70,229,0.06)] text-[13px] font-medium transition-all"
                  >
                    {btn.icon} {btn.label}
                  </button>
                ))}
              </div>

              <p className="text-[12px] text-gray-400 text-center mb-10">
                Nothing is auto-saved. Export your timeline before closing the page.
              </p>

              {/* ── Memory Bridge ────────────────────────── */}
              <GlassCard className="p-8 mb-10 ring-1 ring-[#4F46E5]/10">
                <h2 className="text-[18px] font-bold text-[#1a1a2e] mb-1">Timelines fade. Memory compounds.</h2>
                <p className="text-[13px] text-gray-500 mb-6">Keep this timeline recallable over time.</p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 mb-1">Timeline title</label>
                    <input
                      type="text"
                      value={timelineTitle}
                      onChange={e => setTimelineTitle(e.target.value)}
                      placeholder="e.g. Q1 Product Launch, Team Reorganization..."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 mb-1">Context</label>
                    <input
                      type="text"
                      value={context}
                      onChange={e => setContext(e.target.value)}
                      placeholder="What is this timeline about?"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 mb-1">Why this matters</label>
                    <input
                      type="text"
                      value={whyMatters}
                      onChange={e => setWhyMatters(e.target.value)}
                      placeholder="Why might you need to revisit this?"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={saveToReattend}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-[14px] transition-all active:scale-[0.98] shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
                  >
                    {copied === 'bridge' ? (
                      <><Check className="w-4 h-4" /> Copied, opening Reattend...</>
                    ) : (
                      <><Bookmark className="w-4 h-4" /> Save this timeline to Reattend</>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={emailTimeline}
                      className="flex items-center justify-center gap-2 py-3 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/20 text-[13px] font-medium transition-all"
                    >
                      <Mail className="w-4 h-4 text-gray-500" /> Email to myself
                    </button>
                    <button
                      onClick={copyRecall}
                      className="flex items-center justify-center gap-2 py-3 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/20 text-[13px] font-medium transition-all"
                    >
                      {copied === 'recall' ? (
                        <><Check className="w-4 h-4 text-[#4F46E5]" /> Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4 text-gray-500" /> Copy recall notes</>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400 text-center pt-1">
                    Paste or attach this timeline to keep it recallable over time in Reattend.
                  </p>
                </div>
              </GlassCard>
            </>
          )}

          {/* Empty state */}
          {entries.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-[13px]">
              Your timeline will appear here. Add your first event above.
            </div>
          )}

        </motion.div>
      </section>

      {/* FAQ */}
      <section className="px-5 pb-20 md:pb-24">
        <div className="max-w-[680px] mx-auto">
          <Reveal className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5]">
              <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
              FAQ
            </span>
            <h2 className="text-[32px] md:text-[42px] font-bold tracking-[-0.02em] mt-5">
              Frequently asked <span className="text-[#4F46E5]">questions</span>
            </h2>
          </Reveal>
          <FAQAccordion items={FAQS} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 px-5">
        <div className="max-w-[1200px] mx-auto relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#4F46E5]/10 via-[#818CF8]/5 to-[#C7D2FE]/10 blur-xl" />
          <div className="relative z-10">
            <GlassCard className="max-w-[600px] mx-auto p-10 md:p-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
                <Brain className="h-7 w-7 text-[#4F46E5]" />
              </div>
              <h2 className="text-[28px] md:text-[36px] font-bold tracking-[-0.025em] leading-[1.15]">
                Timelines tell the story.<br />Reattend keeps it.
              </h2>
              <p className="text-gray-500 mt-4 text-[15px] max-w-sm mx-auto">
                Store your project timelines, decisions, and context in one searchable place - so you can always trace back what happened and why.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.97] transition-all px-10 py-4 rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.35)] mt-8"
              >
                Try Reattend free <ArrowRight className="w-4 h-4" />
              </Link>
            </GlassCard>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
