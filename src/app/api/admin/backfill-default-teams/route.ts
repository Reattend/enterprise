// One-shot backfill: provision a "General" team for every org that has
// zero workspace_org_links rows. Idempotent — safe to run repeatedly.
//
// Gated to authenticated users who are super_admin of at least one
// organization. The backfill itself only touches orgs that have
// nobody owning a team workspace yet, so the access check just keeps
// the surface from being open.

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { backfillOrgsMissingTeams } from '@/lib/enterprise/auto-team'

export async function POST() {
  let userId: string
  try {
    const auth = await requireAuth()
    userId = auth.userId
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // Caller must be a super_admin of some org.
  const memberships = await db
    .select({ role: schema.organizationMembers.role })
    .from(schema.organizationMembers)
    .where(eq(schema.organizationMembers.userId, userId))
  if (!memberships.some((m) => m.role === 'super_admin')) {
    return NextResponse.json({ error: 'super_admin required' }, { status: 403 })
  }

  try {
    const results = await backfillOrgsMissingTeams()
    const provisioned = results.filter((r) => 'departmentId' in r.result).length
    const errors = results.filter((r) => 'error' in r.result)
    return NextResponse.json({
      orgsExamined: results.length,
      provisioned,
      errors: errors.map((e) => ({ org: e.orgName, error: (e.result as { error: string }).error })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'backfill failed' }, { status: 500 })
  }
}
