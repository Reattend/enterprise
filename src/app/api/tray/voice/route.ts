import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { validateApiToken } from '@/lib/auth/token'
import { enqueueJob, processAllPendingJobs } from '@/lib/jobs/worker'
import { contentHash, findExactDuplicate } from '@/lib/ai/ingestion'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/tray/voice
// Extension / tray voice capture. Bearer token authed.
//
// Body: multipart/form-data with 'audio' file field + optional 'language'.
// Returns: { recordId, transcript }
//
// Flow:
//   1. Validate token → userId + workspaceId
//   2. Send audio bytes to Groq Whisper for transcription
//   3. Store the transcript as a memory record (source='voice-extension')
//   4. Enqueue ingest job for embedding + linking
//
// Why a separate route: /api/records/voice requires session auth. This route
// is for the Chrome extension + tray app (bearer token). They share the
// Whisper call path but not the auth layer.

export async function POST(req: NextRequest) {
  const authResult = await validateApiToken(req.headers.get('authorization'))
  if (!authResult) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { userId, workspaceId } = authResult

  const form = await req.formData()
  const audio = form.get('audio') as File | null
  const language = (form.get('language') as string) || ''
  const transcriptOnly = form.get('transcriptOnly') === '1'
  if (!audio) return NextResponse.json({ error: 'audio file required' }, { status: 400 })

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return NextResponse.json({ error: 'transcription not configured on server' }, { status: 503 })

  // ── Transcribe with Groq Whisper ──
  const upstreamForm = new FormData()
  upstreamForm.append('file', audio, audio.name || 'recording.webm')
  upstreamForm.append('model', 'whisper-large-v3-turbo')
  if (language) upstreamForm.append('language', language)
  upstreamForm.append('response_format', 'json')

  let transcript = ''
  try {
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: upstreamForm,
    })
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      return NextResponse.json({ error: `transcription failed: ${body.slice(0, 200)}` }, { status: 502 })
    }
    const data = await r.json()
    transcript = (data?.text || '').trim()
  } catch (err) {
    console.error('[tray/voice] whisper error', err)
    return NextResponse.json({ error: 'transcription failed' }, { status: 502 })
  }

  if (!transcript) {
    return NextResponse.json({ error: 'empty transcript — no speech detected' }, { status: 422 })
  }

  // Brain-dump flow — extension asks for transcript only, then paints it into a text UI
  if (transcriptOnly) {
    return NextResponse.json({ transcript })
  }

  // ── Store as a record ──
  const hash = contentHash(transcript)
  const dup = await findExactDuplicate(workspaceId, transcript)
  if (dup.hit) {
    return NextResponse.json({
      recordId: dup.existingRecordId,
      transcript,
      duplicate: true,
    })
  }

  const recordId = crypto.randomUUID()
  const title = transcript.slice(0, 80).replace(/\s+/g, ' ').trim()
  await db.insert(schema.records).values({
    id: recordId,
    workspaceId,
    type: 'transcript',
    title: title || 'Voice note',
    summary: transcript.slice(0, 240),
    content: transcript,
    confidence: 0.8,
    tags: JSON.stringify(['voice', 'extension']),
    triageStatus: 'auto_accepted',
    createdBy: userId,
    source: 'voice-extension',
    meta: JSON.stringify({ contentHash: hash, sourceClient: 'chrome-extension' }),
  })

  await enqueueJob(workspaceId, 'ingest', { recordId, content: transcript })
    .catch((e) => console.warn('[tray/voice] ingest enqueue failed', e))
  processAllPendingJobs().catch(() => { /* fire and forget */ })

  return NextResponse.json({ recordId, transcript })
}
