'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Layers, Plus, X, AlertCircle, Check, ArrowUp, ArrowDown, Save, Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaxonomyRow {
  id: string
  organizationId: string
  kind: 'department_kind' | 'seniority_rank'
  label: string
  rankOrder: number
  description: string | null
  active: boolean
}

type Draft = { label: string; rankOrder: number; description: string }

const GOV_PRESET_KINDS: Draft[] = [
  { label: 'Ministry', rankOrder: 1, description: 'Apex government body' },
  { label: 'Department', rankOrder: 2, description: 'Primary administrative unit' },
  { label: 'Wing', rankOrder: 3, description: 'Functional grouping' },
  { label: 'Directorate', rankOrder: 4, description: 'Operational arm' },
  { label: 'Section', rankOrder: 5, description: 'Working unit' },
  { label: 'team', rankOrder: 6, description: 'Leaf — has its own memory workspace' },
]
const GOV_PRESET_RANKS: Draft[] = [
  { label: 'Secretary', rankOrder: 1, description: 'Secretary to the Government' },
  { label: 'Additional Secretary', rankOrder: 2, description: '' },
  { label: 'Joint Secretary', rankOrder: 3, description: '' },
  { label: 'Director', rankOrder: 4, description: '' },
  { label: 'Deputy Secretary', rankOrder: 5, description: '' },
  { label: 'Under Secretary', rankOrder: 6, description: '' },
  { label: 'Section Officer', rankOrder: 7, description: '' },
]

export default function TaxonomyPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [deptKinds, setDeptKinds] = useState<Draft[]>([])
  const [seniority, setSeniority] = useState<Draft[]>([])
  const [isDefault, setIsDefault] = useState(true)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function load() {
    setErr(null)
    const res = await fetch(`/api/enterprise/organizations/${orgId}/taxonomy`)
    if (!res.ok) {
      setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      setLoading(false)
      return
    }
    const data = await res.json()
    setIsDefault(data.isDefault)
    setDeptKinds(
      (data.departmentKinds as TaxonomyRow[]).map((r) => ({
        label: r.label,
        rankOrder: r.rankOrder,
        description: r.description ?? '',
      })),
    )
    setSeniority(
      (data.seniorityRanks as TaxonomyRow[]).map((r) => ({
        label: r.label,
        rankOrder: r.rankOrder,
        description: r.description ?? '',
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    // Normalize rankOrder to 1..N based on position
    const normalizedDK = deptKinds.map((d, i) => ({ ...d, rankOrder: i + 1 }))
    const normalizedSR = seniority.map((s, i) => ({ ...s, rankOrder: i + 1 }))

    setSaving(true)
    setErr(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/taxonomy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentKinds: normalizedDK,
          seniorityRanks: normalizedSR,
        }),
      })
      const body = await res.json().catch(() => ({ error: 'failed' }))
      if (!res.ok) {
        setErr(body.error || 'failed')
        return
      }
      setNotice('Taxonomy saved. New departments and roles will use these values.')
      setTimeout(() => setNotice(null), 4000)
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Card className="p-8 text-sm text-muted-foreground text-center">Loading taxonomy…</Card>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-display text-3xl tracking-tight flex items-center gap-3">
          <Layers className="h-6 w-6 text-primary" />
          Organization taxonomy
        </h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Customize the labels used for your org&apos;s hierarchy levels and seniority ladder.
          Private companies keep defaults; government and deep-hierarchy orgs override them.
        </p>
      </div>

      {isDefault && (
        <div className="flex items-start gap-2 text-sm border border-primary/30 bg-primary/5 rounded p-3">
          <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-foreground">Using default taxonomy</div>
            <div className="text-muted-foreground mt-1">
              No custom taxonomy saved yet. Edit the values below and save to override. Or load a preset:
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDeptKinds(GOV_PRESET_KINDS)
                  setSeniority(GOV_PRESET_RANKS)
                }}
              >
                <Landmark className="h-3.5 w-3.5 mr-1" />
                Load Indian government preset
              </Button>
            </div>
          </div>
        </div>
      )}

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded p-2">
          <Check className="h-4 w-4" />
          {notice}
        </div>
      )}

      <Section
        title="Department hierarchy"
        description={'Listed top→bottom. The bottom-most kind is the "leaf" — it gets its own memory workspace. Reserve the exact string "team" to keep auto-workspace semantics.'}
        items={deptKinds}
        setItems={setDeptKinds}
        emptyLabel="No department kinds yet — add one to start."
        addDefault={{ label: '', rankOrder: deptKinds.length + 1, description: '' }}
      />

      <Section
        title="Seniority ladder"
        description="Listed top→bottom — the top is most senior. Used for sorting roles and surfacing VPs/executives in the cockpit."
        items={seniority}
        setItems={setSeniority}
        emptyLabel="No seniority ranks yet — add one."
        addDefault={{ label: '', rankOrder: seniority.length + 1, description: '' }}
      />

      <div className="flex justify-end gap-2 sticky bottom-0 bg-background/80 backdrop-blur-md py-3 -mx-3 px-3 border-t border-border">
        <Button variant="outline" onClick={load} disabled={saving}>Reset</Button>
        <Button onClick={save} disabled={saving || deptKinds.length === 0}>
          <Save className="h-3.5 w-3.5 mr-1" />
          {saving ? 'Saving…' : 'Save taxonomy'}
        </Button>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  items,
  setItems,
  emptyLabel,
  addDefault,
}: {
  title: string
  description: string
  items: Draft[]
  setItems: (next: Draft[]) => void
  emptyLabel: string
  addDefault: Draft
}) {
  function update(idx: number, patch: Partial<Draft>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  function remove(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }
  function move(idx: number, delta: -1 | 1) {
    const j = idx + delta
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setItems(next)
  }
  function add() {
    setItems([...items, addDefault])
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-3 pb-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-lg">{description}</p>
        </div>
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4">{emptyLabel}</div>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  className={cn(
                    'h-4 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground',
                    idx === 0 && 'opacity-30 cursor-not-allowed',
                  )}
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === items.length - 1}
                  className={cn(
                    'h-4 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground',
                    idx === items.length - 1 && 'opacity-30 cursor-not-allowed',
                  )}
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
              <span className="w-6 text-xs text-muted-foreground text-center">#{idx + 1}</span>
              <Input
                value={it.label}
                onChange={(e) => update(idx, { label: e.target.value })}
                placeholder="Label (e.g. Ministry, Joint Secretary)"
                className="flex-1"
              />
              <Input
                value={it.description}
                onChange={(e) => update(idx, { description: e.target.value })}
                placeholder="Description (optional)"
                className="flex-1 hidden sm:block"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
