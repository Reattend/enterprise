'use client'

import React, { Suspense, useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { signIn } from 'next-auth/react'

// Stripe-style split-screen sign-in. Left panel is the brand pitch on a
// dark navy background; right panel is the email + OTP form on white.
// Google OAuth was dropped — OTP-only is simpler, audit-friendly, and
// keeps the surface area small for security review.

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/app'
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // SSO handoff — if /api/sso/callback sent us back with ?sso_ticket=,
  // trade it for a NextAuth session. Also surface sso_error if present.
  useEffect(() => {
    const ticket = searchParams.get('sso_ticket')
    const ssoErr = searchParams.get('sso_error')
    if (ssoErr) {
      toast.error(`SSO failed: ${ssoErr}`)
      return
    }
    if (ticket) {
      signIn('sso-ticket', { ticket, callbackUrl })
    }
  }, [searchParams, callbackUrl])

  // Before sending an OTP, check if the email's domain has SSO enabled.
  // If so, bounce the user straight to the IdP instead.
  const maybeStartSso = async (emailAddr: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sso/initiate?email=${encodeURIComponent(emailAddr)}`, { redirect: 'manual' })
      if (res.type === 'opaqueredirect' || res.status === 0) {
        window.location.href = `/api/sso/initiate?email=${encodeURIComponent(emailAddr)}`
        return true
      }
      if (res.ok) {
        const data = await res.json().catch(() => null)
        if (data && data.ssoAvailable === false) return false
      }
    } catch { /* fall through to OTP */ }
    return false
  }

  const handleSendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email.trim()) return
    setLoading(true)

    if (await maybeStartSso(email.trim())) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to send code')
        return
      }
      if (data.dev) setDevCode(data.dev)
      toast.success('Code sent. Check your email.')
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
        toast.error(data.error || 'Invalid or expired code. Try again.')
        setOtp(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      } else {
        toast.success('Welcome back.')
        window.location.href = callbackUrl
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
    <AnimatePresence mode="wait">
      {step === 'email' ? (
        <motion.div
          key="email"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          <h1 className="text-[26px] md:text-[30px] font-semibold tracking-[-0.02em] text-[#1a1a2e]">
            Sign in to Reattend
          </h1>
          <p className="text-[14px] text-neutral-500 mt-2">
            Enter your work email and we&apos;ll send you a one-time code.
          </p>

          <form onSubmit={handleSendOTP} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="block text-[12px] font-semibold text-[#1a1a2e] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                autoFocus
                className="w-full h-11 px-3.5 text-[14px] text-[#1a1a2e] bg-white border border-neutral-300 rounded-md outline-none transition-all placeholder:text-neutral-400 focus:border-[#1a1a2e] focus:ring-2 focus:ring-[#1a1a2e]/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full h-11 inline-flex items-center justify-center gap-1.5 bg-[#1a1a2e] text-white text-[13px] font-semibold rounded-md transition-colors hover:bg-[#2d2b55] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  Continue with email <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-[12px] text-neutral-500">
            By continuing you agree to our{' '}
            <Link href="/terms" className="text-[#1a1a2e] font-semibold hover:underline">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-[#1a1a2e] font-semibold hover:underline">Privacy Policy</Link>.
          </p>

          <p className="mt-4 text-[13px] text-neutral-600">
            New to Reattend?{' '}
            <Link href="/register" className="text-[#1a1a2e] font-semibold hover:underline">Create an account</Link>
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="otp"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="w-full"
        >
          <h1 className="text-[26px] md:text-[30px] font-semibold tracking-[-0.02em] text-[#1a1a2e]">
            Check your email
          </h1>
          <p className="text-[14px] text-neutral-500 mt-2">
            We sent a 6-digit code to <span className="text-[#1a1a2e] font-semibold">{email}</span>.
          </p>

          <div className="flex gap-2 mt-8" onPaste={handleOtpPaste}>
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
                className="w-12 h-12 text-center text-[18px] font-bold tabular-nums text-[#1a1a2e] bg-white border border-neutral-300 rounded-md outline-none transition-all focus:border-[#1a1a2e] focus:ring-2 focus:ring-[#1a1a2e]/10"
              />
            ))}
          </div>

          {devCode && (
            <button
              onClick={handleUseDevCode}
              className="block mt-3 text-[12px] text-[#1a1a2e] hover:underline font-mono"
            >
              Dev: auto-fill {devCode}
            </button>
          )}

          <button
            onClick={handleVerifyOTP}
            disabled={loading || otp.join('').length !== 6}
            className="w-full mt-6 h-11 inline-flex items-center justify-center gap-1.5 bg-[#1a1a2e] text-white text-[13px] font-semibold rounded-md transition-colors hover:bg-[#2d2b55] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify and sign in'}
          </button>

          <div className="mt-6 flex items-center gap-5 text-[12px] text-neutral-500">
            <button
              onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setDevCode(null) }}
              className="inline-flex items-center gap-1 hover:text-[#1a1a2e] transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Use different email
            </button>
            <span className="text-neutral-300">·</span>
            <button
              onClick={() => handleSendOTP()}
              disabled={loading}
              className="hover:text-[#1a1a2e] transition-colors disabled:opacity-50"
            >
              Resend code
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Page shell — split-screen layout ──────────────────────────────────────
export default function LoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* LEFT — brand panel. Dark navy with a vibrant gradient blob and a
          big tagline. Hidden on small screens to keep the form above the
          fold. */}
      <div className="hidden lg:flex relative bg-[#1a1a2e] text-white p-12 flex-col overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-violet-600/40 via-fuchsia-600/30 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-180px] right-[-120px] w-[480px] h-[480px] rounded-full bg-gradient-to-br from-amber-500/20 via-rose-500/10 to-transparent blur-3xl pointer-events-none" />

        <Link href="/" className="relative flex items-center gap-2.5 z-10">
          <Image src="/black_logo.svg" alt="Reattend" width={32} height={32} className="h-8 w-8 invert" unoptimized />
          <span className="text-[17px] font-bold tracking-tight">Reattend</span>
          <span className="text-[10px] font-semibold text-white/50 ml-1.5 uppercase tracking-widest">Enterprise</span>
        </Link>

        <div className="relative flex-1 flex flex-col justify-center max-w-md z-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-5">
            Enterprise memory platform
          </p>
          <h2 className="text-[36px] md:text-[40px] font-semibold tracking-[-0.025em] leading-[1.1]">
            When people leave, the knowledge stays.
          </h2>
          <p className="text-[15px] text-white/70 mt-5 leading-relaxed">
            Decisions, context, and institutional knowledge. Captured, linked, and indexed by time. The most expensive thing in any organization is the knowledge that walks out the door on a Friday afternoon.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-5 text-[11px] text-white/50">
          <span>SOC 2 in progress</span>
          <span className="h-1 w-1 rounded-full bg-white/30" />
          <span>On-premise available</span>
          <span className="h-1 w-1 rounded-full bg-white/30" />
          <span>Customer-managed KMS</span>
        </div>
      </div>

      {/* RIGHT — sign-in form. Pure white, generous padding, single column. */}
      <div className="flex flex-col bg-white">
        {/* Mobile-only top bar with logo */}
        <div className="lg:hidden flex items-center justify-between px-6 h-16 border-b border-neutral-100">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/black_logo.svg" alt="Reattend" width={26} height={26} className="h-[26px] w-[26px]" unoptimized />
            <span className="text-[15px] font-bold tracking-tight text-[#1a1a2e]">Reattend</span>
          </Link>
          <Link href="/" className="text-[12px] text-neutral-500 hover:text-[#1a1a2e]">← Home</Link>
        </div>

        {/* Top-right "← Back to home" on desktop */}
        <div className="hidden lg:flex justify-end p-6">
          <Link href="/" className="text-[12px] text-neutral-500 hover:text-[#1a1a2e] inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[400px]">
            <Suspense fallback={
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
              </div>
            }>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <div className="px-6 pb-6 text-center text-[11px] text-neutral-400">
          &copy; {new Date().getFullYear()} Reattend Technologies Private Limited
        </div>
      </div>
    </div>
  )
}
