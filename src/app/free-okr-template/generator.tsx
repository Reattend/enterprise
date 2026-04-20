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
  Target,
  Sparkles,
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

interface KeyResult {
  text: string
  progress: number
}

interface Objective {
  title: string
  owner: string
  keyResults: KeyResult[]
}

interface OkrExample {
  name: string
  objectives: Objective[]
}

const EXAMPLES: OkrExample[] = [
  {
    name: 'Product Team',
    objectives: [
      {
        title: 'Improve product adoption and engagement',
        owner: 'Product Lead',
        keyResults: [
          { text: 'Increase weekly active users from 5,000 to 8,000', progress: 0 },
          { text: 'Reduce onboarding drop-off rate from 40% to 20%', progress: 0 },
          { text: 'Increase feature adoption rate to 60% for top 3 features', progress: 0 },
        ],
      },
      {
        title: 'Ship a best-in-class search experience',
        owner: 'Engineering Lead',
        keyResults: [
          { text: 'Reduce average search latency to under 200ms', progress: 0 },
          { text: 'Increase search success rate from 65% to 85%', progress: 0 },
          { text: 'Launch semantic search in beta with 100 users', progress: 0 },
        ],
      },
    ],
  },
  {
    name: 'Marketing Team',
    objectives: [
      {
        title: 'Grow organic traffic and brand awareness',
        owner: 'Marketing Lead',
        keyResults: [
          { text: 'Increase organic traffic from 10K to 25K monthly visits', progress: 0 },
          { text: 'Publish 12 blog posts that rank on page 1 for target keywords', progress: 0 },
          { text: 'Grow email list from 2,000 to 5,000 subscribers', progress: 0 },
        ],
      },
    ],
  },
  {
    name: 'Engineering Team',
    objectives: [
      {
        title: 'Improve system reliability and developer experience',
        owner: 'Engineering Manager',
        keyResults: [
          { text: 'Achieve 99.9% uptime across all services', progress: 0 },
          { text: 'Reduce deploy time from 15 minutes to under 5 minutes', progress: 0 },
          { text: 'Reduce critical bug count from 12 to 3', progress: 0 },
        ],
      },
    ],
  },
]

interface Props {
  faqItems: Array<{ question: string; answer: string }>
}

