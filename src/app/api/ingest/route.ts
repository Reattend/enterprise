import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { z } from 'zod'

const ingestSchema = z.object({
  text: z.string().min(1).max(10000),
  source: z.string().optional().default('manual'),
  occurred_at: z.string().optional(),
  author: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
  workspace_id: z.string(),
})

// Rate limit: simple in-memory counter
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, limit: number = 60, windowMs: number = 60000): boolean {
  const now = Date.now()
  const entry = rateLimits.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const body = await req.json()
    const parsed = ingestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { text, source, occurred_at, author, metadata, workspace_id } = parsed.data

    // Create raw item
    const id = crypto.randomUUID()
    await db.insert(schema.rawItems).values({
      id,
      workspaceId: workspace_id,
      text,
      occurredAt: occurred_at || new Date().toISOString(),
      author: author ? JSON.stringify(author) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      status: 'new',
    })

    return NextResponse.json({
      id,
      status: 'new',
      message: 'Item ingested successfully. Use /api/triage to process.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
