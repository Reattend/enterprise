'use client'

// Shared UI for every task-mode page (draft email, meeting prep, etc).
// Flow:
//   1. User fills the form and clicks the primary action
//   2. We POST to /api/ask with `question = taskMode.buildPrompt(fields)`
//   3. Answer streams into a panel below the form
//   4. A refine chat appears for follow-up questions on the same thread

import { useRef, useState, useEffect } from 'react'
import {
  ArrowLeft,
  Sparkles,
  Send,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Share2,
  Mail,
  Calendar,
  FileText,
  LayoutDashboard,
} from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { TaskMode } from '@/lib/ai/task-modes'

const ICONS: Record<string, any> = {
  Mail, Calendar, FileText, LayoutDashboard,
}

export function TaskModePanel({ mode }: { mode: TaskMode }) {
  const Icon = ICONS[mode.iconName] || Sparkles

  const [fields, setFields] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of mode.fields) {
      if (f.type === 'select' && f.options?.length) init[f.key] = f.options[0].value
      else init[f.key] = ''
    }
    return init
  })

  const [streaming, setStreaming] = useState(false)
  const [answer, setAnswer] = useState<string>('')
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [refineText, setRefineText] = useState('')
  const [refining, setRefining] = useState(false)
  const [copied, setCopied] = useState(false)
  const answerRef = useRef<HTMLDivElement>(null)

  const canSubmit = mode.fields.every((f) => !f.required || (fields[f.key] || '').trim().length > 0)

  const runDraft = async () => {
    if (!canSubmit) {
      toast.error('Fill out the required fields first')
      return
    }
    const prompt = mode.buildPrompt(fields)
    setStreaming(true)
    setAnswer('')
    setHistory([{ role: 'user', content: `[${mode.label}]\n${JSON.stringify(fields, null, 2)}` }])
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt }),
      })
      if (!res.ok || !res.body) {
        toast.error(res.status === 401 ? 'Sign in required' : 'Draft failed — check LLM API key in env')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setAnswer(acc)
        answerRef.current?.scrollTo({ top: answerRef.current.scrollHeight, behavior: 'auto' })
      }
      setHistory((h) => [...h, { role: 'assistant', content: acc }])
    } finally {
      setStreaming(false)
    }
  }

  const runRefine = async () => {
    const q = refineText.trim()
    if (!q || refining) return
    setRefineText('')
    setRefining(true)
    const nextHistory = [...history, { role: 'user' as const, content: q }]
    setHistory(nextHistory)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history: nextHistory.slice(-6) }),
      })
      if (!res.ok || !res.body) {
        toast.error('Refinement failed')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      setHistory((h) => [...h, { role: 'assistant', content: '' }])
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setHistory((h) => {
          const copy = h.slice()
          copy[copy.length - 1] = { role: 'assistant', content: acc }
          return copy
        })
      }
    } finally {
      setRefining(false)
    }
  }

  const copyAnswer = async () => {
    try {
      await navigator.clipboard.writeText(answer)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
      toast.success('Copied')
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/tasks"><ArrowLeft className="h-4 w-4 mr-1" /> Tasks</Link>
        </Button>
        {answer && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyAnswer}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="outline" size="sm" onClick={runDraft} disabled={streaming}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Redraft
            </Button>
          </div>
        )}
      </div>

      {/* Title card with gradient bar */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className={cn('h-1.5 bg-gradient-to-r', mode.color)} />
        <div className="p-5 flex items-start gap-4">
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-white bg-gradient-to-br', mode.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] capitalize">{mode.category}</Badge>
              <h1 className="text-xl font-bold tracking-tight">{mode.label}</h1>
            </div>
            <p className="text-sm text-muted-foreground">{mode.description}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        {mode.fields.map((f) => (
          <div key={f.key}>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {f.type === 'textarea' ? (
              <Textarea
                value={fields[f.key] || ''}
                onChange={(e) => setFields((s) => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                rows={f.rows || 3}
                className="text-sm"
              />
            ) : f.type === 'select' ? (
              <Select value={fields[f.key]} onValueChange={(v) => setFields((s) => ({ ...s, [f.key]: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {f.options?.map((o) => <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={fields[f.key] || ''}
                onChange={(e) => setFields((s) => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="h-9 text-sm"
              />
            )}
            {f.helpText && <p className="text-[10px] text-muted-foreground mt-1">{f.helpText}</p>}
          </div>
        ))}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button onClick={runDraft} disabled={!canSubmit || streaming}>
            {streaming ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {streaming ? 'Drafting…' : answer ? 'Redraft' : 'Draft'}
          </Button>
        </div>
      </div>

      {/* Answer */}
      {(streaming || answer) && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b bg-gradient-to-br from-primary/5 to-transparent flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <div className="text-sm font-semibold">Draft</div>
            {streaming && <span className="text-[10px] text-muted-foreground">streaming…</span>}
          </div>
          <div ref={answerRef} className="p-5 max-h-[60vh] overflow-y-auto">
            {answer ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Starting…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refine chat */}
      {answer && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/20 flex items-center gap-2">
            <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="text-sm font-semibold">Refine</div>
            <span className="text-[11px] text-muted-foreground ml-auto">
              Ask a follow-up to shape the draft — tone, length, specific edits.
            </span>
          </div>

          {history.length > 2 && (
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto border-b">
              {history.slice(2).map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed',
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}>
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{m.content || '…'}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 flex items-center gap-2">
            <Input
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runRefine() } }}
              placeholder="e.g. Make it shorter. Or: add a line about the Q3 numbers."
              disabled={refining}
              className="flex-1 h-9 text-sm"
            />
            <Button size="icon" onClick={runRefine} disabled={refining || !refineText.trim()} className="h-9 w-9">
              {refining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
