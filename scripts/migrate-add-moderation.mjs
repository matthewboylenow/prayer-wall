// Adds the moderation columns to the prayers table. Idempotent: safe to re-run.
//
//   npm run migrate:moderation
//
// Every existing row is marked approved (it was already live) with
// moderated_by = 'legacy'. New rows default to pending until the submit route
// sets a status.

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function main() {
  console.log('Adding moderation columns...')
  await sql`ALTER TABLE prayers ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'`
  await sql`ALTER TABLE prayers ADD COLUMN IF NOT EXISTS flags text[] NOT NULL DEFAULT '{}'`
  await sql`ALTER TABLE prayers ADD COLUMN IF NOT EXISTS moderation_reason text`
  await sql`ALTER TABLE prayers ADD COLUMN IF NOT EXISTS moderated_by text`
  await sql`ALTER TABLE prayers ADD COLUMN IF NOT EXISTS reviewed_at timestamptz`
  await sql`ALTER TABLE prayers ADD COLUMN IF NOT EXISTS submitter_hash text`

  console.log('Marking rows that predate moderation as approved...')
  const updated = await sql`
    UPDATE prayers
    SET status = 'approved', moderated_by = 'legacy', reviewed_at = now()
    WHERE moderated_by IS NULL AND status = 'pending'
    RETURNING id
  `

  console.log('Adding indexes...')
  await sql`
    CREATE INDEX IF NOT EXISTS prayers_status_season_created_at_idx
    ON prayers (status, season, created_at DESC)
  `
  await sql`
    CREATE INDEX IF NOT EXISTS prayers_submitter_hash_created_at_idx
    ON prayers (submitter_hash, created_at DESC)
  `

  const [{ count: approved }] = await sql`SELECT COUNT(*)::int AS count FROM prayers WHERE status = 'approved'`
  const [{ count: pending }] = await sql`SELECT COUNT(*)::int AS count FROM prayers WHERE status = 'pending'`
  const [{ count: rejected }] = await sql`SELECT COUNT(*)::int AS count FROM prayers WHERE status = 'rejected'`

  console.log('---')
  console.log(`Marked approved this run: ${updated.length}`)
  console.log(`approved: ${approved}  pending: ${pending}  rejected: ${rejected}`)
  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
