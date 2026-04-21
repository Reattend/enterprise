'use client'

// Topics tab — ranked list of tags/entities appearing in ≥2 visible records.

import { useEffect, useMemo, useState } from 'react'
import { Hash, Loader2, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Topic = {
  slug: string
  label: string
  recordCount: number
  lastRecordAt: string | null
}

const STALE_MS = 90 * 24 * 60 * 60 * 1000

export function TopicsTab({
  orgId, selectedTopic, onSelect, filter,
}: {
  orgId: string
  selectedTopic: string | null
  onSelect: (slug: string) => void
  filter: string
}) {
  const [topics, setTopics] = useState<Topic[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/enterprise/wiki/topics?orgId=${orgId}`)
        if (!res.ok) { if (!cancelled) setTopics([]); return }
        const data = await res.json()
        if (!cancelled) setTopics(data.topics || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [orgId])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return topics || []
    return (topics || []).filter((t) => t.label.toLowerCase().includes(q))
  }, [topics, filter])

  if (loading) {
    return <div className="rounded-2xl border bg-card p-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Scanning records…</div>
  }

  if (!topics || topics.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
        <Hash className="h-6 w-6 mx-auto mb-2 opacity-50" />
        No topics yet. Tag your memories (or let AI tag them during triage) to build this index.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="max-h-[70vh] overflow-y-auto divide-y">
        {filtered.map((t) => {
          const active = t.slug === selectedTopic
          const stale = !t.lastRecordAt || Date.now() - new Date(t.lastRecordAt).getTime() > STALE_MS
          return (
            <button
              key={t.slug}
              onClick={() => onSelect(t.slug)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-l-2 ${
                active ? 'bg-primary/5 border-primary' : 'border-transparent hover:bg-muted/40'
              }`}
            >
              <Hash className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate capitalize">{t.label}</span>
                  {stale && (
                    <Badge variant="outline" className="text-[9px] gap-0.5 h-4 px-1 border-yellow-500/40 text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-2 w-2" /> Stale
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {t.recordCount} memor{t.recordCount === 1 ? 'y' : 'ies'}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
