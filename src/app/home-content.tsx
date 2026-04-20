'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Sparkles,
  Search,
  Zap,
  Shield,
  Lock,
  Eye,
  Check,
  Brain,
  Monitor,
  Mic,
  UserCheck,
  MessageSquare,
  FileText,
  Lightbulb,
  Clock,
  BarChart3,
  Layers,
} from 'lucide-react'
import { Navbar } from '@/components/landing/navbar'
import { FAQAccordion } from '@/components/landing/faq'
import { Footer } from '@/components/landing/footer'


/* ─── Animated headline ─── */
function AnimatedHeadline({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(' ')
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, delay: delay + i * 0.08 }}
          className="inline-block mr-[0.3em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}


/* ─── Scroll reveal ─── */
function ScrollReveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}


/* ─── Animated number ─── */
function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const dur = 1200
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1)
      setVal(Math.round(p * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, target])

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}


/* ─── Animated screen capture demo ─── */
function ScreenCaptureAnimation() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const timer = setInterval(() => setStep(s => (s + 1) % 4), 2200)
    return () => clearInterval(timer)
  }, [isInView])

  const apps = [
    { name: 'Chrome', color: '#4285F4', text: 'Q1 pricing: $12/mo for Pro tier, enterprise custom...', tag: 'decision' },
    { name: 'Slack', color: '#E01E5A', text: 'Sarah: Let\'s ship the MVP by Friday. John: Agreed.', tag: 'action item' },
    { name: 'Gmail', color: '#EA4335', text: 'Re: Partnership -They agreed to 30% rev share...', tag: 'insight' },
    { name: 'Notion', color: '#000', text: 'Sprint retro: Need better error handling in auth flow', tag: 'context' },
  ]

  const current = apps[step]

  return (
    <div ref={ref} className="relative w-full h-full">
      <div className="absolute inset-0 rounded-xl bg-white border border-gray-200/80 shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50/80 border-b border-gray-100">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <AnimatePresence mode="wait">
            <motion.span
              key={current.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="ml-2 text-[10px] font-medium text-gray-400"
            >
              {current.name}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex-1 p-3 flex flex-col justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-1.5">
                <div className="h-1.5 bg-gray-100 rounded-full w-full" />
                <div className="h-1.5 bg-gray-100 rounded-full w-4/5" />
                <div className="h-1.5 bg-gray-100 rounded-full w-3/5" />
              </div>
              <p className="text-[9px] text-gray-500 mt-2 leading-relaxed line-clamp-2">{current.text}</p>
            </motion.div>
          </AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mt-2"
          >
            <div className="flex items-center gap-1.5">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"
              />
              <span className="text-[8px] text-gray-400">Captured</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.span
                key={current.tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${
                  current.tag === 'decision' ? 'text-emerald-600 bg-emerald-50' :
                  current.tag === 'action item' ? 'text-indigo-600 bg-indigo-50' :
                  current.tag === 'insight' ? 'text-amber-600 bg-amber-50' :
                  'text-blue-600 bg-blue-50'
                }`}
              >
                {current.tag}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
      <motion.div
        animate={{ y: ['0%', '100%', '0%'] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
        className="absolute left-1 right-1 h-[2px] bg-gradient-to-r from-transparent via-[#4F46E5]/40 to-transparent rounded-full"
        style={{ top: '30%' }}
      />
    </div>
  )
}


/* ─── Meeting recording animation ─── */
function MeetingAnimation() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const timer = setInterval(() => setSeconds(s => (s + 1) % 60), 1000)
    return () => clearInterval(timer)
  }, [isInView])

  const waveformBars = 24

  return (
    <div ref={ref} className="relative w-full h-full rounded-xl bg-gradient-to-br from-[#4F46E5]/[0.03] to-white border border-gray-200/80 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-2 h-2 rounded-full bg-red-500"
          />
          <span className="text-[9px] font-semibold text-red-500">REC</span>
        </div>
        <span className="text-[10px] font-mono text-gray-400">
          {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center px-3 gap-[2px]">
        {Array.from({ length: waveformBars }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              height: isInView ? ['8px', `${12 + Math.random() * 20}px`, '8px'] : '8px',
            }}
            transition={{
              repeat: Infinity,
              duration: 0.6 + Math.random() * 0.8,
              delay: i * 0.05,
              ease: 'easeInOut',
            }}
            className="w-[3px] rounded-full bg-gradient-to-t from-[#4F46E5] to-[#818CF8]"
            style={{ minHeight: '4px' }}
          />
        ))}
      </div>
      <div className="px-3 pb-2">
        <div className="bg-gray-50 rounded-lg px-2 py-1.5">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-[8px] text-gray-400"
          >
            Transcribing...
          </motion.div>
          <p className="text-[9px] text-gray-600 mt-0.5 line-clamp-1">&ldquo;Let&rsquo;s finalize the pricing and ship by Friday&rdquo;</p>
        </div>
      </div>
    </div>
  )
}


/* ─── Search animation ─── */
function SearchAnimation() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const [typedText, setTypedText] = useState('')
  const [showResults, setShowResults] = useState(false)
  const fullText = 'pricing decision?'

  useEffect(() => {
    if (!isInView) return
    let i = 0
    setTypedText('')
    setShowResults(false)
    const typeTimer = setInterval(() => {
      i++
      setTypedText(fullText.slice(0, i))
      if (i >= fullText.length) {
        clearInterval(typeTimer)
        setTimeout(() => setShowResults(true), 400)
      }
    }, 80)
    return () => clearInterval(typeTimer)
  }, [isInView])

  const results = [
    { title: 'Q1 pricing sync', match: '98%', type: 'decision' },
    { title: 'User research feedback', match: '89%', type: 'insight' },
    { title: 'Competitor analysis', match: '85%', type: 'context' },
  ]

  return (
    <div ref={ref} className="relative w-full h-full rounded-xl bg-white border border-gray-200/80 overflow-hidden flex flex-col">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-2 border border-gray-200/60">
          <Search className="h-3 w-3 text-[#4F46E5]" />
          <span className="text-[10px] text-gray-700">{typedText}</span>
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
            className="w-[1px] h-3 bg-[#4F46E5]"
          />
        </div>
      </div>
      <div className="flex-1 px-3 pb-3 space-y-1.5 overflow-hidden">
        {results.map((r, i) => (
          <motion.div
            key={r.title}
            initial={{ opacity: 0, y: 8 }}
            animate={showResults ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.3, delay: i * 0.12 }}
            className="flex items-center justify-between bg-gray-50/80 rounded-lg px-2.5 py-1.5 border border-gray-100/80"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                r.type === 'decision' ? 'bg-emerald-500' :
                r.type === 'insight' ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
              <span className="text-[9px] text-gray-600 truncate">{r.title}</span>
            </div>
            <span className="text-[8px] font-semibold text-[#4F46E5] shrink-0 ml-2">{r.match}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}


/* ─── Big animated hero illustration ─── */
function HeroIllustration() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [activeMemory, setActiveMemory] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const timer = setInterval(() => setActiveMemory(s => (s + 1) % 5), 3000)
    return () => clearInterval(timer)
  }, [isInView])

  const memories = [
    { icon: MessageSquare, label: 'Slack: Ship MVP by Friday', color: '#E01E5A', type: 'action item' },
    { icon: FileText, label: 'Email: 30% rev share agreed', color: '#EA4335', type: 'decision' },
    { icon: Mic, label: 'Meeting: Q1 pricing finalized', color: '#4F46E5', type: 'meeting' },
    { icon: Lightbulb, label: 'Idea: Freemium conversion funnel', color: '#F59E0B', type: 'insight' },
    { icon: Monitor, label: 'Code: Auth flow refactored', color: '#10B981', type: 'context' },
  ]

  return (
    <div ref={ref} className="relative w-full max-w-[860px] mx-auto">
      <div className="relative rounded-2xl overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.06)] border border-gray-200/60 bg-white">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#FAFAFA] border-b border-gray-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 px-3 py-0.5 bg-white rounded border border-gray-200/60 text-[10px] text-gray-400 font-medium">
              <Lock className="h-2.5 w-2.5" /> Reattend
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[180px_1fr] min-h-[320px]">
          <div className="bg-[#FAFAFA] border-r border-gray-100 p-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-[#4F46E5] flex items-center justify-center">
                <Brain className="h-3 w-3 text-white" />
              </div>
              <span className="text-[11px] font-bold text-gray-700">Reattend</span>
            </div>
            {['Memories', 'Meetings', 'Search', 'Graph'].map((item, i) => (
              <div key={item} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] mb-0.5 ${i === 0 ? 'bg-[#4F46E5]/8 text-[#4F46E5] font-semibold' : 'text-gray-400'}`}>
                {i === 0 ? <Layers className="h-3 w-3" /> : i === 1 ? <Mic className="h-3 w-3" /> : i === 2 ? <Search className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
                {item}
              </div>
            ))}
            <div className="mt-4 pt-3 border-t border-gray-200/60 space-y-2">
              <div className="text-[9px] text-gray-400">This week</div>
              <div className="text-[20px] font-bold text-gray-800 leading-none">
                <AnimatedNumber target={247} />
              </div>
              <div className="text-[9px] text-gray-400">memories captured</div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[12px] font-bold text-gray-700">Recent Memories</h3>
              <div className="flex items-center gap-1">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-1.5 h-1.5 rounded-full bg-[#22C55E]"
                />
                <span className="text-[9px] text-gray-400">Capturing</span>
              </div>
            </div>

            <div className="space-y-2">
              {memories.map((mem, i) => (
                <motion.div
                  key={mem.label}
                  animate={{
                    backgroundColor: activeMemory === i ? 'rgba(79,70,229,0.04)' : 'rgba(0,0,0,0)',
                    borderColor: activeMemory === i ? 'rgba(79,70,229,0.2)' : 'rgba(229,231,235,0.6)',
                  }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 border"
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${mem.color}15` }}
                  >
                    <mem.icon className="h-3 w-3" style={{ color: mem.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-gray-700 truncate">{mem.label}</div>
                    <div className="text-[8px] text-gray-400 flex items-center gap-1">
                      <Clock className="h-2 w-2" /> 2m ago
                    </div>
                  </div>
                  <span className={`text-[7px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                    mem.type === 'action item' ? 'text-rose-600 bg-rose-50' :
                    mem.type === 'decision' ? 'text-emerald-600 bg-emerald-50' :
                    mem.type === 'meeting' ? 'text-indigo-600 bg-indigo-50' :
                    mem.type === 'insight' ? 'text-amber-600 bg-amber-50' :
                    'text-blue-600 bg-blue-50'
                  }`}>{mem.type}</span>
                  {activeMemory === i && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="absolute -top-4 -right-3 md:right-4 bg-white rounded-xl shadow-lg border border-gray-200/80 px-3 py-2 flex items-center gap-2"
      >
        <div className="w-6 h-6 rounded-full bg-[#22C55E]/10 flex items-center justify-center">
          <Check className="h-3 w-3 text-[#22C55E]" />
        </div>
        <div>
          <div className="text-[9px] font-semibold text-gray-700">Memory saved</div>
          <div className="text-[8px] text-gray-400">Q1 pricing decision</div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 }}
        className="absolute -bottom-3 -left-2 md:left-6 bg-[#111] rounded-xl shadow-lg px-3 py-2 flex items-center gap-2"
      >
        <Sparkles className="h-3 w-3 text-[#818CF8]" />
        <span className="text-[9px] font-semibold text-white">AI organized 12 memories today</span>
      </motion.div>
    </div>
  )
}


/* ─── Animated memory cards for "never lose a decision" section ─── */
function DecisionCardsAnimation() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const timer = setInterval(() => setActive(s => (s + 1) % 4), 2800)
    return () => clearInterval(timer)
  }, [isInView])

  const cards = [
    { icon: FileText, color: '#EA4335', bg: '#EA433510', label: 'Email', title: 'Partnership: 30% rev share agreed', tag: 'decision', time: '3 days ago' },
    { icon: Mic, color: '#4F46E5', bg: '#4F46E510', label: 'Meeting', title: 'Q1 pricing finalized at $20/mo', tag: 'decision', time: '1 week ago' },
    { icon: MessageSquare, color: '#E01E5A', bg: '#E01E5A10', label: 'Slack', title: 'Ship MVP by end of Q1', tag: 'action item', time: '2 days ago' },
    { icon: Lightbulb, color: '#F59E0B', bg: '#F59E0B10', label: 'Note', title: 'Freemium tier converts 3x better', tag: 'insight', time: '5 days ago' },
  ]

  return (
    <div ref={ref} className="relative w-full h-full min-h-[360px] flex flex-col gap-3 justify-center">
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, x: 40 }}
          animate={isInView ? {
            opacity: 1,
            x: 0,
            scale: active === i ? 1.02 : 1,
            borderColor: active === i ? 'rgba(79,70,229,0.25)' : 'rgba(229,231,235,0.6)',
            backgroundColor: active === i ? 'rgba(79,70,229,0.02)' : '#fff',
          } : {}}
          transition={{ duration: 0.5, delay: i * 0.12 }}
          className="flex items-start gap-3 rounded-xl border bg-white px-4 py-3.5 shadow-sm"
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ backgroundColor: card.bg }}
          >
            <card.icon className="h-4 w-4" style={{ color: card.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-[11px] font-medium text-gray-400">{card.label}</span>
              <span className="text-[10px] text-gray-300">{card.time}</span>
            </div>
            <p className="text-[13px] font-semibold text-gray-800 leading-snug">{card.title}</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 self-start mt-0.5 ${
            card.tag === 'decision' ? 'text-emerald-600 bg-emerald-50' :
            card.tag === 'action item' ? 'text-indigo-600 bg-indigo-50' :
            'text-amber-600 bg-amber-50'
          }`}>{card.tag}</span>
        </motion.div>
      ))}

      {/* AI badge floating */}
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
        className="absolute -bottom-4 left-4 bg-[#111] rounded-xl shadow-lg px-3 py-2 flex items-center gap-2"
      >
        <Sparkles className="h-3 w-3 text-[#818CF8]" />
        <span className="text-[9px] font-semibold text-white">0 decisions lost this month</span>
      </motion.div>
    </div>
  )
}


