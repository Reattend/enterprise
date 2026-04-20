import { NextRequest, NextResponse } from 'next/server'
import { processAllPendingJobs } from '@/lib/jobs/worker'
import { requireAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const processed = await processAllPendingJobs()
    return NextResponse.json({ processed })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
