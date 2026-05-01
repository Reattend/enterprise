'use client'

// Topics tab — ranked list of tags / entities appearing in ≥2 visible records.
// Same data shape and endpoint as before; row chrome restyled to match the
// new wiki-tree / wiki-tnode design.

import { useEffect, useMemo, useState } from 'react'
import { Hash, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Topic = {
  slug: string
  label: string
  recordCount: number
  lastRecordAt: string | null
}

const STALE_MS = 90 * 24 * 60 * 60 * 1000

export function TopicsTab({
  orgId, selectedTopic, onSelect, filter, onCount,
}: {
  orgId: string
  selectedTopic: string | null
  onSelect: (slug: string) => void
  filter: string
  onCount?: (n: number) => void
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
        if (!cancelled) {
          const list = data.topics || []
          setTopics(list)
          onCount?.(list.length)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return topics || []
    return (topics || []).filter((t) => t.label.toLowerCase().includes(q))
  }, [topics, filter])

  if (loading) {
    return (
      <div className="wiki-tree" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
        <Loader2 size={14} className="animate-spin" /> Scanning records…
      </div>
    )
  }

  if (!topics || topics.length === 0) {
    return (
      <div className="wiki-tree" style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
        <Hash size={20} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />
        No topics yet. Tag your memories (or let the AI tag them during triage) to build this index.
      </div>
    )
  }

  return (
    <aside className="wiki-tree">
      <h4>Topics</h4>
      {filtered.map((t) => {
        const active = t.slug === selectedTopic
        const stale = !t.lastRecordAt || Date.now() - new Date(t.lastRecordAt).getTime() > STALE_MS
        return (
          <button
            key={t.slug}
            type="button"
            onClick={() => onSelect(t.slug)}
            className={cn('wiki-tnode', active && 'active')}
          >
            <Hash className="ico" size={14} strokeWidth={1.7} />
            <span className="lab" style={{ textTransform: 'capitalize' }}>{t.label}</span>
            {stale && <span className="stale-dot" title="Stale" aria-label="Stale" />}
            <span className="ct">{t.recordCount.toLocaleString()}</span>
          </button>
        )
      })}
      {filtered.length === 0 && (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--ink-3)' }}>
          No matches.
        </div>
      )}
    </aside>
  )
}
