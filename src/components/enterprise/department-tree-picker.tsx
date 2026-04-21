'use client'

// Hierarchical department picker. A flat dropdown breaks at 100+ depts and
// hides the parent/child relationships that drive access cascade. This
// component renders the full tree with expand/collapse, type-to-filter,
// and a single-select surface. Reusable by the invite form, transfer
// wizard, policy applicability, and anywhere else we pick a dept.
//
// Keeps the tree logic here (not in each caller) so every picker behaves
// the same way — one breadcrumb, one indent pattern, one filter.

import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, Building2, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface DeptNode {
  id: string
  name: string
  kind: string
  parentId: string | null
}

// Build a parent→children map + list of root ids in one pass so render
// recursion is cheap.
function buildIndex(nodes: DeptNode[]) {
  const byId = new Map<string, DeptNode>(nodes.map((n) => [n.id, n]))
  const children = new Map<string | null, DeptNode[]>()
  for (const n of nodes) {
    const key = n.parentId || null
    if (!children.has(key)) children.set(key, [])
    children.get(key)!.push(n)
  }
  children.forEach((list: DeptNode[]) => list.sort((a, b) => a.name.localeCompare(b.name)))
  // Root = parent not in the visible set (e.g. filtered out) OR parentId null
  const roots = nodes.filter((n) => !n.parentId || !byId.has(n.parentId))
  roots.sort((a, b) => a.name.localeCompare(b.name))
  return { byId, children, roots }
}

function breadcrumb(id: string, byId: Map<string, DeptNode>): string {
  const parts: string[] = []
  let cur: DeptNode | undefined = byId.get(id)
  while (cur) {
    parts.unshift(cur.name)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  }
  return parts.join(' / ')
}

export function DepartmentTreePicker({
  departments,
  value,
  onChange,
  placeholder = 'Pick a department',
  allowClear = true,
  maxHeightClass = 'max-h-72',
}: {
  departments: DeptNode[]
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
  allowClear?: boolean
  maxHeightClass?: string
}) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const { byId, children, roots } = useMemo(() => buildIndex(departments), [departments])

  // Auto-expand the chain leading to the current value so it's always visible.
  useEffect(() => {
    if (!value) return
    const chain = new Set<string>()
    let cur: DeptNode | undefined = byId.get(value)
    while (cur?.parentId) {
      chain.add(cur.parentId)
      cur = byId.get(cur.parentId)
    }
    if (chain.size > 0) setExpanded((prev) => {
      const next = new Set(prev)
      chain.forEach((id) => next.add(id))
      return next
    })
  }, [value, byId])

  // Filter: if there's a query, we show matching nodes AND their ancestors so
  // the tree stays traversable.
  const { filteredRoots, filteredChildren, forceOpen } = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return { filteredRoots: roots, filteredChildren: children, forceOpen: new Set<string>() }

    const matching = new Set<string>(departments.filter((d) => d.name.toLowerCase().includes(q) || d.kind.toLowerCase().includes(q)).map((d) => d.id))
    // Include ancestors so matches can be traversed to
    const include = new Set<string>(matching)
    matching.forEach((id: string) => {
      let cur: DeptNode | undefined = byId.get(id)
      while (cur?.parentId) {
        include.add(cur.parentId)
        cur = byId.get(cur.parentId)
      }
    })
    const rootsF = roots.filter((r) => include.has(r.id))
    const childrenF = new Map<string | null, DeptNode[]>()
    children.forEach((kids: DeptNode[], p: string | null) => {
      const kept = kids.filter((k) => include.has(k.id))
      if (kept.length) childrenF.set(p, kept)
    })
    return { filteredRoots: rootsF, filteredChildren: childrenF, forceOpen: include }
  }, [query, roots, children, byId, departments])

  const isExpanded = (id: string) => expanded.has(id) || forceOpen.has(id)
  const toggle = (id: string) => setExpanded((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const renderNode = (node: DeptNode, depth: number): React.ReactNode => {
    const kids = filteredChildren.get(node.id) || []
    const hasKids = kids.length > 0
    const open = isExpanded(node.id)
    const selected = node.id === value
    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-1 rounded-md px-1.5 py-1 cursor-pointer text-sm transition-colors',
            selected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50',
          )}
          style={{ paddingLeft: `${depth * 16 + 6}px` }}
          onClick={() => onChange(node.id)}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (hasKids) toggle(node.id) }}
            className={cn('h-4 w-4 shrink-0 flex items-center justify-center', !hasKids && 'invisible')}
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            {open ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          </button>
          <Building2 className={cn('h-3 w-3 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
          <span className="flex-1 truncate">{node.name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0 capitalize">{node.kind}</span>
        </div>
        {open && hasKids && kids.map((k) => renderNode(k, depth + 1))}
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center gap-2 p-2 border-b">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-7 text-xs border-0 focus-visible:ring-0 px-0"
        />
        {value && allowClear && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-6 w-6 shrink-0"
            onClick={() => onChange(null)}
            title="Clear selection"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      {value && (
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-primary/5 border-b">
          Selected: <strong className="text-foreground">{breadcrumb(value, byId)}</strong>
        </div>
      )}
      <div className={cn('p-1 overflow-y-auto', maxHeightClass)}>
        {filteredRoots.length === 0 ? (
          <div className="text-center text-xs text-muted-foreground py-6">
            {query ? 'No matches' : 'No departments yet'}
          </div>
        ) : (
          filteredRoots.map((r) => renderNode(r, 0))
        )}
      </div>
    </div>
  )
}