/* ─── Integrations marquee banner ─── */
function IntegrationsBanner() {
  const integrations = [
    { name: 'Google Meet', active: true, color: '#00897B' },
    { name: 'Google Calendar', active: true, color: '#1A73E8' },
    { name: 'Gmail', active: true, color: '#EA4335' },
    { name: 'Slack', active: true, color: '#E01E5A' },
    { name: 'Discord', active: false },
    { name: 'MS Teams', active: false },
    { name: 'Zoom', active: false },
    { name: 'Notion', active: false },
    { name: 'GitHub', active: false },
    { name: 'Linear', active: false },
    { name: 'Jira', active: false },
    { name: 'Figma', active: false },
  ]

  const items = [...integrations, ...integrations]

  return (
    <section className="py-8 border-y border-gray-200/60 bg-white overflow-hidden">
      <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-5">
        Works with your tools
      </p>
      <div className="relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div className="flex gap-3 animate-marquee" style={{ width: 'max-content' }}>
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2 rounded-full border bg-white shrink-0"
              style={{
                borderColor: item.active && item.color ? `${item.color}30` : 'rgba(229,231,235,0.8)',
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.active && item.color ? item.color : '#D1D5DB' }}
              />
              <span
                className="text-[13px] font-medium whitespace-nowrap"
                style={{ color: item.active ? '#374151' : '#9CA3AF' }}
              >
                {item.name}
              </span>
              {!item.active && (
                <span className="text-[9px] text-gray-300 font-medium">soon</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


/* ─── Data ─── */

const faqItems = [
  { question: 'What is Reattend?', answer: 'Reattend is your AI-powered memory layer. It connects to Gmail, Google Calendar, Google Meet, and Slack, then automatically captures, organizes, and makes every decision, meeting, and insight searchable. Never lose context again.' },
  { question: 'Is it really free forever?', answer: 'Yes. The Free plan never expires - no trial, no credit card. You get unlimited memory storage, 20 AI queries per day, 1 integration of your choice, and 10 DeepThink sessions per day. It is a real plan, not a demo.' },
  { question: 'How does the Pro trial work?', answer: 'After signing up, activate a 60-day free Pro trial from inside your dashboard - no credit card needed. At the end, pay $20/month to continue or drop back to Free. Your memories stay either way.' },
  { question: 'What happens if I downgrade?', answer: 'Nothing is lost. All your memories stay in your account. On Free you get 20 AI queries/day, 1 integration, and 10 DeepThink sessions/day.' },
  { question: 'What integrations do you support?', answer: 'Currently live: Gmail, Google Calendar, Google Meet, and Slack. Coming soon: Discord, MS Teams, Zoom, Notion, GitHub, Linear, and more. Free users pick one; Pro and Teams users get all of them.' },
  { question: 'Is my data private?', answer: 'Yes. Every integration and AI call uses encrypted connections. We never sell your data or use it to train models. You can export or delete everything at any time.' },
  { question: 'Is there a Chrome extension?', answer: 'Yes. The Reattend Chrome extension lets you capture from any web page with one click. Works alongside your integrations and is available on the Free plan.' },
  { question: 'Do you offer refunds?', answer: 'Yes. Contact us within 15 days of your payment for a full refund, no questions asked.' },
]

const plans = [
  { name: 'Free Forever', desc: 'For individuals. No credit card.', price: 0, priceLabel: '/ forever', features: ['Unlimited memories', '20 AI queries / day', '10 DeepThink sessions / day', 'Notion integration', 'Chrome extension', 'File import (Read.ai, Obsidian, etc.)'], popular: false, cta: 'Get started free', ctaHref: '/register' },
  { name: 'Pro', desc: 'Unlimited everything.', price: null, priceLabel: '', features: ['Unlimited AI queries', 'Unlimited DeepThink', 'All integrations', 'Semantic search + knowledge graph', 'Priority support'], popular: true, cta: 'Coming Soon', ctaHref: '#' },
  { name: 'Teams', desc: 'For teams that never lose context.', price: null, priceLabel: '', features: ['Everything in Pro', 'Shared team memories', 'Admin dashboard + roles', 'Member management', 'Bulk onboarding'], popular: false, cta: 'Coming Soon', ctaHref: '#' },
]

const howItWorksFeatures = [
  {
    id: 'capture' as const,
    label: 'Passive Capture',
    headline: 'Everything captured, nothing missed',
    desc: 'Reattend runs silently in the background, connecting to your Gmail, Calendar, meetings, and Slack. Every important moment is captured automatically -no manual effort needed.',
  },
  {
    id: 'triage' as const,
    label: 'AI Memory Triage',
    headline: 'Signal, not noise',
    desc: 'Every capture is analyzed by AI: classified by type, linked to related memories, and tagged with entities. Your memory bank stays clean, organized, and meaningful.',
  },
  {
    id: 'recall' as const,
    label: 'Recall Instantly',
    headline: 'Your answers are already there',
    desc: 'Ask natural questions and get answers from your personal memory bank in seconds. "What did we decide about pricing?" -Reattend finds it instantly.',
  },
]


/* ─── Page ─── */

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'capture' | 'triage' | 'recall'>('capture')

  // Auto-rotate how-it-works tabs
  useEffect(() => {
    const tabs: Array<'capture' | 'triage' | 'recall'> = ['capture', 'triage', 'recall']
    let i = 0
    const timer = setInterval(() => {
      i = (i + 1) % tabs.length
      setActiveTab(tabs[i])
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111] overflow-x-hidden">
      <Navbar />

      {/* ══════════ HERO ══════════ */}
      <section className="relative pt-16 md:pt-24 pb-6 md:pb-10 px-5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-gradient-to-br from-[#4F46E5]/6 via-[#818CF8]/4 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-[860px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200/80 shadow-sm text-[13px] font-medium text-gray-600 mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            The memory intelligence system
          </motion.div>

          <h1 className="text-[42px] sm:text-[56px] md:text-[72px] font-bold leading-[1.05] tracking-[-0.04em]">
            <AnimatedHeadline text="Never forget anything" delay={0.2} />
            <br />
            <AnimatedHeadline text="ever again." className="text-[#4F46E5]" delay={0.55} />
            <AnimatedHeadline text="Period." delay={0.8} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="text-[17px] md:text-[19px] text-gray-500 leading-relaxed max-w-[540px] mx-auto mt-6"
          >
            Reattend works with you in organizing your memories. Build your perfect passive brain. Your subconscious memory.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8"
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 text-[15px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.97] transition-all px-7 py-3.5 rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.35)]"
            >
              Get started for free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://calendly.com/pb-reattend/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[15px] font-semibold text-gray-700 bg-white border border-gray-200/80 hover:border-gray-300 hover:shadow-sm active:scale-[0.97] transition-all px-7 py-3.5 rounded-full"
            >
              Book a demo
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-[13px] text-gray-400 mt-4"
          >
            Free forever. No credit card required.
          </motion.p>
        </div>
      </section>

      {/* ══════════ HERO ILLUSTRATION ══════════ */}
      <section className="px-5 pb-12 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[1000px] mx-auto"
        >
          <HeroIllustration />
        </motion.div>
      </section>


      {/* ══════════ INTEGRATIONS BANNER ══════════ */}
      <IntegrationsBanner />


      {/* ══════════ HOW REATTEND WORKS ══════════ */}
      <section id="how-it-works" className="py-14 md:py-20">
        {/* Title row - contained */}
        <div className="px-5 mb-10">
          <div className="max-w-[1060px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
              <ScrollReveal>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4F46E5]/15 bg-[#4F46E5]/5 text-[12px] font-medium text-[#4F46E5] mb-4">
                  <Sparkles className="h-3 w-3" /> How it works
                </span>
                <h2 className="text-[32px] md:text-[44px] font-bold tracking-[-0.03em] leading-[1.1]">
                  How Reattend<br />
                  <span className="text-[#4F46E5]">works</span>
                </h2>
              </ScrollReveal>
              <ScrollReveal delay={0.1}>
                <p className="text-[16px] text-gray-500 leading-relaxed">
                  Reattend is your AI-powered memory layer. It connects to your tools, captures what matters, and organizes everything automatically - so you can focus on thinking, not remembering.
                </p>
              </ScrollReveal>
            </div>
          </div>
        </div>

        {/* Full-width panel */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: blue BG - stretches to screen edge */}
          <div className="bg-gradient-to-br from-[#4F46E5] to-[#6366F1] px-8 md:px-16 py-10 md:py-14 flex flex-col justify-between min-h-[420px]">
            <div>
              <AnimatePresence mode="wait">
                <motion.h3
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="text-[20px] md:text-[24px] font-bold text-white mb-1"
                >
                  {howItWorksFeatures.find(f => f.id === activeTab)?.headline}
                </motion.h3>
              </AnimatePresence>
            </div>
            <div className="flex-1 flex items-center justify-center py-6">
              <div className="w-full max-w-[340px] h-[220px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.35 }}
                    className="w-full h-full"
                  >
                    {activeTab === 'capture' && <ScreenCaptureAnimation />}
                    {activeTab === 'triage' && <MeetingAnimation />}
                    {activeTab === 'recall' && <SearchAnimation />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {howItWorksFeatures.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveTab(f.id)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${activeTab === f.id ? 'bg-white w-6' : 'bg-white/30 w-1.5'}`}
                />
              ))}
            </div>
          </div>

          {/* Right: pills - stretches to screen edge */}
          <div className="px-8 md:px-16 py-10 md:py-14 flex flex-col justify-center gap-4 bg-white border-y border-gray-100">
            {howItWorksFeatures.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setActiveTab(feature.id)}
                className={`text-left rounded-xl border p-5 transition-all duration-300 ${
                  activeTab === feature.id
                    ? 'border-[#4F46E5]/25 bg-[#4F46E5]/[0.03] shadow-sm'
                    : 'border-gray-200/60 hover:border-[#4F46E5]/15 hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-2 h-2 rounded-full transition-colors ${activeTab === feature.id ? 'bg-[#4F46E5]' : 'bg-gray-300'}`} />
                  <span className={`text-[13px] font-semibold transition-colors ${activeTab === feature.id ? 'text-[#4F46E5]' : 'text-gray-400'}`}>
                    {feature.label}
                  </span>
                </div>
                <p className="text-[14px] text-gray-600 leading-relaxed">{feature.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════ NEVER LOSE A DECISION ══════════ */}
      <section className="py-12 md:py-16 px-5 bg-white">
        <div className="max-w-[1060px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left: text */}
            <ScrollReveal>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4F46E5]/15 bg-[#4F46E5]/5 text-[12px] font-medium text-[#4F46E5] mb-4">
                <Brain className="h-3 w-3" /> Never lose context
              </span>
              <h2 className="text-[30px] md:text-[42px] font-bold tracking-[-0.03em] leading-[1.15] mb-5">
                Never forget<br />
                a decision.<br />
                <span className="text-gray-300">Never lose</span><br />
                <span className="text-gray-300">an insight.</span>
              </h2>
              <p className="text-[16px] text-gray-500 leading-relaxed mb-6">
                Every decision made in a meeting, every insight from an email, every action item from Slack -Reattend captures and preserves it all, automatically.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-[14px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-all px-6 py-3 rounded-full shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
              >
                Start remembering everything <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </ScrollReveal>

            {/* Right: animated memory cards */}
            <ScrollReveal delay={0.15}>
              <DecisionCardsAnimation />
            </ScrollReveal>
          </div>
        </div>
      </section>


      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="py-14 md:py-20 px-5">
        <div className="max-w-[1060px] mx-auto">
          <ScrollReveal className="text-center mb-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#4F46E5]/15 bg-[#4F46E5]/5 text-[12px] font-medium text-[#4F46E5] mb-4">
              <Sparkles className="h-3 w-3" /> Features
            </span>
            <h2 className="text-[32px] md:text-[44px] font-bold tracking-[-0.03em]">
              Never forget a meeting.<br />
              <span className="text-[#4F46E5]">Never lose a decision.</span>
            </h2>
          </ScrollReveal>

          {/* Meeting feature -large card */}
          <ScrollReveal className="mb-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-gray-200/60 bg-gradient-to-br from-[#4F46E5]/[0.03] to-white">
              <div className="p-7 md:p-10 flex flex-col justify-center">
                <div className="w-9 h-9 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center mb-4">
                  <Mic className="h-4.5 w-4.5 text-[#4F46E5]" />
                </div>
                <h3 className="text-[24px] md:text-[28px] font-bold tracking-[-0.02em] leading-tight mb-2">
                  Record any meeting.<br />Get notes automatically.
                </h3>
                <p className="text-[15px] text-gray-500 leading-relaxed mb-5">
                  AI transcribes, extracts action items, decisions, and key points -delivered to your memory bank automatically.
                </p>
                <ul className="space-y-1.5">
                  {['Import from Read.ai, Fireflies, Otter', 'AI-extracted action items & decisions', 'Cross-reference with DeepThink', 'Share insights via email or link'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-[13px] text-gray-600">
                      <Check className="h-3.5 w-3.5 text-[#4F46E5] shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 md:p-8 flex items-center justify-center">
                <div className="w-full max-w-[320px] h-[240px]">
                  <MeetingAnimation />
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* 2 feature cards side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <ScrollReveal delay={0.1}>
              <div className="rounded-2xl border border-gray-200/60 bg-white p-6 h-full">
                <div className="w-9 h-9 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center mb-4">
                  <Monitor className="h-4.5 w-4.5 text-[#4F46E5]" />
                </div>
                <h3 className="text-[20px] font-bold tracking-[-0.01em] mb-1.5">Ambient screen capture</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed mb-4">
                  Reads your screen every few seconds via OCR. Emails, Slack, articles, code -captured without you lifting a finger.
                </p>
                <div className="h-[140px]">
                  <ScreenCaptureAnimation />
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="rounded-2xl border border-gray-200/60 bg-white p-6 h-full">
                <div className="w-9 h-9 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center mb-4">
                  <Search className="h-4.5 w-4.5 text-[#4F46E5]" />
                </div>
                <h3 className="text-[20px] font-bold tracking-[-0.01em] mb-1.5">Search by meaning</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed mb-4">
                  &ldquo;What did we decide about pricing?&rdquo; -search by meaning, not keywords. AI finds relevant memories instantly.
                </p>
                <div className="h-[140px]">
                  <SearchAnimation />
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* 3 smaller feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: Brain, title: 'Ask your memory', desc: 'Chat with AI grounded in your actual memories. Get answers about past meetings, decisions, and ideas in seconds.' },
              { icon: Zap, title: 'Writing assist', desc: 'Detects when you\'re writing and proactively suggests relevant context from your past -like Grammarly for memory.' },
              { icon: Sparkles, title: 'Knowledge graph', desc: 'AI links related memories, maps people and topics, and builds a visual graph that grows over time.' },
            ].map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.1}>
                <div className="rounded-2xl border border-gray-200/60 bg-white p-5 h-full hover:shadow-md hover:border-[#4F46E5]/20 transition-all duration-300">
                  <div className="w-9 h-9 rounded-xl bg-[#4F46E5]/10 flex items-center justify-center mb-3">
                    <f.icon className="h-4.5 w-4.5 text-[#4F46E5]" />
                  </div>
                  <h3 className="text-[16px] font-bold mb-1.5">{f.title}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>


      {/* ══════════ SECURITY ══════════ */}
      <section id="security" className="py-14 md:py-20 px-5 bg-white">
        <div className="max-w-[1060px] mx-auto">
          <ScrollReveal>
            <div className="rounded-2xl bg-[#111] p-8 md:p-14 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/20 via-transparent to-[#818CF8]/10" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-5">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-[28px] md:text-[40px] font-bold text-white tracking-[-0.03em] mb-3">
                  Your data is protected. Always.
                </h2>
                <p className="text-[15px] text-gray-400 max-w-md mx-auto mb-8">
                  Every connection to your integrations, every AI call, every byte we process is encrypted. We never sell your data, never train on it, and you can export or delete everything at any time.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-xl mx-auto">
                  {[
                    { icon: Lock, title: 'Encrypted', desc: 'TLS on every integration and API call.' },
                    { icon: Eye, title: 'Never sold', desc: 'Your memories are private. We never sell or train on your data.' },
                    { icon: UserCheck, title: 'You own it', desc: 'Export or delete everything, anytime.' },
                  ].map(item => (
                    <div key={item.title} className="text-center">
                      <item.icon className="h-4.5 w-4.5 text-[#818CF8] mx-auto mb-2" />
                      <h3 className="text-[14px] font-semibold text-white mb-0.5">{item.title}</h3>
                      <p className="text-[12px] text-gray-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>


      {/* ══════════ PLATFORM ══════════ */}
      <section className="py-10 px-5 border-y border-gray-100 bg-[#FAFAFA]">
        <div className="max-w-[1060px] mx-auto">
          <ScrollReveal className="text-center mb-6">
            <p className="text-[12px] font-semibold uppercase tracking-widest text-gray-400">Also available on</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ScrollReveal delay={0.05}>
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-200/60 hover:border-[#4F46E5]/20 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#4285F4]/10 flex items-center justify-center shrink-0">
                  <Monitor className="h-5 w-5 text-[#4285F4]" />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold mb-1">Chrome Extension</h4>
                  <p className="text-[13px] text-gray-500 leading-relaxed">Capture from any web page with one click. Works on Gmail, Notion, Google Docs, and everywhere you browse. Free on all plans.</p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-200/60 transition-all">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Layers className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-[15px] font-bold">Desktop App</h4>
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Coming soon</span>
                  </div>
                  <p className="text-[13px] text-gray-500 leading-relaxed">Browser extension captures what you work on. Import meeting transcripts from Read.ai, Fireflies, or Otter. DeepThink challenges your thinking.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>


      {/* ══════════ PRICING ══════════ */}
      <section id="pricing" className="py-14 md:py-20 px-5">
        <div className="max-w-[960px] mx-auto">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-[32px] md:text-[44px] font-bold tracking-[-0.03em]">
              Free forever.{' '}
              <span className="text-[#4F46E5]">Upgrade when ready.</span>
            </h2>
            <p className="text-[15px] text-gray-500 mt-2">Free forever. 20 queries/day, unlimited memories, DeepThink included.</p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan, i) => (
              <ScrollReveal key={plan.name} delay={i * 0.1}>
                <div className={`relative flex flex-col rounded-2xl border p-5 h-full bg-white ${plan.popular ? 'border-[#4F46E5] shadow-[0_8px_40px_rgba(79,70,229,0.12)]' : 'border-gray-200/60'}`}>
                  {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-white bg-[#4F46E5] px-3 py-0.5 rounded-full whitespace-nowrap">Most Popular</span>}
                  <h3 className="text-[17px] font-bold">{plan.name}</h3>
                  <p className="text-[12px] text-gray-500 mt-0.5">{plan.desc}</p>
                  <div className="mt-3 mb-4">
                    {plan.price !== null ? (
                      <>
                        <span className="text-[32px] font-bold">${plan.price}</span>
                        <span className="text-[12px] text-gray-400 ml-1">{plan.priceLabel}</span>
                      </>
                    ) : (
                      <span className="text-[20px] font-bold text-gray-400">Coming Soon</span>
                    )}
                  </div>
                  <ul className="space-y-2 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-[12px] text-gray-600">
                        <Check className="h-3.5 w-3.5 text-[#4F46E5] mt-0.5 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    <Link href={plan.ctaHref} className={`flex items-center justify-center gap-2 w-full text-center text-[13px] font-semibold rounded-full py-2.5 transition-all active:scale-[0.97] ${plan.popular ? 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)]' : 'border border-gray-200/60 hover:border-[#4F46E5]/30 bg-gray-50 hover:bg-[#4F46E5]/5 text-gray-700'}`}>
                      {plan.cta}
                    </Link>
                    {(plan as any).note && <p className="text-center text-[11px] text-gray-400 mt-1.5">{(plan as any).note}</p>}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.2}>
            <p className="text-center text-[13px] text-gray-400 mt-6">
              All plans include full memory retention. <Link href="/pricing" className="text-[#4F46E5] hover:underline font-medium">See full comparison</Link>
            </p>
          </ScrollReveal>
        </div>
      </section>


      {/* ══════════ FAQ ══════════ */}
      <section id="faq" className="py-14 md:py-20 px-5 bg-white">
        <div className="max-w-[660px] mx-auto">
          <ScrollReveal className="text-center mb-10">
            <h2 className="text-[32px] md:text-[40px] font-bold tracking-[-0.03em]">
              Frequently asked <span className="text-[#4F46E5]">questions</span>
            </h2>
            <p className="text-gray-500 mt-2 text-[15px]">
              Can&apos;t find your answer? <a href="mailto:pb@reattend.ai" className="text-[#4F46E5] font-medium hover:underline">Email us</a>
            </p>
          </ScrollReveal>
          <FAQAccordion items={faqItems} />
        </div>
      </section>


      {/* ══════════ FINAL CTA — full width ══════════ */}
      <section className="relative bg-[#0B0B0F] overflow-hidden py-20 md:py-28 px-5">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4F46E5]/20 via-transparent to-[#818CF8]/10 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-[#4F46E5]/10 blur-3xl pointer-events-none" />
        <ScrollReveal className="relative z-10 max-w-[700px] mx-auto text-center">
          <h2 className="text-[36px] sm:text-[48px] md:text-[58px] font-bold tracking-[-0.04em] leading-[1.1] text-white">
            Stop forgetting.<br />
            <span className="text-[#818CF8]">Start remembering.</span>
          </h2>
          <p className="text-[17px] text-gray-400 mt-5 max-w-md mx-auto leading-relaxed">
            Every meeting, every email, every decision - permanent, searchable, and yours.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-[15px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.97] transition-all px-8 py-3.5 rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.4)]"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://calendly.com/pb-reattend/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[15px] font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Book a demo
            </a>
          </div>
          <p className="text-[13px] text-gray-600 mt-4">Free forever. No credit card required.</p>
        </ScrollReveal>
      </section>


      <Footer />
    </div>
  )
}
