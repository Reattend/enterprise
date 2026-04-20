import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { CRON_SECRET, isTimeToSend, getCurrentTimeInTz } from '@/lib/slack-standup'
import { triggerStandupSession, autoPostSummaries } from '@/lib/slack-standup-cron'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const auth = req.headers.get('authorization')
    if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active configs
    const configs = await db.query.standupConfigs.findMany({
      where: eq(schema.standupConfigs.isActive, true),
    })

    let triggered = 0

    for (const config of configs) {
      const scheduleDays = JSON.parse(config.scheduleDays) as number[]
      if (!isTimeToSend(scheduleDays, config.scheduleTime, config.timezone)) {
        continue
      }

      // Get team for bot token
      const team = await db.query.standupTeams.findFirst({
        where: eq(schema.standupTeams.id, config.teamId),
      })
      if (!team) continue

      const { dateStr } = getCurrentTimeInTz(config.timezone)
      await triggerStandupSession(config, team, dateStr)
      triggered++
    }

    // Auto-post summaries for sessions past the deadline (4 hours)
    await autoPostSummaries(4)

    return NextResponse.json({ ok: true, triggered, total: configs.length })
  } catch (error: any) {
    console.error('[Standup Cron Error]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
