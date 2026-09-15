// Start My Day + First look - the "value on day one" layer.
//
//   getTodayBriefing()   The morning briefing: what arrived in the last 24h,
//                        what is due soon, today's meetings, one memory from
//                        a few weeks back, and a short AI-written focus that
//                        may only mention those items. Cached once per user,
//                        scope and local day in daily_briefings, so the home
//                        card and the 7am email share one AI call.
//   buildFirstLook()     "Here's what Reattend found": decisions, dated
//                        tasks, the people who come up most, one link worth a
//                        look, and three questions to ask. Shown right after
//                        someone imports or brain-dumps for the first time.
//
// Scope is never mixed: Personal reads the user's personal workspace; an
// org reads the org workspaces the user can access, record-filtered by
// rbac-records like every other read path.

import crypto from 'crypto'
import { and, desc, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm'
import { db, schema } from '@/lib/db'
import {
  buildAccessContext, filterToAccessibleRecords, filterToAccessibleWorkspaces, pendingPoliciesForUser,
} from '@/lib/enterprise'
import { resolveLLMForOrg, resolveLLMForRequest } from '@/lib/ai/byok'

const DAY_MS = 86_400_000

// ─── Time ──────────────────────────────────────────────────────────────

export function safeTimezone(tz: string | null | undefined): string {
  if (!tz) return 'UTC'
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz } catch { return 'UTC' }
}

/** YYYY-MM-DD for `now` in the given zone. */
export function localDay(tz: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Hour of day (0-23) for `now` in the given zone. */
export function localHour(tz: string, now = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now))
}

// ─── Scope ─────────────────────────────────────────────────────────────

export async function personalWorkspaceOf(userId: string): Promise<string | null> {
  const rows = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .innerJoin(schema.workspaceMembers, and(
      eq(schema.workspaceMembers.workspaceId, schema.workspaces.id),
      eq(schema.workspaceMembers.userId, userId),
    ))
    .where(and(eq(schema.workspaces.type, 'personal'), eq(schema.workspaces.createdBy, userId)))
    .limit(1)
  return rows[0]?.id ?? null
}

/** Workspaces whose records this user sees in this scope. */
export async function scopeWorkspaces(userId: string, orgId: string | null, personalWsId?: string | null): Promise<string[]> {
  if (!orgId) {
    const ws = personalWsId ?? (await personalWorkspaceOf(userId))
    return ws ? [ws] : []
  }
  const links = await db
    .select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
    .from(schema.workspaceOrgLinks)
    .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
  return filterToAccessibleWorkspaces(userId, Array.from(new Set(links.map((l) => l.workspaceId))))
}

/** Is the user an active member of the org? Anything else reads as Personal. */
export async function verifiedOrg(userId: string, orgId: string | null | undefined): Promise<string | null> {
  if (!orgId) return null
  const m = await db
    .select({ id: schema.organizationMembers.id })
    .from(schema.organizationMembers)
    .where(and(
      eq(schema.organizationMembers.organizationId, orgId),
      eq(schema.organizationMembers.userId, userId),
      eq(schema.organizationMembers.status, 'active'),
    ))
    .limit(1)
  return m[0] ? orgId : null
}

async function allowedOnly<T extends { id: string }>(userId: string, orgId: string | null, rows: T[]): Promise<T[]> {
  if (!orgId || rows.length === 0) return rows
  const allowed = await filterToAccessibleRecords(await buildAccessContext(userId), rows.map((r) => r.id))
  return rows.filter((r) => allowed.has(r.id))
}

async function llmFor(userId: string, orgId: string | null) {
  return orgId ? resolveLLMForOrg(orgId, 'simple') : resolveLLMForRequest({ userId, intent: 'simple' })
}

// ─── Briefing ──────────────────────────────────────────────────────────

export interface BriefingItem { id: string; title: string; type: string; summary?: string | null; at?: string }
export interface BriefingMeeting { id: string; title: string; startAt: string; attendees: string[] }
export interface BriefingDue { id: string; title: string; when: string; objectId: string | null }

