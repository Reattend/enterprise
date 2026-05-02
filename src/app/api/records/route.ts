import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, desc, inArray, ne, count, isNotNull, gte } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { resolveTargetWorkspace } from '@/lib/enterprise/workspace-resolver'
import { enqueueJob, processAllPendingJobs } from '@/lib/jobs/worker'
import {
  auditForAllUserOrgs,
  extractRequestMeta,
  buildAccessContext,
  filterToAccessibleRecords,
} from '@/lib/enterprise'
import { findExactDuplicate, contentHash } from '@/lib/ai/ingestion'

export async function GET(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireAuth()
    const params = req.nextUrl.searchParams
    const type = params.get('type')
    const source = params.get('source') // 'gmail' | 'google-calendar' | 'manual' | null
    const projectId = params.get('project_id')
    const search = params.get('search')
    const dateRange = params.get('dateRange') // 'today' | 'week' | 'month'
    const orgId = params.get('orgId') // active enterprise org from client
    const limit = parseInt(params.get('limit') || '50')
    const offset = parseInt(params.get('offset') || '0')

    // Build the set of workspaces the user is allowed to LIST records from.
    // Always includes their personal workspace (the auth default). When
    // orgId is provided, also includes every workspace linked to that org
    // they're a member of — admins/super_admins get every org workspace.
    // RBAC still runs on the result; this filter just shapes the candidate
    // set so we don't query records the user has no path to anyway.
    const accessibleWsIds = new Set<string>([workspaceId])
    if (orgId) {
      const orgLinks = await db
        .select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
        .from(schema.workspaceOrgLinks)
        .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
      const orgWsIds = orgLinks.map((l) => l.workspaceId)
      if (orgWsIds.length > 0) {
        const myMemberships = await db
          .select({ workspaceId: schema.workspaceMembers.workspaceId })
          .from(schema.workspaceMembers)
          .where(and(
            eq(schema.workspaceMembers.userId, userId),
            inArray(schema.workspaceMembers.workspaceId, orgWsIds),
          ))
        for (const m of myMemberships) accessibleWsIds.add(m.workspaceId)
        // Admin auto-access — super_admin / admin sees all org workspaces.
        const orgRole = await db
          .select({ role: schema.organizationMembers.role })
          .from(schema.organizationMembers)
          .where(and(
            eq(schema.organizationMembers.userId, userId),
            eq(schema.organizationMembers.organizationId, orgId),
          ))
          .limit(1)
        if (orgRole[0] && (orgRole[0].role === 'super_admin' || orgRole[0].role === 'admin')) {
          for (const wsId of orgWsIds) accessibleWsIds.add(wsId)
        }
      }
    }

    const sourceFilter = source === 'integrations'
      ? isNotNull(schema.records.source)
      : source ? eq(schema.records.source, source) : undefined

    let dateFilter: any
    if (dateRange) {
      const now = new Date()
      if (dateRange === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        dateFilter = gte(schema.records.createdAt, start.toISOString())
      } else if (dateRange === 'week') {
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateFilter = gte(schema.records.createdAt, start.toISOString())
      } else if (dateRange === 'month') {
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateFilter = gte(schema.records.createdAt, start.toISOString())
      }
    }

    let whereClause = and(
      inArray(schema.records.workspaceId, Array.from(accessibleWsIds)),
      ne(schema.records.triageStatus, 'needs_review'),
      type ? eq(schema.records.type, type as any) : undefined,
      sourceFilter,
      dateFilter,
    )

    if (projectId) {
      const projectRecordRows = await db.query.projectRecords.findMany({
        where: eq(schema.projectRecords.projectId, projectId),
      })
      const recordIds = projectRecordRows.map(pr => pr.recordId)
      if (recordIds.length === 0) {
        return NextResponse.json({ records: [], total: 0 })
      }
      whereClause = and(whereClause, inArray(schema.records.id, recordIds))
    }

    // Get real total count before pagination
    const [{ total }] = await db.select({ total: count() }).from(schema.records).where(whereClause)

    let records = await db.query.records.findMany({
      where: whereClause,
      orderBy: desc(schema.records.createdAt),
      limit,
      offset,
    })

    if (search) {
      const lowerSearch = search.toLowerCase()
      records = records.filter(r =>
        r.title.toLowerCase().includes(lowerSearch) ||
        (r.summary && r.summary.toLowerCase().includes(lowerSearch)) ||
        (r.content && r.content.toLowerCase().includes(lowerSearch))
      )
    }

    // Record-level RBAC: strip records the user can't see (private of others,
    // dept-scoped outside their dept, etc.). Within the same workspace this
    // mostly affects 'private' records of others.
    const accessCtx = await buildAccessContext(userId)
    const allowed = await filterToAccessibleRecords(accessCtx, records.map((r) => r.id))
    records = records.filter((r) => allowed.has(r.id))

    return NextResponse.json({ records, total })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    const { userId, session } = auth
    const userEmail = session?.user?.email || 'unknown'
    const body = await req.json()
    const { content, project_id, orgId, workspaceId: requestedWorkspaceId } = body as {
      content?: string
      project_id?: string
      orgId?: string         // Active enterprise org from the client store
      workspaceId?: string   // Explicit team workspace override
    }

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    // Resolve the right workspace. If the user is in an enterprise org,
    // route the memory to a team workspace (not personal) so it shows up
    // on org dashboards / wiki / landscape. Personal is the safety net.
    const resolved = await resolveTargetWorkspace({
      userId,
      requestedWorkspaceId,
      orgId,
      fallbackWorkspaceId: auth.workspaceId,
    })
    const workspaceId = resolved.workspaceId

    // Content-hash dedup: if the exact same content was ingested before in
    // this workspace, return the existing record instead of creating a duplicate.
    const dup = await findExactDuplicate(workspaceId, content)
    if (dup.hit) {
      const existing = await db.query.records.findFirst({
        where: eq(schema.records.id, dup.existingRecordId),
      })
      return NextResponse.json({ record: existing, deduplicated: true })
    }

    // Save immediately with defaults — AI enrichment runs in background
    const recordId = crypto.randomUUID()
    const title = content.slice(0, 60)
    const hash = contentHash(content)

    await db.insert(schema.records).values({
      id: recordId,
      workspaceId,
      type: 'note',
      title,
      summary: content.slice(0, 200),
      content,
      confidence: 0.5,
      tags: '[]',
      triageStatus: 'auto_accepted',
      createdBy: userId,
      // Store hash in meta so future dedup checks hit the index path
      meta: JSON.stringify({ contentHash: hash }),
    })

    // Assign to project
    const targetProjectId = project_id || (await db.query.projects.findFirst({
      where: and(
        eq(schema.projects.workspaceId, workspaceId),
        eq(schema.projects.isDefault, true),
      ),
    }))?.id

    if (targetProjectId) {
      await db.insert(schema.projectRecords).values({
        projectId: targetProjectId,
        recordId,
      })
    }

    // Return the record immediately
    const record = await db.query.records.findFirst({
      where: eq(schema.records.id, recordId),
    })

    // Enqueue AI enrichment as a job instead of running it inline as a
    // fire-and-forget IIFE. This way:
    //  1. transient Rabbit failures (524 / timeout) hit the worker's retry
    //     + backoff path instead of leaving the record permanently blank
    //  2. the Agent Logs UI actually shows something (it reads job_queue)
    //  3. permanent failures create an inbox notification
    await enqueueJob(workspaceId, 'ingest', { recordId, content })
    // Kick the worker immediately — don't await, don't block the response.
    processAllPendingJobs().catch(e => console.error('[records] worker kick failed:', e))

    const reqMeta = extractRequestMeta(req)
    auditForAllUserOrgs(userId, userEmail, 'create', {
      resourceType: 'record',
      resourceId: recordId,
      ipAddress: reqMeta.ipAddress,
      userAgent: reqMeta.userAgent,
      metadata: { workspaceId, title },
    })

    return NextResponse.json({ record })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { workspaceId } = await requireAuth()
    const body = await req.json()
    const { id, title, summary, content, type, tags, locked, projectId } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const updates: any = { updatedAt: new Date().toISOString() }
    if (title !== undefined) updates.title = title
    if (summary !== undefined) updates.summary = summary
    if (content !== undefined) updates.content = content
    if (type !== undefined) updates.type = type
    if (tags !== undefined) updates.tags = JSON.stringify(tags)
    if (locked !== undefined) updates.locked = locked

    await db.update(schema.records).set(updates).where(eq(schema.records.id, id))

    // Handle project move
    if (projectId !== undefined) {
      // Remove existing project assignments for this record
      await db.delete(schema.projectRecords)
        .where(eq(schema.projectRecords.recordId, id))

      // Assign to new project (if not null/empty — null means "unassign")
      if (projectId) {
        // Verify the project belongs to the same workspace
        const project = await db.query.projects.findFirst({
          where: and(
            eq(schema.projects.id, projectId),
            eq(schema.projects.workspaceId, workspaceId),
          ),
        })
        if (project) {
          await db.insert(schema.projectRecords).values({
            projectId,
            recordId: id,
          })
        }
      }
    }

    return NextResponse.json({ message: 'Record updated' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || 'unknown'
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    await db.delete(schema.records).where(eq(schema.records.id, id))

    const reqMeta = extractRequestMeta(req)
    auditForAllUserOrgs(userId, userEmail, 'delete', {
      resourceType: 'record',
      resourceId: id,
      ipAddress: reqMeta.ipAddress,
      userAgent: reqMeta.userAgent,
    })

    return NextResponse.json({ message: 'Record deleted' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
