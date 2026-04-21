'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Gavel, CheckCircle2, Layers, Undo2, Archive, AlertCircle, Clock, Plus, X, Loader2 } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
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
  departmentId: string | null
  reversedAt: string | null
  reversedReason: string | null
}

interface Dept { id: string; name: string; kind: string }
interface Team { teamId: string; teamName: string; workspaceId: string }

const STATUS_META: Record<Status, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  active: { label: 'Active', icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  superseded: { label: 'Superseded', icon: Layers, cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  reversed: { label: 'Reversed', icon: Undo2, cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' },
  archived: { label: 'Archived', icon: Archive, cls: 'bg-muted text-muted-foreground' },
}

export default function EmployeeDecisionsPage() {
  const activeOrgId = useAppStore((s) => s.activeEnterpriseOrgId)
  const [decisions, setDecisions] = useState<Decision[] | null>(null)
  const [departments, setDepartments] = useState<Dept[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [filter, setFilter] = useState<Status | 'all'>('active')
  const [deptFilter, setDeptFilter] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  async function load() {
    if (!activeOrgId) return
    setErr(null)
    const q = new URLSearchParams()
    if (filter !== 'all') q.set('status', filter)
    if (deptFilter) q.set('departmentId', deptFilter)
    const [dRes, depRes, tRes] = await Promise.all([
      fetch(`/api/enterprise/organizations/${activeOrgId}/decisions?${q.toString()}`),
      fetch(`/api/enterprise/organizations/${activeOrgId}/departments`),
      fetch(`/api/enterprise/organizations/${activeOrgId}/teams`),
    ])
    if (!dRes.ok) {
      setErr((await dRes.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      return
    }
    setDecisions((await dRes.json()).decisions)
    if (depRes.ok) setDepartments((await depRes.json()).departments)
    if (tRes.ok) setTeams((await tRes.json()).teams)
  }

  useEffect(() => {
    load()
  }, [activeOrgId, filter, deptFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const deptNameById = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
            <Gavel className="h-3.5 w-3.5" />
            Decisions
          </div>
          <h1 className="font-display text-4xl tracking-tight mb-1">What we decided</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Every formal decision in your organization, with who decided, why, and whether it was reversed.
            You can log your own team&apos;s decisions here. Reversing and editing requires admin access.
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)} disabled={teams.length === 0}>
          {showCreate ? <><X className="h-3.5 w-3.5 mr-1" /> Cancel</> : <><Plus className="h-3.5 w-3.5 mr-1" /> Log decision</>}
        </Button>
      </div>

      {showCreate && activeOrgId && (
        <LogDecisionForm
          orgId={activeOrgId}
          teams={teams}
          departments={departments}
          onCreated={async () => { setShowCreate(false); await load() }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['active', 'reversed', 'superseded', 'archived', 'all'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full border transition-colors capitalize',
              filter === s
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {s}
          </button>
        ))}
        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-7 ml-auto rounded border border-input bg-background px-2 text-xs"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
      </div>

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {decisions === null ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : decisions.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">
            {filter === 'all' ? 'No decisions logged yet.' : `No ${filter} decisions.`}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {decisions.map((d) => {
              const meta = STATUS_META[d.status]
              const Icon = meta.icon
              return (
                <li key={d.id}>
                  <Link
                    href={activeOrgId ? `/app/admin/${activeOrgId}/decisions/${d.id}` : '#'}
                    className="flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors"
                  >
                    <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', meta.cls.split(' ')[1])} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-medium truncate">{d.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(d.decidedAt).toLocaleDateString()}</span>
                        {d.departmentId && deptNameById.get(d.departmentId) && (
                          <>
                            <span>·</span>
                            <span>{deptNameById.get(d.departmentId)}</span>
                          </>
                        )}
                        {d.status === 'reversed' && d.reversedReason && (
                          <>
                            <span>·</span>
                            <span className="italic">reversed: {d.reversedReason.slice(0, 70)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0', meta.cls)}>
                      {meta.label}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

function LogDecisionForm({
  orgId,
  teams,
  departments,
  onCreated,
  onCancel,
}: {
  orgId: string
  teams: Team[]
  departments: Dept[]
  onCreated: () => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [rationale, setRationale] = useState('')
  const [teamId, setTeamId] = useState(teams[0]?.teamId ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      // The decisions POST resolves the workspace from the departmentId (team)
      const res = await fetch(`/api/enterprise/organizations/${orgId}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          context: context.trim() || undefined,
          rationale: rationale.trim() || undefined,
          departmentId: teamId || undefined,
        }),
      })
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      await onCreated()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5 border-primary/30">
      <div className="flex items-center gap-2 mb-4">
        <Gavel className="h-4 w-4 text-primary" />
        <h2 className="font-display text-xl">Log a new decision</h2>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <Input
          placeholder="Decision title (e.g. Adopt Postgres for analytics)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
        <Textarea
          placeholder="Context — what prompted this decision? (optional)"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={2}
        />
        <Textarea
          placeholder="Rationale — why this choice? (optional)"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={2}
        />
        {teams.length > 0 ? (
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="h-9 w-full rounded border border-input bg-background px-2 text-sm"
            required
          >
            <option value="">Which team does this belong to?</option>
            {teams.map((t) => (
              <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
            ))}
          </select>
        ) : (
          <div className="text-sm text-amber-700 dark:text-amber-400 border border-amber-500/30 bg-amber-500/5 rounded p-2">
            You need to be a member of at least one team to log decisions. Ask your admin.
          </div>
        )}
        {err && <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">{err}</div>}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-muted-foreground">
            {departments.length} department{departments.length === 1 ? '' : 's'} available. Decisions you log here are visible to your team + admins.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" type="button" onClick={onCancel} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy || !title.trim() || !teamId}>
              {busy ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Logging…</> : 'Log decision'}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  )
}
