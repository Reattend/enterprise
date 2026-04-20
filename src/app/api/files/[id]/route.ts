import { NextRequest, NextResponse } from 'next/server'
import { db, schema } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth'
import path from 'path'
import fs from 'fs'

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads')

// GET /api/files/:id — download an attachment
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { workspaceId } = await requireAuth()
    const { id } = await params

    const attachment = await db.query.attachments.findFirst({
      where: and(
        eq(schema.attachments.id, id),
        eq(schema.attachments.workspaceId, workspaceId),
      ),
    })

    if (!attachment) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const filePath = path.join(UPLOADS_DIR, attachment.filePath)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File missing from storage' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.fileType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.fileName)}"`,
        'Content-Length': String(attachment.fileSize),
      },
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
