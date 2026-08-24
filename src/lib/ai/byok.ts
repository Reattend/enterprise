// BYOK resolver - decides which AI provider/key an org or user actually
// uses. This is the mechanism that stops the platform from silently
// footing everyone's AI bill: a free-tier org with no configured key gets
// a hard NoAIConfiguredError, not a fallback to the platform's own
// Anthropic key. Only Managed (paid) tiers get the platform key, and even
// then only up to the soft-cap gate in billing/gates.ts.
//
// Scope resolution order (first match wins):
//   1. per-user override key   (organizationId + userId)
//   2. org default key         (organizationId, userId NULL)
//   3. personal-mode key       (organizationId NULL, userId)  - Personal
//      accounts are always BYOK, this is their only path, no fallback to
//      a Managed/platform key ever exists for Personal.

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
        ? 'This organization has no AI provider configured. An admin needs to connect an API key in Settings before AI features work.'
        : 'No AI provider configured. Connect an API key in Settings before AI features work.'
    )
    this.name = 'NoAIConfiguredError'
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

// Looks up, in order: user override in this org -> org default -> (if no
// org context) personal key for this user. Returns null if nothing is
// configured anywhere in the chain.
export async function resolveByokKey(opts: {
  organizationId?: string | null
  userId?: string | null
}): Promise<ResolvedKey | null> {
  const { organizationId = null, userId = null } = opts

  if (organizationId && userId) {
    const userOverride = await findKeyRow(organizationId, userId)
    if (userOverride) {
      return { provider: userOverride.provider as ByokProviderName, apiKey: decryptSecret({ ciphertext: userOverride.encryptedKey, iv: userOverride.keyIv }) }
    }
  }

  if (organizationId) {
    const orgDefault = await findKeyRow(organizationId, null)
    if (orgDefault) {
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
