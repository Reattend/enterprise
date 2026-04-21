import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../auth'
import {
  getOrgContext,
  hasOrgPermission,
  type OrgContext,
  type OrgPermission,
  ForbiddenError,
} from './rbac'
import { writeAuditAsync, type AuditAction } from './audit'
import { db } from '../db'
import { users as usersTable } from '../db/schema'
import { eq } from 'drizzle-orm'

export interface EnterpriseAuth {
  userId: string
  userEmail: string
  orgCtx: OrgContext
  request: NextRequest
}

// Resolve auth + org membership + required permission in one call.
// Returns a standardized 401/403 response if the caller is not authorized.
export async function requireOrgAuth(
  req: NextRequest,
  organizationId: string,
  permission?: OrgPermission,
): Promise<EnterpriseAuth | NextResponse> {
  let userId: string
  try {
    const auth = await requireAuth()
    userId = auth.userId
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const orgCtx = await getOrgContext(userId, organizationId)
  if (!orgCtx || orgCtx.orgStatus !== 'active') {
    return NextResponse.json({ error: 'not a member of this organization' }, { status: 403 })
  }

  if (permission && !hasOrgPermission(orgCtx, permission)) {
    return NextResponse.json({ error: `missing permission: ${permission}` }, { status: 403 })
  }

  const row = await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId)).limit(1)
  const userEmail = row[0]?.email ?? 'unknown'

  return { userId, userEmail, orgCtx, request: req }
}

// Type guard — NextResponse is thrown back to the client, EnterpriseAuth proceeds.
export function isAuthResponse(x: EnterpriseAuth | NextResponse): x is NextResponse {
  return x instanceof NextResponse
}

export function extractRequestMeta(req: NextRequest): { ipAddress: string | undefined; userAgent: string | undefined } {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    undefined
  const userAgent = req.headers.get('user-agent') || undefined
  return { ipAddress, userAgent }
}

// Convenience: audit an action from within an authed route handler.
export function auditFromAuth(
  auth: EnterpriseAuth,
  action: AuditAction,
  opts: {
    resourceType?: string
    resourceId?: string
    departmentId?: string | null
    metadata?: Record<string, unknown>
  } = {},
): void {
  const meta = extractRequestMeta(auth.request)
  writeAuditAsync({
    organizationId: auth.orgCtx.organizationId,
    userId: auth.userId,
    userEmail: auth.userEmail,
    action,
    departmentId: opts.departmentId ?? null,
    resourceType: opts.resourceType,
    resourceId: opts.resourceId,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata: opts.metadata,
  })
}

export function handleEnterpriseError(err: unknown): NextResponse {
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.reason }, { status: 403 })
  }
  console.error('[enterprise api]', err)
  return NextResponse.json({ error: 'internal error' }, { status: 500 })
}
