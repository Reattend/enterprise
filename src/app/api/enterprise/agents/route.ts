import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, or, inArray, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  listAccessibleDepartmentIds,
  getOrgContext,
  hasOrgPermission,
} from '@/lib/enterprise'

// GET /api/enterprise/agents?orgId=...
// Lists agents the user can see: org-tier (everyone), departmental (if member),
// personal (if owner).
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 })

    // Confirm membership
    const mem = await db
      .select()
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.userId, userId),
        eq(schema.organizationMembers.organizationId, orgId),
        eq(schema.organizationMembers.status, 'active'),
      ))
      .limit(1)
    if (!mem[0]) return NextResponse.json({ error: 'not a member' }, { status: 403 })

    const accessibleDepts = await listAccessibleDepartmentIds(userId, orgId)

    const includeDrafts = req.nextUrl.searchParams.get('includeDrafts') === 'true'

    // Admins see draft agents too (for the builder "my drafts" view)
    const ctx = await getOrgContext(userId, orgId)
    const canAuthor = !!ctx && hasOrgPermission(ctx, 'agents.manage')

    const rows = await db
      .select()
      .from(schema.agents)
      .where(and(
        eq(schema.agents.organizationId, orgId),
        includeDrafts && canAuthor
          ? or(eq(schema.agents.status, 'active'), eq(schema.agents.status, 'draft'))!
          : eq(schema.agents.status, 'active'),
        or(
          eq(schema.agents.tier, 'org'),
          and(eq(schema.agents.tier, 'departmental'), accessibleDepts.length > 0 ? inArray(schema.agents.departmentId, accessibleDepts) : eq(schema.agents.id, '__none__')),
          and(eq(schema.agents.tier, 'personal'), eq(schema.agents.ownerUserId, userId)),
        ),
      ))
      .orderBy(desc(schema.agents.usageCount))

    return NextResponse.json({
      agents: rows.map((a) => ({
        ...a,
        scopeConfig: a.scopeConfig ? JSON.parse(a.scopeConfig) : {},
        deploymentTargets: JSON.parse(a.deploymentTargets || '[]'),
      })),
      canAuthor,
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/agents
// Creates a new agent (org or departmental tier). Personal agents go through
// a separate future endpoint. Requires agents.manage permission.
// Body: {
//   orgId, name, slug?, description?, iconName?, color?,
//   tier: 'org' | 'departmental',
//   departmentId?, systemPrompt,
//   scopeConfig?: { types?: string[], departmentIds?: string[], recordIds?: string[], tags?: string[] },
//   deploymentTargets?: string[], publish?: boolean,
// }
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const body = await req.json()
    const { orgId, name, slug, description, iconName, color, tier, departmentId, systemPrompt, scopeConfig, deploymentTargets, publish } = body

    if (!orgId || !name || !systemPrompt) {
      return NextResponse.json({ error: 'orgId, name, and systemPrompt are required' }, { status: 400 })
    }

    const ctx = await getOrgContext(userId, orgId)
    if (!ctx || !hasOrgPermission(ctx, 'agents.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const finalTier = tier === 'departmental' ? 'departmental' : 'org'
    if (finalTier === 'departmental' && !departmentId) {
      return NextResponse.json({ error: 'departmentId required for departmental agents' }, { status: 400 })
    }

    const finalSlug = (slug || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const [inserted] = await db.insert(schema.agents).values({
      organizationId: orgId,
      tier: finalTier,
      departmentId: finalTier === 'departmental' ? departmentId : null,
      ownerUserId: null,
      name,
      slug: finalSlug,
      description: description || null,
      iconName: iconName || null,
      color: color || null,
      systemPrompt,
      scopeConfig: scopeConfig ? JSON.stringify(scopeConfig) : '{}',
      deploymentTargets: JSON.stringify(deploymentTargets || ['web']),
      status: publish ? 'active' : 'draft',
      createdBy: userId,
    }).returning()

    return NextResponse.json({
      agent: {
        ...inserted,
        scopeConfig: inserted.scopeConfig ? JSON.parse(inserted.scopeConfig) : {},
        deploymentTargets: JSON.parse(inserted.deploymentTargets || '[]'),
      },
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
