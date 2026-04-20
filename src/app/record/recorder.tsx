'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Mic, Square, Pause, Play, Download, Mail, Copy, Check,
  ArrowRight, AlertCircle, RotateCcw, Brain,
} from 'lucide-react'
import { Footer } from '@/components/landing/footer'
import { Navbar } from '@/components/landing/navbar'

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

type Phase = 'idle' | 'recording' | 'paused' | 'done'

function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type
  }
  return 'audio/webm'
}

function getFileExtension(mime: string) {
  if (mime.includes('mp4')) return 'mp4'
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

export function MeetingRecorder() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [participants, setParticipants] = useState('')
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [volume, setVolume] = useState(0)
  const [supported, setSupported] = useState(true)

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

  const startVolumeMonitor = useCallback(() => {
    if (!analyserRef.current) return
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    const update = () => {
      if (!analyserRef.current) return
      analyserRef.current.getByteFrequencyData(dataArray)
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      setVolume(avg / 255)
      animFrameRef.current = requestAnimationFrame(update)
    }
    update()
  }, [])

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

      const mimeType = getSupportedMimeType()
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setAudioBlob(blob)
      }

      mediaRecorder.start(1000)
      setPhase('recording')
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)

      startVolumeMonitor()
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
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      setPhase('paused')
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume()
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
      startVolumeMonitor()
      setPhase('recording')
    }
  }

  const stopRecording = () => {
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
    setVolume(0)
    setPhase('done')
  }

  const downloadAudio = () => {
    if (!audioBlob) return
    const mimeType = getSupportedMimeType()
    const ext = getFileExtension(mimeType)
    const slug = (title || 'meeting').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(audioBlob)
    a.download = `${slug}-${date}.${ext}`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const generateRecordText = () => {
    const dateStr = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const lines = [
      'Meeting Record',
      '\u2500'.repeat(40),
      '',
      `Title: ${title || 'Untitled Meeting'}`,
      `Date: ${dateStr}`,
      `Duration: ${formatTime(duration)}`,
    ]
    if (participants.trim()) lines.push(`Participants: ${participants}`)
    lines.push('', 'Notes:', notes || '(No notes recorded)')
    lines.push('', '\u2500'.repeat(40), 'Recorded with Reattend Meeting Recorder \u2014 reattend.com/record')
    return lines.join('\n')
  }

  const copyRecord = async () => {
    await navigator.clipboard.writeText(generateRecordText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendEmail = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setSending(true)
    setSent(false)
    setError('')
    try {
      const res = await fetch('/api/record/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          title: title || 'Untitled Meeting',
          date,
          duration: formatTime(duration),
          participants,
          notes,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setSent(true)
    } catch {
      setError('Failed to send email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const newRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setPhase('idle')
    setTitle('')
    setDate(new Date().toISOString().split('T')[0])
    setParticipants('')
    setNotes('')
    setDuration(0)
    setAudioUrl(null)
    setAudioBlob(null)
    setEmail('')
    setSent(false)
    setCopied(false)
    setError('')
  }

  // ── Idle / Setup ─────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
        <Navbar />

        {/* Background gradient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />

        {/* Hero */}
        <section className="relative z-10 pt-16 md:pt-20 pb-10 px-5 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4F46E5]/15 bg-white/70 backdrop-blur-sm text-[13px] font-medium text-[#4F46E5] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
              Free tool
            </span>
            <h1 className="text-[36px] md:text-[46px] font-bold tracking-[-0.03em] leading-[1.1]">
              Free Meeting <span className="text-[#4F46E5]">Recorder</span>
            </h1>
            <p className="text-gray-500 mt-4 text-[16px] max-w-xl mx-auto">
              Record your meetings with one click. Take notes, download the audio, and share a clean meeting record via email.
            </p>
          </motion.div>
        </section>

        {/* Setup Form */}
        <section className="relative z-10 px-5 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-lg mx-auto"
          >
            <GlassCard className="p-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Meeting title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Weekly Standup"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Participants <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={participants}
                      onChange={e => setParticipants(e.target.value)}
                      placeholder="Alice, Bob"
                      className={inputCls}
                    />
                  </div>
                </div>

                {!supported && (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-800 text-[13px]">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Your browser doesn&apos;t support audio recording. Please use Chrome, Firefox, or Edge.</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-[13px]">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={startRecording}
                  disabled={!supported}
                  className="w-full py-4 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[15px] transition-colors flex items-center justify-center gap-2.5 shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
                >
                  <Mic className="w-5 h-5" />
                  Start Recording
                </button>
              </div>
            </GlassCard>

            <p className="text-center text-[12px] text-gray-400 mt-4">
              Your audio stays in your browser. Nothing is uploaded to any server.
            </p>
          </motion.div>
        </section>

        {/* How It Works */}
        <section className="relative z-10 px-5 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-[20px] font-bold text-center mb-8">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: '1', label: 'Record', desc: 'Click start and capture your meeting audio through your microphone.' },
                { step: '2', label: 'Take Notes', desc: 'Type notes during or after the meeting. Download the audio for your records.' },
                { step: '3', label: 'Share', desc: 'Email yourself a clean meeting record or copy it to your clipboard.' },
              ].map(item => (
                <GlassCard key={item.step} className="text-center p-6">
                  <div className="w-10 h-10 rounded-full bg-[#4F46E5]/10 text-[#4F46E5] font-bold text-[15px] flex items-center justify-center mx-auto mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-[15px] mb-1">{item.label}</h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{item.desc}</p>
                </GlassCard>
              ))}
            </div>
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
                <h2 className="text-[22px] font-bold mb-3 text-[#1a1a2e]">Want automatic meeting intelligence?</h2>
                <p className="text-gray-600 text-[14px] mb-6 max-w-md mx-auto">
                  Reattend captures, organizes, and recalls your team&apos;s knowledge automatically - so nothing falls through the cracks.
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

  // ── Recording / Paused ───────────────────────────────────
  if (phase === 'recording' || phase === 'paused') {
    const isRecording = phase === 'recording'
    const pulseScale = 1 + volume * 0.4

    return (
      <div className="min-h-screen bg-[#F5F5FF] text-[#1a1a2e] overflow-x-hidden">
        <Navbar />

        {/* Background gradient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto px-5 py-12">
          {/* Meeting info bar */}
          <div className="flex items-center justify-between mb-10 text-[13px] text-gray-500">
            <span className="font-bold text-[#1a1a2e]">{title || 'Untitled Meeting'}</span>
            <span>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>

          {/* Recording visualization */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative mb-6">
              {isRecording && (
                <>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-[#4F46E5]/10"
                    animate={{ scale: [1, pulseScale + 0.2], opacity: [0.3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                    style={{ width: 120, height: 120, left: -10, top: -10 }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full bg-[#4F46E5]/5"
                    animate={{ scale: [1, pulseScale + 0.5], opacity: [0.2, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                    style={{ width: 120, height: 120, left: -10, top: -10 }}
                  />
                </>
              )}
              <div className={`w-[100px] h-[100px] rounded-full flex items-center justify-center ${isRecording ? 'bg-[#4F46E5]' : 'bg-gray-300'} transition-colors`}>
                {isRecording ? (
                  <Mic className="w-10 h-10 text-white" />
                ) : (
                  <Pause className="w-10 h-10 text-white" />
                )}
              </div>
            </div>

            {/* Timer */}
            <div className="text-[48px] font-light tracking-tight tabular-nums mb-2">
              {formatTime(duration)}
            </div>
            <div className={`text-[13px] font-bold ${isRecording ? 'text-[#4F46E5]' : 'text-gray-400'}`}>
              {isRecording ? 'Recording...' : 'Paused'}
            </div>

            {/* Volume bar */}
            <div className="w-48 h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
              <motion.div
                className="h-full bg-[#4F46E5] rounded-full"
                animate={{ width: `${Math.max(volume * 100, 2)}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-10">
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
              className="w-14 h-14 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] flex items-center justify-center transition-colors shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
              title="Stop"
            >
              <Square className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[13px] font-bold text-gray-700 mb-1.5">Meeting notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Type your notes here during the meeting..."
              rows={8}
              className={`${inputCls} resize-none leading-relaxed`}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Done / Review ────────────────────────────────────────
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
              <h1 className="text-[24px] font-bold">Meeting Record</h1>
              <p className="text-[13px] text-gray-500 mt-1">Your recording is ready. Download, share, or email your meeting record.</p>
            </div>
            <button
              onClick={newRecording}
              className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-[#1a1a2e] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> New
            </button>
          </div>

          {/* Audio Player */}
          {audioUrl && (
            <GlassCard className="p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-bold text-gray-700">Audio Recording</span>
                <span className="text-[12px] text-gray-400">{formatTime(duration)}</span>
              </div>
              <audio src={audioUrl} controls className="w-full h-10 mb-3" />
              <button
                onClick={downloadAudio}
                className="flex items-center gap-2 text-[13px] font-bold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download audio file
              </button>
            </GlassCard>
          )}

          {/* Meeting Details Card */}
          <GlassCard className="p-6 mb-6">
            <h2 className="text-[16px] font-bold mb-4">{title || 'Untitled Meeting'}</h2>
            <div className="grid grid-cols-2 gap-y-3 text-[13px] mb-5">
              <div>
                <span className="text-gray-400 block mb-0.5">Date</span>
                <span className="font-medium">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div>
                <span className="text-gray-400 block mb-0.5">Duration</span>
                <span className="font-medium">{formatTime(duration)}</span>
              </div>
              {participants.trim() && (
                <div className="col-span-2">
                  <span className="text-gray-400 block mb-0.5">Participants</span>
                  <span className="font-medium">{participants}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[13px] text-gray-400 mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add your meeting notes here..."
                rows={6}
                className={`${inputCls} resize-none leading-relaxed`}
              />
            </div>
          </GlassCard>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={copyRecord}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-white/60 border border-white/80 hover:border-[#4F46E5]/30 text-[13.5px] font-medium transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-[#4F46E5]" /> : <Copy className="w-4 h-4 text-gray-500" />}
              {copied ? 'Copied!' : 'Copy as text'}
            </button>
            <button
              onClick={downloadAudio}
              disabled={!audioBlob}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-white/60 border border-white/80 hover:border-[#4F46E5]/30 disabled:opacity-40 text-[13.5px] font-medium transition-colors"
            >
              <Download className="w-4 h-4 text-gray-500" /> Download audio
            </button>
          </div>

          {/* Email section */}
          <GlassCard className="p-6 mb-6">
            <h3 className="text-[14px] font-bold mb-1">Email meeting record</h3>
            <p className="text-[12px] text-gray-400 mb-4">Get a clean meeting record delivered to your inbox.</p>

            {error && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-[13px] mb-4">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {sent ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 text-green-700 text-[13px]">
                <Check className="w-4 h-4" />
                <span>Meeting record sent to <strong>{email}</strong></span>
              </div>
            ) : (
              <div className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="you@company.com"
                  className={`flex-1 ${inputCls}`}
                  onKeyDown={e => { if (e.key === 'Enter') sendEmail() }}
                />
                <button
                  onClick={sendEmail}
                  disabled={sending || !email.trim()}
                  className="px-5 py-3 rounded-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 text-white font-bold text-[13.5px] transition-colors flex items-center gap-2 shrink-0 shadow-[0_4px_14px_rgba(79,70,229,0.3)] active:scale-[0.98]"
                >
                  {sending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Send
                </button>
              </div>
            )}
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
                  <h2 className="text-[18px] font-bold mb-2 text-[#1a1a2e]">Never lose meeting context again</h2>
                  <p className="text-gray-600 text-[13px] mb-5 max-w-md mx-auto">
                    Reattend automatically captures and organizes everything from your meetings: decisions, action items, and context. Your team stays aligned.
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
