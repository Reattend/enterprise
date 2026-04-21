'use client'

// Hierarchy tab — renders the dept tree (org → dept → division → team, etc.)
// with record counts and stale badges. Indented by parent depth.

import { useEffect, useMemo, useState } from 'react'
import { Building2, Loader2, AlertTriangle, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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

// Build a tree from flat parent-linked rows, returning each dept with its
// depth so indentation is stable even if the list order varies.
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
  // Start from roots that have no visible parent
  const roots = depts.filter((d) => !d.parentId || !byId.has(d.parentId))
    .sort((a, b) => a.name.localeCompare(b.name))
  for (const r of roots) {
    out.push({ ...r, depth: 0 })
    visit(r.id, 1)
  }
  return out
}

export function HierarchyTab({
  orgId, selectedDeptId, onSelect, filter,
}: {
  orgId: string
  selectedDeptId: string | null
  onSelect: (id: string) => void
  filter: string
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
        if (!cancelled) setDepts(data.departments || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [orgId])

  const tree = useMemo(() => depts ? buildTree(depts) : [], [depts])
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return tree
    return tree.filter((d) => d.name.toLowerCase().includes(q) || d.kind.toLowerCase().includes(q))
  }, [tree, filter])

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading org…
      </div>
    )
  }

  if (!depts || depts.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
        <Building2 className="h-6 w-6 mx-auto mb-2 opacity-50" />
        No departments visible yet.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="max-h-[70vh] overflow-y-auto">
        {filtered.map((d) => {
          const active = d.id === selectedDeptId
          const stale = isStale(d.lastRecordAt)
          return (
            <button
              key={d.id}
              onClick={() => onSelect(d.id)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors border-l-2 ${
                active
                  ? 'bg-primary/5 border-primary'
                  : 'border-transparent hover:bg-muted/40'
              }`}
              style={{ paddingLeft: `${d.depth * 16 + 12}px` }}
            >
              <Building2 className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{d.name}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{d.kind}</span>
                  {stale && d.recordCount > 0 && (
                    <Badge variant="outline" className="text-[9px] gap-0.5 h-4 px-1 border-yellow-500/40 text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-2 w-2" /> Stale
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {d.recordCount} memor{d.recordCount === 1 ? 'y' : 'ies'} · {d.memberCount} member{d.memberCount === 1 ? '' : 's'}
                </div>
              </div>
              <ChevronRight className={`h-3 w-3 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground/40'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
