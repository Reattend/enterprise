import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const { workspaceId } = await requireAuth()

    const jobs = await db.query.jobQueue.findMany({
      where: eq(schema.jobQueue.workspaceId, workspaceId),
      orderBy: desc(schema.jobQueue.createdAt),
      limit: 50,
    })

    return NextResponse.json({ jobs })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
