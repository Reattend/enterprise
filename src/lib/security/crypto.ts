// AES-256-GCM helper for encrypting third-party secrets at rest (BYOK
// provider API keys today; anything else that needs the same treatment
// later). One symmetric key for the whole deployment, read from env -
// never derived from anything request-scoped, so encrypted rows are only
// ever readable by this server.
//
// BYOK_ENCRYPTION_KEY must be a 32-byte key, hex-encoded (64 hex chars).
// Generate one with: openssl rand -hex 32
// Losing/rotating this key without a migration plan makes every stored
// BYOK key unreadable - back it up the same way as the Nango encryption
// key (see today.md §11).

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // recommended for GCM

function getKey(): Buffer {
  const hex = process.env.BYOK_ENCRYPTION_KEY
  if (!hex) throw new Error('BYOK_ENCRYPTION_KEY not set - cannot encrypt/decrypt provider keys')
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) {
    throw new Error('BYOK_ENCRYPTION_KEY must be a 32-byte key, hex-encoded (64 hex chars) - run: openssl rand -hex 32')
  }
  return key
}

export interface EncryptedSecret {
  ciphertext: string // base64
  iv: string // base64
}

export function encryptSecret(plaintext: string): EncryptedSecret {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Store the auth tag appended to the ciphertext so we only need one column.
  return {
    ciphertext: Buffer.concat([encrypted, authTag]).toString('base64'),
    iv: iv.toString('base64'),
  }
}

export function decryptSecret(secret: EncryptedSecret): string {
  const key = getKey()
  const iv = Buffer.from(secret.iv, 'base64')
  const combined = Buffer.from(secret.ciphertext, 'base64')
  const authTag = combined.subarray(combined.length - 16)
  const encrypted = combined.subarray(0, combined.length - 16)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  return decrypted.toString('utf8')
}

// For display only - never log or return the real key.
export function last4(plaintext: string): string {
  return plaintext.slice(-4)
}
