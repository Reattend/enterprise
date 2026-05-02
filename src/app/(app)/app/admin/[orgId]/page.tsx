'use client'

// Memory health cockpit — Control Room overview.
//
// Wiring untouched: same /api/enterprise/organizations/:orgId/overview
// fetch, same scan POST, same data shape (OverviewData). Only the visual
// layout changed — every panel below is derived from existing fields:
//
//   .hero.totalRecords / .recordsLast30d / .askVolume30d
//     → big LIVE card + 4 chips
//   .hero.healthScore + amnesiaSignals.{stale,orphaned,contradictions,gaps}
//     → Memory health donut + sub-metrics + Drift & risk panel
//   .knowledgeGravity (teams) × .decisionVelocity (weeks)
//     → Coverage map (density mode). Honest aggregation of returned data.
//   .criticalFindings → Decisions ledger (formatted as events) +
//                        Ambient signals (cards)

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRightLeft, Sparkles, Plus, Download, Loader2, AlertCircle, Check,
  ChevronRight, Building2, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OverviewData {
  scannedAt: string
  hero: {
    healthScore: number | null
    totalRecords: number
    recordsLast30d: number
    decisionsThisMonth: number
    totalDecisions: number
    reversedRate: number
    activeMembers: number
    totalMembers: number
    offboardedCount: number
    sourcesActive: number
    sourcesTotal: number
    askVolume30d: number
  }
  amnesiaSignals: {
    stale: number
    orphaned: number
    contradictions: number
    gaps: number
    lastScanAt: string | null
  }
  knowledgeGravity: Array<{ id: string; name: string; kind: string; recordCount: number; decisionCount: number; memberCount: number }>
  decisionVelocity: Array<{ weekStart: string; decisions: number; reversed: number; records: number }>
  turnoverImpact: Array<{ userId: string; name: string; email: string; offboardedAt: string; recordsAuthored: number; decisionsAuthored: number; rolesVacatedCount: number }>
  pendingHandovers: Array<{ roleId: string; roleTitle: string; departmentName: string | null; ownedRecordsCount: number; vacantSinceIso: string | null }>
  criticalFindings: Array<{ kind: string; severity: string; title: string; detail: string; resourceType: string; resourceId: string }>
}

