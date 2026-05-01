'use client'

// Rewind — scrub the org through time.
//
// New design (Landscape.html): amber crumb, serif heading, pill-shaped scrub
// card with custom track + knob, four-stat row in serif numerals, twin
// "Decisions active / Most recent memories" panels.
//
// Wiring preserved from the original implementation:
//   - 24-month tick array
//   - Debounced fetch on slider scrub (250ms) hitting /api/enterprise/timeline
//   - Anchor selector (all / topic / person / dept) with optional value input
//   - Play / pause / restart with 600ms tick
//   - Same point-in-time semantics: counts + decisions + recent memories at
//     the chosen month-end.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, Calendar, Gavel, FileText, Sparkles, RotateCcw, Play, Pause,
  ChevronRight, History,
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
// Show 5 evenly-spaced visual ticks on the scrub track (start, +25%, +50%, +75%, end).
const TICK_PCTS = [0, 25, 50, 75, 100]

function fmtMonth(d: Date) {
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' })
}
function fmtMonthShort(d: Date) {
  return d.toLocaleString(undefined, { month: 'short', year: 'numeric' })
}
function relDays(then: string) {
  const d = new Date(then)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 30) return `${diff} days`
  if (diff < 365) return `${Math.floor(diff / 30)} mo`
  return d.toLocaleDateString()
}

const TYPE_LABEL: Record<string, string> = {
  decision: 'Decision', meeting: 'Meeting', insight: 'Insight',
  idea: 'Idea', context: 'Context', tasklike: 'Task',
  note: 'Note', transcript: 'Transcript',
}