export function OkrGenerator({ faqItems }: Props) {
  const [teamName, setTeamName] = useState('')
  const [quarter, setQuarter] = useState('Q1 2026')
  const [objectives, setObjectives] = useState<Objective[]>([
    { title: '', owner: '', keyResults: [{ text: '', progress: 0 }] },
  ])

  function loadExample(ex: OkrExample) {
    setObjectives(ex.objectives)
    setTeamName(ex.name)
  }

  function addObjective() {
    setObjectives([...objectives, { title: '', owner: '', keyResults: [{ text: '', progress: 0 }] }])
  }

  function removeObjective(idx: number) {
    if (objectives.length <= 1) return
    setObjectives(objectives.filter((_, i) => i !== idx))
  }

  function updateObjective(idx: number, field: 'title' | 'owner', value: string) {
    const updated = [...objectives]
    updated[idx] = { ...updated[idx], [field]: value }
    setObjectives(updated)
  }

  function addKeyResult(objIdx: number) {
    const updated = [...objectives]
    updated[objIdx] = { ...updated[objIdx], keyResults: [...updated[objIdx].keyResults, { text: '', progress: 0 }] }
    setObjectives(updated)
  }

  function removeKeyResult(objIdx: number, krIdx: number) {
    const updated = [...objectives]
    if (updated[objIdx].keyResults.length <= 1) return
    updated[objIdx] = { ...updated[objIdx], keyResults: updated[objIdx].keyResults.filter((_, i) => i !== krIdx) }
    setObjectives(updated)
  }

  function updateKeyResult(objIdx: number, krIdx: number, text: string) {
    const updated = [...objectives]
    updated[objIdx].keyResults[krIdx] = { ...updated[objIdx].keyResults[krIdx], text }
    setObjectives(updated)
  }

  function updateProgress(objIdx: number, krIdx: number, progress: number) {
    const updated = [...objectives]
    updated[objIdx].keyResults[krIdx] = { ...updated[objIdx].keyResults[krIdx], progress }
    setObjectives(updated)
  }

  function exportPdf() {
    const w = window.open('', '_blank')
    if (!w) return

    const objectivesHtml = objectives
      .filter(o => o.title.trim())
      .map((o, oi) => {
        const krsHtml = o.keyResults
          .filter(kr => kr.text.trim())
          .map((kr, ki) => {
            const pct = kr.progress
            const barColor = pct >= 70 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#e5e7eb'
            return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f3f4f6">
              <span style="font-size:13px;color:#666;min-width:32px">KR${ki + 1}</span>
              <span style="flex:1;font-size:14px">${kr.text}</span>
              <div style="width:80px;height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:${barColor};border-radius:4px"></div>
              </div>
              <span style="font-size:13px;font-weight:600;color:${barColor};min-width:36px;text-align:right">${pct}%</span>
            </div>`
          })
          .join('')

        return `<div style="margin-bottom:32px;page-break-inside:avoid">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <span style="font-size:13px;font-weight:700;color:#4F46E5;background:#f0efff;padding:4px 10px;border-radius:6px">O${oi + 1}</span>
            <h3 style="margin:0;font-size:17px;font-weight:700">${o.title}</h3>
          </div>
          ${o.owner ? `<p style="font-size:13px;color:#666;margin:0 0 12px;padding-left:44px">Owner: ${o.owner}</p>` : ''}
          <div style="padding-left:44px">${krsHtml}</div>
        </div>`
      })
      .join('')

    w.document.write(`<!DOCTYPE html><html><head><title>OKRs - ${quarter}</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#1a1a2e;max-width:800px;margin:0 auto}
      h1{font-size:24px;margin-bottom:4px}
      .meta{color:#666;font-size:14px;margin-bottom:32px}
      .footer{margin-top:32px;font-size:12px;color:#999;border-top:1px solid #e5e7eb;padding-top:16px}</style></head>
      <body>
      <h1>OKRs ${quarter}</h1>
      <div class="meta">
        ${teamName ? `<p><strong>Team:</strong> ${teamName}</p>` : ''}
      </div>
      ${objectivesHtml}
      <div class="footer">Created with Reattend Free OKR Template | reattend.com</div>
      </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  const hasContent = objectives.some(o => o.title.trim())

  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
      <Navbar />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-20 pb-8 px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
            <Target className="w-3.5 h-3.5" />
            Free tool
          </span>
          <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.1]">
            OKR <span className="text-[#4F46E5]">Template</span>
          </h1>
          <p className="text-gray-500 mt-4 text-[15px] max-w-xl mx-auto">
            Create Objectives and Key Results for your team. Start from examples or build from scratch. Export as PDF.
          </p>
        </motion.div>
      </section>

      {/* Examples */}
      <section className="relative z-10 px-5 pb-4">
        <div className="max-w-2xl mx-auto">
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#4F46E5]" />
              <h2 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider">Start from an example</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(ex => (
                <button
                  key={ex.name}
                  onClick={() => loadExample(ex)}
                  className="text-[13px] font-medium text-[#4F46E5] bg-[#4F46E5]/5 hover:bg-[#4F46E5]/10 px-3 py-1.5 rounded-full transition-colors"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Team info */}
      <section className="relative z-10 px-5 pb-4">
        <div className="max-w-2xl mx-auto">
          <GlassCard className="p-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-semibold text-gray-700 mb-1.5 block">Team name</label>
                <input
                  type="text"
                  placeholder="e.g., Product Team"
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-700 mb-1.5 block">Quarter</label>
                <select
                  value={quarter}
                  onChange={e => setQuarter(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                >
                  <option>Q1 2026</option>
                  <option>Q2 2026</option>
                  <option>Q3 2026</option>
                  <option>Q4 2026</option>
                </select>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Objectives */}
      <section className="relative z-10 px-5 pb-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {objectives.map((obj, oi) => (
            <GlassCard key={oi} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-bold text-[#4F46E5] bg-[#4F46E5]/5 px-2.5 py-1 rounded-lg">
                  Objective {oi + 1}
                </span>
                <button onClick={() => removeObjective(oi)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                type="text"
                placeholder="What do you want to achieve?"
                value={obj.title}
                onChange={e => updateObjective(oi, 'title', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 mb-2"
              />
              <input
                type="text"
                placeholder="Owner (optional)"
                value={obj.owner}
                onChange={e => updateObjective(oi, 'owner', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 mb-4"
              />

              <div className="space-y-2">
                {obj.keyResults.map((kr, ki) => (
                  <div key={ki} className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-gray-400 min-w-[28px]">KR{ki + 1}</span>
                    <input
                      type="text"
                      placeholder="Measurable outcome..."
                      value={kr.text}
                      onChange={e => updateKeyResult(oi, ki, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                    />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={10}
                      value={kr.progress}
                      onChange={e => updateProgress(oi, ki, parseInt(e.target.value))}
                      className="w-16 accent-[#4F46E5]"
                    />
                    <span className="text-[12px] font-semibold text-gray-500 min-w-[32px] text-right">{kr.progress}%</span>
                    <button onClick={() => removeKeyResult(oi, ki)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addKeyResult(oi)}
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors"
              >
                <Plus className="w-3 h-3" /> Add key result
              </button>
            </GlassCard>
          ))}

          <div className="flex items-center gap-3">
            <button
              onClick={addObjective}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#4F46E5] hover:text-[#4338CA] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add objective
            </button>
            {hasContent && (
              <button
                onClick={exportPdf}
                className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-5 pb-12">
        <div className="max-w-2xl mx-auto">
          <GlassCard className="p-6 md:p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-6 h-6 text-[#4F46E5]" />
            </div>
            <h2 className="text-[17px] font-bold text-[#1a1a2e] mb-2">Track goals with your team's shared memory</h2>
            <p className="text-[14px] text-gray-500 mb-5 max-w-md mx-auto">
              Reattend captures the decisions and context behind your OKRs so your team stays aligned all quarter.
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
