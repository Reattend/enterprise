// Start My Day email, run from the jobs cron (every 30 minutes).
//
// For each person with a known timezone and the email switched on: if it is
// the 7 o'clock hour where they are, build (or reuse) today's briefing for
// their active scope and send it - only when there is something real to say
// (something new, due, or on the calendar). One email per person per day;
// the daily_briefings row records it. Sandbox accounts are skipped.

import { and, eq, isNotNull } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import { isSandboxEmail } from '@/lib/sandbox/detect'
import { resolveActiveOrgId } from '@/lib/enterprise/active-org'
import { sendMorningBriefing } from '@/lib/email'
import {
  briefingUnsubscribeToken, getTodayBriefing, localDay, localHour, markBriefingEmailed, safeTimezone, wasBriefingEmailed,
} from './index'

const SEND_HOUR = 7
const MAX_SENDS_PER_RUN = 200
const TIME_BUDGET_MS = 8 * 60_000

export async function runMorningBriefings(): Promise<{ sent: number; checked: number }> {
  const started = Date.now()
  const users = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name, tz: schema.users.timezone })
    .from(schema.users)
    .where(and(isNotNull(schema.users.timezone), eq(schema.users.briefingEmail, true)))

  let sent = 0
  let checked = 0
  for (const u of users) {
    if (sent >= MAX_SENDS_PER_RUN || Date.now() - started > TIME_BUDGET_MS) break
    if (isSandboxEmail(u.email)) continue
    const tz = safeTimezone(u.tz)
    if (localHour(tz) !== SEND_HOUR) continue
    checked++
    try {
      const orgId = await resolveActiveOrgId(u.id)
      const scope = orgId ?? 'personal'
      const day = localDay(tz)
      if (await wasBriefingEmailed(u.id, scope, day)) continue
      const briefing = await getTodayBriefing(u.id, orgId, tz)
      if (!briefing.hasSomething) continue
      const unsubscribeUrl = `https://reattend.com/api/briefing/unsubscribe?u=${encodeURIComponent(u.id)}&t=${briefingUnsubscribeToken(u.id)}`
      const ok = await sendMorningBriefing({ toEmail: u.email, name: u.name, tz, briefing, unsubscribeUrl })
      if (ok) {
        await markBriefingEmailed(u.id, scope, day)
        sent++
      }
    } catch (err) {
      console.error('[morning-briefing]', u.id, err)
    }
  }
  if (sent) console.log(`[morning-briefing] sent ${sent} (checked ${checked})`)
  return { sent, checked }
}
