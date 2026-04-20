import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth()
    const { id } = await params

    // Resolve all workspaces this user belongs to so cross-workspace
    // source links from Ask AI resolve correctly
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, userId),
    })
    const allWorkspaceIds = memberships.map(m => m.workspaceId)

    const record = await db.query.records.findFirst({
      where: and(
        eq(schema.records.id, id),
        inArray(schema.records.workspaceId, allWorkspaceIds),
      ),
    })

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // Get entities
    const recordEntities = await db.query.recordEntities.findMany({
      where: eq(schema.recordEntities.recordId, id),
    })
    const entities = await Promise.all(
      recordEntities.map(async (re) => {
        const entity = await db.query.entities.findFirst({
          where: eq(schema.entities.id, re.entityId),
        })
        return entity ? { kind: entity.kind, name: entity.name } : null
      })
    )

    // Get links
    const links = await db.query.recordLinks.findMany({
      where: eq(schema.recordLinks.fromRecordId, id),
    })
    const linksWithTitles = await Promise.all(
      links.map(async (link) => {
        const target = await db.query.records.findFirst({
          where: eq(schema.records.id, link.toRecordId),
        })
        return {
          id: link.id,
          targetId: link.toRecordId,
          targetTitle: target?.title || 'Unknown',
          kind: link.kind,
          weight: link.weight,
          explanation: link.explanation,
        }
      })
    )

    // Get project
    const projectRecord = await db.query.projectRecords.findFirst({
      where: eq(schema.projectRecords.recordId, id),
    })
    let project = null
    if (projectRecord) {
      const p = await db.query.projects.findFirst({
        where: eq(schema.projects.id, projectRecord.projectId),
      })
      if (p) project = { id: p.id, name: p.name }
    }

    // Get attachment
    const attachment = await db.query.attachments.findFirst({
      where: eq(schema.attachments.recordId, id),
    })

    return NextResponse.json({
      record: {
        ...record,
        tags: record.tags ? JSON.parse(record.tags) : [],
        entities: entities.filter(Boolean),
        links: linksWithTitles,
        project,
        attachment: attachment ? {
          id: attachment.id,
          fileName: attachment.fileName,
          fileType: attachment.fileType,
          fileSize: attachment.fileSize,
        } : null,
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth()
    const { id } = await params
    const body = await _req.json()

    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, userId),
    })
    const allWorkspaceIds = memberships.map(m => m.workspaceId)

    const record = await db.query.records.findFirst({
      where: and(
        eq(schema.records.id, id),
        inArray(schema.records.workspaceId, allWorkspaceIds),
      ),
    })

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() }
    if (body.triageStatus) updates.triageStatus = body.triageStatus

    await db.update(schema.records).set(updates).where(eq(schema.records.id, id))
    return NextResponse.json({ updated: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth()
    const { id } = await params

    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, userId),
    })
    const allWorkspaceIds = memberships.map(m => m.workspaceId)

    const record = await db.query.records.findFirst({
      where: and(
        eq(schema.records.id, id),
        inArray(schema.records.workspaceId, allWorkspaceIds),
      ),
    })

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    await db.delete(schema.records).where(eq(schema.records.id, id))
    return NextResponse.json({ deleted: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
