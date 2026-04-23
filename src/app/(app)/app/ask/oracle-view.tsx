'use client'

// Oracle Mode — the "deep research" surface.
//
// This is not a chat. You ask one hard question. We spend ~30 seconds
// pulling 150 candidates, reranking 60 with Claude Haiku, then feeding 30
// into a structured Claude call that produces a five-section dossier:
// Situation / Evidence / Risks / Recommendations / Unknowns.
//
// The UI is minimal because the output is the product — we stay out of the
// way and let the dossier breathe.

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  Sparkles, Loader2, Target, BookOpen, AlertTriangle, ListChecks, HelpCircle,
  Crown, Copy, Check, ArrowUp,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/stores/app-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Dossier = {
  situation: string
  evidence: string
  risks: string
  recommendations: string
  unknowns: string
}

type OracleData = {
  question: string
  dossier: Dossier
  sources: Array<{ id: string; title: string; type: string; date: string | null; passage: string | null }>
  meta: { candidatesScanned: number; accessibleFiltered: number; reranked: number; elapsedMs: number }
}

const PIPELINE_STEPS = [
  { label: 'Scanning every memory you can see', min: 800 },
  { label: 'Filtering to the 150 most relevant', min: 1500 },
  { label: 'Re-ranking with Claude Haiku', min: 3000 },
  { label: 'Cross-referencing decisions + policies', min: 2000 },
  { label: 'Drafting the dossier with Claude', min: 10000 },
]

