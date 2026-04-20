import { NextResponse } from 'next/server'
import { clearAdminSession } from '@/lib/admin/auth'

export async function POST() {
  try {
    await clearAdminSession()
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
