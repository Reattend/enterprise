'use client'

// Hierarchy tab — flat tree of departments with record counts and a stale
// indicator. Indented by parent depth. Same data shape as before; only the
// row chrome changed (now uses .wiki-tree / .wiki-tnode classes from the
// new design).

import { useEffect, useMemo, useState } from 'react'
import { Building2, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Dept = {
  id: string
  name: string
  slug: string
  kind: string
  parentId: string | null
  headUserId: string | null
  recordCount: number
  memberCount: number
  lastRecordAt: string | null
}

const STALE_MS = 90 * 24 * 60 * 60 * 1000

function isStale(ts: string | null) {
  if (!ts) return true
  return Date.now() - new Date(ts).getTime() > STALE_MS
}

function buildTree(depts: Dept[]): Array<Dept & { depth: number }> {
  const byId = new Map(depts.map((d) => [d.id, d]))
  const children = new Map<string | null, Dept[]>()
  for (const d of depts) {
    const key = d.parentId || null
    if (!children.has(key)) children.set(key, [])
    children.get(key)!.push(d)
  }
  const out: Array<Dept & { depth: number }> = []
  const visit = (parentId: string | null, depth: number) => {
    const kids = (children.get(parentId) || []).sort((a, b) => a.name.localeCompare(b.name))
    for (const k of kids) {
      out.push({ ...k, depth })
      visit(k.id, depth + 1)
    }
  }
  const roots = depts.filter((d) => !d.parentId || !byId.has(d.parentId))
    .sort((a, b) => a.name.localeCompare(b.name))
  for (const r of roots) {
    out.push({ ...r, depth: 0 })
    visit(r.id, 1)
  }
  return out
}

export function HierarchyTab({
  orgId, selectedDeptId, onSelect, filter, onCount,
}: {
  orgId: string
  selectedDeptId: string | null
  onSelect: (id: string) => void
  filter: string
  onCount?: (n: number) => void
}) {
  const [depts, setDepts] = useState<Dept[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/enterprise/wiki/tree?orgId=${orgId}`)
        if (!res.ok) {
          if (!cancelled) setDepts([])
          return
        }
        const data = await res.json()
        if (!cancelled) {
          const list = data.departments || []
          setDepts(list)
          onCount?.(list.length)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  const tree = useMemo(() => depts ? buildTree(depts) : [], [depts])
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return tree
    return tree.filter((d) => d.name.toLowerCase().includes(q) || d.kind.toLowerCase().includes(q))
  }, [tree, filter])

  if (loading) {
    return (
      <div className="wiki-tree" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
        <Loader2 size={14} className="animate-spin" /> Loading org…
      </div>
    )
  }

  if (!depts || depts.length === 0) {
    return (
      <div className="wiki-tree" style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--ink-3)' }}>
        <Building2 size={20} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />
        No departments visible yet.
      </div>
    )
  }

  return (
    <aside className="wiki-tree">
      <h4>Departments</h4>
      {filtered.map((d) => {
        const active = d.id === selectedDeptId
        const stale = isStale(d.lastRecordAt) && d.recordCount > 0
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            className={cn('wiki-tnode', active && 'active')}
            style={{ paddingLeft: `${d.depth * 14 + 8}px` }}
            title={`${d.recordCount} memor${d.recordCount === 1 ? 'y' : 'ies'} · ${d.memberCount} member${d.memberCount === 1 ? '' : 's'}`}
          >
            <Building2 className="ico" size={14} strokeWidth={1.7} />
            <span className="lab">{d.name}</span>
            {stale && <span className="stale-dot" title="Stale — no activity > 90d" aria-label="Stale" />}
            <span className="ct">{d.recordCount.toLocaleString()}</span>
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
