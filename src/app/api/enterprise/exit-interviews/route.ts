import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, desc, inArray } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'

export const dynamic = 'force-dynamic'

// Exit Interview Agent — two-endpoint surface.
//
// POST /api/enterprise/exit-interviews
//   Body: { orgId, departingUserId, roleTitle? }
//   Behavior:
//     - RBAC: caller must be org admin/super_admin
//     - Reads the departing person's memory footprint (authored records,
//       decisions, common entities)
//     - Claude generates 10-15 targeted questions across 5 topic areas
//       (projects, relationships, tribal knowledge, gotchas, open loops)
//     - Stores questions + status='in_progress'
//     - Returns the new interview row
//
// GET /api/enterprise/exit-interviews?orgId=...
//   List for cockpit. RBAC admin-only.

interface PlannedQuestion {
  id: string
  topic: 'projects' | 'relationships' | 'tribal_knowledge' | 'gotchas' | 'open_loops'
  question: string
  answer: string | null
  answeredAt: string | null
}

const TOPIC_BLURBS: Record<PlannedQuestion['topic'], string> = {
  projects:          'Ongoing projects and their current state — what\'s shipped, what\'s in flight, what\'s blocked.',
  relationships:     'Key contacts inside and outside the org the successor must know.',
  tribal_knowledge:  'Undocumented patterns, idioms, "how we actually do X" context.',
  gotchas:           'Mistakes to avoid, systems that break in unexpected ways, fragile dependencies.',
  open_loops:        'Decisions deferred, questions still outstanding, conversations mid-flight.',
}

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId')
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })
    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const rows = await db.select()
      .from(schema.exitInterviews)
      .where(eq(schema.exitInterviews.organizationId, orgId))
      .orderBy(desc(schema.exitInterviews.createdAt))
      .limit(100)

    // Resolve user names in one query
    const userIds = Array.from(new Set(rows.flatMap((r) => [r.departingUserId, r.initiatedByUserId])))
    const users = userIds.length > 0
      ? await db.select().from(schema.users).where(inArray(schema.users.id, userIds))
      : []
    const nameById = new Map(users.map((u) => [u.id, u.name || u.email]))

    return NextResponse.json({
      interviews: rows.map((r) => {
        let qs: PlannedQuestion[] = []
        try { qs = JSON.parse(r.questions) } catch {}
        return {
          id: r.id,
          departingUserId: r.departingUserId,
          departingName: nameById.get(r.departingUserId) || 'unknown',
          initiatedByName: nameById.get(r.initiatedByUserId) || 'unknown',
          roleTitle: r.roleTitle,
          status: r.status,
          questionCount: qs.length,
          answeredCount: qs.filter((q) => q.answer && q.answer.trim().length > 0).length,
          handoffRecordId: r.handoffRecordId,
          createdAt: r.createdAt,
          completedAt: r.completedAt,
        }
      }),
    })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orgId, departingUserId, roleTitle } = body as {
      orgId?: string
      departingUserId?: string
      roleTitle?: string
    }
    if (!orgId || !departingUserId) {
      return NextResponse.json({ error: 'orgId + departingUserId required' }, { status: 400 })
    }

    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    // Validate departing user is in this org
    const membership = await db.select()
      .from(schema.organizationMembers)
      .where(and(
        eq(schema.organizationMembers.organizationId, orgId),
        eq(schema.organizationMembers.userId, departingUserId),
      ))
      .limit(1)
    if (!membership[0]) {
      return NextResponse.json({ error: 'departing user not in org' }, { status: 400 })
    }

    // ── Read the departing person's memory footprint ─────────
    const authored = await db.select()
      .from(schema.records)
      .where(eq(schema.records.createdBy, departingUserId))
      .orderBy(desc(schema.records.createdAt))
      .limit(40)

    const decisions = await db.select()
      .from(schema.decisions)
      .where(and(
        eq(schema.decisions.organizationId, orgId),
        eq(schema.decisions.decidedByUserId, departingUserId),
      ))
      .orderBy(desc(schema.decisions.decidedAt))
      .limit(20)

    // ── Generate planned questions with Claude ──────────────
    const footprintBlock = [
      authored.length > 0
        ? `AUTHORED MEMORIES (top ${Math.min(authored.length, 25)}):\n${authored.slice(0, 25).map((r, i) => `[${i + 1}] ${r.type.toUpperCase()} · ${r.title}${r.summary ? `\n    ${r.summary.slice(0, 160)}` : ''}`).join('\n')}`
        : 'No authored memories on file.',
      decisions.length > 0
        ? `DECISIONS MADE:\n${decisions.map((d, i) => `[${i + 1}] ${d.title}${d.rationale ? ` — ${d.rationale.slice(0, 160)}` : ''}`).join('\n')}`
        : 'No decisions on file.',
    ].join('\n\n')

    const prompt = `You are designing an exit interview for someone leaving an organization. They're about to carry a large amount of tacit knowledge out the door. Your job: write 10-15 SPECIFIC, TARGETED questions that pull that knowledge out.

DEPARTING PERSON'S FOOTPRINT:
${footprintBlock}

${roleTitle ? `ROLE: ${roleTitle}\n` : ''}

Rules:
- Ground every question in what you saw in their footprint. Don't ask generic "what did you work on?" — ask "Project X came up in your memories — what's its current status and who should own it?"
- Cover all five topic areas: projects, relationships, tribal_knowledge, gotchas, open_loops.
- 2-3 questions per topic.
- Each question must be answerable in 2-5 sentences. Don't ask essay questions.
- Name specific projects, people, and systems from the footprint verbatim.
- If the footprint is thin, mix in a few default questions — but still write at least 10.

Output strict JSON only:
{ "questions": [ { "topic": "projects", "question": "..." }, ... ] }

No prose, no preamble, no markdown. Just the JSON.`

    let plannedQuestions: PlannedQuestion[] = []
    try {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('Claude not configured')
      const llm = getAskLLM()
      const raw = await llm.generateText(prompt, 2500)
      const parsed = parseQuestionsJson(raw)
      plannedQuestions = parsed.map((q, i) => ({
        id: crypto.randomUUID(),
        topic: q.topic,
        question: q.question,
        answer: null,
        answeredAt: null,
      }))
    } catch (err) {
      console.warn('[exit-interview] LLM question gen failed, using defaults', err)
      plannedQuestions = defaultQuestions()
    }
    if (plannedQuestions.length < 5) plannedQuestions = defaultQuestions()

    // ── Persist ──────────────────────────────────────────────
    const interviewId = crypto.randomUUID()
    await db.insert(schema.exitInterviews).values({
      id: interviewId,
      organizationId: orgId,
      departingUserId,
      initiatedByUserId: auth.userId,
      roleTitle: roleTitle || null,
      status: 'in_progress',
      questions: JSON.stringify(plannedQuestions),
    })

    auditFromAuth(auth, 'create', {
      resourceType: 'exit_interview',
      resourceId: interviewId,
      metadata: { departingUserId, questionCount: plannedQuestions.length },
    })

    return NextResponse.json({
      interview: {
        id: interviewId,
        status: 'in_progress',
        questions: plannedQuestions,
      },
    }, { status: 201 })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}

