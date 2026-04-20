import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, desc, gt } from 'drizzle-orm'
import { validateApiToken } from '@/lib/auth/token'
import { processAllPendingJobs } from '@/lib/jobs/worker'
import { z } from 'zod'

const captureSchema = z.object({
  text: z.string().min(1).max(50000),
  source: z.string().optional().default('tray'),
  occurred_at: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

/**
 * Clean screen capture text — server-side defense in depth.
 * Strips obvious UI noise so the triage LLM sees cleaner input.
 */
function cleanScreenCapture(raw: string): string {
  const lines = raw.split('\n')
  const cleaned: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length < 5) continue

    // Skip URLs
    if (trimmed.includes('://') || /^www\./.test(trimmed)) continue
    if (/\.\w{2,4}\/\S+/.test(trimmed) && !trimmed.includes(' ')) continue

    // Skip domain/product listings (e.g., "example.com $12.99/yr Available")
    const lower = trimmed.toLowerCase()
    const hasTld = /\.(com|net|org|io|xyz|co|dev|app|me|info|biz|ai|tech|store|online|site)\b/.test(lower)
    const hasPrice = /[$€£]/.test(trimmed) || /\/(yr|mo)\b/.test(lower) || /per\s+(year|month)/i.test(trimmed)
    const hasCommerce = ['available', 'taken', 'premium', 'add to cart', 'buy now', 'in stock', 'out of stock', 'free shipping']
      .some(w => lower.includes(w))
    if (hasTld && (hasPrice || hasCommerce)) continue
    if (hasPrice && hasCommerce && trimmed.split(/\s+/).length < 15) continue

    // Skip browser tab bars (many | separators with short segments)
    const pipes = (trimmed.match(/\|/g) || []).length
    if (pipes >= 2 && trimmed.length < 300) {
      const avgSegment = trimmed.length / (pipes + 1)
      if (avgSegment < 25) continue
    }

    // Skip lines that are mostly symbols
    const alphaCount = (trimmed.match(/[a-zA-Z]/g) || []).length
    if (trimmed.length > 0 && alphaCount / trimmed.length < 0.35) continue

    // Skip price-heavy lines (multiple currency symbols)
    const priceCount = (trimmed.match(/[$€£]/g) || []).length
    if (priceCount >= 2) continue

    // Skip single-word UI elements
    if (!trimmed.includes(' ') && trimmed.length < 20) continue

    // Skip macOS/Windows menu patterns
    if (/^(file|edit|view|window|help|format|insert|tools|debug|terminal|go|run|selection)$/i.test(trimmed)) continue
    if (lower.startsWith('file ') && lower.includes('edit ') && lower.includes('view ')) continue

    // Skip nav/sidebar patterns (many bullets)
    const bullets = (trimmed.match(/[•·›→←]/g) || []).length
    if (bullets >= 3) continue

    cleaned.push(trimmed)
  }

  // Repetition filter: if many lines share a similar structure, it's tabular data
  if (cleaned.length >= 5) {
    const shapeFn = (line: string) => line.split(/\s+/).map(w =>
      /^[\d$€£.,_%]+$/.test(w) ? 'N' : w.length <= 3 ? 'S' : 'W'
    ).join('')

    const shapes = cleaned.map(shapeFn)
    const shapeCounts: Record<string, number> = {}
    for (const s of shapes) {
      shapeCounts[s] = (shapeCounts[s] || 0) + 1
    }

    let maxShape = ''
    let maxCount = 0
    for (const shape of Object.keys(shapeCounts)) {
      if (shapeCounts[shape] > maxCount) { maxCount = shapeCounts[shape]; maxShape = shape }
    }

    // If > 40% of lines share the same shape and there are 5+, strip all but 2
    if (maxCount >= 5 && maxCount / cleaned.length > 0.4) {
      let kept = 0
      const filtered = cleaned.filter(line => {
        if (shapeFn(line) === maxShape) {
          kept++
          return kept <= 2
        }
        return true
      })
      return filtered.join('\n').trim()
    }
  }

  return cleaned.join('\n').trim()
}

/**
 * Simple text similarity (Jaccard on words) — used for dedup
 */
function textSimilarity(a: string, b: string): number {
  const arrA = a.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const arrB = b.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  if (arrA.length === 0 && arrB.length === 0) return 1
  const setB = new Set(arrB)
  let intersection = 0
  const seen = new Set<string>()
  for (let i = 0; i < arrA.length; i++) {
    const w = arrA[i]
    if (!seen.has(w)) {
      seen.add(w)
      if (setB.has(w)) intersection++
    }
  }
  const uniqueA = seen.size
  const uniqueB = setB.size
  const union = uniqueA + uniqueB - intersection
  return union === 0 ? 1 : intersection / union
}

export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiToken(req.headers.get('authorization'))
    if (!auth) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = captureSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    let { text, source, occurred_at, metadata } = parsed.data

    // Clean screen captures server-side (defense in depth)
    const isScreenCapture = metadata?.capture_type === 'screen'
    if (isScreenCapture) {
      text = cleanScreenCapture(text)
      // Drop if cleaning leaves nothing meaningful (15 words minimum)
      const wordCount = text.split(/\s+/).filter(w => w.length > 2).length
      if (wordCount < 15) {
        return NextResponse.json({ id: null, status: 'filtered' })
      }
    }

    // --- Dedup: skip if a very similar capture was made in the last 3 minutes ---
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString()
    const recentItems = await db.query.rawItems.findMany({
      where: and(
        eq(schema.rawItems.workspaceId, auth.workspaceId),
        gt(schema.rawItems.createdAt, threeMinutesAgo),
      ),
      orderBy: [desc(schema.rawItems.createdAt)],
      limit: 5,
      columns: { text: true },
    })

    for (const recent of recentItems) {
      if (textSimilarity(text, recent.text) > 0.75) {
        return NextResponse.json({ id: null, status: 'deduped' })
      }
    }

    const id = crypto.randomUUID()
    await db.insert(schema.rawItems).values({
      id,
      workspaceId: auth.workspaceId,
      text,
      occurredAt: occurred_at || new Date().toISOString(),
      metadata: metadata ? JSON.stringify({ ...metadata, capturedBy: 'tray' }) : JSON.stringify({ capturedBy: 'tray' }),
      status: 'new',
    })

    // Queue triage job
    await db.insert(schema.jobQueue).values({
      type: 'triage',
      payload: JSON.stringify({ rawItemId: id }),
      workspaceId: auth.workspaceId,
    })

    // Fire-and-forget: process the queued triage job in the background
    processAllPendingJobs().catch(console.error)

    return NextResponse.json({ id, status: 'queued' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
