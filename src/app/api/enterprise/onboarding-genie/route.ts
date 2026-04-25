import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import {
  handleEnterpriseError,
  getOrgContext,
  hasOrgPermission,
} from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'
import { isSandboxEmail } from '@/lib/sandbox/detect'
import { SANDBOX_ONBOARDING_GENIE } from '@/lib/sandbox/fixtures'

export const dynamic = 'force-dynamic'

// POST /api/enterprise/onboarding-genie
// Body: { orgId, departmentId, roleTitle, name, startDate, email? }
//
// Produces a personalized onboarding packet for a new hire:
//   - Dept overview (recent memories in their dept)
//   - 5-8 most-important decisions to know about (in scope)
//   - Policies they must ack in week 1
//   - People to meet in week 1 (their dept's members + dept_head + manager)
//   - Suggested first-day links: agents most relevant to their role
//
// Claude weaves it into a single markdown doc they can read front-to-back.

interface PacketResponse {
  markdown: string
  sections: {
    overview: string
    keyDecisions: Array<{ id: string; title: string; status: string; decidedAt: string }>
    policies: Array<{ id: string; title: string; category: string | null }>
    peopleToMeet: Array<{ id: string; name: string | null; email: string; role: string; title: string | null }>
    suggestedAgents: Array<{ id: string; name: string; description: string | null }>
  }
  meta: { generatedAt: string; department: string; roleTitle: string; name: string }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || ''
    const body = await req.json()
    const { orgId, departmentId, roleTitle, name, startDate, email } = body as {
      orgId?: string
      departmentId?: string
      roleTitle?: string
      name?: string
      startDate?: string
      email?: string
    }

    if (!orgId || !departmentId || !roleTitle || !name) {
      return NextResponse.json({
        error: 'orgId, departmentId, roleTitle, name required',
      }, { status: 400 })
    }

    // Sandbox: serve a pre-built packet; the UI renders it identically.
    if (isSandboxEmail(userEmail)) {
      const p = SANDBOX_ONBOARDING_GENIE.packet
      const markdown = [
        `# ${p.headline}`,
        '',
        p.summary,
        '',
        '## Read these',
        ...p.readThese.map((r) => `- ${r}`),
        '',
        '## People to meet',
        ...p.peopleToMeet.map((m) => `- **${m.name}** — ${m.role}. ${m.context}`),
        '',
        '## Agents to try',
        ...p.agentsToTry.map((a) => `- ${a}`),
        '',
        '## Watch out for',
        ...p.watchOutFor.map((w) => `- ${w}`),
      ].join('\n')
      return NextResponse.json({
        markdown,
        sections: {
          overview: p.summary,
          keyDecisions: [],
          policies: [],
          peopleToMeet: p.peopleToMeet.map((m, i) => ({ id: `sb-p${i}`, name: m.name, email: '', role: 'member', title: m.role })),
          suggestedAgents: [],
        },
        meta: { generatedAt: new Date().toISOString(), department: 'International Taxation', roleTitle, name, sandbox: true },
      })
    }

