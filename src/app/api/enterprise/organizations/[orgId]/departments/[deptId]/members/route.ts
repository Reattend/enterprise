import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'

// DELETE /api/enterprise/organizations/[orgId]/departments/[deptId]/members?userId=...
// Remove a user from a department. Org membership is unaffected.
//
// Use the existing POST /organizations/[orgId]/members endpoint to ADD a
// user to a department (it upserts the dept_members row when the user
// already exists). This route only handles removal.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; deptId: string }> },
) {
  try {
    const { orgId, deptId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const dept = await db
      .select()
      .from(schema.departments)
      .where(and(
        eq(schema.departments.id, deptId),
        eq(schema.departments.organizationId, orgId),
      ))
      .limit(1)
    if (!dept[0]) return NextResponse.json({ error: 'department not found' }, { status: 404 })

    const existing = await db
      .select()
      .from(schema.departmentMembers)
      .where(and(
        eq(schema.departmentMembers.departmentId, deptId),
        eq(schema.departmentMembers.userId, userId),
      ))
      .limit(1)
    if (!existing[0]) {
      return NextResponse.json({ ok: true, message: 'not a member of this department' })
    }

    await db
      .delete(schema.departmentMembers)
      .where(and(
        eq(schema.departmentMembers.departmentId, deptId),
        eq(schema.departmentMembers.userId, userId),
      ))

    auditFromAuth(auth, 'permission_change', {
      resourceType: 'department_member',
      resourceId: userId,
      departmentId: deptId,
      metadata: { targetUserId: userId, removed: true },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
