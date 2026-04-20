'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { initializePaddle, type Paddle } from '@paddle/paddle-js'
import {
  Check,
  Minus,
  Sparkles,
  CreditCard,
  Loader2,
  Brain,
  Shield,
  Receipt,
  ExternalLink,
  AlertTriangle,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface UserInfo {
  id: string
  email: string
  name: string
}

interface SubscriptionInfo {
  plan: 'normal' | 'smart'
  isSmartActive: boolean
  isTrialing: boolean
  trialDaysLeft: number
  status: string
  renewsAt: string | null
  paddleSubscriptionId: string | null
}

interface Transaction {
  id: string
  status: string
  createdAt: string
  billedAt: string | null
  total: string | null
  currency: string
  invoiceUrl: string | null
}

// Static map — Next.js inlines NEXT_PUBLIC_ vars at build time
const PADDLE_PRICE_IDS: Record<string, string | undefined> = {
  NEXT_PUBLIC_PADDLE_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID,
  NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID,
}

const freeFeatures = [
  'Unlimited memories',
  '20 AI queries / day',
  '10 DeepThink sessions / day',
  'Notion integration',
  'Chrome extension',
  'File import (Read.ai, Obsidian, etc.)',
]

const proFeatures = [
  'Unlimited AI queries',
  'Unlimited DeepThink sessions',
  'All integrations',
  'Semantic search + knowledge graph',
  'Priority support',
]

const teamsFeatures = [
  'Everything in Pro',
  'Shared team memories',
  'Admin dashboard + roles',
  'Member management',
  'Bulk onboarding',
]

const tableGroups = [
  {
    title: 'Memories & Capture',
    rows: [
      { label: 'Total memories', free: 'Unlimited', pro: 'Unlimited' },
      { label: 'Web app', free: true, pro: true },
      { label: 'Browser extension', free: true, pro: true },
      { label: 'Ambient screen capture', free: true, pro: true },
    ],
  },
  {
    title: 'AI & Search',
    rows: [
      { label: 'AI queries', free: '10 / day', pro: 'Unlimited' },
      { label: 'Keyword search', free: true, pro: true },
      { label: 'Semantic search', free: false, pro: true },
      { label: 'Knowledge graph', free: false, pro: true },
      { label: 'Writing assist', free: false, pro: true },
    ],
  },
  {
    title: 'Integrations',
    rows: [
      { label: 'Connected integrations', free: '1 of your choice', pro: 'All' },
      { label: 'Gmail', free: 'if chosen', pro: true },
      { label: 'Slack', free: 'if chosen', pro: true },
      { label: 'Google Calendar', free: 'if chosen', pro: true },
      { label: 'Future integrations', free: false, pro: true },
    ],
  },
  {
    title: 'Meetings',
    rows: [
      { label: 'Meeting recordings', free: '2 / day', pro: 'Unlimited' },
      { label: 'AI transcription', free: '2 / day', pro: 'Unlimited' },
      { label: 'Auto-extracted action items', free: '2 / day', pro: 'Unlimited' },
    ],
  },
  {
    title: 'Teams',
    rows: [
      { label: 'Create / join teams', free: true, pro: true },
      { label: 'Team workspaces', free: true, pro: true },
    ],
  },
  {
    title: 'Support',
    rows: [
      { label: 'Memory retention on downgrade', free: true, pro: true },
      { label: 'Export your data', free: true, pro: true },
      { label: 'Priority support', free: false, pro: true },
      { label: 'Early access to new features', free: false, pro: true },
    ],
  },
]

type CellValue = boolean | string

function Cell({ value, highlight = false }: { value: CellValue; highlight?: boolean }) {
  if (value === true) {
    return (
      <div className="flex justify-center">
        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center', highlight ? 'bg-indigo-500/10' : 'bg-emerald-50')}>
          <Check className={cn('h-3 w-3', highlight ? 'text-indigo-500' : 'text-emerald-600')} />
        </div>
      </div>
    )
  }
  if (value === false) {
    return (
      <div className="flex justify-center">
        <Minus className="h-3.5 w-3.5 text-muted-foreground/30" />
      </div>
    )
  }
  return <div className="text-center text-[12px] font-medium text-muted-foreground">{value}</div>
}

export default function BillingPage() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const paddleRef = useRef<Paddle | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/user')
      const data = await res.json()
      if (data.user) setUser(data.user)
      if (data.subscription) setSubscription(data.subscription)
    } catch {
      toast.error('Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    setLoadingInvoices(true)
    try {
      const res = await fetch('/api/billing/transactions')
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch {
      // silently ignore
    } finally {
      setLoadingInvoices(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!clientToken) return
    initializePaddle({
      token: clientToken,
      eventCallback: (event) => {
        if (event.name === 'checkout.completed') {
          toast.success('Subscription activated!')
          setTimeout(() => fetchData(), 3000)
        }
      },
    }).then((paddle) => {
      if (paddle) paddleRef.current = paddle
    })
  }, [fetchData])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      toast.success('Payment successful!')
      window.history.replaceState({}, '', '/app/billing')
      setTimeout(() => fetchData(), 3000)
    }
  }, [fetchData])

  // Fetch invoices once subscription is loaded and user is Pro
  useEffect(() => {
    if (subscription?.paddleSubscriptionId) {
      fetchTransactions()
    }
  }, [subscription?.paddleSubscriptionId, fetchTransactions])

  const openCheckout = (priceIdEnv: string) => {
    const priceId = PADDLE_PRICE_IDS[priceIdEnv]
    if (!paddleRef.current || !priceId || !user) {
      toast.error('Payment system not ready. Please refresh the page.')
      return
    }
    paddleRef.current.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email: user.email },
      customData: { userId: user.id },
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        successUrl: `${window.location.origin}/app/billing?success=true`,
      },
    })
  }

  const handleSubscribePro = () => {
    const key = billing === 'annual'
      ? 'NEXT_PUBLIC_PADDLE_PRO_ANNUAL_PRICE_ID'
      : 'NEXT_PUBLIC_PADDLE_PRICE_ID'
    openCheckout(key)
  }

  const handleCancelSubscription = async () => {
    setCanceling(true)
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!res.ok) throw new Error('Failed to cancel')
      toast.success('Subscription canceled. You are now on the Free plan.')
      setCancelOpen(false)
      await fetchData()
    } catch {
      toast.error('Failed to cancel subscription. Please try again.')
    } finally {
      setCanceling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isPro = subscription?.isSmartActive && !subscription?.isTrialing
  const isTrialing = subscription?.isTrialing
  const isFree = !subscription?.isSmartActive

  const proPrice = billing === 'annual' ? '$75' : '$20'
  const proPeriod = billing === 'annual' ? '/ year' : '/ month'
  const proNote = billing === 'annual' ? 'billed annually – save 2 months' : '$192 / year – save 2 months'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl"
    >
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your plan and subscription.
        </p>
      </div>

      {/* Current Plan */}
      <Card className={cn(
        'bg-gradient-to-r',
        isPro ? 'border-violet-500/30 from-violet-500/5 to-transparent' :
        isTrialing ? 'border-blue-500/30 from-blue-500/5 to-transparent' :
        'border-emerald-500/30 from-emerald-500/5 to-transparent'
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', isPro ? 'bg-violet-500/10' : isTrialing ? 'bg-blue-500/10' : 'bg-emerald-500/10')}>
                  {isPro ? <Sparkles className="h-4 w-4 text-violet-500" /> : <Brain className="h-4 w-4 text-emerald-500" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{isPro ? 'Pro' : isTrialing ? 'Pro Trial' : 'Free'}</h3>
                    {isPro && !subscription?.paddleSubscriptionId && (
                      <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/20 hover:bg-violet-500/10">Granted</Badge>
                    )}
                    {isPro && subscription?.paddleSubscriptionId && (
                      <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/20 hover:bg-violet-500/10">Active</Badge>
                    )}
                    {isTrialing && (
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/10">{subscription?.trialDaysLeft}d left</Badge>
                    )}
                    {isFree && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10">Free Forever</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="pl-[46px]">
                {isFree && <p className="text-sm text-muted-foreground">Unlimited memories, 20 AI queries/day, 10 DeepThink sessions/day, Notion integration.</p>}
                {isPro && <p className="text-sm text-muted-foreground">Unlimited AI queries, all integrations, unlimited recordings, semantic search.</p>}
                {isTrialing && <p className="text-sm text-muted-foreground">Full Pro access during your trial. {subscription?.trialDaysLeft} days remaining.</p>}
                {subscription?.renewsAt && (
                  <p className="text-xs text-muted-foreground mt-1">Renews {new Date(subscription.renewsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0 flex flex-col items-end gap-3">
              <div>
                <p className="text-3xl font-bold">{isPro && subscription?.paddleSubscriptionId ? '$20' : '$0'}</p>
                <p className="text-xs text-muted-foreground">{isPro && subscription?.paddleSubscriptionId ? '/ month' : '/ forever'}</p>
              </div>
              {(isPro || isTrialing) && subscription?.paddleSubscriptionId && (
                <button
                  onClick={() => setCancelOpen(true)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
                >
                  Cancel subscription
                </button>
              )}
              {isTrialing && (
                <button
                  onClick={() => setCancelOpen(true)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
                >
                  Cancel trial
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {isTrialing ? 'Cancel trial?' : 'Cancel subscription?'}
            </DialogTitle>
            <DialogDescription>
              {isTrialing
                ? 'Your trial will end immediately and you will be moved to the Free plan. Your memories stay.'
                : 'Your Pro subscription will be canceled immediately. You will be moved to the Free plan. Your memories stay — you keep everything you captured.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={canceling}>
              Keep {isTrialing ? 'Trial' : 'Pro'}
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={canceling}>
              {canceling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isTrialing ? 'Cancel trial' : 'Cancel subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Comparison Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Compare Plans</h2>
          <div className="flex items-center gap-1 p-1 rounded-full bg-muted border text-sm">
            <button
              onClick={() => setBilling('monthly')}
              className={cn(
                'px-4 py-1 rounded-full text-sm font-medium transition-colors',
                billing === 'monthly' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={cn(
                'px-4 py-1 rounded-full text-sm font-medium transition-colors',
                billing === 'annual' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Annual
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          {/* Free */}
          <Card className="relative transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-gray-500" />
                <CardTitle className="text-base">Free</CardTitle>
              </div>
              <div className="mt-1">
                <span className="text-3xl font-bold">$0</span>
                <span className="text-sm text-muted-foreground"> / forever</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Forever free. No credit card.</p>
            </CardHeader>
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              <ul className="space-y-2.5">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-gray-400 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pt-2">
              <Button variant="outline" className="w-full" disabled>
                {isFree ? 'Current Plan' : 'Free Plan'}
              </Button>
            </CardFooter>
          </Card>

          {/* Pro */}
          <Card className="relative transition-all hover:shadow-md border-indigo-500/30 bg-indigo-500/[0.02]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  <CardTitle className="text-base">Pro</CardTitle>
                </div>
                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px]">Popular</Badge>
              </div>
              <div className="mt-1">
                <span className="text-2xl font-bold text-muted-foreground">Coming Soon</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Unlimited everything. Pricing announced at launch.</p>
            </CardHeader>
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              <ul className="space-y-2.5">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-indigo-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pt-2">
              {isPro || isTrialing ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button className="w-full" disabled variant="outline">
                  Coming Soon
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Teams Card */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <CardTitle className="text-base">Teams</CardTitle>
                </div>
              </div>
              <div className="mt-1">
                <span className="text-2xl font-bold text-muted-foreground">Coming Soon</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Shared memory for your team. Pricing announced at launch.</p>
            </CardHeader>
            <CardContent className="pt-0">
              <Separator className="mb-4" />
              <ul className="space-y-2.5">
                {teamsFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pt-2">
              <Button className="w-full" disabled variant="outline">
                Coming Soon
              </Button>
            </CardFooter>
          </Card>

        </div>
      </div>

      {/* Feature Comparison Table */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Everything, side by side</h2>
        <div className="rounded-xl border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_130px_130px] bg-muted/40 border-b">
            <div className="px-4 py-3" />
            <div className="px-3 py-3 text-center">
              <p className="text-[12px] font-semibold">Free</p>
              <p className="text-[10px] text-muted-foreground">$0 / forever</p>
            </div>
            <div className="px-3 py-3 text-center bg-indigo-500/5">
              <p className="text-[12px] font-semibold text-indigo-600">Pro</p>
              <p className="text-[10px] text-muted-foreground">Coming soon</p>
            </div>
          </div>

          {tableGroups.map((group, gi) => (
            <div key={group.title}>
              <div className="grid grid-cols-[1fr_130px_130px] bg-muted/20 border-y border-border/40">
                <div className="px-4 py-2 col-span-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</span>
                </div>
              </div>
              {group.rows.map((row, ri) => (
                <div
                  key={row.label}
                  className={cn(
                    'grid grid-cols-[1fr_130px_130px] items-center hover:bg-muted/20 transition-colors',
                    ri < group.rows.length - 1 && 'border-b border-border/30'
                  )}
                >
                  <div className="px-4 py-2.5">
                    <span className="text-[13px] text-foreground/80">{row.label}</span>
                  </div>
                  <div className="px-3 py-2.5">
                    <Cell value={row.free} />
                  </div>
                  <div className="px-3 py-2.5 bg-indigo-500/[0.02]">
                    <Cell value={row.pro} highlight />
                  </div>
                </div>
              ))}
              {gi < tableGroups.length - 1 && <div className="border-b border-border/40" />}
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Invoices</h2>
        <Card>
          <CardContent className="p-0">
            {loadingInvoices ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-6">
                <Receipt className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No invoices yet</p>
                {isFree && (
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Invoices will appear here once you upgrade to Pro. Receipts are also sent to your email by Paddle.
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {transactions.map((t) => {
                  const date = t.billedAt || t.createdAt
                  const formatted = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
                  const amount = t.total ? `${(parseInt(t.total) / 100).toFixed(2)} ${t.currency}` : '—'
                  return (
                    <div key={t.id} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium">{formatted}</p>
                        <p className="text-xs text-muted-foreground capitalize">{t.status}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">{amount}</span>
                        {t.invoiceUrl && (
                          <a
                            href={t.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            <ExternalLink className="h-3 w-3" />
                            PDF
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Info */}
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Secure Payments via Paddle</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Payments are securely processed by Paddle, our Merchant of Record.
                Paddle handles billing, invoices, taxes, and compliance. Receipts are sent to your email.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
