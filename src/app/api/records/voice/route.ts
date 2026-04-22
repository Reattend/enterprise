import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'
import { requireAuth } from '@/lib/auth'
import { enqueueJob, processAllPendingJobs } from '@/lib/jobs/worker'
import {
  auditForAllUserOrgs,
  extractRequestMeta,
} from '@/lib/enterprise'
import { findExactDuplicate, contentHash } from '@/lib/ai/ingestion'

export const dynamic = 'force-dynamic'

// POST /api/records/voice
// multipart/form-data: { audio: File, projectId?: string }
//
// Transcribes via Groq Whisper (we already have GROQ_API_KEY), then lands the
// transcript as a record using the same pipeline as the text capture path
// (triage + embedding + linking all run via the 'ingest' job queue).
//
// Why Groq Whisper specifically: zero new API key needed on prod, and their
// whisper-large-v3-turbo is ~5x faster than OpenAI's — a 30-second voice memo
// transcribes in ~2 seconds. Critical for the "tap to capture, done" feel.
export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId, session } = await requireAuth()
    const userEmail = session?.user?.email || 'unknown'

    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      return NextResponse.json({
        error: 'Voice capture requires GROQ_API_KEY in server env.',
      }, { status: 503 })
    }

    const form = await req.formData()
    const audio = form.get('audio')
    const projectId = form.get('projectId')
    if (!audio || !(audio instanceof File)) {
      return NextResponse.json({ error: 'audio file required' }, { status: 400 })
    }
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'audio file too large (max 25MB)' }, { status: 400 })
    }

    // Forward straight to Groq's /audio/transcriptions (OpenAI-compatible).
    const groqForm = new FormData()
    groqForm.append('file', audio, audio.name || 'voice.webm')
    groqForm.append('model', 'whisper-large-v3-turbo')
    groqForm.append('response_format', 'verbose_json')
    groqForm.append('language', 'en')

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: groqForm,
    })
    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => '')
      console.error('[voice] Groq transcription failed', groqRes.status, errText.slice(0, 300))
      return NextResponse.json({
        error: `transcription failed (${groqRes.status})`,
      }, { status: 502 })
    }
    const transcription = await groqRes.json() as { text?: string; duration?: number }
    const transcript = (transcription.text || '').trim()
    if (!transcript) {
      return NextResponse.json({ error: 'empty transcript — try speaking louder or longer' }, { status: 422 })
    }

    // Brain-dump flow wants JUST the transcript text — it'll route the text
    // through Claude parsing before any records are created. Skip the full
    // record creation + ingest enqueue in that case.
    if (req.nextUrl.searchParams.get('transcriptOnly') === '1') {
      return NextResponse.json({ transcript, durationSec: transcription.duration ?? null })
    }

    // Dedup on transcript text within the workspace (rare for voice but cheap)
    const dup = await findExactDuplicate(workspaceId, transcript)
    if (dup.hit) {
      const existing = await db.query.records.findFirst({
        where: eq(schema.records.id, dup.existingRecordId),
      })
      return NextResponse.json({ record: existing, deduplicated: true, transcript })
    }

    const recordId = crypto.randomUUID()
    // Voice memos get a "🎤" prefix in the title so they're visually distinct
    // in the memory list until Claude re-titles them via triage.
    const title = `🎤 ${transcript.slice(0, 58).replace(/\s+/g, ' ')}`
    const hash = contentHash(transcript)

    await db.insert(schema.records).values({
      id: recordId,
      workspaceId,
      type: 'note',
      title,
      summary: transcript.slice(0, 200),
      content: transcript,
      confidence: 0.5,
      tags: '[]',
      triageStatus: 'auto_accepted',
      createdBy: userId,
      source: 'voice',
      meta: JSON.stringify({
        contentHash: hash,
        voice: true,
        durationSec: transcription.duration ?? null,
      }),
    })

    // Optional project link — same logic as the text path.
    if (projectId && typeof projectId === 'string') {
      await db.insert(schema.projectRecords).values({
        projectId,
        recordId,
      }).catch(() => { /* project may have been deleted; non-fatal */ })
    } else {
      const defaultProject = await db.query.projects.findFirst({
        where: and(
          eq(schema.projects.workspaceId, workspaceId),
          eq(schema.projects.isDefault, true),
        ),
      })
      if (defaultProject) {
        await db.insert(schema.projectRecords).values({
          projectId: defaultProject.id,
          recordId,
        }).catch(() => { /* non-fatal */ })
      }
    }

    const record = await db.query.records.findFirst({
      where: eq(schema.records.id, recordId),
    })

    // Queue triage so Claude retitles, extracts entities, links — same as text.
    await enqueueJob(workspaceId, 'ingest', { recordId, content: transcript })
    processAllPendingJobs().catch((e) => console.error('[voice] worker kick failed:', e))

    const reqMeta = extractRequestMeta(req)
    auditForAllUserOrgs(userId, userEmail, 'create', {
      resourceType: 'record',
      resourceId: recordId,
      ipAddress: reqMeta.ipAddress,
      userAgent: reqMeta.userAgent,
      metadata: { workspaceId, title, source: 'voice' },
    })

    return NextResponse.json({ record, transcript })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[voice]', error)
    return NextResponse.json({ error: error.message || 'failed' }, { status: 500 })
  }
}
