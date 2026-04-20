import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { requireAdminAuth } from '@/lib/admin/auth'

// POST — user submits thumbs up or down on an AI answer
export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth()
    const { question, answerText, sources, rating } = await req.json()

    if (!question || !answerText || !['up', 'down'].includes(rating)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    await db.insert(schema.askFeedback).values({
      userId,
      question: question.slice(0, 1000),
      answerText: answerText.slice(0, 3000),
      sources: sources ? JSON.stringify(sources) : null,
      rating,
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET — admin: list thumbs-down feedback with user info
export async function GET(req: NextRequest) {
  try {
    await requireAdminAuth()

    const ratingFilter = req.nextUrl.searchParams.get('rating') || 'down'

    const rows = await db.query.askFeedback.findMany({
      where: eq(schema.askFeedback.rating, ratingFilter as 'up' | 'down'),
      orderBy: desc(schema.askFeedback.createdAt),
      limit: 200,
    })

    // Attach user email/name
    const withUsers = await Promise.all(rows.map(async (row) => {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, row.userId),
        columns: { email: true, name: true },
      })
      return {
        ...row,
        userEmail: user?.email || '—',
        userName: user?.name || '—',
        sourcesArr: row.sources ? JSON.parse(row.sources) : [],
      }
    }))

    return NextResponse.json({ feedback: withUsers })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
