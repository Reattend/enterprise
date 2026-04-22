import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  hasOrgPermission,
  auditForAllUserOrgs,
  extractRequestMeta,
} from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'
import { enqueueJob } from '@/lib/jobs/worker'

export const dynamic = 'force-dynamic'

interface QAItem {
  id: string
  topic: 'projects' | 'relationships' | 'tribal_knowledge' | 'gotchas' | 'open_loops'
  question: string
  answer: string | null
  answeredAt: string | null
}

// GET /api/enterprise/exit-interviews/[id]
// Read: the departing user themselves + any admin in the org.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId } = await requireAuth()

    const row = await db.query.exitInterviews.findFirst({
      where: eq(schema.exitInterviews.id, id),
    })
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const orgCtx = await getOrgContext(userId, row.organizationId)
    const isAdmin = orgCtx ? hasOrgPermission(orgCtx, 'org.members.manage') : false
    const isDeparting = row.departingUserId === userId
    if (!isAdmin && !isDeparting) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const questions: QAItem[] = (() => {
      try { return JSON.parse(row.questions) as QAItem[] } catch { return [] }
    })()

    return NextResponse.json({
      interview: {
        ...row,
        questions,
        viewerIsDepartingUser: isDeparting,
        viewerIsAdmin: isAdmin,
      },
    })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// PATCH /api/enterprise/exit-interviews/[id]
