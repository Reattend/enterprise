'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Plus,
  Trash2,
  Download,
  ChevronDown,
  Brain,
  Table2,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { Footer } from '@/components/landing/footer'

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] ${className}`}>
      {children}
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <GlassCard className="overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left">
        <span className="text-[15px] font-semibold text-[#1a1a2e] pr-4">{question}</span>
        <ChevronDown className={`w-5 h-5 text-[#4F46E5] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 -mt-1 text-[14px] text-[#444] leading-relaxed">{answer}</div>}
    </GlassCard>
  )
}

type RaciValue = '' | 'R' | 'A' | 'C' | 'I'

interface RaciRow {
  task: string
  assignments: Record<string, RaciValue>
}

const RACI_COLORS: Record<string, string> = {
  R: 'bg-[#4F46E5] text-white',
  A: 'bg-amber-500 text-white',
  C: 'bg-emerald-500 text-white',
  I: 'bg-gray-400 text-white',
  '': 'bg-gray-100 text-gray-400',
}

const RACI_LABELS: Record<string, string> = {
  R: 'Responsible',
  A: 'Accountable',
  C: 'Consulted',
  I: 'Informed',
}

interface Props {
  faqItems: Array<{ question: string; answer: string }>
}

export function RaciGenerator({ faqItems }: Props) {
  const [people, setPeople] = useState<string[]>(['PM', 'Designer', 'Developer', 'QA'])
  const [rows, setRows] = useState<RaciRow[]>([
    { task: '', assignments: {} },
  ])
  const [newPerson, setNewPerson] = useState('')

  function addPerson() {
    const name = newPerson.trim()
    if (!name || people.includes(name)) return
    setPeople([...people, name])
    setNewPerson('')
  }

  function removePerson(idx: number) {
    if (people.length <= 2) return
    const name = people[idx]
    setPeople(people.filter((_, i) => i !== idx))
    setRows(rows.map(r => {
      const a = { ...r.assignments }
      delete a[name]
      return { ...r, assignments: a }
    }))
  }

  function addRow() {
    setRows([...rows, { task: '', assignments: {} }])
  }

  function removeRow(idx: number) {
    if (rows.length <= 1) return
    setRows(rows.filter((_, i) => i !== idx))
  }

  function updateTask(idx: number, task: string) {
    const updated = [...rows]
    updated[idx] = { ...updated[idx], task }
    setRows(updated)
  }

  function cycleRaci(rowIdx: number, person: string) {
    const order: RaciValue[] = ['', 'R', 'A', 'C', 'I']
    const current = rows[rowIdx].assignments[person] || ''
    const next = order[(order.indexOf(current) + 1) % order.length]
    const updated = [...rows]
    updated[rowIdx] = {
      ...updated[rowIdx],
      assignments: { ...updated[rowIdx].assignments, [person]: next },
    }
    setRows(updated)
  }

  function exportPdf() {
    const w = window.open('', '_blank')
    if (!w) return
    const tableRows = rows
      .filter(r => r.task.trim())
      .map(
        r => `<tr>
          <td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb">${r.task}</td>
          ${people.map(p => {
            const v = r.assignments[p] || ''
            const bg = v === 'R' ? '#4F46E5' : v === 'A' ? '#f59e0b' : v === 'C' ? '#10b981' : v === 'I' ? '#9ca3af' : '#f3f4f6'
            const color = v ? '#fff' : '#d1d5db'
            return `<td style="padding:10px 14px;border:1px solid #e5e7eb;text-align:center;background:${bg};color:${color};font-weight:700;font-size:15px">${v || '-'}</td>`
          }).join('')}
        </tr>`
      )
      .join('')

    w.document.write(`<!DOCTYPE html><html><head><title>RACI Chart</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#1a1a2e}
      h1{font-size:24px;margin-bottom:4px}p{color:#666;margin-bottom:24px;font-size:14px}
      table{border-collapse:collapse;width:100%}th{padding:10px 14px;border:1px solid #e5e7eb;background:#f9fafb;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#666}
      .legend{display:flex;gap:20px;margin-top:24px;font-size:13px;color:#666}
      .legend span{display:inline-flex;align-items:center;gap:6px}
      .dot{width:12px;height:12px;border-radius:3px;display:inline-block}
      .footer{margin-top:32px;font-size:12px;color:#999;border-top:1px solid #e5e7eb;padding-top:16px}</style></head>
      <body>
      <h1>RACI Chart</h1>
      <p>Generated with Reattend - reattend.com/free-raci-chart-generator</p>
      <table>
        <thead><tr><th style="text-align:left">Task / Decision</th>${people.map(p => `<th>${p}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="legend">
        <span><span class="dot" style="background:#4F46E5"></span> R = Responsible</span>
        <span><span class="dot" style="background:#f59e0b"></span> A = Accountable</span>
        <span><span class="dot" style="background:#10b981"></span> C = Consulted</span>
        <span><span class="dot" style="background:#9ca3af"></span> I = Informed</span>
      </div>
      <div class="footer">Created with Reattend Free RACI Chart Generator | reattend.com</div>
      </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  const filledRows = rows.filter(r => r.task.trim())

  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
      <Navbar />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-20 pb-8 px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
            <Table2 className="w-3.5 h-3.5" />
            Free tool
          </span>
          <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.1]">
            RACI Chart <span className="text-[#4F46E5]">Generator</span>
          </h1>
          <p className="text-gray-500 mt-4 text-[15px] max-w-xl mx-auto">
            Define tasks, assign roles, and export a clean RACI matrix as PDF. Click any cell to cycle through R, A, C, I.
          </p>
        </motion.div>
      </section>

      {/* Legend */}
      <section className="relative z-10 px-5 pb-4">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-4 text-[13px]">
          {Object.entries(RACI_LABELS).map(([key, label]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[12px] font-bold ${RACI_COLORS[key]}`}>{key}</span>
              <span className="text-gray-600">{label}</span>
            </span>
          ))}
        </div>
      </section>

      {/* People */}
      <section className="relative z-10 px-5 pb-4">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-5">
            <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Team Members</h2>
            <div className="flex flex-wrap items-center gap-2">
              {people.map((p, i) => (
                <span key={p} className="flex items-center gap-1 bg-[#4F46E5]/5 text-[#4F46E5] text-[13px] font-medium px-3 py-1.5 rounded-full">
                  {p}
                  <button onClick={() => removePerson(i)} className="ml-1 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <form
                onSubmit={e => { e.preventDefault(); addPerson() }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  placeholder="Add person..."
                  value={newPerson}
                  onChange={e => setNewPerson(e.target.value)}
                  className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-[13px] w-32 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                />
                <button type="submit" className="w-7 h-7 rounded-full bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center hover:bg-[#4F46E5]/20 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* RACI Table */}
      <section className="relative z-10 px-5 pb-6">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-5 overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr>
                  <th className="text-left text-[12px] font-semibold text-gray-500 uppercase tracking-wider pb-3 pr-3 min-w-[200px]">
                    Task / Decision
                  </th>
                  {people.map(p => (
                    <th key={p} className="text-center text-[12px] font-semibold text-gray-500 uppercase tracking-wider pb-3 px-2 min-w-[60px]">
                      {p}
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-gray-100">
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        placeholder={`Task ${ri + 1}`}
                        value={row.task}
                        onChange={e => updateTask(ri, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                      />
                    </td>
                    {people.map(p => {
                      const v = row.assignments[p] || ''
                      return (
                        <td key={p} className="py-2 px-2 text-center">
                          <button
                            onClick={() => cycleRaci(ri, p)}
                            className={`w-9 h-9 rounded-lg font-bold text-[14px] transition-all hover:scale-105 ${RACI_COLORS[v]}`}
                          >
                            {v || '-'}
                          </button>
                        </td>
                      )
                    })}
                    <td className="py-2">
                      <button onClick={() => removeRow(ri)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={addRow}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add task
              </button>
              {filledRows.length > 0 && (
                <button
                  onClick={exportPdf}
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </button>
              )}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-5 pb-12">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-6 md:p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-6 h-6 text-[#4F46E5]" />
            </div>
            <h2 className="text-[17px] font-bold text-[#1a1a2e] mb-2">Track decisions, not just assignments</h2>
            <p className="text-[14px] text-gray-500 mb-5 max-w-md mx-auto">
              Reattend captures the context behind every decision and assignment, so your team always knows who decided what and why.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
            >
              Try Reattend free <ArrowRight className="w-4 h-4" />
            </Link>
          </GlassCard>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 px-5 pb-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[22px] font-bold text-center mb-6">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <FAQItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
