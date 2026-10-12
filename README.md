# Saint Helen Prayer Wall

A digital prayer wall for Saint Helen, built with Next.js and Neon Postgres.

- `/` submission form (iPad in the church, or any phone)
- `/display` the screen in the church, rotating through approved prayers
- `/admin` staff review page

## How a prayer gets to the screen

Every submission passes through three layers. The parishioner always sees
"Thank you, your prayer has been received", whatever happens next, so nobody
is told in a pew that their prayer was refused and trolls get nothing to
iterate on.

1. **Word rules** (`src/lib/moderation.ts`, lists in `src/lib/blocklist.ts`).
   Instant and free. Text is normalised first (lowercase, accents stripped,
   leetspeak mapped, `f.u.c.k` joined, `fuuuck` collapsed) and then matched
   against three lists:
   - reject: profanity, slurs, sexual terms, links, email addresses
   - review: words that are usually fine in a parish but worth a look
     ("damn", "dick", politics, "kill")
   - sensitive: suicide, abuse, addiction, illness. Never auto-rejected; adds
     a *pastoral* flag so staff can see someone may need a call.

   Plus heuristics for phone numbers, keyboard mashing, repeated characters,
   emoji floods, and test input. Theological words such as "hell" are allowed.

2. **AI check** (`src/lib/aiModeration.ts`). Runs when `ANTHROPIC_API_KEY` is
   set, on everything the rules did not reject. One short Claude call with a
   fixed rubric returns approve / review / reject plus a one-line reason. It
   can approve a prayer the rules were unsure about, and it can hold a prayer
   the rules passed. It cannot auto-reject a prayer carrying the pastoral flag.
   If the call fails, the prayer is held for staff rather than guessed at.
   Cost is a fraction of a cent per prayer.

3. **Staff** at `/admin`. Three tabs: needs review, on the wall, hidden. Any
   prayer can be shown, hidden, or sent back to review at any time. Nothing is
   ever deleted. The display refetches every minute, so a hidden prayer leaves
   the screen within a minute.

Without an API key, the rules alone decide: clean prayers go live, anything
flagged waits for staff.

Rate limiting is per submitter per day (hashed IP), generous enough for a line
of people on the parish wifi: 8 per minute, and an identical prayer from the
same place within 10 minutes is treated as a double tap.

## Setup

### Prerequisites

- Node.js 20+
- A Neon Postgres database

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Neon connection string |
| `ADMIN_PASSWORD` | for `/admin` | shared staff password; changing it signs everyone out |
| `ANTHROPIC_API_KEY` | for AI check | turns on the AI layer |
| `MODERATION_MODEL` | no | defaults to `claude-opus-5-5` |
| `HASH_SECRET` | no | salt for hashed submitter IPs; falls back to `ADMIN_PASSWORD` |

Set the same variables in Vercel.

### Database

Fresh database:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS prayers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  season text NOT NULL DEFAULT 'prayer_wall',
  status text NOT NULL DEFAULT 'pending',
  flags text[] NOT NULL DEFAULT '{}',
  moderation_reason text,
  moderated_by text,
  reviewed_at timestamptz,
  submitter_hash text
);

CREATE INDEX IF NOT EXISTS prayers_status_season_created_at_idx
  ON prayers (status, season, created_at DESC);
CREATE INDEX IF NOT EXISTS prayers_submitter_hash_created_at_idx
  ON prayers (submitter_hash, created_at DESC);
```

Existing database (one-time, safe to re-run). Adds the moderation columns and
marks every prayer that is already live as approved:

```bash
npm run migrate:moderation
```

The older Supabase import (`npm run migrate:supabase-to-neon`) is still here
for reference but has already been run.

### Run

```bash
npm install
npm run dev
```

## API

- `GET /api/prayers` approved prayers for the display (wall + archive sample)
- `POST /api/submit-prayer` `{ prayer, website? }`; `website` is a honeypot
- `GET|POST|DELETE /api/admin/login` staff session
- `GET|PATCH /api/admin/prayers` staff listing and status changes

## Display

The display fills whatever screen it is on: one column in portrait, two in
landscape, with cards per page computed from the available height. Pages
rotate every 18 seconds. Roughly every 10th page is the "share your intention"
page, and about 5% of pages spotlight the Jubilee 2025 archive. When a new
prayer arrives the next page shown is the front of the wall, so someone who
just typed on the iPad sees their prayer within about a minute.

## Seasons

- `prayer_wall` current ongoing wall (default for new submissions)
- `jubilee_2025` archive from the Jubilee Year of Hope
