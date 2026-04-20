import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'
import { requireAdminAuth } from '@/lib/admin/auth'

export async function GET() {
  try {
    await requireAdminAuth()

    // Total users
    const totalUsersResult = await db.select({ count: sql<number>`count(*)` }).from(schema.users)
    const totalUsers = totalUsersResult[0]?.count ?? 0

    // Subscription breakdown
    const allSubs = await db.select({
      planKey: schema.subscriptions.planKey,
      status: schema.subscriptions.status,
    }).from(schema.subscriptions)

    let paidUsers = 0
    let trialingUsers = 0
    let freeUsers = 0
    for (const sub of allSubs) {
      if (sub.planKey === 'smart' && sub.status === 'active') paidUsers++
      else if (sub.planKey === 'smart' && sub.status === 'trialing') trialingUsers++
      else freeUsers++
    }

    // Total memories (records) — all records across all workspaces
    const memoriesResult = await db.select({ count: sql<number>`count(*)` }).from(schema.records)
    const totalMemories = memoriesResult[0]?.count ?? 0

    // Total teams (team workspaces)
    const teamsResult = await db.select({ count: sql<number>`count(*)` }).from(schema.workspaces).where(eq(schema.workspaces.type, 'team'))
    const totalTeams = teamsResult[0]?.count ?? 0

    // Total workspaces
    const workspacesResult = await db.select({ count: sql<number>`count(*)` }).from(schema.workspaces)
    const totalWorkspaces = workspacesResult[0]?.count ?? 0

    // Total projects
    const projectsResult = await db.select({ count: sql<number>`count(*)` }).from(schema.projects)
    const totalProjects = projectsResult[0]?.count ?? 0

    // Total integrations connected
    const integrationsResult = await db.select({ count: sql<number>`count(*)` }).from(schema.integrationsConnections).where(eq(schema.integrationsConnections.status, 'connected'))
    const totalIntegrations = integrationsResult[0]?.count ?? 0

    // Inbox items
    const inboxResult = await db.select({ count: sql<number>`count(*)` }).from(schema.rawItems)
    const totalInboxItems = inboxResult[0]?.count ?? 0

    // Users signed up in last 7 days
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const recentUsersResult = await db.select({ count: sql<number>`count(*)` }).from(schema.users).where(sql`${schema.users.createdAt} >= ${weekAgo}`)
    const recentSignups = recentUsersResult[0]?.count ?? 0

    // API tokens (desktop/extension users)
    const apiTokensResult = await db.select({ count: sql<number>`count(*)` }).from(schema.apiTokens)
    const totalApiTokens = apiTokensResult[0]?.count ?? 0

    // Job queue health
    const pendingJobsResult = await db.select({ count: sql<number>`count(*)` }).from(schema.jobQueue).where(eq(schema.jobQueue.status, 'pending'))
    const pendingJobs = pendingJobsResult[0]?.count ?? 0

    const failedJobsResult = await db.select({ count: sql<number>`count(*)` }).from(schema.jobQueue).where(eq(schema.jobQueue.status, 'failed'))
    const failedJobs = failedJobsResult[0]?.count ?? 0

    // Chat sessions total
    const chatResult = await db.select({ count: sql<number>`count(*)` }).from(schema.chatSessions)
    const totalChats = chatResult[0]?.count ?? 0

    // Users list — memory count via workspace membership (correct), plus last active from chat sessions
    const usersList = await db.all(sql`
      SELECT
        u.id,
        u.email,
        u.name,
        u.created_at as createdAt,
        COALESCE(s.plan_key, 'normal') as plan,
        COALESCE(s.status, 'active') as status,
        s.trial_ends_at as trialEndsAt,
        s.renews_at as renewsAt,
        s.paddle_subscription_id as paddleSubId,
        COALESCE(mc.memory_count, 0) as memoryCount,
        COALESCE(ri.inbox_count, 0) as inboxCount,
        COALESCE(wc.workspace_count, 0) as workspaceCount,
        COALESCE(cs.chat_count, 0) as chatCount,
        COALESCE(
          NULLIF(MAX(cs.last_chat, at2.last_token_use), ''),
          u.created_at
        ) as lastActive
      FROM users u
      LEFT JOIN subscriptions s ON s.user_id = u.id
      LEFT JOIN (
        SELECT wm.user_id, COUNT(DISTINCT r.id) as memory_count
        FROM workspace_members wm
        JOIN records r ON r.workspace_id = wm.workspace_id
        GROUP BY wm.user_id
      ) mc ON mc.user_id = u.id
      LEFT JOIN (
        SELECT wm.user_id, COUNT(DISTINCT ri.id) as inbox_count
        FROM workspace_members wm
        JOIN raw_items ri ON ri.workspace_id = wm.workspace_id
        GROUP BY wm.user_id
      ) ri ON ri.user_id = u.id
      LEFT JOIN (
        SELECT wm.user_id, COUNT(*) as workspace_count
        FROM workspace_members wm
        GROUP BY wm.user_id
      ) wc ON wc.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as chat_count, MAX(updated_at) as last_chat
        FROM chat_sessions
        GROUP BY user_id
      ) cs ON cs.user_id = u.id
      LEFT JOIN (
        SELECT user_id, MAX(last_used_at) as last_token_use
        FROM api_tokens
        GROUP BY user_id
      ) at2 ON at2.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT 100
    `) as any[]

    return NextResponse.json({
      stats: {
        totalUsers,
        paidUsers,
        trialingUsers,
        freeUsers,
        totalMemories,
        totalTeams,
        totalWorkspaces,
        totalProjects,
        totalIntegrations,
        totalInboxItems,
        recentSignups,
        totalApiTokens,
        pendingJobs,
        failedJobs,
        totalChats,
      },
      recentUsers: usersList,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