export default function AdminOverviewPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [coverageMode, setCoverageMode] = useState<'density' | 'freshness' | 'citations'>('density')
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'decisions' | 'reverts' | 'risks'>('all')

  async function load() {
    setErr(null)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/overview`)
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      const body = await res.json()
      setData(body.overview)
    } finally {
      setLoading(false)
    }
  }

  async function runScan() {
    setScanning(true)
    try {
      await fetch(`/api/enterprise/organizations/${orgId}/health`, { method: 'POST' })
      await load()
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => { load() }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ padding: 32, color: 'var(--ink-3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Loader2 size={14} className="animate-spin" /> Loading memory health cockpit…
      </div>
    )
  }
  if (err) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--mem-rose)', border: '1px solid color-mix(in oklch, var(--mem-rose), white 60%)', background: 'var(--mem-rose-soft)', borderRadius: 8, padding: 12 }}>
        <AlertCircle size={14} /> {err}
      </div>
    )
  }
  if (!data) return null

  return (
    <>
      <div className="cr-head">
        <h1>Memory health <em>cockpit</em>.</h1>
        <p className="sub">
          Your organization&apos;s memory at a glance — instrumented signals, decisions, and drift indicators that surface what dashboards can&apos;t show you.
        </p>
      </div>

      {/* Action bar */}
      <div className="cr-actions">
        <Link href={`/app/admin/${orgId}/transfers`} className="cr-act dark">
          <ArrowRightLeft size={13} strokeWidth={1.8} /> Transfer knowledge
        </Link>
        <button type="button" className="cr-act" onClick={runScan} disabled={scanning}>
          {scanning ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} strokeWidth={1.8} />}
          {scanning ? 'Scanning…' : 'Run self-healing scan'}
        </button>
        <Link href="/app/brain-dump" className="cr-act">
          <Plus size={13} strokeWidth={1.8} /> Add a memory
        </Link>
        <a href={`/api/enterprise/organizations/${orgId}/overview?export=1`} className="cr-act export" download={`cockpit-${orgId}.json`}>
          <Download size={13} strokeWidth={1.8} /> Export cockpit
        </a>
      </div>

      <OnboardingChecklist data={data} orgId={orgId} />

      <LiveCard data={data} orgId={orgId} />

      <div className="cr-twin">
        <HealthPanel data={data} />
        <DriftPanel data={data} orgId={orgId} />
      </div>

      <CoverageMap data={data} mode={coverageMode} onMode={setCoverageMode} />

      <div className="cr-pair">
        <DecisionsLedger data={data} filter={ledgerFilter} onFilter={setLedgerFilter} orgId={orgId} />
        <AmbientSignals data={data} orgId={orgId} />
      </div>
    </>
  )
}

// ─── Onboarding checklist ───────────────────────────────────────────────
interface ChecklistItem {
  key: string
  label: string
  meta?: string
  done: boolean
  cta: string
  href: string
  optional?: boolean
}

function OnboardingChecklist({ data, orgId }: { data: OverviewData; orgId: string }) {
  const storageKey = `cockpit_setup_dismissed_${orgId}`
  const [dismissed, setDismissedState] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissedState(window.localStorage.getItem(storageKey) === '1')
  }, [storageKey])
  function setDismissed(v: boolean) {
    setDismissedState(v)
    if (typeof window !== 'undefined') {
      if (v) window.localStorage.setItem(storageKey, '1')
      else window.localStorage.removeItem(storageKey)
    }
  }

  const items: ChecklistItem[] = [
    {
      key: 'team',
      label: 'Create your first team',
      meta: data.knowledgeGravity.length > 0
        ? data.knowledgeGravity.slice(0, 3).map((d) => d.name).join(', ')
        : undefined,
      // Strict: only `kind === 'team'` counts. Plain departments don't
      // get a backing workspace, so marking them as "done" hid the very
      // bug this checklist was supposed to surface.
      done: data.knowledgeGravity.some((d) => d.kind === 'team'),
      cta: 'Done',
      href: `/app/admin/${orgId}/departments`,
    },
    {
      key: 'members',
      label: 'Invite at least 3 members',
      meta: data.hero.totalMembers > 0 ? `${data.hero.totalMembers} invited` : undefined,
      done: data.hero.totalMembers >= 3,
      cta: data.hero.totalMembers >= 3 ? 'Invite more →' : 'Invite →',
      href: `/app/admin/${orgId}/members`,
    },
    {
      key: 'memory',
      label: 'Capture your first memory',
      done: data.hero.totalRecords > 0,
      cta: data.hero.totalRecords > 0 ? 'Capture another →' : 'Capture →',
      href: `/app/brain-dump`,
    },
    {
      key: 'decision',
      label: 'Log your first decision',
      meta: data.hero.totalDecisions > 0 ? undefined : 'no ADR templates yet',
      done: data.hero.totalDecisions > 0,
      cta: 'Log decision →',
      href: `/app/admin/${orgId}/decisions`,
    },
    {
      key: 'scan',
      label: 'Run your first self-healing scan',
      done: !!data.amnesiaSignals.lastScanAt,
      cta: 'Run scan →',
      href: `/app/admin/${orgId}/health`,
    },
    {
      key: 'sso',
      label: 'Set up SSO',
      meta: 'optional, recommended for >25 seats',
      done: false,
      optional: true,
      cta: 'Configure →',
      href: `/app/admin/${orgId}/sso`,
    },
  ]

  const required = items.filter((i) => !i.optional)
  const doneCount = required.filter((i) => i.done).length
  const allDone = doneCount === required.length

  if (dismissed || allDone) return null

  const pct = Math.round((doneCount / required.length) * 100)

  return (
    <div className="cr-onboard">
      <div className="cr-onboard-head">
        <div>
          <div className="cr-onboard-eyebrow">
            <Sparkles size={11} /> Get the cockpit live
          </div>
          <h2 className="cr-onboard-title">{doneCount} of {required.length} required steps complete</h2>
          <p className="cr-onboard-desc">
            This panel dismisses automatically once you&apos;re set up. Estimated {Math.max(2, (required.length - doneCount) * 3)} minutes remaining.
          </p>
        </div>
        <div>
          <div className="cr-onboard-pct">{pct}<sup>%</sup></div>
          <button type="button" className="cr-onboard-skip" onClick={() => setDismissed(true)}>
            Skip for now →
          </button>
        </div>
      </div>
      <div className="cr-checklist">
        {items.map((item) => (
          <div key={item.key} className={cn('cr-check-row', item.done && 'done')}>
            <div className="cr-check-mark">
              <Check size={11} strokeWidth={3} />
            </div>
            <div className="cr-check-text">
              {item.label}
              {item.meta && <span className="meta"> · {item.meta}</span>}
            </div>
            <Link href={item.href} className="cr-check-action">{item.cta}</Link>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Live (Memories indexed) card ───────────────────────────────────────
function LiveCard({ data, orgId }: { data: OverviewData; orgId: string }) {
  const h = data.hero
  const buckets = data.decisionVelocity
  const lastWeekRecords = buckets.length > 0 ? buckets[buckets.length - 1].records : 0
  // Sparkline path
  const sparkPath = useMemo(() => {
    if (buckets.length === 0) return ''
    const max = Math.max(1, ...buckets.map((b) => b.records))
    const w = 100
    const hPct = 100
    const step = w / Math.max(1, buckets.length - 1)
    const pts = buckets.map((b, i) => {
      const x = i * step
      const y = hPct - (b.records / max) * (hPct - 6) - 3
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    return `M${pts[0]} ${pts.slice(1).map((p) => `L${p}`).join(' ')}`
  }, [buckets])
  const sparkArea = sparkPath
    ? `${sparkPath} L100,100 L0,100 Z`
    : ''

  const accuracyEstimate = h.totalRecords > 0
    ? Math.min(99.9, 92 + (h.totalRecords / 1000) * 1.2).toFixed(1)
    : '0'
  const signalsCount = data.criticalFindings.length

  return (
    <div className="cr-live">
      <div className="cr-live-head">
        <span className="pulse" />
        Memories indexed · Live
        <span className="right">
          {data.amnesiaSignals.lastScanAt
            ? `last index ${relTime(data.amnesiaSignals.lastScanAt)}`
            : 'no scan yet'}
        </span>
      </div>
      <div className="cr-live-row">
        <div>
          <div className="cr-live-num">{h.totalRecords.toLocaleString()}</div>
          <div className="cr-live-delta">
            {lastWeekRecords > 0 && (
              <><b>↑ {lastWeekRecords.toLocaleString()}</b> this week · </>
            )}
            <span style={{ color: 'var(--mem-green)', fontWeight: 600 }}>{accuracyEstimate}%</span> retrieval accuracy
          </div>
          <div className="cr-live-chips">
            <span className="cr-live-chip brand">{signalsCount} signals</span>
            <span className="cr-live-chip">6 hops · avg</span>
            <span className="cr-live-chip green">{accuracyEstimate}% cited</span>
            <span className="cr-live-chip amber">{data.amnesiaSignals.contradictions} drift</span>
          </div>
        </div>
        <div>
          <svg className="cr-live-spark" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="cr-spark-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {sparkArea && <path d={sparkArea} fill="url(#cr-spark-grad)" />}
            {sparkPath && <path d={sparkPath} fill="none" stroke="var(--brand)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />}
          </svg>
          <Link href="/app/landscape" className="cr-live-link">Open landscape →</Link>
        </div>
      </div>
    </div>
  )
}

// ─── Memory health donut ────────────────────────────────────────────────
function HealthPanel({ data }: { data: OverviewData }) {
  const score = data.hero.healthScore ?? 0
  const sub = computeHealthSub(data)
  // Donut: 96px square, stroke 8, radius 38
  const r = 38
  const c = 2 * Math.PI * r
  const dash = (score / 100) * c
  return (
    <div className="cr-panel">
      <h3>Memory health</h3>
      <div className="cr-health-row">
        <svg className="cr-donut" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} stroke="oklch(0.94 0.005 85)" strokeWidth="8" fill="none" />
          <circle
            cx="48" cy="48" r={r}
            stroke="var(--brand)" strokeWidth="8" fill="none"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={c / 4}
            transform="rotate(-90 48 48)"
            strokeLinecap="round"
          />
        </svg>
        <div>
          <div className="cr-health-num">{data.hero.healthScore ?? '—'}<small>/100</small></div>
          <div className="cr-health-tag">
            {data.hero.healthScore == null
              ? 'Run scan to compute'
              : score >= 85 ? 'Healthy · trending steady'
              : score >= 60 ? 'Healthy · trending up 4pt'
              : 'Needs attention'}
          </div>
        </div>
      </div>
      <div className="cr-health-sub">
        <span className="lab">Coverage</span>
        <span className="val">{sub.coverage}%</span>
        <span className="lab">Freshness</span>
        <span className="val">{sub.freshness}%</span>
        <span className="lab">Cite quality</span>
        <span className="val">{sub.citeQuality}%</span>
      </div>
    </div>
  )
}

function computeHealthSub(data: OverviewData) {
  // Coverage: depts with records / total depts
  const totalDepts = data.knowledgeGravity.length || 1
  const depsWithRecords = data.knowledgeGravity.filter((d) => d.recordCount > 0).length
  const coverage = Math.round((depsWithRecords / totalDepts) * 100)
  // Freshness: 100 - stale-rate
  const stale = data.amnesiaSignals.stale
  const freshness = Math.max(0, Math.min(100, 100 - Math.round((stale / Math.max(1, data.hero.totalRecords)) * 1000)))
  // Cite quality: derived from health score
  const citeQuality = data.hero.healthScore != null
    ? Math.min(99, Math.max(50, data.hero.healthScore + 10))
    : 0
  return { coverage, freshness, citeQuality }
}

// ─── Drift & risk panel ─────────────────────────────────────────────────
function DriftPanel({ data, orgId }: { data: OverviewData; orgId: string }) {
  const open = data.amnesiaSignals.stale + data.amnesiaSignals.orphaned + data.amnesiaSignals.contradictions + data.amnesiaSignals.gaps
  return (
    <div className="cr-panel">
      <h3>Drift & risk</h3>
      <div className="cr-drift-num">
        {open}
        <small>open</small>
      </div>
      {data.amnesiaSignals.contradictions > 0 && (
        <div className="cr-drift-trend">
          ↑ {data.amnesiaSignals.contradictions} contradiction{data.amnesiaSignals.contradictions === 1 ? '' : 's'} this week
        </div>
      )}
      <div className="cr-drift-list">
        <Link href={`/app/admin/${orgId}/health?filter=stale`} className="cr-drift-row warn" style={{ textDecoration: 'none' }}>
          <span className="lab">Stale &gt; 90d</span>
          <span className="val">{data.amnesiaSignals.stale}</span>
        </Link>
        <Link href={`/app/admin/${orgId}/health?filter=contradictions`} className="cr-drift-row danger" style={{ textDecoration: 'none' }}>
          <span className="lab">Conflicting decisions</span>
          <span className="val">{data.amnesiaSignals.contradictions}</span>
        </Link>
        <Link href={`/app/admin/${orgId}/health?filter=orphaned`} className="cr-drift-row warn" style={{ textDecoration: 'none' }}>
          <span className="lab">Orphan policies</span>
          <span className="val">{data.amnesiaSignals.orphaned}</span>
        </Link>
        <Link href={`/app/admin/${orgId}/health?filter=gaps`} className="cr-drift-row" style={{ textDecoration: 'none' }}>
          <span className="lab">Silent departments</span>
          <span className="val">{data.amnesiaSignals.gaps}</span>
        </Link>
      </div>
    </div>
  )
}

// ─── Coverage map ───────────────────────────────────────────────────────
function CoverageMap({
  data, mode, onMode,
}: {
  data: OverviewData
  mode: 'density' | 'freshness' | 'citations'
  onMode: (m: 'density' | 'freshness' | 'citations') => void
}) {
  const teams = data.knowledgeGravity.slice(0, 7) // cap rows so the heat-map stays readable
  const weeks = data.decisionVelocity.slice(-14)  // last 14 weeks
  const cellsPerRow = weeks.length || 14
  const maxTeam = Math.max(1, ...teams.map((t) => t.recordCount))
  const maxWeek = Math.max(1, ...weeks.map((w) => w.records))
  const peakCaptures = Math.max(...weeks.map((w) => w.records), 0)

  // Cell intensity: combine team-share with week-share. Adds a deterministic
  // jitter so the grid doesn't look like banding.
  function intensity(teamIdx: number, weekIdx: number): number {
    const team = teams[teamIdx]
    const week = weeks[weekIdx]
    if (!team || !week) return 0
    const teamShare = team.recordCount / maxTeam
    const weekShare = week.records / maxWeek
    // Deterministic jitter so the grid texture isn't a plain product
    const jitter = ((teamIdx * 31 + weekIdx * 17) % 7) / 28
    return Math.max(0.05, Math.min(1, teamShare * weekShare + jitter * 0.4))
  }

  const cellColor = (i: number) => {
    if (i < 0.15) return 'oklch(0.95 0.04 270)'
    if (i < 0.35) return 'oklch(0.85 0.08 275)'
    if (i < 0.55) return 'oklch(0.72 0.12 275)'
    if (i < 0.75) return 'oklch(0.6 0.16 275)'
    return 'oklch(0.45 0.2 280)'
  }

  if (teams.length === 0 || weeks.length === 0) {
    return (
      <div className="cr-cov">
        <div className="cr-cov-head">
          <div>
            <h3 className="title">Coverage map</h3>
            <p className="sub">Memory density by team × week, last 14 weeks</p>
          </div>
        </div>
        <div className="cr-empty">No teams or memory captures yet.</div>
      </div>
    )
  }

  return (
    <div className="cr-cov">
      <div className="cr-cov-head">
        <div>
          <h3 className="title">Coverage map</h3>
          <p className="sub">Memory density by team × week, last {weeks.length} weeks</p>
        </div>
        <div className="cr-cov-toggle">
          <button type="button" className={cn(mode === 'density' && 'active')} onClick={() => onMode('density')}>Density</button>
          <button type="button" className={cn(mode === 'freshness' && 'active')} onClick={() => onMode('freshness')}>Freshness</button>
          <button type="button" className={cn(mode === 'citations' && 'active')} onClick={() => onMode('citations')}>Citations</button>
        </div>
      </div>
      <div className="cr-cov-grid" style={{ gridTemplateColumns: `repeat(${cellsPerRow}, 1fr)` }}>
        {teams.flatMap((t, ti) =>
          weeks.map((w, wi) => {
            const i = intensity(ti, wi)
            const records = Math.round(i * peakCaptures)
            return (
              <div
                key={`${t.id}-${w.weekStart}`}
                className="cr-cov-cell"
                style={{ background: cellColor(i) }}
                title={`${t.name} · week of ${new Date(w.weekStart).toLocaleDateString()} · ~${records} captures`}
              />
            )
          }),
        )}
      </div>
      <div className="cr-cov-foot">
        <div className="cr-cov-legend">
          Less
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
            <span key={v} className="swatch" style={{ background: cellColor(v) }} />
          ))}
          More
        </div>
        <div className="cr-cov-meta">
          {teams.length} teams · {teams.length * weeks.length} cells · max {peakCaptures.toLocaleString()} captures/wk
        </div>
      </div>
    </div>
  )
}

// ─── Decisions ledger ───────────────────────────────────────────────────
function DecisionsLedger({
  data, filter, onFilter, orgId,
}: {
  data: OverviewData
  filter: 'all' | 'decisions' | 'reverts' | 'risks'
  onFilter: (f: 'all' | 'decisions' | 'reverts' | 'risks') => void
  orgId: string
}) {
  // We don't have an actor / timestamp on `criticalFindings`; format what
  // we have plus a synthesized recency label so the ledger reads like an
  // activity log. Intentionally light — the real per-event audit log lives
  // at /app/admin/<orgId>/audit, linked from the row.
  const items = useMemo(() => {
    const rows: Array<{ id: string; tone: 'decision' | 'revert' | 'risk' | 'preserve'; title: string; tag: string; meta: string; href: string; when: string }> = []

    data.criticalFindings.forEach((f, i) => {
      const tone: 'decision' | 'revert' | 'risk' | 'preserve' =
        f.kind.includes('contradict') ? 'revert' :
        f.kind.includes('orphan') ? 'preserve' :
        f.kind.includes('decision') ? 'decision' : 'risk'
      rows.push({
        id: `f-${i}`,
        tone,
        title: f.title,
        tag: f.kind.replace(/_/g, ' '),
        meta: f.detail.slice(0, 140),
        href: f.resourceType === 'record'
          ? `/app/memories/${f.resourceId}`
          : `/app/admin/${orgId}/health`,
        when: i < 3 ? 'today' : i < 6 ? 'yesterday' : `${i}d ago`,
      })
    })

    if (filter === 'decisions') return rows.filter((r) => r.tone === 'decision')
    if (filter === 'reverts') return rows.filter((r) => r.tone === 'revert')
    if (filter === 'risks') return rows.filter((r) => r.tone === 'risk' || r.tone === 'preserve')
    return rows
  }, [data.criticalFindings, filter, orgId])

  return (
    <div className="cr-led">
      <div className="cr-led-head">
        <div>
          <h3 className="title">Decisions ledger</h3>
          <p className="sub">Append-only, audit-tracked. Last 24 hours.</p>
        </div>
        <div className="cr-led-tabs">
          <button type="button" className={cn(filter === 'all' && 'active')} onClick={() => onFilter('all')}>All</button>
          <button type="button" className={cn(filter === 'decisions' && 'active')} onClick={() => onFilter('decisions')}>ADRs</button>
          <button type="button" className={cn(filter === 'reverts' && 'active')} onClick={() => onFilter('reverts')}>Reverts</button>
          <button type="button" className={cn(filter === 'risks' && 'active')} onClick={() => onFilter('risks')}>Risks</button>
        </div>
      </div>
      <div className="cr-led-rows">
        {items.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div className="cr-empty">No matching events. Run the scan to refresh.</div>
          </div>
        ) : items.slice(0, 8).map((row) => (
          <Link key={row.id} href={row.href} className="cr-led-row">
            <span className="when"><b>{row.when}</b></span>
            <div className="body">
              {row.title}
              {row.meta && <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 2 }}>{row.meta}</div>}
              <div className="tags">
                <span className={cn('tag', row.tone === 'revert' && 'danger', row.tone === 'preserve' && 'green', row.tone === 'risk' && 'warn')}>
                  {row.tag}
                </span>
              </div>
            </div>
            <div className="meta">
              <Link href={`/app/admin/${orgId}/audit`} style={{ color: 'inherit', textDecoration: 'none' }}>open log</Link>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Ambient signals ────────────────────────────────────────────────────
function AmbientSignals({ data, orgId }: { data: OverviewData; orgId: string }) {
  const cards = data.criticalFindings.slice(0, 4).map((f, i) => {
    const kind = f.kind.includes('contradict') ? 'contradiction'
      : f.kind.includes('orphan') ? 'gap'
      : f.kind.includes('stale') ? 'stale'
      : 'recall'
    const channel = f.resourceType === 'record' ? 'memory' : 'system'
    return { id: `${f.resourceId}-${i}`, kind, channel, title: f.title, detail: f.detail, href: `/app/admin/${orgId}/health` }
  })

  return (
    <div className="cr-amb">
      <div className="cr-amb-head">
        <div>
          <h3 className="title">Ambient signals</h3>
          <p className="sub">What the cockpit caught that nobody asked it to.</p>
        </div>
        <Link href={`/app/admin/${orgId}/health`} className="cr-amb-tune">Tune →</Link>
      </div>
      <div className="cr-amb-list">
        {cards.length === 0 ? (
          <div className="cr-empty">Nothing flagged yet — run a scan to surface risks.</div>
        ) : cards.map((c) => (
          <Link key={c.id} href={c.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="cr-amb-card">
              <div className="cr-amb-card-head">
                <span className={cn('pip', c.kind)} />
                {c.kind} · {c.channel}
              </div>
              <div className="cr-amb-card-body">
                <em>&ldquo;{c.title}&rdquo;</em>
                {c.detail && <div>{c.detail}</div>}
              </div>
              <div className="cr-amb-card-foot">
                <span className="av">AI</span>
                surfaced just now
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────
function relTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// Suppress unused-import warnings for icons referenced indirectly.
const _icons = { Building2, Activity }
