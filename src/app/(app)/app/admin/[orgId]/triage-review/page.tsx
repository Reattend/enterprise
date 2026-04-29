'use client'

// Triage Review — admin page.
//
// Inspect the last N raw_items the AI has seen, with its decision (kept,
// rejected, still pending) and a thumbs-up/down so admins can build a
// retraining set when triage gets things wrong.

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Brain, RefreshCw, Loader2, ThumbsUp, ThumbsDown, CheckCircle2, XCircle,
  Clock, ExternalLink, MessageSquare, FileText, Mail, Calendar, Plug,
} from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TriageItem {
  id: string
  source: { id: string; label: string; kind: string } | null
  author: any
  preview: string
  textLength: number
  occurredAt: string | null
  createdAt: string
  status: 'new' | 'triaged' | 'ignored'
  promotedTo: { id: string; title: string; type: string } | null
  triage: {
    shouldStore: boolean | null
    recordType: string | null
    title: string | null
    summary: string | null
    confidence: number | null
    whyKeptOrDropped: string | null
    feedback: { vote: 'good' | 'bad'; note: string | null; by: string; at: string } | null
  } | null
}

interface Counts {
  new: number
  triaged: number
  ignored: number
  promoted: number
}

const SOURCE_ICONS: Record<string, any> = {
  email: Mail,
  chat: MessageSquare,
  document: FileText,
  calendar: Calendar,
  integration: Plug,
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const ms = Date.now() - d
  if (ms < 60_000) return 'just now'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  return `${Math.floor(ms / 86_400_000)}d ago`
}

