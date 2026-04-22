'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, AlertCircle, Check, UserX, Mail, RefreshCw, X, Copy, Clock, Upload, Download, FileSpreadsheet, Loader2, Users } from 'lucide-react'
import { DepartmentTreePicker, type DeptNode } from '@/components/enterprise/department-tree-picker'
import { EmptyState } from '@/components/ui/empty-state'

type OrgRole = 'super_admin' | 'admin' | 'member' | 'guest'

interface Member {
  membershipId: string
  userId: string
  role: OrgRole
  status: 'active' | 'suspended' | 'offboarded'
  title: string | null
  email: string
  name: string
  joinedAt: string
}

interface PendingInvite {
  id: string
  email: string
  role: OrgRole
  title: string | null
  status: 'pending' | 'accepted' | 'expired' | 'canceled'
  expiresAt: string
  createdAt: string
  inviterName: string | null
  inviterEmail: string | null
}

const ROLE_LABELS: Record<OrgRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
}

export default function MembersPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const [members, setMembers] = useState<Member[] | null>(null)
  const [invites, setInvites] = useState<PendingInvite[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrgRole>('member')
  const [inviteTitle, setInviteTitle] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [inviteDeptId, setInviteDeptId] = useState<string | null>(null)
  const [inviteDeptRole, setInviteDeptRole] = useState<'dept_head' | 'manager' | 'member' | 'viewer'>('member')
  const [departments, setDepartments] = useState<DeptNode[]>([])
  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  async function load() {
    setErr(null)
    const [mRes, iRes, dRes] = await Promise.all([
      fetch(`/api/enterprise/organizations/${orgId}/members`),
      fetch(`/api/enterprise/organizations/${orgId}/invites`),
      fetch(`/api/enterprise/organizations/${orgId}/departments`),
    ])
    if (dRes.ok) {
      const d = await dRes.json()
      setDepartments((d.departments || []).map((x: any) => ({
        id: x.id, name: x.name, kind: x.kind, parentId: x.parentId,
      })))
    }
    if (!mRes.ok) {
      setErr((await mRes.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      return
    }
    const m = await mRes.json()
    setMembers(m.members)
    if (iRes.ok) {
      const i = await iRes.json()
      setInvites(i.invites)
    }
  }

  async function cancelInvite(inviteId: string) {
    setErr(null)
    const res = await fetch(`/api/enterprise/organizations/${orgId}/invites?inviteId=${inviteId}`, { method: 'DELETE' })
    if (!res.ok) {
      setErr((await res.json().catch(() => ({ error: 'failed' }))).error || 'failed')
      return
    }
    await load()
  }

  async function resendInvite(inviteId: string) {
    setErr(null)
    setNotice(null)
    const res = await fetch(`/api/enterprise/organizations/${orgId}/invites/${inviteId}/resend`, { method: 'POST' })
    const body = await res.json().catch(() => ({ error: 'failed' }))
    if (!res.ok) {
      setErr(body.error || 'failed')
      return
    }
    setNotice(body.emailDelivered ? 'Invite email re-sent.' : 'Invite refreshed (email delivery failed — copy the link).')
    await load()
  }

  async function copyInviteLink(inviteId: string) {
    // We resend to refresh the token and grab the URL
    const res = await fetch(`/api/enterprise/organizations/${orgId}/invites/${inviteId}/resend`, { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body.acceptUrl) {
      await navigator.clipboard.writeText(body.acceptUrl)
      setNotice('Invite link copied to clipboard.')
    }
  }

  useEffect(() => {
    load()
  }, [orgId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function changeRole(m: Member, role: OrgRole) {
    setErr(null)
    const res = await fetch(`/api/enterprise/organizations/${orgId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: m.email, role }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'failed' }))
      setErr(body.error || 'failed')
      return
    }
    await load()
  }

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteBusy(true)
    setErr(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          title: inviteTitle.trim() || undefined,
          departmentId: inviteDeptId || undefined,
          deptRole: inviteDeptId ? inviteDeptRole : undefined,
        }),
      })
      const body = await res.json().catch(() => ({ error: 'failed' }))
      if (!res.ok) {
        setErr(body.error || (body.hint ? `${body.error} — ${body.hint}` : 'failed'))
        return
      }
      if (body.invited) {
        setNotice(
          body.emailDelivered
            ? `Invite email sent to ${body.email}. Link expires ${new Date(body.expiresAt).toLocaleDateString()}.`
            : `Invite created — email delivery failed. Copy the link: ${body.acceptUrl}`,
        )
      } else {
        setNotice(`Added ${body.email} as ${ROLE_LABELS[body.role as OrgRole]}`)
      }
      setInviteEmail('')
      setInviteTitle('')
      await load()
    } finally {
      setInviteBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            Add members
          </h2>
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-2.5 py-1 rounded ${mode === 'single' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={`px-2.5 py-1 rounded ${mode === 'bulk' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              Bulk CSV
            </button>
          </div>
        </div>

        {mode === 'single' ? (
          <>
            <form onSubmit={submitInvite} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <Input
                  className="sm:col-span-5"
                  type="email"
                  placeholder="email@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <Input
                  className="sm:col-span-3"
                  placeholder="Title (optional)"
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                />
                <select
                  className="sm:col-span-4 h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super admin</option>
                  <option value="guest">Guest</option>
                </select>
              </div>

              {/* Optional: assign to department + dept role */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                <div className="sm:col-span-8">
                  <label className="text-[11px] text-muted-foreground mb-1 block">Assign to department (optional)</label>
                  <DepartmentTreePicker
                    departments={departments}
                    value={inviteDeptId}
                    onChange={setInviteDeptId}
                    placeholder="Search depts / teams…"
                    maxHeightClass="max-h-48"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="text-[11px] text-muted-foreground mb-1 block">Dept role</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={inviteDeptRole}
                    onChange={(e) => setInviteDeptRole(e.target.value as any)}
                    disabled={!inviteDeptId}
                  >
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                    <option value="manager">Manager</option>
                    <option value="dept_head">Dept head</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {inviteDeptId ? 'Dept access inherits downward — a head sees all child depts.' : 'Pick a dept first.'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={inviteBusy || !inviteEmail.trim()}>
                  {inviteBusy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <UserPlus className="h-3.5 w-3.5 mr-1" />}
                  Invite
                </Button>
              </div>
            </form>

            {notice && (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                {notice}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Work email only — personal providers (gmail, hotmail, etc.) are rejected.
              New invitees get a magic-link email to accept.
            </p>
          </>
        ) : (
          <BulkInvitePanel orgId={orgId} departments={departments} onDone={load} />
        )}
      </Card>

      {/* Pending invites */}
      {invites && invites.filter((i) => i.status === 'pending').length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Pending invites
              <span className="text-muted-foreground font-normal">
                ({invites.filter((i) => i.status === 'pending').length})
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {invites
              .filter((i) => i.status === 'pending')
              .map((i) => (
                <li key={i.id} className="p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{i.email}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className="capitalize">{i.role.replace('_', ' ')}</span>
                      {i.title && <>· {i.title}</>}
                      <span>·</span>
                      <Clock className="h-3 w-3" />
                      <span>Expires {new Date(i.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => copyInviteLink(i.id)} title="Copy magic link">
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy link
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => resendInvite(i.id)} title="Resend email">
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Resend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelInvite(i.id)}
                      className="text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      )}

      {/* Recently expired invites (advisory) */}
      {invites && invites.filter((i) => i.status === 'expired').length > 0 && (
        <Card className="p-0 overflow-hidden border-amber-500/30">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Expired invites
              <span className="text-muted-foreground font-normal">
                ({invites.filter((i) => i.status === 'expired').length})
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {invites
              .filter((i) => i.status === 'expired')
              .slice(0, 5)
              .map((i) => (
                <li key={i.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{i.email}</div>
                    <div className="text-xs text-muted-foreground">Expired {new Date(i.expiresAt).toLocaleDateString()}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => resendInvite(i.id)}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Resend
                  </Button>
                </li>
              ))}
          </ul>
        </Card>
      )}

      {err && (
        <div className="flex items-center gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold">
            Members {members && <span className="text-muted-foreground font-normal">({members.length})</span>}
          </h2>
        </div>
        {members === null ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : members.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title="No one's here yet"
              description="Your org is empty. Invite your team so memories, decisions, and policies have people attached to them."
              action={{ label: 'Invite first member', onClick: () => {
                const el = document.querySelector<HTMLInputElement>('input[type="email"]')
                el?.focus()
              } }}
              secondary={{ label: 'Bulk invite via CSV', onClick: () => {
                const btn = document.querySelector<HTMLElement>('[data-bulk-invite-trigger]')
                btn?.click()
              } }}
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li key={m.membershipId} className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{m.name || m.email}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {m.email}{m.title ? ` · ${m.title}` : ''}
                  </div>
                </div>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={m.role}
                  onChange={(e) => changeRole(m, e.target.value as OrgRole)}
                  disabled={m.status === 'offboarded'}
                >
                  <option value="guest">Guest</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super admin</option>
                </select>
                <span
                  className={
                    'text-xs px-2 py-0.5 rounded capitalize ' +
                    (m.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground')
                  }
                >
                  {m.status}
                </span>
                {m.status === 'active' && (
                  <Link href={`/app/admin/${orgId}/members/${m.userId}/offboard`}>
                    <Button variant="outline" size="sm" className="text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-700">
                      <UserX className="h-3.5 w-3.5 mr-1" />
                      Offboard
                    </Button>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// ─── Bulk CSV invite ───────────────────────────────────────
// CSV columns accepted (header required, case-insensitive):
//   email (required), role, title, departmentPath, deptRole
// departmentPath uses "/" separators, e.g. "Engineering/Backend/Platform Team".
// The panel validates via dryRun before committing so the admin sees exactly
// what will happen.

type ParsedRow = {
  lineNumber: number
  email: string
  role?: string
  title?: string
  departmentPath?: string
  deptRole?: string
  // Resolved at commit time
  departmentId?: string
  parseError?: string
}

type BulkResult = {
  email: string
  status: 'invited' | 'added' | 'skipped' | 'failed'
  reason?: string
  acceptUrl?: string
  emailDelivered?: boolean
}

function BulkInvitePanel({
  orgId, departments, onDone,
}: {
  orgId: string
  departments: DeptNode[]
  onDone: () => void
}) {
  const [csvText, setCsvText] = useState('')
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [preview, setPreview] = useState<{ invited: number; added: number; skipped: number; failed: number } | null>(null)
  const [results, setResults] = useState<BulkResult[] | null>(null)

  const deptByPath = useState(() => {
    const byId = new Map(departments.map((d) => [d.id, d]))
    const paths = new Map<string, string>() // lowercased path → id
    const buildPath = (d: DeptNode): string => {
      const parts: string[] = []
      let cur: DeptNode | undefined = d
      while (cur) {
        parts.unshift(cur.name)
        cur = cur.parentId ? byId.get(cur.parentId) : undefined
      }
      return parts.join('/').toLowerCase()
    }
    for (const d of departments) {
      paths.set(buildPath(d), d.id)
      // Also map bare name → id for shorthand (when unique)
      if (!paths.has(d.name.toLowerCase())) paths.set(d.name.toLowerCase(), d.id)
    }
    return paths
  })[0]

  function parseCsv(text: string) {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) { setParsed([]); return }
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
    const rows: ParsedRow[] = []
    const emailIdx = header.indexOf('email')
    if (emailIdx < 0) {
      setParsed([{ lineNumber: 1, email: '', parseError: 'missing "email" header column' }])
      return
    }
    const roleIdx = header.indexOf('role')
    const titleIdx = header.indexOf('title')
    const pathIdx = header.indexOf('departmentpath')
    const deptRoleIdx = header.indexOf('deptrole')
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map((c) => c.trim())
      const email = cells[emailIdx] || ''
      if (!email) continue
      const departmentPath = pathIdx >= 0 ? cells[pathIdx] : undefined
      let departmentId: string | undefined
      let parseError: string | undefined
      if (departmentPath) {
        departmentId = deptByPath.get(departmentPath.toLowerCase())
        if (!departmentId) parseError = `dept path "${departmentPath}" not found`
      }
      rows.push({
        lineNumber: i + 1,
        email,
        role: roleIdx >= 0 ? cells[roleIdx] : undefined,
        title: titleIdx >= 0 ? cells[titleIdx] : undefined,
        departmentPath,
        deptRole: deptRoleIdx >= 0 ? cells[deptRoleIdx] : undefined,
        departmentId,
        parseError,
      })
    }
    setParsed(rows)
    setPreview(null)
    setResults(null)
  }

  async function runDryRun() {
    const validRows = parsed.filter((r) => !r.parseError && r.email)
    if (validRows.length === 0) return
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/members/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun: true,
          rows: validRows.map((r) => ({
            email: r.email, role: r.role, title: r.title,
            departmentId: r.departmentId, deptRole: r.deptRole,
          })),
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      setPreview(data.summary)
    } finally {
      setPreviewLoading(false)
    }
  }

  async function commit() {
    const validRows = parsed.filter((r) => !r.parseError && r.email)
    if (validRows.length === 0) return
    setCommitting(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/members/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: validRows.map((r) => ({
            email: r.email, role: r.role, title: r.title,
            departmentId: r.departmentId, deptRole: r.deptRole,
          })),
        }),
      })
      if (!res.ok) return
      const data = await res.json()
      setResults(data.results)
      setPreview(data.summary)
      onDone()
    } finally {
      setCommitting(false)
    }
  }

  function downloadTemplate() {
    const template = 'email,role,title,departmentPath,deptRole\njane@acme.com,member,Staff Engineer,Engineering/Backend,member\njohn@acme.com,admin,Director,Engineering,dept_head\n'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reattend-invite-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const errors = parsed.filter((r) => r.parseError).length
  const valid = parsed.filter((r) => !r.parseError).length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-3.5 w-3.5 mr-1" /> Download template
        </Button>
        <span className="text-[11px] text-muted-foreground">
          CSV columns: <code className="text-[10px] bg-muted px-1 rounded">email, role, title, departmentPath, deptRole</code>.
          departmentPath uses "/" — e.g. <code className="text-[10px] bg-muted px-1 rounded">Engineering/Backend</code>.
        </span>
      </div>

      <textarea
        value={csvText}
        onChange={(e) => { setCsvText(e.target.value); parseCsv(e.target.value) }}
        placeholder="Paste CSV here, or drop a file onto this textarea."
        rows={8}
        className="w-full rounded-md border border-input bg-background p-2 text-xs font-mono"
        onDragOver={(e) => e.preventDefault()}
        onDrop={async (e) => {
          e.preventDefault()
          const file = e.dataTransfer.files?.[0]
          if (file) {
            const text = await file.text()
            setCsvText(text)
            parseCsv(text)
          }
        }}
      />

      {parsed.length > 0 && (
        <div className="rounded-md border overflow-hidden">
          <div className="px-3 py-2 bg-muted/20 text-xs flex items-center gap-3 border-b">
            <FileSpreadsheet className="h-3 w-3 text-muted-foreground" />
            <span><strong>{valid}</strong> valid</span>
            {errors > 0 && <span className="text-red-600"><strong>{errors}</strong> parse errors</span>}
            {preview && (
              <span className="ml-auto text-muted-foreground">
                Dry run: <strong className="text-foreground">{preview.invited + preview.added}</strong> to process
                {preview.skipped > 0 && <>, {preview.skipped} skipped</>}
                {preview.failed > 0 && <>, <span className="text-red-600">{preview.failed} failed</span></>}
              </span>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto">
            {parsed.slice(0, 50).map((r) => (
              <div key={r.lineNumber} className="flex items-center gap-2 px-3 py-1 text-xs border-b last:border-b-0">
                <span className="text-muted-foreground w-6">{r.lineNumber}</span>
                <span className="flex-1 font-mono truncate">{r.email || '(blank)'}</span>
                <span className="text-muted-foreground">{r.role || 'member'}</span>
                {r.departmentPath && <span className="text-muted-foreground truncate">→ {r.departmentPath}</span>}
                {r.parseError ? (
                  <span className="text-red-600">{r.parseError}</span>
                ) : r.departmentId ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : null}
              </div>
            ))}
            {parsed.length > 50 && (
              <div className="px-3 py-1 text-[10px] text-muted-foreground text-center">
                …and {parsed.length - 50} more
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={runDryRun} disabled={valid === 0 || previewLoading}>
          {previewLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
          Preview
        </Button>
        <Button size="sm" onClick={commit} disabled={valid === 0 || committing}>
          {committing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
          Invite {valid} {valid === 1 ? 'person' : 'people'}
        </Button>
      </div>

      {results && (
        <div className="rounded-md border p-3 space-y-1 text-xs max-h-48 overflow-y-auto bg-muted/10">
          <div className="font-medium mb-2">Commit result</div>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={
                r.status === 'invited' || r.status === 'added' ? 'text-emerald-600' :
                r.status === 'skipped' ? 'text-yellow-600' :
                'text-red-600'
              }>
                {r.status === 'failed' ? '✗' : r.status === 'skipped' ? '○' : '✓'}
              </span>
              <span className="flex-1 font-mono truncate">{r.email}</span>
              <span className="text-muted-foreground">{r.reason || r.status}</span>
              {r.acceptUrl && (
                <button
                  onClick={() => { navigator.clipboard.writeText(r.acceptUrl!); setResults((prev) => prev) }}
                  className="text-primary hover:underline"
                >
                  <Copy className="h-3 w-3 inline" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
