// Microsoft OAuth + Graph API helpers (for MS Teams integration)

const MS_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!
const MS_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!

function getRedirectUri() {
  const base = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
  return `${base}/api/integrations/teams/callback`
}

const SCOPES = [
  'User.Read',
  'Chat.Read',
  'offline_access',
]

export function getMicrosoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    response_mode: 'query',
    prompt: 'consent',
    state,
  })
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`
}

export async function exchangeMsCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}> {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MS token exchange failed: ${err}`)
  }
  return res.json()
}

export async function refreshMsAccessToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: MS_CLIENT_ID,
      client_secret: MS_CLIENT_SECRET,
      grant_type: 'refresh_token',
      scope: SCOPES.join(' '),
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MS token refresh failed: ${err}`)
  }
  return res.json()
}

export async function getValidMsAccessToken(
  refreshToken: string,
  currentToken: string | null,
  expiresAt: string | null,
): Promise<string> {
  if (currentToken && expiresAt && new Date(expiresAt).getTime() > Date.now() + 5 * 60 * 1000) {
    return currentToken
  }
  const result = await refreshMsAccessToken(refreshToken)
  return result.access_token
}

// Graph API types
interface GraphChat {
  id: string
  topic: string | null
  chatType: 'oneOnOne' | 'group' | 'meeting'
  lastUpdatedDateTime: string
  lastMessagePreview?: {
    body: { content: string }
    from?: { user?: { displayName: string } }
    createdDateTime: string
  }
}

interface GraphChatMessage {
  id: string
  messageType: string
  createdDateTime: string
  from?: {
    user?: {
      displayName: string
      id: string
    }
  }
  body: {
    contentType: string
    content: string
  }
  chatId: string
}

interface GraphListResponse<T> {
  value: T[]
  '@odata.nextLink'?: string
}

export async function listChats(accessToken: string, top: number = 50): Promise<GraphChat[]> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/chats?$top=${top}&$orderby=lastUpdatedDateTime desc&$expand=lastMessagePreview`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph list chats failed: ${err}`)
  }
  const data: GraphListResponse<GraphChat> = await res.json()
  return data.value
}

export async function getChatMessages(
  accessToken: string,
  chatId: string,
  top: number = 25,
  since?: string,
): Promise<GraphChatMessage[]> {
  let url = `https://graph.microsoft.com/v1.0/me/chats/${chatId}/messages?$top=${top}&$orderby=createdDateTime desc`
  if (since) {
    url += `&$filter=createdDateTime gt ${since}`
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph get chat messages failed: ${err}`)
  }
  const data: GraphListResponse<GraphChatMessage> = await res.json()
  return data.value
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
