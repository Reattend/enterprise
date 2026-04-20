import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { requireAdminAuth } from '@/lib/admin/auth'

// POST — submit feedback, feature request, or enterprise inquiry
export async function POST(req: NextRequest) {
  try {
    // Auth is optional — enterprise inquiries can come from billing page
    let userId: string | undefined
    let userEmail = ''
    let userName = ''

    try {
      const auth = await requireAuth()
      userId = auth.userId

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, auth.userId),
      })
      if (user) {
        userEmail = user.email
        userName = user.name
      }
    } catch {
      // Not logged in — that's ok for some request types
    }

    const body = await req.json()
    const { type, message, email, name } = body

    if (!type || !message) {
      return NextResponse.json({ error: 'type and message are required' }, { status: 400 })
    }

    const validTypes = ['feedback', 'feature_request', 'enterprise_inquiry', 'bug_report']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    await db.insert(schema.feedbackRequests).values({
      userId: userId || null,
      email: email || userEmail || 'anonymous',
      name: name || userName || null,
      type,
      message,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET — admin endpoint to list all feedback (used by admin dashboard)
export async function GET(req: NextRequest) {
  try {
    await requireAdminAuth()

    const status = req.nextUrl.searchParams.get('status')

    const requests = await db.query.feedbackRequests.findMany({
      where: status ? eq(schema.feedbackRequests.status, status as any) : undefined,
      orderBy: desc(schema.feedbackRequests.createdAt),
      limit: 100,
    })

    return NextResponse.json({ requests })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT — admin: update status/notes
export async function PUT(req: NextRequest) {
  try {
    await requireAdminAuth()

    const { id, status, adminNotes } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: any = {}
    if (status) updates.status = status
    if (adminNotes !== undefined) updates.adminNotes = adminNotes

    await db.update(schema.feedbackRequests).set(updates).where(eq(schema.feedbackRequests.id, id))
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
