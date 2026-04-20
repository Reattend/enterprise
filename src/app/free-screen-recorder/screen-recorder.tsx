'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Monitor, Mic, Globe, Square, Download, Mail, Copy, Check,
  ArrowRight, Shield, RotateCcw, Bookmark, Lock, Eye, Brain,
} from 'lucide-react'
import { Footer } from '@/components/landing/footer'
import { Navbar } from '@/components/landing/navbar'
import { FAQAccordion } from '@/components/landing/faq'

// ── Types & Constants ──────────────────────────────────────

type Phase = 'idle' | 'recording' | 'done'
type Mode = 'screen' | 'screen-mic' | 'tab'

const MODES: { value: Mode; label: string; desc: string; Icon: typeof Monitor }[] = [
  { value: 'screen', label: 'Screen only', desc: 'Video, no audio', Icon: Monitor },
  { value: 'screen-mic', label: 'Screen + Mic', desc: 'Screen with microphone', Icon: Mic },
  { value: 'tab', label: 'Tab audio', desc: 'Browser tab with its audio', Icon: Globe },
]

const faqItems = [
  {
    question: 'Is this screen recorder really free?',
    answer: 'Yes, completely free. No hidden fees, no premium tiers, no signup required. You can use it as many times as you want.',
  },
  {
    question: 'Where is my video stored?',
    answer: 'Your video stays entirely on your device. Nothing is uploaded to any server. When you close the tab, the recording is gone unless you downloaded it.',
  },
  {
    question: 'Does it upload anything?',
    answer: 'No. The entire recording process happens in your browser. No data leaves your device at any point.',
  },
  {
    question: 'Can I use this for work demos?',
    answer: 'Absolutely. Record presentations, product demos, bug reports, or tutorials. There\'s no watermark, so your recordings look completely professional.',
  },
]

// ── Shared Styles ──────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] ${className}`}>
      {children}
    </div>
  )
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 text-[14px] text-[#1a1a2e] outline-none transition-all placeholder:text-gray-400 focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'

// ── Helpers ────────────────────────────────────────────────

function getVideoMimeType() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ]
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
  }
  return 'video/webm'
}

