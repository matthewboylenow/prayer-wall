# Saint Helen Prayer Wall

A digital prayer wall for Saint Helen Parish, built with Next.js and Supabase.

## Features

- Submit prayer intentions via web form
- Display rotating prayers on a vertical display screen
- Archive support for historical prayers (Jubilee 2025)
- Liquid glass UI with animated candle motifs
- Mobile-friendly submission interface

## Setup

### Prerequisites

- Node.js 18+
- Supabase account

### Environment Variables

Create a `.env.local` file with:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

Run the following SQL in your Supabase SQL editor:

```sql
-- Create prayers table
create table if not exists public.prayers (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  created_at timestamp with time zone default now(),
  season text default 'prayer_wall'
);

-- Create index for efficient querying
create index if not exists prayers_season_created_at_idx
on public.prayers (season, created_at desc);

-- Enable Row Level Security
alter table public.prayers enable row level security;

-- Allow public read access
create policy "Allow public read" on public.prayers
  for select using (true);

-- Allow public insert
create policy "Allow public insert" on public.prayers
  for insert with check (true);
```

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

## Display Configuration

The display rotates through prayers with weighted strategy:
- 70% Recent prayers (last 7 days)
- 25% Older prayers from current wall
- 5% Archive prayers (Jubilee 2025)

## Seasons

Prayers are tagged with a `season` field:
- `prayer_wall` - Current ongoing wall (default for new submissions)
- `jubilee_2025` - Archive from Jubilee Year of Hope
