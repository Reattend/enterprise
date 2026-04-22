import { NextRequest } from 'next/server'
import { db, schema, sqlite, vecLoaded, searchFTS, ftsReady } from '@/lib/db'
import { eq, and, desc, or, inArray, like, ne } from 'drizzle-orm'
import { requireAuth, getUserSubscription } from '@/lib/auth'
import { recordUsage } from '@/lib/metering'
import { getAskLLM } from '@/lib/ai/llm'
import { cosineSimilarity } from '@/lib/utils'
import {
  auditForAllUserOrgs,
  extractRequestMeta,
  buildAccessContext,
  filterToAccessibleRecords,
} from '@/lib/enterprise'
import { rerankWithClaudeHaiku } from '@/lib/ai/reranker'

const AI_QUERY_LIMIT = 20

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
  'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
  'should', 'may', 'might', 'can', 'could', 'a', 'an', 'the', 'and', 'but',
  'or', 'nor', 'not', 'so', 'if', 'then', 'than', 'too', 'very', 'just',
  'about', 'above', 'after', 'again', 'all', 'also', 'any', 'because', 'before',
  'between', 'both', 'by', 'during', 'each', 'for', 'from', 'further', 'get',
  'here', 'how', 'in', 'into', 'more', 'most', 'no', 'of', 'on', 'once',
  'only', 'other', 'out', 'over', 'own', 'same', 'some', 'such', 'to', 'under',
  'until', 'up', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
  'why', 'with', 'there', 'their', 'its', 'make', 'made', 'tell', 'more',
  'light', 'shed', 'please', 'could', 'know', 'like',
])

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
}

// Extract proper nouns (person names, project names, etc.) from original question
// These get a much stronger boost than generic keywords
const COMMON_CAPS = new Set([
  'I', 'The', 'A', 'An', 'In', 'On', 'At', 'To', 'For', 'Of', 'With',
  'What', 'Who', 'When', 'Where', 'Why', 'How', 'Is', 'Are', 'Was', 'Were',
  'Can', 'Could', 'Did', 'Do', 'Does', 'Has', 'Have', 'Had', 'Will', 'Would',
  'Tell', 'Me', 'My', 'We', 'Our', 'Please', 'Any', 'All', 'This', 'That',
])
function extractProperNouns(text: string): string[] {
  const words = text.split(/\s+/)
    .filter(w => /^[A-Z][a-z]/.test(w) && !COMMON_CAPS.has(w) && w.length > 2)
    .map(w => w.toLowerCase().replace(/[^a-z]/g, ''))
    .filter(w => w.length > 2)
  return Array.from(new Set(words))
}

// ─── Fuzzy name matching ─────────────────────────────────────────────────────
// Maps common first name ↔ nickname/variant so "Mike" finds "Michael" and vice versa
const NICKNAME_MAP: Record<string, string[]> = {
  mike: ['michael', 'mick', 'mickey'], michael: ['mike', 'mick'],
  bob: ['robert', 'rob', 'bobby'], robert: ['bob', 'rob'], rob: ['robert', 'bob'],
  bill: ['william', 'will', 'billy'], william: ['bill', 'will'], will: ['william', 'bill'],
  jim: ['james', 'jimmy'], james: ['jim', 'jimmy'],
  tom: ['thomas', 'tommy'], thomas: ['tom', 'tommy'],
  dave: ['david'], david: ['dave'],
  chris: ['christopher'], christopher: ['chris'],
  dan: ['daniel', 'danny'], daniel: ['dan', 'danny'],
  matt: ['matthew'], matthew: ['matt'],
  joe: ['joseph', 'joey'], joseph: ['joe'],
  nick: ['nicholas'], nicholas: ['nick'],
  alex: ['alexander', 'alexandra'], alexander: ['alex'],
  sam: ['samuel', 'samantha'], samuel: ['sam'], samantha: ['sam'],
  ben: ['benjamin'], benjamin: ['ben'],
  liz: ['elizabeth', 'beth'], elizabeth: ['liz', 'beth'], beth: ['elizabeth', 'liz'],
  kate: ['katherine', 'kathy', 'katie'], katherine: ['kate', 'kathy'], kathy: ['katherine', 'kate'],
  jen: ['jennifer', 'jenny'], jennifer: ['jen', 'jenny'],
  pat: ['patricia', 'patrick'], patricia: ['pat'], patrick: ['pat'],
  raj: ['rajesh'], rajesh: ['raj'],
  don: ['donald'], donald: ['don'],
  sue: ['susan', 'susanne'], susan: ['sue'],
  ann: ['anne', 'anna', 'annie'], anne: ['ann', 'anna'], anna: ['ann', 'anne'],
  tony: ['anthony'], anthony: ['tony'],
  andy: ['andrew'], andrew: ['andy'],
  ron: ['ronald'], ronald: ['ron'],
  ken: ['kenneth'], kenneth: ['ken'],
  steve: ['steven', 'stephen'], steven: ['steve'], stephen: ['steve'],
  ed: ['edward', 'edgar'], edward: ['ed', 'eddie'], eddie: ['edward', 'ed'],
  greg: ['gregory'], gregory: ['greg'],
  jeff: ['jeffrey'], jeffrey: ['jeff'],
  rick: ['richard'], richard: ['rick', 'rich', 'dick'], rich: ['richard'],
  tim: ['timothy'], timothy: ['tim'],
  jay: ['jason'], jason: ['jay'],
  mark: ['marcus'], marcus: ['mark'],
}

// Returns the input name + all known nickname variants
function getNameVariants(name: string): string[] {
  const lower = name.toLowerCase()
  const variants = new Set<string>([lower])
  // Direct lookup
  for (const v of (NICKNAME_MAP[lower] || [])) variants.add(v)
  // If full name (e.g. "Mike Smith"), also add variants of each part
  const parts = lower.split(/\s+/).filter(p => p.length > 2)
  if (parts.length > 1) {
    for (const part of parts) {
      variants.add(part)
      for (const v of (NICKNAME_MAP[part] || [])) variants.add(v)
    }
  }
  return Array.from(variants)
}

