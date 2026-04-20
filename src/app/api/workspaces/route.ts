import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth, requireRole, getUserSubscription } from '@/lib/auth'

const FREE_TEAM_LIMIT = 3

export async function GET() {
  try {
    const { userId } = await requireAuth()

    // Get all workspace memberships for this user
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, userId),
    })

    // For each membership, fetch workspace details and member count
    const workspaces = await Promise.all(
      memberships.map(async (membership) => {
        const workspace = await db.query.workspaces.findFirst({
          where: eq(schema.workspaces.id, membership.workspaceId),
        })

        if (!workspace) return null

        const members = await db.query.workspaceMembers.findMany({
          where: eq(schema.workspaceMembers.workspaceId, workspace.id),
        })

        return {
          id: workspace.id,
          name: workspace.name,
          type: workspace.type,
          role: membership.role,
          memberCount: members.length,
          createdAt: workspace.createdAt,
        }
      })
    )

    return NextResponse.json({
      workspaces: workspaces.filter(Boolean),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { name } = await req.json()

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    // Enforce team workspace limit for free plan users
    const subscription = await getUserSubscription(userId)
    const isPaidTeams = subscription.plan === 'smart' && (subscription.status === 'active' || subscription.status === 'trialing')

    if (!isPaidTeams) {
      // Count existing team workspaces owned/joined by this user
      const memberships = await db.query.workspaceMembers.findMany({
        where: eq(schema.workspaceMembers.userId, userId),
      })
      const workspaces = await Promise.all(
        memberships.map(m =>
          db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, m.workspaceId) })
        )
      )
      const teamCount = workspaces.filter(w => w && w.type === 'team').length

      if (teamCount >= FREE_TEAM_LIMIT) {
        return NextResponse.json(
          { error: 'upgrade_required', message: `Free plan allows up to ${FREE_TEAM_LIMIT} team workspaces. Upgrade to Teams for unlimited.`, teamCount, limit: FREE_TEAM_LIMIT },
          { status: 403 }
        )
      }
    }

    const workspaceId = crypto.randomUUID()

    // Create the workspace
    await db.insert(schema.workspaces).values({
      id: workspaceId,
      name,
      type: 'team',
      createdBy: userId,
    })

    // Add creator as owner
    await db.insert(schema.workspaceMembers).values({
      workspaceId,
      userId,
      role: 'owner',
    })

    // Create default "Unassigned" project
    await db.insert(schema.projects).values({
      workspaceId,
      name: 'Unassigned',
      description: 'Memories not yet assigned to a project',
      isDefault: true,
      color: '#94a3b8',
    })

    // Log activity
    await db.insert(schema.activityLog).values({
      workspaceId,
      actor: userId,
      action: 'workspace.created',
      objectType: 'workspace',
      objectId: workspaceId,
    })

    const workspace = await db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, workspaceId),
    })

    // Set the workspace_id cookie on the response
    const response = NextResponse.json({ workspace })
    response.cookies.set('workspace_id', workspaceId, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    })

    return response
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { workspaceId } = await requireRole('admin')
    const { name } = await req.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    await db.update(schema.workspaces)
      .set({ name: name.trim() })
      .where(eq(schema.workspaces.id, workspaceId))

    return NextResponse.json({ ok: true, name: name.trim() })
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireRole('owner')
    const { confirmName } = await req.json()

    const workspace = await db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, workspaceId),
    })
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    if (workspace.type === 'personal') {
      return NextResponse.json({ error: 'Cannot delete your personal workspace' }, { status: 400 })
    }

    if (!confirmName || confirmName !== workspace.name) {
      return NextResponse.json({ error: 'Workspace name does not match' }, { status: 400 })
    }

    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId))

    // Switch to personal workspace
    const personalMembership = await db.query.workspaceMembers.findFirst({
      where: eq(schema.workspaceMembers.userId, userId),
    })

    const response = NextResponse.json({ message: 'Workspace deleted' })
    if (personalMembership) {
      response.cookies.set('workspace_id', personalMembership.workspaceId, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
      })
    }

    return response
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
