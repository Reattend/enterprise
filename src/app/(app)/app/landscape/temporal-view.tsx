'use client'

// Time Machine — scrub the org through time.
//
// Drag the slider to any past month. The page re-fetches the org's state as
// of that instant and animates the counts + visible memories + active
// decisions to match. Feels like a video scrubber; every number is a real
// historical query.
//
// The point-in-time semantics are important: decisions superseded last week
// show as *active* if the slider is before they were superseded. Same for
// reversals. This is temporal memory made visible.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History, Loader2, Calendar, Gavel, FileText, Sparkles, ArrowRight,
  PlayCircle, PauseCircle, RotateCcw,
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

type TimelineState = {
  at: string
  anchor: string
  value: string | null
  counts: {
    recordsExisting: number
    activeDecisions: number
    reversedByThen: number
    supersededByThen: number
    publishedPolicies: number
  }
  monthlyCounts: Array<{ month: string; records: number }>
  topRecords: Array<{ id: string; title: string; type: string; summary: string | null; createdAt: string }>
  activeDecisions: Array<{ id: string; title: string; decidedAt: string; decidedByUserId: string | null }>
}

// Build slider ticks from the earliest possible date (2 years back as a
// reasonable default) to today, at month granularity.
function buildTicks(months: number): Date[] {
  const now = new Date()
  const ticks: Date[] = []
  for (let i = months; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    ticks.push(d)
  }
  return ticks
}

const RANGE_MONTHS = 24