// ─── Intent classification ────────────────────────────────────────────────────
type QueryIntent = 'factual' | 'entity' | 'temporal' | 'synthesis' | 'actions' | 'history' | 'aggregation'

// Regex fallback — used if LLM classification fails or times out
function classifyIntentRegex(question: string): QueryIntent {
  const q = question.toLowerCase()
  if (/\b(total|how much|how many|sum|count|tally|aggregate|combined|altogether|add up|average|avg|budget|cost|spend|spent|revenue|expense|invoice|payment|paid|charged|owe|earned|profit|loss|price|fee|salary|rate|hours?|days?|weeks?|months?|number of|quantity|amount)\b/.test(q)
    && /\b(total|sum|how much|how many|count|tally|all|combined|altogether|add up|average|avg|entire|across all|in total|overall)\b/.test(q))
    return 'aggregation'
  if (/\b(has worked|have worked|worked on|has done|have done|has completed|has handled|has addressed|has been working|has delivered|has provided|has updated|has sent|has shared|has fixed|has resolved|has investigated|has built|has created|has prepared|has presented|has reviewed)\b/.test(q)
    || /\bwhat (did|has) .{1,30} (do|done|work|accomplish|complete|deliver|handle|address|build|create|prepare)\b/.test(q)
    || /\b(list|give me|provide).{0,30}\b(has|have).{0,20}(done|worked|completed|delivered)\b/.test(q)
    || /\bpoints?.{0,20}(worked|completed|done|delivered|addressed)\b/.test(q))
    return 'history'
  if (/\b(action items?|open tasks?|to-?dos?|pending|follow-?ups?|outstanding|what.*need.*done|what.*should.*do|what.*left|not.*completed|unresolved|needs? to|should do|must do|take action|assigned to)\b/.test(q))
    return 'actions'
  if (/\b(last|this|next)\s+(week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|year|quarter)\b|\b(today|yesterday)\b|\bwhen\b.{1,30}\b(did|was|were|happened)\b|\bon\s+\w+\s+\d/.test(q))
    return 'temporal'
  if (/^(who|what)\s+is\b|^tell me about\s/.test(q) || (/\bwho\b/.test(q) && q.split(' ').length <= 6))
    return 'entity'
  if (/\b(discuss|summarize|summary|what happened|what was|what were|explain|describe|give me|overview|recap|everything|list|what did|how did|pattern|suggest|recommend|analyz|compare|across|all the|walk me|catch me up)\b/.test(q))
    return 'synthesis'
  return 'factual'
}

// LLM-based intent classifier — runs in parallel with embedding, ~300ms on Groq
// Falls back to regex if it fails. Much more accurate for edge cases.
async function classifyIntentLLM(question: string, llm: import('@/lib/ai/llm').LLMProvider): Promise<QueryIntent> {
  const prompt = `Classify this user question into exactly one of these 6 intent types:

factual     — single specific fact: name, date, number, yes/no, did X happen
entity      — profile of a person, org, project: "who is X", "tell me about X"
temporal    — time-bounded: "last week", "in March", "what happened on..."
synthesis   — broad summary, comparison, full recap: "summarize", "what happened with X", "give me a list"
actions     — pending/open tasks: "what needs to be done", "action items", "open tasks"
history     — completed past work: "what has X done", "what did X work on", "X's contributions"
aggregation — numerical totals/counts: "how much in total", "how many hours", "total budget", "sum of all"

Question: "${question}"

Reply with ONE word only (the intent type):`

  try {
    const raw = await llm.generateText(prompt, 15)
    const word = raw.trim().toLowerCase().replace(/[^a-z]/g, '')
    const valid: QueryIntent[] = ['factual', 'entity', 'temporal', 'synthesis', 'actions', 'history', 'aggregation']
    if (valid.includes(word as QueryIntent)) return word as QueryIntent
  } catch { /* fall through */ }
  return classifyIntentRegex(question)
}

// ─── Date range extraction ────────────────────────────────────────────────────
interface DateRange { start: Date; end: Date; label: string }

function extractDateRange(question: string): DateRange | null {
  const now = new Date()
  const q = question.toLowerCase()
  const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december']

  if (/\btoday\b/.test(q)) {
    const s = new Date(now); s.setHours(0, 0, 0, 0)
    const e = new Date(now); e.setHours(23, 59, 59, 999)
    return { start: s, end: e, label: 'today' }
  }
  if (/\byesterday\b/.test(q)) {
    const s = new Date(now); s.setDate(s.getDate() - 1); s.setHours(0, 0, 0, 0)
    const e = new Date(s); e.setHours(23, 59, 59, 999)
    return { start: s, end: e, label: 'yesterday' }
  }
  if (/\bthis week\b/.test(q)) {
    const s = new Date(now); s.setDate(s.getDate() - s.getDay()); s.setHours(0, 0, 0, 0)
    return { start: s, end: now, label: 'this week' }
  }
  if (/\blast week\b/.test(q)) {
    const e = new Date(now); e.setDate(e.getDate() - e.getDay() - 1); e.setHours(23, 59, 59, 999)
    const s = new Date(e); s.setDate(s.getDate() - 6); s.setHours(0, 0, 0, 0)
    return { start: s, end: e, label: 'last week' }
  }
  if (/\blast month\b/.test(q)) {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return { start: s, end: e, label: 'last month' }
  }
  if (/\bthis month\b/.test(q)) {
    const s = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: s, end: now, label: 'this month' }
  }
  if (/\blast\s+(3|three)\s+months?\b/.test(q)) {
    const s = new Date(now); s.setMonth(s.getMonth() - 3)
    return { start: s, end: now, label: 'last 3 months' }
  }
  if (/\blast\s+(6|six)\s+months?\b/.test(q)) {
    const s = new Date(now); s.setMonth(s.getMonth() - 6)
    return { start: s, end: now, label: 'last 6 months' }
  }
  if (/\blast year\b/.test(q)) {
    const s = new Date(now.getFullYear() - 1, 0, 1)
    const e = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
    return { start: s, end: e, label: `${now.getFullYear() - 1}` }
  }
  if (/\bthis year\b/.test(q)) {
    const s = new Date(now.getFullYear(), 0, 1)
    return { start: s, end: now, label: `${now.getFullYear()}` }
  }
  // Named month: "in January", "last March", "March 2024"
  for (let i = 0; i < MONTHS.length; i++) {
    const month = MONTHS[i]
    if (!q.includes(month)) continue
    const yearMatch = q.match(new RegExp(`${month}\\s+(20\\d{2})|(20\\d{2})\\s+${month}`))
    let year = now.getFullYear()
    if (yearMatch) {
      year = parseInt(yearMatch[1] || yearMatch[2])
    } else {
      if (i > now.getMonth()) year--
      if (q.includes(`last ${month}`) && i <= now.getMonth()) year--
    }
    const s = new Date(year, i, 1)
    const e = new Date(year, i + 1, 0, 23, 59, 59, 999)
    return { start: s, end: e, label: `${month} ${year}` }
  }
  return null
}

