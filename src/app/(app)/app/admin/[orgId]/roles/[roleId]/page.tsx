'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Briefcase, ArrowLeft, AlertCircle, UserCheck, UserX, Clock, Database, Gavel,
  ArrowDown, Quote, Archive, Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Role {
  id: string
  organizationId: string
  departmentId: string | null
  title: string
  description: string | null
  seniority: string | null
  seniorityRank: number | null
  status: 'active' | 'vacant' | 'archived'
  createdAt: string
  updatedAt: string
}

interface HistoryEntry {
  id: string
  userId: string
  userName: string
  userEmail: string
  startedAt: string
  endedAt: string | null
  transferNotes: string | null
  isCurrent: boolean
}

interface RoleDetail {
  role: Role
  currentHolder: HistoryEntry | null
  history: HistoryEntry[]
  ownedRecordsCount: number
  decidedCount: number
}

export default function RoleDetailPage({
  params,
}: {
  params: { orgId: string; roleId: string }
}) {
  const { orgId, roleId } = params
  const [data, setData] = useState<RoleDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/roles/${roleId}`)
      if (!res.ok) {
        const b = await res.json().catch(() => ({ error: 'failed' }))
        if (!cancelled) setErr(b.error || 'failed')
        return
      }
      const body = await res.json()
      if (!cancelled) setData(body)
    })()
    return () => { cancelled = true }
  }, [orgId, roleId])

  if (err) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-3">
        <AlertCircle className="h-4 w-4" />
        {err}
      </div>
    )
  }
  if (!data) return <Card className="p-6 text-sm text-muted-foreground">Loading role…</Card>

  const { role, currentHolder, history, ownedRecordsCount, decidedCount } = data

  return (
    <div className="space-y-5 max-w-3xl">
      <Link
        href={`/app/admin/${orgId}/roles`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All roles
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3">
        {role.status === 'archived' ? (
          <Archive className="h-6 w-6 mt-1 text-muted-foreground flex-shrink-0" />
        ) : role.seniorityRank && role.seniorityRank <= 2 ? (
          <Crown className="h-6 w-6 mt-1 text-primary flex-shrink-0" />
        ) : (
          <Briefcase className="h-6 w-6 mt-1 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold break-words">{role.title}</h1>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            {role.seniority && (
              <Badge variant="outline" className="text-[10px] capitalize">{role.seniority.replace('_', ' ')}</Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] capitalize',
                role.status === 'active' && 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
                role.status === 'vacant' && 'border-amber-500/30 text-amber-700 dark:text-amber-400',
                role.status === 'archived' && 'border-muted',
              )}
            >
              {role.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Current holder card */}
      <Card className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Current holder</div>
        {currentHolder ? (
          <div className="flex items-start gap-3">
            <UserCheck className="h-5 w-5 text-emerald-500 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium">{currentHolder.userName || currentHolder.userEmail}</div>
              <div className="text-xs text-muted-foreground">{currentHolder.userEmail}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Holding since {new Date(currentHolder.startedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <UserX className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <div className="font-medium text-amber-700 dark:text-amber-400">Vacant</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                No current holder. Records owned by this role show as orphaned in Self-healing.
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Impact */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Database className="h-3.5 w-3.5" />
            Records owned
          </div>
          <div className="text-2xl font-semibold tabular-nums">{ownedRecordsCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Transfer with the role automatically</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Gavel className="h-3.5 w-3.5" />
            Decisions attributed
          </div>
          <div className="text-2xl font-semibold tabular-nums">{decidedCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Survive role holder changes</div>
        </Card>
      </div>

      {/* Description */}
      {role.description && (
        <Card className="p-5">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Description</div>
          <div className="text-sm whitespace-pre-wrap">{role.description}</div>
        </Card>
      )}

      {/* History timeline */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Transfer history
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every person who&apos;s held this role, with the handover notes they wrote on their way out.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {history.length} {history.length === 1 ? 'tenure' : 'tenures'}
          </div>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No one has held this role yet.</p>
        ) : (
          <ol className="relative border-l-2 border-border ml-2 space-y-5">
            {history.map((h) => (
              <li key={h.id} className="pl-4 relative">
                <div
                  className={cn(
                    'absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-background',
                    h.isCurrent ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                  )}
                />
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-sm">{h.userName || h.userEmail}</span>
                  {h.isCurrent && (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {new Date(h.startedAt).toLocaleDateString()}
                  {' — '}
                  {h.endedAt ? new Date(h.endedAt).toLocaleDateString() : 'Present'}
                  <span className="mx-1">·</span>
                  {h.userEmail}
                </div>
                {h.transferNotes && (
                  <div className="mt-2 p-3 rounded-md bg-muted/60 border border-border">
                    <div className="flex items-start gap-2">
                      <Quote className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="text-sm italic whitespace-pre-wrap leading-relaxed">{h.transferNotes}</div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}

        {history.length > 1 && (
          <div className="mt-5 text-xs text-muted-foreground flex items-center gap-1.5">
            <ArrowDown className="h-3 w-3" />
            Older tenures below. Every handover note is preserved permanently.
          </div>
        )}
      </Card>
    </div>
  )
}
