'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Building2, Shield, Server, Cloud, AlertCircle, Check, Save, AlertTriangle,
  Clock, Database, Globe, Key,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Plan = 'starter' | 'business' | 'enterprise' | 'government'
type Deployment = 'saas' | 'on_prem' | 'air_gapped'
type Status = 'active' | 'suspended' | 'canceled'

interface Organization {
  id: string
  name: string
  slug: string
  primaryDomain: string | null
  plan: Plan
  deployment: Deployment
  status: Status
  onPremRabbitUrl: string | null
  seatLimit: number | null
  settings: string | null // JSON
  createdAt: string
  updatedAt: string
}

interface Settings {
  auditRetentionDays?: number
  allowSelfServiceSignup?: boolean
  enforceStrictDomainMatch?: boolean
}

type SavePatch = {
  name?: string
  primaryDomain?: string | null
  plan?: Plan
  deployment?: Deployment
  onPremRabbitUrl?: string | null
  seatLimit?: number | null
  settings?: Settings
}

const DEPLOYMENT_META: Record<Deployment, { label: string; desc: string; icon: typeof Cloud }> = {
  saas: { label: 'SaaS', desc: 'Fully managed by Reattend', icon: Cloud },
  on_prem: { label: 'On-Premise', desc: 'Rabbit v2.1 on your infrastructure', icon: Server },
  air_gapped: { label: 'Air-Gapped', desc: 'Zero outbound traffic, sovereign compliance', icon: Shield },
}

const PLAN_LABEL: Record<Plan, string> = {
  starter: 'Starter',
  business: 'Business',
  enterprise: 'Enterprise',
  government: 'Government',
}

