import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, sql, and, gte } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/ocr/stats?orgId=...&days=30
// OCR quality dashboard data. Admin-only.
//   - total jobs in window
//   - by-status breakdown
//   - avg confidence across completed
//   - total redactions applied
//   - % flagged for needs_review

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth
    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '30'), 180)
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()

    const all = await db.select({
      status: schema.ocrJobs.status,
      count: sql<number>`cast(count(*) as integer)`,
    })
      .from(schema.ocrJobs)
      .where(and(
        eq(schema.ocrJobs.organizationId, orgId),
        gte(schema.ocrJobs.createdAt, since),
      ))
      .groupBy(schema.ocrJobs.status)

    const byStatus: Record<string, number> = {
      pending: 0, processing: 0, completed: 0, failed: 0, needs_review: 0,
    }
    let total = 0
    for (const r of all) {
      byStatus[r.status] = r.count
      total += r.count
    }

    // Avg confidence across completed + needs_review (jobs that produced text)
    const avgConf = await db.select({
      avg: sql<number>`avg(avg_confidence)`,
    })
      .from(schema.ocrJobs)
      .where(and(
        eq(schema.ocrJobs.organizationId, orgId),
        gte(schema.ocrJobs.createdAt, since),
        sql`avg_confidence IS NOT NULL`,
      ))

    // Total redactions + total pages
    const totals = await db.select({
      redactions: sql<number>`cast(coalesce(sum(redaction_count), 0) as integer)`,
      pages: sql<number>`cast(coalesce(sum(page_count), 0) as integer)`,
      textLen: sql<number>`cast(coalesce(sum(extracted_text_length), 0) as integer)`,
    })
      .from(schema.ocrJobs)
      .where(and(
        eq(schema.ocrJobs.organizationId, orgId),
        gte(schema.ocrJobs.createdAt, since),
      ))

    return NextResponse.json({
      windowDays: days,
      total,
      byStatus,
      avgConfidence: avgConf[0]?.avg ?? null,
      totalRedactions: totals[0]?.redactions ?? 0,
      totalPages: totals[0]?.pages ?? 0,
      totalTextLength: totals[0]?.textLen ?? 0,
      flagRate: total > 0 ? (byStatus.needs_review + byStatus.failed) / total : 0,
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
