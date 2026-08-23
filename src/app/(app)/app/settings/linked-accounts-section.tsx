'use client'

// Linked accounts section on /app/settings.
//
// Lets the signed-in user:
//   - See accounts already linked to this one (with Remove buttons)
//   - Send a link request to a new email (the OTP goes to that email,
//     to be entered on THAT account - receiver-confirms model)
//   - Confirm an incoming OTP if someone else requested to link to
//     this account
//
// Companion to the topbar switcher in components/app/sidebar.tsx; the
// data comes from /api/me/linked-accounts and the four other endpoints
// in /api/auth/link/*.

import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2, UserCircle2, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface LinkedAccount {
  userId: string
  email: string
  name: string | null
  linkedAt: string | null
}

export function LinkedAccountsSection() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([])
  const [loading, setLoading] = useState(true)

  // Send-request state
  const [requestEmail, setRequestEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [pendingTarget, setPendingTarget] = useState<string | null>(null)

  // Confirm-incoming state
  const [confirmCode, setConfirmCode] = useState('')
  const [confirming, setConfirming] = useState(false)

  // Removing state - userId being removed
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    try {
      const res = await fetch('/api/me/linked-accounts')
      if (!res.ok) return
      const data = await res.json() as { accounts?: LinkedAccount[] }
      setAccounts(data.accounts || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!requestEmail.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/auth/link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: requestEmail.trim() }),
      })
      const data = await res.json() as { ok?: boolean; message?: string; error?: string; dev?: string }
      if (!res.ok) {
        toast.error(data.message || data.error || 'Failed to send request')
        return
      }
      setPendingTarget(requestEmail.trim())
      setRequestEmail('')
      toast.success(data.message || 'Request sent - check the other account\'s inbox.')
      if (data.dev) {
        toast.info(`Dev mode code: ${data.dev}`, { duration: 30000 })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send request')
    } finally {
      setSending(false)
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!confirmCode.trim() || confirming) return
    setConfirming(true)
    try {
      const res = await fetch('/api/auth/link/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: confirmCode.trim() }),
      })
      const data = await res.json() as { ok?: boolean; linkedTo?: { email: string }; error?: string; message?: string }
      if (!res.ok) {
        toast.error(data.message || data.error || 'Failed to confirm')
        return
      }
      toast.success(data.linkedTo
        ? `Linked with ${data.linkedTo.email}.`
        : 'Accounts linked.')
      setConfirmCode('')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm')
    } finally {
      setConfirming(false)
    }
  }

  async function handleRemove(account: LinkedAccount) {
    if (removing) return
    if (!confirm(`Unlink ${account.email}? You can re-link later, but each side will need to verify again.`)) return
    setRemoving(account.userId)
    try {
      const res = await fetch('/api/me/linked-accounts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: account.userId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Failed to remove link')
        return
      }
      toast.success(`Unlinked from ${account.email}`)
      setAccounts((prev) => prev.filter((a) => a.userId !== account.userId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove link')
    } finally {
      setRemoving(null)
    }
  }

  return (
    <section
      id="linked-accounts"
      className="mb-8 rounded-lg border bg-card"
    >
      <div className="border-b p-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <UserCircle2 className="h-4 w-4 text-muted-foreground" />
          Linked accounts
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Link another Reattend account (e.g. your work email) so you can switch between them in one tab - no signing in again. Each account stays structurally separate; linking is a UI convenience, not a data merge.
        </p>
      </div>

      {/* Existing links */}
      <div className="p-5 border-b">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Linked
        </h3>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accounts linked yet.</p>
        ) : (
          <ul className="space-y-2">
            {accounts.map((acc) => (
              <li
                key={acc.userId}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                <UserCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{acc.name || acc.email}</div>
                  {acc.name && (
                    <div className="text-xs text-muted-foreground truncate">{acc.email}</div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={removing === acc.userId}
                  onClick={() => handleRemove(acc)}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  {removing === acc.userId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Unlink
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Send a request */}
      <div className="p-5 border-b">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Link a new account
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Enter the email of the other Reattend account. We'll send a 6-digit code to that inbox; the owner needs to sign in <em>there</em> and enter the code below to confirm.
        </p>
        <form onSubmit={handleSendRequest} className="flex gap-2">
          <Input
            type="email"
            value={requestEmail}
            onChange={(e) => setRequestEmail(e.target.value)}
            placeholder="other-account@example.com"
            required
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={!requestEmail.trim() || sending}>
            {sending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Mail className="h-3.5 w-3.5 mr-1.5" />}
            Send code
          </Button>
        </form>
        {pendingTarget && (
          <p className="mt-3 text-xs text-muted-foreground">
            Code sent to <b>{pendingTarget}</b>. Sign in to that account and confirm there. The code expires in 10 minutes.
          </p>
        )}
      </div>

      {/* Confirm an incoming request */}
      <div className="p-5">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Have a code from another account?
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          If someone sent a link request to <em>this</em> account, enter the 6-digit code here to confirm.
        </p>
        <form onSubmit={handleConfirm} className="flex gap-2">
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={confirmCode}
            onChange={(e) => setConfirmCode(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="123456"
            required
            disabled={confirming}
            className="flex-1 font-mono tracking-[0.3em] text-center"
          />
          <Button type="submit" disabled={confirmCode.length !== 6 || confirming}>
            {confirming ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />}
            Confirm link
          </Button>
        </form>
      </div>
    </section>
  )
}
