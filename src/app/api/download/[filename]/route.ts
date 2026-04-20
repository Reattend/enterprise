import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const ALLOWED_FILES: Record<string, string> = {
  'Reattend_0.1.0_aarch64.dmg': 'application/x-apple-diskimage',
  'Reattend_0.1.0_x64-setup.exe': 'application/vnd.microsoft.portable-executable',
  'Reattend_x64-setup.exe': 'application/vnd.microsoft.portable-executable',
  'Reattend.dmg': 'application/x-apple-diskimage',
  'reattend-extension.zip': 'application/zip',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

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
