import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { and, eq } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'

// Per-user permission override CRUD. Backs the "Manage permissions" page on
// /app/admin/[orgId]/members/[userId]/permissions. Only org admins +
// super_admins can grant/revoke (org.members.manage gates everything here).
//
// Why this exists: a customer's COO doesn't need to be `admin` just to see
// the audit log. Grant her org.audit.read here instead of inventing a new role.

// GET — list overrides for a single member (so the UI can render checked state)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> },
) {
  try {
    const { orgId, userId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const overrides = await db
      .select()
      .from(schema.organizationMemberPermissionOverrides)
      .where(and(
        eq(schema.organizationMemberPermissionOverrides.organizationId, orgId),
        eq(schema.organizationMemberPermissionOverrides.userId, userId),
      ))

    return NextResponse.json({ overrides })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// POST — grant or revoke a permission for this user.
// Body: { permissionKey, granted, scope?, reason? }
//   granted=true  → grant on top of role default
//   granted=false → revoke from role default (revoke wins over grants)
//   scope=null/undefined → org-wide; scope=<dept_id> → dept-scoped
//
// Idempotent — upserts on (organization, user, permissionKey, scope).
// Audit log captures the grant/revoke + reason.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> },
) {
  try {
    const { orgId, userId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const { permissionKey, granted, scope, reason } = body as {
      permissionKey?: string
      granted?: boolean
      scope?: string | null
      reason?: string
    }
    if (!permissionKey || typeof permissionKey !== 'string') {
      return NextResponse.json({ error: 'permissionKey required' }, { status: 400 })
    }
    if (typeof granted !== 'boolean') {
      return NextResponse.json({ error: 'granted (boolean) required' }, { status: 400 })
    }

    // Validate target user is actually a member of this org (don't let admins
    // manufacture overrides for users in other orgs).
    const member = await db
      .select()
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.organizationId, orgId),
        eq(schema.organizationMembers.userId, userId),
      ))
      .limit(1)
    if (!member[0]) return NextResponse.json({ error: 'user is not a member of this org' }, { status: 404 })

    // If scope is a dept id, validate it's in this org.
    if (scope) {
      const dept = await db
        .select()
        .from(schema.departments)
        .where(and(
          eq(schema.departments.id, scope),
          eq(schema.departments.organizationId, orgId),
        ))
        .limit(1)
      if (!dept[0]) return NextResponse.json({ error: 'invalid scope (dept not in this org)' }, { status: 400 })
    }

    // Upsert. SQLite has ON CONFLICT but drizzle-sqlite requires explicit
    // conflict target — we just delete-then-insert. Idempotent under the
    // unique index (orgId, userId, permissionKey, scope).
    await db
      .delete(schema.organizationMemberPermissionOverrides)
      .where(and(
        eq(schema.organizationMemberPermissionOverrides.organizationId, orgId),
        eq(schema.organizationMemberPermissionOverrides.userId, userId),
        eq(schema.organizationMemberPermissionOverrides.permissionKey, permissionKey),
        scope ? eq(schema.organizationMemberPermissionOverrides.scope, scope) : eq(schema.organizationMemberPermissionOverrides.scope, null as unknown as string),
      ))

    await db.insert(schema.organizationMemberPermissionOverrides).values({
      organizationId: orgId,
      userId,
      permissionKey,
      scope: scope ?? null,
      granted,
      grantedByUserId: auth.userId,
      reason: reason?.trim() || null,
    })

    auditFromAuth(auth, 'permission_change', {
      resourceType: 'permission_override',
      resourceId: userId,
      departmentId: scope ?? null,
      metadata: {
        targetUserId: userId,
        permissionKey,
        granted,
        scope: scope ?? null,
        reason: reason?.trim() || null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// DELETE — remove an override (revert the user to pure role default).
// Body or query: { permissionKey, scope? }
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; userId: string }> },
) {
  try {
    const { orgId, userId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const permissionKey = req.nextUrl.searchParams.get('permissionKey')
    const scope = req.nextUrl.searchParams.get('scope')
    if (!permissionKey) {
      return NextResponse.json({ error: 'permissionKey required' }, { status: 400 })
    }

    const result = await db
      .delete(schema.organizationMemberPermissionOverrides)
      .where(and(
        eq(schema.organizationMemberPermissionOverrides.organizationId, orgId),
        eq(schema.organizationMemberPermissionOverrides.userId, userId),
        eq(schema.organizationMemberPermissionOverrides.permissionKey, permissionKey),
        scope ? eq(schema.organizationMemberPermissionOverrides.scope, scope) : eq(schema.organizationMemberPermissionOverrides.scope, null as unknown as string),
      ))

    auditFromAuth(auth, 'permission_change', {
      resourceType: 'permission_override',
      resourceId: userId,
      departmentId: scope ?? null,
      metadata: { targetUserId: userId, permissionKey, removedOverride: true, scope },
    })

    return NextResponse.json({ ok: true, deleted: (result as { changes?: number })?.changes ?? 0 })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
