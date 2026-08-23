'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2, Check, X, ShieldAlert, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// Mirror of docs/permissions.md. Kept in sync by the test suite - if a
// permission is added to the matrix, add it here too so the toggle UI shows it.
const PERMISSIONS: Array<{ key: string; label: string; description: string; group: 'org' | 'records' | 'tooling' }> = [
  { key: 'org.manage',                 label: 'Org settings',          description: 'Edit org settings, billing, SSO. Owner-only by default.', group: 'org' },
  { key: 'org.members.manage',         label: 'Manage members',        description: 'Invite, remove, change roles for any org member.', group: 'org' },
  { key: 'org.audit.read',             label: 'Read audit log',        description: 'Read the org-wide hash-chained audit log.', group: 'org' },
  { key: 'org.departments.manage',     label: 'Manage departments',    description: 'Create / rename / delete departments and the org tree.', group: 'org' },
  { key: 'policies.manage',            label: 'Manage policies',       description: 'Create, edit, publish org policies.', group: 'org' },
  { key: 'agents.manage',              label: 'Manage agents',         description: 'Create, edit, publish AI agents and mint API keys.', group: 'tooling' },
  { key: 'decisions.manage',           label: 'Manage decisions',      description: 'Create, edit, reverse decisions in the decision log.', group: 'records' },
  { key: 'records.share.manage',       label: 'Share records',         description: 'Add or remove explicit shares on a record.', group: 'records' },
  { key: 'records.visibility.change',  label: 'Change visibility',     description: 'Move a record between private/team/dept/org.', group: 'records' },
  { key: 'records.verify',             label: 'Verify records',        description: 'Mark a record as verified + set re-verify cadence.', group: 'records' },
  { key: 'graph.links.manage',         label: 'Manage graph links',    description: 'Draw or delete edges between records on the graph.', group: 'records' },
  { key: 'wiki.manage',                label: 'Manage wiki',           description: 'Create / edit / delete org wiki pages.', group: 'tooling' },
  { key: 'integrations.manage',        label: 'Manage integrations',   description: 'Connect / disconnect Nango integrations.', group: 'tooling' },
  { key: 'analytics.read',             label: 'Read analytics',        description: 'View org-wide analytics dashboards.', group: 'tooling' },
  { key: 'compose.use',                label: 'Use compose',           description: 'Use email-reply / broadcast composers.', group: 'tooling' },
  { key: 'calendar.write',             label: 'Write calendar',        description: 'Create or edit calendar events.', group: 'tooling' },
]

interface Override {
  id: string
  permissionKey: string
  scope: string | null
  granted: boolean
  reason: string | null
  createdAt: string
}

interface MemberInfo {
  userId: string
  email: string
  name: string
  role: string
  departments: Array<{ id: string; name: string; role: string }>
}

interface Snapshot {
  orgRole: string
  orgWide: string[]
  byDepartment: Record<string, string[]>
}

