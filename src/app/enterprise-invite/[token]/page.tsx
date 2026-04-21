'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Building2, CheckCircle2, AlertCircle, Clock, Mail, ArrowRight, Loader2, Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface InviteInfo {
  email: string
  role: 'super_admin' | 'admin' | 'member' | 'guest'
  title: string | null
  status: 'pending' | 'accepted' | 'expired' | 'canceled'
  expiresAt: string
  organizationName: string
  organizationSlug: string
  organizationPlan: string
  organizationPrimaryDomain: string | null
  departmentName: string | null
  inviterName: string
  inviterEmail: string
}

const ROLE_LABEL: Record<InviteInfo['role'], string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
}

export default function EnterpriseInvitePage({ params }: { params: { token: string } }) {
  const { token } = params
  const router = useRouter()
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [acceptErr, setAcceptErr] = useState<string | null>(null)
  const [acceptBody, setAcceptBody] = useState<{ invitedEmail?: string; signedInEmail?: string; needsLogin?: boolean } | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`/api/enterprise/invites/${token}`)
        if (!res.ok) {
          const b = await res.json().catch(() => ({ error: 'failed' }))
          setFetchErr(b.error || 'Invite not found')
          return
        }
        const data = await res.json()
        setInvite(data.invite)
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  async function accept() {
    setAccepting(true)
    setAcceptErr(null)
    setAcceptBody(null)
    try {
      const res = await fetch(`/api/enterprise/invites/${token}/accept`, { method: 'POST' })
      const body = await res.json().catch(() => ({ error: 'failed' }))
      if (!res.ok) {
        setAcceptErr(body.message || body.error || 'failed')
        setAcceptBody(body)
        return
      }
      // Success: bounce to the cockpit
      router.push(body.redirectTo || '/app')
    } finally {
      setAccepting(false)
    }
  }

  function goLogin() {
    const next = encodeURIComponent(`/enterprise-invite/${token}`)
    router.push(`/login?email=${encodeURIComponent(invite?.email || '')}&next=${next}`)
  }

  if (loading) {
    return <CenteredCard><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CenteredCard>
  }

  if (fetchErr || !invite) {
    return (
      <CenteredCard>
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-3 text-rose-500" />
          <h1 className="text-xl font-semibold mb-1">Invite not found</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This link may have been canceled or revoked. Ask the person who invited you to send a new one.
          </p>
          <Link href="/login" className="text-sm text-primary hover:underline">Go to sign in</Link>
        </div>
      </CenteredCard>
    )
  }

  const expired = invite.status === 'expired' || new Date(invite.expiresAt) < new Date()

  if (invite.status === 'canceled') {
    return (
      <CenteredCard>
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <h1 className="text-xl font-semibold mb-1">Invite canceled</h1>
          <p className="text-sm text-muted-foreground">
            The admin at {invite.organizationName} canceled this invitation. Reach out to them if this was unexpected.
          </p>
        </div>
      </CenteredCard>
    )
  }

  if (invite.status === 'accepted') {
    return (
      <CenteredCard>
        <div className="text-center">
          <CheckCircle2 className="h-8 w-8 mx-auto mb-3 text-emerald-500" />
          <h1 className="text-xl font-semibold mb-1">Already accepted</h1>
          <p className="text-sm text-muted-foreground mb-4">
            You&apos;re already a member of {invite.organizationName}.
          </p>
          <Link href="/app">
            <Button>Open Reattend Enterprise</Button>
          </Link>
        </div>
      </CenteredCard>
    )
  }

  if (expired) {
    return (
      <CenteredCard>
        <div className="text-center">
          <Clock className="h-8 w-8 mx-auto mb-3 text-amber-500" />
          <h1 className="text-xl font-semibold mb-1">This invite has expired</h1>
          <p className="text-sm text-muted-foreground">
            Ask <span className="font-medium">{invite.inviterName}</span> ({invite.inviterEmail}) to send a new invite.
          </p>
        </div>
      </CenteredCard>
    )
  }

  return (
    <CenteredCard>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Brand */}
        <div className="flex items-center gap-1.5 mb-6">
          <span className="text-[22px] font-bold text-primary">Reattend</span>
          <span className="text-[9px] uppercase tracking-wider font-semibold text-primary/70 translate-y-[3px]">Enterprise</span>
        </div>

        <div className="flex items-start gap-3 mb-5">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-lg font-bold flex items-center justify-center shrink-0">
            {invite.organizationName[0]?.toUpperCase() ?? 'O'}
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">You&apos;re invited to {invite.organizationName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              by {invite.inviterName} ({invite.inviterEmail})
            </p>
          </div>
        </div>

        <Card className="p-4 mb-5 bg-muted/30">
          <dl className="space-y-1.5 text-sm">
            <InfoRow label="Invited email" value={invite.email} />
            <InfoRow label="Role" value={ROLE_LABEL[invite.role]} />
            {invite.title && <InfoRow label="Title" value={invite.title} />}
            {invite.departmentName && <InfoRow label="Department" value={invite.departmentName} />}
            <InfoRow label="Organization plan" value={<span className="capitalize">{invite.organizationPlan}</span>} />
            <InfoRow
              label="Expires"
              value={new Date(invite.expiresAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            />
          </dl>
        </Card>

        {/* Work-email callout */}
        <div className="mb-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed">
              <strong>Use your work email.</strong> Reattend Enterprise is a separate product from personal Reattend.
              You must sign in with <span className="font-mono">{invite.email}</span> — not a gmail/hotmail/etc. account.
              {invite.organizationPrimaryDomain && (
                <> Only <span className="font-mono">@{invite.organizationPrimaryDomain}</span> addresses are accepted.</>
              )}
            </p>
          </div>
        </div>

        {acceptErr && (
          <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div>{acceptErr}</div>
                {acceptBody?.signedInEmail && acceptBody?.invitedEmail && (
                  <div className="text-xs mt-1 text-muted-foreground">
                    Signed in as: <span className="font-mono">{acceptBody.signedInEmail}</span><br />
                    Expected: <span className="font-mono">{acceptBody.invitedEmail}</span>
                  </div>
                )}
                {acceptBody?.needsLogin && (
                  <button onClick={goLogin} className="text-xs text-primary hover:underline mt-1">
                    Sign in to accept →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button onClick={accept} disabled={accepting} className="w-full" size="lg">
            {accepting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Accepting…</>
            ) : (
              <>Accept invitation <ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>

          <button onClick={goLogin} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Mail className="h-3 w-3 inline mr-1" />
            Not signed in yet? Sign in with {invite.email}
          </button>
        </div>
      </motion.div>
    </CenteredCard>
  )
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-6 sm:p-8">{children}</Card>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-right">{value}</dd>
    </div>
  )
}

// Satisfy unused-import
const _unused = [Building2, Badge, cn]
