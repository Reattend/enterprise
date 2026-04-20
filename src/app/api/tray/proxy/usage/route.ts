import { NextRequest } from 'next/server'
import { resolveAuth, getUsageStats } from '@/lib/metering'
import { db, schema } from '@/lib/db'
import { eq, and, gte, sql } from 'drizzle-orm'

/**
 * GET /api/tray/proxy/usage
 * Returns current usage stats for the device/user.
 * Accepts X-Device-Id (anonymous) or Authorization: Bearer rat_xxx (authenticated).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await resolveAuth(req.headers)

    if (!auth.deviceId && !auth.userId) {
      return Response.json({ error: 'X-Device-Id header or Authorization required' }, { status: 401 })
    }

    const stats = await getUsageStats(auth.deviceId, auth.userId, auth.tier)

    // Add meeting recording stats
    let meetingRecordingsToday = 0
    const RECORDING_LIMIT = 2
    if (auth.workspaceId) {
      const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.records)
        .where(and(
          eq(schema.records.workspaceId, auth.workspaceId),
          eq(schema.records.type, 'transcript'),
          gte(schema.records.createdAt, todayStart),
        ))
      meetingRecordingsToday = Number(result[0]?.count ?? 0)
    }

    return Response.json({
      ...stats,
      meetingRecordingsToday,
      meetingRecordingsLimit: stats.plan === 'pro' ? null : RECORDING_LIMIT,
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
