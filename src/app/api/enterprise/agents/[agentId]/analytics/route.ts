import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, gte, desc, sql } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  hasOrgPermission,
} from '@/lib/enterprise'

// GET /api/enterprise/agents/[agentId]/analytics?days=14
// Returns per-agent stats: query count, avg rating, queries-per-day sparkline,
// top question clusters (naive — just the most-asked first 100 chars of each
// unique question).
export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const { userId } = await requireAuth()
    const { agentId } = await params
    const days = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('days') || '14'), 1), 90)

    const agent = await db.query.agents.findFirst({ where: eq(schema.agents.id, agentId) })
    if (!agent) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const ctx = await getOrgContext(userId, agent.organizationId)
    if (!ctx || !hasOrgPermission(ctx, 'agents.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const recent = await db.select()
      .from(schema.agentQueries)
      .where(and(
        eq(schema.agentQueries.agentId, agentId),
        gte(schema.agentQueries.createdAt, since),
      ))
      .orderBy(desc(schema.agentQueries.createdAt))
      .limit(1000)

    // Per-day bucket
    const perDay = new Map<string, number>()
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      perDay.set(d, 0)
    }
    for (const r of recent) {
      const d = r.createdAt.slice(0, 10)
      if (perDay.has(d)) perDay.set(d, perDay.get(d)! + 1)
    }
    const sparkline = Array.from(perDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }))

    // Rating stats
    const up = recent.filter((r) => r.rating === 'up').length
    const down = recent.filter((r) => r.rating === 'down').length
    const rated = up + down
    const avgRating = rated === 0 ? null : up / rated

    // Top questions — naive frequency by lower-cased first 100 chars
    const qCounts = new Map<string, number>()
    for (const r of recent) {
      const k = r.question.trim().slice(0, 100).toLowerCase()
      qCounts.set(k, (qCounts.get(k) || 0) + 1)
    }
    const topQuestions = Array.from(qCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question, count]) => ({ question, count }))

    // Latency p50/p95
    const latencies = recent.map((r) => r.latencyMs).filter((n): n is number => typeof n === 'number').sort((a, b) => a - b)
    const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : null
    const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)] : null

    return NextResponse.json({
      windowDays: days,
      totalQueries: recent.length,
      uniqueUsers: new Set(recent.map((r) => r.userId)).size,
      avgRating,
      ratedCount: rated,
      upvotes: up,
      downvotes: down,
      latencyP50Ms: p50,
      latencyP95Ms: p95,
      sparkline,
      topQuestions,
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
