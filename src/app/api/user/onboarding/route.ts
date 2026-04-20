import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, sql } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const { userId, workspaceId } = await requireAuth()

    const [projects, records, boards, memberships, integrations] = await Promise.all([
      db.query.projects.findMany({ where: eq(schema.projects.workspaceId, workspaceId) }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.records)
        .where(eq(schema.records.workspaceId, workspaceId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.boards)
        .where(eq(schema.boards.workspaceId, workspaceId)),
      db.query.workspaceMembers.findMany({
        where: eq(schema.workspaceMembers.userId, userId),
      }),
      db.query.integrationsConnections.findMany({
        where: eq(schema.integrationsConnections.workspaceId, workspaceId),
      }),
    ])

    // Check if user has any team workspace
    let hasTeam = false
    for (const m of memberships) {
      const ws = await db.query.workspaces.findFirst({
        where: and(
          eq(schema.workspaces.id, m.workspaceId),
          eq(schema.workspaces.type, 'team'),
        ),
      })
      if (ws) { hasTeam = true; break }
    }

    const userProjects = projects.filter(p => !p.isDefault)

    return NextResponse.json({
      steps: {
        hasProject: userProjects.length > 0,
        hasMemory: (records[0]?.count ?? 0) > 0,
        hasBoard: (boards[0]?.count ?? 0) > 0,
        hasTeam,
        hasIntegration: integrations.length > 0,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const { userId } = await requireAuth()

    await db.update(schema.users)
      .set({ onboardingCompleted: true } as any)
      .where(eq(schema.users.id, userId))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
