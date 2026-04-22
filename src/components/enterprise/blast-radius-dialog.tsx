'use client'

// Blast Radius Simulator — "if we reverse this decision, what breaks?"
//
// Opens as a dialog over any decision. Shows:
//   - Claude's 2-3 sentence impact narrative (if available)
//   - Linked memories + their kind (contradicts / supersedes / relates)
//   - Policies whose body text mentions the decision
//   - Predecessor / successor decisions in the chain
//   - People who decided + who authored dependent memories
//   - A single-number "blast score" so execs have something to compare.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Radar, Loader2, AlertTriangle, FileText, Gavel, Users, ChevronRight,
  Sparkles,
} from 'lucide-react'

type Counts = { memories: number; policies: number; predecessors: number; successors: number; people: number }
type BlastData = {
  decision: { id: string; title: string; status: string; decidedAt: string }
  linkedRecords: Array<{ id: string; title: string; type: string; kind: string }>
  referencingPolicies: Array<{ id: string; title: string; category: string | null; matchedTerms: string[] }>
  predecessors: Array<{ id: string; title: string; status: string; decidedAt: string }>
  successors: Array<{ id: string; title: string; status: string; decidedAt: string }>
  people: Array<{ id: string; name: string | null; email: string }>
  implicit: string | null
  counts: Counts
}

// Simple weighting — memories are small splashes, policies + successor chains
// are big. Everything above 10 = "careful", above 25 = "systemic risk".
function computeBlastScore(c: Counts): number {
  return c.memories * 1 + c.policies * 4 + c.predecessors * 3 + c.successors * 5 + c.people * 1
}

export function BlastRadiusDialog({
  decisionId, open, onOpenChange,
}: {
  decisionId: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [data, setData] = useState<BlastData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !decisionId) return
    let cancelled = false
    setLoading(true)
    setData(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/decisions/${decisionId}/blast-radius`)
        if (!res.ok) return
        const d = await res.json() as BlastData
        if (!cancelled) setData(d)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, decisionId])

  const score = data ? computeBlastScore(data.counts) : 0
  const tier = score >= 25 ? 'systemic' : score >= 10 ? 'significant' : 'contained'
  const tierColor: Record<string, string> = {
    systemic: 'text-red-600 bg-red-500/10 border-red-500/30',
    significant: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30',
    contained: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-red-500" /> Blast radius
          </DialogTitle>
          <DialogDescription className="text-xs">
            If this decision were reversed today, these are the things that reference it, depend on it,
            or would need re-doing. Citations are ground-truth from the org's memory graph.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-10 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Computing blast radius…
          </div>
        )}

        {data && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-sm font-semibold">{data.decision.title}</div>
                <Badge variant="outline" className={`text-[10px] capitalize ${tierColor[tier]}`}>
                  {tier} · score {score}
                </Badge>
              </div>
              {data.implicit && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t">
                  <Sparkles className="h-3 w-3 mt-0.5 text-primary shrink-0" />
                  <span>{data.implicit}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <ScorePill icon={FileText} label="Memories" value={data.counts.memories} tone="blue" />
              <ScorePill icon={AlertTriangle} label="Policies" value={data.counts.policies} tone="yellow" />
              <ScorePill icon={Gavel} label="Predecessors" value={data.counts.predecessors} tone="slate" />
              <ScorePill icon={Gavel} label="Successors" value={data.counts.successors} tone="red" />
              <ScorePill icon={Users} label="People" value={data.counts.people} tone="violet" />
            </div>

            {data.referencingPolicies.length > 0 && (
              <Section title="Policies mentioning this decision" tone="yellow">
                <ul className="space-y-1">
                  {data.referencingPolicies.map((p) => (
                    <li key={p.id}>
                      <Link href={`/app/policies/${p.id}`} className="flex items-center gap-2 text-xs hover:text-primary transition-colors">
                        <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{p.title}</span>
                        {p.category && <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">{p.category}</Badge>}
                        {p.matchedTerms.length > 0 && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            matched: {p.matchedTerms.slice(0, 2).join(', ')}
                          </span>
                        )}
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {data.predecessors.length > 0 && (
              <Section title="Decisions this replaced" tone="slate">
                <ul className="space-y-1">
                  {data.predecessors.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 text-xs">
                      <Gavel className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate flex-1">{d.title}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(d.decidedAt).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted-foreground mt-2 italic">
                  Reversing this would mean these earlier decisions are back on the table.
                </p>
              </Section>
            )}

            {data.successors.length > 0 && (
              <Section title="Decisions that replaced this" tone="red">
                <ul className="space-y-1">
                  {data.successors.map((d) => (
                    <li key={d.id} className="flex items-center gap-2 text-xs">
                      <Gavel className="h-3 w-3 text-red-500" />
                      <span className="truncate flex-1">{d.title}</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{d.status}</Badge>
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-muted-foreground mt-2 italic">
                  This decision is already superseded — reversing it conflicts with the successor.
                </p>
              </Section>
            )}

            {data.linkedRecords.length > 0 && (
              <Section title="Linked memories" tone="blue">
                <ul className="space-y-1 max-h-56 overflow-y-auto">
                  {data.linkedRecords.map((r) => (
                    <li key={r.id}>
                      <Link href={`/app/memories/${r.id}`} className="flex items-center gap-2 text-xs hover:text-primary transition-colors">
                        <Badge variant="secondary" className="text-[9px] h-4 px-1 capitalize shrink-0">{r.type}</Badge>
                        <span className="truncate flex-1">{r.title}</span>
                        <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize shrink-0">{r.kind.replace(/_/g, ' ')}</Badge>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {data.people.length > 0 && (
              <Section title="People who would need to be in the room" tone="violet">
                <div className="flex flex-wrap gap-2">
                  {data.people.map((p) => {
                    const initials = (p.name || p.email).split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <div key={p.id} className="flex items-center gap-2 rounded-full border px-2 py-1">
                        <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials}</AvatarFallback></Avatar>
                        <span className="text-xs">{p.name || p.email}</span>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ScorePill({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: string }) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600',
    yellow: 'bg-yellow-500/10 text-yellow-600',
    slate: 'bg-slate-500/10 text-slate-600',
    red: 'bg-red-500/10 text-red-600',
    violet: 'bg-violet-500/10 text-violet-600',
  }
  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className={`inline-flex h-6 w-6 rounded items-center justify-center ${tones[tone]}`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="text-lg font-bold tabular-nums mt-1">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  )
}

function Section({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    blue: 'border-blue-500/20 bg-blue-500/5',
    yellow: 'border-yellow-500/20 bg-yellow-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    slate: 'border-slate-500/20 bg-slate-500/5',
    violet: 'border-violet-500/20 bg-violet-500/5',
  }
  return (
    <div className={`rounded-xl border p-3 ${tones[tone] || tones.slate}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">{title}</div>
      {children}
    </div>
  )
}