export function OracleView() {
  const { activeEnterpriseOrgId, hasHydratedStore } = useAppStore()
  const [question, setQuestion] = useState('')
  const [running, setRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [data, setData] = useState<OracleData | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    if (!activeEnterpriseOrgId || question.trim().length < 5) return
    setRunning(true)
    setData(null)
    setError(null)
    setCurrentStep(0)

    // Advance the fake-live progress indicator. Pure theatre — the endpoint
    // runs its own pipeline in the background; we just pace the UI so the
    // 30-second wait feels purposeful instead of dead.
    const stepAdvance = (i: number) => {
      if (i >= PIPELINE_STEPS.length) return
      setCurrentStep(i)
      setTimeout(() => stepAdvance(i + 1), PIPELINE_STEPS[i].min)
    }
    stepAdvance(0)

    try {
      const res = await fetch('/api/ask/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: activeEnterpriseOrgId, question: question.trim() }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || `HTTP ${res.status}`)
        toast.error(body.error || 'Oracle failed')
        return
      }
      const result = await res.json() as OracleData
      setData(result)
      setCurrentStep(PIPELINE_STEPS.length)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRunning(false)
    }
  }

  function copyFull() {
    if (!data) return
    const text = `Oracle: ${data.question}

## Situation
${data.dossier.situation}

## Evidence
${data.dossier.evidence}

## Risks
${data.dossier.risks}

## Recommendations
${data.dossier.recommendations}

## Unknowns
${data.dossier.unknowns}

Sources: ${data.sources.length} memories · ${(data.meta.elapsedMs / 1000).toFixed(1)}s`
    navigator.clipboard.writeText(text)
    toast.success('Dossier copied')
  }

  if (!hasHydratedStore) return null
  if (!activeEnterpriseOrgId) return (
    <div className="py-20 text-center">
      <Crown className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">Select an organization to use Oracle.</p>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="text-center space-y-2 py-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-violet-600 text-[11px] font-medium uppercase tracking-wider">
          <Crown className="h-3 w-3" /> Oracle mode
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Ask the hard question</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Chat gives you fast answers. Oracle gives you a <strong>dossier</strong> —
          situation, evidence, risks, recommendations, and unknowns. ~30 seconds of deep research.
        </p>
      </div>

      {/* Question input */}
      {!data && (
        <div className="rounded-2xl border-2 border-primary/20 bg-card p-4 shadow-lg">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`e.g. "Should we fire vendor X next quarter?" or "What's our current position on the EU market?"`}
            rows={4}
            className="border-0 shadow-none focus-visible:ring-0 text-base resize-none"
            disabled={running}
          />
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-[11px] text-muted-foreground">
              Works best for strategic or high-stakes questions. For quick lookups, use Chat.
            </div>
            <button
              onClick={run}
              disabled={running || question.trim().length < 5}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white px-4 py-2 text-sm font-medium shadow hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              Consult oracle
            </button>
          </div>
        </div>
      )}

      {/* Pipeline indicator while running */}
      {running && (
        <div className="rounded-2xl border bg-gradient-to-br from-violet-500/5 to-transparent p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-4">
            <Sparkles className="h-3 w-3 text-violet-500" />
            <span>Thinking</span>
          </div>
          <div className="space-y-2">
            {PIPELINE_STEPS.map((s, i) => {
              const done = i < currentStep
              const active = i === currentStep
              return (
                <div key={i} className={cn('flex items-center gap-2.5 text-sm transition-opacity', i > currentStep && 'opacity-40')}>
                  <div className={cn(
                    'h-5 w-5 rounded-full flex items-center justify-center shrink-0',
                    done ? 'bg-emerald-500/15 text-emerald-500' :
                    active ? 'bg-violet-500/15 text-violet-500' :
                    'bg-muted text-muted-foreground',
                  )}>
                    {done ? <Check className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  </div>
                  <span className={cn(active && 'font-medium')}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Dossier output */}
      {data && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b bg-gradient-to-br from-violet-500/5 to-transparent flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Oracle question</div>
                <div className="text-sm font-medium leading-snug">{data.question}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground">
                  {data.sources.length} memories · {(data.meta.elapsedMs / 1000).toFixed(1)}s
                </span>
                <button
                  onClick={copyFull}
                  className="text-xs border rounded px-2 py-1 hover:bg-muted inline-flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
                <button
                  onClick={() => { setData(null); setQuestion(''); setCurrentStep(-1) }}
                  className="text-xs border rounded px-2 py-1 hover:bg-muted"
                >
                  New
                </button>
              </div>
            </div>
          </div>

          <Section icon={Target} tone="violet" title="Situation" markdown={data.dossier.situation} />
          <Section icon={BookOpen} tone="blue" title="Evidence" markdown={data.dossier.evidence} />
          <Section icon={AlertTriangle} tone="red" title="Risks" markdown={data.dossier.risks} />
          <Section icon={ListChecks} tone="emerald" title="Recommendations" markdown={data.dossier.recommendations} />
          <Section icon={HelpCircle} tone="slate" title="Unknowns" markdown={data.dossier.unknowns} />

          {data.sources.length > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                Sources ({data.sources.length})
              </div>
              <ul className="space-y-2">
                {data.sources.map((s, i) => (
                  <li key={s.id} className="rounded-lg border bg-background/50 p-2.5">
                    <Link
                      href={`/app/memories/${s.id}`}
                      className="flex items-center gap-2 text-xs hover:text-primary transition-colors"
                    >
                      <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">[{i + 1}]</Badge>
                      <Badge variant="secondary" className="text-[9px] h-4 px-1 capitalize">{s.type}</Badge>
                      <span className="font-medium truncate flex-1">{s.title}</span>
                      {s.date && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(s.date).toLocaleDateString()}
                        </span>
                      )}
                    </Link>
                    {s.passage && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 pl-2 border-l-2 border-primary/30 leading-relaxed italic">
                        &ldquo;{s.passage}&rdquo;
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

function Section({ icon: Icon, tone, title, markdown }: { icon: any; tone: string; title: string; markdown: string }) {
  if (!markdown || markdown.trim().length === 0) return null
  const tones: Record<string, { bar: string; iconBg: string }> = {
    violet: { bar: 'from-violet-500 to-indigo-500', iconBg: 'bg-violet-500/10 text-violet-600' },
    blue: { bar: 'from-blue-500 to-cyan-500', iconBg: 'bg-blue-500/10 text-blue-600' },
    red: { bar: 'from-red-500 to-pink-500', iconBg: 'bg-red-500/10 text-red-600' },
    emerald: { bar: 'from-emerald-500 to-teal-500', iconBg: 'bg-emerald-500/10 text-emerald-600' },
    slate: { bar: 'from-slate-500 to-slate-600', iconBg: 'bg-slate-500/10 text-slate-600' },
  }
  const t = tones[tone] || tones.slate
  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className={cn('h-1 bg-gradient-to-r', t.bar)} />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', t.iconBg)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wider">{title}</h3>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
