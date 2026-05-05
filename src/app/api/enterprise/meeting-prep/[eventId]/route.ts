import { NextRequest, NextResponse } from 'next/server'
import { db, schema, searchFTS } from '@/lib/db'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  hasOrgPermission,
  buildAccessContext,
  filterToAccessibleRecords,
  filterToAccessibleWorkspaces,
} from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'

export const dynamic = 'force-dynamic'

// GET /api/enterprise/meeting-prep/[eventId]
// Returns a Claude-synthesized meeting-prep brief for the event:
//   - last related decision (if any)
//   - 3 relevant past memories
//   - open questions from prior context
//   - attendee notes
// Everything RBAC-filtered. Meeting Prep respects record-level access.

export async function GET(_req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId } = await params
    const { userId } = await requireAuth()

    const event = await db.query.calendarEvents.findFirst({
      where: eq(schema.calendarEvents.id, eventId),
    })
    if (!event) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const orgCtx = await getOrgContext(userId, event.organizationId)
    if (!orgCtx || !hasOrgPermission(orgCtx, 'org.read')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const attendeeEmails: string[] = (() => {
      try { return JSON.parse(event.attendeeEmails || '[]') } catch { return [] }
    })()

    // Find the user's accessible workspaces in this org
    const links = await db.select({ workspaceId: schema.workspaceOrgLinks.workspaceId })
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, event.organizationId))
    const allWs = Array.from(new Set(links.map((l) => l.workspaceId)))
    const accessibleWs = await filterToAccessibleWorkspaces(userId, allWs)

    // ── FTS on the title + description to find related memories ──
    const queryText = [event.title, event.description].filter(Boolean).join(' ')
    const ftsIds = accessibleWs.length > 0 ? searchFTS(queryText, accessibleWs, 50) : []

    let relatedRecords: (typeof schema.records.$inferSelect)[] = []
    if (ftsIds.length > 0) {
      const raw = await db.select().from(schema.records).where(inArray(schema.records.id, ftsIds))
      const accessCtx = await buildAccessContext(userId)
      const allowed = await filterToAccessibleRecords(accessCtx, raw.map((r) => r.id))
      const rank = new Map(ftsIds.map((id, i) => [id, i]))
      relatedRecords = raw.filter((r) => allowed.has(r.id))
        .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
        .slice(0, 8)
    }

    // ── Recent decisions that could be related ──
    const decisionsRaw = relatedRecords.length > 0
      ? await db.select()
          .from(schema.decisions)
          .where(and(
            eq(schema.decisions.organizationId, event.organizationId),
            inArray(schema.decisions.recordId, relatedRecords.map((r) => r.id)),
          ))
          .orderBy(desc(schema.decisions.decidedAt))
          .limit(5)
      : []

    // ── Attendees who exist in the org ──
    const attendeeUsers = attendeeEmails.length > 0
      ? await db.select().from(schema.users).where(inArray(schema.users.email, attendeeEmails))
      : []

    // ── Claude brief ──
    const memoriesBlock = relatedRecords.slice(0, 6).map((r, i) =>
      `[M${i + 1}] ${r.type.toUpperCase()} · ${r.title}${r.summary ? `\n    ${r.summary.slice(0, 200)}` : ''}`
    ).join('\n')

    const decisionsBlock = decisionsRaw.map((d, i) =>
      `[D${i + 1}] ${d.title}${d.rationale ? ` — ${d.rationale.slice(0, 200)}` : ''} (${d.status})`
    ).join('\n')

    const attendeesBlock = attendeeUsers.map((u) => `- ${u.name || u.email}`).join('\n') || '(none in org)'

    const prompt = `You are writing a MEETING PREP brief. Keep it to ~120 words total. Cite from the sources using [M#] or [D#].

MEETING: ${event.title}
WHEN: ${new Date(event.startAt).toLocaleString()}
${event.location ? `WHERE: ${event.location}\n` : ''}${event.description ? `AGENDA: ${event.description}\n` : ''}

ATTENDEES:
${attendeesBlock}

RELATED PRIOR MEMORIES:
${memoriesBlock || '(none found)'}

RELATED DECISIONS:
${decisionsBlock || '(none found)'}

Output format — PLAIN markdown, these exact H3 sections:
### Heads-up
One sentence on the single most important thing to walk in knowing.

### Context
2-3 bullets with the key background, citing [M#]/[D#] where you lean on a source.

### Open questions
1-2 questions likely to come up that aren't settled yet.

No preamble, no closing, no "I hope this helps."`

    let brief = ''
    try {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('Claude not configured')
      if (relatedRecords.length === 0 && decisionsRaw.length === 0) {
        brief = `### Heads-up\nNo prior context in your memory for this topic yet — it's either new or nobody's captured it.\n\n### Context\n— This meeting is not linked to any existing memory.\n\n### Open questions\n— What's the goal of this meeting, and who should own the follow-up?`
      } else {
        const llm = getAskLLM()
        brief = await llm.generateText(prompt, 600)
      }
    } catch (err) {
      console.warn('[meeting-prep]', err)
      brief = memoriesBlock
        ? `### Heads-up\nPrep synthesis unavailable — raw context below.\n\n### Related memories\n${memoriesBlock}`
        : '### Heads-up\nNo prior context and Claude unavailable.'
    }

    return NextResponse.json({
      event: {
        ...event,
        attendeeEmails,
      },
      brief,
      relatedRecords: relatedRecords.slice(0, 3).map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        summary: r.summary,
      })),
      decisions: decisionsRaw.slice(0, 3).map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
      })),
      attendees: attendeeUsers.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
      })),
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
