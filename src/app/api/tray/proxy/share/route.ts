import { NextRequest } from 'next/server'
import { resolveAuth } from '@/lib/metering'
import { db, schema } from '@/lib/db'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-Id',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

/**
 * POST /api/tray/proxy/share
 * Creates a public share link for a meeting/memory.
 * Body: { title, summary, content, record_type, tags, meta, entities }
 * Returns: { shareUrl, shareToken }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuth(req.headers)
    if (!auth.deviceId && !auth.userId) {
      return Response.json({ error: 'Auth required' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json()
    if (!body.title) {
      return Response.json({ error: 'Title is required' }, { status: 400, headers: corsHeaders })
    }

    const [row] = await db.insert(schema.sharedLinks).values({
      title: body.title,
      summary: body.summary || null,
      content: body.content || null,
      recordType: body.record_type || 'note',
      tags: body.tags ? JSON.stringify(body.tags) : null,
      meta: body.meta ? JSON.stringify(body.meta) : null,
      entities: body.entities ? JSON.stringify(body.entities) : null,
      deviceId: auth.deviceId,
      userId: auth.userId,
    }).returning()

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reattend.com'
    return Response.json({
      shareUrl: `${baseUrl}/share/${row.shareToken}`,
      shareToken: row.shareToken,
    }, { headers: corsHeaders })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders })
  }
}
