'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Building2, ShieldCheck, Server, Cloud, ArrowRight, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'

type Plan = 'free' | 'managed' | 'government'
type Deployment = 'saas' | 'on_prem' | 'air_gapped'

// Plan tiles match organizations.plan in src/lib/db/schema.ts and the
// public /pricing page. Only Free is self-serve - Reattend never hosts or
// pays for the AI, so Managed (we provision + govern the org's own key)
// and Government (on-prem/air-gapped) both require a sales conversation
// before the org can be created on that plan.
const PLANS: { key: Plan; name: string; price: string; desc: string; recommended?: boolean }[] = [
  { key: 'free', name: 'Free', price: '$0', desc: 'Bring your own AI key. Unlimited seats, unlimited questions, free forever.', recommended: true },
  { key: 'managed', name: 'Managed', price: 'Talk to sales', desc: 'We provision and govern the AI key for your org, with admin-set rate limits. No key for employees to manage.' },
  { key: 'government', name: 'Government', price: 'Quote', desc: 'On-premise or air-gapped, OCR ingestion, trainer dispatched.' },
]

const DEPLOYMENTS: { key: Deployment; name: string; desc: string; icon: typeof Cloud }[] = [
  { key: 'saas', name: 'SaaS', desc: 'Fully managed. Fastest to start.', icon: Cloud },
  { key: 'on_prem', name: 'On-Premise', desc: 'Runs on your infrastructure. Rabbit v2.1 on your GPU.', icon: Server },
  { key: 'air_gapped', name: 'Air-Gapped', desc: 'Zero outbound traffic. Government-grade isolation.', icon: ShieldCheck },
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

function OrgOnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [primaryDomain, setPrimaryDomain] = useState('')
  const [plan, setPlan] = useState<Plan>('free')
  // Debounced slug availability check - runs on every slug change so the user
  // finds out the slug is taken before hitting Continue.
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
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
  const [deployment, setDeployment] = useState<Deployment>('saas')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingOrgCheck, setExistingOrgCheck] = useState<'checking' | 'clear' | 'redirecting'>('checking')

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

  async function submit() {
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
          deployment,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'request failed' }))
        throw new Error(body.error || 'request failed')
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
      // Skip the /departments waystation - go straight to the cockpit.
      router.replace(`/app/admin/${newOrg.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  // Slug must not be taken/invalid before step 1 advances. Idle/checking are
  // permitted so the user isn't blocked while debounce is in flight - server
  // re-checks on submit anyway and the create-org route returns 409 'slug already taken'.
  const canAdvance1 = name.trim().length >= 2 && slugStatus !== 'taken' && slugStatus !== 'invalid'
  const canSubmit = canAdvance1

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
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
          <Building2 className="h-3.5 w-3.5" />
          <span>Reattend Enterprise</span>
        </div>
        <h1 className="font-display text-4xl tracking-tight">Create your organization</h1>
        <p className="text-muted-foreground mt-1">
          A few details and you&apos;re in. You can change these later.
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
            <h2 className="text-lg font-medium">Organization</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Acme Corporation"
                value={name}
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
              <label className="text-sm font-medium">Primary email domain (optional)</label>
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
                Just the domain (e.g. <code className="font-mono">acme.com</code>) - no <code>@</code>, no email address.
                Invites and sign-ups will be restricted to this domain.
                You must be signed in with an @{primaryDomain || 'acme.com'} email to create the org.
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
            <h2 className="text-lg font-medium">Plan</h2>
            <div className="grid gap-3">
              {PLANS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPlan(p.key)}
                  className={cn(
                    'text-left border rounded-lg p-4 transition-colors',
                    plan === p.key ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {p.recommended && <Badge variant="secondary">Recommended</Badge>}
                    </div>
                    <span className="text-sm text-muted-foreground">{p.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                </button>
              ))}
            </div>

            {plan !== 'free' && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="text-sm font-medium">
                  {plan === 'managed' ? 'Managed' : 'Government'} requires a sales conversation
                </div>
                <p className="text-xs text-muted-foreground">
                  We&apos;ll scope your rollout and provision the org afterward - it&apos;s not something you can self-serve
                  into right now. Create your org on Free in the meantime; we&apos;ll upgrade it once you&apos;re set up.
                </p>
                <a
                  href="https://calendly.com/pb-reattend/30min"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  → Talk to sales
                </a>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={plan !== 'free'}>
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6 space-y-5">
            <h2 className="text-lg font-medium">Deployment</h2>
            <div className="grid gap-3">
              {DEPLOYMENTS.map((d) => {
                const Icon = d.icon
                return (
                  <button
                    key={d.key}
                    onClick={() => setDeployment(d.key)}
                    className={cn(
                      'text-left border rounded-lg p-4 transition-colors flex items-start gap-3',
                      deployment === d.key ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{d.name}</div>
                      <p className="text-sm text-muted-foreground mt-0.5">{d.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {(deployment === 'on_prem' || deployment === 'air_gapped') && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="text-sm font-medium">
                  {deployment === 'on_prem' ? 'On-Premise' : 'Air-Gapped'} requires a sales conversation
                </div>
                <p className="text-xs text-muted-foreground">
                  These deployments include Rabbit v2.1 on your hardware, custom SSO wiring, and a dedicated support engineer.
                  Reach out and we'll set up a call within 24 hours.
                </p>
                <a
                  href="mailto:pb@reattend.ai?subject=Enterprise%20deployment%20%E2%80%94%20on-prem%20%2F%20air-gapped"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  → Talk to sales (pb@reattend.ai)
                </a>
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded p-2">
                {error}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button
                onClick={submit}
                disabled={!canSubmit || submitting || deployment === 'on_prem' || deployment === 'air_gapped'}
              >
                {submitting ? 'Creating…' : 'Create organization'}
              </Button>
            </div>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
