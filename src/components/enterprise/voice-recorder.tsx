'use client'

// Voice-to-memory recorder. Press-and-hold OR tap-to-start.
//
// Flow:
//   1. getUserMedia({ audio: true }) → MediaRecorder
//   2. On stop → blob → POST /api/records/voice
//   3. Server calls Groq Whisper for transcript
//   4. Transcript pipes through the normal /api/records pipeline (triage,
//      embedding, linking)
//
// Minimal dependencies — MediaRecorder is native, the UI is hand-drawn.
// Shows a live waveform via AudioContext analyser so the demo looks alive.

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Loader2, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MAX_SECONDS = 120 // 2 min cap — transcripts longer than this should be files

export type VoiceResult = { recordId?: string; title: string }

export function VoiceRecorder({
  selectedProject,
  onSuccess,
  onError,
}: {
  selectedProject: string | null
  onSuccess: (r: VoiceResult) => void
  onError: (msg: string) => void
}) {
  const [state, setState] = useState<'idle' | 'recording' | 'uploading'>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [levels, setLevels] = useState<number[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const animationRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopEverything() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopEverything() {
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    animationRef.current = null
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop() } catch { /* already stopped */ }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => { /* ignore */ })
    audioCtxRef.current = null
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Waveform analysis for the live level meter.
      const AudioCtx: typeof AudioContext = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      const buf = new Uint8Array(analyser.frequencyBinCount)

      const tick = () => {
        analyser.getByteFrequencyData(buf)
        // Reduce to a single 0-1 amplitude, push into rolling array of 40 bars.
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length / 255
        setLevels((prev) => {
          const next = [...prev, avg]
          return next.length > 40 ? next.slice(-40) : next
        })
        animationRef.current = requestAnimationFrame(tick)
      }
      animationRef.current = requestAnimationFrame(tick)

      // Pick a mime type the browser supports. Groq accepts webm/ogg/mp3/wav/m4a.
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'
      const mr = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        uploadBlob(blob, mimeType)
      }
      mr.start(200)
      mediaRecorderRef.current = mr
      startedAtRef.current = Date.now()
      setElapsed(0)
      setLevels([])
      setState('recording')

      // Elapsed timer; auto-stop at MAX_SECONDS.
      const timer = setInterval(() => {
        const secs = Math.floor((Date.now() - startedAtRef.current) / 1000)
        setElapsed(secs)
        if (secs >= MAX_SECONDS) {
          stop()
          clearInterval(timer)
        }
      }, 250)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      onError(`Mic access denied: ${msg}`)
      stopEverything()
      setState('idle')
    }
  }

  function stop() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  async function uploadBlob(blob: Blob, mimeType: string) {
    setState('uploading')
    try {
      const fd = new FormData()
      // Extension comes from the mimeType: webm, mp4, etc.
      const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'ogg'
      fd.append('audio', blob, `voice-memo.${ext}`)
      if (selectedProject) fd.append('projectId', selectedProject)
      const res = await fetch('/api/records/voice', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const body = await res.json()
      onSuccess({ recordId: body.record?.id, title: body.record?.title || 'Voice memo' })
    } catch (err) {
      onError((err as Error).message)
    } finally {
      setState('idle')
      setElapsed(0)
      setLevels([])
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-8">
      {state === 'idle' && (
        <>
          <button
            onClick={start}
            className="h-24 w-24 rounded-full bg-gradient-to-br from-red-500 to-pink-600 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            aria-label="Start recording"
          >
            <Mic className="h-10 w-10" />
          </button>
          <div className="text-center max-w-xs">
            <div className="text-sm font-medium">Tap to record</div>
            <p className="text-xs text-muted-foreground mt-1">
              Up to 2 minutes. Claude transcribes and triages automatically — no typing needed.
            </p>
          </div>
        </>
      )}

      {state === 'recording' && (
        <>
          <button
            onClick={stop}
            className="h-24 w-24 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform animate-pulse"
            aria-label="Stop recording"
          >
            <Square className="h-10 w-10 fill-white" />
          </button>
          <div className="h-12 w-64 flex items-end justify-center gap-0.5">
            {Array.from({ length: 40 }).map((_, i) => {
              const level = levels[i] ?? 0
              const h = Math.max(3, level * 48)
              return (
                <div
                  key={i}
                  className="w-1 bg-red-500 rounded-full transition-all"
                  style={{ height: `${h}px` }}
                />
              )
            })}
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">
              {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Tap the stop button when done</div>
          </div>
        </>
      )}

      {state === 'uploading' && (
        <>
          <div className="h-24 w-24 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
          <div className="text-center max-w-xs">
            <div className="text-sm font-medium">Transcribing + triaging…</div>
            <p className="text-xs text-muted-foreground mt-1">
              Whisper is converting your voice to text. Claude's triaging the content. A few seconds.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