    const ctx = await getOrgContext(userId, orgId)
    if (!ctx || !hasOrgPermission(ctx, 'org.members.manage')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Dept + ancestors (so we also pull context from divisions above)
    const [dept] = await db.select().from(schema.departments).where(eq(schema.departments.id, departmentId)).limit(1)
    if (!dept || dept.organizationId !== orgId) {
      return NextResponse.json({ error: 'invalid departmentId' }, { status: 400 })
    }

    // Walk up the dept tree to collect ancestor dept IDs (so the hire sees
    // the division context, not just their team).
    const allDepts = await db.select().from(schema.departments).where(eq(schema.departments.organizationId, orgId))
    const deptById = new Map(allDepts.map((d) => [d.id, d]))
    const scopeDeptIds = new Set<string>([dept.id])
    let cur: typeof dept | undefined = dept
    while (cur?.parentId) {
      scopeDeptIds.add(cur.parentId)
      cur = deptById.get(cur.parentId)
    }
    // Also collect descendants so a dept_head hire sees the teams beneath.
    const children = new Map<string, string[]>()
    for (const d of allDepts) {
      if (!d.parentId) continue
      if (!children.has(d.parentId)) children.set(d.parentId, [])
      children.get(d.parentId)!.push(d.id)
    }
    const queue = [dept.id]
    while (queue.length) {
      const id = queue.shift()!
      for (const c of children.get(id) || []) {
        if (!scopeDeptIds.has(c)) {
          scopeDeptIds.add(c)
          queue.push(c)
        }
      }
    }

    // Workspaces linked to any dept in scope
    const links = await db.select().from(schema.workspaceOrgLinks)
      .where(and(
        eq(schema.workspaceOrgLinks.organizationId, orgId),
        inArray(schema.workspaceOrgLinks.departmentId, Array.from(scopeDeptIds)),
      ))
    const scopeWorkspaceIds = Array.from(new Set(links.map((l) => l.workspaceId)))

    // ── Key decisions in this dept (or parents), most recent first ─────
    const keyDecisions = await db.select({
      id: schema.decisions.id,
      title: schema.decisions.title,
      status: schema.decisions.status,
      context: schema.decisions.context,
      rationale: schema.decisions.rationale,
      decidedAt: schema.decisions.decidedAt,
    }).from(schema.decisions)
      .where(and(
        eq(schema.decisions.organizationId, orgId),
        inArray(schema.decisions.departmentId, Array.from(scopeDeptIds)),
      ))
      .orderBy(desc(schema.decisions.decidedAt))
      .limit(8)

    // ── Top-level memories in dept workspaces ──────────────
    const recentRecords = scopeWorkspaceIds.length ? await db.select({
      id: schema.records.id,
      title: schema.records.title,
      type: schema.records.type,
      summary: schema.records.summary,
      createdAt: schema.records.createdAt,
    }).from(schema.records)
      .where(inArray(schema.records.workspaceId, scopeWorkspaceIds))
      .orderBy(desc(schema.records.createdAt))
      .limit(15) : []

    // ── Policies the hire will need to ack ─────────────────
    // We query against a "synthetic" user: compute applicability as if this
    // new person was already in the dept with a member role. For simplicity
    // we list every published policy; the hire's own ack state is computed
    // when they log in.
    const publishedPolicies = await db.query.policies.findMany({
      where: and(
        eq(schema.policies.organizationId, orgId),
        eq(schema.policies.status, 'published'),
      ),
    })

    // ── People to meet ─────────────────────────────────────
    const peopleRows = await db.select({
      userId: schema.departmentMembers.userId,
      role: schema.departmentMembers.role,
      name: schema.users.name,
      email: schema.users.email,
      title: schema.organizationMembers.title,
    }).from(schema.departmentMembers)
      .innerJoin(schema.users, eq(schema.users.id, schema.departmentMembers.userId))
      .leftJoin(
        schema.organizationMembers,
        and(
          eq(schema.organizationMembers.userId, schema.departmentMembers.userId),
          eq(schema.organizationMembers.organizationId, orgId),
        ),
      )
      .where(and(
        eq(schema.departmentMembers.departmentId, dept.id),
        eq(schema.departmentMembers.organizationId, orgId),
      ))
    // Dept heads first, then managers, then members
    const rankByRole: Record<string, number> = { dept_head: 0, manager: 1, member: 2, viewer: 3 }
    const peopleToMeet = peopleRows
      .sort((a, b) => (rankByRole[a.role] ?? 9) - (rankByRole[b.role] ?? 9))
      .slice(0, 10)

    // ── Agents relevant to this role ───────────────────────
    const agentRows = await db.select({
      id: schema.agents.id,
      name: schema.agents.name,
      description: schema.agents.description,
    }).from(schema.agents)
      .where(and(
        eq(schema.agents.organizationId, orgId),
        eq(schema.agents.status, 'active'),
      )).limit(6)

    // ── Claude weaves the packet ───────────────────────────
    let markdown = ''
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const llm = getAskLLM()
        const prompt = `Write a personalized onboarding packet for a new hire, grounded in the organization's real memory. Format as markdown, ~500 words total, front-to-back readable in under 4 minutes.

NEW HIRE:
- Name: ${name}
- Email: ${email || '(not provided)'}
- Role: ${roleTitle}
- Department: ${dept.name} (${dept.kind})
- Start date: ${startDate || 'soon'}

DEPARTMENT CONTEXT:
${recentRecords.slice(0, 10).map((r, i) => `[m${i + 1}] ${r.type}: ${r.title}${r.summary ? ' — ' + r.summary.slice(0, 150) : ''}`).join('\n') || '(no recent memories)'}

KEY RECENT DECISIONS (${keyDecisions.length}):
${keyDecisions.map((d, i) => `[d${i + 1}] ${d.title} (${d.status})${d.rationale ? ' — ' + d.rationale.slice(0, 120) : ''}`).join('\n') || '(no decisions)'}

POLICIES TO ACK (${publishedPolicies.length}):
${publishedPolicies.slice(0, 6).map((p, i) => `[p${i + 1}] ${p.title}${p.category ? ` (${p.category})` : ''}`).join('\n') || '(none)'}

PEOPLE TO MEET (${peopleToMeet.length}):
${peopleToMeet.map((p, i) => `[u${i + 1}] ${p.name || p.email} — ${p.role}${p.title ? ', ' + p.title : ''}`).join('\n') || '(empty dept)'}

AGENTS THEY CAN USE:
${agentRows.map((a, i) => `[a${i + 1}] ${a.name}: ${a.description || 'n/a'}`).join('\n')}

Structure:
# Welcome, {first name}
Short opening (2-3 sentences) — what this packet is, warm tone.

## What we do here
1 paragraph on the department's purpose, inferred from recent memories/decisions.

## The 3-5 decisions you should know on day one
Bullet list with decision title + one-sentence "why it matters to you". Cite [d1], [d2].

## People to meet in week one
Ordered list, dept head first. For each: name, role, 1-line reason ("ask them about [x]"). Base reasons on the context — don't invent.

## Policies to acknowledge
Bullet list with title + 1 line on why. Cite [p1], [p2].

## Tools to try today
Bullet list of 3 agents from the agents list, with what to ask each.

## Your first week checklist
5 concrete items tied to the above (don't invent generic HR items).

Rules:
- Warm but not saccharine. Direct, specific.
- Cite inline as [d1], [p1], [m1], [u1], [a1] when referencing items.
- Do NOT invent facts the corpus doesn't support. If info is thin, keep the section brief.
- Start with the H1 "# Welcome, ${name.split(' ')[0]}" and never self-reference.

Begin the packet:`

        markdown = (await llm.generateText(prompt, 2500)).trim()
      } catch (err) {
        console.error('[onboarding-genie] markdown generation failed', err)
      }
    }
    if (!markdown) {
      // Plaintext fallback so the button still does something without Claude
      markdown = `# Welcome, ${name.split(' ')[0]}\n\nYou're joining ${dept.name} as ${roleTitle}. Here's what's on deck for week one:\n\n- ${keyDecisions.length} recent decisions in your dept\n- ${publishedPolicies.length} policies to acknowledge\n- ${peopleToMeet.length} people to meet\n\n(AI narrative unavailable — regenerate when Claude is configured.)`
    }

    return NextResponse.json({
      markdown,
      sections: {
        overview: dept.name,
        keyDecisions,
        policies: publishedPolicies.slice(0, 8).map((p) => ({ id: p.id, title: p.title, category: p.category })),
        peopleToMeet: peopleToMeet.map((p) => ({
          id: p.userId, name: p.name, email: p.email, role: p.role, title: p.title,
        })),
        suggestedAgents: agentRows.map((a) => ({ id: a.id, name: a.name, description: a.description })),
      },
      meta: {
        generatedAt: new Date().toISOString(),
        department: dept.name,
        roleTitle,
        name,
      },
    } as PacketResponse)
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

