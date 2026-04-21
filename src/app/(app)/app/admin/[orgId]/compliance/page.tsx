'use client'

// Compliance posture — SOC 2 Type 1 prep dashboard.
// Each control is a live signal computed from org state, not a manual
// checkbox. The retention + export controls sit on this page too so admins
// can configure them without jumping tabs.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  FileLock,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type Control = {
  id: string
  group: string
  label: string
  description: string
  status: 'pass' | 'warn' | 'info'
  detail: string
  action?: { label: string; href: string } | null
}

type Posture = {
  organizationId: string
  deployment: string
  plan: string
  score: number
  pass: number
  warn: number
  info: number
  members: number
  controls: Control[]
}

type Retention = {
  retentionDays: number
  infinite: boolean
  cutoffIso: string | null
  eligibleToPrune: number
}

export default function CompliancePage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [posture, setPosture] = useState<Posture | null>(null)
  const [retention, setRetention] = useState<Retention | null>(null)
  const [retentionInput, setRetentionInput] = useState<string>('0')
  const [savingRetention, setSavingRetention] = useState(false)
  const [pruning, setPruning] = useState(false)
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null)

  const load = async () => {
    const [p, r] = await Promise.all([
      fetch(`/api/enterprise/organizations/${orgId}/compliance`).then((res) => res.ok ? res.json() : null),
      fetch(`/api/enterprise/organizations/${orgId}/audit/retention`).then((res) => res.ok ? res.json() : null),
    ])
    if (p) setPosture(p)
    if (r) {
      setRetention(r)
      setRetentionInput(String(r.retentionDays))
    }
  }
  useEffect(() => { load() }, [orgId])

  const saveRetention = async () => {
    const n = Math.floor(Number(retentionInput))
    if (!Number.isFinite(n) || n < 0 || n > 3650) {
      toast.error('Retention must be 0–3650 days')
      return
    }
    setSavingRetention(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/audit/retention`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays: n }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(e.error || 'Save failed')
        return
      }
      toast.success('Retention updated')
      load()
    } finally {
      setSavingRetention(false)
    }
  }

  const runPrune = async () => {
    if (!retention || retention.infinite) return
    if (!confirm(`Delete ${retention.eligibleToPrune} audit rows older than ${retention.retentionDays} days? This cannot be undone.`)) return
    setPruning(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/audit/retention`, { method: 'POST' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(e.error || 'Prune failed')
        return
      }
      const d = await res.json()
      toast.success(`Pruned ${d.deleted} rows`)
      load()
    } finally {
      setPruning(false)
    }
  }

  const runExport = async (format: 'csv' | 'json') => {
    setExporting(format)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/audit/export?format=${format}`)
      if (!res.ok) {
        toast.error('Export failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-${orgId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      const tip = res.headers.get('X-Audit-Chain-Tip')
      toast.success(`Exported${tip ? ` · chain tip: ${tip.slice(0, 12)}…` : ''}`)
      load()
    } finally {
      setExporting(null)
    }
  }

  if (!posture) {
    return <div className="py-20 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  const grouped = posture.controls.reduce((acc, c) => {
    ;(acc[c.group] = acc[c.group] || []).push(c)
    return acc
  }, {} as Record<string, Control[]>)

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-3xl tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" /> Compliance posture
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Live state of SOC 2 Type 1 adjacent controls. These are computed from your actual org,
            not manually ticked. Fix warnings before your auditor opens the file.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ScoreRing score={posture.score} />
          <div className="text-xs text-muted-foreground">
            <div><strong className="text-emerald-600">{posture.pass}</strong> pass</div>
            <div><strong className="text-yellow-600">{posture.warn}</strong> warnings</div>
            <div><strong className="text-muted-foreground">{posture.info}</strong> info</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      {Object.entries(grouped).map(([group, list]) => (
        <section key={group} className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{group}</h3>
          <div className="rounded-2xl border bg-card overflow-hidden divide-y">
            {list.map((c) => <ControlRow key={c.id} c={c} />)}
          </div>
        </section>
      ))}

      {/* Retention + Export actions */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Audit retention</div>
              <div className="text-xs text-muted-foreground">0 = infinite (regulated default). Otherwise, rows older than N days become eligible to prune.</div>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Retention (days)</Label>
              <Input type="number" min={0} max={3650} value={retentionInput} onChange={(e) => setRetentionInput(e.target.value)} className="h-9 text-sm" />
            </div>
            <Button size="sm" onClick={saveRetention} disabled={savingRetention} className="h-9">
              {savingRetention ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
            </Button>
          </div>
          {retention && !retention.infinite && (
            <div className="flex items-center justify-between rounded-lg border p-2.5 bg-muted/30">
              <div className="text-xs">
                <div className="font-medium">{retention.eligibleToPrune.toLocaleString()} rows eligible</div>
                <div className="text-muted-foreground">older than {retention.cutoffIso ? new Date(retention.cutoffIso).toLocaleDateString() : ''}</div>
              </div>
              <Button size="sm" variant="outline" onClick={runPrune} disabled={pruning || retention.eligibleToPrune === 0} className="h-8">
                {pruning ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                Prune now
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <FileLock className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Tamper-evident export</div>
              <div className="text-xs text-muted-foreground">Every row is hashed with the previous row's hash — a modified file fails verification.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => runExport('csv')} disabled={!!exporting} className="flex-1 h-9">
              {exporting === 'csv' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => runExport('json')} disabled={!!exporting} className="flex-1 h-9">
              {exporting === 'json' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
              Export JSON
            </Button>
          </div>
          <div className="text-[10px] text-muted-foreground flex items-start gap-1.5">
            <Lock className="h-2.5 w-2.5 mt-0.5 shrink-0" />
            <span>
              The chain tip is returned as <code className="bg-muted px-1 py-0.5 rounded">X-Audit-Chain-Tip</code> and embedded at the top of the CSV.
              Store it separately to prove later the file hasn't been altered.
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

function ControlRow({ c }: { c: Control }) {
  const meta = c.status === 'pass'
    ? { icon: CheckCircle2, color: 'text-emerald-600', label: 'Pass' }
    : c.status === 'warn'
    ? { icon: AlertCircle, color: 'text-yellow-600', label: 'Warn' }
    : { icon: Info, color: 'text-muted-foreground', label: 'Info' }
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-3 p-4">
      <Icon className={cn('h-4 w-4 shrink-0', meta.color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm font-medium">{c.label}</div>
          <Badge variant="outline" className={cn('text-[9px] h-4 px-1', meta.color)}>{meta.label}</Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>
        <div className="text-[11px] text-muted-foreground/80 mt-1">{c.detail}</div>
      </div>
      {c.action && (
        <Button size="sm" variant="outline" asChild className="shrink-0 h-8">
          <Link href={c.action.href}>{c.action.label}</Link>
        </Button>
      )}
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 85 ? 'text-emerald-500' : score >= 60 ? 'text-yellow-500' : 'text-destructive'
  return (
    <div className={cn('relative h-16 w-16 flex items-center justify-center', color)}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
        <circle cx={24} cy={24} r={20} stroke="currentColor" strokeOpacity={0.15} strokeWidth={4} fill="none" />
        <circle cx={24} cy={24} r={20} stroke="currentColor" strokeWidth={4} fill="none"
          strokeDasharray={`${(score / 100) * (2 * Math.PI * 20)} ${2 * Math.PI * 20}`}
          strokeLinecap="round" />
      </svg>
      <span className="text-lg font-bold">{score}</span>
    </div>
  )
}
