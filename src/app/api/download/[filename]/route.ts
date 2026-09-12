import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { CHROME_WEB_STORE_URL } from '@/lib/extension'

// Desktop installers are no longer served (2026-09-12): the Mac build was
// signed but not notarized, and the Windows builds were unsigned. Serve a
// build here again only once it passes Gatekeeper / Authenticode checks.
const ALLOWED_FILES: Record<string, string> = {}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  // The extension is published on the Chrome Web Store (2026-09-12). The old
  // unpacked zip was an unreviewed build; send anyone holding that link to the
  // store instead of handing it out.
  if (filename === 'reattend-extension.zip') {
    return NextResponse.redirect(CHROME_WEB_STORE_URL, 301)
  }

  const mimeType = ALLOWED_FILES[filename]
  if (!mimeType) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const filePath = path.join(process.cwd(), 'public', 'downloads', filename)
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const fileBuffer = await readFile(filePath)

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': fileBuffer.length.toString(),
    },
  })
}
