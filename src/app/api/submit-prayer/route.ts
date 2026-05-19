import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { containsBlockedWords, MAX_PRAYER_LENGTH } from '@/lib/moderation'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { prayer, website } = body

    if (website && typeof website === 'string' && website.trim() !== '') {
      return NextResponse.json({ ok: true })
    }

    if (!prayer || typeof prayer !== 'string') {
      return NextResponse.json({ error: 'Prayer content is required' }, { status: 400 })
    }

    const trimmedPrayer = prayer.trim()

    if (trimmedPrayer.length === 0) {
      return NextResponse.json({ error: 'Prayer cannot be empty' }, { status: 400 })
    }

    if (trimmedPrayer.length > MAX_PRAYER_LENGTH) {
      return NextResponse.json(
        { error: `Prayer must be ${MAX_PRAYER_LENGTH} characters or less` },
        { status: 400 }
      )
    }

    if (containsBlockedWords(trimmedPrayer)) {
      return NextResponse.json(
        { error: 'Please revise your prayer to remove inappropriate language' },
        { status: 400 }
      )
    }

    const rows = (await sql`
      INSERT INTO prayers (content, season)
      VALUES (${trimmedPrayer}, 'prayer_wall')
      RETURNING id
    `) as Array<{ id: string }>

    return NextResponse.json({ ok: true, id: rows[0]?.id })
  } catch (error) {
    console.error('Error submitting prayer:', error)
    return NextResponse.json({ error: 'Failed to submit prayer' }, { status: 500 })
  }
}
