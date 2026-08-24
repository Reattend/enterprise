'use client'

import React, { useState, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Loader2, ArrowLeft, Lock, KeyRound, Zap, Check } from 'lucide-react'
import { toast } from 'sonner'
import { signIn } from 'next-auth/react'

type ByokProvider = 'anthropic' | 'openai' | 'gemini'
const PROVIDER_LABELS: Record<ByokProvider, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'OpenAI',
  gemini: 'Gemini (Google)',
}

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/app'
  const [step, setStep] = useState<'email' | 'otp' | 'plan'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Plan-choice step (after account creation)
  const [byokProvider, setByokProvider] = useState<ByokProvider>('anthropic')
  const [byokKey, setByokKey] = useState('')
  const [connectingByok, setConnectingByok] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [startingTrial, setStartingTrial] = useState(false)

  function goToApp() {
    window.location.href = redirectTo
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
      goToApp()
    } catch {
      toast.error('Network error - try again')
    } finally {
      setConnectingByok(false)
    }
  }

  async function handleStartTrial() {
    if (startingTrial || !orgName.trim()) return
    setStartingTrial(true)
    try {
      // Managed is org-scoped - create the org first, make it the active
      // context, then start the trial. start-trial rejects org-less
      // callers, so this order matters.
      const orgRes = await fetch('/api/enterprise/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName.trim() }),
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

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to send OTP')
        return
      }

      if (data.dev) setDevCode(data.dev)

      toast.success('Check your email for the verification code!')
      setStep('otp')
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    const code = otp.join('')
    if (code.length !== 6) return
    setLoading(true)

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Invalid or expired code. Please try again.')
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      } else {
        toast.success('Account created! Welcome to Reattend.')
        setStep('plan')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      setTimeout(() => handleVerifyOTP(), 100)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      inputRefs.current[5]?.focus()
      setTimeout(() => handleVerifyOTP(), 100)
    }
  }

  const handleUseDevCode = () => {
    if (devCode) {
      setOtp(devCode.split(''))
      setTimeout(() => handleVerifyOTP(), 100)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] px-6 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] rounded-full bg-[#4F46E5]/5 blur-3xl pointer-events-none" />
      <div className="absolute top-20 -right-40 w-[500px] h-[500px] rounded-full bg-[#818CF8]/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-[380px]">
        {/* Logo */}
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

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] p-8"
        >
          <AnimatePresence mode="wait">
            {step === 'email' ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full"
              >
                <h1 className="text-[22px] font-bold text-[#1a1a2e] mb-8 text-center">Create your workspace</h1>

                {/* Google OAuth */}
                <button
                  onClick={() => signIn('google', { callbackUrl: redirectTo })}
                  className="w-full h-[48px] flex items-center justify-center gap-3 bg-white/70 backdrop-blur-sm border border-white/80 rounded-xl text-[14px] font-medium text-[#1a1a2e] hover:bg-white/90 active:scale-[0.98] transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] mb-4"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>

                <div className="relative mb-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200/60" />
                  </div>
                  <div className="relative flex justify-center text-[11px]">
                    <span className="px-3 bg-white/60 text-gray-400">or</span>
                  </div>
                </div>

                <form onSubmit={handleSendOTP} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoFocus
                    className="w-full h-[48px] px-4 text-[14px] text-[#1a1a2e] bg-white/70 backdrop-blur-sm border border-white/80 rounded-xl outline-none transition-all placeholder:text-gray-400 focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                  />

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full h-[48px] bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.98] text-white text-[14px] font-semibold rounded-full transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Continue with email
                  </button>
                </form>

                <p className="mt-8 text-center text-[13px] text-gray-500">
                  By signing up, you agree to our{' '}
                  <Link href="/terms" className="text-[#4F46E5] hover:underline">Terms of Service</Link>
                </p>

                <p className="mt-4 text-center text-[13px] text-gray-500">
                  Already have an account?{' '}
                  <Link href="/login" className="text-[#4F46E5] font-medium hover:underline">Log in</Link>
                </p>
              </motion.div>
            ) : step === 'otp' ? (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full"
              >
                <h1 className="text-[22px] font-bold text-[#1a1a2e] mb-2 text-center">Enter your code</h1>
                <p className="text-[14px] text-gray-500 text-center mb-8">
                  We sent a 6-digit code to <span className="font-medium text-[#1a1a2e]">{email}</span>
                </p>

                <div className="flex gap-2.5 justify-center mb-6" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                      className="w-11 h-12 text-center text-[18px] font-bold text-[#1a1a2e] bg-white/70 backdrop-blur-sm border border-white/80 rounded-xl outline-none transition-all focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
                    />
                  ))}
                </div>

                {devCode && (
                  <button
                    onClick={handleUseDevCode}
                    className="w-full mb-4 text-[12px] text-[#4F46E5] hover:underline text-center"
                  >
                    Dev mode: Click to auto-fill code ({devCode})
                  </button>
                )}

                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full h-[48px] bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.98] text-white text-[14px] font-semibold rounded-full transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Verify & Create Account
                </button>

                <div className="mt-5 flex items-center justify-center gap-4">
                  <button
                    onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setDevCode(null) }}
                    className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-[#4F46E5] font-medium transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Change email
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={handleSendOTP as any}
                    disabled={loading}
                    className="text-[13px] text-gray-500 hover:text-[#4F46E5] font-medium transition-colors disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="plan"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full"
              >
                <h1 className="text-[22px] font-bold text-[#1a1a2e] mb-2 text-center">How do you want AI to run?</h1>
                <p className="text-[13px] text-gray-500 text-center mb-6">
                  Pick one now, or skip and set it up later in Settings.
                </p>

                {/* BYOK option */}
                <div className="rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm p-4 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="h-4 w-4 text-[#4F46E5]" />
                    <p className="text-[14px] font-semibold text-[#1a1a2e]">Bring your own key</p>
                    <span className="ml-auto text-[11px] font-semibold text-emerald-600">Free forever</span>
                  </div>
                  <p className="text-[12px] text-gray-500 mb-3">
                    Use your own Anthropic, OpenAI, or Gemini key. Never touches our budget, never expires.
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

                {/* Managed option */}
                <div className="rounded-xl border border-white/80 bg-white/70 backdrop-blur-sm p-4 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-[#4F46E5]" />
                    <p className="text-[14px] font-semibold text-[#1a1a2e]">Managed</p>
                    <span className="ml-auto text-[11px] font-semibold text-gray-500">$19/user/mo</span>
                  </div>
                  <p className="text-[12px] text-gray-500 mb-3">
                    We run the AI for you - no key to manage. 15-day free trial, no card needed.
                    Managed is org-based, so this creates your organization.
                  </p>
                  <input
                    type="text"
                    value={orgName}
                    onChange={e => setOrgName(e.target.value)}
                    placeholder="Organization name (e.g. Acme Inc)"
                    className="w-full h-[40px] px-3 mb-2 text-[13px] bg-white/70 border border-white/80 rounded-lg outline-none focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10"
                    onKeyDown={e => { if (e.key === 'Enter') handleStartTrial() }}
                  />
                  <button
                    onClick={handleStartTrial}
                    disabled={startingTrial || !orgName.trim()}
                    className="w-full h-[40px] bg-white border border-[#4F46E5]/30 hover:bg-[#4F46E5]/5 active:scale-[0.98] text-[#4F46E5] text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {startingTrial ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Start 15-day trial
                  </button>
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

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-5 mt-6 text-[11px] text-gray-400"
        >
          <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Encrypted in transit and at rest</span>
        </motion.div>
      </div>
    </div>
  )
}
