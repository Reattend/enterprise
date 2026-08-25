// BYOK resolver - decides which AI provider/key an org or user actually
// uses. This is the mechanism that stops the platform from silently
// footing everyone's AI bill: a free-tier org with no configured key gets
// a hard NoAIConfiguredError, not a fallback to the platform's own
// Anthropic key. Only Managed (paid) tiers get the platform key, and even
// then only up to the soft-cap gate in billing/gates.ts.
//
// Scope resolution (as of 2026-08-25 - Personal ripped out of the main
// flow, per-user override killed entirely, see today.md):
//   1. org default key   (organizationId set, userId NULL) - admin-only,
//      configured in the Control Room, invisible to regular members.
//      Subject to the admin's own rate limit (their vendor bill, not ours).
//   2. personal-mode key (organizationId NULL, userId set) - legacy only.
//      No new account can reach this path; it only serves accounts that
//      predate the 2026-08-25 change. Never rate-limited.
// There is no per-user override inside an org anymore. Don't add one back
// without checking today.md for why it was removed - "employees need not
// see the API part" was an explicit product call, not an oversight.

import { db, schema } from '@/lib/db'
import { and, eq, isNull } from 'drizzle-orm'
import { decryptSecret, encryptSecret, last4 } from '@/lib/security/crypto'
import {
  ClaudeProvider,
  OpenAIProvider,
  GeminiProvider,
  type LLMProvider,
} from './llm'

export type ByokProviderName = 'anthropic' | 'openai' | 'gemini'

export class NoAIConfiguredError extends Error {
  constructor(scope: 'org' | 'personal') {
    super(
      scope === 'org'
        ? 'This organization has no AI provider configured. An admin needs to connect an API key in the Control Room before AI features work.'
        : 'No AI provider configured. Connect an API key in Settings before AI features work.'
    )
    this.name = 'NoAIConfiguredError'
  }
}

export class RateLimitExceededError extends Error {
  constructor(resetAt: string) {
    super(`This organization has hit its admin-set AI usage limit for this month. Resets ${resetAt}.`)
    this.name = 'RateLimitExceededError'
  }
}

interface ResolvedKey {
  provider: ByokProviderName
  apiKey: string
}

async function findKeyRow(organizationId: string | null, userId: string | null) {
  const conditions = []
  conditions.push(
    organizationId ? eq(schema.aiProviderKeys.organizationId, organizationId) : isNull(schema.aiProviderKeys.organizationId)
  )
  conditions.push(
    userId ? eq(schema.aiProviderKeys.userId, userId) : isNull(schema.aiProviderKeys.userId)
  )
  return db.query.aiProviderKeys.findFirst({ where: and(...conditions) })
}

// Checks + increments the org key's admin-set monthly cap. No-op (always
// passes) if rateLimitPerMonth is null - unlimited is the default. Resets
// on calendar-month rollover, same pattern as subscriptions.aiQueriesThisMonth.
async function checkAndConsumeOrgKeyRateLimit(rowId: string, rateLimitPerMonth: number | null, queriesThisMonth: number, queriesResetAt: string | null): Promise<void> {
  if (rateLimitPerMonth === null) return

  const now = new Date()
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const lastResetMonth = queriesResetAt ? queriesResetAt.slice(0, 7) : ''
  const used = lastResetMonth === monthKey ? queriesThisMonth : 0

  if (used >= rateLimitPerMonth) {
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    throw new RateLimitExceededError(nextMonth.toISOString().slice(0, 10))
  }

  await db.update(schema.aiProviderKeys).set({
    queriesThisMonth: used + 1,
    queriesResetAt: now.toISOString(),
  }).where(eq(schema.aiProviderKeys.id, rowId))
}

// Looks up the org default key, or (no org context) the legacy personal
// key. Returns null if nothing is configured. Throws RateLimitExceededError
// if an org key's admin-set cap is hit - that's a real "can't proceed"
// state, not a "fall through to something else" state, so it's not encoded
// as a null return.
export async function resolveByokKey(opts: {
  organizationId?: string | null
  userId?: string | null
}): Promise<ResolvedKey | null> {
  const { organizationId = null, userId = null } = opts

  if (organizationId) {
    const orgDefault = await findKeyRow(organizationId, null)
    if (orgDefault) {
      await checkAndConsumeOrgKeyRateLimit(orgDefault.id, orgDefault.rateLimitPerMonth, orgDefault.queriesThisMonth, orgDefault.queriesResetAt)
      return { provider: orgDefault.provider as ByokProviderName, apiKey: decryptSecret({ ciphertext: orgDefault.encryptedKey, iv: orgDefault.keyIv }) }
    }
  }

  if (!organizationId && userId) {
    const personalKey = await findKeyRow(null, userId)
    if (personalKey) {
      return { provider: personalKey.provider as ByokProviderName, apiKey: decryptSecret({ ciphertext: personalKey.encryptedKey, iv: personalKey.keyIv }) }
    }
  }

  return null
}

