'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Mic, Square, Pause, Play, Download, Mail, Copy, Check,
  ArrowRight, RotateCcw, Bookmark, Lock, Eye, Shield, Brain,
} from 'lucide-react'
import { Footer } from '@/components/landing/footer'
import { Navbar } from '@/components/landing/navbar'
import { FAQAccordion } from '@/components/landing/faq'

// ── Types & Constants ──────────────────────────────────────

type Phase = 'idle' | 'recording' | 'paused' | 'done'

const BAR_COUNT = 48

const faqItems = [
  {
    question: 'Is this voice recorder really free?',
    answer: 'Yes, 100% free. No hidden fees, no premium tiers, no account required. Record as many voice notes as you want.',
  },
  {
    question: 'Where is my audio stored?',
    answer: 'Your audio stays entirely on your device. Nothing is uploaded to any server. When you close the tab, the recording is gone unless you downloaded it.',
  },
  {
    question: 'Do you record or upload anything?',
    answer: 'No. The entire recording process runs locally in your browser. No data leaves your device at any point. We have zero access to your audio.',
  },
  {
    question: 'Can I use this for work notes?',
    answer: 'Absolutely. Record meeting notes, brainstorms, quick ideas, or project updates. Download the file and use it however you need.',
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

function getAudioMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
  }
  return 'audio/webm'
}

