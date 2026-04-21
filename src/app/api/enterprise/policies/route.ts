import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { and, eq, desc, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  parseApplicability,
  userIsSubjectToPolicy,
  getOrgContext,
  hasOrgPermission,
} from '@/lib/enterprise'

// GET /api/enterprise/policies?orgId=...&status=published
// Lists policies in the org, filtered by status if provided, plus each
// current user's ack state (acknowledged | pending | not_subject).
export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const orgId = req.nextUrl.searchParams.get('orgId')
    const status = req.nextUrl.searchParams.get('status')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const ctx = await getOrgContext(userId, orgId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const rows = await db.query.policies.findMany({
      where: status
        ? and(eq(schema.policies.organizationId, orgId), eq(schema.policies.status, status as 'draft' | 'published' | 'archived'))
        : eq(schema.policies.organizationId, orgId),
      orderBy: desc(schema.policies.updatedAt),
    })

    // Ack state for published policies
    const publishedVersionIds = rows
      .filter((p) => p.status === 'published' && p.currentVersionId)
      .map((p) => p.currentVersionId!) as string[]
    const acks = publishedVersionIds.length
      ? await db
          .select()
          .from(schema.policyAcknowledgments)
          .where(and(
            eq(schema.policyAcknowledgments.userId, userId),
            inArray(schema.policyAcknowledgments.policyVersionId, publishedVersionIds),
          ))
      : []
    const ackedVersions = new Set(acks.map((a) => a.policyVersionId))

    // Hydrate per-policy
    const out = await Promise.all(
      rows.map(async (p) => {
        const applicability = parseApplicability(p.applicability)
        const subject = p.status === 'published'
          ? await userIsSubjectToPolicy({ userId, organizationId: orgId, applicability })
          : false
        const ackState =
          p.status !== 'published' ? 'not_applicable' :
          !subject ? 'not_subject' :
          p.currentVersionId && ackedVersions.has(p.currentVersionId) ? 'acknowledged' : 'pending'

        // Fetch version snapshot for summary/body (optional; small)
        let version: { id: string; versionNumber: number; title: string; summary: string | null; publishedAt: string | null } | null = null
        if (p.currentVersionId) {
          const [v] = await db.select({
            id: schema.policyVersions.id,
            versionNumber: schema.policyVersions.versionNumber,
            title: schema.policyVersions.title,
            summary: schema.policyVersions.summary,
            publishedAt: schema.policyVersions.publishedAt,
          }).from(schema.policyVersions)
            .where(eq(schema.policyVersions.id, p.currentVersionId))
            .limit(1)
          version = v || null
        }

        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          category: p.category,
          iconName: p.iconName,
          status: p.status,
          effectiveDate: p.effectiveDate,
          applicability,
          currentVersion: version,
          ackState,
        }
      })
    )

    return NextResponse.json({
      policies: out,
      canAuthor: hasOrgPermission(ctx, 'policies.manage'),
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// POST /api/enterprise/policies
// Body: {
//   orgId, title, slug?, category?, iconName?, effectiveDate?,
//   applicability, body, summary?, publish?: boolean
// }
// Creates the policy row + its first version. If publish=true, also marks
// status='published' and sets currentVersionId.
export async function POST(req: NextRequest) {
  try {
    const { userId, session } = await requireAuth()
    const body = await req.json()
    const {
      orgId, title, slug, category, iconName, effectiveDate,
      applicability, body: policyBody, summary, publish,
    } = body

    if (!orgId || !title || !policyBody) {
      return NextResponse.json({ error: 'orgId, title, and body required' }, { status: 400 })
    }

    const ctx = await getOrgContext(userId, orgId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (!hasOrgPermission(ctx, 'policies.manage')) {
      return NextResponse.json({ error: 'missing permission: policies.manage' }, { status: 403 })
    }
    void session

    const finalSlug = (slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const appl = JSON.stringify(applicability || { allOrg: true, departments: [], roles: [], users: [] })
    const now = new Date().toISOString()

    const [policy] = await db.insert(schema.policies).values({
      organizationId: orgId,
      title,
      slug: finalSlug,
      category: category || null,
      iconName: iconName || null,
      status: publish ? 'published' : 'draft',
      effectiveDate: effectiveDate || null,
      applicability: appl,
      createdBy: userId,
    }).returning()

    const [version] = await db.insert(schema.policyVersions).values({
      policyId: policy.id,
      versionNumber: 1,
      title,
      summary: summary || null,
      body: policyBody,
      requiresReAck: true,
      publishedAt: publish ? now : null,
      publishedByUserId: publish ? userId : null,
    }).returning()

    await db.update(schema.policies)
      .set({ currentVersionId: version.id, updatedAt: now })
      .where(eq(schema.policies.id, policy.id))

    return NextResponse.json({ policy: { id: policy.id, slug: policy.slug }, version })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
