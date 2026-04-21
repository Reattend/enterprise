import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { and, eq, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  buildAccessContext,
  canAccessRecord,
  canManageRecordAccess,
  auditForAllUserOrgs,
  extractRequestMeta,
  handleEnterpriseError,
} from '@/lib/enterprise'

// Shape returned to the UI for each existing share row.
type ShareView = {
  id: string
  targetType: 'user' | 'department' | 'role'
  targetId: string
  targetLabel: string
  targetSublabel?: string | null
  sharedBy: string | null
  sharedAt: string
}

async function resolveRecordAndOrg(recordId: string) {
  const rec = await db.query.records.findFirst({
    where: eq(schema.records.id, recordId),
  })
  if (!rec) return null

  const link = await db.query.workspaceOrgLinks.findFirst({
    where: eq(schema.workspaceOrgLinks.workspaceId, rec.workspaceId),
  })
  return { record: rec, orgId: link?.organizationId ?? null }
}

// GET /api/enterprise/records/[recordId]/shares
// Returns current visibility, existing shares (hydrated with names), and
// picker options (users/departments/roles in the record's org) for the UI.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> },
) {
  try {
    const { userId } = await requireAuth()
    const { recordId } = await params

    const resolved = await resolveRecordAndOrg(recordId)
    if (!resolved) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const { record, orgId } = resolved

    // Read-gate: user must at least be able to see the record
    const ctx = await buildAccessContext(userId)
    if (!(await canAccessRecord(ctx, recordId))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const canManage = await canManageRecordAccess(ctx, recordId)

    // Existing shares
    const shareRows = await db
      .select()
      .from(schema.recordShares)
      .where(eq(schema.recordShares.recordId, recordId))

    const userIds = shareRows.map((s) => s.userId).filter((x): x is string => !!x)
    const deptIds = shareRows.map((s) => s.departmentId).filter((x): x is string => !!x)
    const roleIds = shareRows.map((s) => s.roleId).filter((x): x is string => !!x)

    const [userRows, deptRows, roleRows] = await Promise.all([
      userIds.length
        ? db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
            .from(schema.users)
            .where(inArray(schema.users.id, userIds))
        : Promise.resolve([] as { id: string; name: string | null; email: string }[]),
      deptIds.length
        ? db.select({ id: schema.departments.id, name: schema.departments.name, kind: schema.departments.kind })
            .from(schema.departments)
            .where(inArray(schema.departments.id, deptIds))
        : Promise.resolve([] as { id: string; name: string; kind: string }[]),
      roleIds.length
        ? db.select({ id: schema.employeeRoles.id, title: schema.employeeRoles.title })
            .from(schema.employeeRoles)
            .where(inArray(schema.employeeRoles.id, roleIds))
        : Promise.resolve([] as { id: string; title: string }[]),
    ])
    const userById = new Map(userRows.map((u) => [u.id, u]))
    const deptById = new Map(deptRows.map((d) => [d.id, d]))
    const roleById = new Map(roleRows.map((r) => [r.id, r]))

    const shares: ShareView[] = shareRows.map((s) => {
      if (s.userId) {
        const u = userById.get(s.userId)
        return {
          id: s.id,
          targetType: 'user',
          targetId: s.userId,
          targetLabel: u?.name || u?.email || 'Unknown user',
          targetSublabel: u?.email ?? null,
          sharedBy: s.sharedBy,
          sharedAt: s.sharedAt,
        }
      }
      if (s.departmentId) {
        const d = deptById.get(s.departmentId)
        return {
          id: s.id,
          targetType: 'department',
          targetId: s.departmentId,
          targetLabel: d?.name || 'Unknown department',
          targetSublabel: d?.kind ?? null,
          sharedBy: s.sharedBy,
          sharedAt: s.sharedAt,
        }
      }
      const r = s.roleId ? roleById.get(s.roleId) : null
      return {
        id: s.id,
        targetType: 'role',
        targetId: s.roleId || '',
        targetLabel: r?.title || 'Unknown role',
        targetSublabel: null,
        sharedBy: s.sharedBy,
        sharedAt: s.sharedAt,
      }
    })

    // Picker options — only populated when the record is org-linked and user
    // can manage access. Non-enterprise or view-only users get empty arrays.
    let pickerDepartments: { id: string; name: string; kind: string }[] = []
    let pickerRoles: { id: string; title: string }[] = []
    let pickerUsers: { id: string; name: string | null; email: string }[] = []

    if (orgId && canManage) {
      pickerDepartments = await db
        .select({ id: schema.departments.id, name: schema.departments.name, kind: schema.departments.kind })
        .from(schema.departments)
        .where(eq(schema.departments.organizationId, orgId))

      pickerRoles = await db
        .select({ id: schema.employeeRoles.id, title: schema.employeeRoles.title })
        .from(schema.employeeRoles)
        .where(eq(schema.employeeRoles.organizationId, orgId))

      const memberRows = await db
        .select({
          userId: schema.organizationMembers.userId,
          name: schema.users.name,
          email: schema.users.email,
        })
        .from(schema.organizationMembers)
        .innerJoin(schema.users, eq(schema.users.id, schema.organizationMembers.userId))
        .where(and(
          eq(schema.organizationMembers.organizationId, orgId),
          eq(schema.organizationMembers.status, 'active'),
        ))
      pickerUsers = memberRows.map((m) => ({ id: m.userId, name: m.name, email: m.email }))
    }

    return NextResponse.json({
      recordId,
      visibility: record.visibility,
      canManage,
      isEnterprise: !!orgId,
      shares,
      options: {
        departments: pickerDepartments,
        roles: pickerRoles,
        users: pickerUsers,
      },
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/records/[recordId]/shares
// Body: { targetType: 'user'|'department'|'role', targetId: string }
// Creates exactly one share row. Duplicate (type,id) pairs are idempotent.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> },
) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || 'unknown'
    const { recordId } = await params
    const body = await req.json()
    const { targetType, targetId } = body as { targetType?: string; targetId?: string }

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'targetType and targetId required' }, { status: 400 })
    }
    if (!['user', 'department', 'role'].includes(targetType)) {
      return NextResponse.json({ error: 'invalid targetType' }, { status: 400 })
    }

    const resolved = await resolveRecordAndOrg(recordId)
    if (!resolved) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const { record, orgId } = resolved

    const ctx = await buildAccessContext(userId)
    if (!(await canManageRecordAccess(ctx, recordId))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Validate target belongs to the same org (for dept/role) or is a member
    if (targetType === 'department') {
      if (!orgId) return NextResponse.json({ error: 'record is not org-linked' }, { status: 400 })
      const d = await db.query.departments.findFirst({
        where: and(eq(schema.departments.id, targetId), eq(schema.departments.organizationId, orgId)),
      })
      if (!d) return NextResponse.json({ error: 'department not in this org' }, { status: 400 })
    } else if (targetType === 'role') {
      if (!orgId) return NextResponse.json({ error: 'record is not org-linked' }, { status: 400 })
      const r = await db.query.employeeRoles.findFirst({
        where: and(eq(schema.employeeRoles.id, targetId), eq(schema.employeeRoles.organizationId, orgId)),
      })
      if (!r) return NextResponse.json({ error: 'role not in this org' }, { status: 400 })
    } else if (targetType === 'user') {
      // Must be an active org member (or workspace member for non-enterprise)
      if (orgId) {
        const m = await db.query.organizationMembers.findFirst({
          where: and(
            eq(schema.organizationMembers.userId, targetId),
            eq(schema.organizationMembers.organizationId, orgId),
            eq(schema.organizationMembers.status, 'active'),
          ),
        })
        if (!m) return NextResponse.json({ error: 'user not in this org' }, { status: 400 })
      } else {
        const u = await db.query.users.findFirst({ where: eq(schema.users.id, targetId) })
        if (!u) return NextResponse.json({ error: 'user not found' }, { status: 400 })
      }
    }

    // Idempotent insert: skip if an identical share already exists.
    const existing = await db
      .select({ id: schema.recordShares.id })
      .from(schema.recordShares)
      .where(and(
        eq(schema.recordShares.recordId, recordId),
        targetType === 'user' ? eq(schema.recordShares.userId, targetId) :
        targetType === 'department' ? eq(schema.recordShares.departmentId, targetId) :
        eq(schema.recordShares.roleId, targetId),
      ))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ share: { id: existing[0].id }, deduplicated: true })
    }

    const [inserted] = await db.insert(schema.recordShares).values({
      recordId,
      workspaceId: record.workspaceId,
      organizationId: orgId,
      userId: targetType === 'user' ? targetId : null,
      departmentId: targetType === 'department' ? targetId : null,
      roleId: targetType === 'role' ? targetId : null,
      sharedBy: userId,
    }).returning()

    const meta = extractRequestMeta(req)
    auditForAllUserOrgs(userId, userEmail, 'update', {
      resourceType: 'record_share',
      resourceId: inserted.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { recordId, targetType, targetId },
    })

    return NextResponse.json({ share: { id: inserted.id } })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// DELETE /api/enterprise/records/[recordId]/shares?shareId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> },
) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || 'unknown'
    const { recordId } = await params
    const shareId = req.nextUrl.searchParams.get('shareId')
    if (!shareId) return NextResponse.json({ error: 'shareId required' }, { status: 400 })

    const ctx = await buildAccessContext(userId)
    if (!(await canManageRecordAccess(ctx, recordId))) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    await db.delete(schema.recordShares).where(and(
      eq(schema.recordShares.id, shareId),
      eq(schema.recordShares.recordId, recordId),
    ))

    const meta = extractRequestMeta(req)
    auditForAllUserOrgs(userId, userEmail, 'update', {
      resourceType: 'record_share',
      resourceId: shareId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { recordId, removed: true },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