export function TemporalView() {
  const { activeEnterpriseOrgId, hasHydratedStore } = useAppStore()
  const ticks = useMemo(() => buildTicks(RANGE_MONTHS), [])
  const [index, setIndex] = useState(RANGE_MONTHS) // start at "now"
  const [anchor, setAnchor] = useState<'all' | 'topic' | 'person' | 'dept'>('all')
  const [value, setValue] = useState('')
  const [state, setState] = useState<TimelineState | null>(null)
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Debounced fetch — when the user scrubs quickly, don't flood the server.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!activeEnterpriseOrgId || !hasHydratedStore) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { fetchState() }, 150)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, anchor, value, activeEnterpriseOrgId, hasHydratedStore])

  async function fetchState() {
    if (!activeEnterpriseOrgId) return
    setLoading(true)
    try {
      const at = ticks[index]
      // Use the last day of the month at 23:59:59 so "state at March 2026"
      // includes everything that happened through March.
      const endOfMonth = new Date(at.getFullYear(), at.getMonth() + 1, 0, 23, 59, 59).toISOString()
      const params = new URLSearchParams({
        orgId: activeEnterpriseOrgId,
        at: endOfMonth,
        anchor,
      })
      if (anchor !== 'all' && value.trim()) params.set('value', value.trim())
      const res = await fetch(`/api/enterprise/timeline?${params.toString()}`)
      if (!res.ok) return
      const data = await res.json() as TimelineState
      setState(data)
    } finally {
      setLoading(false)
    }
  }

  // Playback mode: auto-advance one tick every 600ms. Great for demos.
  function togglePlay() {
    if (playing) {
      if (playTimerRef.current) clearInterval(playTimerRef.current)
      playTimerRef.current = null
      setPlaying(false)
      return
    }
    setPlaying(true)
    // If we're at the end, rewind to the start before playing.
    if (index >= ticks.length - 1) setIndex(0)
    playTimerRef.current = setInterval(() => {
      setIndex((prev) => {
        if (prev >= ticks.length - 1) {
          if (playTimerRef.current) clearInterval(playTimerRef.current)
          playTimerRef.current = null
          setPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 600)
  }
  useEffect(() => () => { if (playTimerRef.current) clearInterval(playTimerRef.current) }, [])

  const at = ticks[index]
  const sparkMax = Math.max(1, ...(state?.monthlyCounts.map((m) => m.records) || [1]))

  if (!hasHydratedStore) return null
  if (!activeEnterpriseOrgId) return (
    <div className="py-20 text-center">
      <History className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">Select an organization to scrub the timeline.</p>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-5"
    >
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 text-[11px] font-medium uppercase tracking-wider mb-2">
            <History className="h-3 w-3" /> Time Machine
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Scrub the org through time</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Drag the slider or press play. See what the organization looked like on any past month —
            which decisions were active, what memories existed, how knowledge has grown.
          </p>
        </div>
      </div>

      {/* Slider */}
      <div className="rounded-2xl border bg-card p-5 space-y-4 relative overflow-hidden">
        {/* Sparkline behind the slider */}
        <div className="flex items-end gap-0.5 h-12 -mb-4 opacity-30">
          {state?.monthlyCounts.map((m, i) => (
            <div
              key={m.month}
              className={cn(
                'flex-1 bg-amber-500 rounded-t transition-all',
                i <= index - (RANGE_MONTHS + 1 - state.monthlyCounts.length) && 'bg-amber-600',
              )}
              style={{ height: `${(m.records / sparkMax) * 100}%` }}
              title={`${m.month}: ${m.records} memories`}
            />
          ))}
        </div>

        <div className="relative z-10">
          <input
            type="range"
            min={0}
            max={ticks.length - 1}
            value={index}
            onChange={(e) => setIndex(parseInt(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
            <span>{ticks[0].toLocaleString(undefined, { month: 'short', year: 'numeric' })}</span>
            <span className="text-sm font-bold text-foreground tabular-nums">
              <Calendar className="h-3 w-3 inline mr-1 text-amber-500" />
              {at.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              {index === ticks.length - 1 && <span className="ml-1 text-[10px] text-amber-600">(today)</span>}
            </span>
            <span>{ticks[ticks.length - 1].toLocaleString(undefined, { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted"
          >
            {playing ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={() => { setIndex(0); setPlaying(false); if (playTimerRef.current) clearInterval(playTimerRef.current) }}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Rewind
          </button>
          <div className="flex-1" />
          <select
            value={anchor}
            onChange={(e) => setAnchor(e.target.value as typeof anchor)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="all">All org</option>
            <option value="topic">Topic / tag</option>
            <option value="person">Person</option>
            <option value="dept">Department</option>
          </select>
          {anchor !== 'all' && (
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={anchor === 'topic' ? 'tag or keyword' : anchor === 'person' ? 'user id' : 'dept id'}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs w-40"
            />
          )}
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* State at this instant */}
      {state && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AnimatedMetric label="Memories existing" value={state.counts.recordsExisting} tone="blue" />
          <AnimatedMetric label="Active decisions" value={state.counts.activeDecisions} tone="violet" />
          <AnimatedMetric label="Already reversed" value={state.counts.reversedByThen} tone="red" />
          <AnimatedMetric label="Already superseded" value={state.counts.supersededByThen} tone="yellow" />
        </div>
      )}

      {/* What was active at that moment */}
      {state && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
              <Gavel className="h-3.5 w-3.5 text-violet-500" />
              <div className="text-sm font-semibold">Decisions active at {at.toLocaleString(undefined, { month: 'short', year: 'numeric' })}</div>
            </div>
            {state.activeDecisions.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No decisions were active yet at this moment.
              </div>
            ) : (
              <div className="divide-y">
                <AnimatePresence mode="wait">
                  {state.activeDecisions.map((d) => (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.2 }}
                      className="px-4 py-2.5 text-xs flex items-start gap-2"
                    >
                      <Gavel className="h-3 w-3 text-violet-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{d.title}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Decided {new Date(d.decidedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              <div className="text-sm font-semibold">Most recent memories as of then</div>
            </div>
            {state.topRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No memories existed yet.
              </div>
            ) : (
              <div className="divide-y">
                <AnimatePresence mode="wait">
                  {state.topRecords.map((r) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Link
                        href={`/app/memories/${r.id}`}
                        className="block px-4 py-2.5 text-xs hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn('rounded px-1 py-0.5 text-[9px] uppercase tracking-wide', typeBadge(r.type))}>{r.type}</span>
                          <span className="truncate font-medium flex-1">{r.title}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Captured {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Context strip */}
      {state && (
        <div className="rounded-xl border bg-muted/20 p-3 text-xs text-muted-foreground">
          <FileText className="h-3 w-3 inline mr-1" />
          {state.counts.publishedPolicies} polic{state.counts.publishedPolicies === 1 ? 'y' : 'ies'} already published as of{' '}
          <strong className="text-foreground">{at.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</strong>.
          Every number is a real historical query — the schema supports point-in-time state.
        </div>
      )}
    </motion.div>
  )
}

function AnimatedMetric({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'violet' | 'red' | 'yellow' }) {
  const tones: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-500/10',
    violet: 'text-violet-600 bg-violet-500/10',
    red: 'text-red-600 bg-red-500/10',
    yellow: 'text-yellow-600 bg-yellow-500/10',
  }
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className={cn('inline-flex h-5 w-5 rounded items-center justify-center text-[10px] font-bold', tones[tone])}>
        {value > 99 ? '99+' : value}
      </div>
      <motion.div
        key={value}
        initial={{ scale: 1.15, color: 'var(--primary)' }}
        animate={{ scale: 1, color: '' }}
        transition={{ duration: 0.2 }}
        className="text-3xl font-bold tabular-nums mt-1"
      >
        {value.toLocaleString()}
      </motion.div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  )
}

function typeBadge(type: string): string {
  const map: Record<string, string> = {
    decision: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
    insight: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    meeting: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    note: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
  }
  return map[type] || 'bg-muted text-muted-foreground'
}
