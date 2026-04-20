import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import { enqueueJob, processAllPendingJobs } from '@/lib/jobs/worker'
import path from 'path'
import fs from 'fs'

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads')
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/plain',
  'text/markdown',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
])

async function extractText(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ verbosity: 0, data: new Uint8Array(buffer) })
    const result = await parser.getText()
    return result.pages.map((p: any) => p.text).join('\n\n') || ''
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  }

  if (mimeType.startsWith('text/')) {
    return buffer.toString('utf-8')
  }

  if (mimeType.startsWith('image/')) {
    return `[Image file: ${fileName}]`
  }

  return `[Document: ${fileName}]`
}

// POST /api/upload — upload a file, extract text, create a memory record
export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireAuth()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const projectId = formData.get('project_id') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type) && !file.type.startsWith('text/')) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 })
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Save file to disk
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true })
    }

    const fileId = crypto.randomUUID()
    const ext = path.extname(file.name) || ''
    const storedName = `${fileId}${ext}`
    const filePath = path.join(UPLOADS_DIR, storedName)
    fs.writeFileSync(filePath, buffer)

    // Extract text from document
    let extractedText = ''
    try {
      extractedText = await extractText(buffer, file.type, file.name)
    } catch (e) {
      console.error('Text extraction failed:', e)
      extractedText = `[Could not extract text from ${file.name}]`
    }

    // Truncate for AI processing (keep first 8000 chars for triage)
    const textForAI = extractedText.slice(0, 8000)
    const contentWithMeta = `[Uploaded file: ${file.name}]\n\n${extractedText}`

    // Save immediately with defaults — AI enrichment runs in background
    const title = file.name.replace(ext, '')
    const fileTags = [`file:${ext.replace('.', '')}`, 'attachment']

    const recordId = crypto.randomUUID()
    await db.insert(schema.records).values({
      id: recordId,
      workspaceId,
      type: 'note',
      title,
      summary: extractedText.slice(0, 200),
      content: contentWithMeta,
      confidence: 0.5,
      tags: JSON.stringify(fileTags),
      triageStatus: 'auto_accepted',
      createdBy: userId,
    })

    // Create attachment entry
    await db.insert(schema.attachments).values({
      id: fileId,
      workspaceId,
      recordId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      filePath: storedName,
      createdBy: userId,
    })

    // Assign to project
    const targetProjectId = projectId || (await db.query.projects.findFirst({
      where: and(
        eq(schema.projects.workspaceId, workspaceId),
        eq(schema.projects.isDefault, true),
      ),
    }))?.id

    if (targetProjectId) {
      await db.insert(schema.projectRecords).values({
        projectId: targetProjectId,
        recordId,
      })
    }

    // Fetch record to return immediately
    const record = await db.query.records.findFirst({
      where: eq(schema.records.id, recordId),
    })

    const attachment = await db.query.attachments.findFirst({
      where: eq(schema.attachments.id, fileId),
    })

    // Enqueue AI enrichment via job queue (Groq primary, retries on failure)
    if (textForAI.trim().length > 10) {
      await enqueueJob(workspaceId, 'ingest', { recordId, content: contentWithMeta })
      processAllPendingJobs().catch(e => console.error('[upload] worker kick failed:', e))
    }

    return NextResponse.json({ record, attachment })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