export default function TriageReviewPage({ params }: { params: { orgId: string } }) {
  const [items, setItems] = useState<TriageItem[] | null>(null)
  const [counts, setCounts] = useState<Counts>({ new: 0, triaged: 0, ignored: 0, promoted: 0 })
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'promoted' | 'ignored' | 'new'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/${params.orgId}/triage-review?limit=50`)
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
  }

  useEffect(() => { load() }, [params.orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const vote = async (rawItemId: string, v: 'good' | 'bad') => {
    setVoting(rawItemId)
    try {
      const res = await fetch(`/api/admin/${params.orgId}/triage-review`, {
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
            <Brain className="h-3.5 w-3.5" /> Triage review
          </div>
          <h1 className="font-display text-3xl tracking-tight">What the AI is doing with new data</h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            The most recent 50 records ingested from any connector or capture, plus the AI&apos;s
            decision: promote to memory, ignore, or hold for review. Thumbs up/down builds a
            training set so triage learns what your org cares about.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CountCard label="Promoted to memory" value={counts.promoted} icon={CheckCircle2} tone="emerald" active={filter === 'promoted'} onClick={() => setFilter(filter === 'promoted' ? 'all' : 'promoted')} />
        <CountCard label="Ignored by triage" value={counts.ignored} icon={XCircle} tone="rose" active={filter === 'ignored'} onClick={() => setFilter(filter === 'ignored' ? 'all' : 'ignored')} />
        <CountCard label="Pending triage" value={counts.new} icon={Clock} tone="yellow" active={filter === 'new'} onClick={() => setFilter(filter === 'new' ? 'all' : 'new')} />
        <CountCard label="Total triaged" value={counts.triaged} icon={Brain} tone="violet" active={filter === 'all'} onClick={() => setFilter('all')} />
      </div>

      {/* List */}
      {loading && !items && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading triage decisions…
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <EmptyState
          icon={Brain}
          title="Nothing here yet"
          description="No raw items have arrived from connectors or captures. Connect Gmail or Calendar in /app/integrations and trigger a sync."
        />
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
              <Card key={it.id} className={cn(
                'p-4 transition-colors',
                promoted && 'border-emerald-500/25 bg-emerald-500/[0.02]',
                ignored && 'border-rose-500/15 bg-rose-500/[0.02]',
                pending && 'border-yellow-500/20 bg-yellow-500/[0.02]',
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                    promoted && 'bg-emerald-500/10 text-emerald-600',
                    ignored && 'bg-rose-500/10 text-rose-600',
                    pending && 'bg-yellow-500/10 text-yellow-600',
                  )}>
                    <SrcIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-medium text-muted-foreground">{it.source?.label || 'unknown source'}</span>
                      <span className="text-[11px] text-muted-foreground/60">·</span>
                      <span className="text-[11px] text-muted-foreground">{timeAgo(it.createdAt)}</span>
                      {promoted && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Promoted
                        </Badge>
                      )}
                      {ignored && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-rose-500/10 text-rose-700 dark:text-rose-400">
                          <XCircle className="h-2.5 w-2.5" /> Ignored
                        </Badge>
                      )}
                      {pending && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                          <Clock className="h-2.5 w-2.5" /> Pending
                        </Badge>
                      )}
                      {it.triage?.confidence != null && (
                        <span className="text-[10px] text-muted-foreground/70">
                          confidence {Math.round(it.triage.confidence * 100)}%
                        </span>
                      )}
                    </div>

                    {/* Promoted memory link */}
                    {promoted && it.promotedTo && (
                      <Link href={`/app/memories/${it.promotedTo.id}`} className="text-sm font-semibold hover:underline inline-flex items-center gap-1">
                        {it.promotedTo.title}
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </Link>
                    )}
                    {!promoted && it.triage?.title && (
                      <div className="text-sm font-semibold">{it.triage.title}</div>
                    )}

                    {/* Preview of raw text */}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{it.preview}{it.textLength > 320 && '…'}</p>

                    {/* Triage's reason */}
                    {it.triage?.whyKeptOrDropped && (
                      <div className={cn(
                        'mt-2 text-[11px] rounded-md px-2 py-1.5 leading-relaxed',
                        promoted ? 'bg-emerald-500/5 text-emerald-900 dark:text-emerald-200' :
                        ignored  ? 'bg-rose-500/5 text-rose-900 dark:text-rose-200' :
                                   'bg-muted/50 text-muted-foreground',
                      )}>
                        <span className="font-medium">AI: </span>{it.triage.whyKeptOrDropped}
                      </div>
                    )}

                    {/* Feedback row */}
                    {!pending && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground/70">Was this the right call?</span>
                        <button
                          onClick={() => vote(it.id, 'good')}
                          disabled={voting === it.id}
                          className={cn(
                            'h-6 w-6 rounded-md border flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-colors',
                            fb?.vote === 'good' && 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600',
                          )}
                          title="Triage was right"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => vote(it.id, 'bad')}
                          disabled={voting === it.id}
                          className={cn(
                            'h-6 w-6 rounded-md border flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500/40 transition-colors',
                            fb?.vote === 'bad' && 'bg-rose-500/15 border-rose-500/50 text-rose-600',
                          )}
                          title="Triage got this wrong"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                        {fb && (
                          <span className="text-[10px] text-muted-foreground/70">
                            marked {fb.vote === 'good' ? 'good' : 'bad'} {timeAgo(fb.at)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function CountCard({ label, value, icon: Icon, tone, active, onClick }: {
  label: string; value: number; icon: any; tone: 'emerald' | 'rose' | 'yellow' | 'violet'; active: boolean; onClick: () => void
}) {
  const toneMap = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', ring: 'ring-emerald-500/30' },
    rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-600',    ring: 'ring-rose-500/30' },
    yellow:  { bg: 'bg-yellow-500/10',  text: 'text-yellow-600',  ring: 'ring-yellow-500/30' },
    violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-600',  ring: 'ring-violet-500/30' },
  }[tone]
  return (
    <button onClick={onClick} className={cn(
      'rounded-xl border bg-card p-3 text-left hover:border-foreground/20 transition-colors',
      active && `ring-2 ${toneMap.ring}`,
    )}>
      <div className={cn('h-7 w-7 rounded-md flex items-center justify-center mb-1.5', toneMap.bg)}>
        <Icon className={cn('h-3.5 w-3.5', toneMap.text)} />
      </div>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
    </button>
  )
}
