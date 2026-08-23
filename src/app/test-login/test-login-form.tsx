'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'

// Test-droplet sign-in form. NextAuth's client signIn() handles the CSRF
// cookie + token round-trip natively - none of the manual hidden-input
// hand-off the first iteration tried.

export function TestLoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await signIn('test-password', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl: '/app',
      })
      if (!res || res.error) {
        setError('Sign-in failed. Check that the email ends in @seed.reattend.local and the shared password is correct.')
        setBusy(false)
        return
      }
      // Hard navigate so server components re-evaluate session state.
      window.location.href = res.url || '/app'
    } catch (err) {
      console.error(err)
      setError('Unexpected error. Check the console.')
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3"
    >
      {error && (
        <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 leading-snug">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          spellCheck={false}
          placeholder="priya.sengupta@seed.reattend.local"
          className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
          autoFocus
          disabled={busy}
        />
      </div>

      <div>
        <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
          Shared password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
          disabled={busy}
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full py-2 mt-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[13px] font-semibold rounded-lg transition-colors"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
