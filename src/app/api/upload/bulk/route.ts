import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { enqueueJob, processAllPendingJobs } from '@/lib/jobs/worker'

const MAX_FILES = 50
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file

// Bulk upload: accepts multiple text/markdown/csv files
// Used for Obsidian vault import, Read.ai transcript batch, etc.
export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireAuth()
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    const projectId = formData.get('project_id') as string | null

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Max ${MAX_FILES} files per upload` }, { status: 400 })
    }

    const targetProjectId = projectId || (await db.query.projects.findFirst({
      where: and(
        eq(schema.projects.workspaceId, workspaceId),
        eq(schema.projects.isDefault, true),
      ),
    }))?.id

    const results: Array<{ fileName: string; status: 'saved' | 'skipped' | 'error'; error?: string }> = []

    for (const file of files) {
      try {
        if (file.size > MAX_FILE_SIZE) {
          results.push({ fileName: file.name, status: 'skipped', error: 'File too large (max 10MB)' })
          continue
        }

        // Only accept text-based files for bulk
        if (!file.type.startsWith('text/') && file.type !== 'application/json' && !file.name.endsWith('.md') && !file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
          results.push({ fileName: file.name, status: 'skipped', error: 'Only text, markdown, CSV, and JSON files supported for bulk upload' })
          continue
        }

        const text = await file.text()
        if (text.trim().length < 20) {
          results.push({ fileName: file.name, status: 'skipped', error: 'File too short' })
          continue
        }

        const ext = file.name.split('.').pop() || ''
        const title = file.name.replace(`.${ext}`, '')
        const content = `[Imported: ${file.name}]\n\n${text}`.slice(0, 50000)

        const recordId = crypto.randomUUID()
        await db.insert(schema.records).values({
          id: recordId,
          workspaceId,
          type: 'note',
          title,
          summary: text.slice(0, 200),
          content,
          confidence: 0.5,
          tags: JSON.stringify([`file:${ext}`, 'imported']),
          triageStatus: 'auto_accepted',
          createdBy: userId,
        })

        if (targetProjectId) {
          await db.insert(schema.projectRecords).values({ projectId: targetProjectId, recordId })
        }

        await enqueueJob(workspaceId, 'ingest', { recordId, content })
        results.push({ fileName: file.name, status: 'saved' })
      } catch (e: any) {
        results.push({ fileName: file.name, status: 'error', error: e.message })
      }
    }

    // Kick worker to process all enqueued jobs
    processAllPendingJobs().catch(console.error)

    const saved = results.filter(r => r.status === 'saved').length
    return NextResponse.json({ saved, total: files.length, results })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
