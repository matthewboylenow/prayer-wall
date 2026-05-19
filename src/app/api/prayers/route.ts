import { NextResponse } from 'next/server'
import { sql, type PrayerRow } from '@/lib/db'

export const dynamic = 'force-dynamic'

const WALL_LIMIT = 800
const ARCHIVE_SAMPLE_SIZE = 120

export async function GET() {
  try {
    const wallRows = (await sql`
      SELECT id, content, created_at, season
      FROM prayers
      WHERE season = 'prayer_wall'
      ORDER BY created_at DESC
      LIMIT ${WALL_LIMIT}
    `) as PrayerRow[]

    const archiveCountRow = (await sql`
      SELECT COUNT(*)::int AS count
      FROM prayers
      WHERE season = 'jubilee_2025'
    `) as Array<{ count: number }>
    const totalArchive = archiveCountRow[0]?.count ?? 0

    let archiveSample: PrayerRow[] = []
    if (totalArchive > 0) {
      const maxOffset = Math.max(0, totalArchive - ARCHIVE_SAMPLE_SIZE)
      const randomOffset = Math.floor(Math.random() * (maxOffset + 1))

      archiveSample = (await sql`
        SELECT id, content, created_at, season
        FROM prayers
        WHERE season = 'jubilee_2025'
        ORDER BY created_at DESC
        OFFSET ${randomOffset}
        LIMIT ${ARCHIVE_SAMPLE_SIZE}
      `) as PrayerRow[]
    }

    const totalWallRow = (await sql`
      SELECT COUNT(*)::int AS count
      FROM prayers
      WHERE season = 'prayer_wall'
    `) as Array<{ count: number }>

    return NextResponse.json(
      {
        wall: wallRows,
        archiveSample,
        totalWall: totalWallRow[0]?.count ?? 0,
        totalArchive,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 's-maxage=300, stale-while-revalidate',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error fetching prayers:', error)
    return NextResponse.json({ error: 'Failed to fetch prayers' }, { status: 500 })
  }
}
