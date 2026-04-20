// Slack OAuth + API helpers (for Slack integration)

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET!
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || ''

function getRedirectUri() {
  const base = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
  return `${base}/api/integrations/slack/callback`
}

// User token scopes (reading messages)
const USER_SCOPES = [
  'channels:read',
  'channels:history',
  'users:read',
]

// Bot scopes (sending DMs, slash commands, shortcuts)
const BOT_SCOPES = [
  'chat:write',
  'im:write',
  'commands',
]

export function getSlackAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    user_scope: USER_SCOPES.join(','),
    scope: BOT_SCOPES.join(','),
    state,
  })
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`
}

// Verify Slack request signature (HMAC-SHA256)
export async function verifySlackSignature(req: Request, body: string): Promise<boolean> {
  const timestamp = req.headers.get('x-slack-request-timestamp')
  const signature = req.headers.get('x-slack-signature')
  if (!timestamp || !signature) return false

  // Reject requests older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

  const sigBasestring = `v0:${timestamp}:${body}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(SLACK_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(sigBasestring))
  const computed = 'v0=' + Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === signature
}

export async function exchangeSlackCodeForTokens(code: string): Promise<{
  ok: boolean
  access_token?: string       // bot token
  bot_user_id?: string
  authed_user: {
    access_token: string
    token_type: string
    scope: string
    id: string
    refresh_token?: string
    expires_in?: number
  }
  team: {
    id: string
    name: string
  }
}> {
  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      redirect_uri: getRedirectUri(),
    }),
  })
  const data = await res.json()
  if (!data.ok) {
    throw new Error(`Slack token exchange failed: ${data.error}`)
  }
  return data
}

export async function refreshSlackToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
    }),
  })
  const data = await res.json()
  if (!data.ok) {
    throw new Error(`Slack token refresh failed: ${data.error}`)
  }
  return data
}

export async function getValidSlackToken(
  refreshToken: string | null,
  currentToken: string | null,
  expiresAt: string | null,
): Promise<string> {
  // Slack user tokens are long-lived by default (no expiry)
  // If token rotation is enabled, they'll have an expires_in
  if (currentToken && (!expiresAt || new Date(expiresAt).getTime() > Date.now() + 5 * 60 * 1000)) {
    return currentToken
  }
  if (!refreshToken) {
    if (currentToken) return currentToken
    throw new Error('No valid Slack token available')
  }
  const result = await refreshSlackToken(refreshToken)
  return result.access_token
}

// --- Slack API types ---

export interface SlackConversation {
  id: string
  name: string
  is_channel: boolean
  is_private: boolean
  is_archived: boolean
  is_member: boolean
  num_members: number
  topic: { value: string }
  purpose: { value: string }
}

export interface SlackMessage {
  type: string
  subtype?: string
  user?: string
  bot_id?: string
  text: string
  ts: string
  thread_ts?: string
  edited?: { user: string; ts: string }
}

export interface SlackUser {
  id: string
  name: string
  real_name: string
  profile: {
    display_name: string
    real_name: string
    email?: string
  }
}

// --- Slack API calls ---

export async function listConversations(
  accessToken: string,
  limit: number = 30,
): Promise<SlackConversation[]> {
  const params = new URLSearchParams({
    types: 'public_channel',
    exclude_archived: 'true',
    limit: String(limit),
  })
  const res = await fetch(`https://slack.com/api/conversations.list?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!data.ok) {
    throw new Error(`Slack conversations.list failed: ${data.error}`)
  }
  // Only return channels the user is a member of
  return (data.channels || []).filter((c: SlackConversation) => c.is_member)
}

export async function getConversationHistory(
  accessToken: string,
  channelId: string,
  limit: number = 25,
  oldest?: string,
): Promise<SlackMessage[]> {
  const params = new URLSearchParams({
    channel: channelId,
    limit: String(limit),
  })
  if (oldest) {
    // Convert ISO date to Unix timestamp for Slack
    const unixTs = String(new Date(oldest).getTime() / 1000)
    params.set('oldest', unixTs)
  }
  const res = await fetch(`https://slack.com/api/conversations.history?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!data.ok) {
    throw new Error(`Slack conversations.history failed: ${data.error}`)
  }
  return data.messages || []
}

export async function getUserInfo(
  accessToken: string,
  userId: string,
): Promise<SlackUser> {
  const res = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  if (!data.ok) {
    throw new Error(`Slack users.info failed: ${data.error}`)
  }
  return data.user
}

// Post a message to a channel or DM channel
export async function postSlackMessage(
  botToken: string,
  channel: string,
  text: string,
  blocks?: object[],
): Promise<void> {
  const body: Record<string, unknown> = { channel, text }
  if (blocks) body.blocks = blocks
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(`Slack chat.postMessage failed: ${data.error}`)
}

// Open a DM with a user then post a message
export async function openDmAndSend(
  botToken: string,
  slackUserId: string,
  text: string,
  blocks?: object[],
): Promise<void> {
  const openRes = await fetch('https://slack.com/api/conversations.open', {
    method: 'POST',
    headers: { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ users: slackUserId }),
  })
  const openData = await openRes.json()
  if (!openData.ok) throw new Error(`Slack conversations.open failed: ${openData.error}`)
  await postSlackMessage(botToken, openData.channel.id, text, blocks)
}

// Resolve user ID to display name, with caching
export function createUserResolver(accessToken: string) {
  const cache = new Map<string, string>()
  return async (userId: string): Promise<string> => {
    if (cache.has(userId)) return cache.get(userId)!
    try {
      const user = await getUserInfo(accessToken, userId)
      const name = user.profile.display_name || user.real_name || user.name
      cache.set(userId, name)
      return name
    } catch {
      cache.set(userId, 'Unknown')
      return 'Unknown'
    }
  }
}
