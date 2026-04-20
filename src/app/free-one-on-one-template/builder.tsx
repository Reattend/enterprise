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
  Users,
  CheckCircle2,
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

interface QuestionCategory {
  title: string
  emoji: string
  questions: string[]
}

const QUESTION_BANK: QuestionCategory[] = [
  {
    title: 'Check-in',
    emoji: '👋',
    questions: [
      'How are you doing this week?',
      'What is on your mind?',
      'How is your workload feeling?',
      'Is there anything outside of work affecting you?',
    ],
  },
  {
    title: 'Progress & Priorities',
    emoji: '🎯',
    questions: [
      'What are you most proud of since our last 1-on-1?',
      'What are your top priorities this week?',
      'Is anything blocking your progress?',
      'Do you need any decisions from me?',
    ],
  },
  {
    title: 'Feedback',
    emoji: '💬',
    questions: [
      'Do you have any feedback for me?',
      'Is there anything I could do differently to support you better?',
      'How do you feel about the feedback you have been getting?',
      'Is there a recent win you feel was not recognized?',
    ],
  },
  {
    title: 'Growth & Career',
    emoji: '🚀',
    questions: [
      'What skills do you want to develop?',
      'Where do you see yourself in 6 months?',
      'Is your current work aligned with your career goals?',
      'Is there a project or responsibility you would like to take on?',
    ],
  },
  {
    title: 'Team & Culture',
    emoji: '🤝',
    questions: [
      'How is the team dynamic feeling?',
      'Is there anyone on the team you would like to collaborate with more?',
      'Do you feel like you have enough context about team decisions?',
      'Is there anything about our team processes you would change?',
    ],
  },
]

interface Props {
  faqItems: Array<{ question: string; answer: string }>
}

