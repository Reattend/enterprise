import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { handleEnterpriseError } from '@/lib/enterprise'

// GET /api/enterprise/wiki/people?orgId=...
// Returns the people index: every active org member + their current role.
// Sorted by most-recent record they authored (proxy for "who's active").
export async function GET(req: NextRequest) {
  try {
    const { userId: _ } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const members = await db
      .select({
        userId: schema.organizationMembers.userId,
        role: schema.organizationMembers.role,
        title: schema.organizationMembers.title,
        status: schema.organizationMembers.status,
        offboardedAt: schema.organizationMembers.offboardedAt,
        name: schema.users.name,
        email: schema.users.email,
        avatarUrl: schema.users.avatarUrl,
      })
      .from(schema.organizationMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.organizationMembers.userId))
      .where(eq(schema.organizationMembers.organizationId, orgId))

    // Recent-activity signal: most recent record each member authored, but only
    // in workspaces linked to this org.
    const wsLinkRows = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
    const wsIds = Array.from(new Set(wsLinkRows.map((l) => l.workspaceId)))

    const lastAuthoredByUser = new Map<string, { lastAt: string; count: number }>()
    if (wsIds.length) {
      const rows = await db.select({
        createdBy: schema.records.createdBy,
        createdAt: schema.records.createdAt,
      }).from(schema.records)
        .where(inArray(schema.records.workspaceId, wsIds))
      for (const r of rows) {
        const prev = lastAuthoredByUser.get(r.createdBy) || { lastAt: '', count: 0 }
        prev.count += 1
        if (r.createdAt > prev.lastAt) prev.lastAt = r.createdAt
        lastAuthoredByUser.set(r.createdBy, prev)
      }
    }

    const people = members.map((m) => {
      const stats = lastAuthoredByUser.get(m.userId) || { lastAt: '', count: 0 }
      return {
        ...m,
        lastRecordAt: stats.lastAt || null,
        recordCount: stats.count,
      }
    }).sort((a, b) => {
      if (a.status === 'offboarded' && b.status !== 'offboarded') return 1
      if (b.status === 'offboarded' && a.status !== 'offboarded') return -1
      return (b.lastRecordAt || '').localeCompare(a.lastRecordAt || '')
    })

    return NextResponse.json({ people })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
