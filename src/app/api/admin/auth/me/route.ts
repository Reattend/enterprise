import { NextResponse } from 'next/server'
import { requireAdminAuth } from '@/lib/admin/auth'

export async function GET() {
  try {
    const admin = await requireAdminAuth()
    return NextResponse.json({ admin })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
