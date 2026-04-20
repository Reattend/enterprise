import { NextRequest, NextResponse } from 'next/server'
import { getLLM } from '@/lib/ai/llm'
import { PROMPTS } from '@/lib/ai/prompts'
import { triageResultSchema } from '@/lib/ai/agents'

// Rate limiter: 5 requests per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return true
  }

  if (entry.count >= 5) return false

  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You can analyze up to 5 notes per hour.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const text = body?.text

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required.' }, { status: 400 })
    }

    if (text.length < 20) {
      return NextResponse.json({ error: 'Please enter at least 20 characters.' }, { status: 400 })
    }

    if (text.length > 5000) {
      return NextResponse.json({ error: 'Text must be under 5000 characters.' }, { status: 400 })
    }

    const llm = getLLM()
    const prompt = PROMPTS.triage(text)
    const result = await llm.generateJSON(prompt, triageResultSchema)

    return NextResponse.json(result)
  } catch (err) {
    console.error('[demo/triage] Error:', err)
    return NextResponse.json(
      { error: 'AI analysis failed. Please try again.' },
      { status: 500 }
    )
  }
}
