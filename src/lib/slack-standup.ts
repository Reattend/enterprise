import crypto from 'crypto'

// ─── Env ────────────────────────────────────────────────
export const SLACK_STANDUP_CLIENT_ID = process.env.SLACK_STANDUP_CLIENT_ID || ''
export const SLACK_STANDUP_CLIENT_SECRET = process.env.SLACK_STANDUP_CLIENT_SECRET || ''
export const SLACK_STANDUP_SIGNING_SECRET = process.env.SLACK_STANDUP_SIGNING_SECRET || ''
export const CRON_SECRET = process.env.CRON_SECRET || ''

// ─── Request Verification ───────────────────────────────
export function verifyStandupRequest(body: string, timestamp: string, signature: string): boolean {
  if (!SLACK_STANDUP_SIGNING_SECRET) return false

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 300) return false

  const sigBaseString = `v0:${timestamp}:${body}`
  const hmac = crypto.createHmac('sha256', SLACK_STANDUP_SIGNING_SECRET)
  hmac.update(sigBaseString)
  const computedSignature = `v0=${hmac.digest('hex')}`

  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(signature)
  )
}

// ─── Slack API helper ───────────────────────────────────
export async function standupSlackPost(method: string, token: string, body: Record<string, any>) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

// ─── Default Questions ──────────────────────────────────
export const DEFAULT_QUESTIONS = [
  'What did you work on yesterday?',
  'What are you working on today?',
  'Any blockers or things you need help with?',
]

// ─── Common Timezones ───────────────────────────────────
export const COMMON_TIMEZONES = [
  { label: 'US Eastern (ET)', value: 'America/New_York' },
  { label: 'US Central (CT)', value: 'America/Chicago' },
  { label: 'US Mountain (MT)', value: 'America/Denver' },
  { label: 'US Pacific (PT)', value: 'America/Los_Angeles' },
  { label: 'India (IST)', value: 'Asia/Kolkata' },
  { label: 'UK (GMT/BST)', value: 'Europe/London' },
  { label: 'Central Europe (CET)', value: 'Europe/Berlin' },
  { label: 'Japan (JST)', value: 'Asia/Tokyo' },
  { label: 'Australia Eastern (AEST)', value: 'Australia/Sydney' },
  { label: 'Singapore (SGT)', value: 'Asia/Singapore' },
]

// ─── Timezone Helpers ───────────────────────────────────
export function getCurrentTimeInTz(timezone: string): { hours: number; minutes: number; dayOfWeek: number; dateStr: string } {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const hours = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
  const minutes = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
  const dayName = parts.find(p => p.type === 'weekday')?.value || 'Mon'
  const year = parts.find(p => p.type === 'year')?.value || '2026'
  const month = parts.find(p => p.type === 'month')?.value || '01'
  const day = parts.find(p => p.type === 'day')?.value || '01'

  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dayOfWeek = dayMap[dayName] ?? 1

  return { hours, minutes, dayOfWeek, dateStr: `${year}-${month}-${day}` }
}

/** Check if now (in config's timezone) is within the 5-minute cron window of the schedule */
export function isTimeToSend(
  scheduleDays: number[],
  scheduleTime: string,
  timezone: string,
): boolean {
  const { hours, minutes, dayOfWeek } = getCurrentTimeInTz(timezone)
  if (!scheduleDays.includes(dayOfWeek)) return false

  const [targetH, targetM] = scheduleTime.split(':').map(Number)
  const currentMinutes = hours * 60 + minutes
  const targetMinutes = targetH * 60 + targetM

  // Within 5-minute window (cron runs every 5 min)
  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 5
}

// ─── Block Kit: Standup DM to participant ───────────────
export function buildStandupDmBlocks(
  questions: string[],
  configId: string,
  sessionId: string,
  channelName: string,
) {
  return {
    text: `Time for your standup in #${channelName}!`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📋 Standup — #${channelName}` },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `It's standup time! Here are today's questions:\n\n${questions.map((q, i) => `*${i + 1}.* ${q}`).join('\n')}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✏️ Submit Your Update' },
            action_id: 'standup_answer',
            value: JSON.stringify({ configId, sessionId }),
            style: 'primary',
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '_Powered by <https://reattend.com/free-standup-bot|Reattend Standups> — Free async standups for Slack_',
          },
        ],
      },
    ],
  }
}

// ─── Block Kit: Summary posted to channel ───────────────
export function buildSummaryBlocks(
  responses: Array<{ userId: string; answers: string[] }>,
  questions: string[],
  channelName: string,
  date: string,
) {
  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `📋 Standup Summary — ${date}` },
    },
  ]

  for (const resp of responses) {
    const answerText = questions.map((q, i) => `*${q}*\n${resp.answers[i] || '_No answer_'}`).join('\n\n')
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<@${resp.userId}>`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: answerText,
        },
      },
    )
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `${responses.length} team member${responses.length === 1 ? '' : 's'} responded · _Powered by <https://reattend.com/free-standup-bot|Reattend Standups>_\nStandups fade in Slack. <https://reattend.com|Save them forever with Reattend →>`,
        },
      ],
    },
  )

  return blocks
}
