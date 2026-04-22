'use client'

// Dept detail panel — the right-hand pane when a dept is selected.
// Shows Claude summary, stale badge, recent records, members, decisions.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2,
  Sparkles,
  AlertTriangle,
  User as UserIcon,
  Gavel,
  FileText,
  Loader2,
  Crown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type DeptDetailData = {
  dept: {
    id: string; name: string; slug: string; kind: string;
    description: string | null; parentId: string | null;
    head: { id: string; name: string | null; email: string } | null;
  }
  summary: string
  summaryCached: boolean
  summaryGeneratedAt: string
  stale: boolean
  lastRecordAt: string | null
  recordCount: number
  records: Array<{ id: string; title: string; summary: string | null; type: string; createdAt: string }>
  members: Array<{ userId: string; role: string; name: string | null; email: string; avatarUrl: string | null }>
  decisions: Array<{ id: string; title: string; status: string; createdAt: string }>
}

export function DeptDetail({ deptId }: { deptId: string }) {
  const [data, setData] = useState<DeptDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/wiki/dept/${deptId}`)
        if (!res.ok) { if (!cancelled) setData(null); return }
        const d = await res.json()
        if (!cancelled) setData(d)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [deptId])

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading department…
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary/60 to-primary" />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold tracking-tight">{data.dept.name}</h2>
                <Badge variant="secondary" className="text-[10px] capitalize">{data.dept.kind}</Badge>
                {data.stale && data.recordCount > 0 && (
                  <Badge variant="outline" className="text-[10px] gap-1 border-yellow-500/40 text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-2.5 w-2.5" /> Stale · no activity &gt; 90d
                  </Badge>
                )}
              </div>
              {data.dept.description && (
                <p className="text-sm text-muted-foreground mt-1.5">{data.dept.description}</p>
              )}
              {data.dept.head && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Crown className="h-3 w-3" /> Headed by {data.dept.head.name || data.dept.head.email}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI summary */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-sm font-semibold">Summary</h3>
          <Badge variant="outline" className="text-[9px] h-4 px-1 ml-auto text-muted-foreground">
            {data.summaryCached ? 'cached' : 'fresh'}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{data.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent memories */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Recent memories ({data.recordCount})
            </h3>
            {data.recordCount > 0 && (
              <Link
                href={`/app/memories?dept=${encodeURIComponent(data.dept.id)}`}
                className="text-[11px] text-primary hover:underline"
              >
                See all →
              </Link>
            )}
          </div>
          {data.records.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No visible memories.</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {data.records.map((r) => (
                <Link
                  key={r.id}
                  href={`/app/memories/${r.id}`}
                  className="block rounded-md border px-2.5 py-1.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[9px] capitalize">{r.type}</Badge>
                    <span className="text-xs font-medium truncate">{r.title}</span>
                  </div>
                  {r.summary && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{r.summary}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Members */}
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
            Members ({data.members.length})
          </h3>
          {data.members.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No members listed.</p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {data.members.map((m) => {
                const initials = (m.name || m.email).split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <Link
                    key={m.userId}
                    href={`/app/wiki?tab=people&person=${m.userId}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors"
                  >
                    <Avatar className="h-6 w-6">
                      {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.name || m.email} />}
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate flex-1">{m.name || m.email}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">{m.role}</Badge>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Decisions */}
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
                <span className="text-[10px] text-muted-foreground">
                  {new Date(d.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