export interface Briefing {
  day: string
  scope: string
  since: string
  generatedAt: string
  hasSomething: boolean
  focus: string | null
  counts: { newMemories: number; dueSoon: number; meetings: number; pendingAcks: number; totalMemories: number }
  newMemories: BriefingItem[]
  dueSoon: BriefingDue[]
  meetings: BriefingMeeting[]
  resurfaced: (BriefingItem & { ageDays: number }) | null
}

async function buildBriefing(userId: string, orgId: string | null, tz: string, day: string, noAi = false): Promise<Briefing> {
  const now = new Date()
  const since = new Date(now.getTime() - DAY_MS).toISOString()
  const ws = await scopeWorkspaces(userId, orgId)

  const recordCols = {
    id: schema.records.id, title: schema.records.title, type: schema.records.type,
    summary: schema.records.summary, createdAt: schema.records.createdAt,
  }

  const [recentRaw, totalRow] = ws.length
    ? await Promise.all([
      db.select(recordCols).from(schema.records)
        .where(and(inArray(schema.records.workspaceId, ws), gte(schema.records.createdAt, since)))
        .orderBy(desc(schema.records.createdAt)).limit(40),
      db.select({ n: sql<number>`count(*)` }).from(schema.records).where(inArray(schema.records.workspaceId, ws)),
    ])
    : [[], [{ n: 0 }]]
  const recent = await allowedOnly(userId, orgId, recentRaw)

  // Reminders the AI scheduled from dates in what was saved ("send the deck
  // Friday"), due from 12h ago to 48h ahead.
  const dueRows = await db.select({
    id: schema.inboxNotifications.id, title: schema.inboxNotifications.title,
    when: schema.inboxNotifications.snoozedUntil, objectId: schema.inboxNotifications.objectId,
  }).from(schema.inboxNotifications).where(and(
    eq(schema.inboxNotifications.userId, userId),
    eq(schema.inboxNotifications.type, 'reminder'),
    ne(schema.inboxNotifications.status, 'done'),
    gte(schema.inboxNotifications.snoozedUntil, new Date(now.getTime() - DAY_MS / 2).toISOString()),
    lte(schema.inboxNotifications.snoozedUntil, new Date(now.getTime() + 2 * DAY_MS).toISOString()),
    ...(ws.length ? [inArray(schema.inboxNotifications.workspaceId, ws)] : []),
  )).orderBy(schema.inboxNotifications.snoozedUntil).limit(8)
  const dueSoon: BriefingDue[] = dueRows.filter((d) => d.when).map((d) => ({ id: d.id, title: d.title, when: d.when as string, objectId: d.objectId }))

  // Today's meetings (the rest of the local day) from connected calendars.
  const meetingsRaw = ws.length
    ? await db.select({
      id: schema.calendarEvents.id, title: schema.calendarEvents.title,
      startAt: schema.calendarEvents.startAt, attendeeEmails: schema.calendarEvents.attendeeEmails,
    }).from(schema.calendarEvents).where(and(
      inArray(schema.calendarEvents.workspaceId, ws),
      gte(schema.calendarEvents.startAt, new Date(Math.max(now.getTime() - 60 * 60_000, localMidnightUtc(day, tz))).toISOString()),
      lte(schema.calendarEvents.startAt, new Date(localMidnightUtc(day, tz) + DAY_MS).toISOString()),
    )).orderBy(schema.calendarEvents.startAt).limit(8)
    : []
  const meetings: BriefingMeeting[] = meetingsRaw.map((m) => ({
    id: m.id, title: m.title, startAt: m.startAt,
    attendees: parseList(m.attendeeEmails).slice(0, 6),
  }))

  // One memory from 2-12 weeks ago, chosen by the day so it changes daily.
  let resurfaced: Briefing['resurfaced'] = null
  if (ws.length) {
    const old = await db.select(recordCols).from(schema.records).where(and(
      inArray(schema.records.workspaceId, ws),
      inArray(schema.records.type, ['decision', 'insight', 'idea', 'meeting']),
      lte(schema.records.createdAt, new Date(now.getTime() - 14 * DAY_MS).toISOString()),
      gte(schema.records.createdAt, new Date(now.getTime() - 84 * DAY_MS).toISOString()),
    )).orderBy(desc(schema.records.createdAt)).limit(30)
    const pool = await allowedOnly(userId, orgId, old)
    if (pool.length) {
      const pick = pool[hashInt(`${userId}:${day}`) % pool.length]
      resurfaced = { ...pick, at: pick.createdAt, ageDays: Math.round((now.getTime() - new Date(pick.createdAt).getTime()) / DAY_MS) }
    }
  }

  const pendingAcks = orgId ? (await pendingPoliciesForUser({ userId, organizationId: orgId })).length : 0
  const newMemories: BriefingItem[] = recent.slice(0, 6).map((r) => ({ id: r.id, title: r.title, type: r.type, summary: r.summary, at: r.createdAt }))
  const hasSomething = recent.length + dueSoon.length + meetings.length + pendingAcks > 0

  let focus: string | null = null
  if (hasSomething && !noAi) {
    try {
      const [user] = await db.select({ name: schema.users.name, email: schema.users.email }).from(schema.users).where(eq(schema.users.id, userId)).limit(1)
      // Accounts default their name to the email's local part ("wow-1789…").
      // Only greet by name when it looks like a real one.
      const local = (user?.email || '').split('@')[0]
      const rawName = (user?.name || '').trim()
      const first = rawName && rawName !== local && !/\d/.test(rawName) ? rawName.split(/\s/)[0] : ''
      const lines = [
        `NEW MEMORIES (${recent.length}):`,
        ...(newMemories.length ? newMemories.map((m, i) => `[m${i + 1}] ${m.type}: ${m.title}${m.summary ? ` - ${m.summary.slice(0, 140)}` : ''}`) : ['(none)']),
        `DUE SOON (${dueSoon.length}):`,
        ...(dueSoon.length ? dueSoon.map((d, i) => `[d${i + 1}] ${d.title} (due ${new Date(d.when).toLocaleString('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: '2-digit' })})`) : ['(none)']),
        `MEETINGS TODAY (${meetings.length}):`,
        ...(meetings.length ? meetings.map((m, i) => `[c${i + 1}] ${m.title} at ${new Date(m.startAt).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' })}${m.attendees.length ? ` with ${m.attendees.join(', ')}` : ''}`) : ['(none)']),
        ...(pendingAcks ? [`POLICIES WAITING FOR THEIR ACKNOWLEDGEMENT: ${pendingAcks}`] : []),
      ]
      const prompt = `Write a short briefing (at most 3 sentences, under 70 words)${first ? ` for ${first}` : ''}.

${lines.join('\n')}

Rules:
- ${first ? `Start with "${first}, ".` : 'No greeting. Start with the most useful item.'}
- Mention only the items listed above. Never invent people, dates, numbers or facts.
- Say nothing about what is absent (no "no meetings today", no "nothing due").
- Lead with what needs action soonest (something due, then a meeting), then the most important new memory.
- If a meeting clearly relates to a listed memory, say so in a few words.
- Plain prose. No bullets, no headers, no emojis, no em dashes.

Briefing:`
      const llm = await llmFor(userId, orgId)
      focus = firstSentences((await llm.generateText(prompt, 200)).trim().replace(/—/g, ','), 3) || null
    } catch { /* no AI configured or provider error: the lists still stand */ }
  }

  return {
    day, scope: orgId ?? 'personal', since, generatedAt: now.toISOString(), hasSomething, focus,
    counts: { newMemories: recent.length, dueSoon: dueSoon.length, meetings: meetings.length, pendingAcks, totalMemories: Number(totalRow[0]?.n ?? 0) },
    newMemories, dueSoon, meetings, resurfaced,
  }
}

