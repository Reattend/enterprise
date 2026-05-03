import { NextResponse } from 'next/server'

// GET /api/auth/config
//
// Public, anonymous read. Tells the static signin.html page whether OTP
// verification is required so the JS can short-circuit the verify step
// during testing. The actual bypass happens server-side in the NextAuth
// credentials provider (lib/auth/index.ts) so this endpoint can't grant
// access on its own — it only signals UX.

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    otpRequired: process.env.TESTING_MODE !== 'true',
  })
}
