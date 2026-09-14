'use client'

import { cn } from '@/lib/utils'

// /onboarding - first-run wizard for personal accounts.
//
// Four steps: what Reattend is → how the AI runs (Managed trial, the easy
// default, or your own key with a how-to) → the browser extension (one click
// makes and copies the Reattend token it needs) → you're set. Team signups go
// to /app/admin/onboarding instead (the "For my team" door on /register, or
// the link on step 1), and anyone who already belongs to an org skips this
// page entirely (see the mount effect).
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
import { Loader2, KeyRound, Check, Sparkles, Brain, MessageSquareText, Network, ArrowRight, ArrowLeft, Chrome, Copy, ChevronDown, ExternalLink, Users } from 'lucide-react'
import { toast } from 'sonner'
import { CHROME_WEB_STORE_URL } from '@/lib/extension'

type ByokProvider = 'anthropic' | 'openai' | 'gemini'
// Short labels - the full vendor names ("Claude (Anthropic)") overflowed
// the segmented control and clipped onto a second line.
const PROVIDER_LABELS: Record<ByokProvider, string> = {
  anthropic: 'Claude',
  openai: 'OpenAI',
  gemini: 'Gemini',
}

// Personal accounts get the 7-day trial that matches the Paddle Personal
// price; orgs get 15. This wizard is the personal path, so 7.
// Kept in sync with TRIAL_DAYS_BY_TIER in src/lib/billing/tier.ts. Duplicated as a
// literal because that module pulls in the DB layer and can't be imported
// into a client component.
const TRIAL_DAYS = 7
// Managed limits for a personal account - TIER_LIMITS.professional and the
// personal Paddle price. Same duplication reason as TRIAL_DAYS.
const MANAGED_QUESTIONS = 800
const PERSONAL_PRICE = 9

