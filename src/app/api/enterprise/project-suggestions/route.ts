import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { handleEnterpriseError } from '@/lib/enterprise'
import { getAskLLM } from '@/lib/ai/llm'

// GET /api/enterprise/project-suggestions?workspaceId=...
// Returns AI-inferred project suggestions. Pipeline:
//   1. Gather workspace records not assigned to any non-default project
//   2. Cluster by shared tags + entity overlap (simple deterministic pass)
//   3. For each cluster with ≥ MIN_CLUSTER records, ask Claude to name it
//      with a short project name + one-line description
// POST accepts a suggestion → creates the project + assigns records.
//
// Demo-friendly threshold: 2 records is enough to suggest a cluster so
// thin seed data still produces visible output.

const MIN_CLUSTER = 2

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
    const workspaceId = req.nextUrl.searchParams.get('workspaceId')
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

    // Find the workspace's default project (the "Unassigned" bucket)
    const defaultProject = await db
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.workspaceId, workspaceId), eq(schema.projects.isDefault, true)))
      .limit(1)

    // Records in this workspace NOT assigned to any non-default project
    const allRecords = await db
      .select()
      .from(schema.records)
      .where(eq(schema.records.workspaceId, workspaceId))

    const assignments = allRecords.length
      ? await db
          .select()
          .from(schema.projectRecords)
          .where(inArray(schema.projectRecords.recordId, allRecords.map((r) => r.id)))
      : []

    // Non-default project IDs the records are already in
    const nonDefaultProjectIds = new Set<string>()
    if (defaultProject[0]) {
      const all = await db.select().from(schema.projects).where(eq(schema.projects.workspaceId, workspaceId))
      for (const p of all) if (!p.isDefault) nonDefaultProjectIds.add(p.id)
    }
    const assignedToNonDefault = new Set(
      assignments.filter((a) => nonDefaultProjectIds.has(a.projectId)).map((a) => a.recordId),
    )

    const unassigned = allRecords.filter((r) => !assignedToNonDefault.has(r.id))
    if (unassigned.length < MIN_CLUSTER) {
      return NextResponse.json({ suggestions: [], unassignedCount: unassigned.length })
    }

    // Cluster by shared tags (simplest pragmatic signal).
    const byTag = new Map<string, string[]>()
    for (const r of unassigned) {
      let tags: string[] = []
      try { tags = r.tags ? JSON.parse(r.tags) : [] } catch { /* ignore */ }
      for (const t of tags) {
        const list = byTag.get(t) ?? []
        list.push(r.id)
        byTag.set(t, list)
      }
    }

    // Build raw tag clusters with >= MIN_CLUSTER records
    interface RawCluster { tag: string; recordIds: string[] }
    const raw: RawCluster[] = []
    const seen = new Set<string>()
    const sortedTags = Array.from(byTag.entries()).sort((a, b) => b[1].length - a[1].length)

    for (const [tag, recIds] of sortedTags) {
      if (recIds.length < MIN_CLUSTER) continue
      const fresh = recIds.filter((id) => !seen.has(id))
      if (fresh.length < MIN_CLUSTER) continue
      fresh.forEach((id) => seen.add(id))
      raw.push({ tag, recordIds: fresh })
      if (raw.length >= 5) break
    }

    // Fallback tag-case naming (instant, deterministic). Gets replaced by
    // Claude's naming below if the API key is available.
    const titleCase = (s: string) =>
      s.split(/[\s_-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

    interface Suggestion {
      tag: string
      recordCount: number
      sampleTitles: string[]
      suggestedName: string
      suggestedDescription?: string
      recordIds: string[]
      namedBy: 'llm' | 'heuristic'
    }

    const suggestions: Suggestion[] = raw.map((c) => {
      const recordsInCluster = unassigned.filter((r) => c.recordIds.includes(r.id))
      return {
        tag: c.tag,
        recordCount: c.recordIds.length,
        sampleTitles: recordsInCluster.slice(0, 3).map((r) => r.title),
        suggestedName: titleCase(c.tag),
        recordIds: c.recordIds,
        namedBy: 'heuristic' as const,
      }
    })

    // Try Claude for better names + descriptions — best effort, falls back
    // to heuristic on any failure so the UI always has something to show.
    if (suggestions.length > 0 && process.env.ANTHROPIC_API_KEY) {
      try {
        const llm = getAskLLM()
        const clusterSummaries = suggestions.map((s, i) => {
          const titles = unassigned
            .filter((r) => s.recordIds.includes(r.id))
            .slice(0, 6)
            .map((r) => `- ${r.title}`)
            .join('\n')
          return `Cluster ${i + 1}:\n${titles}`
        }).join('\n\n')

        const prompt = `You are helping an organization name project folders from clusters of related memories.
Given these ${suggestions.length} clusters of records, propose a short Project Name (3-5 words, Title Case) and a one-line description for each.

${clusterSummaries}

Reply with JSON only, shape:
[{"name":"...","description":"..."},{"name":"...","description":"..."}]
No prose, no markdown, no code fences. Exactly ${suggestions.length} items in order.`

        const fullPrompt = `You output terse, precise JSON only. No preamble.\n\n${prompt}`
        const response = await llm.generateText(fullPrompt, 600)

        const jsonMatch = response.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const named = JSON.parse(jsonMatch[0]) as Array<{ name?: string; description?: string }>
          named.forEach((n, i) => {
            if (suggestions[i] && n?.name) {
              suggestions[i].suggestedName = n.name
              suggestions[i].suggestedDescription = n.description
              suggestions[i].namedBy = 'llm'
            }
          })
        }
      } catch {
        // Silent — heuristic names already populated
      }
    }

    return NextResponse.json({ suggestions, unassignedCount: unassigned.length })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}

// POST: accept a suggestion — creates a project + links records to it
export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const body = await req.json()
    const { workspaceId, name, recordIds, description } = body as {
      workspaceId?: string
      name?: string
      recordIds?: string[]
      description?: string
    }
    if (!workspaceId || !name || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json({ error: 'workspaceId, name, recordIds required' }, { status: 400 })
    }

    const projectId = crypto.randomUUID()
    const nowIso = new Date().toISOString()
    await db.insert(schema.projects).values({
      id: projectId,
      workspaceId,
      name: name.trim(),
      description: description || 'Auto-created from memory clustering.',
      isDefault: false,
      color: '#6366f1',
      createdAt: nowIso,
      updatedAt: nowIso,
    })

    for (const rid of recordIds) {
      // Best-effort: record may already be linked; ignore PK clashes silently
      try {
        await db.insert(schema.projectRecords).values({ projectId, recordId: rid })
      } catch { /* ignore duplicates */ }
    }

    return NextResponse.json({ projectId, recordCount: recordIds.length })
  } catch (err) {
    if ((err as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return handleEnterpriseError(err)
  }
}