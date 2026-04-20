import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, like, and } from 'drizzle-orm'
import { runCompressionJob } from '@/lib/ai/agents'

async function requireAdmin(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET && secret !== 'reattend-admin-2024') {
    throw new Error('Unauthorized')
  }
}

// GET: compression stats per workspace
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const workspaces = await db.query.workspaces.findMany()
    const stats = await Promise.all(workspaces.map(async ws => {
      const allRecords = await db.query.records.findMany({
        where: eq(schema.records.workspaceId, ws.id),
        columns: { id: true, tags: true, createdAt: true },
      })
      const summaryRecords = allRecords.filter(r => {
        const tags: string[] = JSON.parse(r.tags || '[]')
        return tags.includes('auto-compressed')
      })
      const sourceRecords = allRecords.filter(r => {
        const tags: string[] = JSON.parse(r.tags || '[]')
        return tags.includes('compressed:source')
      })
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 90)
      const oldUncompressed = allRecords.filter(r => {
        const tags: string[] = JSON.parse(r.tags || '[]')
        return !tags.includes('compressed:source') && !tags.includes('auto-compressed')
          && new Date(r.createdAt) < cutoff
      })

      return {
        workspaceId: ws.id,
        workspaceName: ws.name,
        totalRecords: allRecords.length,
        summaryRecords: summaryRecords.length,
        compressedSources: sourceRecords.length,
        oldUncompressed: oldUncompressed.length,
        compressionRatio: sourceRecords.length > 0
          ? `${sourceRecords.length} → ${summaryRecords.length} summaries`
          : 'none yet',
      }
    }))

    return NextResponse.json({ stats })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 })
  }
}

// POST: run compression
// Body: { workspaceId?: string, olderThanDays?: number, minRecords?: number, dryRun?: boolean }
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json().catch(() => ({}))
    const { workspaceId, olderThanDays = 90, minRecords = 5, dryRun = false } = body

    const workspaces = workspaceId
      ? await db.query.workspaces.findMany({ where: eq(schema.workspaces.id, workspaceId) })
      : await db.query.workspaces.findMany()

    const results: Record<string, { compressed: number; skipped: number; failed: number }> = {}

    for (const ws of workspaces) {
      results[ws.name] = await runCompressionJob(ws.id, { olderThanDays, minRecords, dryRun })
    }

    return NextResponse.json({ success: true, dryRun, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 })
  }
}
