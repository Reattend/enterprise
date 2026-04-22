'use client'

// The Start-My-Day card — daily briefing card on Home.
//
// Fetches /api/enterprise/start-my-day and renders a single prominent card
// with:
//   - Claude-synthesized 3-sentence focus
//   - Count strip (new memories / decisions / pending acks)
//   - Top 3 highlights with click-through
//
// Hidden entirely when nothing has happened in the last 24h (no pending
// acks either) so it doesn't add noise on quiet days.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, Loader2, FileText, Gavel, AlertTriangle, ArrowRightLeft, Clock,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Counts = {
  newMemories: number
  newDecisions: number
  reversals: number
  supersessions: number
  pendingAcks: number
  incomingTransfers: number
}

type Highlights = {
  memories: Array<{ id: string; title: string; type: string; summary: string | null; by: string | null; createdAt: string }>
  decisions: Array<{ id: string; title: string; status: string; by: string | null; decidedAt: string }>
  pendingPolicies: Array<{ policyId: string; title: string; category: string | null }>
}

type BriefingData = {
  since: string
  user: { name: string | null; email: string }
  counts: Counts
  focus: string | null
  highlights: Highlights
}

// Key used in localStorage to remember the last time this user "checked in"
// so "since last visit" briefings show the right delta on subsequent visits.
const LAST_VISIT_KEY = 'reattend:start-my-day:last-visit'

export function StartMyDayCard({ orgId }: { orgId: string }) {
  const [data, setData] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        // Use last-visit timestamp if we have one + it's within the last 7 days.
        // Otherwise default to 24h (server computes).
        let sinceParam = ''
        if (typeof window !== 'undefined') {
          const last = localStorage.getItem(LAST_VISIT_KEY)
          if (last) {
            const ageMs = Date.now() - parseInt(last, 10)
            if (ageMs > 30 * 60 * 1000 && ageMs < 7 * 24 * 60 * 60 * 1000) {
              sinceParam = `&since=${encodeURIComponent(new Date(parseInt(last, 10)).toISOString())}`
            }
          }
        }
        const res = await fetch(`/api/enterprise/start-my-day?orgId=${orgId}${sinceParam}`)
        if (!res.ok) { if (!cancelled) setData(null); return }
        const d = await res.json()
        if (!cancelled) {
          setData(d)
          // Bump last-visit AFTER successful load so next call picks up the
          // new delta. Skip if nothing happened (stay anchored to prior visit).
          const hadSomething = (d?.counts?.newMemories || 0) + (d?.counts?.newDecisions || 0) + (d?.counts?.pendingAcks || 0) > 0
          if (hadSomething && typeof window !== 'undefined') {
            localStorage.setItem(LAST_VISIT_KEY, String(Date.now()))
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [orgId])

  if (loading) {
    return (
      <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Composing your briefing…
        </div>
      </div>
    )
  }

  if (!data) return null
  const c = data.counts
  const hasActivity = c.newMemories + c.newDecisions + c.pendingAcks + c.incomingTransfers > 0

  // Quiet day — if no Claude focus AND no counts, hide entirely so we don't
  // take up vertical space with "nothing happened".
  if (!hasActivity && !data.focus) return null

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-transparent to-transparent overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Since your last visit · {relativeTime(data.since)}
            </div>
            {data.focus ? (
              <p className="text-sm leading-relaxed">{data.focus}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Quiet since you were last here.</p>
            )}
          </div>
        </div>

        {/* Count strip */}
        {hasActivity && (
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {c.reversals > 0 && (
              <CountPill
                icon={AlertTriangle}
                label={`${c.reversals} reversal${c.reversals === 1 ? '' : 's'}`}
                tone="red"
              />
            )}
            {c.newDecisions > 0 && (
              <CountPill
                icon={Gavel}
                label={`${c.newDecisions} decision${c.newDecisions === 1 ? '' : 's'}`}
                tone="violet"
              />
            )}
            {c.pendingAcks > 0 && (
              <CountPill
                icon={FileText}
                label={`${c.pendingAcks} need${c.pendingAcks === 1 ? 's' : ''} ack`}
                tone="yellow"
              />
            )}
            {c.newMemories > 0 && (
              <CountPill
                icon={Sparkles}
                label={`${c.newMemories} new memor${c.newMemories === 1 ? 'y' : 'ies'}`}
                tone="blue"
              />
            )}
            {c.incomingTransfers > 0 && (
              <CountPill
                icon={ArrowRightLeft}
                label={`${c.incomingTransfers} transfer${c.incomingTransfers === 1 ? '' : 's'} to you`}
                tone="emerald"
              />
            )}
          </div>
        )}

        {/* Highlights row */}
        {data.highlights.decisions.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Notable decisions</div>
            {data.highlights.decisions.slice(0, 3).map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-xs">
                <Gavel className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{d.title}</span>
                {d.by && <span className="text-[10px] text-muted-foreground shrink-0">· {d.by}</span>}
                <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(d.decidedAt)}</span>
              </div>
            ))}
          </div>
        )}

        {data.highlights.memories.length > 0 && data.highlights.decisions.length < 3 && (
          <div className="space-y-1 pt-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">New in your scope</div>
            {data.highlights.memories.slice(0, 3).map((m) => (
              <Link
                key={m.id}
                href={`/app/memories/${m.id}`}
                className="flex items-center gap-2 text-xs hover:text-primary transition-colors"
              >
                <span className={cn('rounded px-1 py-0.5 text-[9px] uppercase tracking-wide', typeBadge(m.type))}>
                  {m.type}
                </span>
                <span className="truncate flex-1">{m.title}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(m.createdAt)}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
              </Link>
            ))}
          </div>
        )}

        {c.pendingAcks > 0 && (
          <div className="pt-1">
            <Link
              href="/app/policies"
              className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 dark:text-yellow-500 hover:underline"
            >
              Review {c.pendingAcks} pending polic{c.pendingAcks === 1 ? 'y' : 'ies'}
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function CountPill({ icon: Icon, label, tone }: { icon: any; label: string; tone: 'red' | 'violet' | 'yellow' | 'blue' | 'emerald' }) {
  const tones: Record<string, string> = {
    red: 'bg-red-500/10 text-red-600 dark:text-red-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    yellow: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5', tones[tone])}>
      <Icon className="h-2.5 w-2.5" /> {label}
    </span>
  )
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.round(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
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
