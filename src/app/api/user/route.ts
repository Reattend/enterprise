import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth, getUserSubscription } from '@/lib/auth'

export async function GET() {
  try {
    const { userId, workspaceId, role } = await requireAuth()

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const workspace = await db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, workspaceId),
    })

    // Get all workspaces the user belongs to
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, userId),
    })

    const allWorkspaces = await Promise.all(
      memberships.map(async (m) => {
        const ws = await db.query.workspaces.findFirst({
          where: eq(schema.workspaces.id, m.workspaceId),
        })
        if (!ws) return null
        return {
          id: ws.id,
          name: ws.name,
          type: ws.type,
          role: m.role,
          createdAt: ws.createdAt,
        }
      })
    )

    const subscription = await getUserSubscription(userId)

    // Daily AI quota for free users
    let aiQueriesUsed = 0
    const AI_QUERY_LIMIT = 20
    if (!subscription.isSmartActive) {
      const today = new Date().toISOString().slice(0, 10)
      const usage = await db.query.usageDaily.findFirst({
        where: and(eq(schema.usageDaily.userId, userId), eq(schema.usageDaily.date, today)),
      })
      aiQueriesUsed = usage?.opsCount ?? 0
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        onboardingCompleted: user.onboardingCompleted ?? false,
        createdAt: user.createdAt,
      },
      workspace: workspace ? {
        id: workspace.id,
        name: workspace.name,
        type: workspace.type,
        createdAt: workspace.createdAt,
      } : null,
      workspaces: allWorkspaces.filter(Boolean),
      role: role || null,
      subscription: {
        plan: subscription.plan,
        isSmartActive: subscription.isSmartActive,
        isTrialing: subscription.isTrialing,
        trialDaysLeft: subscription.trialDaysLeft,
        status: subscription.status,
        renewsAt: subscription.renewsAt,
        paddleSubscriptionId: subscription.paddleSubscriptionId,
        aiQueriesUsed,
        aiQueriesLimit: subscription.isSmartActive ? null : AI_QUERY_LIMIT,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { name, avatarUrl } = await req.json()

    const updates: Record<string, string> = {}
    if (name !== undefined) updates.name = name
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    await db.update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, userId))

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    })

    return NextResponse.json({
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        avatarUrl: user!.avatarUrl,
        createdAt: user!.createdAt,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { confirm } = await req.json()
    if (confirm !== 'delete my account') {
      return NextResponse.json({ error: 'Confirmation text does not match' }, { status: 400 })
    }

    // Handle workspaces this user created
    const ownedWorkspaces = await db.query.workspaces.findMany({
      where: eq(schema.workspaces.createdBy, userId),
    })

    for (const ws of ownedWorkspaces) {
      const members = await db.query.workspaceMembers.findMany({
        where: eq(schema.workspaceMembers.workspaceId, ws.id),
      })
      const otherMembers = members.filter(m => m.userId !== userId)

      if (otherMembers.length === 0) {
        // Sole member — delete workspace (cascades all workspace data)
        await db.delete(schema.workspaces).where(eq(schema.workspaces.id, ws.id))
      } else {
        // Transfer ownership to another member before removing self
        const newOwner = otherMembers.find(m => m.role === 'admin') || otherMembers[0]
        await db.update(schema.workspaceMembers)
          .set({ role: 'owner' })
          .where(eq(schema.workspaceMembers.id, newOwner.id))
        await db.update(schema.workspaces)
          .set({ createdBy: newOwner.userId })
          .where(eq(schema.workspaces.id, ws.id))
      }
    }

    // Delete tables with userId FK but no cascade
    await db.delete(schema.comments).where(eq(schema.comments.userId, userId))
    await db.delete(schema.inboxNotifications).where(eq(schema.inboxNotifications.userId, userId))
    await db.delete(schema.workspaceInvites).where(eq(schema.workspaceInvites.invitedBy, userId))
    await db.delete(schema.otpCodes).where(eq(schema.otpCodes.email, user.email))
    await db.delete(schema.sharedLinks).where(eq(schema.sharedLinks.userId, userId))
    await db.delete(schema.usageDaily).where(eq(schema.usageDaily.userId, userId))

    // Delete user — cascades: subscriptions, apiTokens, integrationsConnections, workspaceMembers, chatSessions
    await db.delete(schema.users).where(eq(schema.users.id, userId))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