export interface KeyStatus {
  provider: ByokProviderName
  keyLast4: string
  status: 'unverified' | 'valid' | 'invalid'
  updatedAt: string
}

export async function getKeyStatus(organizationId: string | null, userId: string | null): Promise<KeyStatus | null> {
  const row = await findKeyRow(organizationId, userId)
  if (!row) return null
  return { provider: row.provider as ByokProviderName, keyLast4: row.keyLast4, status: row.status as any, updatedAt: row.updatedAt }
}

// Upserts because a scope (org-default / user-override / personal) holds
// at most one key - saving a new provider replaces whatever was there.
export async function saveKey(opts: {
  organizationId: string | null
  userId: string | null
  provider: ByokProviderName
  apiKey: string
  createdBy: string
  status: 'unverified' | 'valid' | 'invalid'
}): Promise<void> {
  const existing = await findKeyRow(opts.organizationId, opts.userId)
  const enc = encryptSecret(opts.apiKey)
  const now = new Date().toISOString()

  if (existing) {
    await db.update(schema.aiProviderKeys).set({
      provider: opts.provider,
      encryptedKey: enc.ciphertext,
      keyIv: enc.iv,
      keyLast4: last4(opts.apiKey),
      status: opts.status,
      lastVerifiedAt: opts.status === 'valid' ? now : null,
      updatedAt: now,
    }).where(eq(schema.aiProviderKeys.id, existing.id))
  } else {
    await db.insert(schema.aiProviderKeys).values({
      organizationId: opts.organizationId,
      userId: opts.userId,
      provider: opts.provider,
      encryptedKey: enc.ciphertext,
      keyIv: enc.iv,
      keyLast4: last4(opts.apiKey),
      status: opts.status,
      lastVerifiedAt: opts.status === 'valid' ? now : null,
      createdBy: opts.createdBy,
    })
  }
}

export async function removeKey(organizationId: string | null, userId: string | null): Promise<void> {
  const existing = await findKeyRow(organizationId, userId)
  if (!existing) return
  await db.delete(schema.aiProviderKeys).where(eq(schema.aiProviderKeys.id, existing.id))
}

// Org-key rate limit only - doesn't touch the key itself. null clears the
// limit (unlimited). Personal-scope keys never call this.
export async function setOrgKeyRateLimit(organizationId: string, rateLimitPerMonth: number | null): Promise<boolean> {
  const existing = await findKeyRow(organizationId, null)
  if (!existing) return false
  await db.update(schema.aiProviderKeys).set({
    rateLimitPerMonth,
    updatedAt: new Date().toISOString(),
  }).where(eq(schema.aiProviderKeys.id, existing.id))
  return true
}

export interface OrgKeyDetail extends KeyStatus {
  rateLimitPerMonth: number | null
  queriesThisMonth: number
  queriesResetAt: string | null
}

export async function getOrgKeyDetail(organizationId: string): Promise<OrgKeyDetail | null> {
  const row = await findKeyRow(organizationId, null)
  if (!row) return null
  const now = new Date()
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const lastResetMonth = row.queriesResetAt ? row.queriesResetAt.slice(0, 7) : ''
  return {
    provider: row.provider as ByokProviderName,
    keyLast4: row.keyLast4,
    status: row.status as any,
    updatedAt: row.updatedAt,
    rateLimitPerMonth: row.rateLimitPerMonth,
    queriesThisMonth: lastResetMonth === monthKey ? row.queriesThisMonth : 0,
    queriesResetAt: row.queriesResetAt,
  }
}

