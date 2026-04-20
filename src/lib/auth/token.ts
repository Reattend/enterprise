import { createHash, randomBytes } from 'crypto'
import { db, schema } from '../db'
import { eq } from 'drizzle-orm'

const TOKEN_PREFIX = 'rat_'

/**
 * Generate a new API token for tray app authentication.
 * Returns the raw token (shown once to user) and saves the hash in DB.
 */
export async function generateApiToken(userId: string, workspaceId: string, name = 'Desktop App') {
  const raw = TOKEN_PREFIX + randomBytes(32).toString('hex')
  const hash = createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(0, 12)

  const id = crypto.randomUUID()
  await db.insert(schema.apiTokens).values({
    id,
    userId,
    workspaceId,
    name,
    tokenHash: hash,
    tokenPrefix: prefix,
  })

  return { id, token: raw, prefix }
}

/**
 * Validate a Bearer token from an API request.
 * Returns { userId, workspaceId } or null if invalid.
 */
export async function validateApiToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null

  const raw = authHeader.slice(7)
  if (!raw.startsWith(TOKEN_PREFIX)) return null

  const hash = createHash('sha256').update(raw).digest('hex')

  const token = await db.query.apiTokens.findFirst({
    where: eq(schema.apiTokens.tokenHash, hash),
  })

  if (!token) return null

  // Check expiry
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) return null

  // Update last used
  await db.update(schema.apiTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(schema.apiTokens.id, token.id))

  return {
    userId: token.userId,
    workspaceId: token.workspaceId,
    tokenId: token.id,
  }
}

/**
 * Revoke an API token.
 */
export async function revokeApiToken(tokenId: string, userId: string) {
  const token = await db.query.apiTokens.findFirst({
    where: eq(schema.apiTokens.id, tokenId),
  })

  if (!token || token.userId !== userId) return false

  await db.delete(schema.apiTokens)
    .where(eq(schema.apiTokens.id, tokenId))

  return true
}

/**
 * List all API tokens for a user (without hashes).
 */
export async function listApiTokens(userId: string) {
  const tokens = await db.query.apiTokens.findMany({
    where: eq(schema.apiTokens.userId, userId),
  })

  return tokens.map(t => ({
    id: t.id,
    name: t.name,
    prefix: t.tokenPrefix,
    workspaceId: t.workspaceId,
    lastUsedAt: t.lastUsedAt,
    createdAt: t.createdAt,
  }))
}