export default function SettingsPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [org, setOrg] = useState<Organization | null>(null)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Draft state (editable fields)
  const [name, setName] = useState('')
  const [primaryDomain, setPrimaryDomain] = useState('')
  const [deployment, setDeployment] = useState<Deployment>('saas')
  const [rabbitUrl, setRabbitUrl] = useState('')
  const [seatLimit, setSeatLimit] = useState<string>('')
  const [auditRetentionDays, setAuditRetentionDays] = useState<string>('365')
  const [enforceStrictDomain, setEnforceStrictDomain] = useState(true)

  // Save feedback
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function load() {
    setErr(null)
    const res = await fetch(`/api/enterprise/organizations/${orgId}`)
    if (!res.ok) {
      setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      setLoading(false)
      return
    }
    const data = await res.json()
    const o: Organization = data.organization
    setOrg(o)
    setMyRole(data.myRole)
    setName(o.name)
    setPrimaryDomain(o.primaryDomain ?? '')
    setDeployment(o.deployment)
    setRabbitUrl(o.onPremRabbitUrl ?? '')
    setSeatLimit(o.seatLimit?.toString() ?? '')
    const s: Settings = o.settings ? safeParse(o.settings) : {}
    setAuditRetentionDays((s.auditRetentionDays ?? 365).toString())
    setEnforceStrictDomain(s.enforceStrictDomainMatch ?? true)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  const canEdit = myRole === 'super_admin'

  async function save(fields: SavePatch) {
    setSaving(true)
    setErr(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      })
      const body = await res.json().catch(() => ({ error: 'failed' }))
      if (!res.ok) {
        setErr(body.error || 'failed')
        return
      }
      setNotice('Saved.')
      setTimeout(() => setNotice(null), 3000)
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function saveIdentity(e: React.FormEvent) {
    e.preventDefault()
    const trimmedDomain = primaryDomain.trim().toLowerCase().replace(/^@/, '').replace(/^https?:\/\//, '')
    if (trimmedDomain && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(trimmedDomain)) {
      setErr('Invalid domain format. Use something like acme.com')
      return
    }
    await save({ name: name.trim(), primaryDomain: trimmedDomain || undefined })
  }

  async function saveDeployment(e: React.FormEvent) {
    e.preventDefault()
    const patch: SavePatch = { deployment }
    if (deployment === 'on_prem' || deployment === 'air_gapped') {
      patch.onPremRabbitUrl = rabbitUrl.trim() || null
    } else {
      patch.onPremRabbitUrl = null
    }
    await save(patch)
  }

  async function saveCapacity(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(seatLimit, 10)
    if (seatLimit && (isNaN(n) || n < 1)) {
      setErr('Seat limit must be a positive number or blank (unlimited).')
      return
    }
    await save({ seatLimit: seatLimit ? n : undefined })
  }

  async function saveRetention(e: React.FormEvent) {
    e.preventDefault()
    const d = parseInt(auditRetentionDays, 10)
    if (isNaN(d) || d < 30 || d > 3650) {
      setErr('Retention must be between 30 and 3650 days.')
      return
    }
    const existing: Settings = org?.settings ? safeParse(org.settings) : {}
    await save({
      settings: {
        ...existing,
        auditRetentionDays: d,
        enforceStrictDomainMatch: enforceStrictDomain,
      },
    })
  }

  if (loading) {
    return <Card className="p-8 text-sm text-muted-foreground text-center">Loading settings…</Card>
  }
  if (err && !org) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-3">
        <AlertCircle className="h-4 w-4" />
        {err}
      </div>
    )
  }
  if (!org) return null

  return (
    <div className="space-y-6 max-w-3xl">
      {!canEdit && (
        <div className="flex items-center gap-2 text-sm border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 rounded p-3">
          <Shield className="h-4 w-4 shrink-0" />
          <span>You&apos;re viewing as <span className="font-medium capitalize">{myRole?.replace('_', ' ')}</span>. Only super_admin can change settings.</span>
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

      {/* ── Organization identity ─────────────────────────────────────── */}
      <Section
        icon={Building2}
        title="Organization"
        desc="Your organization's name and the domain its members sign in with."
      >
        <form onSubmit={saveIdentity} className="space-y-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} required />
          </Field>
          <Field label="URL slug" hint="Used in URLs. Not changeable.">
            <Input value={org.slug} disabled className="font-mono" />
          </Field>
          <Field
            label="Primary email domain"
            hint="Invites must match this domain. Subdomains pass too (e.g. alice@us.acme.com for acme.com)."
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">@</span>
              <Input
                value={primaryDomain}
                onChange={(e) => setPrimaryDomain(e.target.value)}
                placeholder="acme.com"
                disabled={!canEdit}
              />
            </div>
            {primaryDomain && primaryDomain !== (org.primaryDomain ?? '') && (
              <div className="mt-2 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Changing the domain affects <strong>new invites only</strong>. Existing members with
                  mismatched emails keep access until you offboard them manually.
                </span>
              </div>
            )}
          </Field>
          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !name.trim()}>
                <Save className="h-3.5 w-3.5 mr-1" />
                {saving ? 'Saving…' : 'Save organization'}
              </Button>
            </div>
          )}
        </form>
      </Section>

      {/* ── Plan (read-only for now) ──────────────────────────────────── */}
      <Section
        icon={Key}
        title="Plan"
        desc="Your current plan and seat allocation."
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold',
            org.plan === 'enterprise' || org.plan === 'government'
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground',
          )}>
            {PLAN_LABEL[org.plan]}
          </div>
          <span className="text-sm text-muted-foreground">
            Status: <span className="capitalize font-medium">{org.status}</span>
          </span>
        </div>
        <form onSubmit={saveCapacity} className="mt-4 space-y-3">
          <Field label="Seat limit" hint="Blank = unlimited.">
            <Input
              type="number"
              min={1}
              value={seatLimit}
              onChange={(e) => setSeatLimit(e.target.value)}
              placeholder="Unlimited"
              disabled={!canEdit}
              className="max-w-xs"
            />
          </Field>
          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving} variant="outline">
                <Save className="h-3.5 w-3.5 mr-1" />
                Save capacity
              </Button>
            </div>
          )}
        </form>
      </Section>

      {/* ── Deployment ────────────────────────────────────────────────── */}
      <Section
        icon={Server}
        title="Deployment"
        desc="Where Reattend Enterprise runs for your organization."
      >
        <form onSubmit={saveDeployment} className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {(['saas', 'on_prem', 'air_gapped'] as Deployment[]).map((d) => {
              const meta = DEPLOYMENT_META[d]
              const Icon = meta.icon
              const active = deployment === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => canEdit && setDeployment(d)}
                  disabled={!canEdit}
                  className={cn(
                    'text-left border rounded-lg p-3 transition-colors flex items-start gap-3',
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/30',
                    !canEdit && 'cursor-not-allowed opacity-70',
                  )}
                >
                  <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                  <div>
                    <div className="font-medium text-sm">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">{meta.desc}</div>
                  </div>
                  {active && <Check className="h-4 w-4 ml-auto text-primary" />}
                </button>
              )
            })}
          </div>

          {(deployment === 'on_prem' || deployment === 'air_gapped') && (
            <Field
              label="Rabbit v2.1 endpoint"
              hint="URL of your on-prem inference server running Rabbit v2.1."
            >
              <Input
                value={rabbitUrl}
                onChange={(e) => setRabbitUrl(e.target.value)}
                placeholder="https://rabbit.internal.acme.com"
                disabled={!canEdit}
              />
            </Field>
          )}

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving} variant="outline">
                <Save className="h-3.5 w-3.5 mr-1" />
                Save deployment
              </Button>
            </div>
          )}
        </form>
      </Section>

      {/* ── Retention & governance ────────────────────────────────────── */}
      <Section
        icon={Clock}
        title="Retention & governance"
        desc="How long audit logs are kept, and how strictly we enforce the org email domain."
      >
        <form onSubmit={saveRetention} className="space-y-4">
          <Field
            label="Audit log retention (days)"
            hint="Between 30 and 3650 (10 years). Longer retention is required for government + regulated industries."
          >
            <Input
              type="number"
              min={30}
              max={3650}
              value={auditRetentionDays}
              onChange={(e) => setAuditRetentionDays(e.target.value)}
              disabled={!canEdit}
              className="max-w-xs"
            />
          </Field>

          <label className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={enforceStrictDomain}
              onChange={(e) => setEnforceStrictDomain(e.target.checked)}
              disabled={!canEdit}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Strict domain match on invite</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                When enabled, invites must exactly match the primary email domain.
                When disabled, any non-personal work email is accepted (subject to the personal-provider blocklist).
              </div>
            </div>
          </label>

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={saving} variant="outline">
                <Save className="h-3.5 w-3.5 mr-1" />
                Save governance
              </Button>
            </div>
          )}
        </form>
      </Section>

      {/* ── Data sovereignty (informational) ──────────────────────────── */}
      <Section
        icon={Globe}
        title="Data sovereignty"
        desc="Where your organizational memory physically resides."
      >
        <div className="text-sm space-y-2 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database className="h-3.5 w-3.5" />
            Deployment: <span className="font-medium text-foreground capitalize">{org.deployment.replace('_', ' ')}</span>
          </div>
          <p>
            {org.deployment === 'saas' && (
              <>Running on Reattend&apos;s managed infrastructure. Data leaves your network.</>
            )}
            {org.deployment === 'on_prem' && (
              <>Running on your infrastructure. Data stays inside your perimeter.</>
            )}
            {org.deployment === 'air_gapped' && (
              <>Fully isolated. Zero outbound traffic. Suitable for classified and sovereign compliance.</>
            )}
          </p>
        </div>
      </Section>

      {/* ── Danger zone ───────────────────────────────────────────────── */}
      <Card className="p-5 border-destructive/30">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-destructive">Danger zone</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Destructive actions that can&apos;t be reversed.
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            Organization deletion is not yet available through the UI. Contact{' '}
            <a href="mailto:pb@reattend.com" className="text-primary hover:underline">pb@reattend.com</a>{' '}
            to request permanent deletion — this will purge all org data, including audit logs, on your scheduled retention boundary.
          </p>
        </div>
      </Card>
    </div>
  )
}

// ─── Primitives ────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: typeof Building2
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3 mb-4 pb-3 border-b border-border">
        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </Card>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-sm font-medium block mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function safeParse<T>(s: string | null | undefined): T {
  if (!s) return {} as T
  try { return JSON.parse(s) as T } catch { return {} as T }
}
