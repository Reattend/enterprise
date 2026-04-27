'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Building2, ShieldCheck, Server, Cloud, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'

type Plan = 'starter' | 'business' | 'enterprise' | 'government'
type Deployment = 'saas' | 'on_prem' | 'air_gapped'

const PLANS: { key: Plan; name: string; price: string; desc: string; recommended?: boolean }[] = [
  { key: 'starter', name: 'Starter', price: '$3/user/mo', desc: '10–50 users. Core memory, 5 connectors.' },
  { key: 'business', name: 'Business', price: '$8/user/mo', desc: 'Up to 500 users. Full memory graph, all connectors.', recommended: true },
  { key: 'enterprise', name: 'Enterprise', price: 'Custom', desc: '500+ users. SSO/SAML, audit trail, on-prem option.' },
  { key: 'government', name: 'Government', price: 'Custom', desc: 'Air-gapped, on-prem, Hindi support, sovereign compliance.' },
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
  const [plan, setPlan] = useState<Plan>('business')
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
      // its own list) bounces them forward to the cockpit — visible as
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
      // Skip the /departments waystation — go straight to the cockpit.
      router.replace(`/app/admin/${newOrg.id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const canAdvance1 = name.trim().length >= 2
  const canAdvance2 = true // plan always has a default
  const canSubmit = canAdvance1

  // While we check if the user already has an org, show a minimal loading state
  // rather than the form — avoids the "why is this asking me again" confusion.
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
                <Input
                  placeholder="acme"
                  value={slug}
                  onChange={(e) => setSlug(suggestedSlug(e.target.value))}
                />
              </div>
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers, and hyphens only.</p>
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
                Just the domain (e.g. <code className="font-mono">acme.com</code>) — no <code>@</code>, no email address.
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
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!canAdvance2}>
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