function buildProvider(resolved: ResolvedKey, intent: 'reasoning' | 'simple'): LLMProvider {
  switch (resolved.provider) {
    case 'anthropic':
      return new ClaudeProvider(resolved.apiKey, intent === 'simple' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6')
    case 'openai': {
      const { OPENAI_REASONING_MODEL, OPENAI_FAST_MODEL } = require('./llm')
      return new OpenAIProvider(resolved.apiKey, intent === 'simple' ? OPENAI_FAST_MODEL : OPENAI_REASONING_MODEL)
    }
    case 'gemini': {
      const { GEMINI_REASONING_MODEL, GEMINI_FAST_MODEL } = require('./llm')
      return new GeminiProvider(resolved.apiKey, intent === 'simple' ? GEMINI_FAST_MODEL : GEMINI_REASONING_MODEL)
    }
  }
}

// The main entry point every AI call site should route through once wired.
// tier: pass the caller's subscription tier so Managed (paid, non-free)
// orgs without a BYOK key configured can still fall through to the
// platform key - free tier gets no such fallback, ever.
export async function resolveLLM(opts: {
  organizationId?: string | null
  userId?: string | null
  tier?: 'free' | 'professional' | 'enterprise'
  intent?: 'reasoning' | 'simple'
  isPersonal?: boolean
}): Promise<LLMProvider> {
  const { organizationId = null, userId = null, tier = 'free', intent = 'reasoning', isPersonal = false } = opts

  const byok = await resolveByokKey({ organizationId, userId })
  if (byok) return buildProvider(byok, intent)

  if (isPersonal) {
    // Personal is BYOK-only by design - no platform-key fallback, ever.
    throw new NoAIConfiguredError('personal')
  }

  if (tier === 'professional' || tier === 'enterprise') {
    // Managed tier: platform's own key, soft-capped by billing/gates.ts.
    const { getAskLLM } = await import('./llm')
    return getAskLLM(undefined, intent)
  }

  // Free tier, no BYOK key configured: hard stop. This is the fix for the
  // credit-bleed problem - no silent fallback to the platform's key.
  throw new NoAIConfiguredError('org')
}

// Background jobs (triage/ingest/embed/link, see lib/ai/agents.ts +
// lib/jobs/worker.ts) only have a workspaceId, not a request-scoped user or
// tier - there's no "acting user" for a queue-processed job. Resolution:
//   - workspace has no org link (personal workspace) -> the workspace
//     owner's personal BYOK key, same as any other Personal-mode call
//   - workspace is org-linked -> org's BYOK key; if none, check whether the
//     org's *creator* has an active Managed subscription (a reasonable
//     proxy for "this org pays" given billing is per-user, not per-org -
//     any one paying seat unlocking org-level background AI is intended,
//     not a loophole) and fall back to the platform key if so
//   - neither -> NoAIConfiguredError, same as the interactive path
export async function resolveLLMForWorkspace(workspaceId: string, intent: 'reasoning' | 'simple' = 'simple'): Promise<LLMProvider> {
  const link = await db.query.workspaceOrgLinks.findFirst({ where: eq(schema.workspaceOrgLinks.workspaceId, workspaceId) })

  if (!link) {
    const ws = await db.query.workspaces.findFirst({ where: eq(schema.workspaces.id, workspaceId) })
    if (!ws) throw new NoAIConfiguredError('personal')
    const byok = await resolveByokKey({ organizationId: null, userId: ws.createdBy })
    if (byok) return buildProvider(byok, intent)
    throw new NoAIConfiguredError('personal')
  }

  return resolveLLMForOrg(link.organizationId, intent)
}

// Same org-key-or-creator's-Managed-subscription logic as
// resolveLLMForWorkspace's org branch, for callers that already have an
// organizationId and no workspace to resolve it from (e.g. wiki summaries,
// which are cached per-org, not per-workspace).
export async function resolveLLMForOrg(organizationId: string, intent: 'reasoning' | 'simple' = 'simple'): Promise<LLMProvider> {
  const orgByok = await resolveByokKey({ organizationId, userId: null })
  if (orgByok) return buildProvider(orgByok, intent)

  const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, organizationId) })
  if (org) {
    const creatorSub = await db.query.subscriptions.findFirst({ where: eq(schema.subscriptions.userId, org.createdBy) })
    if (creatorSub && (creatorSub.tier === 'professional' || creatorSub.tier === 'enterprise')) {
      const { getAskLLM } = await import('./llm')
      return getAskLLM(undefined, intent)
    }
  }

  throw new NoAIConfiguredError('org')
}

// Convenience wrapper for request-handler call sites: looks up the
// caller's tier itself so each route doesn't have to repeat the
// getOrCreateSubscription() dance. organizationId null/undefined means
// Personal mode. Use this instead of resolveLLM() directly unless you've
// already got the tier in hand for some other reason (ask/route.ts does,
// since it also needs it for the quota gate).
export async function resolveLLMForRequest(opts: {
  userId: string
  organizationId?: string | null
  intent?: 'reasoning' | 'simple'
}): Promise<LLMProvider> {
  const { userId, organizationId = null, intent = 'reasoning' } = opts
  const { getOrCreateSubscription } = await import('@/lib/billing/gates')
  const sub = await getOrCreateSubscription(userId)
  return resolveLLM({
    organizationId,
    userId,
    tier: sub.tier as 'free' | 'professional' | 'enterprise',
    intent,
    isPersonal: !organizationId,
  })
}

// One cheap, cheapest-tier call to confirm a pasted key actually works
// before we encrypt and store it. Settings UI calls this on save so a typo
// or an expired key fails immediately, not on the user's next real query.
export async function testProviderKey(provider: ByokProviderName, apiKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const llm = buildProvider({ provider, apiKey }, 'simple')
    const text = await llm.generateText('Reply with exactly: OK', 5)
    if (!text || !text.trim()) throw new Error('empty response')
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Key validation failed' }
  }
}
