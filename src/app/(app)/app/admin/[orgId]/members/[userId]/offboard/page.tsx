'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  UserX, ArrowLeft, AlertCircle, Briefcase, Gavel, CheckCircle2, ChevronRight,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoleHeld {
  assignmentId: string
  roleId: string
  title: string
  departmentId: string | null
  seniority: string | null
  startedAt: string
  ownedRecordsCount: number
}

interface DecisionSummary {
  id: string
  title: string
  status: string
  decidedAt: string
}

interface DeptMembership {
  departmentId: string
  role: string
}

interface Impact {
  user: { id: string; name: string; email: string }
  membership: { role: string; status: string; title: string | null; offboardedAt: string | null }
  rolesHeld: RoleHeld[]
  decisionsCount: number
  recentDecisions: DecisionSummary[]
  departmentMemberships: DeptMembership[]
}

interface Member {
  userId: string
  name: string
  email: string
  status: 'active' | 'suspended' | 'offboarded'
}

type Step = 'review' | 'transfer' | 'confirm'

interface TransferDraft {
  successorUserId?: string
  transferNotes?: string
}

export default function OffboardWizardPage({
  params,
}: {
  params: { orgId: string; userId: string }
}) {
  const { orgId, userId } = params
  const router = useRouter()
  const [impact, setImpact] = useState<Impact | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('review')
  const [drafts, setDrafts] = useState<Record<string, TransferDraft>>({})
  const [globalNote, setGlobalNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    setErr(null)
    const [iRes, mRes] = await Promise.all([
      fetch(`/api/enterprise/organizations/${orgId}/members/${userId}/impact`),
      fetch(`/api/enterprise/organizations/${orgId}/members`),
    ])
    if (!iRes.ok) {
      setErr((await iRes.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      return
    }
    setImpact(await iRes.json())
    if (mRes.ok) setMembers((await mRes.json()).members)
  }

  useEffect(() => {
    load()
  }, [orgId, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    if (!impact) return
    setBusy(true)
    setErr(null)
    try {
      const transfers = impact.rolesHeld.map((r) => ({
        roleId: r.roleId,
        successorUserId: drafts[r.roleId]?.successorUserId || undefined,
        transferNotes: drafts[r.roleId]?.transferNotes?.trim() || undefined,
      }))
      const res = await fetch(`/api/enterprise/organizations/${orgId}/members/${userId}/offboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfers, globalNote: globalNote.trim() || undefined }),
      })
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      router.push(`/app/admin/${orgId}/members`)
    } finally {
      setBusy(false)
    }
  }

  if (err && !impact) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-3">
        <AlertCircle className="h-4 w-4" />
        {err}
      </div>
    )
  }
  if (!impact) return <Card className="p-6 text-sm text-muted-foreground">Loading impact analysis…</Card>

  if (impact.membership.status === 'offboarded') {
    return (
      <div className="space-y-4 max-w-2xl">
        <Link href={`/app/admin/${orgId}/members`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Members
        </Link>
        <Card className="p-6 text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <h2 className="font-medium">{impact.user.name || impact.user.email} is already offboarded</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {impact.membership.offboardedAt && `Offboarded on ${new Date(impact.membership.offboardedAt).toLocaleString()}`}
          </p>
        </Card>
      </div>
    )
  }

  const activeMembers = members.filter((m) => m.status === 'active' && m.userId !== userId)
  const transferredCount = impact.rolesHeld.filter((r) => drafts[r.roleId]?.successorUserId).length
  const vacatedCount = impact.rolesHeld.length - transferredCount

  return (
    <div className="space-y-5 max-w-3xl">
      <Link
        href={`/app/admin/${orgId}/members`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Members
      </Link>

      <div className="flex items-center gap-3">
        <UserX className="h-6 w-6 text-rose-500" />
        <div>
          <h1 className="text-xl font-semibold">Offboard {impact.user.name || impact.user.email}</h1>
          <p className="text-sm text-muted-foreground">
            Knowledge stays. Transfer their roles — their records, decisions, and context move with the role.
          </p>
        </div>
      </div>

      <StepIndicator step={step} />

      {step === 'review' && (
        <ReviewStep
          impact={impact}
          onNext={() => setStep(impact.rolesHeld.length > 0 ? 'transfer' : 'confirm')}
        />
      )}

      {step === 'transfer' && (
        <TransferStep
          impact={impact}
          members={activeMembers}
          drafts={drafts}
          setDrafts={setDrafts}
          onBack={() => setStep('review')}
          onNext={() => setStep('confirm')}
        />
      )}

      {step === 'confirm' && (
        <ConfirmStep
          impact={impact}
          drafts={drafts}
          members={activeMembers}
          globalNote={globalNote}
          setGlobalNote={setGlobalNote}
          transferredCount={transferredCount}
          vacatedCount={vacatedCount}
          err={err}
          busy={busy}
          onBack={() => setStep(impact.rolesHeld.length > 0 ? 'transfer' : 'review')}
          onSubmit={submit}
        />
      )}
    </div>
  )
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'review', label: 'Review impact' },
    { key: 'transfer', label: 'Assign successors' },
    { key: 'confirm', label: 'Confirm' },
  ]
  const idx = steps.findIndex((s) => s.key === step)
  return (
    <div className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <span
            className={cn(
              'px-2.5 py-1 rounded-full',
              i < idx && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
              i === idx && 'bg-primary/10 text-foreground font-medium',
              i > idx && 'text-muted-foreground',
            )}
          >
            {i + 1}. {s.label}
          </span>
          {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </div>
      ))}
    </div>
  )
}

function ReviewStep({ impact, onNext }: { impact: Impact; onNext: () => void }) {
  const reversedDecisions = impact.recentDecisions.filter((d) => d.status === 'reversed').length
  return (
    <>
      <Card className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Impact summary</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-2xl font-semibold">{impact.rolesHeld.length}</div>
            <div className="text-xs text-muted-foreground">Role{impact.rolesHeld.length === 1 ? '' : 's'} currently held</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{impact.decisionsCount}</div>
            <div className="text-xs text-muted-foreground">Decision{impact.decisionsCount === 1 ? '' : 's'} they authored</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{impact.departmentMemberships.length}</div>
            <div className="text-xs text-muted-foreground">Department membership{impact.departmentMemberships.length === 1 ? '' : 's'}</div>
          </div>
        </div>
      </Card>

      {impact.rolesHeld.length === 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">No roles held</div>
              <div className="text-muted-foreground">This user has no employee roles to transfer. Their decisions and activity records are preserved — only their org membership is being ended.</div>
            </div>
          </div>
        </Card>
      )}

      {impact.rolesHeld.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="p-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            Roles to transfer
          </div>
          <ul className="divide-y divide-border">
            {impact.rolesHeld.map((r) => (
              <li key={r.roleId} className="p-3 flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Held since {new Date(r.startedAt).toLocaleDateString()}
                    {r.ownedRecordsCount > 0 && ` · ${r.ownedRecordsCount} record${r.ownedRecordsCount === 1 ? '' : 's'} owned`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {impact.recentDecisions.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="p-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Recent decisions ({impact.decisionsCount} total{reversedDecisions > 0 ? `, ${reversedDecisions} reversed` : ''})</span>
          </div>
          <ul className="divide-y divide-border">
            {impact.recentDecisions.slice(0, 5).map((d) => (
              <li key={d.id} className="p-3 flex items-center gap-3">
                <Gavel className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{d.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(d.decidedAt).toLocaleDateString()} · {d.status}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext}>Continue</Button>
      </div>
    </>
  )
}

function TransferStep({
  impact,
  members,
  drafts,
  setDrafts,
  onBack,
  onNext,
}: {
  impact: Impact
  members: Member[]
  drafts: Record<string, TransferDraft>
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, TransferDraft>>>
  onBack: () => void
  onNext: () => void
}) {
  function updateDraft(roleId: string, patch: Partial<TransferDraft>) {
    setDrafts((prev) => ({ ...prev, [roleId]: { ...prev[roleId], ...patch } }))
  }
  return (
    <>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          For each role, name a successor or leave it vacant. Write handover notes — they survive the transition and show up on the successor&apos;s role page.
          <br />
          <span className="text-amber-600 dark:text-amber-400">Vacant roles surface as orphaned findings in Self-healing until a successor is named.</span>
        </p>
      </Card>

      <div className="space-y-3">
        {impact.rolesHeld.map((r) => {
          const draft = drafts[r.roleId] ?? {}
          return (
            <Card key={r.roleId} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <div className="font-medium text-sm">{r.title}</div>
                {r.ownedRecordsCount > 0 && (
                  <span className="text-xs text-muted-foreground">· {r.ownedRecordsCount} record{r.ownedRecordsCount === 1 ? '' : 's'}</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-2">
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={draft.successorUserId || ''}
                  onChange={(e) => updateDraft(r.roleId, { successorUserId: e.target.value || undefined })}
                >
                  <option value="">Leave vacant</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.name || m.email}</option>
                  ))}
                </select>
              </div>
              <Textarea
                placeholder="Handover notes — what the successor needs to know to pick this up"
                value={draft.transferNotes || ''}
                onChange={(e) => updateDraft(r.roleId, { transferNotes: e.target.value })}
                rows={2}
              />
            </Card>
          )
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Continue</Button>
      </div>
    </>
  )
}

function ConfirmStep({
  impact,
  drafts,
  members,
  globalNote,
  setGlobalNote,
  transferredCount,
  vacatedCount,
  err,
  busy,
  onBack,
  onSubmit,
}: {
  impact: Impact
  drafts: Record<string, TransferDraft>
  members: Member[]
  globalNote: string
  setGlobalNote: (s: string) => void
  transferredCount: number
  vacatedCount: number
  err: string | null
  busy: boolean
  onBack: () => void
  onSubmit: () => void
}) {
  const memberById = new Map(members.map((m) => [m.userId, m]))
  return (
    <>
      <Card className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Summary</div>
        <ul className="space-y-1 text-sm">
          <li>Mark <span className="font-medium">{impact.user.name || impact.user.email}</span> as offboarded</li>
          <li>{transferredCount} role{transferredCount === 1 ? '' : 's'} will be transferred</li>
          <li>{vacatedCount} role{vacatedCount === 1 ? '' : 's'} will be vacant until filled</li>
          <li>{impact.decisionsCount} decision{impact.decisionsCount === 1 ? '' : 's'} remain attributed to them (historical record)</li>
        </ul>
      </Card>

      {impact.rolesHeld.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="p-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            Transfers
          </div>
          <ul className="divide-y divide-border">
            {impact.rolesHeld.map((r) => {
              const draft = drafts[r.roleId] ?? {}
              const successor = draft.successorUserId ? memberById.get(draft.successorUserId) : null
              return (
                <li key={r.roleId} className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.title}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    {successor ? (
                      <span className="text-sm">{successor.name || successor.email}</span>
                    ) : (
                      <span className="text-sm text-amber-600 dark:text-amber-400">Vacant</span>
                    )}
                  </div>
                  {draft.transferNotes && (
                    <div className="text-xs text-muted-foreground mt-1 pl-0.5 italic">&ldquo;{draft.transferNotes}&rdquo;</div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Card className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Offboarding note (optional, audit log)</div>
        <Textarea
          placeholder="e.g. Resignation effective today. Final day: Friday. Contact successor for open threads."
          value={globalNote}
          onChange={(e) => setGlobalNote(e.target.value)}
          rows={2}
        />
      </Card>

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={busy}>Back</Button>
        <Button onClick={onSubmit} disabled={busy}>
          <UserX className="h-4 w-4 mr-1.5" />
          {busy ? 'Offboarding…' : 'Confirm offboarding'}
        </Button>
      </div>
    </>
  )
}