function getExt(mime: string) {
  if (mime.includes('mp4')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
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

export function VoiceRecorder() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [fileName, setFileName] = useState('')
  const [context, setContext] = useState('')
  const [whyMatters, setWhyMatters] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(0))

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setSupported(false)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  // ── Waveform ─────────────────────────────────────────────

  const startWaveform = useCallback(() => {
    if (!analyserRef.current) return
    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const update = () => {
      if (!analyserRef.current) return
      analyserRef.current.getByteFrequencyData(dataArray)

      const step = Math.floor(bufferLength / BAR_COUNT)
      const newBars: number[] = []
      for (let i = 0; i < BAR_COUNT; i++) {
        const idx = Math.min(i * step, bufferLength - 1)
        newBars.push(dataArray[idx] / 255)
      }
      setBars(newBars)
      animFrameRef.current = requestAnimationFrame(update)
    }
    update()
  }, [])

  const stopWaveform = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setBars(Array(BAR_COUNT).fill(0))
  }, [])

  // ── Recording Controls ───────────────────────────────────

  const startRecording = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = getAudioMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setAudioBlob(blob)
      }

      recorder.start(1000)
      setPhase('recording')
      setDuration(0)
      setStartTime(new Date())
      setFileName('')

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)

      startWaveform()
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access was denied. Please allow microphone access in your browser settings.')
      } else {
        setError('Could not access your microphone. Please check your device settings.')
      }
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause()
      if (timerRef.current) clearInterval(timerRef.current)
      stopWaveform()
      setPhase('paused')
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
      startWaveform()
      setPhase('recording')
    }
  }

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (audioCtxRef.current) {
      audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    analyserRef.current = null
    setBars(Array(BAR_COUNT).fill(0))
    setPhase('done')
  }, [])

  // ── Output Helpers ───────────────────────────────────────

  const downloadAudio = () => {
    if (!audioBlob) return
    const ext = getExt(getAudioMimeType())
    const dateSlug = (startTime || new Date()).toISOString().split('T')[0]
    const name = fileName.trim()
      ? fileName.trim().replace(/[^a-z0-9\s_-]/gi, '').replace(/\s+/g, '-').toLowerCase()
      : `voice-note-${dateSlug}`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(audioBlob)
    a.download = `${name}.${ext}`
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

  // ── Memory Bridge Actions ────────────────────────────────

  const saveToReattend = async () => {
    const text = [
      'Voice note',
      '',
      `Date: ${dateStr()} at ${timeStr()}`,
      `Duration: ${formatTime(duration)}`,
      '',
      `Context: ${context || '(not specified)'}`,
      `Why this matters: ${whyMatters || '(not specified)'}`,
      `Follow-up: ${followUp || '(none)'}`,
      '',
      'Attach your audio file to this memory.',
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied('memory')
    setTimeout(() => setCopied(null), 3000)
    window.open('/register', '_blank')
  }

  const emailToSelf = () => {
    const subject = encodeURIComponent(`Voice note – ${dateStr()} ${timeStr()}`)
    const body = encodeURIComponent([
      'Voice Note',
      '',
      `Date: ${dateStr()} at ${timeStr()}`,
      `Duration: ${formatTime(duration)}`,
      '',
      `Context: ${context || '(not specified)'}`,
      '',
      'Remember to attach the audio file to this email.',
      '',
      'Save this to Reattend for long-term recall:',
      'https://reattend.com/register',
    ].join('\n'))
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const copyRecallNotes = async () => {
    const text = [
      'Voice note',
      `Date: ${dateStr()}`,
      `Duration: ${formatTime(duration)}`,
      `Context: ${context || ''}`,
      `Why this matters: ${whyMatters || ''}`,
      `Follow-up: ${followUp || ''}`,
    ].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied('notes')
    setTimeout(() => setCopied(null), 2000)
  }

  const newRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setPhase('idle')
    setDuration(0)
    setAudioUrl(null)
    setAudioBlob(null)
    setFileName('')
    setContext('')
    setWhyMatters('')
    setFollowUp('')
    setError('')
    setCopied(null)
    setStartTime(null)
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
        <section className="relative z-10 pt-16 md:pt-20 pb-8 px-5 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
              Free tool
            </span>
            <h1 className="text-[36px] md:text-[46px] font-bold tracking-[-0.03em] leading-[1.1]">
              Free Voice <span className="text-[#4F46E5]">Recorder</span>
            </h1>
            <p className="text-gray-500 mt-4 text-[16px] max-w-xl mx-auto">
              Record voice notes instantly. No login. No uploads. Runs in your browser.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
              {['100% free', 'No account required', 'No server storage', 'Privacy-first'].map(badge => (
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

        {/* Record Button */}
        <section className="relative z-10 px-5 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-sm mx-auto flex flex-col items-center"
          >
            {!supported && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-800 text-[13px] mb-6 w-full">
                <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Your browser doesn&apos;t support audio recording. Please use Chrome, Firefox, or Edge.</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-[13px] mb-6 w-full">
                <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={startRecording}
              disabled={!supported}
              className="group w-[140px] h-[140px] rounded-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-105 active:scale-[0.98] shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
            >
              <Mic className="w-12 h-12 text-white" />
            </button>

            <p className="text-[14px] font-bold text-gray-700 mt-5">Tap to record</p>
            <p className="text-[12px] text-gray-400 mt-1.5">
              Audio never leaves your device
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
                { Icon: Lock, label: 'Privacy-first', desc: 'Everything runs in your browser. Zero data collection.', color: 'text-[#4F46E5]', bg: 'bg-[#4F46E5]/10' },
                { Icon: Eye, label: 'No upload', desc: 'Audio is never sent to any server, ever.', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                { Icon: Shield, label: 'No login', desc: 'Start recording immediately. No account needed.', color: 'text-amber-600', bg: 'bg-amber-500/10' },
                { Icon: Download, label: 'Your file', desc: 'Download and keep your audio. You own it completely.', color: 'text-purple-600', bg: 'bg-purple-500/10' },
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
                <h2 className="text-[22px] font-bold mb-3 text-[#1a1a2e]">Don&apos;t let your ideas disappear</h2>
                <p className="text-gray-600 text-[14px] mb-6 max-w-md mx-auto">
                  Reattend captures, organizes, and recalls your team&apos;s knowledge automatically so voice notes, decisions, and context are always findable.
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
  // RECORDING / PAUSED STATE
  // ────────────────────────────────────────────────────────

  if (phase === 'recording' || phase === 'paused') {
    const isRecording = phase === 'recording'

    return (
      <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
        <Navbar />

        {/* Background gradient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-lg mx-auto px-5 py-16 flex flex-col items-center">
          {/* Status */}
          <div className="flex items-center gap-2 mb-10">
            {isRecording && <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5] animate-pulse" />}
            <span className={`text-[13px] font-bold ${isRecording ? 'text-[#4F46E5]' : 'text-gray-400'}`}>
              {isRecording ? 'Recording...' : 'Paused'}
            </span>
          </div>

          {/* Waveform */}
          <div className="w-full max-w-md h-[100px] flex items-center justify-center gap-[3px] mb-8">
            {bars.map((val, i) => (
              <motion.div
                key={i}
                className="rounded-full bg-[#4F46E5]"
                style={{ width: 4 }}
                animate={{
                  height: isRecording ? Math.max(4, val * 80) : 4,
                  opacity: isRecording ? 0.4 + val * 0.6 : 0.2,
                }}
                transition={{ duration: 0.08 }}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="text-[56px] font-light tracking-tight tabular-nums mb-10">
            {formatTime(duration)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-5">
            {isRecording ? (
              <button
                onClick={pauseRecording}
                className="w-14 h-14 rounded-full border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center transition-colors"
                title="Pause"
              >
                <Pause className="w-5 h-5 text-gray-600" />
              </button>
            ) : (
              <button
                onClick={resumeRecording}
                className="w-14 h-14 rounded-full border-2 border-[#4F46E5] hover:bg-[#4F46E5]/5 flex items-center justify-center transition-colors"
                title="Resume"
              >
                <Play className="w-5 h-5 text-[#4F46E5] ml-0.5" />
              </button>
            )}
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] flex items-center justify-center transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
              title="Stop"
            >
              <Square className="w-6 h-6 text-white" />
            </button>
          </div>

          <p className="text-[12px] text-gray-400 text-center mt-8">
            Don&apos;t close this tab while recording.
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
              <h1 className="text-[24px] font-bold">Voice Note Recorded</h1>
              <p className="text-[13px] text-gray-500 mt-1">
                {dateStr()} &middot; {formatTime(duration)}
              </p>
            </div>
            <button
              onClick={newRecording}
              className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-[#1a1a2e] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> New recording
            </button>
          </div>

          {/* Audio Player */}
          {audioUrl && (
            <GlassCard className="p-5 mb-6">
              <audio src={audioUrl} controls className="w-full h-10 mb-4" />

              {/* Rename + Download */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-[12px] font-bold text-gray-500 mb-1">File name</label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    placeholder={`voice-note-${(startTime || new Date()).toISOString().split('T')[0]}`}
                    className={inputCls}
                  />
                </div>
                <button
                  onClick={downloadAudio}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-[13px] transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98] shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </GlassCard>
          )}

          <p className="text-[12px] text-gray-400 text-center mb-10">
            This audio exists only on your device.
          </p>

          {/* ── Memory Bridge Panel ────────────────────────── */}
          <GlassCard className="p-8 mb-6 border-2">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5]/10 flex items-center justify-center">
                <Bookmark className="w-4 h-4 text-[#4F46E5]" />
              </div>
              <h2 className="text-[18px] font-bold">This is a thought worth keeping.</h2>
            </div>
            <p className="text-[13px] text-gray-500 mb-6 ml-11">Add context so you can find and recall this later.</p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Context</label>
                <input
                  type="text"
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="e.g. Ideas from the morning walk"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Why this matters</label>
                <input
                  type="text"
                  value={whyMatters}
                  onChange={e => setWhyMatters(e.target.value)}
                  placeholder="e.g. Could change our Q2 approach"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Follow-up</label>
                <input
                  type="text"
                  value={followUp}
                  onChange={e => setFollowUp(e.target.value)}
                  placeholder="e.g. Discuss with team on Monday"
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
                    <Bookmark className="w-4 h-4" /> Save this voice note to Reattend
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={emailToSelf}
                  className="flex items-center justify-center gap-2 py-3 rounded-full bg-white/60 border border-white/80 hover:border-[#4F46E5]/30 text-[13px] font-medium transition-colors"
                >
                  <Mail className="w-4 h-4 text-gray-500" /> Email to myself
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
                &ldquo;Save to Reattend&rdquo; copies your voice note details to clipboard and opens Reattend where you can attach the audio file.
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
                  <h2 className="text-[18px] font-bold mb-2 text-[#1a1a2e]">Don&apos;t let this thought disappear</h2>
                  <p className="text-gray-600 text-[13px] mb-5 max-w-md mx-auto">
                    Reattend automatically captures and organizes everything: voice notes, meetings, decisions, and context. Nothing gets lost.
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