// ─── Date formatter ───────────────────────────────────────────────────────────
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return '' }
}

// ─── Multi-hop reasoning ─────────────────────────────────────────────────────
// Detects questions that need chained lookups (find X, then use X to find Y).
// Detection runs in parallel with SQL retrieval — adds ~0ms for single-hop questions.
// For multi-hop: Hop1 extracts the bridge fact, Hop2 retrieves records about it.
interface MultiHopPlan { hop1: string; hop2: string; bridge: string }

async function detectMultiHop(
  question: string,
  llm: import('@/lib/ai/llm').LLMProvider,
): Promise<MultiHopPlan | null> {
  const q = question.toLowerCase()

  // Fast pre-filter: obvious single-hop questions skip the LLM call entirely
  const hasSingleHopStart = /^(what is|who is|when did|tell me about|what did|list all|how many|total|summarize|what has|give me|what are)\s/.test(q)
  const hasMultiHopSignal = /\b(the (person|one|team|client|project|company|member) (who|that|responsible for|managing|handling|assigned to|leading|running)|after (the|that|this)|following (the|that)|based on (the|that)|which (led to|caused|resulted in)|the (outcome|result|decision|conclusion) (of|from)|since (the|that)|whoever|whichever)\b/.test(q)
  if (hasSingleHopStart && !hasMultiHopSignal) return null
  if (!hasMultiHopSignal) return null

  const prompt = `Determine if this question requires multi-hop reasoning — finding one fact first, then using it to answer the real question.

Question: "${question}"

Multi-hop means: you cannot answer directly without first resolving an intermediate fact.
Examples:
- "What has the person handling Goodwill been working on?" → hop1: "Who handles the Goodwill account?", hop2: "What has [name] worked on?", bridge: entity
- "What decisions followed the budget audit meeting?" → hop1: "What happened in the budget audit meeting?", hop2: "What decisions came after?", bridge: event
- "What's the status of the task Mike was assigned in last week's meeting?" → hop1: "What task was Mike assigned last week?", hop2: "What is the current status of [task]?", bridge: decision

Single-hop (answer directly, no chaining needed):
- "What did Mike work on this week?" — direct
- "List all open tasks for the Goodwill project" — direct
- "Tell me about Sarah" — direct

Output JSON (one of these two forms only):
{"multiHop": true, "hop1": "first sub-question to resolve", "hop2": "second sub-question that uses hop1 result", "bridge": "entity|event|decision|date"}
{"multiHop": false}`

  try {
    const raw = await llm.generateText(prompt, 150)
    const match = raw.match(/\{[\s\S]*?\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    if (!parsed.multiHop || !parsed.hop1 || !parsed.hop2) return null
    return { hop1: parsed.hop1, hop2: parsed.hop2, bridge: parsed.bridge || 'entity' }
  } catch { return null }
}

// ─── Query expansion ─────────────────────────────────────────────────────────
// Generates 2-3 alternate phrasings to surface memories that used different vocabulary.
// Runs in parallel with candidate retrieval — adds zero wall-clock latency.
async function expandQueryTerms(question: string, llm: import('@/lib/ai/llm').LLMProvider): Promise<string[]> {
  const prompt = `Given this search query for a personal memory system, list 2-3 short alternative phrasings that might match how the same information was written down differently.

Query: "${question}"

Rules:
- Focus on synonym substitutions and role/context variations (e.g. "budget" → "cost", "pricing"; "meeting" → "call", "sync", "discussion")
- Keep each phrasing short (3-6 words max)
- Return ONLY a JSON array of strings, e.g. ["alt phrasing 1", "alt phrasing 2"]`

  try {
    const raw = await llm.generateText(prompt, 80)
    const match = raw.match(/\[[\s\S]*?\]/)
    if (!match) return []
    const arr = JSON.parse(match[0])
    if (Array.isArray(arr)) return arr.filter((s: any) => typeof s === 'string').slice(0, 3)
  } catch { /* fall through */ }
  return []
}

// ─── Intent-based prompt instructions ────────────────────────────────────────
function buildDepthInstruction(intent: QueryIntent, dateRange: DateRange | null): string {
  switch (intent) {
    case 'history':
      return `FORMAT — Work Summary (past tense, completed/ongoing work):
- Open with one sentence: who the person is and what context they're working in (e.g. "Mike is handling data validation for the Goodwill client.")
- Use ## headers to group by project/area/theme
- Under each header: bullet what they DID — use past tense ("Mike updated the Excel formulas...", "Mike identified a 297-entry discrepancy...")
- Bold key outcomes and deliverables: **297-entry discrepancy identified**, **spreadsheet sent Mar 17**
- Add [n] citations after each fact
- End with ## Summary — 1-2 sentences on overall contribution/status
- Be exhaustive — list every piece of work found across all memories`

    case 'actions':
      return `FORMAT — Pending Action Items (open/incomplete tasks only):
- Open with one sentence: who owns these and from which meeting/note they came (e.g. "From the Goodwill Status Meeting on Mar 17, 2026 — Mike's open items:")
- Numbered list of ONLY pending/unresolved tasks — each item: **task description** — deadline if known [n]
- Do NOT list completed or already-delivered items
- If status is unclear, note it: (status unclear)
- End with a bold count: **X open items for Mike**
- Be exhaustive — list every unresolved action item, do not truncate`

    case 'temporal':
      return `FORMAT — Timeline:
- Open: "Here's what happened ${dateRange ? `during ${dateRange.label}` : ''}:"
- Chronological order — bold each date: "**Mon, Mar 24** — event [n]"
- Use ## DATE headers if multiple distinct days
- Include participants for each event`

    case 'entity':
      return `FORMAT — Entity Profile:
## Who They Are
[role, org, relationship — 1-3 sentences]
## Recent Interactions
[most recent first — bold the date, what was discussed]
## Decisions & Commitments
[what was agreed/decided/assigned — with date]
## Open Items
[anything pending with this person]
Cite [n] after each fact.`

    case 'synthesis':
      return `FORMAT — Synthesis:
- First line: who was involved and when (e.g. "Meeting with Brian Williams, Anjan, and Misha on Mon, Mar 16, 2026 [1]:")
- Use ## headers to group discussion points by theme
- Under each header: bullet every specific detail exhaustively — names, numbers, facts, decisions, outcomes
- Bold the most critical items: **audit target: 27th**
- Add [n] citation after key facts — do NOT repeat the date on every bullet (it is already in the first line)
- End with ## Key Takeaways — 2-3 sentences max, the most important outcomes
- Write every bullet — never truncate`

    case 'aggregation':
      return `FORMAT — Numerical Aggregation:
- Open with the direct answer bolded: **Total: $12,500** or **Count: 7 meetings**
- Show the breakdown line by line: each number, what it's for, date if known, [n] citation
- If summing: show the calculation explicitly — "$5,000 [1] + $3,500 [2] + $4,000 [3] = **$12,500**"
- If counting: list each item with date and [n]
- Note any ambiguities: different currencies, overlapping periods, unclear if same item counted twice
- End with a ## Notes line if any numbers seem inconsistent or partial`

    case 'factual':
    default:
      return `FORMAT — Direct Answer:
- Answer in 1-3 sentences, directly and precisely
- Quote exact values from the memory — never paraphrase
- Add [n] citation. Include date only if specifically relevant: "confirmed on Mar 24, 2026 [1]"`
  }
}

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const { userId, session } = await requireAuth()
    const userEmail = session?.user?.email || ''
    const { question, history, agentId } = await req.json() as { question: string; history?: ChatMessage[]; agentId?: string }

    if (!question) {
      return new Response(JSON.stringify({ error: 'question is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Enterprise audit: fire-and-forget, no-op for personal-only users.
    const reqMeta = extractRequestMeta(req)
    auditForAllUserOrgs(userId, userEmail, 'query', {
      resourceType: 'ask',
      ipAddress: reqMeta.ipAddress,
      userAgent: reqMeta.userAgent,
      metadata: { question: question.slice(0, 500), agentId: agentId || null },
    })

    // Agent query log — fire-and-forget so analytics has per-agent data.
    // We don't have the answer yet at this point; follow-up PATCH can attach
    // answer preview + latency. For the builder's immediate needs this is
    // enough to drive the "queries/day" sparkline.
    if (agentId) {
      ;(async () => {
        try {
          const agentRow = await db.query.agents.findFirst({ where: eq(schema.agents.id, agentId) })
          if (!agentRow) return
          await db.insert(schema.agentQueries).values({
            agentId,
            organizationId: agentRow.organizationId,
            userId,
            question: question.slice(0, 2000),
            sourceCount: 0,
          })
          await db.update(schema.agents)
            .set({ usageCount: (agentRow.usageCount || 0) + 1 })
            .where(eq(schema.agents.id, agentId))
        } catch (e) {
          console.error('[ask] agent_queries insert failed', e)
        }
      })()
    }

    // Enforce daily query limit for free users (shared with extension)
    const sub = await getUserSubscription(userId)
    if (!sub.isSmartActive) {
      const today = new Date().toISOString().slice(0, 10)
      const usage = await db.query.usageDaily.findFirst({
        where: and(eq(schema.usageDaily.userId, userId), eq(schema.usageDaily.date, today)),
      })
      const used = usage?.opsCount ?? 0
      if (used >= AI_QUERY_LIMIT) {
        const encoder = new TextEncoder()
        return new Response(encoder.encode(`You've used all ${AI_QUERY_LIMIT} free queries for today. Upgrade to Pro for unlimited queries, or come back tomorrow.\n\nFollow-up questions:\n- What does Pro include?\n- How do I upgrade?\n- When does my quota reset?\n\nOffers:\n- If you want, I can show you what Pro unlocks\n- Do you want me to help you make the most of your remaining queries?`), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
      await recordUsage(null, userId, 'registered', 'ai_query')
    }

    // Guardrails: handle off-topic questions without burning LLM tokens
    const lowerQ = question.toLowerCase().trim()
    const isMetaQuestion = /^(who are you|what are you|what api|what model|what llm|are you (gpt|claude|chatgpt|openai|anthropic)|what is reattend|how do you work|tell me about yourself)/i.test(lowerQ)
    if (isMetaQuestion) {
      const encoder = new TextEncoder()
      const metaAnswer = `I'm Reattend — your AI memory assistant. I help you recall, connect, and act on everything you've saved: meeting notes, decisions, action items, ideas, and more.

Here's what I can do:
- Answer questions about your saved memories with specific names, dates, and details
- Draft emails, briefs, and status updates based on your notes
- Track who said what, when, and what's still open
- Surface contradictions and risks across your meetings
- Prepare you for upcoming conversations

To get started, save a memory (meeting notes, a decision, a quick thought) and then ask me anything about it.

Follow-up questions:
- How do I save my first memory?
- What types of content can I save?
- Can you show me what you can do with a sample question?

Offers:
- If you want, I can walk you through adding your first memory
- Do you want me to show you what kinds of questions work best?`
      return new Response(encoder.encode(metaAnswer), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Get ALL workspaces this user belongs to (cross-workspace search)
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, userId),
    })
    const allWorkspaceIds = memberships.map(m => m.workspaceId)

    if (allWorkspaceIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No workspaces found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch workspace names for attribution
    const workspaces = await db.query.workspaces.findMany({
      where: inArray(schema.workspaces.id, allWorkspaceIds),
    })
    const wsNameMap = new Map(workspaces.map(ws => [ws.id, ws.name]))

    // Build search query from current question + recent conversation context
    const recentHistory = (history || []).slice(-6)
    const conversationContext = recentHistory
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ')
    const fullSearchText = `${conversationContext} ${question}`
    const keywords = extractKeywords(fullSearchText)

    // Extract any temporal range from the question
    const dateRange = extractDateRange(question)

    const llm = getAskLLM(userEmail)
    // Pre-answer LLM calls (intent, expansion, multi-hop, extraction, conflict
    // detection) were removed. On a self-hosted 32B model each call costs 3-5s,
    // making total answer time 60-120s. The model can infer intent, surface
    // conflicts, and extract facts from the answer prompt itself.
    // Keyword + vector retrieval is sufficient for finding relevant memories.

    // Fetch recent records across ALL workspaces
    const recentRecords = await db.query.records.findMany({
      where: and(
        inArray(schema.records.workspaceId, allWorkspaceIds),
        ne(schema.records.triageStatus, 'needs_review'),
      ),
      orderBy: desc(schema.records.createdAt),
      limit: 150,
    })

    // Full-text search via FTS5 (ranked, tokenized, fast at scale).
    // Falls back to LIKE queries if FTS5 is unavailable.
    let keywordRecords: typeof recentRecords = []
    if (ftsReady) {
      const ftsIds = searchFTS(question, allWorkspaceIds, 50)
      if (ftsIds.length > 0) {
        keywordRecords = await db.query.records.findMany({
          where: and(
            inArray(schema.records.id, ftsIds),
            ne(schema.records.triageStatus, 'needs_review'),
          ),
        })
      }
    } else if (keywords.length > 0) {
      const keywordConditions = keywords.flatMap(kw => [
        like(schema.records.title, `%${kw}%`),
        like(schema.records.summary, `%${kw}%`),
        like(schema.records.tags, `%${kw}%`),
        like(schema.records.content, `%${kw}%`),
      ])
      keywordRecords = await db.query.records.findMany({
        where: and(
          inArray(schema.records.workspaceId, allWorkspaceIds),
          ne(schema.records.triageStatus, 'needs_review'),
          or(...keywordConditions),
        ),
        limit: 50,
      })
    }

    // Merge: keyword + recent, deduplicated
    const seenIds = new Set<string>()
    const allRecordsUnfiltered: typeof recentRecords = []
    for (const r of [...keywordRecords, ...recentRecords]) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id)
        allRecordsUnfiltered.push(r)
      }
    }

    // Record-level RBAC: strip anything the user can't access (private records
    // of others, dept-scoped records outside their dept, etc.). This is the
    // critical layer — without it, Chat could leak restricted context.
    const accessCtx = await buildAccessContext(userId)
    const allowedIds = await filterToAccessibleRecords(
      accessCtx,
      allRecordsUnfiltered.map((r) => r.id),
    )
    let allRecords = allRecordsUnfiltered.filter((r) => allowedIds.has(r.id))

    // Agent scope enforcement. When an agentId is passed, the agent's
    // scopeConfig narrows retrieval further — the agent only sees memories
    // matching its types / department / tag filters. This is what makes
    // "HR Assistant" feel scoped; without it, every agent is identical.
    let agentSystemPrompt: string | null = null
    let agentName: string | null = null
    if (agentId) {
      const agentRow = await db.query.agents.findFirst({ where: eq(schema.agents.id, agentId) })
      if (agentRow && agentRow.status === 'active') {
        agentSystemPrompt = agentRow.systemPrompt
        agentName = agentRow.name
        const scopeRaw = agentRow.scopeConfig ? JSON.parse(agentRow.scopeConfig) : {}
        const allowedTypes: string[] | undefined = Array.isArray(scopeRaw.types) && scopeRaw.types.length ? scopeRaw.types : undefined
        const allowedDeptIds: string[] | undefined = Array.isArray(scopeRaw.departmentIds) && scopeRaw.departmentIds.length ? scopeRaw.departmentIds : undefined
        const allowedTags: string[] | undefined = Array.isArray(scopeRaw.tags) && scopeRaw.tags.length
          ? scopeRaw.tags.map((t: string) => String(t).toLowerCase())
          : undefined
        const allowedRecIds: string[] | undefined = Array.isArray(scopeRaw.recordIds) && scopeRaw.recordIds.length ? scopeRaw.recordIds : undefined

        if (allowedTypes || allowedDeptIds || allowedTags || allowedRecIds) {
          // Dept scope requires a workspace→dept map. Only hit the DB if needed.
          let wsDeptMap: Map<string, string | null> | null = null
          if (allowedDeptIds) {
            const wsIds = Array.from(new Set(allRecords.map((r) => r.workspaceId)))
            const links = wsIds.length
              ? await db.select({
                  workspaceId: schema.workspaceOrgLinks.workspaceId,
                  departmentId: schema.workspaceOrgLinks.departmentId,
                }).from(schema.workspaceOrgLinks).where(inArray(schema.workspaceOrgLinks.workspaceId, wsIds))
              : []
            wsDeptMap = new Map(links.map((l) => [l.workspaceId, l.departmentId]))
          }

          allRecords = allRecords.filter((r) => {
            if (allowedRecIds && !allowedRecIds.includes(r.id)) return false
            if (allowedTypes && !allowedTypes.includes(r.type)) return false
            if (allowedDeptIds && wsDeptMap) {
              const deptId = wsDeptMap.get(r.workspaceId)
              if (!deptId || !allowedDeptIds.includes(deptId)) return false
            }
            if (allowedTags) {
              try {
                const recTags: string[] = r.tags ? JSON.parse(r.tags) : []
                const lowered = recTags.map((t) => String(t).toLowerCase())
                if (!allowedTags.some((t) => lowered.includes(t))) return false
              } catch { return false }
            }
            return true
          })
        }
      }
    }

    // Extract proper nouns from the original question for entity-aware scoring
    const properNouns = extractProperNouns(question)

    // Score by keyword match
    const scored = allRecords.map(r => {
      const searchText = [r.title, r.summary || '', r.tags || '', r.content || ''].join(' ').toLowerCase()
      const titleLower = r.title.toLowerCase()

      let score = 0
      for (const kw of keywords) {
        if (titleLower.includes(kw)) score += 2
        else if (searchText.includes(kw)) score++
      }

      // Proper noun entity boost — with fuzzy name variant matching
      // Exact match: +10 title / +5 content. Variant match (Mike→Michael): +7 title / +3 content
      for (const pn of properNouns) {
        const variants = getNameVariants(pn)
        if (titleLower.includes(pn)) score += 10
        else if (variants.some(v => v !== pn && titleLower.includes(v))) score += 7
        else if (searchText.includes(pn)) score += 5
        else if (variants.some(v => v !== pn && searchText.includes(v))) score += 3
      }

      // Compressed summary boost — dense summaries are preferred over individual old records
      const rTags: string[] = JSON.parse(r.tags || '[]')
      if (rTags.includes('auto-compressed')) score += 4
      // Penalise individual records that have been compressed — their summary is more useful
      if (rTags.includes('compressed:source')) score = Math.max(0, score - 3)

      // Type boost
      if (lowerQ.includes('decision') && r.type === 'decision') score += 3
      if (lowerQ.includes('meeting') && r.type === 'meeting') score += 3
      if (lowerQ.includes('task') && r.type === 'tasklike') score += 3
      if (lowerQ.includes('idea') && r.type === 'idea') score += 3
      if (lowerQ.includes('insight') && r.type === 'insight') score += 3
      if (lowerQ.includes('board') && r.tags?.includes('board:')) score += 3

      // Recency boost
      if (/this week|today|recent|latest|last few/i.test(fullSearchText)) {
        const days = (Date.now() - new Date(r.createdAt).getTime()) / 86400000
        if (days < 7) score += 2
        if (days < 1) score += 1
      }

      // Temporal date range boost
      if (dateRange) {
        const recordDate = new Date(r.occurredAt || r.createdAt)
        if (recordDate >= dateRange.start && recordDate <= dateRange.end) {
          score += 8
        }
      }

      return { record: r, score }
    })

    // Semantic search across all workspaces
    // We embed only the current question — not full history context,
    // because conversation history dilutes the vector toward past topics.
    try {
      const queryVector = await llm.embed(question)

      let similarities: Array<{ recordId: string; sim: number }>
      if (vecLoaded) {
        // ANN search via sqlite-vec — O(log n) instead of O(n) full scan
        const wsSet = new Set(allWorkspaceIds)
        const rows = sqlite.prepare(`
          SELECT m.record_id, m.workspace_id, v.distance
          FROM vec_embeddings v
          JOIN vec_rowid_map m ON m.rowid = v.rowid
          WHERE v.embedding MATCH ?
            AND v.k = 50
          ORDER BY v.distance
        `).all(JSON.stringify(queryVector)) as Array<{ record_id: string; workspace_id: string; distance: number }>
        similarities = rows
          .filter(r => wsSet.has(r.workspace_id))
          .map(r => ({ recordId: r.record_id, sim: 1 - r.distance }))
          .filter(s => s.sim > 0.3)
          .slice(0, 10)
      } else {
        // Fallback: O(n) JS cosine scan
        const allEmbeddings = await db.query.embeddings.findMany({
          where: inArray(schema.embeddings.workspaceId, allWorkspaceIds),
        })
        similarities = allEmbeddings
          .map(emb => ({
            recordId: emb.recordId,
            sim: cosineSimilarity(queryVector, JSON.parse(emb.vector) as number[]),
          }))
          .filter(s => s.sim > 0.3)
          .sort((a, b) => b.sim - a.sim)
          .slice(0, 10)
      }

      // Boost records already in the candidate pool
      for (const s of similarities) {
        const existing = scored.find(x => x.record.id === s.recordId)
        if (existing) {
          existing.score += s.sim * 5
        }
      }

      // Add new candidates from semantic search that lie OUTSIDE the keyword/recent window.
      // This is critical at scale — older memories are invisible without this.
      const existingIds = new Set(scored.map(x => x.record.id))
      const newSemanticIds = similarities
        .filter(s => !existingIds.has(s.recordId))
        .map(s => s.recordId)
        .slice(0, 5)

      if (newSemanticIds.length > 0) {
        const newRecords = await Promise.all(
          newSemanticIds.map(id => db.query.records.findFirst({ where: eq(schema.records.id, id) }))
        )
        for (let j = 0; j < newRecords.length; j++) {
          const r = newRecords[j]
          if (!r) continue
          const s = similarities.find(x => x.recordId === r.id)!
          scored.push({ record: r, score: s.sim * 5 })
        }
      }
    } catch {
      // Embedding search failed, continue with keyword results
    }

    scored.sort((a, b) => b.score - a.score)

    // Relative score filter: when proper nouns exist, require records to score at least
    // 40% of the top record — this eliminates tangentially-related noise
    const topScore = scored[0]?.score ?? 0
    const minScore = properNouns.length > 0 ? Math.max(topScore * 0.4, 3) : 1
    // Step 1: widen retrieval to 30 candidates — reranker will narrow to 10.
    // Previously: sliced to 20 directly. The wider window catches records
    // that hybrid scoring ranked low but Claude Haiku will rank high.
    let candidates = scored
      .filter(s => s.score >= minScore)
      .slice(0, 30)
      .map(s => s.record)

    // Deduplicate by normalized title (prevents the same record appearing twice)
    const seenTitles = new Set<string>()
    candidates = candidates.filter(r => {
      const key = r.title.toLowerCase().replace(/\s+/g, ' ').trim()
      if (seenTitles.has(key)) return false
      seenTitles.add(key)
      return true
    })

    if (candidates.length === 0) candidates = allRecords.slice(0, 3)

    // Step 2: Claude Haiku rerank. Takes 30 → top 10 by actual semantic
    // relevance to the question. Falls back to hybrid order on any failure.
    let top = await rerankWithClaudeHaiku(
      question,
      candidates.map(r => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        content: r.content,
        type: r.type,
      })),
      10,
    ).then(ranked => {
      const byId = new Map(candidates.map(r => [r.id, r]))
      return ranked.map(r => byId.get(r.id)).filter((r): r is NonNullable<typeof candidates[number]> => !!r)
    }).catch(() => candidates.slice(0, 10))

    if (top.length === 0) {
      const encoder = new TextEncoder()
      return new Response(encoder.encode("You don't have any memories saved yet. Here's how to get started:\n\n1. Click **New Memory** in the top right to paste meeting notes, decisions, or ideas\n2. Connect your **Gmail**, **Google Calendar**, or **Slack** from Settings → Integrations to auto-import\n3. Use the **desktop app** to capture thoughts on the fly\n\nOnce you have a few memories saved, come back and ask me anything — I'll connect the dots across everything you've captured.\n\nFollow-up questions:\n- How do I connect my Gmail?\n- What kinds of content should I save?\n- Can you show me an example of what this looks like with real memories?\n\nOffers:\n- If you want, I can walk you through the setup process step by step\n- Do you want me to explain what types of questions work best?"), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    // Multi-hop, extraction, number, and conflict passes removed — too slow
    // on self-hosted 32B. The answer prompt handles these inline.

    // Fetch linked records across all workspaces
    const topIds = top.map(r => r.id)
    let linkedContext = ''
    try {
      const links = await db.query.recordLinks.findMany({
        where: and(
          inArray(schema.recordLinks.workspaceId, allWorkspaceIds),
          or(
            inArray(schema.recordLinks.fromRecordId, topIds),
            inArray(schema.recordLinks.toRecordId, topIds),
          ),
        ),
        limit: 15,
      })

      if (links.length > 0) {
        const linkedIds = new Set<string>()
        for (const link of links) {
          if (!topIds.includes(link.fromRecordId)) linkedIds.add(link.fromRecordId)
          if (!topIds.includes(link.toRecordId)) linkedIds.add(link.toRecordId)
        }

        const linkedRecords = linkedIds.size > 0
          ? await Promise.all(
              Array.from(linkedIds).slice(0, 5).map(id =>
                db.query.records.findFirst({ where: eq(schema.records.id, id) })
              )
            )
          : []

        const allById = new Map<string, { title: string; workspaceId: string }>()
        for (const r of [...top, ...linkedRecords.filter(Boolean)]) {
          if (r) allById.set(r.id, { title: r.title, workspaceId: r.workspaceId })
        }

        const connectionLines = links.slice(0, 8).map(link => {
          const from = allById.get(link.fromRecordId)?.title || 'Unknown'
          const to = allById.get(link.toRecordId)?.title || 'Unknown'
          const kind = link.kind.replace(/_/g, ' ')
          return `  "${from}" → [${kind}] → "${to}"${link.explanation ? ` (${link.explanation})` : ''}`
        })

        if (connectionLines.length > 0) {
          linkedContext = '\n\nConnections (knowledge graph):\n' + connectionLines.join('\n')
        }

        const extraRecords = linkedRecords.filter(Boolean).filter(r => r && !topIds.includes(r.id))
        if (extraRecords.length > 0) {
          linkedContext += '\n\nRelated memories:\n' + extraRecords.map(r => {
            const wsName = wsNameMap.get(r!.workspaceId) || 'Unknown'
            return `- [${r!.type}] ${r!.title} (from "${wsName}" workspace)${r!.summary ? ': ' + r!.summary.slice(0, 150) : ''}`
          }).join('\n')
        }
      }
    } catch {
      // Links query failed, continue without
    }

    // Entity profiles (fast DB lookup, no LLM call)
    let entityProfileContext = ''
    try {
      const allProfiles = await db.query.entityProfiles.findMany({
        where: inArray(schema.entityProfiles.workspaceId, allWorkspaceIds),
      })
      const questionLower = question.toLowerCase()
      const profilesResult = allProfiles.filter(ep => {
        if (!ep.summary || ep.summary.length <= 10) return false
        const variants = getNameVariants(ep.entityName)
        return variants.some(v => questionLower.includes(v))
      })
      if (profilesResult.length > 0) {
        entityProfileContext = '\n\nENTITY PROFILES:\n'
          + profilesResult.map(ep => `[${ep.entityName}] (${ep.entityType}): ${ep.summary}`).join('\n')
      }
    } catch { /* continue without profiles */ }

    // Strip markdown formatting from content before injecting into LLM prompt.
    // Meeting transcripts and notes often contain ## headers and **bold** — if passed
    // verbatim the model tends to reproduce them instead of synthesising.
    const stripMarkdown = (text: string) =>
      text
        .replace(/^#{1,6}\s+/gm, '')          // ## Section headers
        .replace(/\*\*([^*]+)\*\*/g, '$1')    // **bold**
        .replace(/\*([^*]+)\*/g, '$1')         // *italic*
        .replace(/^\s*[-*]\s+/gm, '• ')        // list markers → bullet
        .replace(/\n{3,}/g, '\n\n')            // excessive blank lines
        .trim()

    // Build main context with attribution (who saved each memory)
    const hasMultipleWorkspaces = allWorkspaceIds.length > 1
    // Look up creator names for attribution in team workspaces
    const creatorIds = Array.from(new Set(top.map(r => r.createdBy).filter(Boolean)))
    const creatorMap = new Map<string, string>()
    if (creatorIds.length > 0) {
      const creators = await Promise.all(
        creatorIds.map(id => db.query.users.findFirst({ where: eq(schema.records.id, id as string) }))
      )
      creators.forEach((u, i) => {
        if (u && 'name' in u) creatorMap.set(creatorIds[i]!, (u as any).name || (u as any).email || 'Unknown')
      })
    }

    const context = top.map((r, i) => {
      const isBoard = r.tags?.includes('board:')
      const typeLabel = (isBoard ? `${r.type}/board` : r.type).toUpperCase()
      const wsName = wsNameMap.get(r.workspaceId) || 'Unknown'
      const wsLabel = hasMultipleWorkspaces ? ` · ${wsName}` : ''
      const dateStr = formatDate(r.occurredAt || r.createdAt)
      const dateLine = dateStr ? `\nDate: ${dateStr}` : ''
      const savedBy = r.createdBy && creatorMap.get(r.createdBy)
        ? `\nSaved by: ${creatorMap.get(r.createdBy)}`
        : ''

      const summaryLine = r.summary ? `\nSummary: ${stripMarkdown(r.summary).slice(0, 800)}` : ''
      const contentLine = r.content
        ? `\nContent: ${stripMarkdown(r.content).slice(0, 1500)}`
        : ''
      return `[${i + 1}] ${typeLabel}: ${r.title}${wsLabel}${dateLine}${savedBy}${summaryLine}${contentLine}`
    }).filter(Boolean).join('\n\n---\n\n')

    // Conversation history for follow-ups. GCP has no proxy timeout so we
    // can afford richer context. Cap assistant turns at 800 chars.
    const isFollowUp = recentHistory.length > 0
    const historyText = isFollowUp
      ? '\n\nCONVERSATION SO FAR (for context only — do NOT continue the previous answer):\n' + recentHistory.map(m =>
          m.role === 'user'
            ? `User: ${m.content}`
            : `Assistant: ${m.content.slice(0, 800)}${m.content.length > 800 ? '…' : ''}`
        ).join('\n') + '\n\nIMPORTANT: The user is now asking a NEW question. Give a COMPLETE, STANDALONE answer. Do NOT continue or extend the previous response. Start fresh.'
      : ''

    const wsInstruction = hasMultipleWorkspaces
      ? '\n- When a memory is from a specific workspace, attribute it: "In your [Workspace] workspace, ..."'
      : ''

    // Persona block: if an agent was passed, its systemPrompt replaces the
    // generic Reattend persona. The "Use only the memories below + cite [1]"
    // rules remain fixed — they're the safety layer, not the persona.
    const persona = agentSystemPrompt
      ? `${agentSystemPrompt}\n\n(You are running as the "${agentName}" agent. Your knowledge is scoped to the memories below, which may be a filtered subset of the org's full memory.)`
      : `You are Reattend — the user's AI memory assistant. You have perfect recall of everything they've saved. You're a sharp, knowledgeable colleague who thinks strategically.

WHAT YOU CAN DO:
- Answer questions about their memories with specific names, dates, and numbers
- Draft emails, briefs, summaries, and presentations based on their saved content
- Trace how decisions evolved over time across multiple meetings
- Surface contradictions, risks, and forgotten commitments
- Prepare them for upcoming meetings by synthesizing relevant context
- Reformat or restructure previous answers ("make that into bullet points", "draft that as an email to the CEO")
- Connect dots across different memories that the user might not see`

    const prompt = `${persona}

RULES:
- Use ONLY the memories below. Never invent facts. Cite sources inline as [1], [2], [3].
- Be specific: quote exact names, dates, numbers as written in the memories.
- Write in clear, natural prose. No markdown headers.
- If something isn't in the memories, say "I don't have this saved yet."
- When asked to draft/create something (email, brief, presentation), use the memories as source material and produce a polished output.
- For follow-up questions, give a complete standalone answer — never a fragment.${wsInstruction}
${entityProfileContext}
MEMORIES:
${context}${linkedContext}
${historyText}

USER QUESTION: ${question}

ANSWER:

After your answer, write EXACTLY these two sections:

Follow-up questions:
- (a question that digs deeper into something you surfaced)
- (a question connecting this to other memories)
- (a forward-looking question about next steps or risks)

Offers:
- If you want, I can [concrete action — draft an email, create a brief, map out a timeline, etc.]
- Do you want me to [another concrete action tied to the memories]`

    const stream = await llm.generateTextStream(prompt)

    // Escape non-ASCII so the header stays within Latin-1 (HTTP header requirement)
    const escapeHeaderValue = (s: string) => s.replace(/[\u0080-\uffff]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
    const sourcesJson = escapeHeaderValue(JSON.stringify(top.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      workspace: wsNameMap.get(r.workspaceId) || 'Personal',
      date: formatDate(r.occurredAt || r.createdAt),
    }))))

    // Reasoning trace — the visible "Claude is thinking" ticker on the client.
    // Each step carries a label and the metric that made it interesting. The
    // client animates through these in order (they already ran; this is
    // pedagogical replay, not live events — but it feels live and it's honest).
    const traceJson = escapeHeaderValue(JSON.stringify({
      steps: [
        { id: 'keywords', label: 'Extracted keywords from your question', count: keywords.length, detail: keywords.slice(0, 6).join(', ') },
        { id: 'candidates', label: 'Searched memories across every workspace you can see', count: allRecordsUnfiltered.length },
        { id: 'rbac', label: 'Applied record-level visibility (privacy filter)', count: allRecords.length, detail: `${allRecordsUnfiltered.length - allRecords.length} hidden` },
        { id: 'scoped', label: agentSystemPrompt ? `Scoped to ${agentName || 'agent'}` : 'No agent scoping', count: allRecords.length, skipAnimate: !agentSystemPrompt },
        { id: 'scored', label: 'Scored by keyword + recency + workspace relevance', count: scored.length },
        { id: 'reranked', label: 'Re-ranked top 30 with Claude Haiku', count: Math.min(candidates.length, 30) },
        { id: 'selected', label: 'Selected final memories to answer from', count: top.length },
      ],
      question,
      agentId: agentId || null,
      agentName: agentName || null,
    }))

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Trace': traceJson,
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
        'X-Sources': sourcesJson,
        'Access-Control-Expose-Headers': 'X-Sources, X-Trace',
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
