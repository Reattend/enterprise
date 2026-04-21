'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Briefcase, Plus, X, AlertCircle, UserCheck, UserX, Crown, Archive,
  ArrowRightLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Seniority = string // free-text per-org taxonomy
type Status = 'active' | 'vacant' | 'archived'

interface EnrichedRole {
  id: string
  organizationId: string
  departmentId: string | null
  title: string
  description: string | null
  seniority: Seniority | null
  seniorityRank: number | null
  status: Status
  currentHolder: { userId: string; name: string; email: string; startedAt: string } | null
  isVacant: boolean
  ownedRecordsCount: number
  decidedCount: number
}

interface TaxonomySeniority {
  label: string
  rankOrder: number
  description: string | null
}

interface Dept {
  id: string
  name: string
  kind: string
}

interface Member {
  userId: string
  name: string
  email: string
  status: 'active' | 'suspended' | 'offboarded'
}

// Legacy pretty-labels for default taxonomy; custom taxonomies pass through
// their free-text labels untouched.
const SENIORITY_LABEL: Record<string, string> = {
  ic: 'IC',
  lead: 'Lead',
  manager: 'Manager',
  director: 'Director',
  vp: 'VP',
  c_level: 'C-Level',
}
function prettySeniority(s: string | null): string {
  if (!s) return ''
  return SENIORITY_LABEL[s] || s
}

