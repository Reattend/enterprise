'use client'

// Exit interviews — admin cockpit page.
//
// Lists every interview in the org (draft / in_progress / completed). Admin
// can:
//   - Start a new one (pick a member, optionally name the role)
//   - Open a completed one to read the handoff doc
//   - Copy the participant link to hand to the departing person
//
// The participant-facing session page lives at /app/exit-interview/[id].

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  GraduationCap, Plus, Loader2, Check, Clock, Copy, ArrowRight,
  Users as UsersIcon, UserX, AlertCircle, Link as LinkIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/empty-state'

interface InterviewRow {
  id: string
  departingUserId: string
  departingName: string
  initiatedByName: string
  roleTitle: string | null
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  questionCount: number
  answeredCount: number
  handoffRecordId: string | null
  createdAt: string
  completedAt: string | null
}

interface Member {
  membershipId: string
  userId: string
  email: string
  name: string
  role: string
  status: string
}

const STATUS_META: Record<InterviewRow['status'], { label: string; tone: string; icon: any }> = {
  draft:        { label: 'Draft',        tone: 'bg-muted text-muted-foreground',           icon: Clock },
  in_progress:  { label: 'In progress',  tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-500/30', icon: Clock },
  completed:    { label: 'Completed',    tone: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: Check },
  archived:     { label: 'Archived',     tone: 'bg-slate-500/10 text-slate-600',           icon: UserX },
}

export default function ExitInterviewsPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [rows, setRows] = useState<InterviewRow[] | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [creating, setCreating] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [roleTitle, setRoleTitle] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function load() {
    setErr(null)
    try {
      const res = await fetch(`/api/enterprise/exit-interviews?orgId=${orgId}`)
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      const data = await res.json()
      setRows(data.interviews || [])
    } catch {
      setErr('network error')
    }
  }

  async function loadMembers() {
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/members`)
      if (!res.ok) return
      const data = await res.json()
      setMembers(data.members || [])
    } catch { /* silent */ }
  }

  useEffect(() => {
    load()
    loadMembers()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function startInterview() {
    if (!selectedUserId) {
      toast.error('Pick someone')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/enterprise/exit-interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          departingUserId: selectedUserId,
          roleTitle: roleTitle.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        toast.error(b.error || 'Failed to start')
        return
      }
      toast.success('Exit interview created — the AI pre-generated questions from their memory')
      setSelectedUserId(null)
      setRoleTitle('')
      await load()
    } finally {
      setCreating(false)
    }
  }

  function copyParticipantLink(interviewId: string) {
    const url = `${window.location.origin}/app/exit-interview/${interviewId}`
    navigator.clipboard.writeText(url)
    toast.success('Participant link copied')
  }

  const activeMembers = members.filter((m) => m.status === 'active')

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
          <GraduationCap className="h-3.5 w-3.5" /> Exit Interview Agent
        </div>
        <h1 className="font-display text-3xl tracking-tight">Catch the knowledge before it walks out</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Pick the person leaving, name the role, and the AI pre-reads their memory footprint to
          write 10-15 targeted questions. They answer in one sitting; we synthesize a structured
          handoff doc their successor can read on day one.
        </p>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" /> Start new exit interview
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <select
            className="sm:col-span-5 h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={selectedUserId ?? ''}
            onChange={(e) => setSelectedUserId(e.target.value || null)}
          >
            <option value="">Who's leaving?…</option>
            {activeMembers.map((m) => (
              <option key={m.membershipId} value={m.userId}>
                {m.name || m.email} · {m.role.replace('_', ' ')}
              </option>
            ))}
          </select>
          <Input
            className="sm:col-span-5"
            placeholder="Role title (e.g. Senior Backend Engineer)"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
          />
          <Button
            className="sm:col-span-2"
            onClick={startInterview}
            disabled={!selectedUserId || creating}
          >
            {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-1" />}
            Start
          </Button>
        </div>
      </Card>

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
          <AlertCircle className="h-4 w-4" /> {err}
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <UsersIcon className="h-4 w-4 text-muted-foreground" /> Interviews
          {rows && <span className="text-muted-foreground font-normal">({rows.length})</span>}
        </h2>
        {rows === null ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Loading…
          </Card>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No exit interviews yet"
            description="When someone on the team gives notice, start one here. the AI does the question-writing; the departing person fills in answers; everyone else benefits."
          />
        ) : (
          <Card className="p-0 overflow-hidden">
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const meta = STATUS_META[r.status]
                const Icon = meta.icon
                const progress = r.questionCount > 0 ? Math.round((r.answeredCount / r.questionCount) * 100) : 0
                return (
                  <li key={r.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', r.status === 'in_progress' && 'text-amber-500', r.status === 'completed' && 'text-emerald-500')} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-sm font-semibold">{r.departingName}</div>
                          {r.roleTitle && <span className="text-xs text-muted-foreground">· {r.roleTitle}</span>}
                          <Badge variant="outline" className={`text-[10px] ${meta.tone}`}>{meta.label}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {r.answeredCount} / {r.questionCount} answered · started by {r.initiatedByName} · {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                        {r.status === 'in_progress' && (
                          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {r.status === 'in_progress' && (
                          <Button size="sm" variant="ghost" onClick={() => copyParticipantLink(r.id)} title="Copy link to give to the departing person">
                            <LinkIcon className="h-3.5 w-3.5 mr-1" /> Copy link
                          </Button>
                        )}
                        {r.status === 'completed' && r.handoffRecordId && (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/app/memories/${r.handoffRecordId}`}>
                              Open handoff doc
                            </Link>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/app/exit-interview/${r.id}`}>View</Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </div>
    </motion.div>
  )
}
