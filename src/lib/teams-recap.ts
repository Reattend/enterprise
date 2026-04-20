import { createRemoteJWKSet, jwtVerify } from 'jose'

// ─── Env vars ───
export const TEAMS_BOT_APP_ID = process.env.TEAMS_BOT_APP_ID || ''
export const TEAMS_BOT_APP_PASSWORD = process.env.TEAMS_BOT_APP_PASSWORD || ''

// ─── JWT verification ───
const JWKS = createRemoteJWKSet(
  new URL('https://login.botframework.com/v1/.well-known/keys')
)

// Emulator JWKS (for local testing)
const EMULATOR_JWKS = createRemoteJWKSet(
  new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys')
)

export async function verifyTeamsRequest(authHeader: string): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false
  const token = authHeader.slice(7)

  try {
    // Try Bot Framework token first
    const { payload } = await jwtVerify(token, JWKS, {
      audience: TEAMS_BOT_APP_ID,
      issuer: 'https://api.botframework.com',
    })
    return !!payload
  } catch {
    try {
      // Try emulator / Azure AD v2 token
      const { payload } = await jwtVerify(token, EMULATOR_JWKS, {
        audience: TEAMS_BOT_APP_ID,
      })
      return !!payload
    } catch {
      return false
    }
  }
}

// ─── Bot token (outbound auth) ───
let cachedToken: { token: string; expiresAt: number } | null = null

export async function getBotToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token
  }

  const res = await fetch(
    'https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: TEAMS_BOT_APP_ID,
        client_secret: TEAMS_BOT_APP_PASSWORD,
        scope: 'https://api.botframework.com/.default',
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to get bot token: ${err}`)
  }

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.token
}

// ─── Send/update activities ───
export async function sendTeamsActivity(
  serviceUrl: string,
  conversationId: string,
  activity: Record<string, any>
): Promise<{ id: string }> {
  const token = await getBotToken()
  const url = `${serviceUrl.replace(/\/$/, '')}/v3/conversations/${conversationId}/activities`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(activity),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to send activity: ${res.status} ${err}`)
  }

  return res.json()
}

