'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, AlertCircle, Check, UserX, Mail, RefreshCw, X, Copy, Clock } from 'lucide-react'

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

  async function load() {
    setErr(null)
    const [mRes, iRes] = await Promise.all([
      fetch(`/api/enterprise/organizations/${orgId}/members`),
      fetch(`/api/enterprise/organizations/${orgId}/invites`),
    ])
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
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          Add member
        </h2>
        <form onSubmit={submitInvite} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
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
            className="sm:col-span-2 h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as OrgRole)}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
            <option value="guest">Guest</option>
          </select>
          <Button type="submit" disabled={inviteBusy || !inviteEmail.trim()} className="sm:col-span-2">
            {inviteBusy ? 'Adding…' : 'Add'}
          </Button>
        </form>
        {notice && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            {notice}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Invites require a work email — personal providers (gmail, hotmail, etc.) are rejected.
          New invitees receive an email with a magic-link to accept and join.
        </p>
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
          <div className="p-4 text-sm text-muted-foreground">No members yet.</div>
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
