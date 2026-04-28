'use client'

// "Who should I ask?" dialog. Press ⌘⇧K anywhere or click the topbar button.
// Type a question, see top 5 people in the org best positioned to answer,
// each with a one-line AI-written "why this person".

import { useEffect, useRef, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAppStore } from '@/stores/app-store'
import { Sparkles, Loader2, Users, Mail, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

type Expert = {
  userId: string
  name: string | null
  email: string
  title: string | null
  authoredCount: number
  decisionCount: number
  entityMentions: number
  lastActivityAt: string | null
  totalScore: number
  sampleTitles: string[]
  why: string | null
}

export function AskExpertsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { activeEnterpriseOrgId } = useAppStore()
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [experts, setExperts] = useState<Expert[] | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      // Reset on close so next open is clean
      setQ('')
      setExperts(null)
      setKeywords([])
    }
  }, [open])

  async function run() {
    if (q.trim().length < 3) {
      toast.error('Type a question with at least 3 characters')
      return
    }
    if (!activeEnterpriseOrgId) {
      toast.error('Select an organization first (top-left of the topbar)')
      return
    }
    setLoading(true)
    setExperts(null)
    try {
      const res = await fetch(
        `/api/enterprise/ask-experts?orgId=${activeEnterpriseOrgId}&q=${encodeURIComponent(q.trim())}`,
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast.error(body.error || `Failed to find experts (HTTP ${res.status})`)
        return
      }
      const data = await res.json()
      setExperts(data.experts || [])
      setKeywords(data.keywords || [])
    } catch (err) {
      toast.error((err as Error).message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email)
    setCopied(email)
    setTimeout(() => setCopied(null), 1500)
    toast.success('Email copied')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Who should I ask?
          </DialogTitle>
          <DialogDescription className="text-xs">
            Type any question. Reattend ranks the top 5 people in your org most likely to know, based on
            who's authored related memories, made related decisions, and who comes up when this topic is discussed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !loading) run() }}
              placeholder="e.g. Who knows about our Postgres migration strategy?"
              className="flex-1"
              disabled={loading}
            />
            <button
              onClick={run}
              disabled={loading || q.trim().length < 3}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Find
            </button>
          </div>

          {keywords.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-muted-foreground">Matching:</span>
              {keywords.map((k) => (
                <Badge key={k} variant="outline" className="text-[10px] h-4 px-1 capitalize">{k}</Badge>
              ))}
            </div>
          )}

          {experts === null && !loading && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Ask anything. Good questions: <em>"who knows about our AWS billing setup?"</em>,
              <em> "who led the pricing conversation last quarter?"</em>
            </div>
          )}

          {loading && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Scoring authorship, decisions, and entity overlap…
            </div>
          )}

          {experts && experts.length === 0 && !loading && (
            <div className="py-8 text-center">
              <div className="text-sm font-medium text-foreground">No clear expert found.</div>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
                Either this topic hasn&apos;t been captured in memory yet, or no one in your accessible departments has authored related records. Try rephrasing the question, or capture a memory about the topic first and try again.
              </p>
              {keywords.length === 0 && (
                <p className="text-[11px] text-muted-foreground/70 mt-3">
                  Tip: questions with specific nouns work better. &quot;Who knows about <em>BEPS treaty</em>?&quot; ranks higher than &quot;who can help me?&quot;.
                </p>
              )}
            </div>
          )}

          {experts && experts.length > 0 && (
            <div className="space-y-2">
              {experts.map((e, i) => {
                const initials = (e.name || e.email).split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={e.userId} className="rounded-xl border bg-card p-3 flex items-start gap-3">
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={undefined} alt={e.name || e.email} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-semibold">{e.name || e.email}</div>
                        {e.title && <Badge variant="outline" className="text-[10px] h-4 px-1">{e.title}</Badge>}
                      </div>
                      {e.why && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                          <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                          <span>{e.why}</span>
                        </p>
                      )}
                      <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-2.5 flex-wrap">
                        <span><strong className="text-foreground">{e.authoredCount}</strong> related memories</span>
                        {e.decisionCount > 0 && <span><strong className="text-foreground">{e.decisionCount}</strong> decisions</span>}
                        {e.entityMentions > 0 && <span><strong className="text-foreground">{e.entityMentions}</strong> mentions</span>}
                        {e.lastActivityAt && (
                          <span>last active {new Date(e.lastActivityAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => copyEmail(e.email)}
                      className="shrink-0 h-8 px-2 rounded-md border text-xs inline-flex items-center gap-1.5 hover:bg-muted"
                      title="Copy email"
                    >
                      {copied === e.email ? <Check className="h-3 w-3 text-emerald-500" /> : <Mail className="h-3 w-3" />}
                      {copied === e.email ? 'Copied' : 'Email'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
