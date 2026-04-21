'use client'

// Knowledge Transfer Protocol dashboard.
//
// This is the visible manifestation of "knowledge stays with the role, not
// the person" — our core amnesia-cure differentiator. The page shows every
// user in the org whose authored records have no role owner, so when they
// leave (or change roles), nothing vanishes.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRightLeft,
  Users,
  Briefcase,
  Loader2,
  ShieldCheck,
  Check,
  X,
  UserMinus,
  UserCheck,
  ArrowRight,
  History,
  Gavel,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

type AtRiskPerson = {
  userId: string
  name: string | null
  email: string
  status: string
  offboardedAt: string | null
  authoredRecords: number
  decisions: number
  atRiskRecords: number
  roleOwnedRecords: number
  currentRoles: Array<{ roleId: string; title: string; departmentId: string | null }>
}

type Totals = { atRiskUsers: number; atRiskRecords: number; offboardedWithRisk: number }

type OrgMember = { userId: string; name: string | null; email: string; status: string }

type TransferEvent = {
  id: string
  reason: string
  from: { id: string; name: string | null; email: string }
  to: { id: string; name: string | null; email: string } | null
  role: { id: string; title: string } | null
  recordsTransferred: number
  decisionsTransferred: number
  transferNotes: string | null
  createdAt: string
}

