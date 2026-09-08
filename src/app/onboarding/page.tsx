'use client'

// /onboarding - first-run wizard for personal accounts.
//
// Three steps: what Reattend is → how AI runs → you're set. Self-serve signup
// always creates a personal account; organizations are set up with sales and
// their members arrive by invite or SSO, so anyone who already belongs to an
// org skips this page entirely (see the mount effect).
//
// Every exit path (finish OR skip) POSTs /api/user/onboarding to set
// users.onboarding_completed, which is what (app)/app/layout.tsx reads to
// decide whether to bounce a new user here. Without that write the user
// would be redirected back into onboarding on every single page load, so
// the mark-complete call has to happen even on "skip" - see markComplete().

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Loader2, KeyRound, Check, Sparkles, Brain, MessageSquareText, Network, ArrowRight, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

type ByokProvider = 'anthropic' | 'openai' | 'gemini'
const PROVIDER_LABELS: Record<ByokProvider, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'OpenAI',
  gemini: 'Gemini (Google)',
}

// Kept in sync with TRIAL_DAYS in src/lib/billing/tier.ts. Duplicated as a
// literal because that module pulls in the DB layer and can't be imported
// into a client component.
const TRIAL_DAYS = 7

const WHAT_IT_DOES: { icon: any; title: string; body: string }[] = [
  {
    icon: Brain,
    title: 'Capture anything',
    body: 'Paste a meeting transcript, dump a half-formed thought, save a page from the browser extension. No structure required.',
  },
  {
    icon: MessageSquareText,
    title: 'Ask in plain language',
    body: '"What did I decide about pricing?" The AI answers from your own memory, and shows you which notes it drew on.',
  },
  {
    icon: Network,
    title: 'It connects itself',
    body: 'Reattend links related memories, surfaces contradictions, and resurfaces things right before you need them again.',
  },
]

