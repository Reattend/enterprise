'use client'

// Home — personal briefing feed.
//
// Design goal: the first thing you see when you open Reattend should make
// organizational amnesia impossible. Not "ask a question" (Chat does that),
// not "here are 10 AI suggestions" (generic). Instead: the state of YOUR
// slice of the org — what needs your attention, what changed, who's at risk.
//
// The feed is personal (scoped to you) and amnesia-native (decisions,
// policies, transfers, sync). If the user has no active org, we fall back
// to a minimal welcome screen.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Gavel,
  FileText,
  ArrowRightLeft,
  Sparkles,
  Plus,
  MessageSquare,
  Brain,
  Loader2,
  ChevronRight,
  Clock,
  Users,
  Database,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
import { SyncStatusCard } from '@/components/enterprise/sync-status-card'
import { StartMyDayCard } from '@/components/enterprise/start-my-day-card'
import { MemoryResurfaceCard } from '@/components/enterprise/memory-resurface-card'
import { MeetingPrepCard } from '@/components/enterprise/meeting-prep-card'
import { TrendingCard } from '@/components/enterprise/trending-card'

type PendingPolicy = { policyId: string; title: string; category: string | null }
type Decision = { id: string; title: string; status: string; createdAt: string; decidedAt: string }
type MemoryRow = { id: string; title: string; type: string; createdAt: string; summary: string | null }
type HomeAnalytics = {
  totals: {
    activeMembers: number
    memories: number
    recentMemories: number
    decisions: number
    policies: number
    staleMemories: number
  }
  memoriesByType: Array<{ type: string; count: number }>
  decisionsByStatus: Array<{ status: string; count: number }>
  reachByDepartment: Array<{ deptId: string; name: string; recordCount: number }>
  activityLast7Days: Array<{ date: string; count: number }>
}

