import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

// GET /api/enterprise/organizations/check-slug?slug=foo
//
// Live availability check used by the onboarding flow so the user finds out
// the slug is taken WHILE they're typing - not on Continue at the end of
// step 3. Auth-required (any signed-in user) so we don't leak the slug
// directory to anonymous traffic.
//
// Response: { slug, normalized, available, reason? }
//   reason = 'invalid_format' | 'taken' | undefined
export const dynamic = 'force-dynamic'

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const raw = (req.nextUrl.searchParams.get('slug') || '').trim()
  // Re-apply the same normalization the create-org route uses so the user
  // gets the same answer here as they would on submit.
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64)

  if (!normalized) {
    return NextResponse.json({ slug: raw, normalized, available: false, reason: 'invalid_format' })
  }
  if (!SLUG_RE.test(normalized)) {
    return NextResponse.json({ slug: raw, normalized, available: false, reason: 'invalid_format' })
  }

  const existing = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, normalized))
    .limit(1)

  if (existing[0]) {
    return NextResponse.json({ slug: raw, normalized, available: false, reason: 'taken' })
  }
  return NextResponse.json({ slug: raw, normalized, available: true })
}
