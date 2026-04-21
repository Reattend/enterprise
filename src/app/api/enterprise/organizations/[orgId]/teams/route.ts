import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
  listAccessibleWorkspaceIds,
} from '@/lib/enterprise'

// GET /api/enterprise/organizations/[orgId]/teams
// Returns every team (department with kind='team') the user can access in
// this org, with its backing workspace id + projects. Used by the capture
// drawer, /app/team page, and other employee surfaces.
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    // Teams are kind='team' departments the user can access
    const accessibleWs = await listAccessibleWorkspaceIds(auth.userId, orgId)
    if (accessibleWs.length === 0) return NextResponse.json({ teams: [] })

    const links = await db
      .select()
      .from(schema.workspaceOrgLinks)
      .where(and(
        eq(schema.workspaceOrgLinks.organizationId, orgId),
        inArray(schema.workspaceOrgLinks.workspaceId, accessibleWs),
      ))

    if (links.length === 0) return NextResponse.json({ teams: [] })

    const deptIds = links.map((l) => l.departmentId).filter((x): x is string => !!x)
    const depts = deptIds.length
      ? await db.select().from(schema.departments).where(inArray(schema.departments.id, deptIds))
      : []
    const deptById = new Map(depts.map((d) => [d.id, d]))

    // Build dept path for context (e.g. "Ministry → Dept → Wing → Team")
    const allDepts = await db.select().from(schema.departments).where(eq(schema.departments.organizationId, orgId))
    const deptByIdAll = new Map(allDepts.map((d) => [d.id, d]))
    const pathFor = (dId: string): string => {
      const parts: string[] = []
      let cur: string | null = dId
      let depth = 0
      while (cur && depth < 10) {
        const d = deptByIdAll.get(cur)
        if (!d) break
        parts.unshift(d.name)
        cur = d.parentId
        depth++
      }
      return parts.join(' → ')
    }

    // Projects by workspace
    const projects = await db
      .select()
      .from(schema.projects)
      .where(inArray(schema.projects.workspaceId, accessibleWs))
    const projectsByWs = new Map<string, typeof projects>()
    for (const p of projects) {
      const list = projectsByWs.get(p.workspaceId) ?? []
      list.push(p)
      projectsByWs.set(p.workspaceId, list)
    }

    const teams = links.map((l) => {
      const dept = l.departmentId ? deptById.get(l.departmentId) : undefined
      return {
        teamId: l.departmentId ?? l.workspaceId, // prefer deptId, fall back to ws
        teamName: dept?.name ?? 'Unknown team',
        departmentPath: l.departmentId ? pathFor(l.departmentId) : '',
        workspaceId: l.workspaceId,
        projects: (projectsByWs.get(l.workspaceId) ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          isDefault: !!p.isDefault,
        })),
      }
    }).filter((t) => t.teamName !== 'Unknown team') // drop ghost teams

    return NextResponse.json({ teams })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
