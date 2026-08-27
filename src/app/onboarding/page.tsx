'use client'

// /onboarding - the single shared "get an org + pick AI" flow, reached
// from two places:
//   1. register-form.tsx redirects here right after OTP verification
//   2. Google OAuth's callbackUrl points here directly
// Doing it as one shared page (not duplicated per entry point) is the
// actual fix for the gap that let Google sign-ins land in a bare Personal
// dashboard - there's now exactly one place a new account can end up
// without an org, and it's this page, not /app's old PersonalHomePage
// fallback. See today.md 2026-08-25.
//
// Also reachable as a safety net: if /app ever finds an authenticated,
// non-grandfathered user with zero orgs (shouldn't happen if this page
// is doing its job, but "shouldn't happen" is not "can't happen"), it
// redirects here instead of rendering Personal.

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, KeyRound, Zap, Check, Phone } from 'lucide-react'
import { toast } from 'sonner'

type ByokProvider = 'anthropic' | 'openai' | 'gemini'
const PROVIDER_LABELS: Record<ByokProvider, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'OpenAI',
  gemini: 'Gemini (Google)',
}

type CompanySize = '1-10' | '11-50' | '51-200' | '201-1000' | '1000+'
const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-1000', label: '201-1000' },
  { value: '1000+', label: '1000+' },
]

// useSearchParams() requires a Suspense boundary in the App Router even
// for a fully client-rendered page like this one, or `next build` fails
// to prerender it - which means no prerender-manifest.json gets written
// at all, which crash-loops the whole server on start (learned the hard
// way in prod, 2026-08-25 - see today.md).
export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
      </div>
    }>
      <OnboardingInner />
    </Suspense>
  )
}

function OnboardingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/app'

  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState<'org' | 'ai'>('org')

  const [orgName, setOrgName] = useState('')
  const [companySize, setCompanySize] = useState<CompanySize | null>(null)
  const [creatingOrg, setCreatingOrg] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)

  const [byokProvider, setByokProvider] = useState<ByokProvider>('anthropic')
  const [byokKey, setByokKey] = useState('')
  const [connectingByok, setConnectingByok] = useState(false)
  const [startingTrial, setStartingTrial] = useState(false)

  // Auth check via a plain fetch, not the useSession() hook - this app has
  // never wrapped itself in a <SessionProvider> (every other page checks
  // auth server-side via requireAuth()/middleware), so useSession() was
  // throwing "Cannot destructure property 'data' ... as undefined" on
  // every load. Hitting NextAuth's own session endpoint directly works
  // with zero provider setup. Learned this in prod, 2026-08-26 - see
  // today.md before reaching for useSession() anywhere else in this app.
  //
  // Not signed in -> nothing to onboard, go log in. Already has an org ->
  // nothing to do here (repeat Google login, or direct navigation), go
  // straight to the app instead of re-running the flow.
  useEffect(() => {
    (async () => {
      try {
        const sessionRes = await fetch('/api/auth/session')
        const sessionData = sessionRes.ok ? await sessionRes.json() : null
        if (!sessionData?.user) {
          router.replace(`/login?callbackUrl=${encodeURIComponent('/onboarding')}`)
          return
        }

        const res = await fetch('/api/enterprise/organizations')
        const data = await res.json()
        if (Array.isArray(data.organizations) && data.organizations.length > 0) {
          window.location.href = redirectTo
          return
        }
      } catch { /* fall through to onboarding on any error */ }
      setChecking(false)
    })()
  }, [])

  function goToApp() {
    window.location.href = redirectTo
  }

  async function handleCreateOrg() {
    if (!orgName.trim() || !companySize || creatingOrg) return
    setCreatingOrg(true)
    try {
      const orgRes = await fetch('/api/enterprise/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName.trim(), companySize }),
      })
      const orgData = await orgRes.json()
      if (!orgRes.ok) {
        toast.error(orgData.message || orgData.error || 'Could not create your organization')
        return
      }
      await fetch('/api/me/active-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: 'org', orgId: orgData.organization.id }),
      })
      setOrgId(orgData.organization.id)
      setStep('ai')
    } catch {
      toast.error('Network error - try again')
    } finally {
      setCreatingOrg(false)
    }
  }

  async function handleConnectByok() {
    if (!byokKey.trim() || connectingByok || !orgId) return
    setConnectingByok(true)
    try {
      const res = await fetch(`/api/enterprise/organizations/${orgId}/ai-provider-key`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: byokProvider, apiKey: byokKey.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.message || data.error || 'Could not verify that key')
        return
      }
      toast.success('Key connected - free forever')
      goToApp()
    } catch {
      toast.error('Network error - try again')
    } finally {
      setConnectingByok(false)
    }
  }

  async function handleStartTrial() {
    if (startingTrial || !orgId) return
    setStartingTrial(true)
    try {
      const trialRes = await fetch('/api/billing/start-trial', { method: 'POST' })
      const trialData = await trialRes.json()
      if (!trialRes.ok) {
        toast.error(trialData.message || trialData.error || 'Could not start trial')
        return
      }
      toast.success('15-day Managed trial started')
      goToApp()
    } catch {
      toast.error('Network error - try again')
    } finally {
      setStartingTrial(false)
    }
  }

  const recommendTalkToSales = companySize === '201-1000' || companySize === '1000+'

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] px-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />
      <div className="absolute top-20 -right-40 w-[500px] h-[500px] rounded-full bg-[#818CF8]/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-[400px]">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2.5 mb-8"
        >
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/black_logo.svg" alt="Reattend" width={36} height={36} className="h-9 w-9" unoptimized />
            <span className="text-[20px] font-bold text-[#1a1a2e] tracking-tight">Reattend</span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] p-8"
        >
          <AnimatePresence mode="wait">
            {step === 'org' ? (
              <motion.div key="org" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="w-full">
                <h1 className="text-[22px] font-bold text-[#1a1a2e] mb-2 text-center">Tell us about your team</h1>
                <p className="text-[13px] text-gray-500 text-center mb-6">
                  You&apos;ll be the admin - invite your team once you&apos;re in.
                </p>

                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Organization name (e.g. Acme Inc)"
                  required
                  autoFocus
                  className="w-full h-[48px] px-4 text-[14px] text-[#1a1a2e] bg-white/70 backdrop-blur-sm border border-white/80 rounded-xl outline-none transition-all placeholder:text-gray-400 focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)] mb-3"
                />

                <p className="text-[12px] font-medium text-gray-500 mb-1.5">Company size</p>
                <div className="grid grid-cols-5 gap-1.5 mb-4">
                  {COMPANY_SIZES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCompanySize(value)}
                      className={`h-[38px] rounded-lg text-[12px] font-semibold border transition-all ${
                        companySize === value
                          ? 'border-[#4F46E5] bg-[#4F46E5]/10 text-[#4F46E5]'
                          : 'border-white/80 bg-white/70 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCreateOrg}
                  disabled={creatingOrg || !orgName.trim() || !companySize}
                  className="w-full h-[48px] bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.98] text-white text-[14px] font-semibold rounded-full transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
                >
                  {creatingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continue
                </button>
              </motion.div>
            ) : (
              <motion.div key="ai" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="w-full">
                <h1 className="text-[22px] font-bold text-[#1a1a2e] mb-2 text-center">How do you want AI to run?</h1>
                <p className="text-[13px] text-gray-500 text-center mb-6">
                  Pick one now, or skip and set it up later in the Control Room.
                </p>

                <div className="rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm p-4 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="h-4 w-4 text-[#4F46E5]" />
                    <p className="text-[14px] font-semibold text-[#1a1a2e]">Bring your own key</p>
                    <span className="ml-auto text-[11px] font-semibold text-emerald-600">Free forever</span>
                  </div>
                  <p className="text-[12px] text-gray-500 mb-3">
                    Your own Anthropic, OpenAI, or Gemini key - every teammate uses it automatically.
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={byokProvider}
                      onChange={e => setByokProvider(e.target.value as ByokProvider)}
                      className="h-[40px] px-2.5 text-[13px] bg-white/70 border border-white/80 rounded-lg outline-none shrink-0"
                    >
                      {(Object.keys(PROVIDER_LABELS) as ByokProvider[]).map(p => (
                        <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
                      ))}
                    </select>
                    <input
                      type="password"
                      value={byokKey}
                      onChange={e => setByokKey(e.target.value)}
                      placeholder="Paste API key"
                      className="flex-1 min-w-0 h-[40px] px-3 text-[13px] bg-white/70 border border-white/80 rounded-lg outline-none focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10"
                      onKeyDown={e => { if (e.key === 'Enter') handleConnectByok() }}
                    />
                  </div>
                  <button
                    onClick={handleConnectByok}
                    disabled={connectingByok || !byokKey.trim()}
                    className="w-full h-[40px] mt-2.5 bg-[#1a1a2e] hover:bg-[#2d2b55] active:scale-[0.98] text-white text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {connectingByok ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Connect & continue
                  </button>
                </div>

                <div className={`rounded-xl border p-4 mb-3 ${recommendTalkToSales ? 'border-white/80 bg-white/70' : 'border-white/80 bg-white/70'} backdrop-blur-sm`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-[#4F46E5]" />
                    <p className="text-[14px] font-semibold text-[#1a1a2e]">Managed</p>
                    <span className="ml-auto text-[11px] font-semibold text-gray-500">$19/user/mo</span>
                  </div>
                  <p className="text-[12px] text-gray-500 mb-3">
                    We run the AI for you - no key to manage. 15-day free trial, no card needed.
                  </p>
                  <button
                    onClick={handleStartTrial}
                    disabled={startingTrial}
                    className="w-full h-[40px] bg-white border border-[#4F46E5]/30 hover:bg-[#4F46E5]/5 active:scale-[0.98] text-[#4F46E5] text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {startingTrial ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Start 15-day trial
                  </button>
                </div>

                <div className={`rounded-xl border p-4 mb-4 backdrop-blur-sm ${recommendTalkToSales ? 'border-[#4F46E5]/40 bg-[#4F46E5]/5' : 'border-white/80 bg-white/70'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-4 w-4 text-[#4F46E5]" />
                    <p className="text-[14px] font-semibold text-[#1a1a2e]">Talk to sales</p>
                    {recommendTalkToSales && (
                      <span className="ml-auto text-[11px] font-semibold text-[#4F46E5]">Recommended for your size</span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-500 mb-3">
                    RBAC, SSO, audit log, on-prem - for larger or regulated teams. Quoted, not self-serve.
                  </p>
                  <a
                    href="https://calendly.com/pb-reattend/30min"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full h-[40px] border border-[#4F46E5]/30 hover:bg-[#4F46E5]/5 active:scale-[0.98] text-[#4F46E5] text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    Book a call
                  </a>
                </div>

                <button
                  onClick={goToApp}
                  className="w-full text-center text-[13px] text-gray-500 hover:text-[#4F46E5] font-medium transition-colors"
                >
                  Skip for now
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
