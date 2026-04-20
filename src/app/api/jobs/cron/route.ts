import { NextRequest, NextResponse } from 'next/server'
import { processAllPendingJobs, processNewRawItems } from '@/lib/jobs/worker'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { runGmailSync } from '@/lib/integrations/gmail'
import { runCalendarSync } from '@/lib/integrations/calendar'
import { runSlackSync } from '@/lib/integrations/slack'
import { runNotionSync } from '@/lib/integrations/notion'
import { runMeetingBriefs } from '@/lib/ai/meeting-brief'
import { runWeeklyDigest } from '@/lib/ai/weekly-digest'
import { runCrossWorkspaceSynthesis } from '@/lib/ai/cross-workspace-synthesis'
import { runMemoryGapDetection } from '@/lib/ai/memory-gap-detection'

const CRON_SECRET = process.env.CRON_SECRET || '655468654457899876768dfffgd890'
const GMAIL_SYNC_INTERVAL_MS = 30 * 60 * 1000    // 30 minutes
const CALENDAR_SYNC_INTERVAL_MS = 60 * 60 * 1000  // 60 minutes
const SLACK_SYNC_INTERVAL_MS = 30 * 60 * 1000     // 30 minutes
const NOTION_SYNC_INTERVAL_MS = 60 * 60 * 1000    // 60 minutes

