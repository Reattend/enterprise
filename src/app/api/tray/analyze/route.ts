import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, inArray } from 'drizzle-orm'
import { validateApiToken } from '@/lib/auth/token'
import { getLLM } from '@/lib/ai/llm'
import { cosineSimilarity } from '@/lib/utils'

/**
 * Ambient Recall v3 — embed-first, then LLM gate WITH memory context.
 *
 * Old flow (broken): LLM guesses if recall needed → embed → find memories
 *   Problem: LLM can't detect contradictions without seeing the memories.
 *
 * New flow:
 *   1. Embed screen text → find similar memories (cheap, fast)
 *   2. If candidates found → LLM sees BOTH screen text AND memories
 *   3. LLM decides: contradiction? forgotten commitment? critical context?
 *   4. Only show popup if LLM says yes with specific reason
 *
 * This way the LLM can actually detect "user says Oct but memory says Sep."
 */

// Whitelist: apps that trigger ambient recall
const AMBIENT_APPS = [
  // Browsers — Gmail, Google Docs, Linear, etc. all run here
  'google chrome', 'chrome', 'safari', 'firefox', 'arc', 'brave',
  'microsoft edge', 'edge', 'opera', 'vivaldi',
  // Chat & meetings
  'slack', 'microsoft teams', 'zoom', 'discord', 'telegram', 'whatsapp',
  // Email
  'mail', 'outlook', 'spark', 'airmail', 'thunderbird',
  // Notes & docs
  'notes', 'obsidian', 'notion', 'bear', 'craft',
  'pages', 'microsoft word', 'google docs', 'textedit',
  // Spreadsheets & presentations
  'numbers', 'microsoft excel',
  'keynote', 'microsoft powerpoint',
  // Design
  'figma', 'sketch', 'miro',
  // PM tools
  'linear', 'jira', 'asana', 'trello', 'clickup', 'todoist', 'things',
  // Calendar
  'calendar', 'fantastical', 'reminders',
]

const SKIP = { related: [], context: null }

function isAmbientApp(appName: string): boolean {
  const lower = appName.toLowerCase()
  return AMBIENT_APPS.some(app => lower.includes(app))
}

function cleanScreenText(raw: string): string {
  const lines = raw.split('\n')
  const cleaned = lines.filter(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 3) return false
    if (/^[•·›>→←×✓✗⌘⇧⌥\s\-\|\/\\{}()\[\]]+$/.test(trimmed)) return false
    if (trimmed.length < 8 && !/[a-z]{3,}/i.test(trimmed)) return false
    if (/^(File|Edit|View|Window|Help|Terminal|Go|Run|Selection|Insert|Format|Tools|Debug)\s*$/.test(trimmed)) return false
    return true
  })
  return cleaned.join('\n').trim()
}

export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiToken(req.headers.get('authorization'))
    if (!auth) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const { screen_text, app_name } = await req.json() as {
      screen_text: string
      app_name?: string
    }

    if (!screen_text || screen_text.trim().length < 10) {
      return NextResponse.json(SKIP)
    }

    // Only whitelisted productivity apps trigger recall
    if (!app_name || !isAmbientApp(app_name)) {
      return NextResponse.json(SKIP)
    }

    const cleanedText = cleanScreenText(screen_text)
    if (cleanedText.split(/\s+/).length < 10) {
      return NextResponse.json(SKIP)
    }

    const text = cleanedText.slice(0, 2000)

    // Get ALL workspaces this user belongs to (cross-workspace recall)
    const memberships = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.userId, auth.userId),
    })
    const allWorkspaceIds = memberships.map(m => m.workspaceId)

    if (allWorkspaceIds.length === 0) {
      return NextResponse.json(SKIP)
    }

    // ─── Step 1: Embed screen text and find candidate memories (cheap + fast) ───
    let candidates: Array<{
      id: string
      type: string
      title: string
      summary: string | null
      similarity: number
    }> = []

    try {
      const llm = getLLM()
      const queryVector = await llm.embed(text)

      const allEmbeddings = await db.query.embeddings.findMany({
        where: inArray(schema.embeddings.workspaceId, allWorkspaceIds),
      })

      const similarities = allEmbeddings
        .map(emb => ({
          recordId: emb.recordId,
          sim: cosineSimilarity(queryVector, JSON.parse(emb.vector) as number[]),
        }))
        .filter(s => s.sim > 0.45)
        .sort((a, b) => b.sim - a.sim)
        .slice(0, 5)

      // Need at least one decent match to proceed
      if (similarities.length === 0 || similarities[0].sim < 0.50) {
        return NextResponse.json(SKIP)
      }

      for (const s of similarities) {
        const record = await db.query.records.findFirst({
          where: eq(schema.records.id, s.recordId),
        })
        if (record) {
          candidates.push({
            id: record.id,
            type: record.type,
            title: record.title,
            summary: record.summary,
            similarity: Math.round(s.sim * 100) / 100,
          })
        }
      }
    } catch {
      return NextResponse.json(SKIP)
    }

    if (candidates.length === 0) {
      return NextResponse.json(SKIP)
    }

    // ─── Step 2: LLM gate — now it sees BOTH screen text AND memories ───
    // This is where contradiction detection actually works
    const memorySummaries = candidates.map((c, i) =>
      `${i + 1}. [${c.type}] "${c.title}"${c.summary ? `: ${c.summary}` : ''}`
    ).join('\n')

    try {
      const llm = getLLM()
      const gatePrompt = `You decide whether to show a memory popup to a user. Interrupting is COSTLY — only do it when genuinely valuable.

WHAT THE USER IS CURRENTLY DOING (screen text from ${app_name}):
${text}

POTENTIALLY RELATED MEMORIES FROM THEIR PAST:
${memorySummaries}

Show the popup ONLY if one of these is true:
1. CONTRADICTION — The user is saying/writing something that CONFLICTS with what a memory records. Dates, facts, decisions, names that don't match. Example: screen says "October" but memory says "before September 15th."
2. FORGOTTEN COMMITMENT — The user is discussing a topic where a memory shows they have an unfulfilled promise, deadline, or action item they may have forgotten.
3. CRITICAL CONTEXT — The user is making a decision and a memory contains context that would materially change their decision if they knew it.

DO NOT show the popup if:
- The memories are just loosely related to the topic (same general area but no actionable insight)
- The user is casually chatting and the memories add nothing urgent
- The user clearly already knows the information in the memories
- Showing the popup would be annoying rather than helpful

Which memories (if any) should be shown, and why?

Respond with ONLY valid JSON:
{"show": false}
OR
{"show": true, "reason": "contradiction|forgotten_commitment|critical_context", "memory_indices": [1, 2], "context": "One sentence explaining the specific conflict or forgotten detail — be precise about what doesn't match or what they're forgetting"}`

      const result = await llm.generateText(gatePrompt)
      try {
        const parsed = JSON.parse(result)
        if (!parsed.show) {
          return NextResponse.json(SKIP)
        }

        // Filter to only the memories the LLM selected
        const selectedIndices = new Set(
          (parsed.memory_indices as number[]).map(i => i - 1) // 1-indexed → 0-indexed
        )
        const filtered = candidates.filter((_, i) => selectedIndices.has(i))
        const finalMemories = filtered.length > 0 ? filtered : candidates.slice(0, 2)

        return NextResponse.json({
          related: finalMemories.slice(0, 3),
          context: parsed.context || null,
        })
      } catch {
        // Bad JSON from LLM — skip rather than show noise
        return NextResponse.json(SKIP)
      }
    } catch {
      // LLM unavailable — skip
      return NextResponse.json(SKIP)
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
