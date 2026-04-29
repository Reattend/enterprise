'use client'

// Triage Review — slide-out panel triggered from /app/integrations.
// Lighter-weight version of /app/admin/[orgId]/triage-review with the same
// API. Lets admins peek at what triage is doing without leaving the page
// they just connected a source from.

import { useEffect, useState, useCallback } from 'react'
import {
  Brain, RefreshCw, Loader2, ThumbsUp, ThumbsDown, CheckCircle2, XCircle,
  Clock, ExternalLink, MessageSquare, FileText, Mail, Calendar, Plug,
} from 'lucide-react'
import Link from 'next/link'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TriageItem {
  id: string
  source: { id: string; label: string; kind: string } | null
  preview: string
  textLength: number
  occurredAt: string | null
  createdAt: string
  status: 'new' | 'triaged' | 'ignored'
  promotedTo: { id: string; title: string; type: string } | null
  triage: {
    shouldStore: boolean | null
    title: string | null
    confidence: number | null
    whyKeptOrDropped: string | null
    feedback: { vote: 'good' | 'bad'; note: string | null; by: string; at: string } | null
  } | null
}

interface Counts { new: number; triaged: number; ignored: number; promoted: number }

const SOURCE_ICONS: Record<string, any> = {
  email: Mail, chat: MessageSquare, document: FileText, calendar: Calendar, integration: Plug,
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  return `${Math.floor(ms / 86_400_000)}d ago`
}

