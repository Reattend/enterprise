'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

/**
 * Desktop login page — after auth, redirects to /login/desktop/dashboard
 * where the user can copy their API token.
 */
export default function DesktopLoginClient() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(true)

  // On mount, check if already authenticated (e.g. after Google OAuth redirect)
  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      const res = await fetch('/api/auth/session')
      const session = await res.json()
      if (session?.user?.email) {
        // Already logged in — go straight to dashboard
        router.replace('/login/desktop/dashboard')
        return
      }
    } catch {}
    setChecking(false)
  }

  async function handleSendOtp() {
    if (!email) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send code')
      }
      setOtpSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleVerifyOtp() {
    if (!otp) return
    setSending(true)
    setError('')
    try {
      const result = await signIn('otp', {
        email,
        code: otp,
        redirect: false,
      })
      if (result?.error) {
        setError('Invalid code. Please try again.')
      } else if (result?.ok) {
        router.replace('/login/desktop/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] px-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-[380px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/black_logo.svg" alt="Reattend" className="h-9 w-9" />
          <span className="text-[20px] font-bold text-[#1a1a2e] tracking-tight">Reattend</span>
        </div>

        {/* Card */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] p-8">
          <h1 className="text-[22px] font-bold text-[#1a1a2e] mb-2 text-center">Sign in to Reattend</h1>
          <p className="text-[14px] text-gray-500 mb-8 text-center">Unlock more daily AI operations</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={() => signIn('google', { callbackUrl: '/login/desktop/dashboard' })}
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

          {/* Email OTP */}
          {!otpSent ? (
            <div className="space-y-3">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                autoFocus
                className="w-full h-[48px] px-4 text-[14px] text-[#1a1a2e] bg-white/70 backdrop-blur-sm border border-white/80 rounded-xl outline-none transition-all placeholder:text-gray-400 focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
              />
              <button
                onClick={handleSendOtp}
                disabled={sending || !email}
                className="w-full h-[48px] bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.98] text-white text-[14px] font-semibold rounded-full transition-all flex items-center justify-center disabled:opacity-50 shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
              >
                {sending ? 'Sending...' : 'Send login code'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[14px] text-gray-500 text-center">
                Code sent to <span className="font-medium text-[#1a1a2e]">{email}</span>
              </p>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                maxLength={6}
                autoFocus
                className="w-full h-[48px] px-4 text-[14px] text-[#1a1a2e] bg-white/70 backdrop-blur-sm border border-white/80 rounded-xl outline-none text-center tracking-[0.5em] font-mono transition-all focus:border-[#4F46E5]/40 focus:ring-2 focus:ring-[#4F46E5]/10 shadow-[0_2px_8px_rgba(0,0,0,0.02)]"
              />
              <button
                onClick={handleVerifyOtp}
                disabled={sending || otp.length < 6}
                className="w-full h-[48px] bg-[#4F46E5] hover:bg-[#4338CA] active:scale-[0.98] text-white text-[14px] font-semibold rounded-full transition-all flex items-center justify-center disabled:opacity-50 shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
              >
                {sending ? 'Verifying...' : 'Verify & Sign in'}
              </button>
              <button
                onClick={() => { setOtpSent(false); setOtp('') }}
                className="w-full text-[12px] text-gray-400 hover:text-indigo-600 transition-colors"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="text-[11px] text-center text-gray-400 mt-6">
          Your data stays local. Account just unlocks higher AI limits.
        </p>
      </div>
    </div>
  )
}