/** Today's briefing for (user, scope), built once per local day. */
// noAi: sandbox sessions never reach a real model (see src/lib/sandbox).
export async function getTodayBriefing(userId: string, orgId: string | null, tzRaw: string | null, opts: { noAi?: boolean } = {}): Promise<Briefing> {
  const tz = safeTimezone(tzRaw)
  const day = localDay(tz)
  const scope = orgId ?? 'personal'
  const cached = await db.select().from(schema.dailyBriefings).where(and(
    eq(schema.dailyBriefings.userId, userId), eq(schema.dailyBriefings.scope, scope),
    eq(schema.dailyBriefings.day, day), eq(schema.dailyBriefings.kind, 'briefing'),
  )).limit(1)
  if (cached[0]) {
    const b = JSON.parse(cached[0].payload) as Briefing
    // A briefing built before anything arrived today is worth one rebuild
    // once there is something - otherwise day one would stay empty.
    const staleEmpty = !b.hasSomething && Date.now() - new Date(b.generatedAt).getTime() > 30 * 60_000
    if (!staleEmpty) return b
    const fresh = await buildBriefing(userId, orgId, tz, day, opts.noAi)
    await db.update(schema.dailyBriefings).set({ payload: JSON.stringify(fresh) }).where(eq(schema.dailyBriefings.id, cached[0].id))
    return fresh
  }
  const b = await buildBriefing(userId, orgId, tz, day, opts.noAi)
  await db.insert(schema.dailyBriefings).values({ userId, scope, day, kind: 'briefing', payload: JSON.stringify(b) })
    .onConflictDoNothing()
  return b
}

