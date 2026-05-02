'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, ExternalLink, Crown, Zap } from 'lucide-react'
import { toast } from 'sonner'

// /app/settings/billing — current plan + upgrade/manage CTAs.
//
// Reads /api/billing/me to know the user's tier and displays:
//   - Free  → "you're on Free, here's what you'd unlock"
//   - Trial → countdown + add-card CTA
//   - Paid  → seats, next bill date, manage-via-portal link
//
// Upgrade flow: opens the Paddle.js overlay with a fresh transaction ID
// minted by /api/billing/checkout. Manage flow: opens Paddle's hosted
// customer portal via /api/billing/portal.

declare global {
  interface Window {
    Paddle?: any
  }
}

interface Me {
  tier: 'free' | 'professional' | 'enterprise'
  status: string
  seatCount: number
  billingCycle: 'monthly' | 'annual' | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  paddleSubscriptionId: string | null
  aiQueriesUsed: number
  aiQueriesLimit: number  // -1 means unlimited
}

const PADDLE_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || ''

export default function BillingPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [paddleReady, setPaddleReady] = useState(false)
  const [acting, setActing] = useState<string | null>(null) // tier currently being upgraded

  useEffect(() => {
    fetch('/api/billing/me')
      .then(r => r.json())
      .then(data => setMe(data))
      .catch(() => setMe(null))
      .finally(() => setLoading(false))
  }, [])

  // Show success toast if Paddle bounced us back with ?success=1.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === '1') {
      toast.success('Subscription activated. Welcome aboard!')
      // Clean the URL so a refresh doesn't re-toast.
      window.history.replaceState({}, '', '/app/settings/billing')
    }
  }, [])

  // Initialize Paddle.js once the SDK script has loaded.
  function onPaddleLoaded() {
    if (!window.Paddle || paddleReady) return
    try {
      window.Paddle.Environment.set('production')
      window.Paddle.Initialize({
        token: PADDLE_TOKEN,
        eventCallback: (data: any) => {
          if (data?.name === 'checkout.completed') {
            // Webhook is the source of truth for the DB update; this is just
            // a UX bounce so the user sees confirmation faster.
            window.location.href = '/app/settings/billing?success=1'
          }
        },
      })
      setPaddleReady(true)
    } catch (err) {
      console.warn('Paddle init failed', err)
    }
  }

  async function startCheckout(tier: 'professional' | 'enterprise', cycle: 'monthly' | 'annual') {
    if (!paddleReady) {
      toast.error('Payment overlay didn\'t load yet — try again in a moment.')
      return
    }
    setActing(`${tier}-${cycle}`)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, cycle, seats: tier === 'enterprise' ? 5 : 1 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.transactionId) throw new Error(data.error || 'Checkout failed')
      window.Paddle.Checkout.open({
        transactionId: data.transactionId,
        settings: {
          theme: 'light',
          displayMode: 'overlay',
          successUrl: window.location.origin + '/app/settings/billing?success=1',
        },
      })
    } catch (err: any) {
      toast.error(err?.message || 'Could not start checkout')
    } finally {
      setActing(null)
    }
  }

  async function openPortal() {
    setActing('portal')
    try {
      const res = await fetch('/api/billing/portal')
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open portal')
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err?.message || 'Portal unavailable')
      setActing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!me) {
    return <div className="p-8 text-sm text-muted-foreground">Could not load billing info.</div>
  }

  const isPaid = me.tier !== 'free'
  const isTrial = me.status === 'trialing' || (me.trialEndsAt && new Date(me.trialEndsAt) > new Date() && !me.paddleSubscriptionId)
  const trialDaysLeft = me.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(me.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <>
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" onLoad={onPaddleLoaded} strategy="afterInteractive" />

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your plan, seats, and payment method.</p>
        </div>

        {/* Current plan */}
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current plan
                <Badge variant={isPaid ? 'default' : 'secondary'}>
                  {me.tier === 'free' && 'Free'}
                  {me.tier === 'professional' && 'Professional'}
                  {me.tier === 'enterprise' && 'Enterprise'}
                </Badge>
                {isTrial && <Badge variant="outline" className="text-amber-700 border-amber-300">Trial</Badge>}
              </CardTitle>
              <CardDescription>
                {me.tier === 'free' && 'Free forever for one user with limited capacity.'}
                {me.tier === 'professional' && 'Unlimited usage for individuals and small teams.'}
                {me.tier === 'enterprise' && 'Org-wide governance, audit, and SSO.'}
              </CardDescription>
            </div>
            {isPaid && (
              <Button variant="outline" size="sm" onClick={openPortal} disabled={acting === 'portal'}>
                {acting === 'portal' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ExternalLink className="h-3.5 w-3.5 mr-1.5" />}
                Manage subscription
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Seats" value={String(me.seatCount)} />
              <Stat
                label={isTrial ? 'Trial ends' : 'Next bill'}
                value={
                  isTrial ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left` :
                  me.currentPeriodEnd ? new Date(me.currentPeriodEnd).toLocaleDateString() :
                  '—'
                }
              />
            </div>
            {!isPaid && (
              <div className="pt-2 border-t border-border text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">AI questions this month</span>
                  <span className="font-medium">
                    {me.aiQueriesUsed} / {me.aiQueriesLimit < 0 ? '∞' : me.aiQueriesLimit}
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: me.aiQueriesLimit < 0 ? '100%' : `${Math.min(100, (me.aiQueriesUsed / me.aiQueriesLimit) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {isTrial && trialDaysLeft <= 7 && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-900 text-xs">
                Trial ends in {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'}. Add a card via Manage subscription to keep your plan, or you'll automatically downgrade to Free with all your data intact.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade options — only show what makes sense */}
        {!isPaid && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UpgradeCard
              tier="professional"
              icon={<Zap className="h-4 w-4" />}
              name="Professional"
              price="$19"
              priceUnit="/seat/month"
              annualPrice="$15.20"
              blurb="Unlimited everything for individuals and teams up to 10."
              bullets={[
                '1–10 seats',
                'Unlimited AI questions + retention',
                '200+ integrations',
                'Chrome extension auto-ingest',
                'Decision log + Time Machine',
              ]}
              acting={acting}
              onUpgrade={(cycle) => startCheckout('professional', cycle)}
              paddleReady={paddleReady}
              featured
            />
            <UpgradeCard
              tier="enterprise"
              icon={<Crown className="h-4 w-4" />}
              name="Enterprise"
              price="$29"
              priceUnit="/seat/month"
              annualPrice="$23.20"
              blurb="Two-tier RBAC, SSO, audit log, and admin cockpit. 5 seats minimum."
              bullets={[
                'Everything in Professional',
                'Two-tier RBAC (org + dept)',
                'SSO / SAML, SCIM',
                'Hash-chained audit log',
                'Exit Interview Agent + Onboarding Genie',
                'Same-business-day support',
              ]}
              acting={acting}
              onUpgrade={(cycle) => startCheckout('enterprise', cycle)}
              paddleReady={paddleReady}
            />
          </div>
        )}

        {isPaid && me.tier === 'professional' && (
          <Card>
            <CardHeader>
              <CardTitle>Need more?</CardTitle>
              <CardDescription>Upgrade to Enterprise for SSO, audit log, two-tier RBAC, and unlimited seats.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button onClick={() => startCheckout('enterprise', me.billingCycle || 'monthly')} disabled={!!acting}>
                Upgrade to Enterprise
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-base font-medium mt-0.5">{value}</div>
    </div>
  )
}

function UpgradeCard({
  tier, icon, name, price, priceUnit, annualPrice, blurb, bullets,
  acting, onUpgrade, paddleReady, featured,
}: {
  tier: string
  icon: React.ReactNode
  name: string
  price: string
  priceUnit: string
  annualPrice: string
  blurb: string
  bullets: string[]
  acting: string | null
  onUpgrade: (cycle: 'monthly' | 'annual') => void
  paddleReady: boolean
  featured?: boolean
}) {
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')
  const isThisActing = acting?.startsWith(tier)
  return (
    <Card className={featured ? 'border-primary' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon} {name}
        </CardTitle>
        <CardDescription>{blurb}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold">{cycle === 'monthly' ? price : annualPrice}</span>
          <span className="text-sm text-muted-foreground">{priceUnit}</span>
          {cycle === 'annual' && <Badge variant="secondary" className="ml-2">20% off</Badge>}
        </div>
        <div className="inline-flex p-0.5 bg-muted rounded-full text-xs">
          <button
            className={`px-3 py-1 rounded-full transition-colors ${cycle === 'monthly' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setCycle('monthly')}
          >Monthly</button>
          <button
            className={`px-3 py-1 rounded-full transition-colors ${cycle === 'annual' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
            onClick={() => setCycle('annual')}
          >Annual</button>
        </div>
        <ul className="space-y-1.5 text-sm">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <Button
          className="w-full"
          onClick={() => onUpgrade(cycle)}
          disabled={!!acting || !paddleReady}
        >
          {isThisActing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
          Start 45-day free trial
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">No card required · cancel anytime</p>
      </CardContent>
    </Card>
  )
}
