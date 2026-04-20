import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth, checkAllowed, recordUsage, rateLimitResponse } from '@/lib/metering'
import { z } from 'zod'

const ocrSchema = z.object({
  image: z.string().min(100), // base64-encoded image
  app_name: z.string().optional().default('Unknown'),
})

/**
 * Server-side OCR endpoint for Windows desktop app.
 * Receives a base64-encoded screenshot, runs Tesseract, returns extracted text.
 *
 * macOS uses local Swift Vision — this is only needed for Windows.
 * Accepts both Bearer token and X-Device-Id (anonymous).
 */
export async function POST(req: NextRequest) {
  try {
    const { deviceId, userId, tier } = await resolveAuth(req.headers)

    if (!deviceId && !userId) {
      return NextResponse.json(
        { error: 'Authentication required. Send X-Device-Id or Bearer token.' },
        { status: 401 },
      )
    }

    const allowed = await checkAllowed(deviceId, userId, tier)
    if (!allowed.allowed) {
      return rateLimitResponse(tier, allowed.used, allowed.limit)
    }

    const body = await req.json()
    const parsed = ocrSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 })
    }

    const { image, app_name } = parsed.data

    // Decode base64 to buffer
    const imageBuffer = Buffer.from(image, 'base64')

    // Write to temp file for Tesseract
    const tmpPath = `/tmp/ocr-${Date.now()}.jpg`
    const { writeFile, unlink } = await import('fs/promises')
    await writeFile(tmpPath, imageBuffer)

    try {
      // Run Tesseract OCR
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      const { stdout } = await execAsync(
        `tesseract "${tmpPath}" stdout --psm 3 -l eng 2>/dev/null`,
        { timeout: 15000 }
      )

      const text = stdout.trim()
      const confidence = text.length > 20 ? 0.7 : 0.3

      await recordUsage(deviceId, userId, tier, 'ocr')

      return NextResponse.json({
        text,
        confidence,
        appName: app_name,
      })
    } finally {
      await unlink(tmpPath).catch(() => {})
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
