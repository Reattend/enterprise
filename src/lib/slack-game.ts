import crypto from 'crypto'

// ─── Env ────────────────────────────────────────────────
export const SLACK_GAME_CLIENT_ID = process.env.SLACK_GAME_CLIENT_ID || ''
export const SLACK_GAME_CLIENT_SECRET = process.env.SLACK_GAME_CLIENT_SECRET || ''
export const SLACK_GAME_SIGNING_SECRET = process.env.SLACK_GAME_SIGNING_SECRET || ''

// ─── Request Verification ───────────────────────────────
export function verifySlackRequest(body: string, timestamp: string, signature: string): boolean {
  if (!SLACK_GAME_SIGNING_SECRET) return false

  // Reject requests older than 5 minutes
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 300) return false

  const sigBaseString = `v0:${timestamp}:${body}`
  const hmac = crypto.createHmac('sha256', SLACK_GAME_SIGNING_SECRET)
  hmac.update(sigBaseString)
  const computedSignature = `v0=${hmac.digest('hex')}`

  return crypto.timingSafeEqual(
    Buffer.from(computedSignature),
    Buffer.from(signature)
  )
}

// ─── Slack API helpers ──────────────────────────────────
export async function slackPost(method: string, token: string, body: Record<string, any>) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

// ─── Curated Prompts ────────────────────────────────────
export const PROMPTS = [
  'What did we decide in our last sync?',
  'What\'s the current top priority for the team?',
  'What was the biggest risk discussed recently?',
  'What change did we agree to make last week?',
  'Who\'s responsible for the most important open item?',
  'What did we say "no" to recently, and why?',
  'What\'s the status of the thing we said was urgent?',
  'What feedback did we get from users last week?',
  'What trade-off did we accept recently?',
  'What\'s blocking progress right now?',
  'What was the last thing we shipped?',
  'What did we agree to revisit later?',
]

// ─── Alignment Scoring ──────────────────────────────────
export function computeAlignment(answers: string[]): { score: 'Low' | 'Medium' | 'High'; detail: string } {
  if (answers.length < 2) return { score: 'High', detail: 'Not enough answers to compare.' }

  // Normalize answers for comparison
  const normalized = answers.map(a =>
    a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2)
  )

  // Calculate pairwise word overlap
  let totalOverlap = 0
  let pairCount = 0

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const setA = new Set(normalized[i])
      const setB = new Set(normalized[j])
      const intersection = Array.from(setA).filter(w => setB.has(w)).length
      const union = new Set(Array.from(setA).concat(Array.from(setB))).size
      const overlap = union > 0 ? intersection / union : 0
      totalOverlap += overlap
      pairCount++
    }
  }

  const avgOverlap = pairCount > 0 ? totalOverlap / pairCount : 0

  if (avgOverlap >= 0.35) {
    return { score: 'High', detail: `Your team's memories overlap significantly. Strong alignment.` }
  } else if (avgOverlap >= 0.15) {
    return { score: 'Medium', detail: `Some common ground, but notable differences in what people remember.` }
  } else {
    return { score: 'Low', detail: `Very different recollections. The same moment created different memories.` }
  }
}
