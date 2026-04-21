import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { desc, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { filterToAccessibleWorkspaces, handleEnterpriseError } from '@/lib/enterprise'

// GET /api/enterprise/agents/activity
// Returns the last 100 job_queue entries across the user's accessible workspaces.
// This is the "what is the AI doing" feed shown on the Agents page.
export async function GET() {
  try {
    const { userId } = await requireAuth()

    const links = await db
      .select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
    const allWs = Array.from(new Set(links.map((l) => l.workspaceId)))
    const accessibleWs = await filterToAccessibleWorkspaces(userId, allWs)
    if (accessibleWs.length === 0) return NextResponse.json({ events: [] })

    const rows = await db
      .select()
      .from(schema.jobQueue)
      .where(inArray(schema.jobQueue.workspaceId, accessibleWs))
      .orderBy(desc(schema.jobQueue.createdAt))
      .limit(100)

    return NextResponse.json({
      events: rows.map((r) => ({
        id: r.id,
        type: r.type,
        status: r.status,
        createdAt: r.createdAt,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        result: r.result,
        error: r.error,
        workspaceId: r.workspaceId,
      })),
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