export async function updateTeamsActivity(
  serviceUrl: string,
  conversationId: string,
  activityId: string,
  activity: Record<string, any>
): Promise<void> {
  const token = await getBotToken()
  const url = `${serviceUrl.replace(/\/$/, '')}/v3/conversations/${conversationId}/activities/${activityId}`

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...activity, id: activityId }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed to update activity: ${res.status} ${err}`)
  }
}

// ─── Strip @mention tags ───
export function stripMention(text: string): string {
  // Teams wraps mentions in <at>BotName</at>
  return text.replace(/<at>[^<]*<\/at>/gi, '').trim()
}

// ─── Adaptive Card: Recap Form ───
export function buildRecapFormCard(sessionId: string): Record<string, any> {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'Image',
                      url: 'https://reattend.com/logo.svg',
                      size: 'Small',
                      width: '24px',
                      height: '24px',
                    },
                  ],
                  verticalContentAlignment: 'Center',
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: 'Meeting Recap',
                      weight: 'Bolder',
                      size: 'Large',
                      color: 'Accent',
                    },
                  ],
                  verticalContentAlignment: 'Center',
                },
              ],
            },
            {
              type: 'TextBlock',
              text: 'Share what happened in this meeting. Everyone can submit their own recap.',
              wrap: true,
              spacing: 'Small',
              color: 'Default',
              isSubtle: true,
            },
            {
              type: 'TextBlock',
              text: 'What was decided?',
              weight: 'Bolder',
              spacing: 'Large',
            },
            {
              type: 'Input.Text',
              id: 'decisions',
              placeholder: 'Key decisions made in this meeting...',
              isMultiline: true,
              maxLength: 2000,
            },
            {
              type: 'TextBlock',
              text: 'Action items',
              weight: 'Bolder',
              spacing: 'Medium',
            },
            {
              type: 'Input.Text',
              id: 'actionItems',
              placeholder: 'Who needs to do what by when...',
              isMultiline: true,
              maxLength: 2000,
            },
            {
              type: 'TextBlock',
              text: 'Additional notes',
              weight: 'Bolder',
              spacing: 'Medium',
            },
            {
              type: 'Input.Text',
              id: 'notes',
              placeholder: 'Anything else worth remembering...',
              isMultiline: true,
              maxLength: 2000,
            },
          ],
          actions: [
            {
              type: 'Action.Execute',
              title: 'Submit Recap',
              verb: 'submitRecap',
              data: { sessionId },
              style: 'positive',
            },
          ],
        },
      },
    ],
  }
}

// ─── Adaptive Card: Collecting status (shown after submission) ───
export function buildCollectingCard(
  sessionId: string,
  responseCount: number,
  respondents: string[]
): Record<string, any> {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'Image',
                      url: 'https://reattend.com/logo.svg',
                      size: 'Small',
                      width: '24px',
                      height: '24px',
                    },
                  ],
                  verticalContentAlignment: 'Center',
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: 'Meeting Recap',
                      weight: 'Bolder',
                      size: 'Large',
                      color: 'Accent',
                    },
                  ],
                  verticalContentAlignment: 'Center',
                },
              ],
            },
            {
              type: 'TextBlock',
              text: `✅ ${responseCount} response${responseCount !== 1 ? 's' : ''} collected`,
              weight: 'Bolder',
              color: 'Good',
              spacing: 'Medium',
            },
            {
              type: 'TextBlock',
              text: `Submitted by: ${respondents.join(', ')}`,
              wrap: true,
              isSubtle: true,
              spacing: 'Small',
            },
            {
              type: 'TextBlock',
              text: 'Share what happened in this meeting. Everyone can submit their own recap.',
              wrap: true,
              spacing: 'Small',
              isSubtle: true,
            },
            {
              type: 'TextBlock',
              text: 'What was decided?',
              weight: 'Bolder',
              spacing: 'Large',
            },
            {
              type: 'Input.Text',
              id: 'decisions',
              placeholder: 'Key decisions made in this meeting...',
              isMultiline: true,
              maxLength: 2000,
            },
            {
              type: 'TextBlock',
              text: 'Action items',
              weight: 'Bolder',
              spacing: 'Medium',
            },
            {
              type: 'Input.Text',
              id: 'actionItems',
              placeholder: 'Who needs to do what by when...',
              isMultiline: true,
              maxLength: 2000,
            },
            {
              type: 'TextBlock',
              text: 'Additional notes',
              weight: 'Bolder',
              spacing: 'Medium',
            },
            {
              type: 'Input.Text',
              id: 'notes',
              placeholder: 'Anything else worth remembering...',
              isMultiline: true,
              maxLength: 2000,
            },
          ],
          actions: [
            {
              type: 'Action.Execute',
              title: 'Submit Recap',
              verb: 'submitRecap',
              data: { sessionId },
              style: 'positive',
            },
          ],
        },
      },
    ],
  }
}

// ─── Adaptive Card: Summary ───
interface RecapResponse {
  userName: string | null
  decisions: string | null
  actionItems: string | null
  notes: string | null
}

export function buildSummaryCard(responses: RecapResponse[], triggeredByName?: string | null): Record<string, any> {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Compile all decisions, action items, notes
  const allDecisions = responses
    .filter((r) => r.decisions?.trim())
    .map((r) => `**${r.userName || 'Someone'}**: ${r.decisions}`)
  const allActions = responses
    .filter((r) => r.actionItems?.trim())
    .map((r) => `**${r.userName || 'Someone'}**: ${r.actionItems}`)
  const allNotes = responses
    .filter((r) => r.notes?.trim())
    .map((r) => `**${r.userName || 'Someone'}**: ${r.notes}`)

  const body: any[] = [
    {
      type: 'ColumnSet',
      columns: [
        {
          type: 'Column',
          width: 'auto',
          items: [
            {
              type: 'Image',
              url: 'https://reattend.com/logo.svg',
              size: 'Small',
              width: '24px',
              height: '24px',
            },
          ],
          verticalContentAlignment: 'Center',
        },
        {
          type: 'Column',
          width: 'stretch',
          items: [
            {
              type: 'TextBlock',
              text: '📋 Meeting Recap Summary',
              weight: 'Bolder',
              size: 'Large',
              color: 'Accent',
            },
          ],
          verticalContentAlignment: 'Center',
        },
      ],
    },
    {
      type: 'TextBlock',
      text: dateStr,
      isSubtle: true,
      spacing: 'Small',
    },
    {
      type: 'TextBlock',
      text: `${responses.length} team member${responses.length !== 1 ? 's' : ''} contributed${triggeredByName ? ` · Started by ${triggeredByName}` : ''}`,
      isSubtle: true,
      spacing: 'None',
    },
  ]

  if (allDecisions.length > 0) {
    body.push(
      {
        type: 'TextBlock',
        text: '🎯 Decisions',
        weight: 'Bolder',
        size: 'Medium',
        spacing: 'Large',
        color: 'Accent',
      },
      ...allDecisions.map((d) => ({
        type: 'TextBlock',
        text: d,
        wrap: true,
        spacing: 'Small',
      }))
    )
  }

  if (allActions.length > 0) {
    body.push(
      {
        type: 'TextBlock',
        text: '✅ Action Items',
        weight: 'Bolder',
        size: 'Medium',
        spacing: 'Large',
        color: 'Accent',
      },
      ...allActions.map((a) => ({
        type: 'TextBlock',
        text: a,
        wrap: true,
        spacing: 'Small',
      }))
    )
  }

  if (allNotes.length > 0) {
    body.push(
      {
        type: 'TextBlock',
        text: '📝 Notes',
        weight: 'Bolder',
        size: 'Medium',
        spacing: 'Large',
        color: 'Accent',
      },
      ...allNotes.map((n) => ({
        type: 'TextBlock',
        text: n,
        wrap: true,
        spacing: 'Small',
      }))
    )
  }

  // Reattend branding footer
  body.push(
    {
      type: 'ColumnSet',
      separator: true,
      spacing: 'Large',
      columns: [
        {
          type: 'Column',
          width: 'stretch',
          items: [
            {
              type: 'TextBlock',
              text: 'Powered by **Reattend** — Your team\'s shared memory',
              isSubtle: true,
              size: 'Small',
              spacing: 'None',
            },
            {
              type: 'TextBlock',
              text: 'Meeting recaps disappear in Teams. [Save them forever →](https://reattend.com?ref=teams-recap)',
              isSubtle: true,
              size: 'Small',
              spacing: 'None',
            },
          ],
        },
      ],
    }
  )

  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body,
        },
      },
    ],
  }
}

// ─── Welcome message ───
export function buildWelcomeCard(): Record<string, any> {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'Image',
                      url: 'https://reattend.com/logo.svg',
                      size: 'Small',
                      width: '32px',
                      height: '32px',
                    },
                  ],
                  verticalContentAlignment: 'Center',
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: 'Meeting Recap Bot',
                      weight: 'Bolder',
                      size: 'Large',
                      color: 'Accent',
                    },
                  ],
                  verticalContentAlignment: 'Center',
                },
              ],
            },
            {
              type: 'TextBlock',
              text: "Hi! I help your team capture meeting recaps — decisions, action items, and notes — all in one place.",
              wrap: true,
              spacing: 'Medium',
            },
            {
              type: 'TextBlock',
              text: '**How to use:**',
              spacing: 'Medium',
            },
            {
              type: 'TextBlock',
              text: '1. After a meeting, type **@Recap recap**\n2. I\'ll post a form for everyone to fill in\n3. Type **@Recap done** to compile the summary\n4. Everyone\'s input is organized into one clean recap',
              wrap: true,
              spacing: 'Small',
            },
            {
              type: 'TextBlock',
              text: '**Commands:**\n- `recap` — Start a new meeting recap\n- `done` — Compile and post the summary\n- `help` — Show this message',
              wrap: true,
              spacing: 'Medium',
            },
            {
              type: 'ColumnSet',
              separator: true,
              spacing: 'Large',
              columns: [
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: 'Free forever · No per-user pricing · Powered by [Reattend](https://reattend.com?ref=teams-recap)',
                      isSubtle: true,
                      size: 'Small',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  }
}

// ─── Help message ───
export function buildHelpCard(): Record<string, any> {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'TextBlock',
              text: '📋 Meeting Recap Bot — Help',
              weight: 'Bolder',
              size: 'Medium',
              color: 'Accent',
            },
            {
              type: 'FactSet',
              facts: [
                { title: '@Recap recap', value: 'Start a new meeting recap form' },
                { title: '@Recap done', value: 'Compile and post the final summary' },
                { title: '@Recap help', value: 'Show this help message' },
              ],
            },
            {
              type: 'TextBlock',
              text: 'After starting a recap, everyone in the channel can fill in the form with decisions, action items, and notes. When ready, use **done** to compile all responses into a single summary.',
              wrap: true,
              spacing: 'Medium',
              isSubtle: true,
            },
          ],
        },
      },
    ],
  }
}
