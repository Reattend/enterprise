'use client'

// Animated reasoning trace — plays back the pipeline that produced the answer.
//
// The /api/ask endpoint returns an `X-Trace` header with the actual step
// counts (keywords extracted, candidates retrieved, RBAC-filtered, scored,
// reranked, selected). We animate through them with a 180ms stagger so the
// "thinking" feels real even though the pipeline has already run.
//
// Why this is honest: every number is a real measurement from the pipeline,
// not a fake loading indicator. We're just pacing the reveal.

import { useEffect, useState } from 'react'
import {
  Search, Shield, Bot, Target, Award, Filter, Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TraceStep {
  id: string
  label: string
  count?: number
  detail?: string
  skipAnimate?: boolean
}

export interface TraceData {
  steps: TraceStep[]
  question?: string
  agentId?: string | null
  agentName?: string | null
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  keywords: Search,
  candidates: Filter,
  rbac: Shield,
  scoped: Bot,
  scored: Target,
  reranked: Sparkles,
  selected: Award,
}

export function ReasoningTrace({ trace, active }: { trace: TraceData | null; active: boolean }) {
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    if (!trace) return
    setRevealed(0)
    const visible = trace.steps.filter((s) => !s.skipAnimate)
    let i = 0
    const timer = setInterval(() => {
      i++
      setRevealed(i)
      if (i >= visible.length) clearInterval(timer)
    }, 180)
    return () => clearInterval(timer)
  }, [trace])

  if (!trace) return null
  const visible = trace.steps.filter((s) => !s.skipAnimate)

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-transparent p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
        <Sparkles className="h-3 w-3 text-primary" />
        <span>Reasoning trace</span>
        {trace.agentName && (
          <span className="text-[10px] ml-auto text-primary">agent: {trace.agentName}</span>
        )}
      </div>
      <div className="space-y-1.5">
        {visible.map((step, i) => {
          const Icon = ICONS[step.id] || Sparkles
          const shown = i < revealed
          const done = i < revealed - 1 || (revealed >= visible.length && active === false)
          const isLatest = i === revealed - 1 && active
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-start gap-2 text-xs transition-all duration-300',
                shown ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1',
              )}
            >
              <div className={cn(
                'h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors',
                done ? 'bg-emerald-500/15 text-emerald-500' :
                isLatest ? 'bg-primary/15 text-primary' :
                'bg-muted text-muted-foreground',
              )}>
                {done ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-2.5 w-2.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{step.label}</span>
                  {typeof step.count === 'number' && (
                    <span className={cn(
                      'tabular-nums font-mono text-[10px] px-1.5 py-0.5 rounded',
                      isLatest ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                    )}>
                      {step.count}
                    </span>
                  )}
                </div>
                {step.detail && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{step.detail}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Helper for callers — parse the X-Trace header from an ask Response.
export function parseTraceFromHeaders(headers: Headers): TraceData | null {
  const raw = headers.get('X-Trace')
  if (!raw) return null
  try {
    // The header was sent with unicode escapes to stay in Latin-1; JSON.parse
    // auto-unescapes \uXXXX so we just parse.
    return JSON.parse(raw) as TraceData
  } catch {
    return null
  }
}
