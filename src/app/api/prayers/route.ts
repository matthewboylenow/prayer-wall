import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

const WALL_LIMIT = 800
const ARCHIVE_SAMPLE_SIZE = 120

interface PublicPrayer {
  id: string
  content: string
  created_at: string
  season: string
}

export async function GET() {
  try {
    const wallRows = (await sql`
      SELECT id, content, created_at, season
      FROM prayers
      WHERE season = 'prayer_wall' AND status = 'approved'
      ORDER BY created_at DESC
      LIMIT ${WALL_LIMIT}
    `) as PublicPrayer[]

    const archiveCountRow = (await sql`
      SELECT COUNT(*)::int AS count
      FROM prayers
      WHERE season = 'jubilee_2025' AND status = 'approved'
    `) as Array<{ count: number }>
    const totalArchive = archiveCountRow[0]?.count ?? 0

    let archiveSample: PublicPrayer[] = []
    if (totalArchive > 0) {
      const maxOffset = Math.max(0, totalArchive - ARCHIVE_SAMPLE_SIZE)
      const randomOffset = Math.floor(Math.random() * (maxOffset + 1))

      archiveSample = (await sql`
        SELECT id, content, created_at, season
        FROM prayers
        WHERE season = 'jubilee_2025' AND status = 'approved'
        ORDER BY created_at DESC
        OFFSET ${randomOffset}
        LIMIT ${ARCHIVE_SAMPLE_SIZE}
      `) as PublicPrayer[]
    }

    const totalWallRow = (await sql`
      SELECT COUNT(*)::int AS count
      FROM prayers
      WHERE season = 'prayer_wall' AND status = 'approved'
    `) as Array<{ count: number }>

    // Candles lit today and this week, in the parish's own time zone.
    const litRow = (await sql`
      SELECT
        COUNT(*) FILTER (
          WHERE (created_at AT TIME ZONE 'America/New_York')::date = (now() AT TIME ZONE 'America/New_York')::date
        )::int AS today,
        COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS week
      FROM prayers
      WHERE season = 'prayer_wall' AND status = 'approved'
    `) as Array<{ today: number; week: number }>

    return NextResponse.json(
      {
        wall: wallRows,
        archiveSample,
        totalWall: totalWallRow[0]?.count ?? 0,
        totalArchive,
        litToday: litRow[0]?.today ?? 0,
        litThisWeek: litRow[0]?.week ?? 0,
        generatedAt: new Date().toISOString(),
      },
      // No CDN caching: when staff hide a prayer it must leave the screen on
      // the display's next refetch, not five minutes later.
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Error fetching prayers:', error)
    return NextResponse.json({ error: 'Failed to fetch prayers' }, { status: 500 })
  }
}
