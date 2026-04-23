'use client'

// Trending card — "Hot in the org this week."
//
// Home surface. Lists the top 5 most-viewed records in the last 7 days that
// the viewer can see. Hidden entirely when there's nothing yet (new orgs).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, FileText, Eye } from 'lucide-react'

interface Item {
  id: string
  title: string
  type: string
  summary: string | null
  viewCount: number
}

export function TrendingCard({ orgId }: { orgId: string }) {
  const [items, setItems] = useState<Item[] | null>(null)

  useEffect(() => {
    if (!orgId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/trending?orgId=${orgId}&days=7&limit=5`)
        if (!res.ok) return
        const d = await res.json()
        if (!cancelled) setItems(d.items || [])
      } catch { /* silent */ }
    })()
    return () => { cancelled = true }
  }, [orgId])

  if (!items || items.length === 0) return null

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-orange-500/5 to-transparent overflow-hidden">
      <div className="px-4 py-2.5 border-b bg-muted/20 flex items-center gap-2">
        <Flame className="h-3.5 w-3.5 text-orange-500" />
        <div className="text-sm font-semibold">Trending</div>
        <span className="text-[10px] text-muted-foreground">· most-viewed this week</span>
      </div>
      <ul className="divide-y">
        {items.map((it, i) => (
          <li key={it.id}>
            <Link
              href={`/app/memories/${it.id}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors"
            >
              <span className="text-[10px] font-bold text-orange-500 w-4 tabular-nums">{i + 1}</span>
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{it.title}</div>
                {it.summary && <div className="text-[11px] text-muted-foreground truncate">{it.summary.slice(0, 90)}</div>}
              </div>
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 shrink-0">
                <Eye className="h-3 w-3" /> {it.viewCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