export function RewindView() {
  const { activeEnterpriseOrgId, hasHydratedStore } = useAppStore()
  const ticks = useMemo(() => buildTicks(RANGE_MONTHS), [])
  const [index, setIndex] = useState(RANGE_MONTHS) // start at "now"
  const [anchor, setAnchor] = useState<'all' | 'topic' | 'person' | 'dept'>('all')
  const [value, setValue] = useState('')
  const [state, setState] = useState<TimelineState | null>(null)
  const [prevYearState, setPrevYearState] = useState<TimelineState | null>(null)
  const [loading, setLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Debounced fetch — coalesce fast scrubs into one network call.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!activeEnterpriseOrgId || !hasHydratedStore) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { fetchState() }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, anchor, value, activeEnterpriseOrgId, hasHydratedStore])

  async function fetchState() {
    if (!activeEnterpriseOrgId) return
    setLoading(true)
    try {
      const at = ticks[index]
      const endOfMonth = new Date(at.getFullYear(), at.getMonth() + 1, 0, 23, 59, 59).toISOString()
      const params = new URLSearchParams({ orgId: activeEnterpriseOrgId, at: endOfMonth, anchor })
      if (anchor !== 'all' && value.trim()) params.set('value', value.trim())
      const res = await fetch(`/api/enterprise/timeline?${params.toString()}`)
      if (!res.ok) return
      const data = await res.json() as TimelineState
      setState(data)

      // Fetch the year-prior state so the "delta vs Apr 2025" line is real.
      // Skip if we'd be asking about a date before our 24-month window.
      if (index >= 12) {
        const prevAt = ticks[index - 12]
        const prevEnd = new Date(prevAt.getFullYear(), prevAt.getMonth() + 1, 0, 23, 59, 59).toISOString()
        const prevParams = new URLSearchParams({ orgId: activeEnterpriseOrgId, at: prevEnd, anchor })
        if (anchor !== 'all' && value.trim()) prevParams.set('value', value.trim())
        try {
          const prevRes = await fetch(`/api/enterprise/timeline?${prevParams.toString()}`)
          if (prevRes.ok) setPrevYearState(await prevRes.json())
          else setPrevYearState(null)
        } catch { setPrevYearState(null) }
      } else {
        setPrevYearState(null)
      }
    } finally {
      setLoading(false)
    }
  }

  function togglePlay() {
    if (playing) {
      if (playTimerRef.current) clearInterval(playTimerRef.current)
      playTimerRef.current = null
      setPlaying(false)
      return
    }
    setPlaying(true)
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

  function step(delta: number) {
    setIndex((prev) => Math.max(0, Math.min(ticks.length - 1, prev + delta)))
  }
  function restart() {
    setIndex(0); setPlaying(false)
    if (playTimerRef.current) clearInterval(playTimerRef.current)
  }

  const at = ticks[index]
  const isToday = index === ticks.length - 1
  const fillPct = (index / (ticks.length - 1)) * 100

  if (!hasHydratedStore) return null
  if (!activeEnterpriseOrgId) return (
    <div style={{ padding: '80px 0', textAlign: 'center' }}>
      <History size={32} style={{ color: 'var(--ink-3)', margin: '0 auto 12px' }} />
      <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Select an organization to scrub the timeline.</p>
    </div>
  )

  function delta(curr: number | undefined, prev: number | undefined) {
    if (curr == null || prev == null) return null
    const d = curr - prev
    if (d === 0) return '±0'
    return `${d > 0 ? '+' : ''}${d.toLocaleString()}`
  }

  return (
    <>
      <span className="lsc-crumb amber">
        <RotateCcw size={9} strokeWidth={2} /> Rewind
      </span>
      <div className="lsc-head">
        <h1>Scrub the org through <em>time</em>.</h1>
        <p className="sub">
          Drag the slider or press play. See what the organization looked like on any past month — which decisions were active, what memories existed, how knowledge has grown. Every number on this page is a real point-in-time query against the org&apos;s state.
        </p>
      </div>

      {/* Scrub card */}
      <div className="lsc-rew-card">
        <div className="lsc-scrub-wrap">
          <div className="lsc-scrub">
            <div className="lsc-scrub-fill" style={{ width: `${fillPct}%` }} />
            {TICK_PCTS.map((p) => (
              <div key={p} className="lsc-scrub-tick" style={{ left: `${p}%` }} />
            ))}
            <div className="lsc-scrub-knob" style={{ left: `${fillPct}%` }} />
            <input
              type="range"
              className="lsc-scrub-input"
              min={0}
              max={ticks.length - 1}
              value={index}
              onChange={(e) => setIndex(parseInt(e.target.value))}
              aria-label="Scrub timeline"
            />
          </div>
          <div className="lsc-scrub-ends">
            <span>{fmtMonthShort(ticks[0])}</span>
            <span>{fmtMonthShort(ticks[ticks.length - 1])}</span>
          </div>
          <div className="lsc-scrub-now">
            <Calendar size={14} strokeWidth={1.8} style={{ color: 'var(--ink-3)' }} />
            <b>{fmtMonth(at)}</b>
            {isToday && <span className="today">(today)</span>}
          </div>
        </div>
        <div className="lsc-play-row">
          <button className="lsc-pbtn primary" onClick={togglePlay}>
            {playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button className="lsc-pbtn" onClick={restart} title="Restart from the beginning">
            <RotateCcw size={12} strokeWidth={2} /> Restart
          </button>
          <button className="lsc-pbtn" onClick={() => step(-1)} title="Step backwards 1 month">
            <ChevronRight size={12} strokeWidth={2} style={{ transform: 'rotate(180deg)' }} />
            ±1mo
          </button>
          <button className="lsc-pbtn" onClick={() => step(1)} title="Step forwards 1 month">
            <ChevronRight size={12} strokeWidth={2} />
          </button>
          <select
            className="lsc-scope"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value as typeof anchor)}
            title="Filter scope"
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
              className="lsc-scope-input"
            />
          )}
          {loading && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--ink-3)' }} />}
        </div>
      </div>

      {/* Stats */}
      <div className="lsc-stat-grid">
        <Stat
          tone="acc"
          label="Memories existing"
          value={state?.counts.recordsExisting ?? 0}
          delta={prevYearState ? `${delta(state?.counts.recordsExisting, prevYearState?.counts.recordsExisting)} vs ${fmtMonthShort(ticks[Math.max(0, index - 12)])}` : undefined}
        />
        <Stat
          tone="dec"
          label="Active decisions"
          value={state?.counts.activeDecisions ?? 0}
          delta={prevYearState ? `${delta(state?.counts.activeDecisions, prevYearState?.counts.activeDecisions)} vs ${fmtMonthShort(ticks[Math.max(0, index - 12)])}` : undefined}
        />
        <Stat
          tone="rev"
          label="Already reversed"
          value={state?.counts.reversedByThen ?? 0}
          delta={prevYearState ? `${delta(state?.counts.reversedByThen, prevYearState?.counts.reversedByThen)} this period` : undefined}
        />
        <Stat
          tone="sup"
          label="Already superseded"
          value={state?.counts.supersededByThen ?? 0}
          delta={prevYearState ? `${delta(state?.counts.supersededByThen, prevYearState?.counts.supersededByThen)} this period` : undefined}
        />
      </div>

      {/* Twin panels */}
      {state && (
        <div className="lsc-rew-grid">
          <div className="lsc-panel">
            <h3>
              <Gavel size={16} strokeWidth={1.8} />
              Decisions active at {fmtMonthShort(at)}
            </h3>
            <div className="body">
              {state.activeDecisions.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
                  No decisions were active yet at this moment.
                </div>
              ) : (
                state.activeDecisions.slice(0, 6).map((d) => (
                  <Link
                    key={d.id}
                    href={`/app/memories/${d.id}`}
                    className="lsc-item linkable"
                  >
                    <span className="pip dec" />
                    <div>
                      <div className="ttl">{d.title}</div>
                      <div className="meta">
                        Decided {new Date(d.decidedAt).toLocaleDateString()}
                        {d.decidedByUserId && ` · @${d.decidedByUserId.slice(0, 8)}`}
                      </div>
                    </div>
                    <span className="when">{relDays(d.decidedAt)}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="lsc-panel">
            <h3>
              <Sparkles size={16} strokeWidth={1.8} />
              Most recent memories as of then
            </h3>
            <div className="body">
              {state.topRecords.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
                  No memories existed yet.
                </div>
              ) : (
                state.topRecords.slice(0, 6).map((r) => {
                  const pipClass = r.type === 'decision' ? 'dec' : 'acc'
                  return (
                    <Link
                      key={r.id}
                      href={`/app/memories/${r.id}`}
                      className="lsc-item linkable"
                    >
                      <span className={cn('pip', pipClass)} />
                      <div>
                        <div className="ttl">{r.title}</div>
                        <div className="meta">
                          {TYPE_LABEL[r.type] || r.type}
                          {r.summary && ` · ${r.summary.slice(0, 60)}${r.summary.length > 60 ? '…' : ''}`}
                        </div>
                      </div>
                      <span className="when">
                        {new Date(r.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Foot note */}
      {state && (
        <div className="lsc-foot-note">
          <FileText size={14} strokeWidth={1.8} />
          <div>
            <b>{state.counts.publishedPolicies} polic{state.counts.publishedPolicies === 1 ? 'y' : 'ies'}</b> already published as of <b>{fmtMonth(at)}</b>. Every number on this page is a real historical query against the org&apos;s point-in-time state — useful for audits, onboarding new exec hires, and answering &ldquo;what did we know on X day?&rdquo;
          </div>
        </div>
      )}
    </>
  )
}

function Stat({ tone, label, value, delta }: { tone: 'acc' | 'dec' | 'rev' | 'sup'; label: string; value: number; delta?: string }) {
  return (
    <div className={cn('lsc-stat', tone)}>
      <div className="lab"><span className="dot" /> {label}</div>
      <div className="num">{value.toLocaleString()}</div>
      {delta && <div className="delta">{delta}</div>}
    </div>
  )
}
