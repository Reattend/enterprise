import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * GET /api/updater/:target/:arch/:current_version
 * Tauri updater endpoint. Returns update info if a newer version is available.
 * The update manifest is stored at data/updater/latest.json
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ target: string; arch: string; current_version: string }> }
) {
  const { target, arch, current_version } = await params

  console.log(`[Updater] Request: target=${target} arch=${arch} current_version=${current_version}`)

  const manifestPath = path.join(process.cwd(), 'data', 'updater', 'latest.json')

  if (!fs.existsSync(manifestPath)) {
    console.log('[Updater] No manifest file found')
    return new Response(null, { status: 204 })
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

    // Check if newer version exists
    if (manifest.version === current_version) {
      console.log(`[Updater] Already up to date: ${current_version}`)
      return new Response(null, { status: 204 })
    }

    // Find platform-specific update
    // Tauri v2 sends target in two formats: "windows" and "windows-x86_64"
    // Handle both: try "{target}-{arch}" first, then "{target}" directly (if target already includes arch)
    const platformKey = `${target}-${arch}`
    let platform = manifest.platforms?.[platformKey]
    if (!platform) {
      // target might already be "windows-x86_64" or "darwin-aarch64"
      platform = manifest.platforms?.[target]
    }

    if (!platform) {
      console.log(`[Updater] No platform match for key: ${platformKey} or ${target} (available: ${Object.keys(manifest.platforms || {}).join(', ')})`)
      return new Response(null, { status: 204 })
    }

    console.log(`[Updater] Serving update ${manifest.version} for ${platformKey}: ${platform.url}`)
    return Response.json({
      version: manifest.version,
      notes: manifest.notes || '',
      pub_date: manifest.pub_date || new Date().toISOString(),
      url: platform.url,
      signature: platform.signature,
    })
  } catch (e) {
    console.error('[Updater] Error:', e)
    return new Response(null, { status: 204 })
  }
}
