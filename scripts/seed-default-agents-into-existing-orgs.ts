/**
 * Back-fills the 10 default agents into every existing org that doesn't
 * already have them. Safe to run repeatedly — seedDefaultAgents is idempotent
 * (skips agents whose slug already exists in the org).
 *
 * Run once on the droplet after deploy:
 *   npx tsx scripts/seed-default-agents-into-existing-orgs.ts
 */

import { db, schema } from '../src/lib/db'
import { eq } from 'drizzle-orm'

;(async () => {
  const { seedDefaultAgents } = await import('../src/lib/enterprise/default-agents')

  const orgs = await db.select({ id: schema.organizations.id, name: schema.organizations.name, createdBy: schema.organizations.createdBy })
    .from(schema.organizations)
  console.log(`Found ${orgs.length} organizations.`)

  let totalInserted = 0
  for (const org of orgs) {
    try {
      const n = await seedDefaultAgents(org.id, org.createdBy)
      console.log(`${org.name}: +${n} agents`)
      totalInserted += n
    } catch (e) {
      console.error(`${org.name}: failed — ${(e as Error).message}`)
    }
  }
  console.log(`\nDone. Total agents inserted: ${totalInserted}`)
  process.exit(0)
})().catch((e) => { console.error(e); process.exit(1) })
