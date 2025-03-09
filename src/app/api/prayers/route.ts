import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Get total count
    const { count, error: countError } = await supabase
      .from('prayers')
      .select('*', { count: 'exact', head: true })
      
    if (countError) throw countError
    
// Get all prayers
const { data, error } = await supabase
  .from('prayers')
  .select('*')
  .order('created_at', { ascending: true }) // Change to ascending for chronological order
      
    if (error) throw error
    
    return NextResponse.json({
      prayers: data,
      total: count || 0,
      page: 0,
      limit: data.length
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