export async function markBriefingEmailed(userId: string, scope: string, day: string) {
  await db.update(schema.dailyBriefings).set({ emailedAt: new Date().toISOString() }).where(and(
    eq(schema.dailyBriefings.userId, userId), eq(schema.dailyBriefings.scope, scope),
    eq(schema.dailyBriefings.day, day), eq(schema.dailyBriefings.kind, 'briefing'),
  ))
}

export async function wasBriefingEmailed(userId: string, scope: string, day: string): Promise<boolean> {
  const r = await db.select({ e: schema.dailyBriefings.emailedAt }).from(schema.dailyBriefings).where(and(
    eq(schema.dailyBriefings.userId, userId), eq(schema.dailyBriefings.scope, scope),
    eq(schema.dailyBriefings.day, day), eq(schema.dailyBriefings.kind, 'briefing'),
  )).limit(1)
  return !!r[0]?.e
}

// ─── First look ────────────────────────────────────────────────────────

export interface FirstLook {
  counts: { memories: number; decisions: number; dated: number; tasks: number; people: number; filing: number }
  decisions: BriefingItem[]
  dated: BriefingDue[]
  tasks: BriefingItem[]
  people: Array<{ name: string; count: number }>
  connection: { kind: string; from: { id: string; title: string }; to: { id: string; title: string } } | null
  questions: string[]
  aiReady: boolean
}

/** Items not finished yet: raw captures awaiting triage plus ingest /
 *  triage / link jobs still queued or running (people and links are
 *  attached by those jobs, after the record itself exists). */
async function filingCount(ws: string[]): Promise<number> {
  if (!ws.length) return 0
  const [[{ n: raw }], [{ n: jobs }]] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(schema.rawItems).where(and(inArray(schema.rawItems.workspaceId, ws), eq(schema.rawItems.status, 'new'))),
    db.select({ n: sql<number>`count(*)` }).from(schema.jobQueue).where(and(
      inArray(schema.jobQueue.workspaceId, ws),
      inArray(schema.jobQueue.type, ['triage', 'ingest', 'link']),
      inArray(schema.jobQueue.status, ['pending', 'running']),
    )),
  ])
  return Number(raw) + Number(jobs)
}

/** Just the counts - cheap enough to poll while an import runs. */
export async function scopeCounts(userId: string, orgId: string | null, personalWsId: string | null): Promise<{ memories: number; filing: number }> {
  const ws = await scopeWorkspaces(userId, orgId, personalWsId)
  if (!ws.length) return { memories: 0, filing: 0 }
  const [[{ n: memories }], filing] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(schema.records).where(inArray(schema.records.workspaceId, ws)),
    filingCount(ws),
  ])
  return { memories: Number(memories), filing }
}

