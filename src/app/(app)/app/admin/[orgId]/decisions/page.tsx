'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Gavel, Plus, X, AlertCircle, CheckCircle2, Archive, Undo2, Layers, Radar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BlastRadiusDialog } from '@/components/enterprise/blast-radius-dialog'
import { EmptyState } from '@/components/ui/empty-state'

type Status = 'active' | 'superseded' | 'reversed' | 'archived'

interface Decision {
  id: string
  organizationId: string
  departmentId: string | null
  workspaceId: string
  recordId: string | null
  title: string
  context: string | null
  rationale: string | null
  outcome: string | null
  decidedByUserId: string | null
  decidedByRoleId: string | null
  decidedAt: string
  status: Status
  supersededById: string | null
  reversedAt: string | null
  reversedByUserId: string | null
  reversedReason: string | null
  tags: string | null
  createdAt: string
  updatedAt: string
}

interface Dept {
  id: string
  name: string
  kind: string
  parentId: string | null
}

interface OrgMembership {
  orgId: string
  orgName: string
}

const STATUS_META: Record<Status, { label: string; icon: typeof CheckCircle2; cls: string }> = {
  active: { label: 'Active', icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  superseded: { label: 'Superseded', icon: Layers, cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  reversed: { label: 'Reversed', icon: Undo2, cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-400' },
  archived: { label: 'Archived', icon: Archive, cls: 'bg-muted text-muted-foreground' },
}

export default function DecisionsListPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [decisions, setDecisions] = useState<Decision[] | null>(null)
  const [blastDecisionId, setBlastDecisionId] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Dept[]>([])
  const [workspaces, setWorkspaces] = useState<{ workspaceId: string; label: string }[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<Status | 'all'>('active')
  const [showCreate, setShowCreate] = useState(false)

  async function load(status: Status | 'all') {
    setErr(null)
    const q = new URLSearchParams()
    if (status !== 'all') q.set('status', status)
    const res = await fetch(`/api/enterprise/organizations/${orgId}/decisions?${q.toString()}`)
    if (!res.ok) {
      setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      return
    }
    const data = await res.json()
    setDecisions(data.decisions)
  }

  async function loadDepts() {
    const res = await fetch(`/api/enterprise/organizations/${orgId}/departments`)
    if (res.ok) {
      const data = await res.json()
      setDepartments(data.departments)
    }
  }

  async function loadWorkspaces() {
    // Workspaces available to the current user — we use the /api/enterprise/organizations list
    // to find our own workspace ids via the org memberships + browser state. For now, we just
    // use the user's current workspace cookie; create-dialog falls back to that.
    // Simpler: list memberships so we have a name, and let create use the current app workspace.
    try {
      const res = await fetch('/api/enterprise/organizations')
      if (!res.ok) return
      const _: { organizations: OrgMembership[] } = await res.json()
      // We don't have a workspace-listing API yet; the create form just accepts a workspaceId.
      // To keep v1 simple we let the user paste it. A proper picker comes with the Records UI.
      setWorkspaces([])
    } catch {
      // optional
    }
  }

  useEffect(() => {
    load(filter)
  }, [orgId, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadDepts()
    loadWorkspaces()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const deptNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of departments) m.set(d.id, d.name)
    return m
  }, [departments])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-3xl tracking-tight flex items-center gap-3">
            <Gavel className="h-6 w-6 text-primary" />
            Decisions
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Every decision the org has made — who decided, when, why, and whether it stuck. When a decision is
            reversed, the reason is captured. Superseded decisions point to their replacement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/enterprise/organizations/${orgId}/decisions/briefing?format=markdown`} download>
              Download briefing
            </a>
          </Button>
          <Button onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {showCreate ? 'Cancel' : 'Log decision'}
          </Button>
        </div>
      </div>

      {showCreate && (
        <CreateDecisionForm
          orgId={orgId}
          departments={departments}
          onCreated={async () => {
            setShowCreate(false)
            await load(filter)
          }}
        />
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {(['active', 'superseded', 'reversed', 'archived', 'all'] as const).map((s) => {
          const active = filter === s
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors capitalize',
                active ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {s}
            </button>
          )
        })}
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
          <div className="p-6">
            {filter === 'all' ? (
              <EmptyState
                icon={Gavel}
                title="No decisions logged yet"
                description="Decisions are the load-bearing memories of your org — who decided what, when, and why. Log one to start a chain other memories can cite."
                action={{
                  label: 'Log first decision',
                  onClick: () => {
                    const btn = document.querySelector<HTMLButtonElement>('[data-new-decision-trigger]')
                    btn?.click()
                  },
                }}
              />
            ) : (
              <EmptyState
                icon={Archive}
                title={`No ${filter} decisions`}
                description={`Switch the filter above to see decisions in other statuses.`}
              />
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {decisions.map((d) => {
              const meta = STATUS_META[d.status]
              const Icon = meta.icon
              return (
                <li key={d.id}>
                  <div className="flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors">
                    <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', meta.cls.split(' ')[1])} />
                    <Link
                      href={`/app/admin/${orgId}/decisions/${d.id}`}
                      className="flex-1 min-w-0"
                    >
                      <div className="text-sm font-medium truncate">{d.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
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
                            <span className="italic">reversed: {d.reversedReason.slice(0, 60)}</span>
                          </>
                        )}
                      </div>
                    </Link>
                    <button
                      onClick={() => setBlastDecisionId(d.id)}
                      className="text-[11px] text-muted-foreground hover:text-red-600 inline-flex items-center gap-1 rounded border px-2 py-1 shrink-0"
                      title="See blast radius"
                    >
                      <Radar className="h-3 w-3" /> Blast
                    </button>
                    <span className={cn('text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0', meta.cls)}>
                      {meta.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <BlastRadiusDialog
        decisionId={blastDecisionId}
        open={!!blastDecisionId}
        onOpenChange={(v) => !v && setBlastDecisionId(null)}
      />
    </div>
  )
}

function CreateDecisionForm({
  orgId,
  departments,
  onCreated,
}: {
  orgId: string
  departments: Dept[]
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [rationale, setRationale] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Only team-kind depts have backing workspaces — those are the valid targets.
  const teams = departments.filter((d) => d.kind === 'team')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          context: context.trim() || undefined,
          rationale: rationale.trim() || undefined,
          departmentId: departmentId || undefined,
        }),
      })
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      onCreated()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-3">
        <Input
          placeholder="Decision title (e.g. Adopt Postgres for analytics)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Textarea
          placeholder="Context — what prompted this decision?"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={2}
        />
        <Textarea
          placeholder="Rationale — why this choice?"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={2}
        />
        {teams.length === 0 ? (
          <div className="text-sm text-amber-700 dark:text-amber-400 border border-amber-500/30 bg-amber-500/5 rounded p-2">
            No teams yet. Create a team-kind department first — each team gets its own memory workspace.
          </div>
        ) : (
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            required
          >
            <option value="">Choose the team this decision belongs to…</option>
            {teams.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}
        {err && (
          <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">{err}</div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={busy || !title.trim() || !departmentId || teams.length === 0}>
            {busy ? 'Saving…' : 'Log decision'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
