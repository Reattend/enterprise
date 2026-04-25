'use client'

// Draft Team Broadcast — an action agent.
//
// Pick a decision or enter a topic. Claude writes two versions of an
// announcement: a short Slack version and a longer email version, grounded
// in the decision's rationale + context + supporting memories.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Megaphone, Loader2, Copy, Check, Sparkles, ArrowLeft,
  Gavel, RefreshCw, MessageSquare, Mail,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAppStore } from '@/stores/app-store'
import { cn } from '@/lib/utils'

interface Decision {
  id: string
  title: string
  status: string
  decidedAt: string
}

type Mode = 'decision' | 'topic'

export default function DraftBroadcastPage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const [mode, setMode] = useState<Mode>('decision')
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [decisionId, setDecisionId] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ versions: { slack: string; email: string }; subject: string } | null>(null)
  const [copiedTab, setCopiedTab] = useState<'slack' | 'email' | null>(null)

  useEffect(() => {
    if (!activeOrgId) return
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/organizations/${activeOrgId}/decisions?status=active`)
        if (!res.ok) return
        const data = await res.json()
        setDecisions((data.decisions || []).slice(0, 30))
      } catch { /* silent */ }
    })()
  }, [activeOrgId])

  async function run() {
    if (!activeOrgId) return
    if (mode === 'decision' && !decisionId) {
      toast.error('Pick a decision')
      return
    }
    if (mode === 'topic' && topic.trim().length < 5) {
      toast.error('Topic must be at least 5 characters')
      return
    }
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch('/api/enterprise/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'broadcast',
          orgId: activeOrgId,
          decisionId: mode === 'decision' ? decisionId : undefined,
          topic: mode === 'topic' ? topic.trim() : undefined,
          medium: 'slack',
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Draft failed')
        return
      }
      const data = await res.json()
      setResult(data)
    } finally {
      setRunning(false)
    }
  }

  function copy(which: 'slack' | 'email') {
    const text = which === 'slack' ? result?.versions.slack : result?.versions.email
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedTab(which)
    setTimeout(() => setCopiedTab(null), 1500)
    toast.success(`${which === 'slack' ? 'Slack' : 'Email'} version copied`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-5"
    >
      <div>
        <Link href="/app/agents" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3 w-3" /> Agents
        </Link>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <Megaphone className="h-3.5 w-3.5" /> Action agent
        </div>
        <h1 className="font-display text-3xl tracking-tight">Draft a team broadcast</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Pick a decision (or name a topic). the AI drafts a short Slack version
          and a longer email version, grounded in the decision&apos;s rationale.
          Copy out to wherever you&apos;re announcing.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-1 border-b">
          <TabButton active={mode === 'decision'} onClick={() => setMode('decision')} icon={Gavel} label="About a decision" />
          <TabButton active={mode === 'topic'} onClick={() => setMode('topic')} icon={Megaphone} label="About a topic" />
        </div>

        {mode === 'decision' && (
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Pick an active decision</label>
            <select
              value={decisionId ?? ''}
              onChange={(e) => setDecisionId(e.target.value || null)}
              className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
              disabled={running}
            >
              <option value="">Choose…</option>
              {decisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}  ({new Date(d.decidedAt).toLocaleDateString()})
                </option>
              ))}
            </select>
            {decisions.length === 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                No decisions in this org yet. Log one in Admin → Decisions, or switch to Topic mode.
              </p>
            )}
          </div>
        )}

        {mode === 'topic' && (
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">What are you broadcasting about?</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. New expense policy, Q3 hiring freeze, vendor change"
              disabled={running}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              The AI pulls relevant memories about this topic to ground the draft.
            </p>
          </div>
        )}

        <div className="flex items-center justify-end pt-2 border-t">
          <Button
            onClick={run}
            disabled={running || (mode === 'decision' ? !decisionId : topic.trim().length < 5)}
            className="bg-gradient-to-br from-violet-500 to-purple-600 hover:opacity-95"
          >
            {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {result ? 'Redraft' : 'Draft broadcast'}
          </Button>
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold">Slack version</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => copy('slack')} disabled={!result.versions.slack}>
                {copiedTab === 'slack' ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copiedTab === 'slack' ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="rounded-lg border bg-background p-3 text-sm whitespace-pre-wrap min-h-[200px]">
              {result.versions.slack || '(not generated)'}
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold">Email version</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => copy('email')} disabled={!result.versions.email}>
                {copiedTab === 'email' ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copiedTab === 'email' ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="rounded-lg border bg-background p-3 text-sm whitespace-pre-wrap min-h-[200px]">
              {result.versions.email || '(not generated)'}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
        active ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
