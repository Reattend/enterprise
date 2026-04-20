import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireAuth()
    const { token } = await req.json()

    if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

    const share = await db.query.sharedLinks.findFirst({
      where: eq(schema.sharedLinks.shareToken, token),
    })

    if (!share) return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 })
    }

    const recordId = crypto.randomUUID()

    await db.insert(schema.records).values({
      id: recordId,
      workspaceId,
      type: (share.recordType || 'note') as any,
      title: share.title,
      summary: share.summary || null,
      content: share.content || share.summary || share.title,
      confidence: 0.9,
      tags: share.tags || '[]',
      meta: share.meta || null,
      triageStatus: 'auto_accepted',
      createdBy: userId,
    })

    // Assign to default project
    const defaultProject = await db.query.projects.findFirst({
      where: and(
        eq(schema.projects.workspaceId, workspaceId),
        eq(schema.projects.isDefault, true),
      ),
    })
    if (defaultProject) {
      await db.insert(schema.projectRecords).values({
        projectId: defaultProject.id,
        recordId,
      })
    }

    return NextResponse.json({ recordId })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
