'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Copy, Check, Download, Mail, ArrowRight,
  Bookmark, Star, CheckSquare, Clock, StickyNote, Lightbulb,
  Plus, X, FileText, Brain,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'
import { FAQAccordion } from '@/components/landing/faq'
import { Reveal } from '@/components/landing/reveal'

// ── Types ──────────────────────────────────────────────────

interface Task { text: string; done: boolean }
interface Meeting { time: string; desc: string }

const FAQS = [
  { question: 'Is this daily planner really free?', answer: 'Yes, 100% free. No hidden fees, no premium version, no account required. Use it every day without restrictions.' },
  { question: 'Does it save my data?', answer: 'No. Nothing is stored on our servers. Your plan exists only in your browser tab. Download or copy it before closing the page.' },
  { question: 'Can I use this for work?', answer: 'Absolutely. This daily work planner is designed for professionals. Plan priorities, track tasks, log meetings, and reflect on your day.' },
  { question: 'How is this different from a todo list?', answer: 'A todo list tracks tasks. This daily planner gives your day structure: priorities, commitments, notes, and an end-of-day reflection. It encourages focus and completion, not just accumulation.' },
]

// ── Helpers ────────────────────────────────────────────────

function formatDateDisplay(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
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

export function DailyPlanner() {
  const [date, setDate] = useState(todayStr)
  const [priorities, setPriorities] = useState(['', '', ''])
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskInput, setTaskInput] = useState('')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [meetingTime, setMeetingTime] = useState('')
  const [meetingDesc, setMeetingDesc] = useState('')
  const [notes, setNotes] = useState('')
  const [refDone, setRefDone] = useState('')
  const [refForward, setRefForward] = useState('')
  const [refDidnt, setRefDidnt] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  // ── Data Helpers ─────────────────────────────────────────

  const addTask = () => {
    if (!taskInput.trim()) return
    setTasks(t => [...t, { text: taskInput.trim(), done: false }])
    setTaskInput('')
  }

  const toggleTask = (i: number) => {
    setTasks(t => t.map((task, idx) => idx === i ? { ...task, done: !task.done } : task))
  }

  const removeTask = (i: number) => {
    setTasks(t => t.filter((_, idx) => idx !== i))
  }

  const addMeeting = () => {
    if (!meetingDesc.trim()) return
    setMeetings(m => [...m, { time: meetingTime, desc: meetingDesc.trim() }])
    setMeetingTime('')
    setMeetingDesc('')
  }

  const removeMeeting = (i: number) => {
    setMeetings(m => m.filter((_, idx) => idx !== i))
  }

  const setPriority = (i: number, val: string) => {
    setPriorities(p => p.map((v, idx) => idx === i ? val : v))
  }

  // ── Content Generation ───────────────────────────────────

  const generateText = () => {
    const dateDisplay = formatDateDisplay(date)
    const lines: string[] = []
    lines.push(`Daily Plan - ${dateDisplay}`, '═'.repeat(44), '')
    const filledPriorities = priorities.filter(p => p.trim())
    if (filledPriorities.length > 0) {
      lines.push('TOP PRIORITIES')
      filledPriorities.forEach((p, i) => lines.push(`  ${i + 1}. ${p}`))
      lines.push('')
    }
    if (tasks.length > 0) {
      lines.push('TASKS')
      tasks.forEach(t => lines.push(`  [${t.done ? 'x' : ' '}] ${t.text}`))
      lines.push('')
    }
    if (meetings.length > 0) {
      lines.push('MEETINGS & COMMITMENTS')
      meetings.forEach(m => lines.push(`  ${m.time ? m.time + ' - ' : ''}${m.desc}`))
      lines.push('')
    }
    if (notes.trim()) { lines.push('NOTES', `  ${notes}`, '') }
    if (refDone.trim() || refForward.trim() || refDidnt.trim()) {
      lines.push('END-OF-DAY REFLECTION')
      if (refDone.trim()) lines.push(`  What got done: ${refDone}`)
      if (refForward.trim()) lines.push(`  What moved forward: ${refForward}`)
      if (refDidnt.trim()) lines.push(`  What didn't: ${refDidnt}`)
      lines.push('')
    }
    lines.push('─'.repeat(44), 'Created with Reattend Daily Planner | reattend.com/free-daily-planner')
    return lines.join('\n')
  }

  const generateMarkdown = () => {
    const dateDisplay = formatDateDisplay(date)
    const lines: string[] = []
    lines.push(`# Daily Plan - ${dateDisplay}`, '')
    const filledPriorities = priorities.filter(p => p.trim())
    if (filledPriorities.length > 0) {
      lines.push('## Top Priorities')
      filledPriorities.forEach((p, i) => lines.push(`${i + 1}. **${p}**`))
      lines.push('')
    }
    if (tasks.length > 0) {
      lines.push('## Tasks')
      tasks.forEach(t => lines.push(`- [${t.done ? 'x' : ' '}] ${t.text}`))
      lines.push('')
    }
    if (meetings.length > 0) {
      lines.push('## Meetings & Commitments')
      meetings.forEach(m => lines.push(`- ${m.time ? `**${m.time}** - ` : ''}${m.desc}`))
      lines.push('')
    }
    if (notes.trim()) { lines.push('## Notes', notes, '') }
    if (refDone.trim() || refForward.trim() || refDidnt.trim()) {
      lines.push('## End-of-Day Reflection')
      if (refDone.trim()) lines.push(`- **What got done:** ${refDone}`)
      if (refForward.trim()) lines.push(`- **What moved forward:** ${refForward}`)
      if (refDidnt.trim()) lines.push(`- **What didn't:** ${refDidnt}`)
      lines.push('')
    }
    lines.push('---', '*Created with [Reattend Daily Planner](https://reattend.com/free-daily-planner)*')
    return lines.join('\n')
  }

  // ── Export Actions ───────────────────────────────────────

  const copyPlanner = async () => {
    await navigator.clipboard.writeText(generateText())
    setCopied('plan')
    setTimeout(() => setCopied(null), 2000)
  }

  const downloadFile = (content: string, ext: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `daily-plan-${date}.${ext}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const downloadMarkdown = () => downloadFile(generateMarkdown(), 'md', 'text/markdown')
  const downloadTxt = () => downloadFile(generateText(), 'txt', 'text/plain')

  const downloadPdf = () => {
    const dateDisplay = formatDateDisplay(date)
    const filledPriorities = priorities.filter(p => p.trim())
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Daily Plan - ${dateDisplay}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:700px;margin:40px auto;padding:0 24px;color:#1a1a2e;font-size:14px;line-height:1.6}
h1{font-size:22px;margin-bottom:4px}
h2{font-size:15px;text-transform:uppercase;letter-spacing:0.05em;color:#888;margin:24px 0 8px;border-bottom:1px solid #eee;padding-bottom:4px}
.subtitle{color:#888;font-size:13px;margin-bottom:24px}
ul{list-style:none;padding:0}
li{padding:3px 0}
.done{text-decoration:line-through;color:#999}
.footer{margin-top:32px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#bbb}
</style></head><body>
<h1>Daily Plan</h1>
<p class="subtitle">${dateDisplay}</p>
${filledPriorities.length > 0 ? `<h2>Top Priorities</h2><ol>${filledPriorities.map(p => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}
${tasks.length > 0 ? `<h2>Tasks</h2><ul>${tasks.map(t => `<li class="${t.done ? 'done' : ''}">${t.done ? '☑' : '☐'} ${esc(t.text)}</li>`).join('')}</ul>` : ''}
${meetings.length > 0 ? `<h2>Meetings &amp; Commitments</h2><ul>${meetings.map(m => `<li>${m.time ? `<strong>${esc(m.time)}</strong> - ` : ''}${esc(m.desc)}</li>`).join('')}</ul>` : ''}
${notes.trim() ? `<h2>Notes</h2><p>${esc(notes).replace(/\n/g, '<br>')}</p>` : ''}
${(refDone.trim() || refForward.trim() || refDidnt.trim()) ? `<h2>End-of-Day Reflection</h2><ul>${refDone.trim() ? `<li><strong>What got done:</strong> ${esc(refDone)}</li>` : ''}${refForward.trim() ? `<li><strong>What moved forward:</strong> ${esc(refForward)}</li>` : ''}${refDidnt.trim() ? `<li><strong>What didn't:</strong> ${esc(refDidnt)}</li>` : ''}</ul>` : ''}
<p class="footer">Created with Reattend Daily Planner | reattend.com/free-daily-planner</p>
</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300) }
  }

  // ── Memory Bridge Actions ────────────────────────────────

  const saveToReattend = async () => {
    const dateDisplay = formatDateDisplay(date)
    const filledPriorities = priorities.filter(p => p.trim())
    const completedTasks = tasks.filter(t => t.done).map(t => t.text)
    const text = [
      'Daily plan',
      '',
      `Date: ${dateDisplay}`,
      filledPriorities.length > 0 ? `Top priorities: ${filledPriorities.join(', ')}` : '',
      completedTasks.length > 0 ? `Tasks completed: ${completedTasks.join(', ')}` : '',
      meetings.length > 0 ? `Meetings: ${meetings.map(m => (m.time ? `${m.time} ${m.desc}` : m.desc)).join(', ')}` : '',
      notes.trim() ? `Notes: ${notes}` : '',
      refDone.trim() ? `Reflection - done: ${refDone}` : '',
      refForward.trim() ? `Reflection - moved forward: ${refForward}` : '',
      refDidnt.trim() ? `Reflection - didn't: ${refDidnt}` : '',
    ].filter(Boolean).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied('memory')
    setTimeout(() => setCopied(null), 3000)
    window.open('/register', '_blank')
  }

  const emailToSelf = () => {
    const dateDisplay = formatDateDisplay(date)
    const subject = encodeURIComponent(`Daily plan – ${dateDisplay}`)
    const body = encodeURIComponent(generateText() + '\n\nSave this to Reattend to build a history of your work:\nhttps://reattend.com/register')
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const copyReflection = async () => {
    const text = [
      refDone.trim() ? `What got done: ${refDone}` : '',
      refForward.trim() ? `What moved forward: ${refForward}` : '',
      refDidnt.trim() ? `What didn't: ${refDidnt}` : '',
    ].filter(Boolean).join('\n')
    await navigator.clipboard.writeText(text || '(No reflection yet)')
    setCopied('reflection')
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
            Free Daily <span className="text-[#4F46E5]">Planner</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.2 }} className="text-gray-500 mt-4 text-[17px] md:text-[19px] max-w-lg mx-auto">
            A simple, free daily planner you can use instantly. No login. No installs. Nothing is saved.
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
        </div>
      </section>

      {/* Planner */}
      <section className="px-5 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="max-w-[680px] mx-auto"
        >
          {/* Date */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-bold text-[#1a1a2e]">{formatDateDisplay(date)}</h2>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 text-[13px] outline-none focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
            />
          </div>

          <div className="space-y-5">

            {/* ── Top Priorities ─────────────────────────── */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-[14px] font-bold text-[#1a1a2e]">Top Priorities</h3>
                <span className="text-[11px] text-gray-400 ml-auto">Max 3</span>
              </div>
              <div className="space-y-3">
                {priorities.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[13px] font-bold text-[#4F46E5] w-5 text-center shrink-0">{i + 1}</span>
                    <input
                      type="text"
                      value={p}
                      onChange={e => setPriority(i, e.target.value)}
                      placeholder={`Priority ${i + 1}`}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* ── Tasks ──────────────────────────────────── */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-blue-500" />
                </div>
                <h3 className="text-[14px] font-bold text-[#1a1a2e]">Tasks</h3>
                {tasks.length > 0 && (
                  <span className="text-[11px] text-gray-400 ml-auto">
                    {tasks.filter(t => t.done).length}/{tasks.length} done
                  </span>
                )}
              </div>

              {tasks.length > 0 && (
                <div className="space-y-1.5 mb-4">
                  {tasks.map((task, i) => (
                    <div key={i} className="group flex items-center gap-3 py-1.5">
                      <button
                        onClick={() => toggleTask(i)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          task.done ? 'bg-[#4F46E5] border-[#4F46E5]' : 'border-gray-300 hover:border-[#4F46E5]/40'
                        }`}
                      >
                        {task.done && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span className={`flex-1 text-[14px] ${task.done ? 'line-through text-gray-400' : 'text-[#1a1a2e]'}`}>
                        {task.text}
                      </span>
                      <button
                        onClick={() => removeTask(i)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTask() }}
                  placeholder="Add a task..."
                  className={`flex-1 ${inputCls}`}
                />
                <button
                  onClick={addTask}
                  disabled={!taskInput.trim()}
                  className="px-3 py-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/20 disabled:opacity-30 transition-all"
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </GlassCard>

            {/* ── Meetings ───────────────────────────────── */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-500" />
                </div>
                <h3 className="text-[14px] font-bold text-[#1a1a2e]">Meetings & Commitments</h3>
              </div>

              {meetings.length > 0 && (
                <div className="space-y-2 mb-4">
                  {meetings.map((m, i) => (
                    <div key={i} className="group flex items-center gap-3 py-1.5">
                      {m.time && (
                        <span className="text-[13px] font-medium text-purple-600 shrink-0 w-14">{m.time}</span>
                      )}
                      <span className="flex-1 text-[14px] text-[#1a1a2e]">{m.desc}</span>
                      <button
                        onClick={() => removeMeeting(i)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="time"
                  value={meetingTime}
                  onChange={e => setMeetingTime(e.target.value)}
                  className="w-[110px] px-3 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 text-[13px] outline-none transition-all focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)] shrink-0"
                />
                <input
                  type="text"
                  value={meetingDesc}
                  onChange={e => setMeetingDesc(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addMeeting() }}
                  placeholder="Meeting or commitment..."
                  className={`flex-1 ${inputCls}`}
                />
                <button
                  onClick={addMeeting}
                  disabled={!meetingDesc.trim()}
                  className="px-3 py-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/20 disabled:opacity-30 transition-all"
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </GlassCard>

            {/* ── Notes ──────────────────────────────────── */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gray-500/10 flex items-center justify-center">
                  <StickyNote className="w-4 h-4 text-gray-500" />
                </div>
                <h3 className="text-[14px] font-bold text-[#1a1a2e]">Notes</h3>
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Free-form notes for today..."
                rows={4}
                className={`${inputCls} resize-none leading-relaxed`}
              />
            </GlassCard>

            {/* ── End-of-Day Reflection ──────────────────── */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-[14px] font-bold text-[#1a1a2e]">End-of-Day Reflection</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">What got done?</label>
                  <input type="text" value={refDone} onChange={e => setRefDone(e.target.value)} placeholder="Summarize what you completed today..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">What moved forward?</label>
                  <input type="text" value={refForward} onChange={e => setRefForward(e.target.value)} placeholder="What made progress even if not finished..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 mb-1">What didn&apos;t?</label>
                  <input type="text" value={refDidnt} onChange={e => setRefDidnt(e.target.value)} placeholder="What's carrying over to tomorrow..." className={inputCls} />
                </div>
              </div>
            </GlassCard>

          </div>

          {/* ── Export Buttons ───────────────────────────── */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: copied === 'plan' ? 'Copied!' : 'Copy', icon: copied === 'plan' ? <Check className="w-3.5 h-3.5 text-[#4F46E5]" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />, action: copyPlanner },
              { label: 'Markdown', icon: <FileText className="w-3.5 h-3.5 text-gray-500" />, action: downloadMarkdown },
              { label: 'TXT', icon: <Download className="w-3.5 h-3.5 text-gray-500" />, action: downloadTxt },
              { label: 'PDF', icon: <Download className="w-3.5 h-3.5 text-gray-500" />, action: downloadPdf },
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

          <p className="text-[12px] text-gray-400 text-center mt-3">
            Everything stays on your device. Nothing is auto-saved.
          </p>

          {/* ── Memory Bridge Panel ─────────────────────── */}
          <GlassCard className="mt-10 p-8 ring-1 ring-[#4F46E5]/10">
            <h2 className="text-[18px] font-bold text-[#1a1a2e] mb-1">Today becomes memory tomorrow.</h2>
            <p className="text-[13px] text-gray-500 mb-6">Keep a record of how you spent your day.</p>

            <div className="space-y-3">
              <button
                onClick={saveToReattend}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-[14px] transition-all active:scale-[0.98] shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
              >
                {copied === 'memory' ? (
                  <><Check className="w-4 h-4" /> Copied, opening Reattend...</>
                ) : (
                  <><Bookmark className="w-4 h-4" /> Save today to Reattend</>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={emailToSelf}
                  className="flex items-center justify-center gap-2 py-3 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/20 text-[13px] font-medium transition-all"
                >
                  <Mail className="w-4 h-4 text-gray-500" /> Email today&apos;s plan
                </button>
                <button
                  onClick={copyReflection}
                  className="flex items-center justify-center gap-2 py-3 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 hover:border-[#4F46E5]/20 text-[13px] font-medium transition-all"
                >
                  {copied === 'reflection' ? (
                    <><Check className="w-4 h-4 text-[#4F46E5]" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4 text-gray-500" /> Copy reflection</>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-gray-400 text-center pt-1">
                &ldquo;Save to Reattend&rdquo; copies your daily plan to clipboard and opens Reattend where you can paste it as a memory.
              </p>
            </div>
          </GlassCard>

        </motion.div>
      </section>

      {/* FAQ */}
      <section className="px-5 pb-20 md:pb-24 pt-4">
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
                Build a history of how<br />you actually work
              </h2>
              <p className="text-gray-500 mt-4 text-[15px] max-w-sm mx-auto">
                Reattend turns your daily plans, meetings, and decisions into a searchable, organized memory so nothing falls through the cracks.
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
