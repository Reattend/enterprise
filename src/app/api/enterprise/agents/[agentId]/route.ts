import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  hasOrgPermission,
} from '@/lib/enterprise'

// GET /api/enterprise/agents/[agentId]
// Returns the agent config — used by Chat to load system prompt + scope.
// We don't deeply RBAC here beyond org membership because agents are discovery;
// the actual access is enforced by the chat's record scoping.
export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { userId } = await requireAuth()
    const { agentId } = await params

    const rows = await db.select().from(schema.agents).where(eq(schema.agents.id, agentId)).limit(1)
    const agent = rows[0]
    if (!agent) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // Confirm user is a member of the agent's org
    const mem = await db
      .select()
      .from(schema.organizationMembers)
      .where(eq(schema.organizationMembers.organizationId, agent.organizationId))
      .limit(1)
    if (!mem[0]) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    const isMember = mem[0].userId === userId
    if (!isMember) {
      // Check more broadly
      const allMem = await db
        .select()
        .from(schema.organizationMembers)
        .where(eq(schema.organizationMembers.userId, userId))
      if (!allMem.some((m) => m.organizationId === agent.organizationId && m.status === 'active')) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }
    }

    const ctx = await getOrgContext(userId, agent.organizationId)
    const canAuthor = !!ctx && hasOrgPermission(ctx, 'agents.manage')

    return NextResponse.json({
      agent: {
        ...agent,
        scopeConfig: agent.scopeConfig ? JSON.parse(agent.scopeConfig) : {},
        deploymentTargets: JSON.parse(agent.deploymentTargets || '[]'),
      },
      canAuthor,
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// PATCH /api/enterprise/agents/[agentId]
// Body (all optional): { name, description, iconName, color, systemPrompt,
//   scopeConfig, deploymentTargets, tier, departmentId, publish, archive }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { userId } = await requireAuth()
    const { agentId } = await params
    const body = await req.json()

    const agent = await db.query.agents.findFirst({ where: eq(schema.agents.id, agentId) })
    if (!agent) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const ctx = await getOrgContext(userId, agent.organizationId)
    if (!ctx || !hasOrgPermission(ctx, 'agents.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (body.name) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.iconName !== undefined) updates.iconName = body.iconName
    if (body.color !== undefined) updates.color = body.color
    if (body.systemPrompt) updates.systemPrompt = body.systemPrompt
    if (body.scopeConfig !== undefined) updates.scopeConfig = JSON.stringify(body.scopeConfig || {})
    if (body.deploymentTargets !== undefined) updates.deploymentTargets = JSON.stringify(body.deploymentTargets || [])
    if (body.tier) updates.tier = body.tier
    if (body.departmentId !== undefined) updates.departmentId = body.departmentId
    if (body.publish === true) updates.status = 'active'
    if (body.publish === false) updates.status = 'draft'
    if (body.archive === true) updates.status = 'archived'

    await db.update(schema.agents).set(updates).where(eq(schema.agents.id, agentId))

    const [fresh] = await db.select().from(schema.agents).where(eq(schema.agents.id, agentId)).limit(1)
    return NextResponse.json({
      agent: {
        ...fresh,
        scopeConfig: fresh.scopeConfig ? JSON.parse(fresh.scopeConfig) : {},
        deploymentTargets: JSON.parse(fresh.deploymentTargets || '[]'),
      },
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// DELETE /api/enterprise/agents/[agentId]
// Hard-deletes drafts only; published agents must be archived via PATCH so
// historical agent_queries rows remain readable in analytics.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { userId } = await requireAuth()
    const { agentId } = await params

    const agent = await db.query.agents.findFirst({ where: eq(schema.agents.id, agentId) })
    if (!agent) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const ctx = await getOrgContext(userId, agent.organizationId)
    if (!ctx || !hasOrgPermission(ctx, 'agents.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    if (agent.status === 'active') {
      return NextResponse.json({ error: 'archive active agents instead of deleting' }, { status: 400 })
    }

    await db.delete(schema.agents).where(eq(schema.agents.id, agentId))
    return NextResponse.json({ ok: true })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
