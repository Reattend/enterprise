'use client'

// Draft Email Reply — an action agent.
//
// Paste the thread you're replying to. the AI reads it, pulls relevant
// memory context from your org, and drafts a reply grounded in what you
// already know. Copy out when you're happy.

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Mail, Loader2, Copy, Check, Sparkles, ArrowLeft, FileText, RefreshCw,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAppStore } from '@/stores/app-store'

interface Source {
  id: string
  title: string
  type: string
}

export default function DraftEmailReplyPage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const [thread, setThread] = useState('')
  const [instruction, setInstruction] = useState('')
  const [draft, setDraft] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [scanned, setScanned] = useState<number>(0)
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)

  async function run() {
    if (!activeOrgId) return
    if (thread.trim().length < 20) {
      toast.error('Paste the email thread — at least 20 characters')
      return
    }
    setRunning(true)
    setDraft('')
    try {
      const res = await fetch('/api/enterprise/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'email-reply',
          orgId: activeOrgId,
          thread,
          instruction: instruction.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Draft failed')
        return
      }
      const data = await res.json()
      setDraft(data.draft || '')
      setSources(data.sources || [])
      setScanned(data.meta?.memoriesScanned ?? 0)
    } finally {
      setRunning(false)
    }
  }

  function copyDraft() {
    if (!draft) return
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success('Copied')
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
          <Mail className="h-3.5 w-3.5" /> Action agent
        </div>
        <h1 className="font-display text-3xl tracking-tight">Draft an email reply</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Paste the thread you&apos;re replying to. the AI reads it, pulls relevant memory context
          from the org, and drafts a grounded reply. No facts fabricated — if memory doesn&apos;t
          have it, the AI doesn&apos;t invent it.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <label className="text-xs text-muted-foreground">The thread you&apos;re replying to</label>
          <Textarea
            value={thread}
            onChange={(e) => setThread(e.target.value)}
            placeholder={`Hi team,\n\nFollowing up on the pricing discussion — can we confirm the enterprise tier pricing before Thursday's customer call? I think we settled on...`}
            rows={12}
            className="text-sm resize-none font-sans"
            disabled={running}
          />
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Instruction (optional)</label>
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Keep it friendly, push back on the timeline"
              disabled={running}
            />
          </div>
          <div className="flex items-center justify-end pt-2 border-t">
            <Button
              onClick={run}
              disabled={running || thread.trim().length < 20}
              className="bg-gradient-to-br from-amber-500 to-orange-500 hover:opacity-95"
            >
              {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {draft ? 'Redraft' : 'Draft reply'}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 min-h-[360px] flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">Draft</span>
              {scanned > 0 && <span className="text-[11px] text-muted-foreground">· {scanned} memor{scanned === 1 ? 'y' : 'ies'} scanned</span>}
            </div>
            {draft && (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={run} title="Redraft">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={copyDraft}>
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            )}
          </div>

          {running && !draft && (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Drafting…
            </div>
          )}
          {!running && !draft && (
            <div className="flex-1 flex items-center justify-center text-center text-sm text-muted-foreground px-6">
              Your draft shows up here. Sources used appear below it.
            </div>
          )}
          {draft && (
            <>
              <div className="rounded-lg border bg-background p-3 text-sm whitespace-pre-wrap flex-1 overflow-y-auto max-h-[340px]">
                {draft}
              </div>
              {sources.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Memory sources</div>
                  <div className="flex flex-wrap gap-1.5">
                    {sources.map((s) => (
                      <Link
                        key={s.id}
                        href={`/app/memories/${s.id}`}
                        className="inline-flex items-center gap-1 text-[11px] rounded-full border px-2 py-0.5 hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="h-2.5 w-2.5" /> <span className="truncate max-w-[180px]">{s.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
