import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { and, eq, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  parseApplicability,
  userIsSubjectToPolicy,
  getOrgContext,
  hasOrgPermission,
} from '@/lib/enterprise'

// GET /api/enterprise/policies/[policyId]
// Returns the policy + all versions + current-user ack state.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ policyId: string }> },
) {
  try {
    const { userId } = await requireAuth()
    const { policyId } = await params

    const policy = await db.query.policies.findFirst({
      where: eq(schema.policies.id, policyId),
    })
    if (!policy) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const ctx = await getOrgContext(userId, policy.organizationId)
    if (!ctx) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const versions = await db.query.policyVersions.findMany({
      where: eq(schema.policyVersions.policyId, policyId),
      orderBy: desc(schema.policyVersions.versionNumber),
    })

    const currentVersion = versions.find((v) => v.id === policy.currentVersionId) || versions[0] || null

    const applicability = parseApplicability(policy.applicability)
    const subject = policy.status === 'published'
      ? await userIsSubjectToPolicy({ userId, organizationId: policy.organizationId, applicability })
      : false

    let ackState: 'not_applicable' | 'not_subject' | 'pending' | 'acknowledged' = 'not_applicable'
    let myAck: typeof schema.policyAcknowledgments.$inferSelect | null = null
    if (policy.status === 'published' && subject && policy.currentVersionId) {
      const [ack] = await db.select().from(schema.policyAcknowledgments)
        .where(and(
          eq(schema.policyAcknowledgments.userId, userId),
          eq(schema.policyAcknowledgments.policyVersionId, policy.currentVersionId),
        ))
        .limit(1)
      myAck = ack || null
      ackState = ack ? 'acknowledged' : 'pending'
    } else if (policy.status === 'published' && !subject) {
      ackState = 'not_subject'
    }

    return NextResponse.json({
      policy: {
        id: policy.id,
        title: policy.title,
        slug: policy.slug,
        category: policy.category,
        iconName: policy.iconName,
        status: policy.status,
        effectiveDate: policy.effectiveDate,
        applicability,
        createdBy: policy.createdBy,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
      },
      currentVersion,
      versions,
      ackState,
      myAck,
      canAuthor: hasOrgPermission(ctx, 'policies.manage'),
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// PATCH /api/enterprise/policies/[policyId]
// Body: {
//   title?, category?, iconName?, effectiveDate?, applicability?,
//   body?, summary?, changeNote?, requiresReAck?: boolean,
//   publish?: boolean, archive?: boolean,
// }
// If body or requiresReAck changes meaningfully, creates a new policy_version
// row and points currentVersionId at it. When requiresReAck=true (default),
// old acks still live in the ack table but don't count — new version needs
// fresh acks.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ policyId: string }> },
) {
  try {
    const { userId } = await requireAuth()
    const { policyId } = await params
    const body = await req.json()

    const policy = await db.query.policies.findFirst({
      where: eq(schema.policies.id, policyId),
    })
    if (!policy) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const ctx = await getOrgContext(userId, policy.organizationId)
    if (!ctx || !hasOrgPermission(ctx, 'policies.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const updates: Record<string, any> = { updatedAt: now }

    if (body.title) updates.title = body.title
    if (body.category !== undefined) updates.category = body.category
    if (body.iconName !== undefined) updates.iconName = body.iconName
    if (body.effectiveDate !== undefined) updates.effectiveDate = body.effectiveDate
    if (body.applicability) updates.applicability = JSON.stringify(body.applicability)

    // Archive shortcut
    if (body.archive === true) {
      updates.status = 'archived'
      await db.update(schema.policies).set(updates).where(eq(schema.policies.id, policyId))
      return NextResponse.json({ ok: true, status: 'archived' })
    }

    // If the user sent a new body or summary, create a new version.
    let newVersion: typeof schema.policyVersions.$inferSelect | null = null
    if (body.body || body.summary !== undefined || body.title) {
      const [latest] = await db.select()
        .from(schema.policyVersions)
        .where(eq(schema.policyVersions.policyId, policyId))
        .orderBy(desc(schema.policyVersions.versionNumber))
        .limit(1)
      const nextNumber = (latest?.versionNumber ?? 0) + 1
      const newBody = body.body ?? latest?.body ?? ''
      const newTitle = body.title ?? latest?.title ?? policy.title
      const newSummary = body.summary ?? latest?.summary ?? null

      const [inserted] = await db.insert(schema.policyVersions).values({
        policyId,
        versionNumber: nextNumber,
        title: newTitle,
        summary: newSummary,
        body: newBody,
        requiresReAck: body.requiresReAck !== false, // default true
        changeNote: body.changeNote || null,
        supersedesVersionId: latest?.id ?? null,
        publishedAt: body.publish || policy.status === 'published' ? now : null,
        publishedByUserId: body.publish || policy.status === 'published' ? userId : null,
      }).returning()
      newVersion = inserted
      updates.currentVersionId = inserted.id
    }

    if (body.publish === true) updates.status = 'published'
    if (body.publish === false && policy.status === 'draft') updates.status = 'draft'

    await db.update(schema.policies).set(updates).where(eq(schema.policies.id, policyId))

    return NextResponse.json({ ok: true, version: newVersion })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// DELETE /api/enterprise/policies/[policyId]
// Hard delete only allowed for drafts; published policies must be archived
// via PATCH { archive: true } so the ack trail stays intact.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ policyId: string }> },
) {
  try {
    const { userId } = await requireAuth()
    const { policyId } = await params

    const policy = await db.query.policies.findFirst({
      where: eq(schema.policies.id, policyId),
    })
    if (!policy) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const ctx = await getOrgContext(userId, policy.organizationId)
    if (!ctx || !hasOrgPermission(ctx, 'policies.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    if (policy.status !== 'draft') {
      return NextResponse.json({ error: 'only drafts can be deleted; archive instead' }, { status: 400 })
    }

    await db.delete(schema.policies).where(eq(schema.policies.id, policyId))
    return NextResponse.json({ ok: true })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
