import { NextRequest } from 'next/server'

/**
 * POST /api/tray/proxy/chat-stream
 *
 * TRAY APP — DISABLED (Apr 2026). See /api/tray/proxy/triage/route.ts for the
 * full explanation.
 */
export async function POST(_req: NextRequest) {
  return Response.json(
    {
      error: 'tray_disabled',
      message: 'The Reattend tray app is paused. Use the web UI at reattend.com.',
    },
    { status: 503 },
  )
}
