import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { getLLM } from '@/lib/ai/llm'
import { enqueueJob } from '@/lib/jobs/worker'
import { z } from 'zod'

const reanalysisSchema = z.object({
  title: z.string(),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
})

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, workspaceId } = await requireAuth()
    const { id } = await params

    // Verify ownership
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, userId),
    })
    const allWorkspaceIds = memberships.map(m => m.workspaceId)

    const record = await db.query.records.findFirst({
      where: and(
        eq(schema.records.id, id),
        inArray(schema.records.workspaceId, allWorkspaceIds),
      ),
    })
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    const textToAnalyze = [record.title, record.summary, record.content].filter(Boolean).join('\n\n')

    const llm = getLLM()
    const prompt = `You are re-analyzing an edited memory. Extract the best title, a 1-2 sentence summary, and a confidence score (0-1) of how clear and complete this memory is.

Memory content:
${textToAnalyze.slice(0, 3000)}

Respond with JSON only:
{
  "title": "concise, specific title (max 80 chars)",
  "summary": "1-2 sentence summary of what this memory is about",
  "confidence": 0.85
}`

    const result = await llm.generateJSON(prompt, reanalysisSchema)

    const now = new Date().toISOString()
    await db.update(schema.records)
      .set({
        title: result.title,
        summary: result.summary,
        confidence: result.confidence,
        updatedAt: now,
      })
      .where(eq(schema.records.id, id))

    // Re-queue embedding since content changed
    await enqueueJob(workspaceId, 'embed', { recordId: id })

    return NextResponse.json({
      title: result.title,
      summary: result.summary,
      confidence: result.confidence,
      updatedAt: now,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
