import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { db, schema } from '@/lib/db'
import { eq } from 'drizzle-orm'
import {
  requireOrgAuth,
  isAuthResponse,
  auditFromAuth,
  handleEnterpriseError,
} from '@/lib/enterprise'
import { processOcrJob } from '@/lib/enterprise/ocr/worker'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 min — tesseract on 10+ images per batch

const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'ocr-uploads')

// Ensure the upload dir exists. Single call at route-module load.
try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }) } catch { /* exists */ }

// POST /api/enterprise/ocr/batch (multipart/form-data)
// Fields:
//   orgId     — required
//   files     — multi-file upload
//   language  — optional tesseract lang code (default 'eng')
//
// Admin-only. Accepts up to 20 files per batch (tesseract is slow — larger
// batches split across calls). Each file saved to disk, ocr_jobs row
// created, processing fired asynchronously so the request returns quickly.

const MAX_FILES = 20
const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25MB per file

export async function POST(req: NextRequest) {
  try {
    // Parse form data
    const form = await req.formData()
    const orgId = (form.get('orgId') as string) || ''
    const language = ((form.get('language') as string) || 'eng').slice(0, 8)
    if (!orgId) return NextResponse.json({ error: 'orgId required' }, { status: 400 })

    const auth = await requireOrgAuth(req, orgId, 'org.members.manage')
    if (isAuthResponse(auth)) return auth

    const files = form.getAll('files').filter((f): f is File => f instanceof File)
    if (files.length === 0) return NextResponse.json({ error: 'no files' }, { status: 400 })
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `max ${MAX_FILES} files per batch` }, { status: 413 })
    }

    // Resolve a workspace to attach to (first linked)
    const link = await db.select()
      .from(schema.workspaceOrgLinks)
      .where(eq(schema.workspaceOrgLinks.organizationId, orgId))
      .limit(1)
    const workspaceId = link[0]?.workspaceId
    if (!workspaceId) {
      return NextResponse.json({ error: 'no workspace linked to org' }, { status: 400 })
    }

    const batchId = crypto.randomUUID()
    const createdJobs: Array<{ id: string; fileName: string }> = []
    const skipped: string[] = []

    for (const file of files) {
      if (file.size === 0) { skipped.push(`${file.name}: empty`); continue }
      if (file.size > MAX_FILE_BYTES) { skipped.push(`${file.name}: too big`); continue }
      const mime = file.type || 'application/octet-stream'
      // Allowed types: images + PDF + text
      if (!/^(image\/|application\/pdf|text\/)/.test(mime)) {
        skipped.push(`${file.name}: unsupported type`)
        continue
      }

      const jobId = crypto.randomUUID()
      const buf = Buffer.from(await file.arrayBuffer())
      fs.writeFileSync(path.join(UPLOAD_DIR, jobId), buf)

      await db.insert(schema.ocrJobs).values({
        id: jobId,
        organizationId: orgId,
        workspaceId,
        fileName: file.name.slice(0, 200),
        fileSize: file.size,
        mimeType: mime,
        language,
        status: 'pending',
        createdBy: auth.userId,
        batchId,
      })
      createdJobs.push({ id: jobId, fileName: file.name })
    }

    auditFromAuth(auth, 'create', {
      resourceType: 'ocr_batch',
      resourceId: batchId,
      metadata: { batchSize: createdJobs.length, skipped: skipped.length, language },
    })

    // Fire processing in the background — don't await. Each job updates its
    // own row as it progresses. UI polls /api/enterprise/ocr/jobs to track.
    ;(async () => {
      for (const j of createdJobs) {
        try {
          await processOcrJob({
            jobId: j.id,
            filePath: path.join(UPLOAD_DIR, j.id),
            language,
          })
        } catch (err) {
          console.warn('[ocr batch worker]', err)
        }
      }
    })().catch((e) => console.error('[ocr batch async]', e))

    return NextResponse.json({
      batchId,
      queued: createdJobs.length,
      skipped,
      jobs: createdJobs,
    }, { status: 201 })
  } catch (err) {
    return handleEnterpriseError(err)
  }
}
