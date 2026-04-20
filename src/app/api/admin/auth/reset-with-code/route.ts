import { NextResponse } from 'next/server'

// Password reset removed — admin login is OTP-only
export async function POST() {
  return NextResponse.json({ error: 'Not available' }, { status: 410 })
}
