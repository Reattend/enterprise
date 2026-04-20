// Google OAuth + Gmail + Calendar API helpers

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

function getBaseUrl() {
  return process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
}

function getGmailCallbackUri() {
  return `${getBaseUrl()}/api/integrations/gmail/callback`
}

function getCalendarCallbackUri() {
  return `${getBaseUrl()}/api/integrations/calendar/callback`
}

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
]

// Build Google OAuth URL. Defaults to Gmail scopes + redirect URI for backwards compat.
export function getGoogleAuthUrl(state: string, options?: { scopes?: string[]; redirectUri?: string }): string {
  const scopes = options?.scopes || GMAIL_SCOPES
  const redirectUri = options?.redirectUri || getGmailCallbackUri()
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

// Exchange authorization code for tokens.
// redirectUri must match what was used to generate the auth URL.
export async function exchangeCodeForTokens(code: string, redirectUri?: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}> {
  const uri = redirectUri || getGmailCallbackUri()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: uri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }
  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token refresh failed: ${err}`)
  }
  return res.json()
}

export async function getValidAccessToken(refreshToken: string, currentToken: string | null, expiresAt: string | null): Promise<string> {
  if (currentToken && expiresAt && new Date(expiresAt).getTime() > Date.now() + 5 * 60 * 1000) {
    return currentToken
  }
  const result = await refreshAccessToken(refreshToken)
  return result.access_token
}

// ─── Gmail API ───────────────────────────────────────────

interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body?: { data?: string }
    parts?: Array<{
      mimeType: string
      body?: { data?: string }
      parts?: Array<{ mimeType: string; body?: { data?: string } }>
    }>
  }
  internalDate: string
}

interface GmailListResponse {
  messages?: Array<{ id: string; threadId: string }>
  nextPageToken?: string
  resultSizeEstimate?: number
}

export async function listMessages(accessToken: string, query: string, maxResults: number = 500, pageToken?: string): Promise<GmailListResponse> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) })
  if (pageToken) params.set('pageToken', pageToken)
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail list failed: ${err}`)
  }
  return res.json()
}

export async function listAllMessages(accessToken: string, query: string): Promise<Array<{ id: string; threadId: string }>> {
  const all: Array<{ id: string; threadId: string }> = []
  let pageToken: string | undefined
  do {
    const page = await listMessages(accessToken, query, 500, pageToken)
    if (page.messages) all.push(...page.messages)
    pageToken = page.nextPageToken
  } while (pageToken)
  return all
}

export async function getMessage(accessToken: string, messageId: string): Promise<GmailMessage> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail get message failed: ${err}`)
  }
  return res.json()
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(base64, 'base64').toString('utf-8')
}

export function extractEmailBody(message: GmailMessage): string {
  if (message.payload.body?.data) {
    return decodeBase64Url(message.payload.body.data)
  }
  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data)
      }
      if (part.parts) {
        for (const sub of part.parts) {
          if (sub.mimeType === 'text/plain' && sub.body?.data) {
            return decodeBase64Url(sub.body.data)
          }
        }
      }
    }
    for (const part of message.payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = decodeBase64Url(part.body.data)
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      }
    }
  }
  return message.snippet || ''
}

export function extractHeader(message: GmailMessage, name: string): string {
  return message.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

export function extractSenderDomain(message: GmailMessage): string {
  const from = extractHeader(message, 'From')
  const match = from.match(/@([a-zA-Z0-9.-]+)/)
  return match ? match[1].toLowerCase() : ''
}

// ─── Gmail Threads API ────────────────────────────────────

interface GmailThread {
  id: string
  messages: GmailMessage[]
}

interface GmailThreadListResponse {
  threads?: Array<{ id: string; snippet: string }>
  nextPageToken?: string
}

export async function listThreads(accessToken: string, query: string, maxResults: number = 500, pageToken?: string): Promise<GmailThreadListResponse> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) })
  if (pageToken) params.set('pageToken', pageToken)
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail threads list failed: ${err}`)
  }
  return res.json()
}

export async function listAllThreads(accessToken: string, query: string): Promise<Array<{ id: string }>> {
  const all: Array<{ id: string }> = []
  let pageToken: string | undefined
  do {
    const page = await listThreads(accessToken, query, 500, pageToken)
    if (page.threads) all.push(...page.threads)
    pageToken = page.nextPageToken
  } while (pageToken)
  return all
}

export async function getThread(accessToken: string, threadId: string): Promise<GmailThread> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail get thread failed: ${err}`)
  }
  return res.json()
}

export function extractThreadContent(
  thread: GmailThread,
  domainWhitelist: string[],
): { subject: string; from: string; date: string; content: string; senderDomain: string } | null {
  // Find first message from a whitelisted domain
  const firstRelevant = thread.messages.find(m => domainWhitelist.includes(extractSenderDomain(m)))
  if (!firstRelevant) return null

  const subject = extractHeader(firstRelevant, 'Subject') || '(No Subject)'
  const from = extractHeader(firstRelevant, 'From')
  const date = extractHeader(firstRelevant, 'Date')
  const senderDomain = extractSenderDomain(firstRelevant)

  // Combine up to 8 messages, 1200 chars each, oldest first
  const MAX_CHARS = 8000
  const parts: string[] = []
  let total = 0

  for (const msg of thread.messages.slice(0, 8)) {
    if (total >= MAX_CHARS) break
    const msgFrom = extractHeader(msg, 'From')
    const msgDate = extractHeader(msg, 'Date')
    const body = extractEmailBody(msg)
    const remaining = MAX_CHARS - total
    const snippet = body.slice(0, Math.min(1200, remaining))
    const part = `--- From: ${msgFrom} | ${msgDate} ---\n${snippet}`
    parts.push(part)
    total += part.length
  }

  const content = `From: ${from}\nDate: ${date}\nSubject: ${subject}\n\n${parts.join('\n\n')}`
  return { subject, from, date, content, senderDomain }
}

// ─── Google Calendar API ──────────────────────────────────

export interface CalendarEvent {
  id: string
  summary?: string
  description?: string
  location?: string
  status: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string; self?: boolean }>
  organizer?: { email: string; displayName?: string; self?: boolean }
  htmlLink?: string
  conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> }
  recurringEventId?: string
  created?: string
  updated?: string
}

export interface CalendarListEntry {
  id: string
  summary: string
  primary?: boolean
  accessRole: string
  backgroundColor?: string
}

export async function listCalendars(accessToken: string): Promise<CalendarListEntry[]> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Calendar list failed: ${err}`)
  }
  const data = await res.json()
  return data.items || []
}

export async function listCalendarEvents(
  accessToken: string,
  calendarId: string = 'primary',
  timeMin: string,
  timeMax: string,
  maxResults: number = 100,
  pageToken?: string,
): Promise<{ items: CalendarEvent[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
  })
  if (pageToken) params.set('pageToken', pageToken)

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Calendar events list failed: ${err}`)
  }
  const data = await res.json()
  return { items: data.items || [], nextPageToken: data.nextPageToken }
}

export async function listAllCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<CalendarEvent[]> {
  const all: CalendarEvent[] = []
  let pageToken: string | undefined
  do {
    const page = await listCalendarEvents(accessToken, calendarId, timeMin, timeMax, 250, pageToken)
    all.push(...page.items)
    pageToken = page.nextPageToken
  } while (pageToken)
  return all
}

// Helpers
export function getCalendarCallbackUrl() {
  return getCalendarCallbackUri()
}

export function getGmailCallbackUrl() {
  return getGmailCallbackUri()
}