export default function PermissionsPage({ params }: { params: { orgId: string; userId: string } }) {
  const { orgId, userId } = params
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [overrides, setOverrides] = useState<Override[]>([])
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [reasonByKey, setReasonByKey] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    setErr(null)
    try {
      const [mRes, oRes, sRes] = await Promise.all([
        fetch(`/api/enterprise/organizations/${orgId}/members`),
        fetch(`/api/enterprise/organizations/${orgId}/members/${userId}/overrides`),
        fetch(`/api/enterprise/organizations/${orgId}/permissions/me`),
      ])
      if (mRes.ok) {
        const m = await mRes.json()
        const found = (m.members || []).find((x: MemberInfo) => x.userId === userId)
        setMember(found ?? null)
      }
      if (oRes.ok) {
        const o = await oRes.json()
        setOverrides(o.overrides || [])
      }
      if (sRes.ok) {
        // Note: this snapshot is the CALLER's, not the target user's. We use
        // it to confirm caller has org.members.manage; if not, the API blocks
        // anyway. Fetched only for the "you can't manage yourself" check below.
        const s = await sRes.json()
        setSnapshot(s)
      }
    } catch {
      setErr('Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }, [orgId, userId])

  useEffect(() => { load() }, [load])

  async function setOverride(permissionKey: string, granted: boolean) {
    setBusyKey(permissionKey)
    setErr(null)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/members/${userId}/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissionKey,
          granted,
          reason: reasonByKey[permissionKey]?.trim() || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErr(body.error || 'Failed')
        return
      }
      await load()
    } finally {
      setBusyKey(null)
    }
  }

  async function clearOverride(permissionKey: string) {
    setBusyKey(permissionKey)
    setErr(null)
    try {
      const res = await fetch(
        `/api/enterprise/organizations/${orgId}/members/${userId}/overrides?permissionKey=${encodeURIComponent(permissionKey)}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErr(body.error || 'Failed')
        return
      }
      await load()
    } finally {
      setBusyKey(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }
  if (!member) {
    return (
      <div className="space-y-3">
        <Link href={`/app/admin/${orgId}/members`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to members
        </Link>
        <Card className="p-6 text-sm text-muted-foreground">Member not found.</Card>
      </div>
    )
  }

  const overridesByKey = new Map<string, Override>()
  for (const o of overrides.filter((x) => x.scope === null)) overridesByKey.set(o.permissionKey, o)

  // Resolve effective state for each permission row.
  // Note: we only show the user's ROLE-default state below; we don't have
  // their snapshot here (they're not the caller). The label text is purely
  // descriptive. The "Effective" badge below is best-effort.
  const ROLE_DEFAULTS_PRETTY: Record<string, string[]> = {
    super_admin: PERMISSIONS.map((p) => p.key),
    admin: PERMISSIONS.filter((p) => p.key !== 'org.manage').map((p) => p.key),
    member: ['org.read', 'compose.use', 'calendar.write'],
    guest: ['org.read'],
  }
  const roleGrants = new Set(ROLE_DEFAULTS_PRETTY[member.role] || [])

  function effective(permKey: string): 'role' | 'granted-override' | 'revoked-override' | 'none' {
    const o = overridesByKey.get(permKey)
    if (o && !o.granted) return 'revoked-override'
    if (o && o.granted) return 'granted-override'
    if (roleGrants.has(permKey)) return 'role'
    return 'none'
  }

  const groups: Array<{ id: 'org' | 'records' | 'tooling'; label: string }> = [
    { id: 'org', label: 'Organization' },
    { id: 'records', label: 'Records & decisions' },
    { id: 'tooling', label: 'Tooling & integrations' },
  ]

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <Link href={`/app/admin/${orgId}/members`} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to members
        </Link>
        <h1 className="text-xl font-semibold">{member.name || member.email}</h1>
        <p className="text-sm text-muted-foreground">{member.email} · <span className="capitalize">{member.role.replace('_', ' ')}</span></p>
      </div>

      <Card className="p-4 bg-violet-500/5 border-violet-500/20">
        <div className="flex items-start gap-2 text-sm">
          <Info className="h-4 w-4 mt-0.5 text-violet-600 dark:text-violet-400 flex-shrink-0" />
          <div>
            <p className="font-medium">Per-user overrides</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Grant a permission this user wouldn&apos;t normally have, or revoke one their role grants.
              Use this for one-off cases (e.g. COO who isn&apos;t admin but needs audit access).
              Don&apos;t invent a new role for one customer - override instead. See <Link href="/docs/permissions" className="underline">docs/permissions.md</Link>.
            </p>
          </div>
        </div>
      </Card>

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
          <ShieldAlert className="h-4 w-4" />
          {err}
        </div>
      )}

      {groups.map((group) => (
        <Card key={group.id} className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</h2>
          </div>
          <ul className="divide-y divide-border">
            {PERMISSIONS.filter((p) => p.group === group.id).map((p) => {
              const eff = effective(p.key)
              const isBusy = busyKey === p.key
              const hasOverride = overridesByKey.has(p.key)
              return (
                <li key={p.key} className="p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs">{p.key}</span>
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded font-medium',
                          eff === 'role' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                          eff === 'granted-override' && 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
                          eff === 'revoked-override' && 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
                          eff === 'none' && 'bg-muted text-muted-foreground',
                        )}
                      >
                        {eff === 'role' && '✓ via role'}
                        {eff === 'granted-override' && '✓ override grant'}
                        {eff === 'revoked-override' && '✗ override revoke'}
                        {eff === 'none' && '- not granted'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.label} - {p.description}</p>
                    {hasOverride && (
                      <p className="text-[10px] text-muted-foreground mt-1 italic">
                        Override: {overridesByKey.get(p.key)!.granted ? 'granted' : 'revoked'}
                        {overridesByKey.get(p.key)!.reason && ` · ${overridesByKey.get(p.key)!.reason}`}
                      </p>
                    )}
                    {!hasOverride && (
                      <Input
                        value={reasonByKey[p.key] || ''}
                        onChange={(e) => setReasonByKey((r) => ({ ...r, [p.key]: e.target.value }))}
                        placeholder="Reason (optional)"
                        className="h-7 text-xs mt-1.5 max-w-md"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {hasOverride ? (
                      <Button size="sm" variant="outline" disabled={isBusy} onClick={() => clearOverride(p.key)} className="h-7 text-xs">
                        {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Clear'}
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy || roleGrants.has(p.key)}
                          onClick={() => setOverride(p.key, true)}
                          className="h-7 text-xs"
                          title={roleGrants.has(p.key) ? 'Already granted by role' : 'Grant this permission'}
                        >
                          {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Grant
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy || !roleGrants.has(p.key)}
                          onClick={() => setOverride(p.key, false)}
                          className="h-7 text-xs text-rose-600 dark:text-rose-400 border-rose-500/30"
                          title={!roleGrants.has(p.key) ? 'Not granted by role - nothing to revoke' : 'Revoke this permission'}
                        >
                          {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                          Revoke
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      ))}
    </div>
  )
}
