'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Activity, Users, MessageSquare, Database, UserX, Clock, AlertTriangle,
  GitBranch, ArrowUpRight, Gavel, Network, Sparkles, RefreshCw, TrendingDown,
  AlertCircle, ChevronRight, Zap, ArrowRightLeft,
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

  async function load() {
    setErr(null)
    const res = await fetch(`/api/enterprise/organizations/${orgId}/overview`)
    if (!res.ok) {
      setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      setLoading(false)
      return
    }
    const body = await res.json()
    setData(body.overview)
    setLoading(false)
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

  useEffect(() => {
    load()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <Card className="p-8 text-sm text-muted-foreground text-center">Loading memory health cockpit…</Card>
  }
  if (err) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-3">
        <AlertCircle className="h-4 w-4" />
        {err}
      </div>
    )
  }
  if (!data) return null

  const h = data.hero
  const isEmpty = h.totalRecords === 0 && data.amnesiaSignals.lastScanAt === null

  return (
    <div className="space-y-6">
      {/* Hero row */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-tight">
            Memory health cockpit
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your organization&apos;s memory at a glance. The signals below are what Glean cannot show you.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="default">
            <Link href={`/app/admin/${orgId}/transfers`}>
              <ArrowRightLeft className="h-4 w-4 mr-1.5" />
              Transfer knowledge
            </Link>
          </Button>
          <Button onClick={runScan} disabled={scanning} variant="outline">
            <RefreshCw className={cn('h-4 w-4 mr-1.5', scanning && 'animate-spin')} />
            {scanning ? 'Scanning…' : 'Run self-healing scan'}
          </Button>
        </div>
      </div>

      {/* Onboarding checklist — shown until the org has run its first scan */}
      <OnboardingChecklist data={data} orgId={orgId} />

      {isEmpty && (
        <Card className="p-5 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="font-medium text-sm">Your memory is empty</div>
              <p className="text-sm text-muted-foreground mt-1">
                Go to <Link href={`/app/admin/${orgId}/departments`} className="text-primary hover:underline">Departments</Link> and create a team.
                Teams get a backing memory workspace — decisions, records, and insights land there.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Big metrics ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HealthScoreCard score={h.healthScore} />
        <HeroCard
          icon={Database}
          label="Memories captured"
          value={h.totalRecords.toLocaleString()}
          sub={h.recordsLast30d > 0 ? `+${h.recordsLast30d} in 30 days` : 'No recent captures'}
          subPositive={h.recordsLast30d > 0}
        />
        <HeroCard
          icon={Gavel}
          label="Decisions this month"
          value={h.decisionsThisMonth.toString()}
          sub={
            h.totalDecisions > 0
              ? `${Math.round(h.reversedRate * 100)}% reversed rate (all time)`
              : 'No decisions yet'
          }
          subDanger={h.reversedRate > 0.25}
        />
        <HeroCard
          icon={Users}
          label="Active members"
          value={h.activeMembers.toString()}
          sub={h.offboardedCount > 0 ? `${h.offboardedCount} offboarded` : `${h.totalMembers} total`}
        />
      </div>

      {/* ── Amnesia signals ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Amnesia signals
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.amnesiaSignals.lastScanAt
                ? `Last scan: ${new Date(data.amnesiaSignals.lastScanAt).toLocaleString()}`
                : 'No scan yet — run one to populate.'}
            </p>
          </div>
          <Link href={`/app/admin/${orgId}/health`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            Open Self-healing <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SignalCard icon={Clock} label="Stale" count={data.amnesiaSignals.stale} color="text-amber-500" />
          <SignalCard icon={UserX} label="Orphaned" count={data.amnesiaSignals.orphaned} color="text-rose-500" />
          <SignalCard icon={AlertTriangle} label="Contradictions" count={data.amnesiaSignals.contradictions} color="text-violet-500" />
          <SignalCard icon={GitBranch} label="Silent departments" count={data.amnesiaSignals.gaps} color="text-blue-500" />
        </div>
      </section>

      {/* ── Decision velocity + Ingestion ───────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Decision velocity (12 weeks)</h3>
            <Link href={`/app/admin/${orgId}/decisions`} className="text-xs text-primary hover:underline">All decisions</Link>
          </div>
          <VelocityChart buckets={data.decisionVelocity} field="decisions" secondaryField="reversed" />
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <LegendDot color="bg-primary" label="Decisions made" />
            <LegendDot color="bg-rose-500" label="Reversed" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Ingestion volume (12 weeks)</h3>
            <span className="text-xs text-muted-foreground">
              {h.sourcesActive}/{h.sourcesTotal} sources active
            </span>
          </div>
          <VelocityChart buckets={data.decisionVelocity} field="records" />
          <div className="text-xs text-muted-foreground mt-2">
            {h.askVolume30d > 0 ? (
              <>{h.askVolume30d} Ask-AI queries in the last 30 days</>
            ) : (
              <>No Ask-AI activity yet — have a team member try the sidebar&apos;s Ask panel</>
            )}
          </div>
        </Card>
      </section>

      {/* ── Knowledge gravity + Turnover impact ─────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Network className="h-4 w-4 text-muted-foreground" />
              Knowledge gravity
            </h3>
            <Link href={`/app/admin/${orgId}/departments`} className="text-xs text-primary hover:underline">Departments</Link>
          </div>
          {data.knowledgeGravity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No departments yet.</p>
          ) : (
            <GravityChart items={data.knowledgeGravity} />
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              Turnover impact
            </h3>
            <Link href={`/app/admin/${orgId}/members`} className="text-xs text-primary hover:underline">Members</Link>
          </div>
          {data.turnoverImpact.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No offboardings yet. This panel will show what each departure cost the organization — records authored, decisions made, roles left vacant.
            </div>
          ) : (
            <ul className="space-y-3">
              {data.turnoverImpact.map((t) => (
                <li key={t.userId} className="text-sm">
                  <div className="flex items-center justify-between flex-wrap gap-x-2">
                    <span className="font-medium">{t.name || t.email}</span>
                    <span className="text-xs text-muted-foreground">
                      Left {new Date(t.offboardedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.recordsAuthored} record{t.recordsAuthored === 1 ? '' : 's'} · {t.decisionsAuthored} decision{t.decisionsAuthored === 1 ? '' : 's'}
                    {t.rolesVacatedCount > 0 && (
                      <span className="text-rose-600 dark:text-rose-400">
                        {' · '}{t.rolesVacatedCount} role{t.rolesVacatedCount === 1 ? '' : 's'} still vacant
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* ── Pending handovers + Critical findings ───────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <UserX className="h-4 w-4 text-muted-foreground" />
              Pending handovers
            </h3>
            <Link href={`/app/admin/${orgId}/transfers`} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              Transfer knowledge <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {data.pendingHandovers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vacant roles. Every role has a holder.</p>
          ) : (
            <ul className="space-y-2">
              {data.pendingHandovers.map((p) => (
                <li key={p.roleId} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.roleTitle}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.departmentName ?? 'No department'}
                      {p.vacantSinceIso && <> · vacant since {new Date(p.vacantSinceIso).toLocaleDateString()}</>}
                    </div>
                  </div>
                  {p.ownedRecordsCount > 0 && (
                    <span className="text-xs text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      {p.ownedRecordsCount} orphaned
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Critical findings
            </h3>
            <Link href={`/app/admin/${orgId}/health`} className="text-xs text-primary hover:underline">Self-healing</Link>
          </div>
          {data.criticalFindings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {data.amnesiaSignals.lastScanAt ? 'No critical findings.' : 'Run a scan to surface findings.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {data.criticalFindings.map((f, i) => (
                <li key={`${f.resourceId}-${i}`} className="text-sm py-1.5 border-b border-border last:border-0">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 mt-0.5 flex-shrink-0">
                      {f.kind}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate">{f.title}</div>
                      <div className="text-xs text-muted-foreground">{f.detail}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  )
}

// ── Primitives ─────────────────────────────────────────────────────────

function HealthScoreCard({ score }: { score: number | null }) {
  const color = score === null
    ? 'text-muted-foreground'
    : score >= 85 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-rose-500'
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Activity className="h-3.5 w-3.5" />
        Health score
      </div>
      <div className={cn('text-3xl font-semibold tabular-nums', color)}>
        {score === null ? '—' : score}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {score === null ? 'Run scan to compute' : score >= 85 ? 'Healthy' : score >= 60 ? 'Needs attention' : 'At risk'}
      </div>
    </Card>
  )
}

function HeroCard({
  icon: Icon, label, value, sub, subPositive, subDanger,
}: {
  icon: typeof Database; label: string; value: string; sub?: string; subPositive?: boolean; subDanger?: boolean
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      {sub && (
        <div className={cn(
          'text-xs mt-1',
          subPositive && 'text-emerald-600 dark:text-emerald-400',
          subDanger && 'text-rose-600 dark:text-rose-400',
          !subPositive && !subDanger && 'text-muted-foreground',
        )}>
          {subPositive && <ArrowUpRight className="inline h-3 w-3 mr-0.5" />}
          {sub}
        </div>
      )}
    </Card>
  )
}

function SignalCard({
  icon: Icon, label, count, color,
}: { icon: typeof Clock; label: string; count: number; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className={cn('h-3.5 w-3.5', color)} />
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{count}</div>
    </Card>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full', color)} />
      {label}
    </span>
  )
}

function VelocityChart({
  buckets,
  field,
  secondaryField,
}: {
  buckets: Array<{ weekStart: string; decisions: number; reversed: number; records: number }>
  field: 'decisions' | 'records'
  secondaryField?: 'reversed'
}) {
  if (buckets.length === 0) return <div className="h-24 text-xs text-muted-foreground">No data.</div>
  const max = Math.max(1, ...buckets.map((b) => b[field]))
  return (
    <div className="flex items-end gap-1 h-24">
      {buckets.map((b) => {
        const h = (b[field] / max) * 100
        const secondaryH = secondaryField ? (b[secondaryField] / max) * 100 : 0
        return (
          <div
            key={b.weekStart}
            className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative"
            title={`Week of ${new Date(b.weekStart).toLocaleDateString()}: ${b[field]}${secondaryField ? ` (${b[secondaryField]} ${secondaryField})` : ''}`}
          >
            {secondaryField && b[secondaryField] > 0 && (
              <div
                className="w-full bg-rose-500/70 rounded-sm"
                style={{ height: `${Math.max(2, secondaryH)}%` }}
              />
            )}
            <div
              className="w-full bg-primary/80 rounded-sm"
              style={{ height: `${Math.max(b[field] > 0 ? 2 : 0, h - secondaryH)}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

function GravityChart({
  items,
}: {
  items: Array<{ id: string; name: string; kind: string; recordCount: number; decisionCount: number; memberCount: number }>
}) {
  const max = Math.max(1, ...items.map((i) => i.recordCount))
  return (
    <ul className="space-y-2">
      {items.map((i) => {
        const pct = (i.recordCount / max) * 100
        return (
          <li key={i.id}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium truncate">{i.name}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                {i.recordCount} records{i.memberCount > 0 && ` · ${i.memberCount} members`}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/70 rounded-full"
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// MessageSquare import keeps the tree-shaker happy if we later surface Ask analytics
const _unused = MessageSquare

// ─── Onboarding checklist ──────────────────────────────────────────────────
// Shown until the org has completed all setup steps. Collapses when fully done.
// Drives new admins through the 5 things they need to unlock the cockpit.

interface ChecklistItem {
  key: string
  label: string
  done: boolean
  cta: string
  href: string
}

function OnboardingChecklist({ data, orgId }: { data: OverviewData; orgId: string }) {
  // Dismissal is persisted per-org in localStorage so "Skip" actually skips
  // for good — not just until the next render. Each org keeps its own flag
  // so an admin in Org A skipping doesn't hide it in Org B.
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
      done: data.knowledgeGravity.some((d) => d.kind === 'team'),
      cta: 'New team',
      href: `/app/admin/${orgId}/departments`,
    },
    {
      key: 'members',
      label: 'Invite at least 3 members',
      done: data.hero.totalMembers >= 3,
      cta: 'Invite',
      href: `/app/admin/${orgId}/members`,
    },
    {
      key: 'memory',
      label: 'Capture your first memory',
      done: data.hero.totalRecords > 0,
      cta: 'Capture',
      href: `/app/memories`,
    },
    {
      key: 'decision',
      label: 'Log your first decision',
      done: data.hero.totalDecisions > 0,
      cta: 'Log decision',
      href: `/app/admin/${orgId}/decisions`,
    },
    {
      key: 'scan',
      label: 'Run your first self-healing scan',
      done: !!data.amnesiaSignals.lastScanAt,
      cta: 'Run scan',
      href: `/app/admin/${orgId}/health`,
    },
    {
      key: 'sso',
      label: 'Set up SSO (optional)',
      done: false, // we don't have a signal for this in the overview yet
      cta: 'Configure',
      href: `/app/admin/${orgId}/sso`,
    },
  ]

  const doneCount = items.filter((i) => i.done).length
  const totalRequired = items.length - 1 // SSO is optional
  const allDone = doneCount >= totalRequired

  if (dismissed || allDone) return null

  return (
    <Card className="p-5 border-primary/20 bg-primary/[0.03]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display text-xl">Get the cockpit live</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {doneCount} of {totalRequired} required steps complete. This panel dismisses automatically once you&apos;re set up.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums">{Math.round((doneCount / totalRequired) * 100)}%</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">setup</div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Hide this panel for this org. You can bring it back from settings."
          >
            Skip for now
          </button>
        </div>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${(doneCount / totalRequired) * 100}%` }}
        />
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.key}
            className={cn(
              'flex items-center gap-3 py-1.5 text-sm transition-colors',
              item.done && 'text-muted-foreground',
            )}
          >
            <div
              className={cn(
                'h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0',
                item.done ? 'bg-primary border-primary' : 'border-border',
              )}
            >
              {item.done && <CheckIcon />}
            </div>
            <span className={cn('flex-1', item.done && 'line-through')}>{item.label}</span>
            {!item.done && (
              <Link
                href={item.href}
                className="text-xs text-primary hover:underline font-medium"
              >
                {item.cta} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