async function autoSyncAllIntegrations(): Promise<{ gmailSynced: number; calendarSynced: number; slackSynced: number; notionSynced: number }> {
  let gmailSynced = 0
  let calendarSynced = 0
  let slackSynced = 0

  // Auto-sync Gmail connections
  const gmailConnections = await db.query.integrationsConnections.findMany({
    where: eq(schema.integrationsConnections.integrationKey, 'gmail'),
  })

  for (const conn of gmailConnections) {
    if (conn.status !== 'connected' || !conn.refreshToken) continue
    const settings = conn.settings ? JSON.parse(conn.settings) : {}
    if (settings.syncEnabled === false) continue
    if ((settings.domainWhitelist || []).length === 0) continue

    const needsSync = !conn.lastSyncedAt ||
      new Date(conn.lastSyncedAt).getTime() < Date.now() - GMAIL_SYNC_INTERVAL_MS

    if (needsSync) {
      try {
        console.log(`[AutoSync] Gmail for workspace ${conn.workspaceId}`)
        const result = await runGmailSync(conn, conn.workspaceId)
        gmailSynced += result.synced
        console.log(`[AutoSync] Gmail done: ${result.synced} new threads, ${result.skipped} skipped`)
      } catch (e: any) {
        console.error(`[AutoSync] Gmail failed for ${conn.workspaceId}:`, e.message)
        await db.update(schema.integrationsConnections)
          .set({ syncError: e.message, updatedAt: new Date().toISOString() })
          .where(eq(schema.integrationsConnections.id, conn.id))
      }
    }
  }

  // Auto-sync Calendar connections
  const calendarConnections = await db.query.integrationsConnections.findMany({
    where: eq(schema.integrationsConnections.integrationKey, 'google-calendar'),
  })

  for (const conn of calendarConnections) {
    if (conn.status !== 'connected' || !conn.refreshToken) continue
    const settings = conn.settings ? JSON.parse(conn.settings) : {}
    if (settings.syncEnabled === false) continue

    const needsSync = !conn.lastSyncedAt ||
      new Date(conn.lastSyncedAt).getTime() < Date.now() - CALENDAR_SYNC_INTERVAL_MS

    if (needsSync) {
      try {
        console.log(`[AutoSync] Calendar for workspace ${conn.workspaceId}`)
        const result = await runCalendarSync(conn, conn.workspaceId)
        calendarSynced += result.synced
        console.log(`[AutoSync] Calendar done: ${result.synced} new events`)
      } catch (e: any) {
        console.error(`[AutoSync] Calendar failed for ${conn.workspaceId}:`, e.message)
        await db.update(schema.integrationsConnections)
          .set({ syncError: e.message, updatedAt: new Date().toISOString() })
          .where(eq(schema.integrationsConnections.id, conn.id))
      }
    }
  }

  // Auto-sync Slack connections
  const slackConnections = await db.query.integrationsConnections.findMany({
    where: eq(schema.integrationsConnections.integrationKey, 'slack'),
  })

  for (const conn of slackConnections) {
    if (conn.status !== 'connected' || !conn.accessToken) continue
    const settings = conn.settings ? JSON.parse(conn.settings) : {}
    if (settings.syncEnabled === false) continue

    const needsSync = !conn.lastSyncedAt ||
      new Date(conn.lastSyncedAt).getTime() < Date.now() - SLACK_SYNC_INTERVAL_MS

    if (needsSync) {
      try {
        console.log(`[AutoSync] Slack for workspace ${conn.workspaceId}`)
        const result = await runSlackSync(conn, conn.workspaceId)
        slackSynced += result.synced
        console.log(`[AutoSync] Slack done: ${result.synced} new messages, ${result.errors} errors`)
      } catch (e: any) {
        console.error(`[AutoSync] Slack failed for ${conn.workspaceId}:`, e.message)
        await db.update(schema.integrationsConnections)
          .set({ syncError: e.message, updatedAt: new Date().toISOString() })
          .where(eq(schema.integrationsConnections.id, conn.id))
      }
    }
  }

  // Auto-sync Notion connections
  let notionSynced = 0
  const notionConnections = await db.query.integrationsConnections.findMany({
    where: eq(schema.integrationsConnections.integrationKey, 'notion'),
  })
  for (const conn of notionConnections) {
    if (conn.status !== 'connected' || !conn.accessToken) continue
    const needsSync = !conn.lastSyncedAt ||
      new Date(conn.lastSyncedAt).getTime() < Date.now() - NOTION_SYNC_INTERVAL_MS
    if (needsSync) {
      try {
        console.log(`[AutoSync] Notion for workspace ${conn.workspaceId}`)
        const result = await runNotionSync(conn, conn.workspaceId)
        notionSynced += result.synced
      } catch (e: any) {
        console.error(`[AutoSync] Notion failed for ${conn.workspaceId}:`, e.message)
        await db.update(schema.integrationsConnections)
          .set({ syncError: e.message, updatedAt: new Date().toISOString() })
          .where(eq(schema.integrationsConnections.id, conn.id))
      }
    }
  }

  return { gmailSynced, calendarSynced, slackSynced, notionSynced }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Step 1: auto-sync integrations that are due
    const { gmailSynced, calendarSynced, slackSynced } = await autoSyncAllIntegrations()
    // Step 2: triage any new raw items
    const triaged = await processNewRawItems()
    // Step 3: process embed/link jobs
    const processed = await processAllPendingJobs()
    // Step 4: proactive meeting briefs (fires silently, never blocks cron)
    const { sent: briefsSent } = await runMeetingBriefs().catch(() => ({ sent: 0 }))
    // Step 5: weekly digest (Monday 08:00–09:00 UTC, one per workspace per week)
    const { sent: digestsSent } = await runWeeklyDigest().catch(() => ({ sent: 0 }))
    // Step 6: cross-workspace team synthesis (Wednesday 08:00–09:00 UTC)
    const { sent: synthSent } = await runCrossWorkspaceSynthesis().catch(() => ({ sent: 0 }))
    // Step 7: memory gap detection (Friday 08:00–09:00 UTC)
    const { sent: gapsSent } = await runMemoryGapDetection().catch(() => ({ sent: 0 }))
    return NextResponse.json({ gmailSynced, calendarSynced, slackSynced, triaged, processed, briefsSent, digestsSent, synthSent, gapsSent, ts: new Date().toISOString() })
  } catch (error: any) {
    console.error('[Cron] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
