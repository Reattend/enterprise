import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, desc, inArray } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
  listAccessibleDepartmentIds,
  notifyDepartmentMembers,
} from '@/lib/enterprise'

// GET /api/enterprise/organizations/[orgId]/decisions
// Filters: ?status=active|superseded|reversed|archived  &departmentId=...
// RBAC: decisions not tied to a department that the caller can see are filtered out.
// Org admins/super_admins see everything.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const p = req.nextUrl.searchParams
    const status = p.get('status')
    const departmentId = p.get('departmentId') || undefined

    const conds = [eq(schema.decisions.organizationId, orgId)]
    if (status && ['active', 'superseded', 'reversed', 'archived'].includes(status)) {
      conds.push(eq(schema.decisions.status, status as 'active' | 'superseded' | 'reversed' | 'archived'))
    }
    if (departmentId) conds.push(eq(schema.decisions.departmentId, departmentId))

    const rows = await db
      .select()
      .from(schema.decisions)
      .where(and(...conds))
      .orderBy(desc(schema.decisions.decidedAt))
      .limit(500)

    // Access filter for non-admin org members
    const isAdmin = auth.orgCtx.orgRole === 'super_admin' || auth.orgCtx.orgRole === 'admin'
    let visible = rows
    if (!isAdmin) {
      const accessible = new Set(await listAccessibleDepartmentIds(auth.userId, orgId))
      visible = rows.filter((d) => !d.departmentId || accessible.has(d.departmentId))
    }

    return NextResponse.json({ decisions: visible })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/organizations/[orgId]/decisions
