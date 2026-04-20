import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { requireAdminAuth } from '@/lib/admin/auth'

// POST — public: submit an integration request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { appName, email } = body

    if (!appName || typeof appName !== 'string' || appName.trim().length === 0) {
      return NextResponse.json({ error: 'appName is required' }, { status: 400 })
    }

    if (appName.trim().length > 200) {
      return NextResponse.json({ error: 'appName too long' }, { status: 400 })
    }

    await db.insert(schema.integrationRequests).values({
      appName: appName.trim(),
      email: email?.trim() || null,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET — admin: list all integration requests
export async function GET() {
  try {
    await requireAdminAuth()

    const requests = await db.query.integrationRequests.findMany({
      orderBy: desc(schema.integrationRequests.createdAt),
      limit: 200,
    })

    return NextResponse.json({ requests })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT — admin: mark as reviewed
export async function PUT(req: NextRequest) {
  try {
    await requireAdminAuth()

    const { id, status } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await db.update(schema.integrationRequests)
      .set({ status: status || 'reviewed' })
      .where(eq(schema.integrationRequests.id, id))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
