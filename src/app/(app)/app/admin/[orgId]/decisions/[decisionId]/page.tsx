'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Gavel, Undo2, Layers, Archive, CheckCircle2, ArrowLeft, AlertCircle,
  Edit3, Save, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'active' | 'superseded' | 'reversed' | 'archived'

interface Decision {
  id: string
  title: string
  context: string | null
  rationale: string | null
  outcome: string | null
  decidedByUserId: string | null
  decidedAt: string
  status: Status
  supersededById: string | null
  reversedAt: string | null
  reversedByUserId: string | null
  reversedReason: string | null
  tags: string | null
  createdAt: string
  updatedAt: string
  departmentId: string | null
  workspaceId: string
  recordId: string | null
}

const STATUS_META: Record<Status, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  active: { label: 'Active', icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  superseded: { label: 'Superseded', icon: Layers, cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  reversed: { label: 'Reversed', icon: Undo2, cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' },
  archived: { label: 'Archived', icon: Archive, cls: 'bg-muted text-muted-foreground' },
}

export default function DecisionDetailPage({
  params,
}: {
  params: { orgId: string; decisionId: string }
}) {
  const { orgId, decisionId } = params
  const [decision, setDecision] = useState<Decision | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [reversing, setReversing] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    setErr(null)
    const res = await fetch(`/api/enterprise/organizations/${orgId}/decisions/${decisionId}`)
    if (!res.ok) {
      setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      return
    }
    const data = await res.json()
    setDecision(data.decision)
  }

  useEffect(() => {
    load()
  }, [orgId, decisionId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (err) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-3">
        <AlertCircle className="h-4 w-4" />
        {err}
      </div>
    )
  }
  if (!decision) return <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>

  const meta = STATUS_META[decision.status]
  const Icon = meta.icon

  return (
    <div className="space-y-5 max-w-3xl">
      <Link
        href={`/app/admin/${orgId}/decisions`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All decisions
      </Link>

      <div className="flex items-start gap-3">
        <Gavel className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold break-words">{decision.title}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
            <span>Decided {new Date(decision.decidedAt).toLocaleString()}</span>
            <span>·</span>
            <span className={cn('inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full', meta.cls)}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
          </div>
        </div>
        {decision.status === 'active' && !editing && !reversing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit3 className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setReversing(true)}>
              <Undo2 className="h-3.5 w-3.5 mr-1" />
              Reverse
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <EditForm
          decision={decision}
          busy={busy}
          setBusy={setBusy}
          onSaved={async () => { setEditing(false); await load() }}
          onCancel={() => setEditing(false)}
          orgId={orgId}
        />
      ) : (
        <>
          <Section label="Context" text={decision.context} />
          <Section label="Rationale" text={decision.rationale} />
          <Section label="Outcome" text={decision.outcome} empty="Not yet recorded. Update this once you know how it played out." />
        </>
      )}

      {reversing && (
        <ReverseForm
          orgId={orgId}
          decisionId={decision.id}
          busy={busy}
          setBusy={setBusy}
          onDone={async () => { setReversing(false); await load() }}
          onCancel={() => setReversing(false)}
        />
      )}

      {(decision.status === 'reversed' || decision.status === 'superseded') && (
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            {decision.status === 'reversed' ? 'Reversed' : 'Superseded'}
          </div>
          <div className="text-sm">
            {decision.reversedAt && <span>{new Date(decision.reversedAt).toLocaleString()} · </span>}
            {decision.reversedReason || 'No reason recorded.'}
          </div>
          {decision.supersededById && (
            <Link
              href={`/app/admin/${orgId}/decisions/${decision.supersededById}`}
              className="inline-block mt-2 text-xs text-primary hover:underline"
            >
              View replacement →
            </Link>
          )}
        </Card>
      )}

      <Card className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">References</div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-sm">
          <Kv k="Workspace" v={decision.workspaceId} />
          <Kv k="Department" v={decision.departmentId ?? '—'} />
          <Kv k="Record" v={decision.recordId ?? '—'} />
          <Kv k="Decider" v={decision.decidedByUserId ?? '—'} />
          <Kv k="Created" v={new Date(decision.createdAt).toLocaleString()} />
          <Kv k="Updated" v={new Date(decision.updatedAt).toLocaleString()} />
        </dl>
      </Card>
    </div>
  )
}

function Section({ label, text, empty }: { label: string; text: string | null; empty?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className={cn('text-sm whitespace-pre-wrap', !text && 'text-muted-foreground italic')}>
        {text || empty || '—'}
      </div>
    </Card>
  )
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-xs text-muted-foreground w-24 flex-shrink-0">{k}</dt>
      <dd className="font-mono text-xs break-all">{v}</dd>
    </div>
  )
}

function EditForm({
  decision,
  busy,
  setBusy,
  onSaved,
  onCancel,
  orgId,
}: {
  decision: Decision
  busy: boolean
  setBusy: (b: boolean) => void
  onSaved: () => Promise<void>
  onCancel: () => void
  orgId: string
}) {
  const [title, setTitle] = useState(decision.title)
  const [context, setContext] = useState(decision.context ?? '')
  const [rationale, setRationale] = useState(decision.rationale ?? '')
  const [outcome, setOutcome] = useState(decision.outcome ?? '')
  const [err, setErr] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/decisions/${decision.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          context,
          rationale,
          outcome,
        }),
      })
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      await onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-4">
      <form onSubmit={save} className="space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Textarea placeholder="Context" value={context} onChange={(e) => setContext(e.target.value)} rows={2} />
        <Textarea placeholder="Rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2} />
        <Textarea placeholder="Outcome (what happened after)" value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={2} />
        {err && <div className="text-sm text-destructive">{err}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !title.trim()}>
            <Save className="h-3.5 w-3.5 mr-1" />
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function ReverseForm({
  orgId,
  decisionId,
  busy,
  setBusy,
  onDone,
  onCancel,
}: {
  orgId: string
  decisionId: string
  busy: boolean
  setBusy: (b: boolean) => void
  onDone: () => Promise<void>
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const [supersededById, setSupersededById] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/decisions/${decisionId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          supersededById: supersededById.trim() || undefined,
        }),
      })
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      await onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-4 border-rose-500/30 bg-rose-500/5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Reverse this decision</div>
      <form onSubmit={submit} className="space-y-3">
        <Textarea
          placeholder="Why is this being reversed? (required)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
        />
        <Input
          placeholder="Replaced by decision ID (optional — marks as superseded instead)"
          value={supersededById}
          onChange={(e) => setSupersededById(e.target.value)}
        />
        {err && <div className="text-sm text-destructive">{err}</div>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || reason.trim().length < 3}>
            <Undo2 className="h-3.5 w-3.5 mr-1" />
            {busy ? 'Reversing…' : supersededById ? 'Mark superseded' : 'Reverse'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
