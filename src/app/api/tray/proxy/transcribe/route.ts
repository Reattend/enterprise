import { NextRequest } from 'next/server'

/**
 * POST /api/tray/proxy/transcribe
 *
 * TRAY APP — DISABLED (Apr 2026). This used to proxy audio to Groq's Whisper
 * endpoint. Rabbit is text-only; audio transcription is a separate problem we
 * will address when we revisit the tray app. Until then, this endpoint
 * returns 503.
 */
export async function POST(_req: NextRequest) {
  return Response.json(
    {
      error: 'tray_disabled',
      message: 'The Reattend tray app is paused. Audio transcription is offline.',
    },
    { status: 503 },
  )
}
