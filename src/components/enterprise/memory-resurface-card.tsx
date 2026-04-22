'use client'

// "On this day N years ago" — the Google Photos / Facebook Memories moment
// for org knowledge. Shows up silently when the org is old enough to have
// records on this calendar day N years back. Returns nothing and renders
// nothing on young orgs — never a "we got nothing to show you" empty state.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { History, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Group = {
  yearsAgo: number
  label: string
  records: Array<{ id: string; title: string; type: string; summary: string | null; createdAt: string }>
}

export function MemoryResurfaceCard({ orgId }: { orgId: string }) {
  const [groups, setGroups] = useState<Group[] | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/resurface?orgId=${orgId}`)
        if (!res.ok) return
        const d = await res.json()
        if (!cancelled) setGroups(d.groups || [])
      } catch { /* silent */ }
    })()
    return () => { cancelled = true }
  }, [orgId])

  if (!groups || groups.length === 0) return null

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-amber-500/5 via-transparent to-transparent overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/10 flex items-center gap-2">
        <History className="h-3.5 w-3.5 text-amber-600" />
        <div className="text-sm font-semibold">On this day</div>
        <span className="text-[10px] text-muted-foreground ml-auto">Do we still believe this?</span>
      </div>
      <div className="divide-y">
        {groups.map((g) => (
          <div key={g.yearsAgo} className="px-5 py-3">
            <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-500 font-semibold mb-1.5">
              {g.label}
            </div>
            <div className="space-y-1">
              {g.records.map((r) => (
                <Link
                  key={r.id}
                  href={`/app/memories/${r.id}`}
                  className="group flex items-center gap-2 text-xs hover:text-primary transition-colors"
                >
                  <span className={cn('rounded px-1 py-0.5 text-[9px] uppercase tracking-wide shrink-0', typeBadge(r.type))}>
                    {r.type}
                  </span>
                  <span className="truncate flex-1">{r.title}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function typeBadge(type: string): string {
  const map: Record<string, string> = {
    decision: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
    insight: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    meeting: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    note: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
  }
  return map[type] || 'bg-muted text-muted-foreground'
}