export default function TransfersPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [people, setPeople] = useState<AtRiskPerson[] | null>(null)
  const [totals, setTotals] = useState<Totals | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [history, setHistory] = useState<TransferEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [wizardFor, setWizardFor] = useState<AtRiskPerson | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [atRiskRes, membersRes, historyRes] = await Promise.all([
        fetch(`/api/enterprise/transfers/at-risk?orgId=${orgId}`),
        fetch(`/api/enterprise/organizations/${orgId}/members`),
        fetch(`/api/enterprise/transfers/history?orgId=${orgId}`),
      ])
      if (atRiskRes.ok) {
        const d = await atRiskRes.json()
        setPeople(d.people || [])
        setTotals(d.totals || null)
      } else {
        setPeople([])
      }
      if (membersRes.ok) {
        const d = await membersRes.json()
        setMembers(d.members || [])
      }
      if (historyRes.ok) {
        const d = await historyRes.json()
        setHistory(d.events || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [orgId])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-5xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" /> Knowledge Transfer
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            When people leave or change roles, their records transfer to the role, not the person.
            This page shows everyone whose authored knowledge hasn't been anchored to a role yet.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/app/admin/${orgId}`}>Admin</Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={AlertTriangle}
          color="text-yellow-600 bg-yellow-500/10"
          label="At-risk people"
          value={loading ? '—' : String(totals?.atRiskUsers ?? 0)}
          subtext="have unanchored records"
        />
        <SummaryCard
          icon={FileText}
          color="text-red-600 bg-red-500/10"
          label="At-risk records"
          value={loading ? '—' : String(totals?.atRiskRecords ?? 0)}
          subtext="no role owner assigned"
        />
        <SummaryCard
          icon={UserMinus}
          color="text-destructive bg-destructive/10"
          label="Already offboarded"
          value={loading ? '—' : String(totals?.offboardedWithRisk ?? 0)}
          subtext="with unclaimed memory"
        />
      </div>

      {/* At-risk list */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center gap-2 bg-muted/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <div className="text-sm font-semibold">People whose knowledge needs anchoring</div>
        </div>
        {loading ? (
          <div className="p-8 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !people || people.length === 0 ? (
          <div className="p-10 text-center">
            <ShieldCheck className="h-8 w-8 text-emerald-600 mx-auto mb-3" />
            <div className="text-sm font-medium">Everyone's knowledge is anchored</div>
            <p className="text-xs text-muted-foreground mt-1">No one has unassigned records right now.</p>
          </div>
        ) : (
          <div className="divide-y">
            {people.map((p) => (
              <AtRiskRow key={p.userId} person={p} onTransfer={() => setWizardFor(p)} />
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-2 bg-muted/20">
            <History className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-semibold">Transfer history</div>
            <Badge variant="outline" className="text-[10px] ml-auto">{history.length}</Badge>
          </div>
          <div className="divide-y">
            {history.map((e) => (
              <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize shrink-0">{e.reason.replace('_', ' ')}</Badge>
                <div className="flex-1 min-w-0 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium">{e.from.name || e.from.email}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">
                      {e.to ? (e.to.name || e.to.email) : <span className="text-muted-foreground italic">role only</span>}
                    </span>
                    {e.role && <span className="text-muted-foreground">· {e.role.title}</span>}
                  </div>
                  {e.transferNotes && <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{e.transferNotes}</div>}
                </div>
                <div className="text-[10px] text-muted-foreground text-right shrink-0">
                  <div>{e.recordsTransferred} memor{e.recordsTransferred === 1 ? 'y' : 'ies'}</div>
                  <div>{new Date(e.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <TransferWizard
        open={!!wizardFor}
        onOpenChange={(v) => !v && setWizardFor(null)}
        person={wizardFor}
        orgId={orgId}
        members={members}
        onDone={() => { setWizardFor(null); load() }}
      />
    </motion.div>
  )
}

function SummaryCard({ icon: Icon, color, label, value, subtext }: { icon: any; color: string; label: string; value: string; subtext: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-[10px] text-muted-foreground">{subtext}</div>
      </div>
    </div>
  )
}

function AtRiskRow({ person, onTransfer }: { person: AtRiskPerson; onTransfer: () => void }) {
  const p = person
  const initials = (p.name || p.email).split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-medium truncate">{p.name || p.email}</div>
          {p.status === 'offboarded' && (
            <Badge variant="outline" className="text-[9px] h-4 px-1 gap-1 text-destructive">
              <UserMinus className="h-2 w-2" /> Offboarded {p.offboardedAt ? new Date(p.offboardedAt).toLocaleDateString() : ''}
            </Badge>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
          <span><strong className="text-yellow-600">{p.atRiskRecords}</strong> unanchored</span>
          <span>{p.authoredRecords} authored</span>
          <span>{p.decisions} decisions</span>
          {p.currentRoles.length > 0 && (
            <span className="inline-flex items-center gap-1"><Briefcase className="h-2.5 w-2.5" /> {p.currentRoles.map((r) => r.title).join(', ')}</span>
          )}
        </div>
      </div>
      <Button size="sm" onClick={onTransfer} className="shrink-0">
        <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Transfer
      </Button>
    </div>
  )
}

function TransferWizard({
  open, onOpenChange, person, orgId, members, onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  person: AtRiskPerson | null
  orgId: string
  members: OrgMember[]
  onDone: () => void
}) {
  const [reason, setReason] = useState<'offboard' | 'role_change' | 'temporary' | 'correction'>('offboard')
  const [toUserId, setToUserId] = useState<string>('')
  const [roleId, setRoleId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [markOffboarded, setMarkOffboarded] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!person) return
    setReason(person.status === 'offboarded' ? 'correction' : 'offboard')
    setMarkOffboarded(person.status !== 'offboarded')
    setToUserId('')
    setRoleId(person.currentRoles[0]?.roleId || '')
    setNotes('')
  }, [person])

  const submit = async () => {
    if (!person) return
    if (!toUserId && !roleId) {
      toast.error('Pick a successor and a role — at least one of them')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/enterprise/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          fromUserId: person.userId,
          toUserId: toUserId || null,
          roleId: roleId || null,
          reason,
          transferNotes: notes || null,
          markOffboarded,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Transfer failed')
        return
      }
      const data = await res.json()
      toast.success(`Transferred ${data.recordsTransferred} memories · ${data.decisionsTouched} decisions counted`)
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" /> Transfer knowledge
          </DialogTitle>
          <DialogDescription className="text-xs">
            Anchor this person's records to a role. Future successors in that role inherit automatically.
          </DialogDescription>
        </DialogHeader>

        {person && (
          <div className="space-y-4">
            {/* Impact preview */}
            <div className="rounded-xl border bg-muted/20 p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                Impact preview
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div className="flex items-center gap-1"><FileText className="h-3 w-3" /> {person.atRiskRecords} records will anchor</div>
                <div className="flex items-center gap-1"><Gavel className="h-3 w-3" /> {person.decisions} decisions preserved (history stays)</div>
              </div>
              <div className="text-muted-foreground">
                <span className="text-foreground font-medium">{person.name || person.email}</span> → new role holder
              </div>
              {person.decisions > 0 && (
                <a
                  href={`/api/enterprise/organizations/${orgId}/decisions/briefing?userId=${person.userId}&format=markdown`}
                  download
                  className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                >
                  ↓ Download their decisions briefing (handover doc)
                </a>
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Reason</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as any)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="offboard" className="text-sm">Offboarding (leaving the org)</SelectItem>
                  <SelectItem value="role_change" className="text-sm">Role change (internal move)</SelectItem>
                  <SelectItem value="temporary" className="text-sm">Temporary (leave of absence)</SelectItem>
                  <SelectItem value="correction" className="text-sm">Correction (fixing a past miss)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {person.currentRoles.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Role (records will be anchored here)</Label>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pick a role" /></SelectTrigger>
                  <SelectContent>
                    {person.currentRoles.map((r) => (
                      <SelectItem key={r.roleId} value={r.roleId} className="text-sm">{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Records anchor to the role, not the successor. Next role-holder inherits automatically.</p>
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Successor (optional)</Label>
              <Select value={toUserId || '__none__'} onValueChange={(v) => setToUserId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="No named successor yet" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-sm text-muted-foreground">No successor yet — park at role</SelectItem>
                  {members
                    .filter((m) => m.userId !== person.userId && m.status === 'active')
                    .map((m) => (
                      <SelectItem key={m.userId} value={m.userId} className="text-sm">{m.name || m.email}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Handover notes (optional)</Label>
              <Textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Context the successor should know — open threads, pending decisions, key contacts."
                rows={3} className="text-sm"
              />
            </div>

            {person.status !== 'offboarded' && (
              <div className="flex items-center gap-2 rounded-lg border p-3 bg-muted/20">
                <input
                  id="mark-off"
                  type="checkbox"
                  checked={markOffboarded}
                  onChange={(e) => setMarkOffboarded(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                <Label htmlFor="mark-off" className="text-xs cursor-pointer">
                  Also mark <strong>{person.name || person.email}</strong> as offboarded
                </Label>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserCheck className="h-3.5 w-3.5 mr-1" />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
