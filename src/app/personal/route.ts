import { NextResponse } from 'next/server'

// /personal - retired 2026-08-25. Reattend is enterprise-only now; the
// solo-use-case marketing surface (personal.html) is no longer live. Its
// /register CTA would have produced a Personal (zero-org) account, which
// the main flow no longer supports - see today.md for the ~14 pre-existing
// accounts this doesn't affect. A future standalone Personal product is
// planned but not this codebase - see the same today.md entry.

export const dynamic = 'force-static'

export async function GET() {
  return NextResponse.redirect(new URL('/', process.env.NEXTAUTH_URL || 'http://localhost:3000'), 308)
}
