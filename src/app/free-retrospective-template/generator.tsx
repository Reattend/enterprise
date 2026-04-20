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
  RotateCcw,
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

interface RetroFormat {
  id: string
  name: string
  description: string
  columns: { title: string; color: string; prompt: string }[]
}

const FORMATS: RetroFormat[] = [
  {
    id: 'ssc',
    name: 'Start / Stop / Continue',
    description: 'The classic format. What should the team start doing, stop doing, and continue doing?',
    columns: [
      { title: 'Start', color: '#10b981', prompt: 'What should we start doing?' },
      { title: 'Stop', color: '#ef4444', prompt: 'What should we stop doing?' },
      { title: 'Continue', color: '#4F46E5', prompt: 'What should we keep doing?' },
    ],
  },
  {
    id: '4ls',
    name: '4Ls',
    description: 'Reflect on what was Liked, Learned, Lacked, and Longed For.',
    columns: [
      { title: 'Liked', color: '#10b981', prompt: 'What did we enjoy?' },
      { title: 'Learned', color: '#4F46E5', prompt: 'What did we learn?' },
      { title: 'Lacked', color: '#f59e0b', prompt: 'What was missing?' },
      { title: 'Longed For', color: '#ef4444', prompt: 'What do we wish we had?' },
    ],
  },
  {
    id: 'msg',
    name: 'Mad / Sad / Glad',
    description: 'Focus on team emotions. What made the team mad, sad, or glad?',
    columns: [
      { title: 'Mad', color: '#ef4444', prompt: 'What frustrated us?' },
      { title: 'Sad', color: '#f59e0b', prompt: 'What disappointed us?' },
      { title: 'Glad', color: '#10b981', prompt: 'What made us happy?' },
    ],
  },
  {
    id: 'wwww',
    name: 'What Went Well / What Did Not / What Next',
    description: 'Simple and effective. Good for teams new to retrospectives.',
    columns: [
      { title: 'What Went Well', color: '#10b981', prompt: 'What worked?' },
      { title: 'What Did Not', color: '#ef4444', prompt: 'What did not work?' },
      { title: 'What Next', color: '#4F46E5', prompt: 'What will we do differently?' },
    ],
  },
]

interface Props {
  faqItems: Array<{ question: string; answer: string }>
}

