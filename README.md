# Saint Helen Prayer Wall

A digital prayer wall for Saint Helen Parish, built with Next.js and Neon Postgres.

## Features

- Submit prayer intentions via web form
- Vertical display screen that rotates indefinitely through prayers
- Archive support for historical prayers (Jubilee 2025)
- Liquid glass UI with animated candle motifs
- Mobile-friendly submission interface

## Setup

### Prerequisites

- Node.js 20+
- A Neon Postgres database

### Environment Variables

Create a `.env.local` file (see `.env.example`):

```env
DATABASE_URL=postgres://user:password@host/dbname?sslmode=require
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are only needed if you still need to run
the one-shot data migration script from the old Supabase database.

### Database Schema

The migration script creates the schema automatically. If you want to run it
manually in Neon, the SQL is:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  season text NOT NULL DEFAULT 'prayer_wall'
);

CREATE INDEX IF NOT EXISTS prayers_season_created_at_idx
  ON prayers (season, created_at DESC);
```

### Migrating from Supabase to Neon

Put both sets of credentials in `.env.local` and run once:

```bash
npm install
npm run migrate:supabase-to-neon
```

The script is idempotent (it uses `ON CONFLICT (id) DO NOTHING`), so it is safe
to re-run. It preserves `id`, `content`, `created_at`, and `season` exactly.
After it succeeds and you've verified the data in Neon, you can remove the
Supabase env vars from Vercel.

### Installation

```bash
npm install
npm run dev
```

## Routes

- `/` - Prayer submission form
- `/display` - Vertical display for screens (rotates through prayers)

## API Endpoints

- `GET /api/prayers` - Fetch prayers (wall + archive sample)
- `POST /api/submit-prayer` - Submit a new prayer

## Display Rotation

The display paginates sequentially through all current `prayer_wall` prayers
(7 per page, 18 seconds per page). Roughly every 10 rotations it shows an
instruction page. Roughly 5% of rotations spotlight a random page from the
`jubilee_2025` archive.

The data is re-fetched every 5 minutes so newly submitted prayers appear
without reloading the page.

## Seasons

Prayers are tagged with a `season` field:

- `prayer_wall` - Current ongoing wall (default for new submissions)
- `jubilee_2025` - Archive from Jubilee Year of Hope
