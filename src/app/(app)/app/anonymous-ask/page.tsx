'use client'

// Anonymous Ask — sensitive-question surface.
//
// Same RBAC as regular Ask (you see only what you could already see), but
// your identity is stripped from the audit trail. Answers are one-shot; no
// thread history, no follow-ups.
//
// Intended for HR / compliance / reporting-adjacent questions where the
// fact of asking is itself sensitive. The admin sees "anonymous_query"
// events in the audit log without attribution.

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Loader2, Copy, Check, Sparkles, AlertTriangle, Lock,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAppStore } from '@/stores/app-store'

export default function AnonymousAskPage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)

  async function run() {
    if (!activeOrgId) return
    if (question.trim().length < 5) {
      toast.error('Question needs at least 5 characters')
      return
    }
    setRunning(true)
    setAnswer('')
    try {
      const res = await fetch('/api/enterprise/anonymous-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: activeOrgId, question: question.trim() }),
      })
      if (!res.ok) {
        const t = await res.text().catch(() => 'Request failed')
        toast.error(t.length > 100 ? 'Request failed' : t)
        return
      }
      setAnswer(await res.text())
    } finally {
      setRunning(false)
    }
  }

  function copyAnswer() {
    navigator.clipboard.writeText(answer)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function startOver() {
    setQuestion('')
    setAnswer('')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-5 py-4"
    >
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <Lock className="h-3.5 w-3.5" /> Anonymous Ask
        </div>
        <h1 className="font-display text-3xl tracking-tight">Ask without attribution</h1>
        <p className="text-sm text-muted-foreground mt-1">
          For sensitive questions — HR, compliance, reporting — where the fact of asking is itself
          sensitive. Your identity is stripped from the audit trail. Admin sees an anonymous query
          in the log, not who asked it.
        </p>
      </div>

      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 flex items-start gap-3">
        <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <p><strong className="text-foreground">What&apos;s anonymous:</strong> your identity in the audit log, your IP, your browser. The admin sees the question text without knowing who asked.</p>
          <p className="mt-1.5"><strong className="text-foreground">What&apos;s not:</strong> permissions. You still only see answers from memory you could already access. This is not a way around RBAC.</p>
          <p className="mt-1.5"><strong className="text-foreground">No thread:</strong> one-shot. No follow-ups, no history saved. Ask; get an answer; close the tab.</p>
        </div>
      </div>

      {!answer ? (
        <div className="rounded-2xl border-2 border-primary/20 bg-card p-4">
          <label className="text-xs text-muted-foreground mb-1.5 block">Your question</label>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={5}
            placeholder="What's our policy on reporting a concern about a manager? / Who do I talk to about a compliance issue?"
            disabled={running}
            className="text-sm resize-none"
          />
          <div className="flex items-center justify-between pt-3 border-t mt-3">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
              For safety-critical issues, use your org&apos;s direct HR channel too.
            </div>
            <Button
              onClick={run}
              disabled={running || question.trim().length < 5}
              className="bg-gradient-to-br from-primary to-primary/80"
            >
              {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Ask anonymously
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-semibold">Answer</span>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={copyAnswer}>
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button size="sm" variant="ghost" onClick={startOver}>New question</Button>
              </div>
            </div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{answer}</div>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            This session doesn&apos;t persist. When you close this tab, the conversation is gone.
          </p>
        </div>
      )}
    </motion.div>
  )
}
