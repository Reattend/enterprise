import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, desc, and, inArray, ne } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    const { workspaceId } = await requireAuth()

    const projects = await db.query.projects.findMany({
      where: eq(schema.projects.workspaceId, workspaceId),
      orderBy: desc(schema.projects.createdAt),
    })

    const projectsWithCounts = await Promise.all(
      projects.map(async (p) => {
        const projectRecordRows = await db.query.projectRecords.findMany({
          where: eq(schema.projectRecords.projectId, p.id),
        })
        const recordIds = projectRecordRows.map(r => r.recordId)
        if (recordIds.length === 0) return { ...p, recordCount: 0 }
        const validRecords = await db.query.records.findMany({
          where: and(
            inArray(schema.records.id, recordIds),
            eq(schema.records.workspaceId, workspaceId),
            ne(schema.records.triageStatus, 'needs_review'),
          ),
          columns: { id: true },
        })
        return { ...p, recordCount: validRecords.length }
      })
    )

    return NextResponse.json({ projects: projectsWithCounts })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireAuth()
    const { name, description, color } = await req.json()

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const id = crypto.randomUUID()
    await db.insert(schema.projects).values({
      id,
      workspaceId,
      name,
      description: description || '',
      color: color || '#6366f1',
    })

    const project = await db.query.projects.findFirst({
      where: eq(schema.projects.id, id),
    })

    return NextResponse.json({ project: { ...project, recordCount: 0 } })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth()
    const { id, name, description, color } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const updates: any = { updatedAt: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (color !== undefined) updates.color = color

    await db.update(schema.projects).set(updates).where(eq(schema.projects.id, id))
    return NextResponse.json({ message: 'Project updated' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth()
    const { id } = await req.json()

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const project = await db.query.projects.findFirst({ where: eq(schema.projects.id, id) })
    if (project?.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default project' }, { status: 400 })
    }

    await db.delete(schema.projects).where(eq(schema.projects.id, id))
    return NextResponse.json({ message: 'Project deleted' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
