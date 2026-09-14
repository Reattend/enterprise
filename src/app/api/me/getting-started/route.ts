import { NextRequest, NextResponse } from 'next/server'
import { and, eq, inArray, isNotNull, ne, or, sql } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { resolveByokKey } from '@/lib/ai/byok'
import { getOrCreateSubscription, getOrgBillingSubscription } from '@/lib/billing/gates'

// GET /api/me/getting-started?orgId=
// Drives the "Get Reattend working" checklist on the home page. Every item
// is read from real activity, never from "the user clicked a button", so the
// list ticks itself off as people actually use the product:
//
//   ai           an AI key is connected, or a Managed plan/trial is active
//   memory       there is a memory of theirs: one they created, or one filed
//                into their personal workspace (personal) / a workspace they
//                belong to in the org (org). Extension and integration
//                captures are filed by the AI with createdBy 'agent', so
//                createdBy alone would never tick for them.
//   extension    the extension has used one of their tokens
//   integration  an integration (Gmail, Notion, ...) is connected
//   asked        they have a saved conversation with the AI
//   invited      org admins only: someone else is in, or invited to, the org
//
// orgId is the client's active org. It only counts if the user is an active
// member; otherwise the personal answers are returned (no mixing).
export async function GET(req: NextRequest) {
  try {
    const { userId, workspaceId: personalWorkspaceId } = await requireAuth()
    const requestedOrg = req.nextUrl.searchParams.get('orgId')

    let orgId: string | null = null
    let orgRole: string | null = null
    if (requestedOrg) {
      const m = await db
        .select({ role: schema.organizationMembers.role })
        .from(schema.organizationMembers)
        .where(and(
          eq(schema.organizationMembers.organizationId, requestedOrg),
          eq(schema.organizationMembers.userId, userId),
          eq(schema.organizationMembers.status, 'active'),
        ))
        .limit(1)
      if (m[0]) { orgId = requestedOrg; orgRole = m[0].role }
    }

    const exists = async (q: Promise<unknown[]>) => (await q).length > 0

    // Workspaces whose memories count as "theirs" in this context.
    let memoryWorkspaces: string[] = [personalWorkspaceId]
    if (orgId) {
      const rows = await db
        .select({ id: schema.workspaceOrgLinks.workspaceId })
        .from(schema.workspaceOrgLinks)
        .innerJoin(schema.workspaceMembers, and(
          eq(schema.workspaceMembers.workspaceId, schema.workspaceOrgLinks.workspaceId),
          eq(schema.workspaceMembers.userId, userId),
        ))
        .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
      memoryWorkspaces = rows.map((r) => r.id)
    }

    const [byok, sub, memory, extension, integration, asked] = await Promise.all([
      resolveByokKey({ organizationId: orgId, userId }),
      orgId ? getOrgBillingSubscription(orgId).then((s) => s ?? getOrCreateSubscription(userId)) : getOrCreateSubscription(userId),
      exists(db.select({ id: schema.records.id }).from(schema.records).where(
        memoryWorkspaces.length
          ? or(eq(schema.records.createdBy, userId), inArray(schema.records.workspaceId, memoryWorkspaces))
          : eq(schema.records.createdBy, userId),
      ).limit(1)),
      exists(db.select({ id: schema.apiTokens.id }).from(schema.apiTokens)
        .where(and(eq(schema.apiTokens.userId, userId), isNotNull(schema.apiTokens.lastUsedAt))).limit(1)),
      exists(db.select({ id: schema.integrationsConnections.id }).from(schema.integrationsConnections)
        .where(and(eq(schema.integrationsConnections.userId, userId), eq(schema.integrationsConnections.status, 'connected'))).limit(1)),
      exists(db.select({ id: schema.chatSessions.id }).from(schema.chatSessions).where(eq(schema.chatSessions.userId, userId)).limit(1)),
    ])

    let invited: boolean | null = null
    const isOrgAdmin = orgRole === 'super_admin' || orgRole === 'admin'
    if (orgId && isOrgAdmin) {
      const [{ others }] = await db
        .select({ others: sql<number>`count(*)` })
        .from(schema.organizationMembers)
        .where(and(eq(schema.organizationMembers.organizationId, orgId), ne(schema.organizationMembers.userId, userId)))
      const pending = await exists(db.select({ id: schema.enterpriseInvites.id }).from(schema.enterpriseInvites)
        .where(and(eq(schema.enterpriseInvites.organizationId, orgId), eq(schema.enterpriseInvites.status, 'pending'))).limit(1))
      invited = Number(others) > 0 || pending
    }

    return NextResponse.json({
      context: orgId ? 'org' : 'personal',
      orgId,
      isOrgAdmin,
      // The no-card trial is one-time; once used, the next step is a plan.
      trialUsed: !!sub?.trialEndsAt,
      items: {
        ai: !!byok || (sub?.tier ?? 'free') !== 'free',
        memory,
        extension,
        integration,
        asked,
        invited,
      },
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
