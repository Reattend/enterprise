import { db, schema, sqlite } from '../db'
import { eq, and, lt, inArray } from 'drizzle-orm'
import { runTriageAgent, runEmbeddingJob, runLinkingAgent, runIngestJob } from '../ai/agents'

type JobHandler = (payload: any, workspaceId: string) => Promise<string | undefined>

const handlers: Record<string, JobHandler> = {
  triage: async (payload, workspaceId) => {
    const result = await runTriageAgent(payload.rawItemId, workspaceId)
    return result.should_store ? `Stored: ${result.title}` : `Dropped: ${result.why_kept_or_dropped}`
  },
  // Ingest = full AI enrichment for a manually-created record. Previously this
  // was a fire-and-forget IIFE inside POST /api/records — moved here so it
  // retries on transient Rabbit failures (524s, timeouts) and so Agent Logs
  // actually shows something.
  ingest: async (payload, workspaceId) => {
    return await runIngestJob(payload.recordId, workspaceId, payload.content)
  },
  embed: async (payload, _workspaceId) => {
    await runEmbeddingJob(payload.recordId, _workspaceId, payload.suggestedLinks)
    return 'Embedding stored'
  },
  link: async (payload, workspaceId) => {
    await runLinkingAgent(payload.recordId, workspaceId, payload.suggestedLinks)
    return 'Links created'
  },
  project_suggest: async (_payload, _workspaceId) => {
    // TODO: implement project suggestion agent
    return undefined
  },
}

// ─── Config ──────────────────────────────────────────────
const JOB_DELAY_MS = 2_500
const JOB_TIMEOUT_MS = 180_000  // 3 min — Rabbit needs ~30-60s for triage, ~30-80s for linking
const STUCK_JOB_THRESHOLD_MS = 5 * 60 * 1_000   // 5 min
const PERIODIC_RETRY_MS = 30 * 60 * 1_000        // 30 min
const MAX_ATTEMPTS = 3

// ─── Helpers ─────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Job timed out after ${ms}ms`)), ms)
    ),
  ])
}

function isRateLimitError(e: any) {
  const m = e.message || ''
  return m.includes('429') || m.includes('rate limit') || m.includes('Rate limit') || m.includes('too many requests')
}

function isNetworkError(e: any) {
  const m = e.message || ''
  return m.includes('fetch failed') || m.includes('ECONNREFUSED') || m.includes('ETIMEDOUT')
    || m.includes('network') || e.cause?.code === 'ECONNREFUSED'
}

function isTimeoutError(e: any) {
  return (e.message || '').includes('timed out')
}

// ─── Cleanup old jobs ────────────────────────────────────
const JOB_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000  // 7 days
const CLEANUP_INTERVAL_MS = 60 * 60 * 1_000        // 1 hour
let lastCleanupAt = 0

async function cleanupOldJobs(): Promise<void> {
  // Gated to at most once per hour. The worker is re-entered often (every
  // cron tick, every POST /api/records, every tray capture); without the
  // gate this spammed pm2 logs with "Cleaned up..." lines every few seconds.
  const now = Date.now()
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return
  lastCleanupAt = now

  const cutoff = new Date(now - JOB_RETENTION_MS).toISOString()
  await db.delete(schema.jobQueue)
    .where(and(
      inArray(schema.jobQueue.status, ['completed', 'failed']),
      lt(schema.jobQueue.createdAt, cutoff),
    ))
  console.log('[Worker] Cleaned up completed/failed jobs older than 7 days')
}

// ─── Rescue stuck jobs ───────────────────────────────────
async function rescueStuckJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - STUCK_JOB_THRESHOLD_MS).toISOString()
  const stuck = await db.query.jobQueue.findMany({
    where: and(
      eq(schema.jobQueue.status, 'running'),
      lt(schema.jobQueue.startedAt, cutoff),
    ),
  })
  if (stuck.length === 0) return
  for (const job of stuck) {
    await db.update(schema.jobQueue)
      .set({ status: 'pending', error: 'Rescued: stuck in running state for >5 minutes' })
      .where(eq(schema.jobQueue.id, job.id))
  }
  console.log(`[Worker] Rescued ${stuck.length} stuck job(s)`)
}

// ─── Notify workspace on permanent failure ───────────────
async function notifyJobFailed(job: typeof schema.jobQueue.$inferSelect): Promise<void> {
  try {
    const members = await db.query.workspaceMembers.findMany({
      where: eq(schema.workspaceMembers.workspaceId, job.workspaceId),
    })
    for (const member of members) {
      await db.insert(schema.inboxNotifications).values({
        workspaceId: job.workspaceId,
        userId: member.userId,
        type: 'system',
        title: 'Some memories could not be processed',
        body: `A ${job.type} job failed after ${MAX_ATTEMPTS} attempts. Go to Settings → Agent Logs and click "Run Triage" to retry.`,
        objectType: 'job',
        objectId: job.id,
      })
    }
  } catch (e) {
    console.error('[Worker] Failed to create failure notification:', e)
  }
}

