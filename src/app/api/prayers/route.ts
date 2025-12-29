import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const WALL_LIMIT = 800
const ARCHIVE_SAMPLE_SIZE = 120

export async function GET() {
  try {
    // Get wall prayers (prayer_wall season) - most recent first
    const { data: wallData, error: wallError, count: wallCount } = await supabase
      .from('prayers')
      .select('*', { count: 'exact' })
      .eq('season', 'prayer_wall')
      .order('created_at', { ascending: false })
      .limit(WALL_LIMIT)

    if (wallError) throw wallError

    // Get total archive count for random offset calculation
    const { count: archiveCount, error: archiveCountError } = await supabase
      .from('prayers')
      .select('*', { count: 'exact', head: true })
      .eq('season', 'jubilee_2025')

    if (archiveCountError) throw archiveCountError

    // Fetch archive sample with random offset for variety
    let archiveSample: typeof wallData = []
    const totalArchive = archiveCount || 0

    if (totalArchive > 0) {
      // Calculate a random offset for variety
      const maxOffset = Math.max(0, totalArchive - ARCHIVE_SAMPLE_SIZE)
      const randomOffset = Math.floor(Math.random() * (maxOffset + 1))

      const { data: archiveData, error: archiveError } = await supabase
        .from('prayers')
        .select('*')
        .eq('season', 'jubilee_2025')
        .order('created_at', { ascending: false })
        .range(randomOffset, randomOffset + ARCHIVE_SAMPLE_SIZE - 1)

      if (archiveError) throw archiveError
      archiveSample = archiveData || []
    }

    return NextResponse.json({
      wall: wallData || [],
      archiveSample,
      totalWall: wallCount || 0,
      totalArchive,
      generatedAt: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Error fetching prayers:', error)
    return NextResponse.json({ error: 'Failed to fetch prayers' }, { status: 500 })
  }
}