// Body: { action: 'answer', questionId, answer }
//   → update one answer in the questions array
// Body: { action: 'complete' }
//   → synthesize Claude handoff doc + save as a record + mark completed
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || 'unknown'
    const body = await req.json()

    const row = await db.query.exitInterviews.findFirst({
      where: eq(schema.exitInterviews.id, id),
    })
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 })

    const orgCtx = await getOrgContext(userId, row.organizationId)
    const isAdmin = orgCtx ? hasOrgPermission(orgCtx, 'org.members.manage') : false
    const isDeparting = row.departingUserId === userId
    if (!isAdmin && !isDeparting) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const questions: QAItem[] = (() => {
      try { return JSON.parse(row.questions) as QAItem[] } catch { return [] }
    })()

    if (body.action === 'answer') {
      // Only the departing user answers. Admins review; they don't type on
      // someone else's behalf.
      if (!isDeparting) {
        return NextResponse.json({ error: 'only the departing user can answer' }, { status: 403 })
      }
      const { questionId, answer } = body as { questionId?: string; answer?: string }
      if (!questionId || typeof answer !== 'string') {
        return NextResponse.json({ error: 'questionId + answer required' }, { status: 400 })
      }
      const idx = questions.findIndex((q) => q.id === questionId)
      if (idx < 0) return NextResponse.json({ error: 'unknown question id' }, { status: 400 })
      questions[idx].answer = answer.trim() || null
      questions[idx].answeredAt = answer.trim() ? new Date().toISOString() : null
      await db.update(schema.exitInterviews)
        .set({ questions: JSON.stringify(questions) })
        .where(eq(schema.exitInterviews.id, id))
      return NextResponse.json({ ok: true, answeredCount: questions.filter((q) => q.answer).length })
    }

    if (body.action === 'complete') {
      // Either admin or departing user can mark complete. Typical flow: the
      // departing user finishes answering + hits Complete; admin can also
      // force-complete if person stalled.
      const answeredQs = questions.filter((q) => q.answer && q.answer.trim().length > 0)
      if (answeredQs.length === 0) {
        return NextResponse.json({ error: 'at least one answer required before completion' }, { status: 400 })
      }

      const departingUser = await db.select()
        .from(schema.users)
        .where(eq(schema.users.id, row.departingUserId))
        .limit(1)
      const personName = departingUser[0]?.name || departingUser[0]?.email || 'the departing person'

      // ── Claude writes the handoff doc ──
      const qaBlock = answeredQs.map((q, i) => {
        const topic = q.topic.replace(/_/g, ' ')
        return `[${i + 1}] (${topic}) ${q.question}\n→ ${q.answer}`
      }).join('\n\n')

      const prompt = `${personName} is leaving ${row.roleTitle ? `the ${row.roleTitle} role` : 'this role'} and has just completed their exit interview. Your job: turn their answers into a HANDOFF DOCUMENT that their successor can read on day one and get productive.

INTERVIEW ANSWERS:
${qaBlock}

Write a handoff doc with these sections (markdown H2):
1. ## Summary — 2-3 sentences on what the successor is inheriting and the single most important thing to know
2. ## Active Projects — bulleted, each with (a) current state, (b) who to contact, (c) next action
3. ## Relationships to Preserve — people + why they matter, grouped
4. ## Tribal Knowledge — undocumented patterns, idioms, "how we actually do X"
5. ## Gotchas & Failure Modes — what will surprise you
6. ## Open Loops — decisions deferred, conversations mid-flight, things you inherit un-decided
7. ## First Week Checklist — 5-10 specific things the successor should do in week 1

Rules:
- Use ONLY what's in the answers. Don't fabricate. If a section has no content, write "None recorded." and move on.
- Name specific people, systems, and projects verbatim from the answers.
- No preamble, no "Dear successor", no closing. Just the markdown sections.`

      let handoffDoc = ''
      try {
        if (!process.env.ANTHROPIC_API_KEY) throw new Error('Claude not configured')
        const llm = getAskLLM()
        handoffDoc = await llm.generateText(prompt, 3500)
      } catch (err) {
        console.warn('[exit-interview] handoff gen failed, using fallback', err)
        handoffDoc = `## Handoff doc\n\nClaude synthesis unavailable. Raw interview answers below.\n\n${qaBlock}`
      }

      // Save the handoff doc as a memory record, authored by the departing
      // user, tagged so it surfaces in Wiki/People. Visible org-wide.
      const recordId = crypto.randomUUID()
      const workspaceLink = await db.select()
        .from(schema.workspaceOrgLinks)
        .where(eq(schema.workspaceOrgLinks.organizationId, row.organizationId))
        .limit(1)
      const ws = workspaceLink[0]?.workspaceId
      if (ws) {
        await db.insert(schema.records).values({
          id: recordId,
          workspaceId: ws,
          type: 'context',
          title: `Exit handoff · ${personName}${row.roleTitle ? ` (${row.roleTitle})` : ''}`,
          summary: `Handoff doc from ${personName}'s exit interview, covering ${answeredQs.length} question${answeredQs.length === 1 ? '' : 's'} across projects, relationships, tribal knowledge, gotchas, and open loops.`,
          content: handoffDoc,
          confidence: 0.9,
          tags: JSON.stringify(['exit-handoff', 'handoff', row.roleTitle || 'role-handoff']),
          triageStatus: 'auto_accepted',
          createdBy: row.departingUserId,
          source: 'exit-interview',
          visibility: 'org',
          meta: JSON.stringify({ exitInterviewId: id, questionCount: answeredQs.length }),
        })
        // Ingest so it gets embedded + linked
        await enqueueJob(ws, 'ingest', { recordId, content: handoffDoc })
      }

      await db.update(schema.exitInterviews)
        .set({
          status: 'completed',
          handoffDoc,
          handoffRecordId: ws ? recordId : null,
          completedAt: new Date().toISOString(),
        })
        .where(eq(schema.exitInterviews.id, id))

      const reqMeta = extractRequestMeta(req)
      auditForAllUserOrgs(userId, userEmail, 'create', {
        resourceType: 'exit_interview_handoff',
        resourceId: recordId,
        ipAddress: reqMeta.ipAddress,
        userAgent: reqMeta.userAgent,
        metadata: { interviewId: id, answeredCount: answeredQs.length },
      })

      return NextResponse.json({
        ok: true,
        status: 'completed',
        handoffDoc,
        handoffRecordId: ws ? recordId : null,
      })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}