// Body: { title, context?, rationale?, departmentId (required — resolves workspace),
//         workspaceId? (advanced override), recordId?, decidedAt? (ISO),
//         decidedByRoleId?, tags? }
// Caller is the decidedByUserId. If not provided, decidedAt = now.
// Workspace resolution: given a departmentId, we find its backing workspace
// via workspace_org_links. The user never needs to know workspace ids.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const {
      title,
      context,
      rationale,
      workspaceId: rawWorkspaceId,
      recordId,
      departmentId,
      decidedAt,
      decidedByRoleId,
      tags,
    } = body as {
      title?: string
      context?: string
      rationale?: string
      workspaceId?: string
      recordId?: string
      departmentId?: string
      decidedAt?: string
      decidedByRoleId?: string
      tags?: string[]
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (!departmentId && !rawWorkspaceId) {
      return NextResponse.json({ error: 'departmentId is required' }, { status: 400 })
    }

    // If departmentId given, validate it's in-org (do this first — both branches need it)
    let deptRow: typeof schema.departments.$inferSelect | undefined
    if (departmentId) {
      const rows = await db.select().from(schema.departments).where(eq(schema.departments.id, departmentId)).limit(1)
      deptRow = rows[0]
      if (!deptRow || deptRow.organizationId !== orgId) {
        return NextResponse.json({ error: 'invalid departmentId' }, { status: 400 })
      }
    }

    // Resolve the workspace. Preference order:
    //   1. Explicit workspaceId (advanced users / API callers)
    //   2. The workspace linked to the given department
    //   3. For non-team depts: fall back to the first descendant team's workspace
    //   4. As a last resort: any workspace linked to the org
    let workspaceId: string | undefined = rawWorkspaceId
    if (!workspaceId && departmentId) {
      const direct = await db
        .select()
        .from(schema.workspaceOrgLinks)
        .where(and(
          eq(schema.workspaceOrgLinks.organizationId, orgId),
          eq(schema.workspaceOrgLinks.departmentId, departmentId),
        ))
        .limit(1)
      if (direct[0]) {
        workspaceId = direct[0].workspaceId
      } else {
        // Walk descendants — collect all dept ids reachable from this dept,
        // then pick the first one that has an auto-provisioned workspace.
        // Tree is small enough that an in-memory BFS beats a recursive CTE.
        const allDepts = await db
          .select({ id: schema.departments.id, parentId: schema.departments.parentId })
          .from(schema.departments)
          .where(eq(schema.departments.organizationId, orgId))
        const childrenByParent = new Map<string, string[]>()
        for (const d of allDepts) {
          const arr = childrenByParent.get(d.parentId || '') || []
          arr.push(d.id)
          childrenByParent.set(d.parentId || '', arr)
        }
        const queue: string[] = [...(childrenByParent.get(departmentId) || [])]
        const descendantIds: string[] = []
        while (queue.length) {
          const id = queue.shift()!
          descendantIds.push(id)
          for (const c of childrenByParent.get(id) || []) queue.push(c)
        }
        if (descendantIds.length > 0) {
          const descendantLink = await db
            .select()
            .from(schema.workspaceOrgLinks)
            .where(and(
              eq(schema.workspaceOrgLinks.organizationId, orgId),
              inArray(schema.workspaceOrgLinks.departmentId, descendantIds),
            ))
            .limit(1)
          if (descendantLink[0]) {
            workspaceId = descendantLink[0].workspaceId
          }
        }
      }
    }
    // Last-resort fallback: any workspace tied to this org. Better than
    // throwing — a decision still lands somewhere queryable, even if the
    // owning department is a non-team. Admin can recategorize later.
    if (!workspaceId) {
      const orgWs = await db
        .select()
        .from(schema.workspaceOrgLinks)
        .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
        .limit(1)
      if (orgWs[0]) workspaceId = orgWs[0].workspaceId
    }
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'no workspace linked to this org yet', hint: 'create a team-kind department from Settings → Departments to get an auto-provisioned workspace' },
        { status: 400 },
      )
    }

    // Validate workspace belongs to this org
    const link = await db
      .select()
      .from(schema.workspaceOrgLinks)
      .where(and(
        eq(schema.workspaceOrgLinks.workspaceId, workspaceId),
        eq(schema.workspaceOrgLinks.organizationId, orgId),
      ))
      .limit(1)
    if (!link[0]) {
      return NextResponse.json({ error: 'workspace does not belong to this org' }, { status: 400 })
    }

    // If recordId given, validate it belongs to the given workspace
    if (recordId) {
      const rec = await db.select().from(schema.records).where(eq(schema.records.id, recordId)).limit(1)
      if (!rec[0] || rec[0].workspaceId !== workspaceId) {
        return NextResponse.json({ error: 'record does not belong to workspace' }, { status: 400 })
      }
    }

    // If decidedByRoleId given, validate it's in-org
    if (decidedByRoleId) {
      const role = await db.select().from(schema.employeeRoles).where(eq(schema.employeeRoles.id, decidedByRoleId)).limit(1)
      if (!role[0] || role[0].organizationId !== orgId) {
        return NextResponse.json({ error: 'invalid decidedByRoleId' }, { status: 400 })
      }
    }

    const decisionId = crypto.randomUUID()
    const decidedAtIso = decidedAt && !isNaN(Date.parse(decidedAt))
      ? new Date(decidedAt).toISOString()
      : new Date().toISOString()

    await db.insert(schema.decisions).values({
      id: decisionId,
      organizationId: orgId,
      departmentId: departmentId || link[0].departmentId || null,
      workspaceId,
      recordId: recordId || null,
      title: title.trim(),
      context: context || null,
      rationale: rationale || null,
      decidedByUserId: auth.userId,
      decidedByRoleId: decidedByRoleId || null,
      decidedAt: decidedAtIso,
      status: 'active',
      tags: tags && Array.isArray(tags) ? JSON.stringify(tags) : null,
    })

    auditFromAuth(auth, 'decision_create', {
      resourceType: 'decision',
      resourceId: decisionId,
      departmentId: departmentId || link[0].departmentId || null,
      metadata: { title: title.trim(), workspaceId, recordId: recordId || null },
    })

    // Fire-and-forget notification to everyone who should know. The decision
    // itself has already committed above, so notify failures must not block
    // the response.
    const resolvedDeptId = departmentId || link[0].departmentId || null
    if (resolvedDeptId) {
      notifyDepartmentMembers({
        organizationId: orgId,
        departmentId: resolvedDeptId,
        workspaceId,
        excludeUserId: auth.userId,
        notification: {
          type: 'decision_pending',
          title: `New decision: ${title.trim().slice(0, 100)}`,
          body: (rationale || context || '').slice(0, 240) || null,
          objectType: 'decision',
          objectId: decisionId,
        },
      }).catch((e) => console.warn('[decisions] notify failed', e))
    }

    const inserted = await db.select().from(schema.decisions).where(eq(schema.decisions.id, decisionId)).limit(1)
    return NextResponse.json({ decision: inserted[0] }, { status: 201 })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}