// ─── Process a single job ────────────────────────────────
export async function processNextJob(): Promise<boolean> {
  const job = await db.query.jobQueue.findFirst({
    where: eq(schema.jobQueue.status, 'pending'),
    orderBy: schema.jobQueue.createdAt,
  })
  if (!job) return false

  await db.update(schema.jobQueue)
    .set({ status: 'running', startedAt: new Date().toISOString(), attempts: job.attempts + 1 })
    .where(eq(schema.jobQueue.id, job.id))

  try {
    const handler = handlers[job.type]
    if (!handler) throw new Error(`Unknown job type: ${job.type}`)

    const payload = JSON.parse(job.payload)
    const summary = await withTimeout(handler(payload, job.workspaceId), JOB_TIMEOUT_MS)

    await db.update(schema.jobQueue)
      .set({
        status: 'completed',
        result: summary ? JSON.stringify({ summary }) : null,
        completedAt: new Date().toISOString(),
      })
      .where(eq(schema.jobQueue.id, job.id))

    return true
  } catch (error: any) {
    if (isRateLimitError(error)) {
      console.warn(`[Worker] Rate limited on job ${job.id} (${job.type}), backing off`)
      await db.update(schema.jobQueue)
        .set({ status: 'pending', error: `Rate limited: ${error.message}` })
        .where(eq(schema.jobQueue.id, job.id))
      await sleep(10_000)
      return true
    }

    if (isNetworkError(error) || isTimeoutError(error)) {
      const reason = isTimeoutError(error) ? 'Timed out' : 'Network error'
      console.warn(`[Worker] ${reason} on job ${job.id}, will retry`)
      await db.update(schema.jobQueue)
        .set({ status: 'pending', error: `${reason}: ${error.message}` })
        .where(eq(schema.jobQueue.id, job.id))
      return true
    }

    // Permanent or exhausted — fail after MAX_ATTEMPTS
    const shouldRetry = job.attempts < MAX_ATTEMPTS
    await db.update(schema.jobQueue)
      .set({ status: shouldRetry ? 'pending' : 'failed', error: error.message })
      .where(eq(schema.jobQueue.id, job.id))

    if (!shouldRetry) {
      console.error(`[Worker] Job ${job.id} (${job.type}) permanently failed after ${MAX_ATTEMPTS} attempts`)
      await notifyJobFailed(job)
    }

    return true
  }
}

// ─── Single worker lock ───────────────────────────────────
let workerRunning = false

// ─── Process all pending jobs ─────────────────────────────
export async function processAllPendingJobs(): Promise<number> {
  if (workerRunning) {
    console.log('[Worker] Already running, skipping concurrent call')
    return 0
  }
  workerRunning = true
  ensurePeriodicWorker()

  try {
    await rescueStuckJobs()
    await cleanupOldJobs()

    let processed = 0
    while (await processNextJob()) {
      processed++
      if (processed > 100) break
      await sleep(JOB_DELAY_MS)
    }
    return processed
  } finally {
    workerRunning = false
  }
}

// ─── Periodic idle retry (every 30 min) ──────────────────
let periodicStarted = false

export function ensurePeriodicWorker(): void {
  if (periodicStarted) return
  periodicStarted = true

  setInterval(async () => {
    const pending = await db.query.jobQueue.findFirst({
      where: eq(schema.jobQueue.status, 'pending'),
    })
    if (!pending) return
    console.log('[Worker] Periodic retry: found pending jobs, processing...')
    processAllPendingJobs().catch(console.error)
  }, PERIODIC_RETRY_MS)

  // Trial-expiry sweep (hourly): finds users whose trial has ended without a
  // Paddle subscription and bumps them down to Free. The lazy gate in
  // getOrCreateSubscription does the same on read, but a periodic sweep
  // ensures the row reflects reality even before the user next loads /app.
  // Also fires the trial-end follow-up emails (15-day warning, 7-day,
  // 1-day, and the post-downgrade "you're on Free now" note).
  setInterval(() => { trialMaintenanceTick().catch(err => console.error('[Worker] trial maintenance:', err)) }, 60 * 60 * 1000) // hourly

  console.log('[Worker] Periodic retry scheduler started (every 30 min)')
  console.log('[Worker] Trial maintenance + email cadence started (hourly)')
}

