import { NextRequest } from 'next/server'
import { validateApiToken } from '@/lib/auth/token'
import { getOrCreateSubscription, hasFeature } from '@/lib/billing/gates'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

/**
 * GET /api/tray/me
 * Returns the authenticated user's basic info + subscription tier so the
 * extension can render an upgrade prompt when extensionAccess is false.
 *
 * This endpoint is intentionally NOT gated by requireExtensionAccess — the
 * extension needs to bootstrap and know "you're on Free, upgrade to use me"
 * even when every other tray endpoint is returning 402.
 */
export async function GET(req: NextRequest) {
  const auth = await validateApiToken(req.headers.get('authorization'))
  if (!auth) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, auth.userId),
  })

  if (!user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  const sub = await getOrCreateSubscription(auth.userId)
  const extensionAccess = hasFeature(sub, 'chromeExtensionAutoIngest')

  // Active context: NULL = Personal, otherwise the orgId. Same value the
  // web app reads/writes via /api/me/active-context, exposed here so the
  // desktop + extension can seed their topbar switcher on token connect.
  const activeContext = user.activeContextOrgId
    ? { context: 'org' as const, orgId: user.activeContextOrgId }
    : { context: 'personal' as const, orgId: null as string | null }

  return Response.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    tier: sub.tier,
    extensionAccess,
    activeContext,
    upgradeUrl: extensionAccess ? null : 'https://reattend.com/pricing',
  })
}