export default function RolesPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [roles, setRoles] = useState<EnrichedRole[] | null>(null)
  const [departments, setDepartments] = useState<Dept[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [seniorityOptions, setSeniorityOptions] = useState<TaxonomySeniority[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null) // roleId

  async function load() {
    setErr(null)
    const [rRes, dRes, mRes, tRes] = await Promise.all([
      fetch(`/api/enterprise/organizations/${orgId}/roles`),
      fetch(`/api/enterprise/organizations/${orgId}/departments`),
      fetch(`/api/enterprise/organizations/${orgId}/members`),
      fetch(`/api/enterprise/organizations/${orgId}/taxonomy`),
    ])
    if (!rRes.ok) {
      setErr((await rRes.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      return
    }
    setRoles((await rRes.json()).roles)
    if (dRes.ok) setDepartments((await dRes.json()).departments)
    if (mRes.ok) setMembers((await mRes.json()).members)
    if (tRes.ok) setSeniorityOptions((await tRes.json()).seniorityRanks)
  }

  useEffect(() => {
    load()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const deptNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of departments) m.set(d.id, d.name)
    return m
  }, [departments])

  const vacantCount = roles?.filter((r) => r.isVacant && r.status !== 'archived').length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-3xl tracking-tight flex items-center gap-3">
            <Briefcase className="h-6 w-6 text-primary" />
            Roles
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Knowledge stays with the role, not the person. When someone leaves, their
            records, decisions, and context transfer to whoever takes the role next.
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          {showCreate ? 'Cancel' : 'New role'}
        </Button>
      </div>

      {vacantCount > 0 && (
        <Card className="p-3 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 text-sm">
            <UserX className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="font-medium">{vacantCount} vacant role{vacantCount === 1 ? '' : 's'}</span>
            <span className="text-muted-foreground">— records owned by these roles show as orphaned in Self-healing.</span>
          </div>
        </Card>
      )}

      {showCreate && (
        <CreateRoleForm
          orgId={orgId}
          departments={departments}
          members={members.filter((m) => m.status === 'active')}
          seniorityOptions={seniorityOptions}
          onCreated={async () => { setShowCreate(false); await load() }}
        />
      )}

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {roles === null ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">
            No roles yet. Create one — e.g. &quot;VP Engineering&quot; or &quot;Finance Controller&quot;.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {roles.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex items-start gap-3">
                  <RoleStatusIcon role={r} />
                  <Link href={`/app/admin/${orgId}/roles/${r.id}`} className="flex-1 min-w-0 group">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm group-hover:text-primary transition-colors">{r.title}</span>
                      {r.seniority && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {prettySeniority(r.seniority)}
                        </span>
                      )}
                      {r.departmentId && deptNameById.get(r.departmentId) && (
                        <span className="text-xs text-muted-foreground">· {deptNameById.get(r.departmentId)}</span>
                      )}
                      {r.status === 'archived' && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">archived</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.currentHolder ? (
                        <>Held by <span className="text-foreground">{r.currentHolder.name || r.currentHolder.email}</span> since {new Date(r.currentHolder.startedAt).toLocaleDateString()}</>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Vacant — no current holder</span>
                      )}
                      {(r.ownedRecordsCount > 0 || r.decidedCount > 0) && (
                        <>
                          {' · '}
                          {r.ownedRecordsCount > 0 && <>{r.ownedRecordsCount} record{r.ownedRecordsCount === 1 ? '' : 's'}</>}
                          {r.ownedRecordsCount > 0 && r.decidedCount > 0 && ' · '}
                          {r.decidedCount > 0 && <>{r.decidedCount} decision{r.decidedCount === 1 ? '' : 's'}</>}
                        </>
                      )}
                    </div>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssigning(assigning === r.id ? null : r.id)}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                    {r.currentHolder ? 'Transfer' : 'Assign'}
                  </Button>
                </div>

                {assigning === r.id && (
                  <AssignForm
                    orgId={orgId}
                    role={r}
                    members={members.filter((m) => m.status === 'active')}
                    onDone={async () => { setAssigning(null); await load() }}
                    onCancel={() => setAssigning(null)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function RoleStatusIcon({ role }: { role: EnrichedRole }) {
  if (role.status === 'archived') return <Archive className="h-4 w-4 mt-0.5 text-muted-foreground" />
  if (role.isVacant) return <UserX className="h-4 w-4 mt-0.5 text-amber-500" />
  // Top-rank (rank 1-2) gets a crown; everyone else is a checkmark
  if (role.seniorityRank !== null && role.seniorityRank <= 2) return <Crown className="h-4 w-4 mt-0.5 text-primary" />
  if (role.seniority === 'c_level' || role.seniority === 'vp') return <Crown className="h-4 w-4 mt-0.5 text-primary" />
  return <UserCheck className="h-4 w-4 mt-0.5 text-emerald-500" />
}

function CreateRoleForm({
  orgId,
  departments,
  members,
  seniorityOptions,
  onCreated,
}: {
  orgId: string
  departments: Dept[]
  members: Member[]
  seniorityOptions: TaxonomySeniority[]
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [seniority, setSeniority] = useState<string>('')
  const [departmentId, setDepartmentId] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          seniority: seniority || undefined,
          departmentId: departmentId || undefined,
          assignToUserId: assignTo || undefined,
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
    <Card className="p-4">
      <form onSubmit={submit} className="space-y-3">
        <Input
          placeholder="Title (e.g. VP Engineering, Finance Controller)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Textarea
          placeholder="Description (optional — what this role owns, what decisions they make)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={seniority}
            onChange={(e) => setSeniority(e.target.value)}
          >
            <option value="">Seniority (optional)</option>
            {seniorityOptions.map((s) => (
              <option key={s.label} value={s.label}>{prettySeniority(s.label)}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">No department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.kind})</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={assignTo}
            onChange={(e) => setAssignTo(e.target.value)}
          >
            <option value="">Create vacant</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>{m.name || m.email}</option>
            ))}
          </select>
        </div>
        {err && <div className="text-sm text-destructive">{err}</div>}
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || !title.trim()}>
            {busy ? 'Creating…' : 'Create role'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function AssignForm({
  orgId,
  role,
  members,
  onDone,
  onCancel,
}: {
  orgId: string
  role: EnrichedRole
  members: Member[]
  onDone: () => void
  onCancel: () => void
}) {
  const [userId, setUserId] = useState('')
  const [transferNotes, setTransferNotes] = useState('')
  const [vacate, setVacate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/roles/${role.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: vacate ? undefined : userId || undefined,
          transferNotes: transferNotes.trim() || undefined,
          vacate,
        }),
      })
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      onDone()
    } finally {
      setBusy(false)
    }
  }

  const eligibleMembers = role.currentHolder
    ? members.filter((m) => m.userId !== role.currentHolder!.userId)
    : members

  return (
    <form onSubmit={submit} className="mt-3 ml-7 space-y-2 border-l-2 border-primary/30 pl-3">
      {role.currentHolder && (
        <Textarea
          placeholder={`Handover notes from ${role.currentHolder.name || role.currentHolder.email} — what the successor needs to know`}
          value={transferNotes}
          onChange={(e) => setTransferNotes(e.target.value)}
          rows={2}
        />
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm flex-1 min-w-[200px]"
          value={vacate ? '' : userId}
          onChange={(e) => { setUserId(e.target.value); setVacate(false) }}
          disabled={vacate}
        >
          <option value="">{role.currentHolder ? 'Choose successor…' : 'Choose member…'}</option>
          {eligibleMembers.map((m) => (
            <option key={m.userId} value={m.userId}>{m.name || m.email}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={vacate} onChange={(e) => setVacate(e.target.checked)} />
          Leave vacant
        </label>
        <Button type="submit" size="sm" disabled={busy || (!vacate && !userId)}>
          {busy ? 'Saving…' : vacate ? 'Vacate' : 'Confirm'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
      {err && <div className="text-sm text-destructive">{err}</div>}
    </form>
  )
}
