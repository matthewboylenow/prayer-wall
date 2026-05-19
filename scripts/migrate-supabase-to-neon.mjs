// One-shot migration: copy every row from Supabase `prayers` into Neon.
// Idempotent — re-running it is safe (ON CONFLICT DO NOTHING on the primary key).
//
// Required env vars (put them in .env.local):
//   SUPABASE_URL
//   SUPABASE_ANON_KEY    (or service role key; either works for read)
//   DATABASE_URL         (Neon connection string)
//
// Run:
//   npm run migrate:supabase-to-neon
//
// What it does:
//   1. Ensures the `prayers` schema exists on Neon.
//   2. Pages through every row in Supabase via its REST API (1000 at a time).
//   3. Bulk-inserts into Neon, preserving id / content / created_at / season.
//   4. Prints a summary of inserted vs. skipped rows.

import { neon } from '@neondatabase/serverless'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY
const DATABASE_URL = process.env.DATABASE_URL

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  process.exit(1)
}
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL (Neon)')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

const PAGE_SIZE = 1000
const SUPABASE_REST = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/prayers`

async function ensureSchema() {
  console.log('Ensuring Neon schema...')
  await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`
  await sql`
    CREATE TABLE IF NOT EXISTS prayers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      season text NOT NULL DEFAULT 'prayer_wall'
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS prayers_season_created_at_idx
    ON prayers (season, created_at DESC)
  `
  console.log('Schema OK.')
}

async function fetchSupabasePage(from, to) {
  const url = `${SUPABASE_REST}?select=id,content,created_at,season&order=created_at.asc`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Range: `${from}-${to}`,
      'Range-Unit': 'items',
      Prefer: 'count=exact',
    },
  })
  if (!res.ok && res.status !== 206) {
    const body = await res.text()
    throw new Error(`Supabase fetch failed ${res.status}: ${body}`)
  }
  return res.json()
}

async function insertBatch(rows) {
  if (rows.length === 0) return { inserted: 0, skipped: 0 }

  const ids = rows.map(r => r.id)
  const contents = rows.map(r => r.content)
  const createdAts = rows.map(r => r.created_at)
  const seasons = rows.map(r => r.season ?? 'prayer_wall')

  const result = await sql`
    INSERT INTO prayers (id, content, created_at, season)
    SELECT * FROM UNNEST(
      ${ids}::uuid[],
      ${contents}::text[],
      ${createdAts}::timestamptz[],
      ${seasons}::text[]
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `
  return { inserted: result.length, skipped: rows.length - result.length }
}

async function main() {
  await ensureSchema()

  let from = 0
  let totalRead = 0
  let totalInserted = 0
  let totalSkipped = 0

  while (true) {
    const to = from + PAGE_SIZE - 1
    const rows = await fetchSupabasePage(from, to)
    if (rows.length === 0) break

    const { inserted, skipped } = await insertBatch(rows)
    totalRead += rows.length
    totalInserted += inserted
    totalSkipped += skipped
    console.log(
      `Page ${from}-${from + rows.length - 1}: read ${rows.length}, inserted ${inserted}, skipped ${skipped}`
    )

    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  const [{ count: wallCount }] = await sql`
    SELECT COUNT(*)::int AS count FROM prayers WHERE season = 'prayer_wall'
  `
  const [{ count: archiveCount }] = await sql`
    SELECT COUNT(*)::int AS count FROM prayers WHERE season = 'jubilee_2025'
  `

  console.log('---')
  console.log(`Read from Supabase:    ${totalRead}`)
  console.log(`Inserted into Neon:    ${totalInserted}`)
  console.log(`Skipped (already had): ${totalSkipped}`)
  console.log(`Neon prayer_wall rows: ${wallCount}`)
  console.log(`Neon jubilee_2025 rows: ${archiveCount}`)
  console.log('Done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
