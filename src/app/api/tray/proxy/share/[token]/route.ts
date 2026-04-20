import { NextRequest } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Device-Id',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders })
}

/**
 * GET /api/tray/proxy/share/[token]
 * Fetch shared content by token (used by desktop app deep link import).
 * Returns full shared data: title, summary, content, record_type, tags, meta, entities
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const share = await db.query.sharedLinks.findFirst({
      where: eq(schema.sharedLinks.shareToken, token),
    })

    if (!share) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return Response.json({ error: 'Link expired' }, { status: 410, headers: corsHeaders })
    }

    return Response.json({
      title: share.title,
      summary: share.summary || null,
      content: share.content || null,
      record_type: share.recordType,
      tags: share.tags ? JSON.parse(share.tags) : [],
      meta: share.meta ? JSON.parse(share.meta) : {},
      entities: share.entities ? JSON.parse(share.entities) : [],
    }, { headers: corsHeaders })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders })
  }
}
