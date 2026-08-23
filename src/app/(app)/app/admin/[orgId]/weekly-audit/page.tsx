'use client'

import { PermissionGate } from '@/components/enterprise/permission-gate'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, AlertCircle, Info, Sparkles, TrendingDown, TrendingUp, Users, Brain, Gavel, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Audit {
  organizationId: string
  generatedAt: string
  score: number
  scoreBucket: 'critical' | 'weak' | 'healthy' | 'excellent'
  topGaps: Array<{ title: string; description: string; severity: 'critical' | 'warn' | 'info'; actionUrl?: string }>
  staleMemories: { count: number; sample: Array<{ id: string; title: string; lastViewedAt: string | null }> }
  contributorGaps: { totalActiveMembers: number; contributedThisWeek: number; silentMembers: Array<{ userId: string; name: string; email: string; lastActiveAt: string | null }> }
  decisionsWithoutRationale: { count: number; sample: Array<{ id: string; title: string; decidedAt: string }> }
  unreversedReversals: { count: number; sample: Array<{ id: string; title: string }> }
  oldOpenInterviews: { count: number }
  totals: {
    activeMembers: number
    totalMemories: number
    memoriesThisWeek: number
    decisionsThisWeek: number
    decisionsAllTime: number
    avgViewsPerMemory: number
  }
}

export default function WeeklyAuditPage(props: { params: { orgId: string } }) {
  return (
    <PermissionGate orgId={props.params.orgId} permission="org.audit.read">
      <WeeklyAuditPageInner {...props} />
    </PermissionGate>
  )
}