export async function buildFirstLook(userId: string, orgId: string | null, personalWsId: string | null, opts: { noAi?: boolean } = {}): Promise<FirstLook> {
  const ws = await scopeWorkspaces(userId, orgId, personalWsId)
  const empty: FirstLook = { counts: { memories: 0, decisions: 0, dated: 0, tasks: 0, people: 0, filing: 0 }, decisions: [], dated: [], tasks: [], people: [], connection: null, questions: [], aiReady: false }
  if (!ws.length) return empty

  const cols = { id: schema.records.id, title: schema.records.title, type: schema.records.type, summary: schema.records.summary, createdAt: schema.records.createdAt }
  const [recentRaw, [{ n: memCount }], filing] = await Promise.all([
    db.select(cols).from(schema.records).where(inArray(schema.records.workspaceId, ws)).orderBy(desc(schema.records.createdAt)).limit(300),
    db.select({ n: sql<number>`count(*)` }).from(schema.records).where(inArray(schema.records.workspaceId, ws)),
    filingCount(ws),
  ])
  const recent = await allowedOnly(userId, orgId, recentRaw)
  const ids = recent.map((r) => r.id)
  const decisions = recent.filter((r) => r.type === 'decision')
  const tasks = recent.filter((r) => r.type === 'tasklike')

  const dated = (await db.select({
    id: schema.inboxNotifications.id, title: schema.inboxNotifications.title,
    when: schema.inboxNotifications.snoozedUntil, objectId: schema.inboxNotifications.objectId,
  }).from(schema.inboxNotifications).where(and(
    eq(schema.inboxNotifications.userId, userId),
    eq(schema.inboxNotifications.type, 'reminder'),
    ne(schema.inboxNotifications.status, 'done'),
    gte(schema.inboxNotifications.snoozedUntil, new Date().toISOString()),
    inArray(schema.inboxNotifications.workspaceId, ws),
  )).orderBy(schema.inboxNotifications.snoozedUntil).limit(6)).filter((d) => d.when).map((d) => ({ id: d.id, title: d.title, when: d.when as string, objectId: d.objectId }))

  let people: FirstLook['people'] = []
  let connection: FirstLook['connection'] = null
  if (ids.length) {
    const pr = await db.select({ name: schema.entities.name, n: sql<number>`count(distinct ${schema.recordEntities.recordId})` })
      .from(schema.recordEntities)
      .innerJoin(schema.entities, eq(schema.entities.id, schema.recordEntities.entityId))
      .where(and(inArray(schema.recordEntities.recordId, ids), eq(schema.entities.kind, 'person')))
      .groupBy(schema.entities.normalized)
      .orderBy(desc(sql`count(distinct ${schema.recordEntities.recordId})`))
      .limit(8)
    people = mergePeople(pr.map((p) => ({ name: p.name, count: Number(p.n) }))).slice(0, 8)

    const links = await db.select({ kind: schema.recordLinks.kind, from: schema.recordLinks.fromRecordId, to: schema.recordLinks.toRecordId, w: schema.recordLinks.weight })
      .from(schema.recordLinks)
      .where(and(inArray(schema.recordLinks.fromRecordId, ids), inArray(schema.recordLinks.toRecordId, ids), ne(schema.recordLinks.kind, 'temporal')))
      .limit(200)
    const rank = (k: string) => (k === 'contradicts' ? 0 : k === 'supports' || k === 'depends_on' || k === 'causes' || k === 'leads_to' ? 1 : 2)
    const best = links.sort((a, b) => rank(a.kind) - rank(b.kind) || (b.w ?? 0) - (a.w ?? 0))[0]
    if (best) {
      const byId = new Map(recent.map((r) => [r.id, r]))
      const f = byId.get(best.from), t = byId.get(best.to)
      if (f && t) connection = { kind: best.kind, from: { id: f.id, title: f.title }, to: { id: t.id, title: t.title } }
    }
  }

  const { questions, aiReady } = await suggestedQuestions(userId, orgId, recent, people.map((p) => p.name), !!opts.noAi)

  return {
    counts: { memories: Number(memCount), decisions: decisions.length, dated: dated.length, tasks: tasks.length, people: people.length, filing: Number(filing) },
    decisions: decisions.slice(0, 5).map((r) => ({ id: r.id, title: r.title, type: r.type, summary: r.summary, at: r.createdAt })),
    dated,
    tasks: tasks.slice(0, 5).map((r) => ({ id: r.id, title: r.title, type: r.type, at: r.createdAt })),
    people,
    connection,
    questions,
    aiReady,
  }
}

