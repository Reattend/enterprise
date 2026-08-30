'use client'

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
  hasOrg: boolean
  isAdmin: boolean
  tier: 'free' | 'professional' | 'enterprise'
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'expired'
  trialEndsAt: string | null
  seats: { current: number; cap: number | null }
  price: number
}

export default function BillingPage() {
  const [data, setData] = useState<BillingStatus | null>(null)
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
      <CardContent>
        <Button asChild>
          <Link href="/app/settings">Manage your AI key</Link>
        </Button>
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
          <Card>
            <CardHeader>
              <CardTitle>Want Reattend to run the AI for you?</CardTitle>
              <CardDescription>
                Managed is for organizations - we provision and govern the key centrally, with admin-set rate limits.
                It&apos;s scoped per org. Create an organization to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="/app/admin/onboarding">Create an organization</Link>
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
    </div>
  )
}
