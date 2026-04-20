'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Copy, Check, Download, Mail, ArrowRight,
  Bookmark, Plus, Trash2, Pencil, FileText, BookOpen, Brain,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { FAQAccordion } from '@/components/landing/faq'
import { Reveal } from '@/components/landing/reveal'

// ── Types ──────────────────────────────────────────────────

interface JournalEntry {
  id: string
  date: string
  workedOn: string
  changed: string
  decisions: string
  notes: string
  nextFocus: string
}

const FAQS = [
  { question: 'What is a work journal?', answer: 'A work journal is a daily log of what you worked on, what progressed, and what decisions were made. It helps you track your contributions over time and provides context when you need to recall past work.' },
  { question: 'How do you keep a daily work log?', answer: 'Spend a few minutes at the end of each day recording what you worked on, what changed, any decisions or blockers, and what needs attention next. Consistency matters more than detail.' },
  { question: 'Is this work journal really free?', answer: 'Yes, 100% free. No hidden fees, no premium version, no account required. Use it every day without restrictions.' },
  { question: 'Where is my data stored?', answer: 'Your data stays entirely in your browser tab. Nothing is sent to any server. When you close the page, your entries are gone unless you exported them.' },
]

const EMPTY_DRAFT: Omit<JournalEntry, 'id'> = {
  date: '',
  workedOn: '',
  changed: '',
  decisions: '',
  notes: '',
  nextFocus: '',
}

// ── Helpers ────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function entryToText(e: JournalEntry) {
  const lines = [`Work Journal - ${fmtDate(e.date)}`, '─'.repeat(44), '']
  if (e.workedOn.trim()) lines.push(`What I worked on:\n  ${e.workedOn}`, '')
  if (e.changed.trim()) lines.push(`What changed or progressed:\n  ${e.changed}`, '')
  if (e.decisions.trim()) lines.push(`Decisions or blockers:\n  ${e.decisions}`, '')
  if (e.notes.trim()) lines.push(`Notes / context:\n  ${e.notes}`, '')
  if (e.nextFocus.trim()) lines.push(`What needs attention next:\n  ${e.nextFocus}`, '')
  lines.push('─'.repeat(44))
  lines.push('Created with Reattend Work Journal | reattend.com/free-work-journal')
  return lines.join('\n')
}

function entryToMarkdown(e: JournalEntry) {
  const lines = [`# Work Journal - ${fmtDate(e.date)}`, '']
  if (e.workedOn.trim()) lines.push('## What I worked on', e.workedOn, '')
  if (e.changed.trim()) lines.push('## What changed or progressed', e.changed, '')
  if (e.decisions.trim()) lines.push('## Decisions or blockers', e.decisions, '')
  if (e.notes.trim()) lines.push('## Notes / context', e.notes, '')
  if (e.nextFocus.trim()) lines.push('## What needs attention next', e.nextFocus, '')
  lines.push('---', '*Created with [Reattend Work Journal](https://reattend.com/free-work-journal)*')
  return lines.join('\n')
}

function allToMarkdown(entries: JournalEntry[]) {
  return entries.map(entryToMarkdown).join('\n\n---\n\n')
}