function WeeklyAuditPageInner({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [audit, setAudit] = useState<Audit | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/enterprise/organizations/${orgId}/weekly-audit`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data) => { if (alive) { setAudit(data); setLoading(false) } })
      .catch(() => { if (alive) { setErr('Failed to load audit'); setLoading(false) } })
    return () => { alive = false }
  }, [orgId])

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }
  if (err || !audit) {
    return <Card className="p-6 text-sm text-muted-foreground">{err || 'No audit data.'}</Card>
  }

  const scoreColor =
    audit.scoreBucket === 'excellent' ? 'text-emerald-600 dark:text-emerald-400' :
    audit.scoreBucket === 'healthy' ? 'text-blue-600 dark:text-blue-400' :
    audit.scoreBucket === 'weak' ? 'text-amber-600 dark:text-amber-400' :
    'text-rose-600 dark:text-rose-400'

  const scoreBgColor =
    audit.scoreBucket === 'excellent' ? 'bg-emerald-500/10 border-emerald-500/30' :
    audit.scoreBucket === 'healthy' ? 'bg-blue-500/10 border-blue-500/30' :
    audit.scoreBucket === 'weak' ? 'bg-amber-500/10 border-amber-500/30' :
    'bg-rose-500/10 border-rose-500/30'

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold mb-1">Weekly Audit</h1>
        <p className="text-sm text-muted-foreground">
          What&apos;s rotting in your knowledge - and where the next leverage point is hiding.
          Generated <span className="font-medium">{new Date(audit.generatedAt).toLocaleString()}</span>.
        </p>
      </div>

      {/* Headline score card */}
      <Card className={cn('p-6', scoreBgColor)}>
        <div className="flex items-start gap-6">
          <div className="text-center">
            <div className={cn('text-5xl font-semibold', scoreColor)}>{audit.score}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">/ 100</div>
            <div className={cn('text-sm font-medium capitalize mt-2', scoreColor)}>{audit.scoreBucket}</div>
          </div>
          <div className="flex-1">
            <p className="text-sm leading-relaxed">
              {audit.scoreBucket === 'excellent' && 'Your organizational memory is in great shape. Capture is happening, decisions have rationale, contributors are spread, stale content is being trimmed. Keep the loops running.'}
              {audit.scoreBucket === 'healthy' && 'Your organizational memory is in solid shape. There are 1-2 patterns to tighten - see the gaps below - but nothing is on fire.'}
              {audit.scoreBucket === 'weak' && 'Your knowledge has soft spots. Several patterns are pulling the score down. Address the top gap below first; the others tend to follow.'}
              {audit.scoreBucket === 'critical' && 'Your knowledge is at risk. Multiple patterns are broken at once. Treat the gaps below as triage - pick one, ship the fix, re-run.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Top 3 gaps */}
      {audit.topGaps.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Top leverage gaps</h2>
          <div className="space-y-2">
            {audit.topGaps.map((gap, i) => {
              const Icon = gap.severity === 'critical' ? AlertCircle
                : gap.severity === 'warn' ? AlertTriangle
                : Info
              const color =
                gap.severity === 'critical' ? 'text-rose-600 dark:text-rose-400' :
                gap.severity === 'warn' ? 'text-amber-600 dark:text-amber-400' :
                'text-blue-600 dark:text-blue-400'
              return (
                <Card key={i} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('mt-0.5 flex-shrink-0', color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-muted-foreground">#{i + 1}</span>
                        <h3 className="font-medium text-sm">{gap.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{gap.description}</p>
                    </div>
                    {gap.actionUrl && (
                      <Link href={gap.actionUrl} className="flex-shrink-0">
                        <Button variant="outline" size="sm">Fix</Button>
                      </Link>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Headline metrics grid */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">This week at a glance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="Active members" value={audit.totals.activeMembers} icon={Users} />
          <Metric label="Total memories" value={audit.totals.totalMemories} icon={Brain} />
          <Metric label="Memories (7d)" value={audit.totals.memoriesThisWeek} icon={TrendingUp} accent={audit.totals.memoriesThisWeek === 0} />
          <Metric label="Decisions (7d)" value={audit.totals.decisionsThisWeek} icon={Gavel} />
          <Metric label="All-time decisions" value={audit.totals.decisionsAllTime} icon={Gavel} />
          <Metric label="Avg views/memory" value={audit.totals.avgViewsPerMemory} icon={Sparkles} />
          <Metric label="Stale memories" value={audit.staleMemories.count} icon={TrendingDown} accent={audit.staleMemories.count > 0} />
          <Metric label="Silent contributors" value={audit.contributorGaps.silentMembers.length} icon={Users} accent={audit.contributorGaps.silentMembers.length > 0} />
        </div>
      </section>

      {/* Evidence sections */}
      {audit.staleMemories.sample.length > 0 && (
        <Section title="Stale memories sample" icon={Clock}>
          <ul className="text-sm divide-y divide-border">
            {audit.staleMemories.sample.map((m) => (
              <li key={m.id} className="py-2 flex items-center gap-3">
                <Link href={`/app/memories/${m.id}`} className="flex-1 min-w-0 truncate hover:text-primary">
                  {m.title}
                </Link>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {m.lastViewedAt ? `viewed ${new Date(m.lastViewedAt).toLocaleDateString()}` : 'never opened'}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {audit.contributorGaps.silentMembers.length > 0 && (
        <Section title="Silent contributors this week" icon={Users}>
          <p className="text-xs text-muted-foreground mb-2">
            {audit.contributorGaps.contributedThisWeek} of {audit.contributorGaps.totalActiveMembers} active members captured at least one memory this week.
          </p>
          <ul className="text-sm divide-y divide-border">
            {audit.contributorGaps.silentMembers.map((m) => (
              <li key={m.userId} className="py-2 flex items-center gap-3">
                <span className="flex-1 min-w-0 truncate">{m.name || m.email}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {m.lastActiveAt ? `last active ${new Date(m.lastActiveAt).toLocaleDateString()}` : 'no chat sessions'}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {audit.decisionsWithoutRationale.sample.length > 0 && (
        <Section title="Decisions logged without rationale" icon={Gavel}>
          <ul className="text-sm divide-y divide-border">
            {audit.decisionsWithoutRationale.sample.map((d) => (
              <li key={d.id} className="py-2 flex items-center gap-3">
                <Link href={`/app/admin/${orgId}/decisions`} className="flex-1 min-w-0 truncate hover:text-primary">{d.title}</Link>
                <span className="text-xs text-muted-foreground flex-shrink-0">{new Date(d.decidedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <p>
            v1 of Weekly Audit is deterministic - pure SQL over the last 7 / 90 days.
            v2 will email this report every Monday morning to org admins, narrated by the AI
            with concrete next-week actions tied to your active priorities.
          </p>
        </div>
      </Card>
    </div>
  )
}

function Metric({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: typeof Users; accent?: boolean }) {
  return (
    <Card className={cn('p-3', accent && 'border-amber-500/40 bg-amber-500/5')}>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </Card>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Users; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h2>
      {children}
    </Card>
  )
}
