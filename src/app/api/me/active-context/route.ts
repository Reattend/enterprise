import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { and, eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

// Server-persisted view-context for the topbar switcher.
//
// Why server-side: the web app, the Chrome extension, and the desktop app
// all need to agree on which context the user is currently viewing
// (Personal vs. a specific org). localStorage works for one tab; the
// moment a user has the web app + the desktop running, we need a single
// source of truth.
//
// Storage: users.active_context_org_id (nullable). NULL = Personal context.
// String = active org id (validated to be one the user is a member of).

interface PersonalContext {
  context: 'personal'
  orgId: null
}
interface OrgContext {
  context: 'org'
  orgId: string
}
type Context = PersonalContext | OrgContext

// GET /api/me/active-context
// Returns the user's last-picked context. If they have orgs but never
// picked one, returns Personal - clients should fall back to their own
// "auto-pick first org for first-load hybrid users" logic; this endpoint
// only stores explicit picks.
export async function GET() {
  try {
    const { userId } = await requireAuth()

    const [user] = await db
      .select({ activeContextOrgId: schema.users.activeContextOrgId })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ctx: Context = user.activeContextOrgId
      ? { context: 'org', orgId: user.activeContextOrgId }
      : { context: 'personal', orgId: null }
    return NextResponse.json(ctx)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[me/active-context GET]', error)
    return NextResponse.json({ error: error.message || 'failed' }, { status: 500 })
  }
}

// POST /api/me/active-context
// Body: { context: 'personal' } | { context: 'org', orgId: string }
// Validates that orgId (when present) is one the caller belongs to.
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await req.json() as { context?: string; orgId?: string | null }
    if (body.context !== 'personal' && body.context !== 'org') {
      return NextResponse.json({ error: 'context must be "personal" or "org"' }, { status: 400 })
    }

    let activeContextOrgId: string | null = null
    if (body.context === 'org') {
      if (!body.orgId || typeof body.orgId !== 'string') {
        return NextResponse.json({ error: 'orgId is required when context is "org"' }, { status: 400 })
      }
      // Verify membership - without this, anyone could pin themselves to
      // any org id and the topbar would happily render it (until the
      // org-scoped APIs 403'd them).
      const membership = await db
        .select({ id: schema.organizationMembers.id })
        .from(schema.organizationMembers)
        .where(and(
          eq(schema.organizationMembers.userId, userId),
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
      .where(eq(schema.users.id, userId))

    const ctx: Context = activeContextOrgId
      ? { context: 'org', orgId: activeContextOrgId }
      : { context: 'personal', orgId: null }
    return NextResponse.json(ctx)
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[me/active-context POST]', error)
    return NextResponse.json({ error: error.message || 'failed' }, { status: 500 })
  }
}
