import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
  listAccessibleDepartmentIds,
} from '@/lib/enterprise'

// GET /api/enterprise/organizations/[orgId]/departments
// Returns the org's department tree, scoped to what the user can access.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const accessible = new Set(await listAccessibleDepartmentIds(auth.userId, orgId))

    const rows = await db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.organizationId, orgId))

    const visible = rows.filter((d) => accessible.has(d.id))

    return NextResponse.json({ departments: visible })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/organizations/[orgId]/departments
// Create a department, division, or team under an optional parent.
export async function POST(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.departments.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const { name, slug, kind, parentId, headUserId, description } = body as {
      name?: string
      slug?: string
      kind?: string
      parentId?: string | null
      headUserId?: string | null
      description?: string | null
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }
    // `kind` is now free-text per the org's taxonomy. We only validate
    // non-empty + length cap; the admin-editable taxonomy decides labels.
    // The special string 'team' still triggers workspace auto-provisioning.
    const finalKind = (kind ?? 'department').trim()
    if (finalKind.length === 0 || finalKind.length > 64) {
      return NextResponse.json({ error: 'invalid kind' }, { status: 400 })
    }

    const finalSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).slice(0, 64)
    if (!/^[a-z0-9][a-z0-9-]*$/.test(finalSlug)) {
      return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
    }

    // Slug uniqueness scoped to org
    const dup = await db
      .select()
      .from(schema.departments)
      .where(and(eq(schema.departments.organizationId, orgId), eq(schema.departments.slug, finalSlug)))
      .limit(1)
    if (dup[0]) return NextResponse.json({ error: 'slug already taken in this org' }, { status: 409 })

    // Validate parent belongs to same org
    if (parentId) {
      const parent = await db.select().from(schema.departments).where(eq(schema.departments.id, parentId)).limit(1)
      if (!parent[0] || parent[0].organizationId !== orgId) {
        return NextResponse.json({ error: 'invalid parent department' }, { status: 400 })
      }
    }

    const deptId = crypto.randomUUID()

    await db.insert(schema.departments).values({
      id: deptId,
      organizationId: orgId,
      parentId: parentId || null,
      kind: finalKind,
      name: name.trim(),
      slug: finalSlug,
      headUserId: headUserId || null,
      description: description || null,
    })

    // If a head is named, auto-add them as dept_head
    if (headUserId) {
      await db.insert(schema.departmentMembers).values({
        departmentId: deptId,
        organizationId: orgId,
        userId: headUserId,
        role: 'dept_head',
      })
    }

    // Auto-create a backing workspace for "team" departments.
    // A team IS a workspace in enterprise mode — records, decisions, and
    // memories live in the team's workspace. Higher-level depts/divisions
    // don't need their own workspace (they're pure hierarchy).
    let autoWorkspaceId: string | null = null
    if ((finalKind) === 'team') {
      autoWorkspaceId = crypto.randomUUID()
      await db.insert(schema.workspaces).values({
        id: autoWorkspaceId,
        name: name.trim(),
        type: 'team',
        createdBy: auth.userId,
      })
      // Creator gets owner access on the backing workspace
      await db.insert(schema.workspaceMembers).values({
        workspaceId: autoWorkspaceId,
        userId: auth.userId,
        role: 'owner',
      })
      // Default project for the workspace (records need a home)
      await db.insert(schema.projects).values({
        workspaceId: autoWorkspaceId,
        name: 'Unassigned',
        description: 'Memories not yet assigned to a project',
        isDefault: true,
        color: '#94a3b8',
      })
      // Link workspace to the org + team
      await db.insert(schema.workspaceOrgLinks).values({
        workspaceId: autoWorkspaceId,
        organizationId: orgId,
        departmentId: deptId,
        visibility: 'department_only',
      })
      // Head of dept also gets workspace access
      if (headUserId && headUserId !== auth.userId) {
        await db.insert(schema.workspaceMembers).values({
          workspaceId: autoWorkspaceId,
          userId: headUserId,
          role: 'admin',
        })
      }
    }

    auditFromAuth(auth, 'create', {
      resourceType: 'department',
      resourceId: deptId,
      departmentId: deptId,
      metadata: {
        name: name.trim(),
        slug: finalSlug,
        kind: finalKind,
        parentId: parentId || null,
        autoWorkspaceId,
      },
    })

    return NextResponse.json({
      department: {
        id: deptId,
        organizationId: orgId,
        parentId: parentId || null,
        kind: finalKind,
        name: name.trim(),
        slug: finalSlug,
        headUserId: headUserId || null,
        description: description || null,
        workspaceId: autoWorkspaceId,
      },
    }, { status: 201 })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
