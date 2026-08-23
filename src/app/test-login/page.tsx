import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TestLoginForm } from './test-login-form'

// /test-login - only renders on the test droplet (ALLOW_TEST_PASSWORD_LOGIN=true).
// On production this returns 404 so the page is invisible to anyone scanning
// reattend.com.
//
// The actual form is a client component that goes through NextAuth's
// signIn('test-password') - it handles CSRF cookie + token round-trip
// correctly. The first version of this page rendered the form server-side
// and posted directly to /api/auth/callback/test-password with a
// server-fetched CSRF token; that path silently failed because the CSRF
// *cookie* (separate from the token) never reached the browser.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Test Login',
  robots: { index: false, follow: false },
}

export default function TestLoginPage() {
  if (process.env.ALLOW_TEST_PASSWORD_LOGIN !== 'true') {
    notFound()
  }

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

        <TestLoginForm />

        <p className="text-center text-[11px] text-zinc-400 mt-6">
          Need the seed roster? See <code className="text-[11px] px-1 py-0.5 bg-zinc-100 rounded">STAGING.md</code> in the repo.
        </p>
      </div>
    </div>
  )
}
