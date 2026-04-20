'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface UserInfo {
  token: string
  email: string
  name: string
  avatar: string | null
}

export default function DashboardClient() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSession()
  }, [])

  async function loadSession() {
    try {
      // Check if authenticated
      const sessionRes = await fetch('/api/auth/session')
      const session = await sessionRes.json()
      if (!session?.user?.email) {
        router.replace('/login/desktop')
        return
      }

      // Generate desktop token
      const tokenRes = await fetch('/api/auth/desktop-token', { method: 'POST' })
      if (!tokenRes.ok) throw new Error('Failed to generate token')
      const data = await tokenRes.json()
      setUser(data)

      // Try deep link in background (bonus — works if app is installed)
      try {
        const params = new URLSearchParams({
          token: data.token,
          email: data.email,
          name: data.name || '',
        })
        window.location.href = `reattend://auth/callback?${params.toString()}`
      } catch {}
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!user) return
    navigator.clipboard.writeText(user.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] px-6">
        <div className="text-center space-y-4">
          <p className="text-red-600 text-sm">{error || 'Something went wrong'}</p>
          <button
            onClick={() => router.replace('/login/desktop')}
            className="text-sm text-indigo-600 hover:underline"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] px-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-[#4F46E5]/8 via-[#818CF8]/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/black_logo.svg" alt="Reattend" className="h-9 w-9" />
          <span className="text-[20px] font-bold text-[#1a1a2e] tracking-tight">Reattend</span>
        </div>

        {/* Card */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl shadow-[0_8px_32px_rgba(79,70,229,0.06)] p-8">
          {/* Success header */}
          <div className="text-center mb-6">
            <div className="h-12 w-12 mx-auto mb-3 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-[22px] font-bold text-[#1a1a2e]">You&apos;re signed in!</h1>
            <p className="text-[14px] text-gray-500 mt-1">
              Copy your token below and paste it in the desktop app
            </p>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-gray-50/80">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-10 w-10 rounded-full" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {user.name && <p className="text-sm font-medium text-[#1a1a2e] truncate">{user.name}</p>}
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          {/* Token copy box */}
          <div className="mb-6">
            <label className="text-xs font-medium text-gray-500 mb-2 block">
              Your API Token
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 font-mono text-[13px] text-[#1a1a2e] truncate select-all">
                {user.token}
              </div>
              <button
                onClick={handleCopy}
                className={`shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  copied
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-[0_2px_8px_rgba(79,70,229,0.25)]'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-4 mb-6">
            <p className="text-[13px] font-medium text-[#1a1a2e] mb-2">
              How to connect:
            </p>
            <ol className="text-[12px] text-gray-600 space-y-1.5 list-decimal list-inside">
              <li>Open Reattend desktop app</li>
              <li>Go to <strong>Settings &rarr; Profile</strong></li>
              <li>Paste your token in the <strong>Connect Account</strong> field</li>
            </ol>
          </div>

          {/* Deep link fallback */}
          <div className="text-center">
            <p className="text-[11px] text-gray-400">
              If the desktop app opened automatically, you&apos;re all set!
            </p>
          </div>
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-4 mt-6 text-[12px] text-gray-400">
          <a href="/login/desktop" className="hover:text-indigo-600 transition-colors">
            Sign in as different user
          </a>
        </div>
      </div>
    </div>
  )
}
