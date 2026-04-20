import { NextRequest } from 'next/server'

/**
 * POST /api/tray/proxy/transcribe-meeting
 *
 * TRAY APP — DISABLED (Apr 2026). See /api/tray/proxy/transcribe/route.ts.
 */
export async function POST(_req: NextRequest) {
  return Response.json(
    {
      error: 'tray_disabled',
      message: 'The Reattend tray app is paused. Meeting transcription is offline.',
    },
    { status: 503 },
  )
}