function parseQuestionsJson(raw: string): Array<{ topic: PlannedQuestion['topic']; question: string }> {
  // Strip ```json fences if present, then find the first { ... } block.
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const m = cleaned.match(/\{[\s\S]*\}/)
  if (!m) return []
  try {
    const parsed = JSON.parse(m[0])
    const questions = Array.isArray(parsed.questions) ? parsed.questions : []
    const validTopics = new Set(['projects', 'relationships', 'tribal_knowledge', 'gotchas', 'open_loops'])
    return questions
      .filter((q: any) => q && typeof q.question === 'string' && q.question.length > 10 && validTopics.has(q.topic))
      .slice(0, 20)
  } catch {
    return []
  }
}

function defaultQuestions(): PlannedQuestion[] {
  const out: PlannedQuestion[] = []
  const defaults: Array<[PlannedQuestion['topic'], string]> = [
    ['projects',         'What are the top 3 projects you\'re leaving in-flight, and what state is each in?'],
    ['projects',         'Which project has no clear successor lined up, and who would you recommend?'],
    ['relationships',    'Name 3-5 people outside your team whose trust you\'ve earned — and what the relationship is about.'],
    ['relationships',    'Which external vendors / partners do you own the relationship with?'],
    ['tribal_knowledge', 'Is there anything about "how we actually do things here" that isn\'t written down but matters?'],
    ['tribal_knowledge', 'What naming conventions, code patterns, or working styles should your successor adopt on day one?'],
    ['gotchas',          'What\'s the most surprising failure mode in our systems that a new person wouldn\'t see coming?'],
    ['gotchas',          'Which dependencies / vendors / contracts have quirks your successor must know about?'],
    ['open_loops',       'What decision did you recently defer that will come back to bite if it isn\'t addressed?'],
    ['open_loops',       'Is there any active conversation or negotiation mid-flight that your successor must continue?'],
  ]
  for (const [topic, question] of defaults) {
    out.push({ id: crypto.randomUUID(), topic, question, answer: null, answeredAt: null })
  }
  return out
}
