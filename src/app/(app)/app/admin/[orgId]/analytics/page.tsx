'use client'

// Admin analytics — the "where is value coming from" dashboard.
//
// Totals strip + most-viewed memories + reach-by-department table +
// stale-memory alert. Everything windowed to the last 30 days by default.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  LineChart, Users, Brain, Gavel, FileText, Search, AlertTriangle,
  Loader2, Flame, Building2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Totals {
  activeMembers: number
  memories: number
  recentMemories: number
  decisions: number
  policies: number
  recentQueries: number
  staleMemories: number
}

interface Overview {
  windowDays: number
  totals: Totals
  mostViewed: Array<{ id: string; title: string; type: string; viewCount: number }>
  reachByDepartment: Array<{ deptId: string; name: string; recordCount: number }>
}

export default function AnalyticsPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/enterprise/analytics/overview?orgId=${orgId}&days=${days}`)
        if (!res.ok) return
        const d = await res.json()
        if (!cancelled) setData(d)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [orgId, days])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
            <LineChart className="h-3.5 w-3.5" /> Analytics
          </div>
          <h1 className="font-display text-3xl tracking-tight">Where value is flowing</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Adoption + usage patterns across your org. Shows what memories get viewed, which
            departments are contributing, which content is going stale.
          </p>
        </div>
        <div className="flex gap-1 border rounded-full p-0.5 shrink-0">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'px-3 py-1 rounded-full text-xs transition-colors',
                days === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Crunching numbers…
        </Card>
      ) : data && (
        <>
          {/* Totals strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <Stat icon={Users} label="Active members" value={data.totals.activeMembers} />
            <Stat icon={Brain} label="Memories" value={data.totals.memories} />
            <Stat icon={Brain} label={`+${data.totals.recentMemories}`} sub={`in ${data.windowDays}d`} value="" highlight />
            <Stat icon={Gavel} label="Decisions" value={data.totals.decisions} />
            <Stat icon={FileText} label="Policies" value={data.totals.policies} />
            <Stat icon={Search} label="Queries" value={data.totals.recentQueries} sub={`${data.windowDays}d`} />
            <Stat
              icon={AlertTriangle}
              label="Stale"
              value={data.totals.staleMemories}
              tone={data.totals.staleMemories > 0 ? 'warning' : 'ok'}
              sub="past cadence"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Most viewed */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="h-4 w-4 text-orange-500" />
                <h2 className="text-sm font-semibold">Most-viewed memories</h2>
                <span className="text-[10px] text-muted-foreground">last {data.windowDays} days</span>
              </div>
              {data.mostViewed.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-6 text-center">No views yet in this window.</p>
              ) : (
                <ul className="space-y-1">
                  {data.mostViewed.map((r, i) => (
                    <li key={r.id}>
                      <Link href={`/app/memories/${r.id}`} className="flex items-center gap-2 text-xs py-1 rounded hover:bg-muted/30 transition-colors px-1">
                        <span className="text-[10px] font-bold text-orange-500 w-4 tabular-nums">{i + 1}</span>
                        <span className="flex-1 truncate">{r.title}</span>
                        <Badge variant="outline" className="text-[9px]">{r.type}</Badge>
                        <span className="text-[11px] text-muted-foreground tabular-nums">{r.viewCount}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Reach by dept */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Reach by department</h2>
                <span className="text-[10px] text-muted-foreground">memories per dept</span>
              </div>
              {data.reachByDepartment.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-6 text-center">No departments yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.reachByDepartment.map((d) => {
                    const max = data.reachByDepartment[0]?.recordCount || 1
                    const pct = Math.round((d.recordCount / max) * 100)
                    return (
                      <li key={d.deptId} className="text-xs">
                        <div className="flex items-center justify-between">
                          <Link href={`/app/wiki?tab=hierarchy&deptId=${d.deptId}`} className="truncate flex-1 hover:text-primary">
                            {d.name}
                          </Link>
                          <span className="text-[11px] text-muted-foreground tabular-nums">{d.recordCount}</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden mt-1">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Stale alert */}
          {data.totals.staleMemories > 0 && (
            <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-yellow-900 dark:text-yellow-400">
                    {data.totals.staleMemories} memor{data.totals.staleMemories === 1 ? 'y' : 'ies'} past cadence
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    These have a verification schedule set but the owner hasn&apos;t re-verified them. Stale memory is
                    worse than no memory — either re-verify, update, or archive.
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/app/admin/${orgId}/health`}>Open Self-healing</Link>
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </motion.div>
  )
}

function Stat({
  icon: Icon, label, value, sub, tone, highlight,
}: {
  icon: any
  label: string
  value: number | string
  sub?: string
  tone?: 'ok' | 'warning'
  highlight?: boolean
}) {
  return (
    <Card className={cn(
      'p-3',
      tone === 'warning' && 'border-yellow-500/30 bg-yellow-500/5',
      highlight && 'border-emerald-500/30 bg-emerald-500/5',
    )}>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        <span className="truncate">{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </Card>
  )
}
