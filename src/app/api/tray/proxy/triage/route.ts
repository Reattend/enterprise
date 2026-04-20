import { NextRequest } from 'next/server'

/**
 * POST /api/tray/proxy/triage
 *
 * TRAY APP — DISABLED (Apr 2026).
 *
 * The desktop tray app used to proxy triage requests to Groq for sub-second
 * latency. Reattend web is now 100% Rabbit v2.0 — no external LLMs anywhere.
 * The tray app has not yet been migrated to Rabbit because Rabbit's inference
 * latency (~6s on A40) doesn't meet the tray's "instant" UX requirements.
 *
 * TODO: rebuild tray app against a smaller/faster Rabbit variant once we
 * train one. Until then, this endpoint returns 503.
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
