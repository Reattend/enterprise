import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, inArray, desc, ne } from 'drizzle-orm'
import { validateApiToken } from '@/lib/auth/token'

export async function GET(req: NextRequest) {
  try {
    const auth = await validateApiToken(req.headers.get('authorization'))
    if (!auth) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '10'), 20)

    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, auth.userId),
    })
    const allWorkspaceIds = memberships.map(m => m.workspaceId)

    if (allWorkspaceIds.length === 0) {
      return NextResponse.json({ memories: [] })
    }

    const records = await db.query.records.findMany({
      where: inArray(schema.records.workspaceId, allWorkspaceIds),
      orderBy: [desc(schema.records.createdAt)],
      limit,
      columns: {
        id: true,
        type: true,
        title: true,
        summary: true,
        createdAt: true,
        workspaceId: true,
      },
    })

    const memories = records.map(r => ({
      id: r.id,
      type: r.type,
      title: r.title,
      summary: r.summary,
      createdAt: r.createdAt,
    }))

    return NextResponse.json({ memories })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