// useSearchParams() requires a Suspense boundary in the App Router even
// for a fully client-rendered page like this one, or `next build` fails
// to prerender it - which means no prerender-manifest.json gets written
// at all, which crash-loops the whole server on start. Learned that the
// hard way on the Enterprise side - keeping the same discipline here.
export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
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
  const [step, setStep] = useState(1)
  const [byokProvider, setByokProvider] = useState<ByokProvider>('anthropic')
  const [byokKey, setByokKey] = useState('')
  const [connectingByok, setConnectingByok] = useState(false)
  const [startingManaged, setStartingManaged] = useState(false)
  const [aiChoice, setAiChoice] = useState<'byok' | 'managed' | null>(null)
  const [leaving, setLeaving] = useState(false)

  // Auth check via a plain fetch, not useSession() - this app has never
  // wrapped itself in a <SessionProvider>, so useSession() throws. Hitting
  // NextAuth's own session endpoint directly works with zero provider setup.
  useEffect(() => {
    (async () => {
      try {
        const sessionRes = await fetch('/api/auth/session')
        const sessionData = sessionRes.ok ? await sessionRes.json() : null
        if (!sessionData?.user) {
          router.replace(`/login?callbackUrl=${encodeURIComponent('/onboarding')}`)
          return
        }
        // Org members never see the personal wizard - their onboarding is the
        // org's. Mark complete so the app shell stops redirecting here.
        const orgRes = await fetch('/api/enterprise/organizations')
        const orgs = orgRes.ok ? ((await orgRes.json()).organizations || []) : []
        if (orgs.length > 0) {
          await fetch('/api/user/onboarding', { method: 'POST' }).catch(() => {})
          window.location.href = redirectTo
          return
        }
        // Already set up (a connected key, or a paid/trialing tier) means the
        // wizard has nothing left to ask. Without this, anyone who lands here
        // a second time is told to paste their key again.
        const billingRes = await fetch('/api/billing/me')
        if (billingRes.ok) {
          const b = await billingRes.json()
          if (b?.byok || (b?.tier && b.tier !== 'free')) {
            await fetch('/api/user/onboarding', { method: 'POST' }).catch(() => {})
            window.location.href = redirectTo
            return
          }
        }
      } catch { /* fall through to onboarding on any error */ }
      setChecking(false)
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Marks onboarding done, then leaves. Always await the POST before
  // navigating - a fire-and-forget here races the page unload and the
  // write can be lost, which would trap the user in a redirect loop.
  async function markCompleteAndLeave(dest: string) {
    setLeaving(true)
    try {
      await fetch('/api/user/onboarding', { method: 'POST' })
    } catch { /* non-fatal: worst case they see onboarding once more */ }
    window.location.href = dest
  }

  async function handleConnectByok() {
    if (!byokKey.trim() || connectingByok) return
    setConnectingByok(true)
    try {
      const res = await fetch('/api/me/ai-provider-key', {
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
      setAiChoice('byok')
      setStep(3)
    } catch {
      toast.error('Network error - try again')
    } finally {
      setConnectingByok(false)
    }
  }

  async function handleStartTrial() {
    if (startingManaged) return
    setStartingManaged(true)
    try {
      const res = await fetch('/api/billing/start-trial', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // 409 = already used the trial or already on a paid plan. Not an
        // error worth blocking on - send them to billing to pick a plan.
        if (res.status === 409) {
          toast.message(data.message || 'Trial already used')
          await markCompleteAndLeave('/app/settings/billing')
          return
        }
        toast.error(data.message || data.error || 'Could not start the trial')
        return
      }
      toast.success(`Managed trial started - ${TRIAL_DAYS} days, no card needed`)
      setAiChoice('managed')
      setStep(3)
    } catch {
      toast.error('Network error - try again')
    } finally {
      setStartingManaged(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
      </div>
    )
  }

  const cardWidth = step === 1 ? 'max-w-[520px]' : 'max-w-[420px]'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] px-6 py-10 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#2563EB]/8 via-[#60A5FA]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full bg-[#2563EB]/5 blur-3xl pointer-events-none" />
      <div className="absolute top-20 -right-40 w-[500px] h-[500px] rounded-full bg-[#60A5FA]/5 blur-3xl pointer-events-none" />

      <div className={`relative z-10 w-full ${cardWidth} transition-all duration-300`}>
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
          className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(37,99,235,0.06)] p-8"
        >
          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                  step >= n ? 'bg-[#2563EB]' : 'bg-[#2563EB]/12'
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ─────────── STEP 1: what Reattend is ─────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-[22px] font-bold text-[#1a1a2e] mb-2 text-center">
                  Reattend is your second memory.
                </h1>
                <p className="text-[13px] text-gray-500 text-center mb-6 leading-relaxed">
                  Everything you save stays yours, stays private, and comes back
                  the moment you need it.
                </p>

                <div className="space-y-3 mb-6">
                  {WHAT_IT_DOES.map(({ icon: Icon, title, body }) => (
                    <div
                      key={title}
                      className="rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm p-4 flex gap-3"
                    >
                      <div className="h-8 w-8 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-[#1a1a2e] mb-0.5">{title}</p>
                        <p className="text-[12px] text-gray-500 leading-relaxed">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full h-[42px] bg-[#1a1a2e] hover:bg-[#2d2b55] active:scale-[0.98] text-white text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  Set up AI
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}

            {/* ─────────── STEP 2: how AI runs ─────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-[22px] font-bold text-[#1a1a2e] mb-2 text-center">How do you want AI to run?</h1>
                <p className="text-[13px] text-gray-500 text-center mb-6">
                  Pick one now, or skip and set it up later in Settings.
                </p>

                <div className="rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm p-4 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="h-4 w-4 text-[#2563EB]" />
                    <p className="text-[14px] font-semibold text-[#1a1a2e]">Bring your own key</p>
                    <span className="ml-auto text-[11px] font-semibold text-emerald-600">Free forever</span>
                  </div>
                  <p className="text-[12px] text-gray-500 mb-3">
                    Your own Anthropic, OpenAI, or Gemini key - unlimited questions, nothing billed by Reattend.
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
                      className="flex-1 min-w-0 h-[40px] px-3 text-[13px] bg-white/70 border border-white/80 rounded-lg outline-none focus:border-[#2563EB]/40 focus:ring-2 focus:ring-[#2563EB]/10"
                      onKeyDown={e => { if (e.key === 'Enter') handleConnectByok() }}
                    />
                  </div>
                  <button
                    onClick={handleConnectByok}
                    disabled={connectingByok || !byokKey.trim()}
                    className="w-full h-[40px] mt-2.5 bg-[#1a1a2e] hover:bg-[#2d2b55] active:scale-[0.98] text-white text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {connectingByok ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Connect &amp; continue
                  </button>
                </div>

                <div className="rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm p-4 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-[#2563EB]" />
                    <p className="text-[14px] font-semibold text-[#1a1a2e]">Managed</p>
                    <span className="ml-auto text-[11px] font-semibold text-[#2563EB]">{TRIAL_DAYS}-day free trial</span>
                  </div>
                  <p className="text-[12px] text-gray-500 mb-3">
                    No key to manage - Reattend runs the AI for you. 300 questions/month,
                    then $9/mo. No card needed to start.
                  </p>
                  <button
                    onClick={handleStartTrial}
                    disabled={startingManaged}
                    className="w-full h-[40px] border border-[#2563EB]/30 hover:bg-[#2563EB]/5 active:scale-[0.98] text-[#2563EB] text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {startingManaged ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Start {TRIAL_DAYS}-day trial
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-[#1a1a2e] font-medium transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <button
                    onClick={() => markCompleteAndLeave(redirectTo)}
                    disabled={leaving}
                    className="ml-auto text-[13px] text-gray-500 hover:text-[#2563EB] font-medium transition-colors disabled:opacity-50"
                  >
                    {leaving ? 'Taking you in…' : 'Skip for now'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─────────── STEP 3: you're set ─────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Check className="h-6 w-6" />
                  </div>
                </div>
                <h1 className="text-[22px] font-bold text-[#1a1a2e] mb-2 text-center">You&apos;re set.</h1>
                <p className="text-[13px] text-gray-500 text-center mb-6 leading-relaxed">
                  {aiChoice === 'managed'
                    ? `Your ${TRIAL_DAYS}-day Managed trial is live - no card on file, nothing to cancel if you walk away.`
                    : 'Your key is connected and everything runs on your own provider account.'}
                </p>

                <div className="rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm p-4 mb-4">
                  <p className="text-[12.5px] font-semibold text-[#1a1a2e] mb-1.5">Good first move</p>
                  <p className="text-[12px] text-gray-500 leading-relaxed">
                    Paste in a recent meeting note or a few scattered thoughts. Reattend
                    will split them into memories and start connecting them - you&apos;ll
                    see what it does within about a minute.
                  </p>
                </div>

                <button
                  onClick={() => markCompleteAndLeave('/app/brain-dump')}
                  disabled={leaving}
                  className="w-full h-[42px] bg-[#1a1a2e] hover:bg-[#2d2b55] active:scale-[0.98] text-white text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mb-2.5"
                >
                  {leaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Start with a brain-dump
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => markCompleteAndLeave(redirectTo)}
                  disabled={leaving}
                  className="w-full text-center text-[13px] text-gray-500 hover:text-[#2563EB] font-medium transition-colors disabled:opacity-50"
                >
                  Go to my dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
