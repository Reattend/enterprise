import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { inArray, eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  listTransferHistory,
} from '@/lib/enterprise'

// GET /api/enterprise/transfers/history?orgId=...&userId=...
// Returns the transfer log, optionally filtered to one user (shown on the
// person wiki page). Hydrates from/to/role labels for UI rendering.
export async function GET(req: NextRequest) {
  try {
    const { userId: caller } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    const scopedUser = req.nextUrl.searchParams.get('userId') || undefined
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const ctx = await getOrgContext(caller, orgId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const rows = await listTransferHistory(orgId, scopedUser)
    if (rows.length === 0) return NextResponse.json({ events: [] })

    const userIds = Array.from(new Set(rows.flatMap((r) => [r.fromUserId, r.toUserId].filter((x): x is string => !!x))))
    const users = await db.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
      .from(schema.users).where(inArray(schema.users.id, userIds))
    const userById = new Map(users.map((u) => [u.id, u]))

    const roleIds = Array.from(new Set(rows.map((r) => r.roleId).filter((x): x is string => !!x)))
    const roles = roleIds.length ? await db.select({ id: schema.employeeRoles.id, title: schema.employeeRoles.title })
      .from(schema.employeeRoles).where(inArray(schema.employeeRoles.id, roleIds)) : []
    const roleById = new Map(roles.map((r) => [r.id, r]))

    return NextResponse.json({
      events: rows.map((r) => ({
        id: r.id,
        reason: r.reason,
        from: userById.get(r.fromUserId) || { id: r.fromUserId, name: null, email: '(removed)' },
        to: r.toUserId ? (userById.get(r.toUserId) || { id: r.toUserId, name: null, email: '(removed)' }) : null,
        role: r.roleId ? (roleById.get(r.roleId) || { id: r.roleId, title: '(removed)' }) : null,
        recordsTransferred: r.recordsTransferred,
        decisionsTransferred: r.decisionsTransferred,
        transferNotes: r.transferNotes,
        createdAt: r.createdAt,
      })),
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
