'use client'

// Create an organization - the "For my team" signup door (/register?for=team
// lands here) and the "Create an organization" item in a personal account's
// menu. Three steps:
//
//   1. Organization   name, URL slug, optional email domain
//   2. Plan           Managed (15-day no-card trial, $19/seat after, up to 99
//                     seats) · Bring your own key (free) · Government (sales)
//                     The org is created at the end of this step.
//   3. Invite         paste teammates' emails; each gets an invite email.
//
// Prices and trial length mirror src/lib/billing/tier.ts (TIER_LIMITS,
// TRIAL_DAYS_BY_TIER); kept as literals because that module pulls in the DB.
// Deployment is always SaaS here - on-premise and air-gapped are scoped with
// sales, so they are a note on the plan step rather than a self-serve choice.

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Building2, ArrowRight, Loader2, Check, X, Users, Mail, Sparkles, KeyRound, Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { isPersonalEmail } from '@/lib/enterprise/mode'

type Plan = 'managed' | 'free' | 'government'

const ORG_TRIAL_DAYS = 15
const SEAT_PRICE = 19
const MAX_SELF_SERVE_SEATS = 99
const SALES_URL = 'https://calendly.com/pb-reattend/30min'

const PLANS: { key: Plan; name: string; price: string; desc: string; Icon: typeof Sparkles; recommended?: boolean }[] = [
  {
    key: 'managed',
    name: 'Managed',
    price: `${ORG_TRIAL_DAYS} days free, then $${SEAT_PRICE}/seat/mo`,
    desc: `We run the AI for everyone. Nobody on your team needs an API key. No card for ${ORG_TRIAL_DAYS} days, up to ${MAX_SELF_SERVE_SEATS} seats.`,
    Icon: Sparkles,
    recommended: true,
  },
  {
    key: 'free',
    name: 'Bring your own key',
    price: '$0, forever',
    desc: 'An admin connects one AI provider key for the whole organization. Unlimited seats and questions, billed by your provider, never by us.',
    Icon: KeyRound,
  },
  {
    key: 'government',
    name: 'Government or on-premise',
    price: 'Talk to us',
    desc: 'On-premise or air-gapped deployment, paper-record OCR and a trainer on site. Scoped with our team.',
    Icon: Landmark,
  },
]

// Next.js requires useSearchParams to be inside a Suspense boundary during
// prerender. Wrapping the page content keeps /app/admin/onboarding buildable
// without making it SSR-only.
export default function OrgOnboardingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}>
      <OrgOnboardingContent />
    </Suspense>
  )
}

type InviteResult = { email: string; ok: boolean; note: string }

function parseEmails(raw: string): string[] {
  return Array.from(new Set(
    raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
  ))
}

function OrgOnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [primaryDomain, setPrimaryDomain] = useState('')
  const [myEmail, setMyEmail] = useState('')
  const [plan, setPlan] = useState<Plan>(searchParams.get('plan') === 'free' ? 'free' : 'managed')
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingOrgCheck, setExistingOrgCheck] = useState<'checking' | 'clear' | 'redirecting'>('checking')
  const [orgId, setOrgId] = useState<string | null>(null)
  const [inviteText, setInviteText] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteResults, setInviteResults] = useState<InviteResult[]>([])

  // Debounced slug availability check - runs on every slug change so the user
  // finds out the slug is taken before hitting Continue.
  useEffect(() => {
    if (!slug) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/enterprise/organizations/check-slug?slug=${encodeURIComponent(slug)}`)
        if (!res.ok) { setSlugStatus('idle'); return }
        const data = await res.json()
        if (data.available) setSlugStatus('available')
        else if (data.reason === 'taken') setSlugStatus('taken')
        else setSlugStatus('invalid')
      } catch { setSlugStatus('idle') }
    }, 350)
    return () => clearTimeout(t)
  }, [slug])

  // Prefill the email domain from a work address (never from gmail & co).
  useEffect(() => {
    fetch('/api/user').then((r) => (r.ok ? r.json() : null)).then((d) => {
      const email: string = d?.user?.email ?? ''
      setMyEmail(email)
      if (email && !isPersonalEmail(email)) setPrimaryDomain((cur) => cur || email.split('@')[1] || '')
    }).catch(() => {})
  }, [])

  // Bounce to existing org unless ?force=true is passed (multi-org users)
  useEffect(() => {
    const force = searchParams.get('force') === 'true'
    if (force) {
      setExistingOrgCheck('clear')
      return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/enterprise/organizations')
        if (!res.ok) {
          setExistingOrgCheck('clear')
          return
        }
        const data = await res.json()
        const orgs = data.organizations ?? []
        if (orgs.length > 0) {
          setExistingOrgCheck('redirecting')
          // Priority:
          // 1. The active org from the zustand store / localStorage (what's
          //    shown as selected in the sidebar + topbar)
          // 2. First super_admin / admin org
          // 3. First org in the list
          const activeId =
            useAppStore.getState().activeEnterpriseOrgId ??
            (typeof window !== 'undefined' ? localStorage.getItem('active_enterprise_org_id') : null)
          const active = activeId ? orgs.find((o: { orgId: string }) => o.orgId === activeId) : null
          const primary =
            active ??
            orgs.find((o: { role: string }) => o.role === 'super_admin' || o.role === 'admin') ??
            orgs[0]
          router.replace(`/app/admin/${primary.orgId}`)
          return
        }
        setExistingOrgCheck('clear')
      } catch {
        setExistingOrgCheck('clear')
      }
    })()
  }, [router, searchParams])

  const suggestedSlug = (src: string) => src.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64)

  async function createOrg() {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/enterprise/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: (slug || suggestedSlug(name)).trim(),
          primaryDomain: primaryDomain.trim() || undefined,
          plan,
          deployment: 'saas',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'request failed' }))
        throw new Error(body.message || body.error || 'request failed')
      }
      const data = await res.json()
      const newOrg = data.organization
      // Push the freshly-created org into the zustand store BEFORE
      // navigating. Without this, the app layout's redirect effect sees
      // an empty enterpriseOrgs array and bounces the user back to
      // /app/admin/onboarding, then the onboarding page (which fetches
      // its own list) bounces them forward to the cockpit - visible as
      // the "glitch loop" the user reported.
      const store = useAppStore.getState()
      store.setEnterpriseOrgs([
        ...store.enterpriseOrgs,
        {
          orgId: newOrg.id,
          orgName: newOrg.name,
          orgSlug: newOrg.slug,
          orgPlan: newOrg.plan,
          orgDeployment: newOrg.deployment,
          role: 'super_admin',
        },
      ])
      store.setActiveEnterpriseOrgId(newOrg.id)

      // The personal first-run wizard is not for org founders - mark
      // onboarding done so the app shell never redirects them there.
      await fetch('/api/user/onboarding', { method: 'POST' }).catch(() => {})

      // Managed: start the no-card trial now so the org has AI from the
      // first minute. Best-effort - the org already exists, and the trial can
      // be started later from Billing.
      if (plan === 'managed') {
        try {
          await fetch('/api/billing/start-trial', { method: 'POST' })
          window.dispatchEvent(new Event('reattend:billing-changed'))
        } catch { /* non-fatal */ }
      }

      setOrgId(newOrg.id)
      setStep(3)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function sendInvites() {
    if (!orgId) return
    const emails = parseEmails(inviteText).filter((e) => e !== myEmail.toLowerCase())
    if (emails.length === 0) return
    setInviting(true)
    const results: InviteResult[] = []
    for (const email of emails) {
      try {
        const res = await fetch(`/api/enterprise/organizations/${orgId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, role: 'member' }),
        })
        const body = await res.json().catch(() => ({}))
        if (res.ok) {
          results.push({ email, ok: true, note: body.invited ? 'Invite sent' : 'Added' })
        } else {
          results.push({ email, ok: false, note: body.message || body.error || 'Could not invite' })
        }
      } catch {
        results.push({ email, ok: false, note: 'Network error' })
      }
    }
    setInviteResults((prev) => [...results, ...prev.filter((p) => !results.some((r) => r.email === p.email))])
    setInviteText(results.filter((r) => !r.ok).map((r) => r.email).join('\n'))
    setInviting(false)
  }

  function finish() {
    if (orgId) router.replace('/app')
  }

  // Slug must not be taken/invalid before step 1 advances. Idle/checking are
  // permitted so the user isn't blocked while debounce is in flight - server
  // re-checks on submit anyway and the create-org route returns 409 'slug already taken'.
  const canAdvance1 = name.trim().length >= 2 && slugStatus !== 'taken' && slugStatus !== 'invalid'
  const pendingEmails = parseEmails(inviteText)

  // While we check if the user already has an org, show a minimal loading state
  // rather than the form - avoids the "why is this asking me again" confusion.
  if (existingOrgCheck !== 'clear') {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 text-center">
        <Loader2 className="h-5 w-5 mx-auto mb-3 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {existingOrgCheck === 'redirecting' ? 'Taking you to your organization…' : 'Checking your account…'}
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto py-10 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
            <Building2 className="h-3.5 w-3.5" />
            <span>Set up your team</span>
          </div>
          <h1 className="font-display text-4xl tracking-tight">
            {step === 3 ? 'Invite your team' : 'Create your organization'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {step === 3
              ? 'Reattend gets useful when everyone adds to the same memory. You can always invite more people later.'
              : 'Two minutes, and your team has one shared memory. You can change all of this later.'}
          </p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                step >= n ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {step === 1 && (
            <Card className="p-6 space-y-5">
              <h2 className="text-lg font-medium">Your organization</h2>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="Acme Corporation"
                  value={name}
                  autoFocus
                  onChange={(e) => {
                    setName(e.target.value)
                    if (!slug) setSlug(suggestedSlug(e.target.value))
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">reattend.com/org/</span>
                  <div className="relative flex-1">
                    <Input
                      placeholder="acme"
                      value={slug}
                      onChange={(e) => setSlug(suggestedSlug(e.target.value))}
                      className={cn(
                        slugStatus === 'taken' || slugStatus === 'invalid' ? 'border-red-400 focus-visible:ring-red-400' :
                        slugStatus === 'available' ? 'border-emerald-500 focus-visible:ring-emerald-500' :
                        undefined,
                      )}
                    />
                    {slugStatus !== 'idle' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {slugStatus === 'available' && <Check className="h-4 w-4 text-emerald-600" />}
                        {(slugStatus === 'taken' || slugStatus === 'invalid') && <X className="h-4 w-4 text-red-500" />}
                      </span>
                    )}
                  </div>
                </div>
                <p className={cn(
                  'text-xs',
                  slugStatus === 'taken' ? 'text-red-600' :
                  slugStatus === 'invalid' ? 'text-red-600' :
                  slugStatus === 'available' ? 'text-emerald-600' :
                  'text-muted-foreground',
                )}>
                  {slugStatus === 'taken' ? 'That slug is already taken - try another.' :
                   slugStatus === 'invalid' ? 'Slug must start with a letter or number; only lowercase, numbers, and hyphens allowed.' :
                   slugStatus === 'available' ? 'Available.' :
                   'Lowercase letters, numbers, and hyphens only.'}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Company email domain <span className="text-muted-foreground font-normal">(optional)</span></label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">@</span>
                  <Input
                    placeholder="acme.com"
                    value={primaryDomain}
                    onChange={(e) => {
                      // Auto-strip @ and protocols so the user can paste sloppily
                      const v = e.target.value.trim().toLowerCase().replace(/^@/, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
                      setPrimaryDomain(v)
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {primaryDomain
                    ? <>Only people with an <b>@{primaryDomain}</b> address can be invited. Clear this if some of your team use other addresses.</>
                    : <>Leave it empty and you can invite anyone, including gmail or outlook addresses. Set it to only allow your company&apos;s addresses.</>}
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep(2)} disabled={!canAdvance1}>
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card className="p-6 space-y-5">
              <h2 className="text-lg font-medium">How should the AI run?</h2>
              <div className="grid gap-3">
                {PLANS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPlan(p.key)}
                    className={cn(
                      'text-left border rounded-lg p-4 transition-colors flex gap-3',
                      plan === p.key ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <p.Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.name}</span>
                          {p.recommended && <Badge variant="secondary">Easiest</Badge>}
                        </div>
                        <span className="text-sm text-muted-foreground">{p.price}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {plan === 'managed' && (
                <p className="text-xs text-muted-foreground">
                  The trial starts the moment you create the organization. Add a card any time before day {ORG_TRIAL_DAYS} to keep Managed;
                  otherwise the organization moves to Bring your own key and nothing is deleted.
                </p>
              )}
              {plan === 'free' && (
                <p className="text-xs text-muted-foreground">
                  After this, open Control Room → Settings to connect the key. Until then, questions to the AI are paused.
                </p>
              )}
              {plan === 'government' && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <div className="text-sm font-medium">This one starts with a conversation</div>
                  <p className="text-xs text-muted-foreground">
                    We scope on-premise and air-gapped rollouts with you and provision the organization afterwards.
                    Want to look around first? Pick Managed and use the {ORG_TRIAL_DAYS}-day trial in the meantime.
                  </p>
                  <a href={SALES_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    → Book a call
                  </a>
                </div>
              )}

              {error && (
                <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
                  {error}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={submitting}>Back</Button>
                <Button onClick={createOrg} disabled={!canAdvance1 || submitting || plan === 'government'}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Creating…</> : <>Create organization <ArrowRight className="h-4 w-4 ml-1" /></>}
                </Button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card className="p-6 space-y-5">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <Check className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                <p className="text-sm">
                  <b>{name.trim()}</b> is ready{plan === 'managed' ? `, and your ${ORG_TRIAL_DAYS}-day Managed trial is running` : ''}.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5"><Users className="h-4 w-4" /> Teammates&apos; emails</label>
                <textarea
                  value={inviteText}
                  onChange={(e) => setInviteText(e.target.value)}
                  rows={4}
                  placeholder={primaryDomain ? `priya@${primaryDomain}\nsam@${primaryDomain}` : 'priya@company.com, sam@company.com'}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  One per line or separated by commas. Each person gets an email with a link to join. They join as members; you can make someone an admin later.
                </p>
              </div>

              {inviteResults.length > 0 && (
                <ul className="space-y-1.5">
                  {inviteResults.map((r) => (
                    <li key={r.email} className="flex items-center gap-2 text-sm">
                      {r.ok ? <Mail className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-red-500" />}
                      <span className="font-medium">{r.email}</span>
                      <span className={cn('text-xs', r.ok ? 'text-muted-foreground' : 'text-red-600')}>{r.note}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                <Button variant="ghost" onClick={finish}>
                  {inviteResults.some((r) => r.ok) ? 'Done' : 'Skip for now'}
                </Button>
                <div className="flex gap-2">
                  <Button onClick={sendInvites} disabled={inviting || pendingEmails.length === 0} variant={inviteResults.some((r) => r.ok) ? 'outline' : 'default'}>
                    {inviting
                      ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sending…</>
                      : <>Send {pendingEmails.length > 1 ? `${pendingEmails.length} invites` : 'invite'}</>}
                  </Button>
                  {inviteResults.some((r) => r.ok) && (
                    <Button onClick={finish}>Go to Reattend <ArrowRight className="h-4 w-4 ml-1" /></Button>
                  )}
                </div>
              </div>
            </Card>
          )}
        </motion.div>

        {step < 3 && (
          <p className="text-xs text-muted-foreground mt-6 text-center">
            Just for yourself? <a href="/onboarding" className="underline underline-offset-2 hover:text-foreground">Use Reattend personally instead</a>.
          </p>
        )}
      </div>
    </div>
  )
}
