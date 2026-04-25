'use client'

// Handoff Generator — one-click personalized handoff doc.
//
// Admin picks outgoing + incoming person + optional scope ("Project Atlas",
// "AP accounts", etc.). the AI reads the outgoing person's footprint and
// writes a doc tuned for the successor. Saved as a memory.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRightLeft, Loader2, Sparkles, Check, FileText, ArrowRight,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

interface Member {
  membershipId: string
  userId: string
  email: string
  name: string
  role: string
  status: string
}

export default function HandoffPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [members, setMembers] = useState<Member[]>([])
  const [fromUserId, setFromUserId] = useState<string | null>(null)
  const [toUserId, setToUserId] = useState<string | null>(null)
  const [scope, setScope] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ recordId: string | null; handoffDoc: string; footprint: { authoredCount: number; decisionCount: number } } | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/organizations/${orgId}/members`)
        if (!res.ok) return
        const data = await res.json()
        setMembers((data.members || []).filter((m: Member) => m.status === 'active'))
      } catch { /* silent */ }
    })()
  }, [orgId])

  async function run() {
    if (!fromUserId || !toUserId) {
      toast.error('Pick both people')
      return
    }
    if (fromUserId === toUserId) {
      toast.error('Outgoing and incoming can\'t be the same person')
      return
    }
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch('/api/enterprise/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          fromUserId,
          toUserId,
          scope: scope.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Failed')
        return
      }
      const data = await res.json()
      setResult(data)
      toast.success('Handoff doc ready')
    } finally {
      setRunning(false)
    }
  }

  function reset() {
    setResult(null)
    setFromUserId(null)
    setToUserId(null)
    setScope('')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <ArrowRightLeft className="h-3.5 w-3.5" /> Handoff Generator
        </div>
        <h1 className="font-display text-3xl tracking-tight">One-click role handoff</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          the AI reads the outgoing person&apos;s authored memories and decisions, then writes a
          personalized handoff doc tuned for the successor. Use this when someone has already left
          or when you just need a fast overview of what they owned.
        </p>
      </div>

      {!result && (
        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Outgoing person</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={fromUserId ?? ''}
                onChange={(e) => setFromUserId(e.target.value || null)}
                disabled={running}
              >
                <option value="">Pick someone…</option>
                {members.map((m) => (
                  <option key={m.membershipId} value={m.userId}>{m.name || m.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Incoming person</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={toUserId ?? ''}
                onChange={(e) => setToUserId(e.target.value || null)}
                disabled={running}
              >
                <option value="">Pick someone…</option>
                {members.filter((m) => m.userId !== fromUserId).map((m) => (
                  <option key={m.membershipId} value={m.userId}>{m.name || m.email}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Scope (optional)</label>
            <Input
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="e.g. Project Atlas, AP accounts, Q3 hiring"
              disabled={running}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Narrows the doc to a specific project or portfolio. Leave blank for a full role handoff.
            </p>
          </div>
          <div className="flex items-center justify-end pt-2 border-t">
            <Button
              onClick={run}
              disabled={running || !fromUserId || !toUserId}
              className="bg-gradient-to-br from-primary to-primary/80"
            >
              {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Generate handoff
            </Button>
          </div>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <Card className="p-4 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20 flex items-center gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Handoff doc ready</div>
              <div className="text-xs text-muted-foreground">
                Synthesized from {result.footprint.authoredCount} memor{result.footprint.authoredCount === 1 ? 'y' : 'ies'} + {result.footprint.decisionCount} decision{result.footprint.decisionCount === 1 ? '' : 's'}. Saved to org memory.
              </div>
            </div>
            {result.recordId && (
              <Button variant="outline" asChild>
                <Link href={`/app/memories/${result.recordId}`}>
                  <FileText className="h-3.5 w-3.5 mr-1" /> Open as memory
                </Link>
              </Button>
            )}
            <Button variant="ghost" onClick={reset}>New</Button>
          </Card>

          <Card className="p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{result.handoffDoc}</ReactMarkdown>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  )
}