function getExt(mime: string) {
  if (mime.includes('mp4')) return 'mp4'
  return 'webm'
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ── Component ──────────────────────────────────────────────

export function ScreenRecorder() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [mode, setMode] = useState<Mode>('screen')
  const [duration, setDuration] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [purpose, setPurpose] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)
  const [startTime, setStartTime] = useState<Date | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamsRef = useRef<MediaStream[]>([])
  const stoppedRef = useRef(false)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setSupported(false)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamsRef.current.forEach(s => s.getTracks().forEach(t => t.stop()))
    }
  }, [])

  // ── Recording Controls ───────────────────────────────────

  const stopRecording = useCallback(() => {
    if (stoppedRef.current) return
    stoppedRef.current = true
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    streamsRef.current.forEach(s => s.getTracks().forEach(t => t.stop()))
    streamsRef.current = []
    setPhase('done')
  }, [])

  const startRecording = async () => {
    try {
      setError('')
      stoppedRef.current = false

      let displayStream: MediaStream
      let combinedStream: MediaStream

      if (mode === 'tab') {
        displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        combinedStream = displayStream
        streamsRef.current = [displayStream]
      } else if (mode === 'screen-mic') {
        displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...micStream.getAudioTracks(),
        ])
        streamsRef.current = [displayStream, micStream]
      } else {
        displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        combinedStream = displayStream
        streamsRef.current = [displayStream]
      }

      displayStream.getVideoTracks()[0].addEventListener('ended', stopRecording)

      const mimeType = getVideoMimeType()
      const recorder = new MediaRecorder(combinedStream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setVideoUrl(url)
        setVideoBlob(blob)
      }

      recorder.start(1000)
      setPhase('recording')
      setDuration(0)
      setStartTime(new Date())

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
        setError('Screen sharing was cancelled. Please try again.')
      } else {
        setError('Could not start recording. Please check your browser permissions.')
      }
    }
  }

  // ── Output Helpers ───────────────────────────────────────

  const downloadVideo = () => {
    if (!videoBlob) return
    const ext = getExt(getVideoMimeType())
    const dateSlug = (startTime || new Date()).toISOString().split('T')[0]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(videoBlob)
    a.download = `screen-recording-${dateSlug}.${ext}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const dateStr = () => {
    const d = startTime || new Date()
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const timeStr = () => {
    const d = startTime || new Date()
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const modeLabel = MODES.find(m => m.value === mode)?.label || mode

  // ── Memory Bridge Actions ────────────────────────────────

  const saveToReattend = async () => {
    const text = [
      'Screen Recording',
      '',
      `Date: ${dateStr()} at ${timeStr()}`,
      `Duration: ${formatTime(duration)}`,
      `Type: ${modeLabel}`,
      '',
      `Purpose: ${purpose || '(not specified)'}`,
      `Follow-up: ${followUp || '(none)'}`,
      '',
      'Attach your recording file to this memory.',
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied('memory')
    setTimeout(() => setCopied(null), 3000)
    window.open('/register', '_blank')
  }

  const emailToSelf = () => {
    const subject = encodeURIComponent(`Screen recording – ${dateStr()} ${timeStr()}`)
    const body = encodeURIComponent([
      'Screen Recording',
      '',
      `Date: ${dateStr()} at ${timeStr()}`,
      `Duration: ${formatTime(duration)}`,
      `Type: ${modeLabel}`,
      '',
      `Purpose: ${purpose || '(not specified)'}`,
      `Follow-up: ${followUp || '(none)'}`,
      '',
      'Save this to Reattend for long-term recall:',
      'https://reattend.com/register',
    ].join('\n'))
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const copyRecallNotes = async () => {
    const text = [
      'Screen recording',
      `Date: ${dateStr()}`,
      `Duration: ${formatTime(duration)}`,
      `Purpose: ${purpose || ''}`,
      `Follow-up: ${followUp || ''}`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied('notes')
    setTimeout(() => setCopied(null), 2000)
  }

  const newRecording = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setPhase('idle')
    setDuration(0)
    setVideoUrl(null)
    setVideoBlob(null)
    setPurpose('')
    setFollowUp('')
    setError('')
    setCopied(null)
    setStartTime(null)
    stoppedRef.current = false
  }

  // ────────────────────────────────────────────────────────
  // IDLE STATE
  // ────────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
        <Navbar />

        {/* Background gradient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />

        {/* Hero */}
        <section className="relative z-10 pt-16 md:pt-20 pb-6 px-5 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
              Free tool
            </span>
            <h1 className="text-[36px] md:text-[46px] font-bold tracking-[-0.03em] leading-[1.1]">
              Free Screen <span className="text-[#4F46E5]">Recorder</span>
            </h1>
            <p className="text-gray-500 mt-4 text-[16px] max-w-xl mx-auto">
              Record your screen instantly. No login. No uploads. Runs in your browser.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {['No signup', 'No uploads', 'No watermark', 'Browser-only'].map(badge => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-xl border border-white/80 text-[12px] font-medium text-gray-600"
                >
                  <Check className="w-3 h-3 text-[#4F46E5]" />
                  {badge}
                </span>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Recorder Card */}
        <section className="relative z-10 px-5 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-lg mx-auto"
          >
            <GlassCard className="p-8">
              {/* Mode selector */}
              <label className="block text-[13px] font-bold text-gray-700 mb-3">Recording mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {MODES.map(m => {
                  const active = mode === m.value
                  return (
                    <button
                      key={m.value}
                      onClick={() => setMode(m.value)}
                      className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all text-center ${
                        active
                          ? 'border-[#4F46E5] bg-[#4F46E5]/5'
                          : 'border-white/80 hover:border-[#4F46E5]/30'
                      }`}
                    >
                      <m.Icon className={`w-5 h-5 ${active ? 'text-[#4F46E5]' : 'text-gray-400'}`} />
                      <span className={`text-[13px] font-bold ${active ? 'text-[#4F46E5]' : 'text-[#1a1a2e]'}`}>
                        {m.label}
                      </span>
                      <span className="text-[11px] text-gray-400">{m.desc}</span>
                    </button>
                  )
                })}
              </div>

              {!supported && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-800 text-[13px] mb-4">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Your browser doesn&apos;t support screen recording. Please use Chrome, Edge, or Firefox on desktop.</span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-[13px] mb-4">
                  <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={startRecording}
                disabled={!supported}
                className="w-full py-4 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[15px] transition-colors flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
              >
                <Monitor className="w-5 h-5" />
                Start Recording
              </button>
            </GlassCard>

            <p className="text-center text-[12px] text-gray-400 mt-4">
              Your recording never leaves your device. Nothing is uploaded to any server.
            </p>
          </motion.div>
        </section>

        {/* Trust Features */}
        <section className="relative z-10 px-5 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="max-w-2xl mx-auto"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { Icon: Lock, label: 'Privacy-first', desc: 'Runs entirely in your browser. Zero data collection.', color: 'text-[#4F46E5]', bg: 'bg-[#4F46E5]/10' },
                { Icon: Eye, label: 'No watermark', desc: 'Clean, professional recordings every time.', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                { Icon: Shield, label: 'No login required', desc: 'Start recording immediately. No account needed.', color: 'text-amber-600', bg: 'bg-amber-500/10' },
                { Icon: Download, label: 'Your file', desc: 'Download and keep your recording. You own it.', color: 'text-purple-600', bg: 'bg-purple-500/10' },
              ].map(f => (
                <GlassCard key={f.label} className="text-center p-5">
                  <div className={`w-8 h-8 rounded-lg ${f.bg} flex items-center justify-center mx-auto mb-2.5`}>
                    <f.Icon className={`w-4 h-4 ${f.color}`} />
                  </div>
                  <h3 className="text-[13px] font-bold mb-1">{f.label}</h3>
                  <p className="text-[11.5px] text-gray-500 leading-relaxed">{f.desc}</p>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        </section>

        {/* FAQ */}
        <section className="relative z-10 px-5 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="max-w-xl mx-auto"
          >
            <h2 className="text-[20px] font-bold text-center mb-8">Frequently asked questions</h2>
            <FAQAccordion items={faqItems} />
          </motion.div>
        </section>

        {/* CTA */}
        <section className="relative z-10 py-20 md:py-28 px-5">
          <div className="max-w-[1200px] mx-auto relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#4F46E5]/10 via-[#818CF8]/5 to-[#C7D2FE]/10 blur-xl" />
            <div className="relative z-10">
              <GlassCard className="max-w-[600px] mx-auto p-10 md:p-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
                  <Brain className="h-7 w-7 text-[#4F46E5]" />
                </div>
                <h2 className="text-[22px] font-bold mb-3 text-[#1a1a2e]">Never lose what you recorded</h2>
                <p className="text-gray-600 text-[14px] mb-6 max-w-md mx-auto">
                  Reattend captures, organizes, and recalls your team&apos;s knowledge automatically so recordings, decisions, and context are always findable.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
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

  // ────────────────────────────────────────────────────────
  // RECORDING STATE
  // ────────────────────────────────────────────────────────

  if (phase === 'recording') {
    return (
      <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
        <Navbar />

        {/* Background gradient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-lg mx-auto px-5 py-20 flex flex-col items-center">
          {/* Pulsing indicator */}
          <div className="relative mb-8">
            <motion.div
              className="absolute inset-0 rounded-full bg-[#4F46E5]/10"
              animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
              style={{ width: 100, height: 100, left: -10, top: -10 }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-[#4F46E5]/5"
              animate={{ scale: [1, 2], opacity: [0.2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
              style={{ width: 100, height: 100, left: -10, top: -10 }}
            />
            <div className="w-[80px] h-[80px] rounded-full bg-[#4F46E5] flex items-center justify-center">
              <Monitor className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Timer */}
          <div className="text-[56px] font-light tracking-tight tabular-nums mb-2">
            {formatTime(duration)}
          </div>

          <div className="flex items-center gap-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-pulse" />
            <span className="text-[13px] font-bold text-[#4F46E5]">Recording &middot; {modeLabel}</span>
          </div>

          {/* Stop button */}
          <button
            onClick={stopRecording}
            className="w-16 h-16 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] flex items-center justify-center transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98] mb-8"
            title="Stop recording"
          >
            <Square className="w-6 h-6 text-white" />
          </button>

          <p className="text-[12px] text-gray-400 text-center">
            Recording your screen. Don&apos;t close this tab.
          </p>
        </div>
      </div>
    )
  }

  // ────────────────────────────────────────────────────────
  // DONE STATE
  // ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
      <Navbar />

      {/* Background gradient blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-[24px] font-bold">Recording Complete</h1>
              <p className="text-[13px] text-gray-500 mt-1">
                {dateStr()} &middot; {formatTime(duration)} &middot; {modeLabel}
              </p>
            </div>
            <button
              onClick={newRecording}
              className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-[#1a1a2e] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> New recording
            </button>
          </div>

          {/* Video Preview */}
          {videoUrl && (
            <GlassCard className="overflow-hidden mb-6">
              <video
                src={videoUrl}
                controls
                className="w-full bg-black"
                style={{ maxHeight: 400 }}
              />
            </GlassCard>
          )}

          {/* Download */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={downloadVideo}
              disabled={!videoBlob}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" /> Download video
            </button>
          </div>

          <p className="text-[12px] text-gray-400 text-center mb-10">
            This recording exists only on your device.
          </p>

          {/* ── Memory Bridge Panel ────────────────────────── */}
          <GlassCard className="p-8 mb-6 border-2">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center">
                <Bookmark className="w-4 h-4 text-[#4F46E5]" />
              </div>
              <h2 className="text-[18px] font-bold">This is a moment you&apos;ll probably want to remember.</h2>
            </div>
            <p className="text-[13px] text-gray-500 mb-6 ml-11">Add context now so you can find this later.</p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Purpose</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  placeholder="e.g. Product demo walkthrough for Q1 release"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Follow-up</label>
                <input
                  type="text"
                  value={followUp}
                  onChange={e => setFollowUp(e.target.value)}
                  placeholder="e.g. Share with design team, update docs"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={saveToReattend}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[14px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
              >
                {copied === 'memory' ? (
                  <>
                    <Check className="w-4 h-4" /> Copied, opening Reattend...
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" /> Save as a memory in Reattend
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={emailToSelf}
                  className="flex items-center justify-center gap-2 py-3 rounded-full bg-white/60 border border-white/80 hover:border-[#4F46E5]/30 text-[13px] font-medium transition-colors"
                >
                  <Mail className="w-4 h-4 text-gray-500" /> Email to yourself
                </button>

                <button
                  onClick={copyRecallNotes}
                  className="flex items-center justify-center gap-2 py-3 rounded-full bg-white/60 border border-white/80 hover:border-[#4F46E5]/30 text-[13px] font-medium transition-colors"
                >
                  {copied === 'notes' ? (
                    <>
                      <Check className="w-4 h-4 text-[#4F46E5]" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-gray-500" /> Copy recall notes
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-gray-400 text-center pt-1">
                &ldquo;Save to Reattend&rdquo; copies your recording details to clipboard and opens Reattend where you can attach the video file.
              </p>
            </div>
          </GlassCard>

          {/* CTA */}
          <section className="py-10">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#4F46E5]/10 via-[#818CF8]/5 to-[#C7D2FE]/10 blur-xl" />
              <div className="relative z-10">
                <GlassCard className="p-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/10 flex items-center justify-center mx-auto mb-6">
                    <Brain className="h-7 w-7 text-[#4F46E5]" />
                  </div>
                  <h2 className="text-[18px] font-bold mb-2 text-[#1a1a2e]">Never lose what you recorded</h2>
                  <p className="text-gray-600 text-[13px] mb-5 max-w-md mx-auto">
                    Reattend automatically captures and organizes everything: meetings, decisions, recordings, and context. Your team stays aligned.
                  </p>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[13.5px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
                  >
                    Try Reattend free <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </GlassCard>
              </div>
            </div>
          </section>
        </motion.div>
      </div>

      <Footer />
    </div>
  )
}
