'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Activity, AlertTriangle, Clock, GitBranch, UserX, Sparkles, RefreshCw, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Kind = 'stale' | 'orphaned' | 'gap' | 'contradiction'
type Severity = 'info' | 'warning' | 'critical'

interface Finding {
  kind: Kind
  severity: Severity
  title: string
  detail: string
  resourceType: string
  resourceId: string
  secondaryResourceId?: string
  workspaceId?: string
  departmentId?: string | null
  signal?: number
  meta?: Record<string, unknown>
}

interface Latest {
  totalRecords: number
  staleCount: number
  contradictionsCount: number
  gapsCount: number
  orphanedCount: number
  healthScore: number
  findings: Finding[]
  computedAt: string
}

const KIND_META: Record<Kind, { label: string; icon: typeof Clock; color: string }> = {
  stale: { label: 'Stale', icon: Clock, color: 'text-amber-500' },
  orphaned: { label: 'Orphaned', icon: UserX, color: 'text-rose-500' },
  gap: { label: 'Knowledge gap', icon: GitBranch, color: 'text-blue-500' },
  contradiction: { label: 'Contradiction', icon: AlertTriangle, color: 'text-violet-500' },
}

const SEVERITY_STYLE: Record<Severity, string> = {
  info: 'bg-muted text-muted-foreground',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  critical: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
}

interface Dept {
  id: string
  name: string
  kind: string
}

export default function HealthPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [latest, setLatest] = useState<Latest | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [kindFilter, setKindFilter] = useState<Kind | 'all'>('all')
  const [departments, setDepartments] = useState<Dept[]>([])
  const [deptFilter, setDeptFilter] = useState<string>('') // '' = org-wide

  async function loadLatest(deptId: string = deptFilter) {
    setErr(null)
    const q = deptId ? `?departmentId=${deptId}` : ''
    const res = await fetch(`/api/enterprise/organizations/${orgId}/health${q}`)
    if (!res.ok) {
      setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      setLoading(false)
      return
    }
    const data = await res.json()
    setLatest(data.latest)
    setLoading(false)
  }

  async function loadDepts() {
    const res = await fetch(`/api/enterprise/organizations/${orgId}/departments`)
    if (res.ok) setDepartments((await res.json()).departments)
  }

  async function runScan() {
    setScanning(true)
    setErr(null)
    try {
      // Scan is always org-wide — it writes both the org roll-up row AND
      // per-dept rows. After the scan, we re-load the current filter scope.
      const res = await fetch(`/api/enterprise/organizations/${orgId}/health`, { method: 'POST' })
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      await loadLatest()
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    loadLatest()
    loadDepts()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadLatest(deptFilter)
  }, [deptFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    if (!latest) return []
    if (kindFilter === 'all') return latest.findings
    return latest.findings.filter((f) => f.kind === kindFilter)
  }, [latest, kindFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-3xl tracking-tight flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            Self-healing
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Auto-detects stale policies, contradicting decisions, orphaned knowledge, and silent departments.
            The part of Reattend that <em>Glean can&apos;t build</em>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {departments.length > 0 && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              title="Scope findings to a department"
            >
              <option value="">Org-wide</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          <Button onClick={runScan} disabled={scanning}>
            <RefreshCw className={cn('h-4 w-4 mr-1.5', scanning && 'animate-spin')} />
            {scanning ? 'Scanning…' : 'Run scan'}
          </Button>
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card>
      ) : !latest ? (
        <Card className="p-8 text-center">
          <Activity className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <h3 className="font-medium mb-1">No scan yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Run your first scan to see the health of your organization&apos;s memory.</p>
          <Button onClick={runScan} disabled={scanning}>
            <Sparkles className="h-4 w-4 mr-1.5" />
            Run first scan
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <ScoreCard score={latest.healthScore} totalRecords={latest.totalRecords} computedAt={latest.computedAt} />
            <KindCard k="stale" count={latest.staleCount} onClick={() => setKindFilter('stale')} active={kindFilter === 'stale'} />
            <KindCard k="orphaned" count={latest.orphanedCount} onClick={() => setKindFilter('orphaned')} active={kindFilter === 'orphaned'} />
            <KindCard k="gap" count={latest.gapsCount} onClick={() => setKindFilter('gap')} active={kindFilter === 'gap'} />
            <KindCard k="contradiction" count={latest.contradictionsCount} onClick={() => setKindFilter('contradiction')} active={kindFilter === 'contradiction'} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setKindFilter('all')}
                className={cn(
                  'text-xs px-2.5 py-1 rounded-full border transition-colors',
                  kindFilter === 'all' ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                All ({latest.findings.length})
              </button>
              {(['stale', 'orphaned', 'gap', 'contradiction'] as Kind[]).map((k) => {
                const count = latest.findings.filter((f) => f.kind === k).length
                if (count === 0) return null
                const active = kindFilter === k
                return (
                  <button
                    key={k}
                    onClick={() => setKindFilter(k)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-colors',
                      active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {KIND_META[k].label} ({count})
                  </button>
                )
              })}
            </div>
            <span className="text-xs text-muted-foreground">
              Scanned {new Date(latest.computedAt).toLocaleString()}
            </span>
          </div>

          <Card className="p-0 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {latest.findings.length === 0 ? 'Clean bill of health. Nothing to fix.' : 'No findings in this category.'}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((f, idx) => {
                  const meta = KIND_META[f.kind]
                  const Icon = meta.icon
                  return (
                    <li key={`${f.resourceId}-${f.secondaryResourceId ?? ''}-${idx}`} className="p-4 flex items-start gap-3">
                      <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', meta.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{f.title}</span>
                          <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wider border-0', SEVERITY_STYLE[f.severity])}>
                            {f.severity}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{f.detail}</div>
                      </div>
                      <span className="text-[11px] text-muted-foreground capitalize flex-shrink-0 whitespace-nowrap">
                        {meta.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

function ScoreCard({ score, totalRecords, computedAt }: { score: number; totalRecords: number; computedAt: string }) {
  const color = score >= 85 ? 'text-emerald-500' : score >= 60 ? 'text-amber-500' : 'text-rose-500'
  const _ = computedAt // referenced for API completeness
  return (
    <Card className="p-4 sm:col-span-2 lg:col-span-1">
      <div className="text-xs text-muted-foreground mb-1">Health score</div>
      <div className={cn('text-3xl font-semibold tabular-nums', color)}>{score}</div>
      <div className="text-xs text-muted-foreground mt-1">{totalRecords} records scanned</div>
    </Card>
  )
}

function KindCard({
  k,
  count,
  onClick,
  active,
}: {
  k: Kind
  count: number
  onClick: () => void
  active: boolean
}) {
  const meta = KIND_META[k]
  const Icon = meta.icon
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left border rounded-lg p-4 transition-colors',
        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30',
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className={cn('h-3.5 w-3.5', meta.color)} />
        {meta.label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{count}</div>
    </button>
  )
}
