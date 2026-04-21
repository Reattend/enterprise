'use client'

// Person detail panel — role, dept memberships, records, decisions, and
// a "Knowledge at risk" banner if the person has left the org but still
// has authored content. This is where transfer-protocol UX will live.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  User as UserIcon,
  Sparkles,
  AlertTriangle,
  Building2,
  FileText,
  Gavel,
  Loader2,
  Shield,
  Briefcase,
  ArrowRightLeft,
  History,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type PersonDetailData = {
  person: {
    id: string; name: string | null; email: string; avatarUrl: string | null;
    role: string; title: string | null; status: string; offboardedAt: string | null;
  }
  departments: Array<{ id?: string; name?: string; kind?: string; role: string }>
  currentRoles: Array<{ title: string; deptId: string | null }>
  authored: Array<{ id: string; title: string; type: string; createdAt: string }>
  decisions: Array<{ id: string; title: string; status: string; decidedAt: string }>
  summary: string
  summaryCached: boolean
  stale: boolean
  lastRecordAt: string | null
  atRisk: boolean
}

export function PersonDetail({ orgId, userId }: { orgId: string; userId: string }) {
  const [data, setData] = useState<PersonDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/wiki/person/${userId}?orgId=${orgId}`)
        if (!res.ok) { if (!cancelled) setData(null); return }
        const d = await res.json()
        if (!cancelled) setData(d)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [orgId, userId])

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading person…
      </div>
    )
  }
  if (!data) return null

  const p = data.person
  const initials = (p.name || p.email).split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="space-y-4">
      {data.atRisk && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium text-red-700 dark:text-red-400">Knowledge at risk</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {p.name || p.email} is offboarded but {data.authored.length} memor{data.authored.length === 1 ? 'y has' : 'ies have'} not
              been transferred to a current role-holder. Anchor them before this memory effectively vanishes.
            </p>
          </div>
          <Link
            href={`/app/admin/${orgId}/transfers`}
            className="text-xs text-red-600 hover:underline shrink-0 inline-flex items-center gap-1"
          >
            <ArrowRightLeft className="h-3 w-3" /> Transfer
          </Link>
        </div>
      )}

      <TransferHistoryPanel orgId={orgId} userId={userId} />


      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-purple-500 to-pink-500" />
        <div className="p-5 flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.name || p.email} />}
            <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold tracking-tight">{p.name || p.email}</h2>
              <Badge variant="secondary" className="text-[10px] capitalize">{p.role}</Badge>
              {p.status === 'offboarded' && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Offboarded {p.offboardedAt ? new Date(p.offboardedAt).toLocaleDateString() : ''}</Badge>
              )}
            </div>
            {p.title && <p className="text-sm text-muted-foreground mt-0.5">{p.title}</p>}
            <p className="text-[11px] text-muted-foreground mt-0.5">{p.email}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-sm font-semibold">What they&apos;ve contributed</h3>
          <Badge variant="outline" className="text-[9px] h-4 px-1 ml-auto text-muted-foreground">
            {data.summaryCached ? 'cached' : 'fresh'}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{data.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Departments
          </h3>
          {data.departments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No department memberships.</p>
          ) : (
            <div className="space-y-1.5">
              {data.departments.map((d, i) => (
                d.id ? (
                  <Link
                    key={d.id + i}
                    href={`/app/wiki?tab=hierarchy&deptId=${d.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors"
                  >
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium flex-1">{d.name}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">{d.role}</Badge>
                  </Link>
                ) : null
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 text-muted-foreground" /> Roles
          </h3>
          {data.currentRoles.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No role assignments.</p>
          ) : (
            <div className="space-y-1.5">
              {data.currentRoles.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium flex-1">{r.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          Memories authored ({data.authored.length})
        </h3>
        {data.authored.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nothing visible yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {data.authored.map((r) => (
              <Link
                key={r.id}
                href={`/app/memories/${r.id}`}
                className="block rounded-md border px-2.5 py-1.5 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[9px] capitalize">{r.type}</Badge>
                  <span className="text-xs font-medium truncate">{r.title}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {data.decisions.length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Gavel className="h-3.5 w-3.5 text-muted-foreground" />
            Decisions ({data.decisions.length})
          </h3>
          <div className="space-y-1.5">
            {data.decisions.map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">{d.status}</Badge>
                <span className="flex-1 truncate">{d.title}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(d.decidedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Separate component so we can load history independent of the main fetch —
// keeps the page snappy for common (empty-history) cases.
function TransferHistoryPanel({ orgId, userId }: { orgId: string; userId: string }) {
  const [events, setEvents] = useState<Array<{
    id: string; reason: string;
    from: { id: string; name: string | null; email: string };
    to: { id: string; name: string | null; email: string } | null;
    role: { id: string; title: string } | null;
    recordsTransferred: number; createdAt: string;
  }>>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/transfers/history?orgId=${orgId}&userId=${userId}`)
        if (res.ok) {
          const d = await res.json()
          setEvents(d.events || [])
        }
      } finally {
        setLoaded(true)
      }
    })()
  }, [orgId, userId])

  if (!loaded || events.length === 0) return null

  return (
    <div className="rounded-2xl border bg-card p-5">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        Transfer history ({events.length})
      </h3>
      <div className="space-y-1.5">
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-2 text-xs p-1.5">
            <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize shrink-0">{e.reason.replace('_', ' ')}</Badge>
            <span className="flex-1 truncate">
              {e.from.name || e.from.email} → {e.to ? (e.to.name || e.to.email) : <span className="italic text-muted-foreground">role only</span>}
              {e.role && <span className="text-muted-foreground"> · {e.role.title}</span>}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {e.recordsTransferred} memor{e.recordsTransferred === 1 ? 'y' : 'ies'} · {new Date(e.createdAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