export function TriageReviewSheet({
  orgId, open, onOpenChange,
}: {
  orgId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [items, setItems] = useState<TriageItem[] | null>(null)
  const [counts, setCounts] = useState<Counts>({ new: 0, triaged: 0, ignored: 0, promoted: 0 })
  const [loading, setLoading] = useState(false)
  const [voting, setVoting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'promoted' | 'ignored' | 'new'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/${orgId}/triage-review?limit=50`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed to load triage review')
        return
      }
      const data = await res.json()
      setItems(data.items || [])
      setCounts(data.counts || { new: 0, triaged: 0, ignored: 0, promoted: 0 })
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const vote = async (rawItemId: string, v: 'good' | 'bad') => {
    setVoting(rawItemId)
    try {
      const res = await fetch(`/api/admin/${orgId}/triage-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawItemId, vote: v }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed to save feedback')
        return
      }
      toast.success(v === 'good' ? 'Saved as a positive example' : 'Saved as a negative example')
      load()
    } finally {
      setVoting(null)
    }
  }

  const filtered = items?.filter((i) => {
    if (filter === 'all') return true
    if (filter === 'promoted') return !!i.promotedTo
    if (filter === 'ignored') return i.status === 'ignored'
    if (filter === 'new') return i.status === 'new'
    return true
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent widthClass="w-full sm:max-w-2xl">
        <SheetHeader className="pr-10">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-600" />
                What triage is doing
              </SheetTitle>
              <SheetDescription>
                Last 50 records ingested. Thumbs up/down builds a training set so triage learns what your org cares about.
              </SheetDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0 mr-2">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Counts as filter pills */}
          <div className="grid grid-cols-4 gap-1.5 mt-3">
            <Pill label="Promoted" value={counts.promoted} active={filter === 'promoted'} tone="emerald" onClick={() => setFilter(filter === 'promoted' ? 'all' : 'promoted')} />
            <Pill label="Ignored" value={counts.ignored} active={filter === 'ignored'} tone="rose" onClick={() => setFilter(filter === 'ignored' ? 'all' : 'ignored')} />
            <Pill label="Pending" value={counts.new} active={filter === 'new'} tone="yellow" onClick={() => setFilter(filter === 'new' ? 'all' : 'new')} />
            <Pill label="All" value={counts.new + counts.triaged + counts.ignored} active={filter === 'all'} tone="violet" onClick={() => setFilter('all')} />
          </div>
        </SheetHeader>

        <SheetBody>
          {loading && !items && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading…
            </div>
          )}

          {filtered && filtered.length === 0 && !loading && (
            <div className="py-12 text-center">
              <Brain className="h-7 w-7 text-muted-foreground/40 mx-auto mb-2" />
              <div className="text-sm font-medium">Nothing here yet</div>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                {counts.new + counts.triaged + counts.ignored === 0
                  ? 'Connect Gmail or Calendar above and click Sync now.'
                  : 'No items match this filter — try a different tab.'}
              </p>
            </div>
          )}

          {filtered && filtered.length > 0 && (
            <div className="space-y-2.5">
              {filtered.map((it) => {
                const SrcIcon = it.source ? (SOURCE_ICONS[it.source.kind] || Plug) : Plug
                const promoted = !!it.promotedTo
                const ignored = it.status === 'ignored'
                const pending = it.status === 'new'
                const fb = it.triage?.feedback

                return (
                  <div key={it.id} className={cn(
                    'rounded-lg border p-3 transition-colors',
                    promoted && 'border-emerald-500/25 bg-emerald-500/[0.02]',
                    ignored && 'border-rose-500/15 bg-rose-500/[0.02]',
                    pending && 'border-yellow-500/20 bg-yellow-500/[0.02]',
                  )}>
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
                        promoted && 'bg-emerald-500/10 text-emerald-600',
                        ignored && 'bg-rose-500/10 text-rose-600',
                        pending && 'bg-yellow-500/10 text-yellow-600',
                      )}>
                        <SrcIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[11px] font-medium text-muted-foreground">{it.source?.label || 'unknown'}</span>
                          <span className="text-[10px] text-muted-foreground/60">·</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(it.createdAt)}</span>
                          {promoted && <Badge variant="secondary" className="text-[9px] gap-0.5 h-4 px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-2.5 w-2.5" />Promoted</Badge>}
                          {ignored && <Badge variant="secondary" className="text-[9px] gap-0.5 h-4 px-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-400"><XCircle className="h-2.5 w-2.5" />Ignored</Badge>}
                          {pending && <Badge variant="secondary" className="text-[9px] gap-0.5 h-4 px-1.5 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"><Clock className="h-2.5 w-2.5" />Pending</Badge>}
                          {it.triage?.confidence != null && (
                            <span className="text-[9px] text-muted-foreground/70">{Math.round(it.triage.confidence * 100)}%</span>
                          )}
                        </div>

                        {promoted && it.promotedTo ? (
                          <Link href={`/app/memories/${it.promotedTo.id}`} className="text-sm font-semibold hover:underline inline-flex items-center gap-1 leading-snug">
                            {it.promotedTo.title}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </Link>
                        ) : it.triage?.title ? (
                          <div className="text-sm font-semibold leading-snug">{it.triage.title}</div>
                        ) : null}

                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{it.preview}{it.textLength > 320 && '…'}</p>

                        {it.triage?.whyKeptOrDropped && (
                          <div className={cn(
                            'mt-1.5 text-[10px] rounded px-2 py-1 leading-relaxed',
                            promoted ? 'bg-emerald-500/5 text-emerald-900 dark:text-emerald-200' :
                            ignored  ? 'bg-rose-500/5 text-rose-900 dark:text-rose-200' :
                                       'bg-muted/50 text-muted-foreground',
                          )}>
                            <span className="font-medium">AI: </span>{it.triage.whyKeptOrDropped}
                          </div>
                        )}

                        {!pending && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <button
                              onClick={() => vote(it.id, 'good')}
                              disabled={voting === it.id}
                              className={cn(
                                'h-5 w-5 rounded border flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-colors',
                                fb?.vote === 'good' && 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600',
                              )}
                              title="Triage was right"
                            >
                              <ThumbsUp className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={() => vote(it.id, 'bad')}
                              disabled={voting === it.id}
                              className={cn(
                                'h-5 w-5 rounded border flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500/40 transition-colors',
                                fb?.vote === 'bad' && 'bg-rose-500/15 border-rose-500/50 text-rose-600',
                              )}
                              title="Triage got this wrong"
                            >
                              <ThumbsDown className="h-2.5 w-2.5" />
                            </button>
                            {fb && <span className="text-[9px] text-muted-foreground/70">marked {fb.vote} {timeAgo(fb.at)}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

function Pill({ label, value, active, tone, onClick }: {
  label: string; value: number; active: boolean; tone: 'emerald' | 'rose' | 'yellow' | 'violet'; onClick: () => void
}) {
  const toneMap = {
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
    rose:    'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400',
    yellow:  'border-yellow-500/30 bg-yellow-500/5 text-yellow-700 dark:text-yellow-500',
    violet:  'border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-400',
  }[tone]
  return (
    <button onClick={onClick} className={cn(
      'rounded-md border px-2 py-1.5 text-left transition-all',
      active ? toneMap : 'border-border bg-card hover:border-foreground/20',
    )}>
      <div className="text-base font-semibold leading-none">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </button>
  )
}
