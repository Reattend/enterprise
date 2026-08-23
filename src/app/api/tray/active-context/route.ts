import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { and, eq } from 'drizzle-orm'
import { validateApiToken } from '@/lib/auth/token'
import { requireExtensionAccess } from '@/lib/billing/gates'

// Bearer-token twin of /api/me/active-context.
//
// The /api/me/active-context endpoint authenticates via NextAuth session
// cookies (the web app). Bearer-token clients (Chrome extension, desktop
// app) need the same read/write surface to keep their topbar switcher
// in sync with the web app. Same column underneath
// (users.active_context_org_id), same behavior, just a different auth
// mechanism.
//
// Gated by requireExtensionAccess (Professional+) - Solo Free users
// can't issue extension/desktop tokens in the first place, so this gate
// is defense in depth.

export async function GET(req: NextRequest) {
  const auth = await validateApiToken(req.headers.get('authorization'))
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const gateRes = await requireExtensionAccess(auth.userId)
  if (gateRes) return gateRes

  const [user] = await db
    .select({ activeContextOrgId: schema.users.activeContextOrgId })
    .from(schema.users)
    .where(eq(schema.users.id, auth.userId))
    .limit(1)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(
    user.activeContextOrgId
      ? { context: 'org', orgId: user.activeContextOrgId }
      : { context: 'personal', orgId: null },
  )
}

export async function POST(req: NextRequest) {
  const auth = await validateApiToken(req.headers.get('authorization'))
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const gateRes = await requireExtensionAccess(auth.userId)
  if (gateRes) return gateRes

  const body = await req.json() as { context?: string; orgId?: string | null }
  if (body.context !== 'personal' && body.context !== 'org') {
    return NextResponse.json({ error: 'context must be "personal" or "org"' }, { status: 400 })
  }

  let activeContextOrgId: string | null = null
  if (body.context === 'org') {
    if (!body.orgId || typeof body.orgId !== 'string') {
      return NextResponse.json({ error: 'orgId is required when context is "org"' }, { status: 400 })
    }
    const membership = await db
      .select({ id: schema.organizationMembers.id })
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.userId, auth.userId),
        eq(schema.organizationMembers.organizationId, body.orgId),
      ))
      .limit(1)
    if (!membership[0]) {
      return NextResponse.json({ error: 'not a member of that org' }, { status: 403 })
    }
    activeContextOrgId = body.orgId
  }

  await db
    .update(schema.users)
    .set({ activeContextOrgId })
    .where(eq(schema.users.id, auth.userId))

  return NextResponse.json(
    activeContextOrgId
      ? { context: 'org', orgId: activeContextOrgId }
      : { context: 'personal', orgId: null },
  )
}
