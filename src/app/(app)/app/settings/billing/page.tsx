'use client'

import { useAppStore } from '@/stores/app-store'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import { KeyRound, Loader2, Clock3, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// /app/settings/billing
//
// Two audiences:
//   1. Personal / legacy no-org accounts - BYOK-only, nothing to check out.
//      Always shown the plain status card (unchanged since the 2026-08-28
//      BYOK pivot).
//   2. Org accounts, admin-only (sidebar hides this link for non-admin
//      members, see sidebar.tsx) - real Managed billing: start the 7-day
//      no-card trial, convert to paid via Paddle checkout, or talk to
//      sales. Reintroduced 2026-08-29 alongside the self-serve Managed
//      trial - see today.md for why this page went from "nothing to buy"
//      back to a real checkout UI.
//
// Non-admin org members who land here directly (no link points here for
// them, but nothing stops a bookmark/direct nav) get a read-only status
// view - billing is an org-wide decision, not a per-member one.

declare global {
  interface Window { Paddle?: any }
}

interface BillingStatus {
  byok?: { provider: 'anthropic' | 'openai' | 'gemini'; keyLast4: string | null; status: string } | null
  trialDays?: number
  hasOrg: boolean
  isAdmin: boolean
  tier: 'free' | 'professional' | 'enterprise'
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired'
  trialEndsAt: string | null
  seats: { current: number; cap: number | null }
  price: number
}

const PROVIDER_LABEL: Record<string, string> = { anthropic: 'Anthropic', openai: 'OpenAI', gemini: 'Gemini' }

// Comes from /api/billing/status so it always matches the Paddle price.
// Personal card fallback only, used if /api/billing/status fails. Personal
// is 7 to match the Paddle price's trial_period; orgs get 15 from the API.
const TRIAL_DAYS_FALLBACK = 7

export default function BillingPage() {
  const [data, setData] = useState<BillingStatus | null>(null)
  const [txns, setTxns] = useState<Array<{ id: string; status: string; createdAt: string; billedAt: string | null; total: string | null; currency: string | null }>>([])
  useEffect(() => {
    fetch('/api/billing/transactions').then((r) => r.json()).then((d) => setTxns(d.transactions || [])).catch(() => { /* no receipts is normal */ })
  }, [])
  const [loading, setLoading] = useState(true)
  const [startingTrial, setStartingTrial] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [paddleReady, setPaddleReady] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch('/api/billing/status')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  function initPaddle() {
    if (!window.Paddle || paddleReady) return
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!token) return
    window.Paddle.Environment.set(process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox' ? 'sandbox' : 'production')
    window.Paddle.Initialize({ token })
    setPaddleReady(true)
  }

  async function handleStartTrial() {
    if (startingTrial) return
    setStartingTrial(true)
    try {
      const res = await fetch('/api/billing/start-trial', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.message || body.error || 'Could not start the trial')
        return
      }
      toast.success('7-day Managed trial started - no card needed')
      fetchStatus()
    } catch {
      toast.error('Network error - try again')
    } finally {
      setStartingTrial(false)
    }
  }

  async function handleCheckout() {
    if (checkingOut || !data) return
    if (!window.Paddle || !paddleReady) {
      toast.error('Payment form is still loading - try again in a moment')
      return
    }
    setCheckingOut(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'professional', cycle: 'monthly', seats: Math.max(1, data.seats.current) }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.message || body.error || 'Could not start checkout')
        return
      }
      window.Paddle.Checkout.open({
        transactionId: body.transactionId,
        settings: { successUrl: `${window.location.origin}/app/settings/billing?success=1` },
      })
    } catch {
      toast.error('Network error - try again')
    } finally {
      setCheckingOut(false)
    }
  }

  const activeOrgId = useAppStore((st) => st.activeEnterpriseOrgId)

  // Org keys are admin-only and live in the Control Room; personal keys live
  // in the user's own Settings. One card, two destinations.
  const keyHref = data?.hasOrg && activeOrgId
    ? `/app/admin/${activeOrgId}/settings#ai-provider`
    : '/app/settings?tab=ai-provider'

  const byokCard = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          Bring your own key
        </CardTitle>
        <CardDescription>
          Connect your own Anthropic, OpenAI, or Gemini key and Reattend runs on it - unlimited questions,
          unlimited retention, no seat cost, nothing billed by Reattend. Your own vendor bill is the only cost.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.byok ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className={`inline-block h-2 w-2 rounded-full ${data.byok.status === 'valid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="font-medium">{PROVIDER_LABEL[data.byok.provider] || data.byok.provider}</span>
              {data.byok.keyLast4 && <span className="text-muted-foreground font-mono text-xs">····{data.byok.keyLast4}</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.byok.status === 'valid'
                ? 'Connected. Questions and captures run on this key at no cost from Reattend.'
                : 'This key was rejected by the provider the last time it was used. Update it to keep AI features working.'}
            </p>
            <Button asChild variant="outline">
              <Link href={keyHref}>{data.byok.status === 'valid' ? 'Manage key' : 'Fix key'}</Link>
            </Button>
          </>
        ) : (
          <Button asChild>
            <Link href={keyHref}>Connect your AI key</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" onLoad={initPaddle} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {data?.hasOrg ? 'Managed AI for your whole org, or bring your own key.' : 'Reattend is free forever - bring your own AI key.'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading billing status…
        </div>
      ) : !data?.hasOrg ? (
        <>
          {byokCard}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Managed</CardTitle>
              <CardDescription>
                No key to manage - Reattend runs the AI for you. {data?.trialDays ?? TRIAL_DAYS_FALLBACK}-day free trial, no card, then $9/month. 800 AI questions a month; bring your own key any time to go unlimited for free.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.tier === 'professional' || data?.tier === 'enterprise' ? (
                <>
                  <div className="text-sm">
                    <span className="font-medium">Managed is active</span>
                    {data.status === 'trialing' && data.trialEndsAt && (
                      <span className="text-muted-foreground"> · trial ends {new Date(data.trialEndsAt).toLocaleDateString()}</span>
                    )}
                  </div>
                  {data.status === 'trialing' ? (
                    <Button onClick={handleCheckout}>Subscribe - $9/mo</Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Manage your subscription from the receipt email.</span>
                  )}
                </>
              ) : data?.trialEndsAt ? (
                <Button onClick={handleCheckout}>Subscribe - $9/mo</Button>
              ) : (
                <Button onClick={handleStartTrial}>Start {data?.trialDays ?? TRIAL_DAYS_FALLBACK}-day free trial</Button>
              )}
              <p className="text-[11px] text-muted-foreground">No card required to start · cancel anytime</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Using Reattend with a team?</CardTitle>
              <CardDescription>
                Organization plans add shared memory, decision logs, roles and admin controls, and are set up with us
                rather than self-serve. Your personal memory stays yours either way.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="/pricing">Talk to us about teams</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      ) : !data.isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Managed by your org admins</CardTitle>
            <CardDescription>
              Current plan: <span className="font-medium capitalize">{data.tier === 'professional' ? 'Managed' : data.tier}</span>
              {data.status === 'trialing' && ' (trial)'}. Only an org admin can change billing - ask one if you need
              something adjusted.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {data.tier === 'free' && (
            <Card>
              <CardHeader>
                <CardTitle>Go Managed</CardTitle>
                <CardDescription>
                  We run the AI for your whole org - no key for employees to manage. $15/seat/mo, self-serve up to 99
                  seats. Start with a 7-day trial, no card needed.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button onClick={handleStartTrial} disabled={startingTrial}>
                  {startingTrial ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                  Start 7-day free trial
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://calendly.com/pb-reattend/30min" target="_blank" rel="noreferrer">Talk to sales</a>
                </Button>
              </CardContent>
            </Card>
          )}

          {data.tier === 'professional' && data.status === 'trialing' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-blue-600" />
                  Managed trial active
                </CardTitle>
                <CardDescription>
                  {data.trialEndsAt && `Ends ${new Date(data.trialEndsAt).toLocaleDateString()}. `}
                  Subscribe any time to keep AI access after the trial - $15/seat/mo, billed for {Math.max(1, data.seats.current)} seat{data.seats.current === 1 ? '' : 's'}.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button onClick={handleCheckout} disabled={checkingOut}>
                  {checkingOut ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                  Subscribe - $15/seat/mo
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://calendly.com/pb-reattend/30min" target="_blank" rel="noreferrer">Talk to sales</a>
                </Button>
              </CardContent>
            </Card>
          )}

          {data.tier === 'professional' && data.status === 'active' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  On Managed
                </CardTitle>
                <CardDescription>
                  $15/seat/mo · {data.seats.current} of {data.seats.cap ?? '∞'} seats used. To update your payment
                  method or cancel, talk to sales.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <a href="https://calendly.com/pb-reattend/30min" target="_blank" rel="noreferrer">Talk to sales</a>
                </Button>
              </CardContent>
            </Card>
          )}

          {data.status === 'past_due' && (
            <Card className="border-red-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  Payment failed
                </CardTitle>
                <CardDescription>
                  Your last charge didn&apos;t go through. AI access will pause soon - update payment or talk to sales.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3">
                <Button onClick={handleCheckout} disabled={checkingOut}>
                  {checkingOut ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : null}
                  Retry payment
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://calendly.com/pb-reattend/30min" target="_blank" rel="noreferrer">Talk to sales</a>
                </Button>
              </CardContent>
            </Card>
          )}

          {data.tier === 'enterprise' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  On Enterprise
                </CardTitle>
                <CardDescription>Sales-managed plan. Contact your account rep for changes.</CardDescription>
              </CardHeader>
            </Card>
          )}

          {byokCard}
        </>
      )}

      {txns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receipts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {txns.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-4 border-b last:border-0 py-2.5 text-sm">
                <div className="min-w-0">
                  <div>{new Date(t.billedAt || t.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                  <div className="text-xs text-muted-foreground capitalize">{t.status}</div>
                </div>
                <div className="tabular-nums">{t.total ? `${t.currency || 'USD'} ${(Number(t.total) / 100).toFixed(2)}` : '\u2014'}</div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/app/settings/billing/invoice/${t.id}`}>Receipt</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
