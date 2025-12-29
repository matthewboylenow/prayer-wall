# Prayer Wall Refresh (Supabase-only + Archive Sampling + Candle UI + New Theme)

## Goal
Repurpose the existing Jubilee Prayer Wall into a permanent parish Prayer Wall **without losing** the Jubilee archive. Keep the general layout/UX the same, but:
- Remove Google Sheets entirely (no googleapis, no Sheet env vars, no migration script)
- Use Supabase as the only source of truth
- Add the concept of `season`:
  - `prayer_wall` = current ongoing wall
  - `jubilee_2025` = archive
- Display logic:
  - Show mostly **recent prayers** from `prayer_wall`
  - Also show some **older prayers** from `prayer_wall`
  - Occasionally pull from the archive (`jubilee_2025`) as a “From the Jubilee Year” feature (low frequency)
- UI refresh:
  - Remove the Jubilee logo & Jubilee wording
  - Keep the Saint Helen mark
  - Replace 🙏 / prayer hands motifs with candles (subtle, reverent)
  - Update frosted glass to a more “Apple Liquid Glass” feel
  - Slight color scheme shift so it feels like a new season

## Supabase SQL (User will run this)
The user will run the following in Supabase SQL editor:

```sql
alter table public.prayers
add column if not exists season text;

-- mark all existing as Jubilee archive
update public.prayers
set season = 'jubilee_2025'
where season is null;

-- new submissions default to current wall
alter table public.prayers
alter column season set default 'prayer_wall';

create index if not exists prayers_season_created_at_idx
on public.prayers (season, created_at desc);
Assume the table has at least: id, content, created_at, and now season.

Repo Notes (Existing)
This is a Next.js app using App Router.
Key files:

src/app/display/page.tsx (vertical display route)

src/components/PrayerWallDisplay.tsx (rotation logic + UI)

src/components/PrayerForm.tsx (submission UI + client validation)

src/app/api/submit-prayer/route.ts (currently writes to Google + Supabase)

src/app/api/prayers/route.ts (currently returns all prayers ascending)

src/app/api/rss/route.ts and src/app/api/prayers/embed/route.ts (currently Google Sheets based)

scripts/migrate-prayers.js (Google -> Supabase migration; now obsolete)

public/images/Jubilee-Logo.png (no longer needed)

Implementation Tasks
1) Remove Google Sheets completely
Delete / refactor everything Google-related:

Remove dependency googleapis from package.json

Remove dependency dotenv if only used by the old migration script (if still needed for something else, keep it, but likely remove)

Delete scripts/migrate-prayers.js (or keep but strip Google usage; prefer delete)

Delete API routes that rely on Google Sheets:

src/app/api/rss/route.ts (remove; or rewrite to Supabase-only if needed, but default: remove)

src/app/api/prayers/embed/route.ts (remove; or rewrite to Supabase-only if needed, but default: remove)

Remove any env var usage / references:

GOOGLE_CREDENTIALS

SHEET_ID

Acceptance:

npm run dev succeeds with no googleapis import errors.

No code references googleapis, GOOGLE_CREDENTIALS, or SHEET_ID.

2) Make Supabase the only data pipeline
2a) Update submission endpoint to Supabase-only + server validation
File: src/app/api/submit-prayer/route.ts

Required behavior:

Accept JSON { prayer: string }

Validate server-side (do not rely only on client):

Must be a non-empty string

Trim whitespace

Max length (pick something reasonable like 240–400 chars; choose 300 if unsure)

Basic spam mitigation:

Add a lightweight honeypot field support: if body contains website (or similar) and it's non-empty => reject

Add naive rate limiting by IP (optional but recommended). If too heavy, skip.

Insert into public.prayers with:

content = trimmedPrayer

season = 'prayer_wall' (or let DB default handle it)

Return success JSON with created record id if available.

Also:

If any “blocked words” logic exists in the client form, mirror it server-side too (same list, same behavior).

Acceptance:

A direct POST to /api/submit-prayer creates a row in Supabase with season = prayer_wall.

Google Sheets is not touched.

2b) Update prayers fetch endpoint to support “wall + archive sampling”
File: src/app/api/prayers/route.ts

Change this endpoint to return exactly what the display needs, efficiently, without pulling the entire DB every time.

New response shape (recommended):

ts
Copy code
{
  wall: Prayer[],           // season='prayer_wall' most relevant set
  archiveSample: Prayer[],  // small sample from season='jubilee_2025'
  totalWall: number,
  totalArchive: number,
  generatedAt: string
}
Query strategy (do this server-side):

Fetch prayer_wall prayers ordered created_at desc with a limit that supports display rotation.

Example: limitWall = 800 (safe and fast)

Fetch jubilee_2025 prayers as a small random-ish sample:

If Supabase supports .order('created_at', { ascending: false }) + range, do something like:

Get totalArchive count

Pick a random offset (0..totalArchive - sampleSize)

Fetch sampleSize (e.g. 80–150)

If random offset is too much, just fetch latest N archive prayers; but random is better.

Return both sets.

Acceptance:

/api/prayers returns JSON with wall and archiveSample.

Does not return 2,200+ prayers every time unless needed.

3) Update the Display rotation logic (recent vs older vs archive spotlight)
File: src/components/PrayerWallDisplay.tsx

3a) Expand the Prayer type
Add:

ts
Copy code
season?: string;
3b) Read the new API response shape
Instead of expecting { prayers: Prayer[] }, parse:

wall

archiveSample

Store them in state separately:

wallPrayers

archivePrayers

Then apply the “recent vs older” separation to wallPrayers only.

3c) Add new display strategies
Replace the current displayStrategy union:

currently: 'recent' | 'older' | 'instruction'

Update to:

'recent' | 'older' | 'archive' | 'instruction'

3d) Weighted strategy selection
Every rotation tick:

show instruction page every N pages (existing behavior, keep)

otherwise pick strategy with weights:

Recent: high (e.g. 0.70)

Older (from prayer_wall): medium (e.g. 0.25)

Archive (jubilee_2025 sample): low (e.g. 0.05)

Make weights configurable in DISPLAY_CONFIG, add:

archiveWeight

archiveLabelFrequency (optional; but weight alone is fine)

3e) Fix the interval dependency bug
Currently the interval effect depends on pageCount and mutates it inside the interval; this can cause interval recreation/jitter.

Refactor using a useRef counter:

Keep interval stable (dependency on the prayer arrays + config only)

Use pageCountRef.current++ inside the timer

Acceptance:

Display rotates smoothly with consistent timing.

Archive prayers appear occasionally, clearly labeled.

4) Update /display look & feel (remove Jubilee + new theme + candles)
Files:

src/components/PrayerWallDisplay.tsx

src/app/display/page.tsx

src/app/globals.css (and/or Tailwind config if needed)

public/images/*

4a) Remove Jubilee branding
Remove Jubilee logo image usage (/images/Jubilee-Logo.png)

Change header text from “Jubilee Prayer Wall” to:

“Prayer Wall”

Keep Saint Helen submark/logo.

4b) Replace prayer hands with candles
Places to update:

The instruction page currently shows 🙏 emoji — replace with a candle motif.

The prayer list UI currently may use prayer hands icons — replace with a small candle icon.

Implementation approach:

Create a reusable component:

src/components/CandleIcon.tsx (new)

Use simple HTML/CSS with subtle animation:

wax body

wick

flame that gently flickers using keyframes

Keep animation minimal (devotional, not gimmicky).

4c) “Apple Liquid Glass” styling
Replace the current frosted card style (e.g. bg-slate-800/70 border ... backdrop-blur-sm) with a more “liquid glass” vibe:

translucent gradient background

softer border

higher blur

subtle highlight edge (like light reflecting)

Create utility classes in globals.css, e.g.:

.liquid-glass

.liquid-glass-border

.liquid-glass-shadow

Example characteristics:

backdrop-filter: blur(18px) saturate(160%)

background gradient with low alpha

subtle 1px border with white alpha

soft shadow

Also update the page background gradient to be slightly different than Jubilee year.
Keep it reverent (deep navy / charcoal + subtle blue/purple glow), but distinct.

Acceptance:

The UI clearly looks like a new “season” (not Jubilee), while maintaining the same layout.

Cards feel “liquid glass” vs “frosted”.

5) Update any other pages that reference Jubilee/Google
src/app/page.tsx (home / submission entrypoint): ensure wording no longer says Jubilee.

README.md: remove Google Sheets setup instructions; update env var docs to Supabase only.

Configuration Recommendations (defaults)
In DISPLAY_CONFIG, set:

recentDays: keep current (e.g., 7 or 14)

prayersPerPage: keep current

rotationIntervalMs: keep current

instructionPageFrequency: keep current

recentWeight: 0.70

olderWeight: 0.25

archiveWeight: 0.05

Ensure weights sum to 1.0 (or normalize).

API Contract Details
GET /api/prayers
Return:

wall prayers as created_at desc limited (e.g., 800)

archive sample limited (e.g., 120)

POST /api/submit-prayer
Input:

json
Copy code
{ "prayer": "Please pray for..." }
Optional honeypot:

json
Copy code
{ "prayer": "...", "website": "" }
Output:

json
Copy code
{ "ok": true }
Visual copy changes (suggested)
Replace:

“Jubilee Prayer Wall”
With:

“Prayer Wall”

Instruction card:

“Submit Your Prayer Intention”

“Use the iPad in the church — or visit prayerwall.sainthelen.org”
Add candle icon/animation under the instructions.

Archive label (when showing archive strategy):

“From the Jubilee Year of Hope (2025)”
Keep it subtle, not huge.

Final Acceptance Checklist
 App builds and runs with no Google dependencies

 Submissions go to Supabase only, with server-side validation

 Display pulls:

mostly recent from prayer_wall

some older from prayer_wall

occasional archive from jubilee_2025

 Jubilee logo removed; theme updated; liquid glass UI applied

 Candle icon replaces prayer hands and is subtly animated

 /api/rss and /api/prayers/embed are removed (or rewritten to Supabase-only if truly needed)

Notes / Guardrails
Do NOT delete any prayers from the database.

Always preserve the jubilee_2025 season as an archive.

Keep animation understated (slow flicker, low contrast).

Avoid large performance hits on /display (don’t fetch entire DB).