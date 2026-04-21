import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, asc } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'

type TaxonomyKind = 'department_kind' | 'seniority_rank'

// Sensible defaults each org gets synthesized when empty. Keeps the create
// forms from looking broken before an admin configures anything.
const DEFAULT_DEPARTMENT_KINDS = [
  { label: 'department', rankOrder: 1, description: 'Top-level business unit' },
  { label: 'division', rankOrder: 2, description: 'Group within a department' },
  { label: 'team', rankOrder: 3, description: 'Leaf — has its own workspace' },
]
const DEFAULT_SENIORITY_RANKS = [
  { label: 'c_level', rankOrder: 1, description: 'Executive leadership' },
  { label: 'vp', rankOrder: 2, description: 'Vice president' },
  { label: 'director', rankOrder: 3, description: 'Director' },
  { label: 'manager', rankOrder: 4, description: 'Manager' },
  { label: 'lead', rankOrder: 5, description: 'Team lead' },
  { label: 'ic', rankOrder: 6, description: 'Individual contributor' },
]

// GET /api/enterprise/organizations/[orgId]/taxonomy
// Returns the org's taxonomy grouped by kind. If none is configured yet,
// returns computed defaults (not persisted — admin must save to customize).
export async function GET(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.read')
    if (isAuthResponse(auth)) return auth

    const rows = await db
      .select()
      .from(schema.organizationTaxonomy)
      .where(eq(schema.organizationTaxonomy.organizationId, orgId))
      .orderBy(asc(schema.organizationTaxonomy.rankOrder))

    const deptKinds = rows.filter((r) => r.kind === 'department_kind' && r.active)
    const seniority = rows.filter((r) => r.kind === 'seniority_rank' && r.active)

    return NextResponse.json({
      departmentKinds: deptKinds.length > 0 ? deptKinds : DEFAULT_DEPARTMENT_KINDS.map((d, i) => ({
        id: `default-dk-${i}`,
        organizationId: orgId,
        kind: 'department_kind' as TaxonomyKind,
        active: true,
        createdAt: new Date().toISOString(),
        ...d,
      })),
      seniorityRanks: seniority.length > 0 ? seniority : DEFAULT_SENIORITY_RANKS.map((s, i) => ({
        id: `default-sr-${i}`,
        organizationId: orgId,
        kind: 'seniority_rank' as TaxonomyKind,
        active: true,
        createdAt: new Date().toISOString(),
        ...s,
      })),
      isDefault: rows.length === 0,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

// PUT /api/enterprise/organizations/[orgId]/taxonomy
// Body: { departmentKinds: [{label, rankOrder, description?}], seniorityRanks: [...] }
// Replaces the full taxonomy atomically. Admin must include every row they
// want to keep — anything missing is deleted.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params
    const auth = await requireOrgAuth(req, orgId, 'org.manage')
    if (isAuthResponse(auth)) return auth

    const body = await req.json()
    const dk = Array.isArray(body.departmentKinds) ? body.departmentKinds : []
    const sr = Array.isArray(body.seniorityRanks) ? body.seniorityRanks : []

    // Validate shape + labels
    for (const d of [...dk, ...sr]) {
      if (typeof d.label !== 'string' || d.label.trim().length === 0 || d.label.length > 64) {
        return NextResponse.json({ error: `invalid label: ${String(d.label).slice(0, 40)}` }, { status: 400 })
      }
      if (typeof d.rankOrder !== 'number' || !Number.isFinite(d.rankOrder)) {
        return NextResponse.json({ error: `invalid rankOrder for ${d.label}` }, { status: 400 })
      }
    }
    // Must keep at least one department kind that includes 'team' semantics,
    // otherwise workspace auto-provisioning breaks. We don't strictly require
    // the literal string 'team' (gov can use different naming), but we require
    // at least one kind row to exist.
    if (dk.length === 0) {
      return NextResponse.json({ error: 'at least one department kind is required' }, { status: 400 })
    }

    // Atomic replace: delete then insert. Use a transaction. better-sqlite3
    // synchronous txn via sqlite directly would be ideal but drizzle doesn't
    // expose one here; sequential is OK since this is admin-only low-traffic.
    await db.delete(schema.organizationTaxonomy).where(eq(schema.organizationTaxonomy.organizationId, orgId))

    const rows: (typeof schema.organizationTaxonomy.$inferInsert)[] = []
    for (const d of dk) {
      rows.push({
        organizationId: orgId,
        kind: 'department_kind',
        label: d.label.trim(),
        rankOrder: Math.floor(d.rankOrder),
        description: d.description ?? null,
        active: true,
      })
    }
    for (const d of sr) {
      rows.push({
        organizationId: orgId,
        kind: 'seniority_rank',
        label: d.label.trim(),
        rankOrder: Math.floor(d.rankOrder),
        description: d.description ?? null,
        active: true,
      })
    }
    if (rows.length > 0) {
      await db.insert(schema.organizationTaxonomy).values(rows)
    }

    auditFromAuth(auth, 'update', {
      resourceType: 'organization_taxonomy',
      resourceId: orgId,
      metadata: { departmentKinds: dk.length, seniorityRanks: sr.length },
    })

    return NextResponse.json({ ok: true, departmentKinds: dk.length, seniorityRanks: sr.length })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