// Three questions worth asking, written from their own memories. Cached per
// day once there is enough to go on; plain fallbacks otherwise.
async function suggestedQuestions(
  userId: string, orgId: string | null,
  recent: Array<{ title: string; type: string }>, people: string[], noAi: boolean,
): Promise<{ questions: string[]; aiReady: boolean }> {
  const fallback = [
    'What have I decided recently?',
    'What do I need to follow up on this week?',
    people[0] ? `What has ${people[0]} been involved in?` : 'What are the main topics in my memory?',
  ]
  if (noAi) return { questions: fallback, aiReady: true }
  let llm
  try { llm = await llmFor(userId, orgId) } catch { return { questions: fallback, aiReady: false } }
  if (recent.length < 3) return { questions: fallback, aiReady: true }

  const scope = orgId ?? 'personal'
  const day = localDay('UTC')
  const cached = await db.select().from(schema.dailyBriefings).where(and(
    eq(schema.dailyBriefings.userId, userId), eq(schema.dailyBriefings.scope, scope),
    eq(schema.dailyBriefings.day, day), eq(schema.dailyBriefings.kind, 'questions'),
  )).limit(1)
  if (cached[0]) {
    const c = JSON.parse(cached[0].payload) as { questions: string[]; basedOn: number }
    // Rebuild once the memory has grown a lot since (e.g. an import landed).
    if (recent.length < c.basedOn * 2) return { questions: c.questions, aiReady: true }
  }

  try {
    const titles = recent.slice(0, 25).map((r) => `- ${r.type}: ${r.title}`).join('\n')
    const out = await llm.generateText(`Here are titles of memories someone saved:
${titles}

Write 3 short questions (max 12 words each) this person would find useful to ask about their own memories. Each must be answerable from the titles above. Use plain words, no quotes, no numbering, one per line.`, 160)
    const qs = out.split('\n').map((l) => l.replace(/^[\s\-*\d.)]+/, '').replace(/^["']|["']$/g, '').trim()).filter((l) => l.length > 8 && l.length < 120).slice(0, 3)
    if (qs.length < 2) return { questions: fallback, aiReady: true }
    const payload = JSON.stringify({ questions: qs, basedOn: recent.length })
    if (cached[0]) await db.update(schema.dailyBriefings).set({ payload }).where(eq(schema.dailyBriefings.id, cached[0].id))
    else await db.insert(schema.dailyBriefings).values({ userId, scope, day, kind: 'questions', payload }).onConflictDoNothing()
    return { questions: qs, aiReady: true }
  } catch {
    return { questions: fallback, aiReady: true }
  }
}

// ─── Unsubscribe ───────────────────────────────────────────────────────

export function briefingUnsubscribeToken(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'reattend'
  return crypto.createHmac('sha256', secret).update(`briefing-unsub:${userId}`).digest('hex').slice(0, 32)
}

// ─── helpers ───────────────────────────────────────────────────────────

/** At most n sentences - models overrun "2-3 sentences" often enough. */
function firstSentences(text: string, n: number): string {
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g)
  if (!parts || parts.length <= n) return text
  return parts.slice(0, n).join('').trim()
}

/** "Priya" (3) and "Priya Nair" (1) are one person: fold a lone first name
 *  into the single full name that starts with it. */
function mergePeople(list: Array<{ name: string; count: number }>): Array<{ name: string; count: number }> {
  const out = list.map((p) => ({ ...p }))
  for (const single of out.filter((p) => !p.name.includes(' '))) {
    const full = out.filter((p) => p !== single && p.name.includes(' ') && p.name.split(' ')[0].toLowerCase() === single.name.toLowerCase())
    if (full.length === 1) { full[0].count += single.count; single.count = -1 }
  }
  return out.filter((p) => p.count > 0).sort((a, b) => b.count - a.count)
}

function parseList(raw: string | null): string[] {
  if (!raw) return []
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v.map(String) : [] } catch { return raw.split(',').map((s) => s.trim()).filter(Boolean) }
}

function hashInt(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** Minutes the zone is ahead of UTC at `at` (e.g. +330 for India). */
function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - at.getTime()) / 60_000)
}

/** Epoch ms of local midnight for `day` (YYYY-MM-DD) in the zone. */
function localMidnightUtc(day: string, tz: string): number {
  const guess = Date.parse(`${day}T00:00:00Z`)
  return guess - tzOffsetMinutes(tz, new Date(guess)) * 60_000
}