export default function HomePage() {
  const { activeEnterpriseOrgId, hasHydratedStore, enterpriseOrgs, captureOpen, setCaptureOpen } = useAppStore()

  const [pending, setPending] = useState<PendingPolicy[]>([])
  const [recentDecisions, setRecentDecisions] = useState<Decision[]>([])
  const [recentRecords, setRecentRecords] = useState<MemoryRow[]>([])
  const [analytics, setAnalytics] = useState<HomeAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  const activeOrg = enterpriseOrgs.find((o) => o.orgId === activeEnterpriseOrgId)
  const displayName = activeOrg?.orgName || 'your organization'

  useEffect(() => {
    if (!hasHydratedStore || !activeEnterpriseOrgId) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const [pendRes, decRes, recRes, anaRes] = await Promise.all([
          fetch(`/api/enterprise/policies/pending?orgId=${activeEnterpriseOrgId}`),
          fetch(`/api/enterprise/organizations/${activeEnterpriseOrgId}/decisions?limit=5`),
          fetch('/api/records?limit=6'),
          fetch(`/api/enterprise/analytics/home?orgId=${activeEnterpriseOrgId}`),
        ])
        if (!cancelled) {
          if (pendRes.ok) {
            const d = await pendRes.json()
            setPending(d.pending || [])
          }
          if (decRes.ok) {
            const d = await decRes.json()
            setRecentDecisions((d.decisions || []).slice(0, 5))
          }
          if (recRes.ok) {
            const d = await recRes.json()
            setRecentRecords((d.records || []).slice(0, 6))
          }
          if (anaRes.ok) {
            const d = await anaRes.json()
            setAnalytics(d as HomeAnalytics)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [hasHydratedStore, activeEnterpriseOrgId])

  if (!hasHydratedStore) {
    return <div className="py-20 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  // Users without any org land on an intro card pointing to onboarding.
  if (!activeEnterpriseOrgId) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <Brain className="h-10 w-10 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome to Reattend Enterprise</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your organization's memory, preserved across every person who comes and goes.
        </p>
        <Button asChild>
          <Link href="/app/admin/onboarding">Set up your organization</Link>
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl space-y-5"
    >
      {/* Hero */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Good {greeting()}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here's what needs your attention in <strong>{displayName}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCaptureOpen(!captureOpen)}>
            <Plus className="h-4 w-4 mr-1" /> Capture
          </Button>
          <Button variant="outline" asChild>
            <Link href="/app/ask">
              <MessageSquare className="h-4 w-4 mr-1" /> Ask AI
            </Link>
          </Button>
        </div>
      </div>

      {/* At a glance — pulse strip of org-wide stats. Visible to every
          member; admin-only Analytics page has the deep dives. */}
      {analytics && (
        <AtAGlance analytics={analytics} />
      )}

      {/* Start My Day — morning briefing (AI-synthesized) */}
      <StartMyDayCard orgId={activeEnterpriseOrgId} />

      {/* Meeting Prep — next 8h of meetings with AI-synthesized briefs */}
      <MeetingPrepCard orgId={activeEnterpriseOrgId} />

      {/* Trending — hot records this week (hidden if no views) */}
      <TrendingCard orgId={activeEnterpriseOrgId} />

      {/* Memory Resurface — "1 year ago today" moments */}
      <MemoryResurfaceCard orgId={activeEnterpriseOrgId} />

      {/* Pending acknowledgments — top priority */}
      {pending.length > 0 && (
        <div className="rounded-2xl border bg-yellow-500/5 border-yellow-500/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <h2 className="text-sm font-semibold">Needs your acknowledgment</h2>
            <Badge variant="outline" className="text-[10px] ml-auto border-yellow-500/40 text-yellow-700 dark:text-yellow-400">
              {pending.length}
            </Badge>
          </div>
          <div className="space-y-1">
            {pending.slice(0, 3).map((p) => (
              <Link
                key={p.policyId}
                href={`/app/policies/${p.policyId}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors group"
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate flex-1 group-hover:text-primary">{p.title}</span>
                {p.category && <Badge variant="outline" className="text-[9px] capitalize h-4 px-1">{p.category}</Badge>}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground" />
              </Link>
            ))}
            {pending.length > 3 && (
              <Link href="/app/policies" className="block text-xs text-primary hover:underline px-2 py-1 mt-1">
                View all {pending.length} pending →
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Recent memories */}
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="px-4 py-3 border-b flex items-center gap-2 bg-muted/10">
              <Brain className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Recent memories</h2>
              <Link href="/app/memories" className="text-xs text-primary hover:underline ml-auto">All memories</Link>
            </div>
            {loading ? (
              <div className="p-8 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : recentRecords.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground mb-3">Nothing captured yet.</p>
                <Button size="sm" onClick={() => setCaptureOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Capture your first memory
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {recentRecords.map((r) => (
                  <Link
                    key={r.id}
                    href={`/app/memories/${r.id}`}
                    className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group"
                  >
                    <Badge variant="secondary" className="text-[9px] capitalize shrink-0 h-4 px-1 mt-0.5">{r.type}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate group-hover:text-primary">{r.title}</div>
                      {r.summary && <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{r.summary}</div>}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                      <Clock className="h-2.5 w-2.5 inline mr-0.5" />{timeAgo(r.createdAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent decisions */}
          <div className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="px-4 py-3 border-b flex items-center gap-2 bg-muted/10">
              <Gavel className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Recent decisions</h2>
              <Link href="/app/decisions" className="text-xs text-primary hover:underline ml-auto">All decisions</Link>
            </div>
            {loading ? (
              <div className="p-8 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : recentDecisions.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No decisions logged yet. Promote a memory to decision from any memory page.
              </div>
            ) : (
              <div className="divide-y">
                {recentDecisions.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <Badge variant="outline" className={`text-[9px] h-4 px-1 capitalize ${
                      d.status === 'reversed' ? 'text-red-600 border-red-500/30' :
                      d.status === 'superseded' ? 'text-yellow-600 border-yellow-500/30' :
                      'text-emerald-600 border-emerald-500/30'
                    }`}>{d.status}</Badge>
                    <span className="flex-1 truncate">{d.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(d.decidedAt || d.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <QuickActions orgId={activeEnterpriseOrgId} />
          <SyncStatusCard />
        </div>
      </div>
    </motion.div>
  )
}

function QuickActions({ orgId }: { orgId: string }) {
  const actions = [
    { label: 'Knowledge transfer', href: `/app/admin/${orgId}/transfers`, icon: ArrowRightLeft, color: 'text-primary' },
    { label: 'Self-healing scan', href: `/app/admin/${orgId}/health`, icon: Sparkles, color: 'text-violet-500' },
    { label: 'Download briefing', href: `/api/enterprise/organizations/${orgId}/decisions/briefing?format=markdown`, icon: FileText, color: 'text-emerald-500', external: true },
  ]
  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="px-4 py-2.5 border-b bg-muted/10">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Quick actions</h2>
      </div>
      <div className="divide-y">
        {actions.map((a) => {
          const Icon = a.icon
          return a.external ? (
            <a key={a.href} href={a.href} download className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors group">
              <Icon className={`h-3.5 w-3.5 ${a.color}`} />
              <span className="flex-1">{a.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            </a>
          ) : (
            <Link key={a.href} href={a.href} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors group">
              <Icon className={`h-3.5 w-3.5 ${a.color}`} />
              <span className="flex-1">{a.label}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── At-a-glance section ────────────────────────────────────────────────────
// Four stat tiles + a 7-day activity sparkline + memory-mix donut + top
// departments by record volume + a decision-status segmented bar. All SVG,
// no chart-library dependency. Hidden gracefully when the API returns
// nothing or the org is empty.
function AtAGlance({ analytics }: { analytics: HomeAnalytics }) {
  const { totals, memoriesByType, decisionsByStatus, reachByDepartment, activityLast7Days } = analytics
  const showCharts = totals.memories > 0 || totals.decisions > 0
  return (
    <div className="space-y-4">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          icon={Users}
          label="Active members"
          value={totals.activeMembers}
          accent="text-blue-600 dark:text-blue-400 bg-blue-500/10"
        />
        <StatTile
          icon={Database}
          label="Memories"
          value={totals.memories}
          sub={totals.recentMemories > 0 ? `+${totals.recentMemories} in 30 days` : undefined}
          accent="text-violet-600 dark:text-violet-400 bg-violet-500/10"
        />
        <StatTile
          icon={Gavel}
          label="Decisions"
          value={totals.decisions}
          accent="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
        />
        <StatTile
          icon={AlertTriangle}
          label="Stale"
          value={totals.staleMemories}
          sub={totals.staleMemories > 0 ? 'past verify cadence' : 'all current'}
          accent={totals.staleMemories > 0 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10' : 'text-slate-500 bg-slate-500/10'}
        />
      </div>

      {/* Charts row */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Memory mix donut */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Memory mix</h3>
              <span className="text-[10px] text-muted-foreground/60 ml-auto">{totals.memories} total</span>
            </div>
            {memoriesByType.length === 0 ? (
              <EmptyChart label="No memories yet" />
            ) : (
              <Donut series={memoriesByType.map((m) => ({ key: m.type, label: m.type, value: m.count }))} />
            )}
          </div>

          {/* Activity bars (7 days) */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ingestion · last 7d</h3>
              <span className="text-[10px] text-muted-foreground/60 ml-auto">
                {activityLast7Days.reduce((s, d) => s + d.count, 0)} memories
              </span>
            </div>
            <ActivityBars data={activityLast7Days} />
          </div>

          {/* Reach by department horizontal bars */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reach by department</h3>
            </div>
            {reachByDepartment.length === 0 ? (
              <EmptyChart label="No populated departments" />
            ) : (
              <ReachBars data={reachByDepartment} />
            )}
          </div>
        </div>
      )}

      {/* Decision status segmented bar */}
      {totals.decisions > 0 && decisionsByStatus.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <Gavel className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Decision status</h3>
            <span className="text-[10px] text-muted-foreground/60 ml-auto">{totals.decisions} total</span>
          </div>
          <DecisionStatusBar data={decisionsByStatus} total={totals.decisions} />
        </div>
      )}
    </div>
  )
}

function StatTile({ icon: Icon, label, value, sub, accent }: {
  icon: typeof Users
  label: string
  value: number
  sub?: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">{label}</div>
        <div className="text-2xl font-bold tracking-tight leading-none">{value.toLocaleString()}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-1.5 truncate">{sub}</div>}
      </div>
    </div>
  )
}

const TYPE_PALETTE: Record<string, string> = {
  decision:   '#7c3aed',
  meeting:    '#2563eb',
  idea:       '#f59e0b',
  insight:    '#10b981',
  context:    '#64748b',
  tasklike:   '#ef4444',
  note:       '#94a3b8',
  transcript: '#ec4899',
}
const FALLBACK_PALETTE = ['#6366f1', '#0ea5e9', '#14b8a6', '#f97316', '#8b5cf6', '#84cc16']

function colorFor(key: string, idx: number): string {
  return TYPE_PALETTE[key] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length]
}

// SVG donut. Series sums and renders proportional arc slices. Any series past
// the 6th is collapsed into an "Other" bucket so the donut stays readable.
function Donut({ series }: { series: Array<{ key: string; label: string; value: number }> }) {
  const collapsed = (() => {
    if (series.length <= 6) return series
    const top = series.slice(0, 5)
    const rest = series.slice(5)
    const otherTotal = rest.reduce((s, x) => s + x.value, 0)
    return [...top, { key: 'other', label: 'Other', value: otherTotal }]
  })()
  const total = collapsed.reduce((s, x) => s + x.value, 0)
  if (total === 0) return <EmptyChart label="No data" />

  const size = 140
  const stroke = 18
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        {collapsed.map((s, idx) => {
          const fraction = s.value / total
          const arcLength = fraction * circumference
          const dasharray = `${arcLength} ${circumference - arcLength}`
          const dashoffset = -offset
          offset += arcLength
          return (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={colorFor(s.key, idx)}
              strokeWidth={stroke}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
            />
          )
        })}
      </svg>
      <ul className="flex-1 min-w-0 space-y-1.5">
        {collapsed.map((s, idx) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0
          return (
            <li key={s.key} className="flex items-center gap-2 text-[12px]">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: colorFor(s.key, idx) }} />
              <span className="capitalize text-foreground/80 truncate flex-1">{s.label}</span>
              <span className="font-semibold tabular-nums">{s.value}</span>
              <span className="text-muted-foreground tabular-nums w-9 text-right">{pct}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ActivityBars({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const labels = data.map((d) => new Date(d.date + 'T00:00:00Z').toLocaleDateString(undefined, { weekday: 'short' }))
  return (
    <div>
      <div className="flex items-end gap-1.5 h-[120px]">
        {data.map((d, i) => {
          const heightPct = (d.count / max) * 100
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-violet-500 to-fuchsia-500"
                  style={{ height: `${Math.max(4, heightPct)}%` }}
                  title={`${d.count} memor${d.count === 1 ? 'y' : 'ies'} · ${d.date}`}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{labels[i]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReachBars({ data }: { data: Array<{ deptId: string; name: string; recordCount: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.recordCount))
  return (
    <ul className="space-y-2">
      {data.map((d, i) => {
        const pct = (d.recordCount / max) * 100
        return (
          <li key={d.deptId} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-[12px]">
              <span className="truncate text-foreground/80">{d.name}</span>
              <span className="font-semibold tabular-nums shrink-0">{d.recordCount}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: FALLBACK_PALETTE[i % FALLBACK_PALETTE.length] }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

const STATUS_COLORS: Record<string, string> = {
  active:     '#10b981',
  superseded: '#f59e0b',
  reversed:   '#ef4444',
  archived:   '#64748b',
}

function DecisionStatusBar({ data, total }: { data: Array<{ status: string; count: number }>; total: number }) {
  if (total === 0) return null
  return (
    <div>
      <div className="h-3 rounded-full overflow-hidden flex bg-muted">
        {data.map((s) => (
          <div
            key={s.status}
            style={{ width: `${(s.count / total) * 100}%`, backgroundColor: STATUS_COLORS[s.status] || '#94a3b8' }}
            title={`${s.status}: ${s.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
        {data.map((s) => (
          <div key={s.status} className="flex items-center gap-1.5 text-[12px]">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: STATUS_COLORS[s.status] || '#94a3b8' }} />
            <span className="capitalize text-foreground/80">{s.status}</span>
            <span className="font-semibold tabular-nums">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[120px] flex items-center justify-center text-[12px] text-muted-foreground">{label}</div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.round(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