// Where to get a key, for people who have never made one. Steps match each
// provider's console as of 2026-09.
const KEY_HELP: Record<ByokProvider, { url: string; host: string; steps: string }> = {
  anthropic: { url: 'https://console.anthropic.com/settings/keys', host: 'console.anthropic.com', steps: 'Sign in, add a few dollars of credit under Billing, then Create Key and copy it.' },
  openai: { url: 'https://platform.openai.com/api-keys', host: 'platform.openai.com', steps: 'Sign in, add credit under Billing, then Create new secret key and copy it.' },
  gemini: { url: 'https://aistudio.google.com/apikey', host: 'aistudio.google.com', steps: 'Sign in with Google, then Create API key and copy it. Google has a free tier.' },
}
const STEPS = 4

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
  const [showKeyHelp, setShowKeyHelp] = useState(false)
  const [extToken, setExtToken] = useState<string | null>(null)
  const [makingToken, setMakingToken] = useState(false)

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
        // Already finished it once? "Start free" is the only auth button now,
        // so returning users land here too - send them straight in.
        const userRes = await fetch('/api/user')
        if (userRes.ok) {
          const u = (await userRes.json())?.user
          if (u?.onboardingCompleted) { window.location.href = redirectTo; return }
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

  // Makes a Reattend token for the extension and puts it on the clipboard,
  // so the only thing left to do in the extension is paste.
  async function handleMakeToken() {
    if (makingToken) return
    setMakingToken(true)
    try {
      const res = await fetch('/api/tray/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Chrome extension' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.token) { toast.error('Could not make a token - try again'); return }
      setExtToken(data.token)
      try { await navigator.clipboard.writeText(data.token); toast.success('Token copied') } catch { /* shown below to copy by hand */ }
    } catch {
      toast.error('Network error - try again')
    } finally {
      setMakingToken(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
      </div>
    )
  }

  const cardWidth = step === 1 || step === 3 ? 'max-w-[520px]' : 'max-w-[440px]'

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
            {Array.from({ length: STEPS }, (_, i) => i + 1).map((n) => (
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
                <button
                  onClick={() => markCompleteAndLeave('/app/admin/onboarding')}
                  disabled={leaving}
                  className="w-full mt-3 text-center text-[12.5px] text-gray-500 hover:text-[#2563EB] font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Users className="h-3.5 w-3.5" /> Setting this up for a team? Create an organization instead
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

                {/* Managed first: for someone arriving from an ad, "paste an
                    API key" is a wall. The trial needs nothing. */}
                <div className="rounded-xl border-2 border-[#2563EB]/35 bg-white/80 backdrop-blur-sm p-4 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-[#2563EB]" />
                    <p className="text-[14px] font-semibold text-[#1a1a2e]">Let Reattend run it</p>
                    <span className="ml-auto text-[10.5px] font-bold uppercase tracking-wide text-white bg-[#2563EB] rounded-full px-2 py-0.5">Easiest</span>
                  </div>
                  <p className="text-[12px] text-gray-500 mb-3">
                    Nothing to set up. {TRIAL_DAYS} days free with no card, then ${PERSONAL_PRICE}/month for up to {MANAGED_QUESTIONS} questions a month.
                    If you walk away, nothing is charged.
                  </p>
                  <button
                    onClick={handleStartTrial}
                    disabled={startingManaged}
                    className="w-full h-[40px] bg-[#2563EB] hover:bg-[#1d4ed8] active:scale-[0.98] text-white text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {startingManaged ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Start my {TRIAL_DAYS}-day free trial
                  </button>
                </div>

                <div className="rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm p-4 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="h-4 w-4 text-[#2563EB]" />
                    <p className="text-[14px] font-semibold text-[#1a1a2e]">Use your own AI key</p>
                    <span className="ml-auto text-[11px] font-semibold text-emerald-600">Free forever</span>
                  </div>
                  <p className="text-[12px] text-gray-500 mb-3">
                    Already pay for an AI provider? Connect its key and Reattend is free, with no question limit. Your provider bills you directly.
                  </p>
                  {/* Segmented control, not a native <select>: the select
                      inherited a near-invisible text colour on this card and
                      looks broken on every OS anyway. */}
                  <div className="flex gap-1 mb-2 p-1 rounded-lg bg-white/70 border border-white/80">
                    {(Object.keys(PROVIDER_LABELS) as ByokProvider[]).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setByokProvider(p)}
                        className={cn(
                          'flex-1 min-w-0 h-[34px] px-2 rounded-md text-[12.5px] font-medium leading-none whitespace-nowrap overflow-hidden text-ellipsis transition-colors',
                          byokProvider === p ? 'bg-[#1a1a2e] text-white shadow-sm' : 'text-gray-600 hover:bg-white',
                        )}
                      >
                        {PROVIDER_LABELS[p]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
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
                    type="button"
                    onClick={() => setShowKeyHelp(v => !v)}
                    className="mt-2 text-[12px] text-[#2563EB] hover:underline font-medium flex items-center gap-1"
                    aria-expanded={showKeyHelp}
                  >
                    Don&apos;t have a key? How to get one
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showKeyHelp && 'rotate-180')} />
                  </button>
                  {showKeyHelp && (
                    <div className="mt-2 rounded-lg bg-white/80 border border-white p-3 text-[12px] text-gray-600 leading-relaxed">
                      <p className="mb-1.5">
                        An API key is a password that lets Reattend use your {PROVIDER_LABELS[byokProvider]} account. It takes about two minutes:
                      </p>
                      <p className="mb-2">{KEY_HELP[byokProvider].steps}</p>
                      <a
                        href={KEY_HELP[byokProvider].url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[#2563EB] hover:underline"
                      >
                        Open {KEY_HELP[byokProvider].host} <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="mt-2 text-gray-400">Not sure? Start the free trial above; you can switch to your own key any time in Settings.</p>
                    </div>
                  )}
                  <button
                    onClick={handleConnectByok}
                    disabled={connectingByok || !byokKey.trim()}
                    className="w-full h-[40px] mt-2.5 bg-[#1a1a2e] hover:bg-[#2d2b55] active:scale-[0.98] text-white text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {connectingByok ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Connect &amp; continue
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

            {/* ─────────── STEP 3: the browser extension ─────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-center mb-3">
                  <div className="h-11 w-11 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
                    <Chrome className="h-5 w-5" />
                  </div>
                </div>
                <h1 className="text-[22px] font-bold text-[#1a1a2e] mb-2 text-center">Add Reattend to your browser</h1>
                <p className="text-[13px] text-gray-500 text-center mb-5 leading-relaxed">
                  This is where Reattend earns its keep. It saves what matters from the pages and email you already read,
                  and answers from your memory in a side panel while you work. Works in Chrome, Brave and Arc.
                </p>

                <ol className="space-y-3 mb-5">
                  <li className="rounded-xl border border-white/80 bg-white/70 p-3.5 flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-[#1a1a2e] text-white text-[12px] font-bold flex items-center justify-center shrink-0">1</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#1a1a2e] mb-2">Add it from the Chrome Web Store</p>
                      <a
                        href={CHROME_WEB_STORE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-[12.5px] font-semibold"
                      >
                        <Chrome className="h-3.5 w-3.5" /> Add to Chrome <ExternalLink className="h-3 w-3 opacity-80" />
                      </a>
                    </div>
                  </li>
                  <li className="rounded-xl border border-white/80 bg-white/70 p-3.5 flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-[#1a1a2e] text-white text-[12px] font-bold flex items-center justify-center shrink-0">2</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#1a1a2e] mb-1">Copy your Reattend token</p>
                      <p className="text-[12px] text-gray-500 mb-2">It links the extension to this account. Keep it private, like a password.</p>
                      {extToken ? (
                        <div className="flex items-center gap-2">
                          <code className="flex-1 min-w-0 truncate font-mono text-[11.5px] bg-white border border-gray-200 rounded-lg px-2.5 py-2 select-all">{extToken}</code>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(extToken).then(() => toast.success('Token copied')).catch(() => {}) }}
                            className="h-[34px] px-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[12px] font-semibold flex items-center gap-1"
                          >
                            <Copy className="h-3.5 w-3.5" /> Copy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleMakeToken}
                          disabled={makingToken}
                          className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg bg-[#1a1a2e] hover:bg-[#2d2b55] text-white text-[12.5px] font-semibold disabled:opacity-50"
                        >
                          {makingToken ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                          Copy my token
                        </button>
                      )}
                    </div>
                  </li>
                  <li className="rounded-xl border border-white/80 bg-white/70 p-3.5 flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-[#1a1a2e] text-white text-[12px] font-bold flex items-center justify-center shrink-0">3</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#1a1a2e] mb-1">Paste it into the extension</p>
                      <p className="text-[12px] text-gray-500">
                        Its settings page opens by itself after you install. Paste the token and save. Lost the page?
                        Click the puzzle icon in your browser bar, then Reattend, then Options.
                      </p>
                    </div>
                  </li>
                </ol>

                <button
                  onClick={() => setStep(4)}
                  className="w-full h-[42px] bg-[#1a1a2e] hover:bg-[#2d2b55] active:scale-[0.98] text-white text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 mb-2.5"
                >
                  {extToken ? 'Done, continue' : 'Continue'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="w-full text-center text-[13px] text-gray-500 hover:text-[#2563EB] font-medium transition-colors"
                >
                  I&apos;ll do this later
                </button>
              </motion.div>
            )}

            {/* ─────────── STEP 4: you're set ─────────── */}
            {step === 4 && (
              <motion.div
                key="step4"
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
