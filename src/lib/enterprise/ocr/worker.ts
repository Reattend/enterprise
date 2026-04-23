// OCR worker — extracts text from uploaded documents.
//
// v1 path: image files (PNG/JPG/TIFF/WEBP/BMP) → tesseract.js.
// v1 path: PDF with embedded text → pdf-parse.
// v1 limitation: scanned PDFs (no text layer) need rasterization first — we
//   defer per-page rasterization to post-launch. For now, those jobs land in
//   'needs_review' with a message, and the trainer re-uploads as images.
//
// For each job:
//   1. Load bytes from the stored file path
//   2. Extract text
//   3. Compute avg confidence (tesseract) or 1.0 (pdf-parse, deterministic)
//   4. Run PII redaction
//   5. Create memory record (visibility: dept if provided, else org)
//   6. Update job row with counts, status, resultRecordId
//
// Runs in Node only. NOT edge-safe. The API route spawns this via a
// process-local worker — not the existing jobQueue, because tesseract takes
// time and we want visible progress.

import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { redactPII } from './redact'

// Tesseract.js lazy import — heavy, don't eagerly load at module init
type TesseractWorker = any
let _tesseractMod: any = null
async function getTesseract() {
  if (!_tesseractMod) _tesseractMod = await import('tesseract.js')
  return _tesseractMod
}

const CONFIDENCE_FLOOR = 0.7 // pages below this → job status 'needs_review'

interface OcrJobRecord {
  id: string
  organizationId: string
  workspaceId: string
  fileName: string
  fileSize: number
  mimeType: string
  language: string
  createdBy: string
}

interface ProcessOpts {
  jobId: string
  filePath: string    // resolved local path to the uploaded file
  language?: string   // tesseract lang code (eng, spa, fra, etc.)
}

