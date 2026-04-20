import { NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { getValidSlackToken, listConversations } from '@/lib/slack'

// GET — return list of Slack channels the user is a member of (for channel picker)
export async function GET() {
  try {
    const { userId } = await requireAuth()

    const connection = await db.query.integrationsConnections.findFirst({
      where: and(
        eq(schema.integrationsConnections.userId, userId),
        eq(schema.integrationsConnections.integrationKey, 'slack'),
      ),
    })

    if (!connection || connection.status !== 'connected' || !connection.accessToken) {
      return NextResponse.json({ error: 'Slack not connected' }, { status: 400 })
    }

    const accessToken = await getValidSlackToken(
      connection.refreshToken,
      connection.accessToken,
      connection.tokenExpiresAt,
    )

    const channels = await listConversations(accessToken, 100)

    return NextResponse.json({
      channels: channels.map(c => ({
        id: c.id,
        name: c.name,
        numMembers: c.num_members,
        purpose: c.purpose?.value || '',
      })),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