// ─── Trial maintenance: downgrades + reminder emails ────────────────────
// One hourly sweep handles both jobs since they look at the same column.
//
// Cadence (computed against trial_ends_at):
//   ~15 days remaining → "15 days left" reminder
//    ~7 days remaining → "1 week left" reminder
//    ~1 day  remaining → "Trial ends tomorrow" reminder
//   trial expired      → downgrade to Free + "You're on Free now" email
//
// The `meta` column on subscriptions holds a JSON `{ remindersSent: [..] }`
// array so we never email the same milestone twice. Without this, the
// hourly cron would re-fire at every tick once the user crossed a
// threshold.
async function trialMaintenanceTick(): Promise<void> {
  // Late import to avoid top-of-file cycle with email helpers that may
  // import from lib/db (worker → db, email → resend, etc.).
  const { sendTrialReminder, sendTrialEndedEmail } = await import('../email')

  const now = Date.now()
  const trialing = await db.query.subscriptions.findMany({
    where: and(
      inArray(schema.subscriptions.tier, ['professional', 'enterprise']),
    ),
    columns: { id: true, userId: true, tier: true, trialEndsAt: true, paddleSubscriptionId: true, meta: true },
  })

  const reminders: Array<{ id: string; userId: string; tier: 'professional' | 'enterprise'; daysLeft: number; expired: boolean }> = []
  for (const row of trialing) {
    if (!row.trialEndsAt) continue
    if (row.paddleSubscriptionId) continue // already paying — no nudge
    const ms = new Date(row.trialEndsAt).getTime() - now
    const daysLeft = Math.ceil(ms / (24 * 60 * 60 * 1000))
    if (ms < 0) {
      reminders.push({ id: row.id, userId: row.userId, tier: row.tier as any, daysLeft: 0, expired: true })
    } else if (daysLeft === 15 || daysLeft === 7 || daysLeft === 1) {
      reminders.push({ id: row.id, userId: row.userId, tier: row.tier as any, daysLeft, expired: false })
    }
  }

  for (const r of reminders) {
    const sub = trialing.find(t => t.id === r.id)
    if (!sub) continue
    const meta = parseMeta(sub.meta)
    const sentKey = r.expired ? 'ended' : `d${r.daysLeft}`
    if (meta.remindersSent && meta.remindersSent.includes(sentKey)) continue

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, r.userId),
      columns: { email: true, name: true },
    })
    if (!user?.email) continue
    const name = user.name || user.email.split('@')[0]

    try {
      if (r.expired) {
        await sendTrialEndedEmail({ toEmail: user.email, name, tier: r.tier })
      } else {
        await sendTrialReminder({ toEmail: user.email, name, tier: r.tier, daysLeft: r.daysLeft })
      }
      // Persist the milestone so we don't repeat.
      meta.remindersSent = [...(meta.remindersSent || []), sentKey]
      await db.update(schema.subscriptions)
        .set({ meta: JSON.stringify(meta), updatedAt: new Date().toISOString() })
        .where(eq(schema.subscriptions.id, r.id))
    } catch (err) {
      console.error(`[Worker] Failed to send ${sentKey} email to ${user.email}:`, err)
    }
  }

  // Then the actual downgrade (after we've sent the "ended" email).
  try {
    const result = sqlite
      .prepare(
        `UPDATE subscriptions
           SET tier = 'free',
               status = 'expired',
               seat_count = 1,
               updated_at = ?
         WHERE tier IN ('professional', 'enterprise')
           AND paddle_subscription_id IS NULL
           AND trial_ends_at IS NOT NULL
           AND trial_ends_at < ?`,
      )
      .run(new Date().toISOString(), new Date().toISOString())
    if (result.changes > 0) {
      console.log(`[Worker] Trial-expiry sweep: downgraded ${result.changes} expired trial(s) to Free`)
    }
  } catch (err) {
    console.error('[Worker] Trial-expiry downgrade failed:', err)
  }
}

interface SubMeta { remindersSent?: string[] }
function parseMeta(raw: string | null): SubMeta {
  if (!raw) return {}
  try { return JSON.parse(raw) as SubMeta } catch { return {} }
}

// ─── Triage new raw items ─────────────────────────────────
const MAX_TRIAGE_PER_RUN = 20

export async function processNewRawItems(): Promise<number> {
  const newItems = await db.query.rawItems.findMany({
    where: eq(schema.rawItems.status, 'new'),
    orderBy: schema.rawItems.createdAt,
    limit: MAX_TRIAGE_PER_RUN,
  })
  if (newItems.length === 0) return 0

  console.log(`[Worker] Triaging ${newItems.length} new raw item(s)`)
  let triaged = 0
  for (const item of newItems) {
    try {
      await runTriageAgent(item.id, item.workspaceId)
      triaged++
    } catch (e: any) {
      console.error(`[Worker] Triage failed for raw item ${item.id}:`, e.message)
    }
  }
  return triaged
}

// ─── Enqueue a job ────────────────────────────────────────
export async function enqueueJob(
  workspaceId: string,
  type: 'triage' | 'ingest' | 'embed' | 'link' | 'project_suggest',
  payload: Record<string, any>
) {
  await db.insert(schema.jobQueue).values({
    workspaceId,
    type,
    payload: JSON.stringify(payload),
  })
}
