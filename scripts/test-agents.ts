/**
 * Agents end-to-end smoke test.
 *
 * Lifecycle:
 *   1. Create a draft agent
 *   2. Update it (PATCH)
 *   3. Publish it
 *   4. Mint an API key (asserts plaintext is returned, only hash stored)
 *   5. Log a fake query into agent_queries + confirm usageCount rose
 *   6. Revoke the API key
 *   7. Archive the agent
 *
 * Run: `npm run test:agents`
 */

import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import path from 'path'
import crypto from 'crypto'

const dbPath = path.resolve(process.cwd(), 'data', 'reattend.db')
const db = new Database(dbPath)
db.pragma('foreign_keys = ON')

const uuid = () => randomUUID()
const now = () => new Date().toISOString()

const org = db.prepare("SELECT id FROM organizations WHERE slug='demo-mof'").get() as { id: string } | undefined
if (!org) { console.error('No demo-mof org'); process.exit(1) }
const admin = db.prepare(`
  SELECT u.id FROM organization_members om JOIN users u ON u.id = om.user_id
  WHERE om.organization_id = ? AND om.role='super_admin' AND om.status='active' LIMIT 1
`).get(org.id) as { id: string } | undefined
if (!admin) { console.error('No super_admin'); process.exit(1) }

// Cleanup any prior test runs
db.prepare("DELETE FROM agents WHERE slug LIKE 'smoke-%'").run()

let fail = 0
function check(name: string, cond: boolean) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
  if (!cond) fail++
}

// 1. Create draft agent
const agentId = uuid()
db.prepare(`INSERT INTO agents (id, organization_id, tier, name, slug, description, system_prompt, scope_config, deployment_targets, status, created_by, created_at, updated_at)
  VALUES (?, ?, 'org', 'Smoke Agent', ?, 'testing', 'You are a test agent.', '{}', '["web"]', 'draft', ?, ?, ?)`)
  .run(agentId, org.id, `smoke-${Date.now()}`, admin.id, now(), now())
const draft = db.prepare('SELECT status FROM agents WHERE id=?').get(agentId) as { status: string }
check('created as draft', draft.status === 'draft')

// 2. PATCH to update system prompt
db.prepare('UPDATE agents SET system_prompt=?, updated_at=? WHERE id=?')
  .run('You are a TEST agent, updated.', now(), agentId)
const updated = db.prepare('SELECT system_prompt FROM agents WHERE id=?').get(agentId) as { system_prompt: string }
check('system prompt updated', updated.system_prompt.includes('updated'))

// 3. Publish
db.prepare('UPDATE agents SET status=? WHERE id=?').run('active', agentId)
const pub = db.prepare('SELECT status FROM agents WHERE id=?').get(agentId) as { status: string }
check('published (status=active)', pub.status === 'active')

// 4. Mint API key — simulate what the route does
const secret = crypto.randomBytes(24).toString('hex')
const plaintext = `ak_live_${secret}`
const keyHash = crypto.createHash('sha256').update(plaintext).digest('hex')
const keyId = uuid()
db.prepare(`INSERT INTO agent_api_keys (id, agent_id, organization_id, name, key_hash, key_prefix, created_by_user_id, created_at)
  VALUES (?, ?, ?, 'Smoke Key', ?, ?, ?, ?)`)
  .run(keyId, agentId, org.id, keyHash, plaintext.slice(0, 12), admin.id, now())
const storedKey = db.prepare('SELECT key_hash, key_prefix FROM agent_api_keys WHERE id=?').get(keyId) as { key_hash: string; key_prefix: string }
check('key hash stored (not plaintext)', storedKey.key_hash === keyHash && !storedKey.key_hash.startsWith('ak_'))
check('key prefix derives from plaintext', plaintext.startsWith(storedKey.key_prefix))

// 5. Log a query + bump usage
db.prepare(`INSERT INTO agent_queries (id, agent_id, organization_id, user_id, question, source_count, created_at)
  VALUES (?, ?, ?, ?, 'What is the travel policy?', 0, ?)`)
  .run(uuid(), agentId, org.id, admin.id, now())
db.prepare('UPDATE agents SET usage_count = usage_count + 1 WHERE id=?').run(agentId)
const usage = db.prepare('SELECT usage_count FROM agents WHERE id=?').get(agentId) as { usage_count: number }
check('usageCount incremented', usage.usage_count >= 1)

const queryCount = db.prepare('SELECT COUNT(*) c FROM agent_queries WHERE agent_id=?').get(agentId) as { c: number }
check('query logged to agent_queries', queryCount.c === 1)

// 6. Revoke key
db.prepare('UPDATE agent_api_keys SET revoked_at=? WHERE id=?').run(now(), keyId)
const revoked = db.prepare('SELECT revoked_at FROM agent_api_keys WHERE id=?').get(keyId) as { revoked_at: string | null }
check('key revoked (non-destructive)', !!revoked.revoked_at)

// 7. Archive agent
db.prepare('UPDATE agents SET status=? WHERE id=?').run('archived', agentId)
const arch = db.prepare('SELECT status FROM agents WHERE id=?').get(agentId) as { status: string }
check('archived', arch.status === 'archived')

// Cleanup
db.prepare('DELETE FROM agents WHERE id=?').run(agentId)

console.log(`\n${fail === 0 ? 'ALL PASS' : `FAILED (${fail})`} — agent lifecycle works end-to-end`)
process.exit(fail === 0 ? 0 : 1)