export function OneOnOneBuilder({ faqItems }: Props) {
  const [managerName, setManagerName] = useState('')
  const [reportName, setReportName] = useState('')
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([
    'How are you doing this week?',
    'What are your top priorities this week?',
    'Is anything blocking your progress?',
    'Do you have any feedback for me?',
  ])
  const [customQuestion, setCustomQuestion] = useState('')

  function toggleQuestion(q: string) {
    if (selectedQuestions.includes(q)) {
      setSelectedQuestions(selectedQuestions.filter(sq => sq !== q))
    } else {
      setSelectedQuestions([...selectedQuestions, q])
    }
  }

  function addCustomQuestion() {
    const q = customQuestion.trim()
    if (!q) return
    setSelectedQuestions([...selectedQuestions, q])
    setCustomQuestion('')
  }

  function removeSelected(idx: number) {
    setSelectedQuestions(selectedQuestions.filter((_, i) => i !== idx))
  }

  function exportPdf() {
    const w = window.open('', '_blank')
    if (!w) return
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const questionsHtml = selectedQuestions
      .map((q, i) => `<div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #f3f4f6">
        <span style="color:#4F46E5;font-weight:700;font-size:14px;min-width:24px">${i + 1}.</span>
        <div style="flex:1">
          <p style="margin:0 0 8px;font-weight:600;font-size:15px;color:#1a1a2e">${q}</p>
          <div style="height:48px;border:1px dashed #e5e7eb;border-radius:8px;background:#fafafa"></div>
        </div>
      </div>`)
      .join('')

    w.document.write(`<!DOCTYPE html><html><head><title>1-on-1 Agenda</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#1a1a2e;max-width:700px;margin:0 auto}
      h1{font-size:24px;margin-bottom:4px}
      .meta{color:#666;font-size:14px;margin-bottom:24px}
      .footer{margin-top:32px;font-size:12px;color:#999;border-top:1px solid #e5e7eb;padding-top:16px}</style></head>
      <body>
      <h1>1-on-1 Meeting Agenda</h1>
      <div class="meta">
        ${managerName && reportName ? `<p>${managerName} &amp; ${reportName}</p>` : ''}
        <p>${date}</p>
      </div>
      ${questionsHtml}
      <div style="margin-top:24px;padding:16px;background:#f8f7ff;border-radius:12px;border:1px solid #e8e5ff">
        <p style="margin:0;font-weight:600;font-size:14px;color:#4F46E5">Notes & Action Items</p>
        <div style="height:100px;margin-top:8px"></div>
      </div>
      <div class="footer">Created with Reattend Free 1-on-1 Template | reattend.com</div>
      </body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
      <Navbar />

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />

      {/* Hero */}
      <section className="relative z-10 pt-16 md:pt-20 pb-8 px-5 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
            <Users className="w-3.5 h-3.5" />
            Free tool
          </span>
          <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.1]">
            1-on-1 Meeting <span className="text-[#4F46E5]">Template</span>
          </h1>
          <p className="text-gray-500 mt-4 text-[15px] max-w-xl mx-auto">
            Build a better 1-on-1 agenda in seconds. Pick from proven questions, add your own, and export as PDF.
          </p>
        </motion.div>
      </section>

      {/* Names */}
      <section className="relative z-10 px-5 pb-4">
        <div className="max-w-2xl mx-auto">
          <GlassCard className="p-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-semibold text-gray-700 mb-1.5 block">Manager name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={managerName}
                  onChange={e => setManagerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-700 mb-1.5 block">Report name</label>
                <input
                  type="text"
                  placeholder="Team member's name"
                  value={reportName}
                  onChange={e => setReportName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
                />
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Question bank */}
      <section className="relative z-10 px-5 pb-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {QUESTION_BANK.map(cat => (
            <GlassCard key={cat.title} className="p-5">
              <h2 className="text-[14px] font-bold text-[#1a1a2e] mb-3">
                {cat.emoji} {cat.title}
              </h2>
              <div className="space-y-2">
                {cat.questions.map(q => {
                  const selected = selectedQuestions.includes(q)
                  return (
                    <button
                      key={q}
                      onClick={() => toggleQuestion(q)}
                      className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] transition-all ${
                        selected
                          ? 'bg-[#4F46E5]/5 text-[#4F46E5] font-medium'
                          : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${selected ? 'text-[#4F46E5]' : 'text-gray-300'}`} />
                      {q}
                    </button>
                  )
                })}
              </div>
            </GlassCard>
          ))}

          {/* Custom question */}
          <GlassCard className="p-5">
            <h2 className="text-[14px] font-bold text-[#1a1a2e] mb-3">✏️ Add your own question</h2>
            <form onSubmit={e => { e.preventDefault(); addCustomQuestion() }} className="flex gap-2">
              <input
                type="text"
                placeholder="Type a custom question..."
                value={customQuestion}
                onChange={e => setCustomQuestion(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20"
              />
              <button type="submit" className="px-4 py-2.5 rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] font-semibold text-[13px] hover:bg-[#4F46E5]/20 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </GlassCard>
        </div>
      </section>

      {/* Selected agenda */}
      <section className="relative z-10 px-5 pb-6">
        <div className="max-w-2xl mx-auto">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-bold text-[#1a1a2e]">Your agenda ({selectedQuestions.length} questions)</h2>
              {selectedQuestions.length > 0 && (
                <button
                  onClick={exportPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </button>
              )}
            </div>
            {selectedQuestions.length === 0 ? (
              <p className="text-[14px] text-gray-400">Select questions from above to build your agenda.</p>
            ) : (
              <div className="space-y-2">
                {selectedQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                    <span className="text-[12px] font-bold text-[#4F46E5] min-w-[20px]">{i + 1}</span>
                    <span className="text-[14px] text-gray-700 flex-1">{q}</span>
                    <button onClick={() => removeSelected(i)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-5 pb-12">
        <div className="max-w-2xl mx-auto">
          <GlassCard className="p-6 md:p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-6 h-6 text-[#4F46E5]" />
            </div>
            <h2 className="text-[17px] font-bold text-[#1a1a2e] mb-2">Remember every 1-on-1 conversation</h2>
            <p className="text-[14px] text-gray-500 mb-5 max-w-md mx-auto">
              Reattend captures decisions and action items from your 1-on-1s so nothing falls through the cracks between meetings.
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
