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
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'
import { SyncStatusCard } from '@/components/enterprise/sync-status-card'
import { StartMyDayCard } from '@/components/enterprise/start-my-day-card'
import { MemoryResurfaceCard } from '@/components/enterprise/memory-resurface-card'

type PendingPolicy = { policyId: string; title: string; category: string | null }
type Decision = { id: string; title: string; status: string; createdAt: string; decidedAt: string }
type MemoryRow = { id: string; title: string; type: string; createdAt: string; summary: string | null }

export default function HomePage() {
  const { activeEnterpriseOrgId, hasHydratedStore, enterpriseOrgs, captureOpen, setCaptureOpen } = useAppStore()

  const [pending, setPending] = useState<PendingPolicy[]>([])
  const [recentDecisions, setRecentDecisions] = useState<Decision[]>([])
  const [recentRecords, setRecentRecords] = useState<MemoryRow[]>([])
  const [loading, setLoading] = useState(true)

  const activeOrg = enterpriseOrgs.find((o) => o.orgId === activeEnterpriseOrgId)
  const displayName = activeOrg?.orgName || 'your organization'

  useEffect(() => {
    if (!hasHydratedStore || !activeEnterpriseOrgId) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const [pendRes, decRes, recRes] = await Promise.all([
          fetch(`/api/enterprise/policies/pending?orgId=${activeEnterpriseOrgId}`),
          fetch(`/api/enterprise/organizations/${activeEnterpriseOrgId}/decisions?limit=5`),
          fetch('/api/records?limit=6'),
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

      {/* Start My Day — morning briefing (Claude-synthesized) */}
      <StartMyDayCard orgId={activeEnterpriseOrgId} />

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
          <div className="rounded-2xl border bg-card overflow-hidden">
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
          <div className="rounded-2xl border bg-card overflow-hidden">
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
    <div className="rounded-2xl border bg-card overflow-hidden">
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
