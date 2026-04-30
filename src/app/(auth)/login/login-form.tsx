'use client'

import React, { Suspense, useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { signIn } from 'next-auth/react'

// Sign-in surface — visual structure from the claude.ai/design handoff
// (public/landing-design/signin.css), wired to the existing OTP + SSO
// backend. The handlers below are unchanged from the prior version:
//   - /api/sso/initiate domain check (auto-redirect to IdP if SSO is on)
//   - /api/auth/send-otp (six-digit code by email)
//   - /api/auth/verify-otp (verifies + opens session)
//   - sso-ticket NextAuth provider for the SSO callback round-trip
//   - dev-mode auto-fill of the returned code (dev only)

function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/app'
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(600)
  const [resendDisabled, setResendDisabled] = useState(true)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const emailInputRef = useRef<HTMLInputElement | null>(null)

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

  // Countdown for the resend button + visible code-validity timer.
  useEffect(() => {
    if (step !== 'otp') return
    setSecondsLeft(600)
    setResendDisabled(true)
    const resendUnlockAt = Date.now() + 30_000
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
      if (Date.now() >= resendUnlockAt) setResendDisabled(false)
    }, 1000)
    return () => clearInterval(id)
  }, [step])

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

  const handleSendOTP = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const value = email.trim()
    if (!value) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("That doesn't look like a valid email. Try again.")
      return
    }
    setEmailError(null)
    setLoading(true)

    if (await maybeStartSso(value)) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
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
  }, [email])

  const handleVerifyOTP = useCallback(async () => {
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
  }, [otp, email, callbackUrl])

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (newOtp.every((d) => d !== '') && newOtp.join('').length === 6) {
      setTimeout(() => handleVerifyOTP(), 100)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
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

  const handleResend = () => {
    if (resendDisabled) return
    handleSendOTP()
  }

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const r = (s % 60).toString().padStart(2, '0')
    return `${m}:${r}`
  }

  return step === 'email' ? (
    <div className="step active">
      <div className="ribbon">Step 01 / 02 · Sign in</div>
      <h2>Welcome back to <em>Reattend.</em></h2>
      <p className="lede">Enter your <strong>work email</strong> — we&apos;ll send a six-digit code. No passwords to forget, no recovery flows to dread.</p>

      <form onSubmit={handleSendOTP} noValidate>
        <div className={`si-field${emailError ? ' error' : ''}`}>
          <label htmlFor="email">Work email</label>
          <div className="input-wrap">
            <span className="leading">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            </span>
            <input
              ref={emailInputRef}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null) }}
              placeholder="you@company.com"
            />
          </div>
          <p className="hint">
            <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {emailError ? (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <circle cx="12" cy="16" r="0.5" fill="currentColor" />
                </>
              )}
            </svg>
            <span>{emailError || "Use the address tied to your workspace · we'll never share it."}</span>
          </p>
        </div>

        <button className="si-submit" type="submit" disabled={loading || !email.trim()}>
          {loading ? (
            <>
              <span className="si-spinner" />
              <span>Sending code…</span>
            </>
          ) : (
            <>
              <span>Send verification code</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="13 5 19 12 13 19" />
              </svg>
            </>
          )}
        </button>
      </form>

      <p className="si-legal">
        By continuing you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>. New to Reattend? <Link href="/register">Create an account</Link>.
      </p>
    </div>
  ) : (
    <div className="step active" onPaste={handleOtpPaste}>
      <button
        className="otp-back"
        type="button"
        onClick={() => { setStep('email'); setOtp(['', '', '', '', '', '']); setDevCode(null); setTimeout(() => emailInputRef.current?.focus(), 250) }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 6 9 12 15 18" />
        </svg>
        Use a different email
      </button>
      <div className="ribbon">Step 02 / 02 · Verify</div>
      <h2>Enter your <em>code.</em></h2>
      <p className="lede">We sent a six-digit code to <strong>{email}</strong>. It expires in <strong>10 minutes</strong>.</p>

      <span className="email-pill">
        <span className="ic" />
        <span>{email}</span>
      </span>

      <form onSubmit={(e) => { e.preventDefault(); handleVerifyOTP() }} noValidate>
        <div className="otp-row">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              className={`otp-input${digit ? ' filled' : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              autoFocus={i === 0}
            />
          ))}
        </div>

        <div className="otp-meta">
          <span className="countdown">
            {secondsLeft > 0 ? <>Code valid for <b>{fmtTime(secondsLeft)}</b></> : <>Code expired — <b>resend</b> below</>}
          </span>
          <button className="resend" type="button" disabled={resendDisabled || loading} onClick={handleResend}>
            Resend code
          </button>
        </div>

        <button className="si-submit" type="submit" disabled={loading || otp.join('').length !== 6} style={{ marginTop: 18 }}>
          {loading ? (
            <>
              <span className="si-spinner" />
              <span>Verifying…</span>
            </>
          ) : (
            <>
              <span>Verify &amp; continue</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="13 5 19 12 13 19" />
              </svg>
            </>
          )}
        </button>

        {devCode && (
          <p className="si-dev">
            Dev: <button type="button" onClick={handleUseDevCode}>auto-fill {devCode}</button>
          </p>
        )}
      </form>

      <p className="si-legal" style={{ marginTop: 18 }}>
        Didn&apos;t receive it? Check spam, then <button
          type="button"
          onClick={handleResend}
          disabled={resendDisabled || loading}
          style={{ background: 'none', border: 0, padding: 0, color: 'inherit', cursor: 'pointer', borderBottom: '1px solid currentColor' }}
        >resend</button>.
      </p>
    </div>
  )
}

// ─── Page shell — split-screen layout from the design handoff ──────────────
export default function LoginPage() {
  return (
    <>
      {/* Design tokens come from styles.css; page-specific styles from signin.css.
          Both are static assets in /public/landing-design/. */}
      <link rel="stylesheet" href="/landing-design/styles.css?v=16" />
      <link rel="stylesheet" href="/landing-design/signin.css?v=1" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;450;500;600&display=swap" rel="stylesheet" />

      <div className="si-page">
        {/* Slim topbar */}
        <header className="si-topbar">
          <Link className="si-brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/black_logo.svg" alt="Reattend" width={28} height={28} style={{ display: 'block' }} />
            <span>Reattend</span>
            <span className="ent-tag">Enterprise</span>
          </Link>
          <nav>
            <Link href="/">Home</Link>
            <Link href="/product">Product</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/compliance">Compliance</Link>
            <a href="mailto:sales@reattend.com">Need help?</a>
          </nav>
        </header>

        <main className="si-shell">
          {/* Left: brand canvas */}
          <section className="si-left">
            <div className="si-pitch">
              <span className="si-eyebrow"><span className="dot" />Live · 24,193 memories indexed</span>
              <h1>Sign in to your <em>second brain.</em></h1>
              <p>Reattend remembers what your team can&apos;t afford to forget — every Slack thread, ticket, design call, and shipped change — and recalls it at the speed of a question.</p>
            </div>

            <div className="si-orb" aria-hidden="true">
              <div className="orb-core">
                <div>
                  <div className="core-label">Recall index</div>
                  <div className="core-num">24,193</div>
                  <div className="core-sub">19 sources · <b>98.7%</b> coverage</div>
                </div>
              </div>
              <div className="orb-tag t1"><span className="ic" />Slack · 8,442</div>
              <div className="orb-tag t2 amber"><span className="ic" />Notion · 3,219</div>
              <div className="orb-tag t3 green"><span className="ic" />Linear · 1,574</div>
            </div>

            <div className="si-foot">
              <span>SOC 2 Type II</span>
              <span>HIPAA · BAA</span>
              <span>ISO 27001</span>
              <Link href="/compliance">Trust center →</Link>
            </div>
          </section>

          {/* Right: form */}
          <section className="si-right">
            <div className="si-card">
              <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
                <LoginForm />
              </Suspense>
            </div>
          </section>
        </main>
      </div>
    </>
  )
}
