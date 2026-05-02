'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, ChevronRight, ChevronDown, Network, Building, Users2, AlertCircle, List, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrgChart } from '@/components/enterprise/org-chart'
import { emit, SCOPES } from '@/lib/data-bus'

type Kind = string // free-text per-org taxonomy

interface Department {
  id: string
  organizationId: string
  parentId: string | null
  kind: Kind
  name: string
  slug: string
  headUserId: string | null
  description: string | null
}

interface TaxonomyKind {
  label: string
  rankOrder: number
  description: string | null
}

interface TreeNode extends Department {
  children: TreeNode[]
}

function buildTree(rows: Department[]): TreeNode[] {
  const byId = new Map<string, TreeNode>()
  for (const r of rows) byId.set(r.id, { ...r, children: [] })
  const roots: TreeNode[] = []
  for (const r of rows) {
    const node = byId.get(r.id)!
    if (r.parentId && byId.has(r.parentId)) {
      byId.get(r.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

// Reasonable defaults — real icons are chosen by matching string prefixes so
// custom taxonomies (e.g. "Ministry", "Directorate", "Section") still render well.
function iconForKind(kind: string): typeof Building {
  const k = kind.toLowerCase()
  if (k === 'team' || k.includes('team') || k.includes('squad')) return Users2
  if (k.includes('division') || k.includes('wing') || k.includes('directorate')) return Network
  return Building
}

export default function DepartmentsPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const router = useRouter()
  const [rows, setRows] = useState<Department[] | null>(null)
  const [kinds, setKinds] = useState<TaxonomyKind[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<{ name: string; kind: Kind; parentId: string }>({ name: '', kind: 'department', parentId: '' })
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'chart' | 'tree'>('chart')

  async function load() {
    setErr(null)
    const [dRes, tRes] = await Promise.all([
      fetch(`/api/enterprise/organizations/${orgId}/departments`),
      fetch(`/api/enterprise/organizations/${orgId}/taxonomy`),
    ])
    if (!dRes.ok) {
      setErr((await dRes.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      return
    }
    const data = await dRes.json()
    setRows(data.departments)
    setExpanded(new Set((data.departments as Department[]).map((d) => d.id)))
    if (tRes.ok) {
      const t = await tRes.json()
      const kindList: TaxonomyKind[] = t.departmentKinds
      setKinds(kindList)
      // Default form kind to first taxonomy entry
      setForm((f) => ({ ...f, kind: f.kind || kindList[0]?.label || 'department' }))
    }
  }

  useEffect(() => {
    load()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          kind: form.kind,
          parentId: form.parentId || undefined,
        }),
      })
      if (!res.ok) {
        setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
        return
      }
      setForm({ name: '', kind: kinds[0]?.label || 'department', parentId: '' })
      setShowCreate(false)
      await load()
      // Broadcast — wiki tabs, sidebar org-tree, etc. should refetch
      // their dept lists so the new node appears without a page reload.
      emit([SCOPES.teams, SCOPES.orgs])
    } finally {
      setBusy(false)
    }
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const tree = rows ? buildTree(rows) : []

  // Detect the "no team yet" trap. Until at least one team-kind dept
  // exists, every memory captured by anyone in this org falls into the
  // user's personal workspace and never appears on home / landscape /
  // cockpit. Surface a CTA so the admin can fix it in one click.
  const hasTeam = (rows ?? []).some((r) => r.kind === 'team')
  const showZeroTeamCta = rows !== null && !hasTeam

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Organize your company. Department → Division → Team. Membership here controls what each person can see.
        </p>
        <Button onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      {showZeroTeamCta && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-medium">This org has no <code className="text-xs px-1 rounded bg-amber-500/15">kind: team</code> department yet</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Departments are pure hierarchy boxes. <b>Teams</b> are where memory actually lives — each team-kind dept gets a backing workspace + default project. Without one, captures fall into individuals&apos; personal workspaces and the cockpit reads zero.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setForm({ name: 'General', kind: 'team', parentId: '' })
              setShowCreate(true)
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add a team
          </Button>
        </div>
      )}

      {showCreate && (
        <Card className="p-4">
          <form onSubmit={submitCreate} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <Input
              className="sm:col-span-5"
              placeholder="Name (e.g. Engineering, Platform Division, Core Team)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <select
              className="sm:col-span-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
            >
              {(kinds.length > 0 ? kinds : [{ label: 'department', rankOrder: 1, description: null }]).map((k) => (
                <option key={k.label} value={k.label}>{k.label}</option>
              ))}
            </select>
            <select
              className="sm:col-span-3 h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
            >
              <option value="">No parent (root)</option>
              {rows?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.kind})
                </option>
              ))}
            </select>
            <Button type="submit" disabled={busy || !form.name.trim()} className="sm:col-span-2">
              {busy ? 'Creating…' : 'Create'}
            </Button>
          </form>
        </Card>
      )}

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-0.5 border border-border rounded p-0.5 bg-muted/40">
          <button
            onClick={() => setView('chart')}
            className={cn(
              'px-2.5 py-1 text-xs rounded inline-flex items-center gap-1.5 transition-colors',
              view === 'chart' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Share2 className="h-3 w-3" />
            Org chart
          </button>
          <button
            onClick={() => setView('tree')}
            className={cn(
              'px-2.5 py-1 text-xs rounded inline-flex items-center gap-1.5 transition-colors',
              view === 'tree' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <List className="h-3 w-3" />
            Tree list
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {rows?.length ?? 0} {(rows?.length ?? 0) === 1 ? 'department' : 'departments'}
        </span>
      </div>

      {view === 'chart' ? (
        rows === null ? (
          <Card className="p-6 text-sm text-muted-foreground text-center">Loading…</Card>
        ) : (
          <OrgChart
            departments={rows}
            onNodeClick={(deptId) => {
              // Toggle expansion in tree view + scroll there when switching
              setExpanded((prev) => {
                const next = new Set(prev)
                next.add(deptId)
                return next
              })
            }}
          />
        )
      ) : (
        <Card className="p-0 overflow-hidden">
          {rows === null ? (
            <div className="p-4 text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">
              No departments yet. Create your first one above — e.g. &quot;Engineering&quot;.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {tree.map((node) => (
                <TreeRow key={node.id} node={node} depth={0} expanded={expanded} onToggle={toggle} />
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* Suppress unused import until we wire router-based nav */}
      <span className="hidden">{router ? '' : ''}</span>
    </div>
  )
}

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
}) {
  const Icon = iconForKind(node.kind)
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.id)
  return (
    <>
      <li
        className={cn('flex items-center gap-2 px-4 py-2.5', depth > 0 && 'border-l-2 border-muted ml-4')}
        style={{ paddingLeft: 16 + depth * 20 }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className={cn('h-5 w-5 flex items-center justify-center text-muted-foreground', !hasChildren && 'invisible')}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{node.name}</div>
          {node.description && (
            <div className="text-xs text-muted-foreground truncate">{node.description}</div>
          )}
        </div>
        <span className="text-xs text-muted-foreground capitalize">{node.kind}</span>
      </li>
      {isOpen && node.children.map((c) => (
        <TreeRow key={c.id} node={c} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
      ))}
    </>
  )
}
