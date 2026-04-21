'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollText, Filter, AlertCircle, Eye, Edit, Trash2, Shield, Key, LogIn, PlusCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditEntry {
  id: string
  organizationId: string
  departmentId: string | null
  userId: string | null
  userEmail: string
  action: string
  resourceType: string | null
  resourceId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: string | null
  createdAt: string
}

const ACTION_ICON: Record<string, typeof Eye> = {
  query: Search,
  read: Eye,
  create: PlusCircle,
  update: Edit,
  delete: Trash2,
  export: ScrollText,
  login: LogIn,
  logout: LogIn,
  sso_login: Shield,
  role_change: Key,
  permission_change: Key,
  member_invite: PlusCircle,
  member_remove: Trash2,
  decision_create: PlusCircle,
  decision_reverse: Edit,
  admin_action: Shield,
  integration_connect: PlusCircle,
  integration_disconnect: Trash2,
}

const ACTION_OPTIONS = [
  '', 'query', 'read', 'create', 'update', 'delete', 'export',
  'login', 'sso_login', 'role_change', 'member_invite', 'member_remove',
  'permission_change', 'decision_create', 'decision_reverse', 'admin_action',
  'integration_connect', 'integration_disconnect',
]

export default function AuditPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [action, setAction] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [selected, setSelected] = useState<AuditEntry | null>(null)

  async function load() {
    setErr(null)
    const q = new URLSearchParams()
    if (action) q.set('action', action)
    if (resourceType) q.set('resourceType', resourceType)
    q.set('limit', '200')
    const res = await fetch(`/api/enterprise/organizations/${orgId}/audit?${q.toString()}`)
    if (!res.ok) {
      setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      return
    }
    const data = await res.json()
    setEntries(data.entries)
  }

  useEffect(() => {
    load()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  // User email filter is client-side since we don't have a userEmail filter in the API
  // (we filter by userId server-side, but matching by email typed in UI is easier client-side).
  const filtered = useMemo(() => {
    if (!entries) return null
    const needle = userEmail.trim().toLowerCase()
    if (!needle) return entries
    return entries.filter((e) => e.userEmail.toLowerCase().includes(needle))
  }, [entries, userEmail])

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <select
            className="sm:col-span-3 h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a ? a.replace('_', ' ') : 'All actions'}
              </option>
            ))}
          </select>
          <Input
            className="sm:col-span-4"
            placeholder="Filter by user email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />
          <Input
            className="sm:col-span-3"
            placeholder="Resource type (e.g. record)"
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
          />
          <Button onClick={load} className="sm:col-span-2">
            Apply
          </Button>
        </div>
      </Card>

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Audit log {filtered && <span className="text-muted-foreground font-normal">({filtered.length})</span>}
          </h2>
          <div className="flex items-center gap-2">
            <a
              href={`/api/enterprise/organizations/${orgId}/audit/export?format=csv`}
              className="text-xs text-primary hover:underline"
              download
            >
              Export CSV (tamper-evident)
            </a>
            <span className="text-xs text-muted-foreground">· Immutable · retention applies</span>
          </div>
        </div>
        {filtered === null ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">
            No events match these filters.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((e) => {
              const Icon = ACTION_ICON[e.action] || ScrollText
              return (
                <li
                  key={e.id}
                  className={cn(
                    'px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-muted/40',
                    selected?.id === e.id && 'bg-muted/60',
                  )}
                  onClick={() => setSelected(e)}
                >
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{e.userEmail}</span>
                      <span className="text-muted-foreground"> · {e.action.replace('_', ' ')}</span>
                      {e.resourceType && (
                        <span className="text-muted-foreground"> · {e.resourceType}</span>
                      )}
                    </div>
                    {e.resourceId && (
                      <div className="text-xs text-muted-foreground truncate">{e.resourceId}</div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {selected && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Event detail</h3>
            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <Kv k="Action" v={selected.action.replace('_', ' ')} />
            <Kv k="At" v={new Date(selected.createdAt).toLocaleString()} />
            <Kv k="User" v={selected.userEmail} />
            <Kv k="User ID" v={selected.userId ?? '—'} />
            <Kv k="Resource" v={selected.resourceType ?? '—'} />
            <Kv k="Resource ID" v={selected.resourceId ?? '—'} />
            <Kv k="Department" v={selected.departmentId ?? '—'} />
            <Kv k="IP" v={selected.ipAddress ?? '—'} />
            <Kv k="User-Agent" v={selected.userAgent ?? '—'} />
          </div>
          {selected.metadata && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-1">Metadata</div>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(selected.metadata), null, 2)
                  } catch {
                    return selected.metadata
                  }
                })()}
              </pre>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{k}</span>
      <span className="font-mono text-xs break-all">{v}</span>
    </div>
  )
}