export async function processOcrJob(opts: ProcessOpts): Promise<void> {
  const { jobId, filePath } = opts
  const lang = opts.language || 'eng'

  // Load job row
  const row = await db.query.ocrJobs.findFirst({ where: eq(schema.ocrJobs.id, jobId) })
  if (!row) throw new Error(`OCR job ${jobId} not found`)
  if (row.status !== 'pending' && row.status !== 'failed') {
    // Idempotency — don't reprocess already-done jobs
    return
  }

  await db.update(schema.ocrJobs)
    .set({ status: 'processing', startedAt: new Date().toISOString() })
    .where(eq(schema.ocrJobs.id, jobId))

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`file missing: ${filePath}`)
    }
    const bytes = fs.readFileSync(filePath)
    const hash = createHash('sha256').update(bytes).digest('hex')

    let extractedText = ''
    let confidence = 1.0
    let pageCount = 1

    const mime = row.mimeType
    if (mime.includes('pdf')) {
      // Try text extraction first — works for native/editable PDFs
      try {
        const pdfMod = await import('pdf-parse')
        // Handle both CJS default and ESM shapes
        const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> =
          (pdfMod as any).default || (pdfMod as any).pdf || (pdfMod as any)
        const parsed = await pdfParse(bytes)
        extractedText = (parsed.text || '').trim()
        pageCount = parsed.numpages || 1
        confidence = extractedText.length > 20 ? 1.0 : 0.0
        if (extractedText.length < 20) {
          // Probably scanned PDF — no text layer.
          // v1 limitation: we don't rasterize. Flag for review.
          await db.update(schema.ocrJobs).set({
            status: 'needs_review',
            pageCount,
            avgConfidence: 0.0,
            extractedTextLength: extractedText.length,
            errorMessage: 'Scanned PDF without text layer. Re-upload as individual page images (PNG/JPG/TIFF) for OCR. Multi-page PDF rasterization is on the post-launch roadmap.',
            completedAt: new Date().toISOString(),
          }).where(eq(schema.ocrJobs.id, jobId))
          return
        }
      } catch (err) {
        throw new Error(`pdf parse failed: ${(err as Error).message}`)
      }
    } else if (mime.startsWith('image/') || /\.(png|jpg|jpeg|tif|tiff|webp|bmp)$/i.test(row.fileName)) {
      // Tesseract OCR. tesseract.js recognize() returns { data: { text, confidence, ... } }
      const tesseract = await getTesseract()
      const worker: TesseractWorker = await tesseract.createWorker(lang)
      try {
        const result = await worker.recognize(filePath)
        extractedText = (result?.data?.text || '').trim()
        // tesseract confidence is 0-100 in data.confidence
        confidence = typeof result?.data?.confidence === 'number'
          ? Math.max(0, Math.min(1, result.data.confidence / 100))
          : 0.0
        pageCount = 1
      } finally {
        await worker.terminate()
      }
    } else if (mime.startsWith('text/')) {
      // Plain text — no OCR needed
      extractedText = bytes.toString('utf-8')
      confidence = 1.0
      pageCount = 1
    } else {
      throw new Error(`unsupported mime type: ${mime}`)
    }

    if (extractedText.length < 10) {
      await db.update(schema.ocrJobs).set({
        status: 'needs_review',
        pageCount,
        avgConfidence: confidence,
        extractedTextLength: extractedText.length,
        sourceHash: hash,
        errorMessage: 'Extracted text too short — scan quality probably too low. Re-scan at higher DPI.',
        completedAt: new Date().toISOString(),
      }).where(eq(schema.ocrJobs.id, jobId))
      return
    }

    // PII redaction
    const redaction = redactPII(extractedText)

    // Create memory record
    const recordId = crypto.randomUUID()
    const summary = extractedText.slice(0, 240).replace(/\s+/g, ' ').trim()
    await db.insert(schema.records).values({
      id: recordId,
      workspaceId: row.workspaceId,
      type: 'context',
      title: row.fileName.replace(/\.[^.]+$/, ''),
      summary,
      content: redaction.text,
      confidence,
      ocrConfidence: confidence,
      tags: JSON.stringify(['ocr', 'scanned-doc']),
      triageStatus: confidence < CONFIDENCE_FLOOR ? 'needs_review' : 'auto_accepted',
      createdBy: row.createdBy,
      source: 'ocr',
      visibility: 'department',
      meta: JSON.stringify({
        ocrJobId: jobId,
        sourceFileName: row.fileName,
        sourceHash: hash,
        pageCount,
        redactionCounts: redaction.counts,
      }),
    })

    // Update the job row
    await db.update(schema.ocrJobs).set({
      status: confidence < CONFIDENCE_FLOOR ? 'needs_review' : 'completed',
      pageCount,
      avgConfidence: confidence,
      redactionCount: redaction.total,
      extractedTextLength: redaction.text.length,
      sourceHash: hash,
      resultRecordId: recordId,
      completedAt: new Date().toISOString(),
    }).where(eq(schema.ocrJobs.id, jobId))
  } catch (err) {
    console.error('[ocr-worker]', err)
    await db.update(schema.ocrJobs).set({
      status: 'failed',
      errorMessage: (err as Error).message?.slice(0, 500) || 'unknown error',
      completedAt: new Date().toISOString(),
    }).where(eq(schema.ocrJobs.id, jobId))
  }
}

// Process all pending jobs for an org in order. Not parallel — tesseract is
// memory-hungry; sequential keeps the droplet responsive.
export async function drainPendingOcrJobsForOrg(organizationId: string, uploadDir: string): Promise<number> {
  const pending = await db.select()
    .from(schema.ocrJobs)
    .where(eq(schema.ocrJobs.organizationId, organizationId))
    .limit(50)
  let processed = 0
  for (const job of pending) {
    if (job.status !== 'pending') continue
    const filePath = path.join(uploadDir, job.id)
    try {
      await processOcrJob({ jobId: job.id, filePath, language: job.language })
      processed += 1
    } catch (err) {
      console.warn('[ocr drain]', err)
    }
  }
  return processed
}
