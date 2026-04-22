'use client'

// Topic detail panel — records tagged with this topic across the org, grouped
// by department. Useful for spotting where a topic crosses silos.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Hash,
  Sparkles,
  AlertTriangle,
  Building2,
  FileText,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type TopicDetailData = {
  topic: string
  summary: string
  summaryCached: boolean
  summaryGeneratedAt: string
  stale: boolean
  lastRecordAt: string | null
  recordCount: number
  records: Array<{ id: string; title: string; summary: string | null; type: string; createdAt: string }>
  departments: Array<{ id: string; name: string; kind: string; recordCount: number }>
}

export function TopicDetail({ orgId, topic }: { orgId: string; topic: string }) {
  const [data, setData] = useState<TopicDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/wiki/topic/${encodeURIComponent(topic)}?orgId=${orgId}`)
        if (!res.ok) { if (!cancelled) setData(null); return }
        const d = await res.json()
        if (!cancelled) setData(d)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [orgId, topic])

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading topic…
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500" />
        <div className="p-5 flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <Hash className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold tracking-tight capitalize">{data.topic}</h2>
              {data.stale && (
                <Badge variant="outline" className="text-[10px] gap-1 border-yellow-500/40 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-2.5 w-2.5" /> Stale
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Appears in {data.recordCount} memor{data.recordCount === 1 ? 'y' : 'ies'} across {data.departments.length} department{data.departments.length === 1 ? '' : 's'}
            </p>
            <div className="mt-2">
              <Link
                href={`/app/memories?tag=${encodeURIComponent(data.topic)}`}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <FileText className="h-3 w-3" /> See all underlying memories →
              </Link>
            </div>
          </div>
        </div>
      </div>

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

      {data.departments.length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            Appears in
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {data.departments.map((d) => (
              <Link
                key={d.id}
                href={`/app/wiki?tab=hierarchy&deptId=${d.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] hover:bg-muted transition-colors"
              >
                {d.name}
                <Badge variant="secondary" className="text-[9px] h-3.5 px-1">{d.recordCount}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          Recent memories
        </h3>
        {data.records.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No memories yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {data.records.map((r) => (
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
                {r.summary && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{r.summary}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