function allToText(entries: JournalEntry[]) {
  return entries.map(entryToText).join('\n\n')
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Reusable ──────────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] ${className}`}>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 text-[14px] text-[#1a1a2e] outline-none transition-all placeholder:text-gray-400 focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'

// ── Component ──────────────────────────────────────────────

export function WorkJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [draft, setDraft] = useState<Omit<JournalEntry, 'id'>>({ ...EMPTY_DRAFT, date: todayStr() })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // ── Entry Management ─────────────────────────────────────

  const addEntry = () => {
    const hasContent = draft.workedOn.trim() || draft.changed.trim() || draft.decisions.trim() || draft.notes.trim() || draft.nextFocus.trim()
    if (!hasContent) return
    const entry: JournalEntry = { ...draft, id: uid() }
    setEntries(prev => [entry, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    setDraft({ ...EMPTY_DRAFT, date: todayStr() })
  }

  const updateEntry = (id: string, field: keyof Omit<JournalEntry, 'id'>, value: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const setDraftField = (field: keyof Omit<JournalEntry, 'id'>, value: string) => {
    setDraft(d => ({ ...d, [field]: value }))
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

  const copyEntry = async (e: JournalEntry) => {
    await navigator.clipboard.writeText(entryToText(e))
    setCopied(e.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const downloadEntryMd = (e: JournalEntry) => dl(entryToMarkdown(e), `work-journal-${e.date}.md`, 'text/markdown')

  const downloadAllMd = () => {
    if (entries.length === 0) return
    dl(allToMarkdown(entries), `work-journal-all.md`, 'text/markdown')
  }

  const downloadAllTxt = () => {
    if (entries.length === 0) return
    dl(allToText(entries), `work-journal-all.txt`, 'text/plain')
  }

  const downloadAllPdf = () => {
    if (entries.length === 0) return
    const sections = entries.map(e => {
      const parts: string[] = []
      if (e.workedOn.trim()) parts.push(`<h3>What I worked on</h3><p>${esc(e.workedOn).replace(/\n/g, '<br>')}</p>`)
      if (e.changed.trim()) parts.push(`<h3>What changed or progressed</h3><p>${esc(e.changed).replace(/\n/g, '<br>')}</p>`)
      if (e.decisions.trim()) parts.push(`<h3>Decisions or blockers</h3><p>${esc(e.decisions).replace(/\n/g, '<br>')}</p>`)
      if (e.notes.trim()) parts.push(`<h3>Notes / context</h3><p>${esc(e.notes).replace(/\n/g, '<br>')}</p>`)
      if (e.nextFocus.trim()) parts.push(`<h3>What needs attention next</h3><p>${esc(e.nextFocus).replace(/\n/g, '<br>')}</p>`)
      return `<h2>${fmtDate(e.date)}</h2>${parts.join('')}`
    }).join('<hr>')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Work Journal</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:700px;margin:40px auto;padding:0 24px;color:#1a1a2e;font-size:14px;line-height:1.6}
h1{font-size:22px;margin-bottom:24px}h2{font-size:16px;margin:24px 0 8px;color:#333}h3{font-size:13px;text-transform:uppercase;letter-spacing:0.04em;color:#888;margin:14px 0 4px}
p{margin:0 0 8px}hr{border:none;border-top:1px solid #eee;margin:28px 0}.footer{margin-top:32px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#bbb}</style>
</head><body><h1>Work Journal</h1>${sections}<p class="footer">Created with Reattend Work Journal | reattend.com/free-work-journal</p></body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300) }
  }

  // ── Memory Bridge ────────────────────────────────────────

  const latestEntry = entries[0] || null

  const saveToReattend = async () => {
    const e = latestEntry
    if (!e) return
    const text = [
      'Work journal entry',
      '',
      `Date: ${fmtDate(e.date)}`,
      e.workedOn.trim() ? `Worked on: ${e.workedOn}` : '',
      e.changed.trim() ? `Progress: ${e.changed}` : '',
      e.decisions.trim() ? `Decisions / blockers: ${e.decisions}` : '',
      e.notes.trim() ? `Context: ${e.notes}` : '',
      e.nextFocus.trim() ? `Next focus: ${e.nextFocus}` : '',
    ].filter(Boolean).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied('bridge')
    setTimeout(() => setCopied(null), 3000)
    window.open('/register', '_blank')
  }

  const emailEntry = () => {
    const e = latestEntry
    if (!e) return
    const subject = encodeURIComponent(`Work journal – ${fmtDate(e.date)}`)
    const body = encodeURIComponent(entryToText(e) + '\n\nSave this to Reattend to build a long-term work history:\nhttps://reattend.com/register')
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const copyReflection = async () => {
    const e = latestEntry
    if (!e) return
    const text = [
      `Date: ${fmtDate(e.date)}`,
      e.workedOn.trim() ? `Worked on: ${e.workedOn}` : '',
      e.nextFocus.trim() ? `Next: ${e.nextFocus}` : '',
    ].filter(Boolean).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied('reflect')
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Field renderer ───────────────────────────────────────

  const field = (
    label: string,
    placeholder: string,
    value: string,
    onChange: (v: string) => void,
    multiline = false,
  ) => (
    <div>
      <label className="block text-[12px] font-medium text-gray-500 mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`${inputCls} resize-none leading-relaxed`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      )}
    </div>
  )

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
            Free Work <span className="text-[#4F46E5]">Journal</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.2 }} className="text-gray-500 mt-4 text-[17px] md:text-[19px] max-w-lg mx-auto">
            A simple work journal you can use instantly. Free. No login. Nothing is saved.
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
            Runs entirely in your browser. Your entries never leave your device.
          </motion.p>
        </div>
      </section>

      {/* Journal */}
      <section className="px-5 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="max-w-[680px] mx-auto"
        >

          {/* ── New Entry Form ──────────────────────────── */}
          <GlassCard className="p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-[#4F46E5]" />
                </div>
                <h2 className="text-[15px] font-bold text-[#1a1a2e]">New Entry</h2>
              </div>
              <input
                type="date"
                value={draft.date}
                onChange={e => setDraftField('date', e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 text-[13px] outline-none focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
              />
            </div>

            <div className="space-y-4">
              {field('What I worked on today', 'Tasks, projects, or areas of focus...', draft.workedOn, v => setDraftField('workedOn', v), true)}
              {field('What changed or progressed', 'Milestones, progress, outcomes...', draft.changed, v => setDraftField('changed', v))}
              {field('Decisions or blockers', 'Key decisions made, things stuck...', draft.decisions, v => setDraftField('decisions', v))}
              {field('Notes / context', 'Anything worth remembering...', draft.notes, v => setDraftField('notes', v))}
              {field('What needs attention next', 'Carry-forward items, priorities...', draft.nextFocus, v => setDraftField('nextFocus', v))}
            </div>

            <button
              onClick={addEntry}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-[14px] transition-all active:scale-[0.98] shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
            >
              <Plus className="w-4 h-4" /> Add Entry
            </button>
          </GlassCard>

          {/* ── Entries List ────────────────────────────── */}
          {entries.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-bold text-[#1a1a2e]">
                  Journal Entries <span className="text-gray-400 font-normal">({entries.length})</span>
                </h2>
              </div>

              <div className="space-y-4 mb-6">
                <AnimatePresence>
                  {entries.map(entry => {
                    const isEditing = editingId === entry.id
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <GlassCard className="p-6">
                          {/* Entry header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={entry.date}
                                  onChange={e => updateEntry(entry.id, 'date', e.target.value)}
                                  className="px-2 py-1 rounded-lg border border-white/80 bg-white/70 text-[13px] outline-none focus:border-[#4F46E5]/40"
                                />
                              ) : (
                                <h3 className="text-[14px] font-bold text-[#1a1a2e]">{fmtDate(entry.date)}</h3>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => copyEntry(entry)}
                                className="p-1.5 rounded-lg hover:bg-white/80 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Copy"
                              >
                                {copied === entry.id ? <Check className="w-3.5 h-3.5 text-[#4F46E5]" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => downloadEntryMd(entry)}
                                className="p-1.5 rounded-lg hover:bg-white/80 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Download Markdown"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(isEditing ? null : entry.id)}
                                className={`p-1.5 rounded-lg hover:bg-white/80 transition-colors ${isEditing ? 'text-[#4F46E5]' : 'text-gray-400 hover:text-gray-600'}`}
                                title={isEditing ? 'Done editing' : 'Edit'}
                              >
                                {isEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => deleteEntry(entry.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Entry content */}
                          {isEditing ? (
                            <div className="space-y-3">
                              {field('What I worked on', '', entry.workedOn, v => updateEntry(entry.id, 'workedOn', v), true)}
                              {field('What changed or progressed', '', entry.changed, v => updateEntry(entry.id, 'changed', v))}
                              {field('Decisions or blockers', '', entry.decisions, v => updateEntry(entry.id, 'decisions', v))}
                              {field('Notes / context', '', entry.notes, v => updateEntry(entry.id, 'notes', v))}
                              {field('What needs attention next', '', entry.nextFocus, v => updateEntry(entry.id, 'nextFocus', v))}
                            </div>
                          ) : (
                            <div className="space-y-2.5 text-[14px]">
                              {entry.workedOn.trim() && (
                                <div>
                                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Worked on</span>
                                  <p className="text-[#1a1a2e] mt-0.5 leading-relaxed whitespace-pre-wrap">{entry.workedOn}</p>
                                </div>
                              )}
                              {entry.changed.trim() && (
                                <div>
                                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Changed / progressed</span>
                                  <p className="text-[#1a1a2e] mt-0.5 leading-relaxed">{entry.changed}</p>
                                </div>
                              )}
                              {entry.decisions.trim() && (
                                <div>
                                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Decisions / blockers</span>
                                  <p className="text-[#1a1a2e] mt-0.5 leading-relaxed">{entry.decisions}</p>
                                </div>
                              )}
                              {entry.notes.trim() && (
                                <div>
                                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Notes</span>
                                  <p className="text-[#1a1a2e] mt-0.5 leading-relaxed">{entry.notes}</p>
                                </div>
                              )}
                              {entry.nextFocus.trim() && (
                                <div>
                                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Next focus</span>
                                  <p className="text-[#1a1a2e] mt-0.5 leading-relaxed">{entry.nextFocus}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </GlassCard>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

              {/* ── Bulk Export ──────────────────────────── */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'All as .md', icon: <FileText className="w-3.5 h-3.5 text-gray-500" />, action: downloadAllMd },
                  { label: 'All as .txt', icon: <Download className="w-3.5 h-3.5 text-gray-500" />, action: downloadAllTxt },
                  { label: 'All as PDF', icon: <Download className="w-3.5 h-3.5 text-gray-500" />, action: downloadAllPdf },
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
                Nothing is auto-saved. Export your entries before closing the page.
              </p>

              {/* ── Memory Bridge Panel ─────────────────── */}
              <GlassCard className="p-8 mb-10 ring-1 ring-[#4F46E5]/10">
                <h2 className="text-[18px] font-bold text-[#1a1a2e] mb-1">Work journals only matter if you can revisit them.</h2>
                <p className="text-[13px] text-gray-500 mb-6">Preserve your most recent entry as a long-term memory.</p>

                <div className="space-y-3">
                  <button
                    onClick={saveToReattend}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-[14px] transition-all active:scale-[0.98] shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
                  >
                    {copied === 'bridge' ? (
                      <><Check className="w-4 h-4" /> Copied, opening Reattend...</>
                    ) : (
                      <><Bookmark className="w-4 h-4" /> Save this work journal to Reattend</>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={emailEntry}
                      className="flex items-center justify-center gap-2 py-3 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/20 text-[13px] font-medium transition-all"
                    >
                      <Mail className="w-4 h-4 text-gray-500" /> Email to myself
                    </button>
                    <button
                      onClick={copyReflection}
                      className="flex items-center justify-center gap-2 py-3 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/20 text-[13px] font-medium transition-all"
                    >
                      {copied === 'reflect' ? (
                        <><Check className="w-4 h-4 text-[#4F46E5]" /> Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4 text-gray-500" /> Copy reflection</>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400 text-center pt-1">
                    Paste or attach this entry to build a long-term work history in Reattend.
                  </p>
                </div>
              </GlassCard>
            </>
          )}

          {/* Empty state */}
          {entries.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-[13px]">
              Your entries will appear here. Fill out the form above to start your daily work log.
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
                Turn daily logs into<br />long-term memory
              </h2>
              <p className="text-gray-500 mt-4 text-[15px] max-w-sm mx-auto">
                Reattend stores your work journals, meetings, and decisions in one searchable place so you can always recall what happened and why.
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
