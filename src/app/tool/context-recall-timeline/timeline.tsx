'use client'

import React, { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight, Copy, Check, Download, Plus, X, Pencil, RotateCcw,
  Users, Gavel, FileText, Lightbulb, Bell, ChevronDown, Brain,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

// --------------- Types ---------------

type EntryType = 'meeting' | 'decision' | 'note' | 'idea' | 'reminder'

interface TimelineEntry {
  id: string
  date: string
  title: string
  type: EntryType
  details: string
}

interface WeekGroup {
  label: string
  weekStart: Date
  entries: TimelineEntry[]
  gapDays: number | null // gap from previous group
}

// --------------- Config ---------------

const entryTypes: { key: EntryType; label: string; icon: React.ElementType; color: string; bg: string; dot: string }[] = [
  { key: 'meeting', label: 'Meeting', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  { key: 'decision', label: 'Decision', icon: Gavel, color: 'text-purple-600', bg: 'bg-purple-50', dot: 'bg-purple-500' },
  { key: 'note', label: 'Note', icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' },
  { key: 'idea', label: 'Idea', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  { key: 'reminder', label: 'Reminder', icon: Bell, color: 'text-rose-600', bg: 'bg-rose-50', dot: 'bg-rose-500' },
]

const typeMap = Object.fromEntries(entryTypes.map(t => [t.key, t]))

// --------------- Helpers ---------------

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getWeekStart(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function getWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' })
  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekStart.getFullYear()}`
  }
  return `${startMonth} ${weekStart.getDate()} – ${endMonth} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`
}

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function groupByWeek(entries: TimelineEntry[]): WeekGroup[] {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const groups: WeekGroup[] = []
  let currentWeekKey = ''
  let currentGroup: WeekGroup | null = null

  for (const entry of sorted) {
    const ws = getWeekStart(entry.date)
    const weekKey = ws.toISOString()

    if (weekKey !== currentWeekKey) {
      if (currentGroup) groups.push(currentGroup)
      const gapDays: number | null = currentGroup ? daysBetween(ws, currentGroup.weekStart) - 7 : null
      currentGroup = {
        label: getWeekLabel(ws),
        weekStart: ws,
        entries: [entry],
        gapDays: gapDays && gapDays > 0 ? gapDays : null,
      }
      currentWeekKey = weekKey
    } else {
      currentGroup!.entries.push(entry)
    }
  }
  if (currentGroup) groups.push(currentGroup)
  return groups
}

function generateMarkdown(entries: TimelineEntry[]): string {
  const groups = groupByWeek(entries)
  let md = '# Context Recall Timeline\n\n'
  for (const group of groups) {
    md += `## ${group.label}\n\n`
    for (const entry of group.entries) {
      const t = typeMap[entry.type]
      md += `### ${entry.title}\n`
      md += `**${formatDate(entry.date)}** · ${t.label}\n\n`
      if (entry.details) md += `${entry.details}\n\n`
    }
    if (group.gapDays) md += `---\n*${group.gapDays}-day gap*\n\n`
  }
  md += `---\n*Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*`
  return md
}

function generatePlainText(entries: TimelineEntry[]): string {
  const groups = groupByWeek(entries)
  const div = '────────────────────────────────────────'
  let text = 'CONTEXT RECALL TIMELINE\n\n'
  for (const group of groups) {
    text += `${group.label}\n${div}\n`
    for (const entry of group.entries) {
      const t = typeMap[entry.type]
      text += `  ${formatDate(entry.date)} · [${t.label}] ${entry.title}\n`
      if (entry.details) text += `    ${entry.details}\n`
    }
    text += '\n'
    if (group.gapDays) text += `  ⟶ ${group.gapDays}-day gap\n\n`
  }
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

function TypeSelector({ value, onChange }: { value: EntryType; onChange: (v: EntryType) => void }) {
  const [open, setOpen] = useState(false)
  const selected = typeMap[value]
  const Icon = selected.icon

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 text-[13px] font-bold px-3 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/30 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${selected.color}`}
      >
        <Icon className="w-3.5 h-3.5" /> {selected.label} <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 bg-white/90 backdrop-blur-xl border border-white/80 rounded-xl shadow-lg py-1.5 z-20 min-w-[140px]">
            {entryTypes.map(t => {
              const TIcon = t.icon
              return (
                <button
                  key={t.key}
                  onClick={() => { onChange(t.key); setOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-white/60 transition-colors ${t.key === value ? 'font-bold' : ''} ${t.color}`}
                >
                  <TIcon className="w-3.5 h-3.5" /> {t.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function EntryForm({ onAdd }: { onAdd: (entry: Omit<TimelineEntry, 'id'>) => void }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EntryType>('meeting')
  const [details, setDetails] = useState('')
  const [expanded, setExpanded] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !title.trim()) return
    onAdd({ date, title: title.trim(), type, details: details.trim() })
    setTitle('')
    setDetails('')
    setExpanded(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <GlassCard className="p-5 md:p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className={`${inputCls} w-full sm:w-[160px]`}
          />
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What happened?"
            className={`flex-1 ${inputCls}`}
          />
          <TypeSelector value={type} onChange={setType} />
        </div>

        {expanded ? (
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Add details, context, or notes..."
            rows={2}
            className={`${inputCls} mt-3 resize-none leading-relaxed`}
          />
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-2 text-[12.5px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            + Add details
          </button>
        )}

        <div className="flex justify-end mt-3">
          <button
            type="submit"
            disabled={!date || !title.trim()}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all px-5 py-2.5 rounded-full shadow-[0_4px_16px_rgba(79,70,229,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Entry
          </button>
        </div>
      </GlassCard>
    </form>
  )
}

function TimelineView({ groups, onEdit, onRemove }: {
  groups: WeekGroup[]
  onEdit: (id: string, entry: Partial<TimelineEntry>) => void
  onRemove: (id: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDetails, setEditDetails] = useState('')

  return (
    <div className="space-y-0">
      {groups.map((group, gi) => (
        <div key={group.label}>
          {/* Gap indicator */}
          {group.gapDays && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 py-4 px-2"
            >
              <div className="flex-1 border-t border-dashed border-[#4F46E5]/15" />
              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                {group.gapDays} day gap
              </span>
              <div className="flex-1 border-t border-dashed border-[#4F46E5]/15" />
            </motion.div>
          )}

          {/* Week header */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: gi * 0.05 }}
            className="flex items-center gap-3 mb-4 mt-2"
          >
            <span className="text-[12px] font-bold uppercase tracking-wider text-gray-400">
              {group.label}
            </span>
            <div className="flex-1 border-t border-white/60" />
          </motion.div>

          {/* Entries */}
          <div className="relative pl-6 md:pl-8 mb-6">
            {/* Vertical line */}
            <div className="absolute left-[9px] md:left-[11px] top-2 bottom-2 w-px bg-[#4F46E5]/10" />

            <div className="space-y-4">
              {group.entries.map((entry, ei) => {
                const t = typeMap[entry.type]
                const Icon = t.icon
                const isEditing = editingId === entry.id

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gi * 0.05 + ei * 0.03 }}
                    className="group relative"
                  >
                    {/* Dot */}
                    <div className={`absolute -left-6 md:-left-8 top-3 w-[9px] h-[9px] md:w-[11px] md:h-[11px] rounded-full ${t.dot} ring-2 ring-[#F5F5FF]`} />

                    <GlassCard className="overflow-hidden">
                      <div className="px-4 md:px-5 py-3 flex items-start gap-3">
                        {/* Date + type badge */}
                        <div className="shrink-0 pt-0.5">
                          <span className="text-[12px] text-gray-400 font-medium">{formatShortDate(entry.date)}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                autoFocus
                                className={`${inputCls} font-bold`}
                              />
                              <textarea
                                value={editDetails}
                                onChange={e => setEditDetails(e.target.value)}
                                rows={2}
                                placeholder="Details..."
                                className={`${inputCls} text-[13px] resize-none`}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { onEdit(entry.id, { title: editTitle.trim(), details: editDetails.trim() }); setEditingId(null) }}
                                  className="text-[12px] font-bold text-[#4F46E5] px-2 py-1"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-[12px] text-gray-400 px-2 py-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <h4 className="text-[14px] font-bold text-[#1a1a2e] leading-snug">{entry.title}</h4>
                                <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md ${t.bg} ${t.color}`}>
                                  <Icon className="w-2.5 h-2.5" /> {t.label}
                                </span>
                              </div>
                              {entry.details && (
                                <p className="text-[13px] text-gray-500 leading-relaxed mt-1 whitespace-pre-wrap">{entry.details}</p>
                              )}
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => { setEditingId(entry.id); setEditTitle(entry.title); setEditDetails(entry.details) }}
                              className="p-1.5 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onRemove(entry.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// --------------- Main ---------------

export function ContextRecallTimeline() {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [copied, setCopied] = useState<string | null>(null)

  const handleAdd = useCallback((entry: Omit<TimelineEntry, 'id'>) => {
    setEntries(prev => [...prev, { ...entry, id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }])
  }, [])

  const handleEdit = useCallback((id: string, updates: Partial<TimelineEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }, [])

  const handleRemove = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  const handleReset = useCallback(() => {
    setEntries([])
  }, [])

  const groups = useMemo(() => groupByWeek(entries), [entries])

  const stats = useMemo(() => {
    if (entries.length < 2) return null
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
    const firstDate = sorted[0].date
    const lastDate = sorted[sorted.length - 1].date
    const span = daysBetween(new Date(firstDate + 'T00:00:00'), new Date(lastDate + 'T00:00:00'))
    const typeCounts: Record<string, number> = {}
    for (const e of entries) typeCounts[e.type] = (typeCounts[e.type] || 0) + 1
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]
    return { span, count: entries.length, topType: topType ? { key: topType[0] as EntryType, count: topType[1] } : null }
  }, [entries])

  const handleCopyText = useCallback(async () => {
    const text = generatePlainText(entries)
    try { await navigator.clipboard.writeText(text) } catch {
      const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied('text'); setTimeout(() => setCopied(null), 2000)
  }, [entries])

  const handleCopyMarkdown = useCallback(async () => {
    const md = generateMarkdown(entries)
    try { await navigator.clipboard.writeText(md) } catch {
      const el = document.createElement('textarea'); el.value = md; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el)
    }
    setCopied('md'); setTimeout(() => setCopied(null), 2000)
  }, [entries])

  const handleDownload = useCallback(() => {
    const md = generateMarkdown(entries)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `context-timeline-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [entries])

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
            Context Recall Timeline
          </h1>
          <p className="text-gray-500 mt-3 text-[16px] max-w-lg mx-auto">
            Reconstruct what happened and when. See the full picture across weeks and months.
          </p>
        </motion.div>
      </section>

      <div className="relative z-10 max-w-[800px] mx-auto px-5 pb-20">
        {/* Entry form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mt-4 mb-8"
        >
          <EntryForm onAdd={handleAdd} />
        </motion.div>

        {/* Stats bar */}
        {stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap items-center gap-4 mb-6 text-[12.5px] text-gray-400"
          >
            <span><strong className="text-gray-600">{stats.count}</strong> entries</span>
            <span>spanning <strong className="text-gray-600">{stats.span}</strong> days</span>
            {stats.topType && (
              <span>mostly <strong className={typeMap[stats.topType.key].color}>{typeMap[stats.topType.key].label}s</strong></span>
            )}
          </motion.div>
        )}

        {/* Timeline */}
        {entries.length > 0 ? (
          <>
            <TimelineView
              groups={groups}
              onEdit={handleEdit}
              onRemove={handleRemove}
            />

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
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
                onClick={handleReset}
                className="inline-flex items-center gap-2 text-[13.5px] font-medium text-gray-500 hover:text-[#1a1a2e] px-5 py-3 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear all
              </button>
            </motion.div>

            {/* Insight */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GlassCard className="p-6 md:p-8 mb-8">
                <h3 className="text-[15px] font-bold mb-2">Why timelines matter</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed mb-4">
                  We remember events, but rarely when they happened. Without temporal context, it becomes
                  impossible to trace how one decision led to another, or why something changed. Teams
                  don&apos;t lose context because they forget. They lose it because time is invisible.
                  A timeline makes the invisible visible again.
                </p>
                <p className="text-[14.5px] text-[#1a1a2e] font-medium">
                  Context is not lost because you forget. It&apos;s lost because time is invisible.
                </p>
              </GlassCard>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
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
                        Make this recallable forever
                      </h3>
                      <p className="text-gray-500 text-[15px] max-w-md mx-auto mb-6 leading-relaxed">
                        Reattend turns scattered context into a searchable, AI-enriched timeline so you can always trace back to why.
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
          </>
        ) : (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-16"
          >
            <p className="text-[15px] text-gray-300 mb-1">No entries yet</p>
            <p className="text-[13px] text-gray-300">Add your first event above to start building your timeline.</p>
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  )
}
