import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, desc } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  handleEnterpriseError,
} from '@/lib/enterprise'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/ocr/jobs?orgId=...&batchId=...&status=...&limit=100
// Admin-only. Returns recent OCR jobs with their status for the batch list
// and the dashboard.

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const batchId = req.nextUrl.searchParams.get('batchId') || undefined
    const status = req.nextUrl.searchParams.get('status') || undefined
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '100'), 500)

    const conds = [eq(schema.ocrJobs.organizationId, orgId)]
    if (batchId) conds.push(eq(schema.ocrJobs.batchId, batchId))
    if (status && ['pending', 'processing', 'completed', 'failed', 'needs_review'].includes(status)) {
      conds.push(eq(schema.ocrJobs.status, status as 'pending' | 'processing' | 'completed' | 'failed' | 'needs_review'))
    }

    const rows = await db.select()
      .from(schema.ocrJobs)
      .where(and(...conds))
      .orderBy(desc(schema.ocrJobs.createdAt))
      .limit(limit)

    return NextResponse.json({
      jobs: rows.map((r) => ({
        id: r.id,
        fileName: r.fileName,
        fileSize: r.fileSize,
        mimeType: r.mimeType,
        language: r.language,
        status: r.status,
        pageCount: r.pageCount,
        avgConfidence: r.avgConfidence,
        redactionCount: r.redactionCount,
        extractedTextLength: r.extractedTextLength,
        resultRecordId: r.resultRecordId,
        errorMessage: r.errorMessage,
        batchId: r.batchId,
        createdAt: r.createdAt,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
      })),
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