export function RetroGenerator({ faqItems }: Props) {
  const [selectedFormat, setSelectedFormat] = useState<RetroFormat>(FORMATS[0])
  const [sprintName, setSprintName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [columnItems, setColumnItems] = useState<Record<string, string[]>>({})
  const [newItems, setNewItems] = useState<Record<string, string>>({})
  const [actionItems, setActionItems] = useState<string[]>([])
  const [newAction, setNewAction] = useState('')

  function getItems(col: string): string[] {
    return columnItems[col] || []
  }

  function addItem(col: string) {
    const text = (newItems[col] || '').trim()
    if (!text) return
    setColumnItems({ ...columnItems, [col]: [...getItems(col), text] })
    setNewItems({ ...newItems, [col]: '' })
  }

  function removeItem(col: string, idx: number) {
    setColumnItems({ ...columnItems, [col]: getItems(col).filter((_, i) => i !== idx) })
  }

  function addAction() {
    const text = newAction.trim()
    if (!text) return
    setActionItems([...actionItems, text])
    setNewAction('')
  }

  function removeAction(idx: number) {
    setActionItems(actionItems.filter((_, i) => i !== idx))
  }

  function switchFormat(f: RetroFormat) {
    setSelectedFormat(f)
    setColumnItems({})
    setNewItems({})
  }

  function exportPdf() {
    const w = window.open('', '_blank')
    if (!w) return
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const columnsHtml = selectedFormat.columns
      .map(col => {
        const items = getItems(col.title)
        const itemsHtml = items.length
          ? items.map(it => `<li style="padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:14px">${it}</li>`).join('')
          : '<li style="padding:6px 0;color:#999;font-size:14px;font-style:italic">No items added</li>'
        return `<div style="flex:1;min-width:200px">
          <h3 style="font-size:15px;font-weight:700;margin-bottom:8px;color:${col.color}">${col.title}</h3>
          <p style="font-size:12px;color:#666;margin-bottom:12px">${col.prompt}</p>
          <ul style="list-style:none;padding:0;margin:0">${itemsHtml}</ul>
        </div>`
      })
      .join('')

    const actionsHtml = actionItems.length
      ? actionItems.map((a, i) => `<li style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px"><strong>${i + 1}.</strong> ${a}</li>`).join('')
      : '<li style="padding:8px 0;color:#999;font-size:14px;font-style:italic">No action items</li>'

    w.document.write(`<!DOCTYPE html><html><head><title>Retrospective - ${selectedFormat.name}</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#1a1a2e;max-width:900px;margin:0 auto}
      h1{font-size:24px;margin-bottom:4px}h2{font-size:18px;margin-top:32px;margin-bottom:12px}
      .meta{color:#666;font-size:14px;margin-bottom:24px}
      .cols{display:flex;gap:24px;flex-wrap:wrap}
      .footer{margin-top:32px;font-size:12px;color:#999;border-top:1px solid #e5e7eb;padding-top:16px}</style></head>
      <body>
      <h1>${selectedFormat.name} Retrospective</h1>
      <div class="meta">
        ${sprintName ? `<p><strong>Sprint:</strong> ${sprintName}</p>` : ''}
        ${teamName ? `<p><strong>Team:</strong> ${teamName}</p>` : ''}
        <p>${date}</p>
      </div>
      <div class="cols">${columnsHtml}</div>
      <h2>Action Items</h2>
      <ul style="list-style:none;padding:0">${actionsHtml}</ul>
      <div class="footer">Created with Reattend Free Retrospective Template | reattend.com</div>
      </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  const hasContent = Object.values(columnItems).some(arr => arr.length > 0)

  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
      <Navbar />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-20 pb-8 px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
            <RotateCcw className="w-3.5 h-3.5" />
            Free tool
          </span>
          <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.1]">
            Retrospective <span className="text-[#4F46E5]">Template</span>
          </h1>
          <p className="text-gray-500 mt-4 text-[15px] max-w-xl mx-auto">
            Choose a retro format, add items, and export a clean template as PDF. Free for agile teams.
          </p>
        </motion.div>
      </section>

      {/* Format selector */}
      <section className="relative z-10 px-5 pb-4">
        <div className="max-w-3xl mx-auto">
          <GlassCard className="p-5">
            <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Choose a format</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  onClick={() => switchFormat(f)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selectedFormat.id === f.id
                      ? 'border-[#4F46E5] bg-[#4F46E5]/5'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="text-[14px] font-semibold text-[#1a1a2e]">{f.name}</div>
                  <div className="text-[12px] text-gray-500 mt-0.5">{f.description}</div>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Sprint info */}
      <section className="relative z-10 px-5 pb-4">
        <div className="max-w-3xl mx-auto">
          <GlassCard className="p-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-semibold text-gray-700 mb-1.5 block">Sprint name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Sprint 14"
                  value={sprintName}
                  onChange={e => setSprintName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-700 mb-1.5 block">Team name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Platform Team"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                />
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Retro columns */}
      <section className="relative z-10 px-5 pb-4">
        <div className="max-w-3xl mx-auto">
          <div className={`grid gap-4 ${selectedFormat.columns.length === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
            {selectedFormat.columns.map(col => (
              <GlassCard key={col.title} className="p-5">
                <h3 className="text-[14px] font-bold mb-1" style={{ color: col.color }}>
                  {col.title}
                </h3>
                <p className="text-[12px] text-gray-500 mb-3">{col.prompt}</p>

                <div className="space-y-1.5 mb-3">
                  {getItems(col.title).map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 bg-white rounded-lg px-2.5 py-2 border border-gray-100 text-[13px] text-gray-700">
                      <span className="flex-1">{item}</span>
                      <button onClick={() => removeItem(col.title, i)} className="text-gray-300 hover:text-red-500 mt-0.5">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={e => { e.preventDefault(); addItem(col.title) }} className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Add item..."
                    value={newItems[col.title] || ''}
                    onChange={e => setNewItems({ ...newItems, [col.title]: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                  />
                  <button type="submit" className="px-2.5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                    <Plus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </form>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Action items */}
      <section className="relative z-10 px-5 pb-6">
        <div className="max-w-3xl mx-auto">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold text-[#1a1a2e]">Action Items</h2>
              {hasContent && (
                <button
                  onClick={exportPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </button>
              )}
            </div>

            <div className="space-y-1.5 mb-3">
              {actionItems.map((a, i) => (
                <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 border border-gray-100">
                  <span className="text-[12px] font-bold text-[#4F46E5] min-w-[20px]">{i + 1}</span>
                  <span className="text-[13px] text-gray-700 flex-1">{a}</span>
                  <button onClick={() => removeAction(i)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={e => { e.preventDefault(); addAction() }} className="flex gap-2">
              <input
                type="text"
                placeholder="Add an action item with owner and deadline..."
                value={newAction}
                onChange={e => setNewAction(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
              />
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] font-semibold text-[13px] hover:bg-[#4F46E5]/20 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </GlassCard>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-5 pb-12">
        <div className="max-w-3xl mx-auto">
          <GlassCard className="p-6 md:p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-6 h-6 text-[#4F46E5]" />
            </div>
            <h2 className="text-[17px] font-bold text-[#1a1a2e] mb-2">Turn retro insights into lasting knowledge</h2>
            <p className="text-[14px] text-gray-500 mb-5 max-w-md mx-auto">
              Reattend captures your team's decisions and learnings so they are never lost between sprints.
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
