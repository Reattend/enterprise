import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

// /test-login — only renders on the test droplet (ALLOW_TEST_PASSWORD_LOGIN=true).
// On production this returns 404 so the page is invisible to anyone scanning
// reattend.com.
//
// The form posts directly to NextAuth's standard credentials callback for
// the test-password provider (src/lib/auth/index.ts). The provider gates on:
//   - same env var being true
//   - email ending in @seed.reattend.local
//   - password matching TEST_LOGIN_PASSWORD
//
// All three must pass. Even if someone discovers test.reattend.com, they need
// the password AND a valid seed email AND to be on the test droplet.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test Login',
  robots: { index: false, follow: false },
}

export default function TestLoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string }
}) {
  if (process.env.ALLOW_TEST_PASSWORD_LOGIN !== 'true') {
    notFound()
  }

  const callbackUrl = searchParams.callbackUrl || '/app'
  const error = searchParams.error

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-rose-50 via-white to-rose-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-full mb-4">
            Test environment
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900">
            Sign in as a seed user
          </h1>
          <p className="text-[13px] text-zinc-500 mt-1.5 leading-relaxed">
            Email must end with <code className="text-[11.5px] px-1 py-0.5 bg-zinc-100 rounded">@seed.reattend.local</code>.<br />
            Same shared password for every seed user.
          </p>
        </div>

        <form
          method="post"
          action={`/api/auth/callback/test-password?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3"
        >
          <CsrfHiddenInput />

          {error && (
            <div className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2 leading-snug">
              Login failed. Check the email domain and shared password.
            </div>
          )}

          <div>
            <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              autoComplete="username"
              spellCheck={false}
              placeholder="priya.sengupta@seed.reattend.local"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
              Shared password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 mt-1 bg-zinc-900 hover:bg-zinc-800 text-white text-[13px] font-semibold rounded-lg transition-colors"
          >
            Sign in
          </button>
        </form>

        <p className="text-center text-[11px] text-zinc-400 mt-6">
          Need the seed roster? See <code className="text-[11px] px-1 py-0.5 bg-zinc-100 rounded">STAGING.md</code> in the repo.
        </p>
      </div>
    </div>
  )
}

// NextAuth's credentials callback requires a CSRF token in the form post.
// Fetched server-side so the page is fully static-friendly and renders
// without any client-side JS.
async function CsrfHiddenInput() {
  const { headers } = await import('next/headers')
  const h = headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') || 'https'
  let token = ''
  try {
    const res = await fetch(`${proto}://${host}/api/auth/csrf`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json() as { csrfToken?: string }
      token = data.csrfToken || ''
    }
  } catch { /* form will fail with friendly error */ }
  return <input type="hidden" name="csrfToken" value={token} />
}
