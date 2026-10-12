import { NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'
import { sql, type PrayerStatus, type ModerationSource } from '@/lib/db'
import { assessPrayer, MAX_PRAYER_LENGTH, MIN_PRAYER_LENGTH } from '@/lib/moderation'
import { moderateWithAi, aiModerationEnabled } from '@/lib/aiModeration'

export const dynamic = 'force-dynamic'

// The church iPad and every phone on parish wifi share one public IP, so the
// per-IP limit has to be generous enough for a line of people after Mass.
const RATE_LIMIT_PER_MINUTE = 8

function submitterHash(request: Request): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const secret = process.env.HASH_SECRET || process.env.ADMIN_PASSWORD || 'prayer-wall'
  const day = new Date().toISOString().slice(0, 10)
  return createHmac('sha256', secret).update(`${ip}|${day}`).digest('hex')
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { prayer, website } = body as { prayer?: unknown; website?: unknown }

    // Honeypot: real users never fill this field.
    if (typeof website === 'string' && website.trim() !== '') {
      return NextResponse.json({ ok: true })
    }

    if (typeof prayer !== 'string') {
      return NextResponse.json({ error: 'Prayer content is required' }, { status: 400 })
    }

    const text = prayer.replace(/\s+/g, ' ').trim()

    if (text.length < MIN_PRAYER_LENGTH) {
      return NextResponse.json({ error: 'Prayer cannot be empty' }, { status: 400 })
    }
    if (text.length > MAX_PRAYER_LENGTH) {
      return NextResponse.json(
        { error: `Prayer must be ${MAX_PRAYER_LENGTH} characters or less` },
        { status: 400 },
      )
    }

    const hash = submitterHash(request)

    // Double-tap on the iPad: same text from the same place within a few
    // minutes is the same prayer. Say thanks again, store nothing.
    const dup = (await sql`
      SELECT id FROM prayers
      WHERE submitter_hash = ${hash}
        AND content = ${text}
        AND created_at > now() - interval '10 minutes'
      LIMIT 1
    `) as Array<{ id: string }>
    if (dup.length > 0) {
      return NextResponse.json({ ok: true, id: dup[0].id })
    }

    const recent = (await sql`
      SELECT COUNT(*)::int AS count FROM prayers
      WHERE submitter_hash = ${hash}
        AND created_at > now() - interval '1 minute'
    `) as Array<{ count: number }>
    if ((recent[0]?.count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
      return NextResponse.json(
        { error: 'Please wait a moment before sending another prayer.' },
        { status: 429 },
      )
    }

    // Layer 1: rules.
    const rules = assessPrayer(text)

    if (rules.verdict === 'reject') {
      await sql`
        INSERT INTO prayers (content, season, status, flags, moderation_reason, moderated_by, reviewed_at, submitter_hash)
        VALUES (${text}, 'prayer_wall', 'rejected', ${rules.flags}::text[], ${rules.reason}, 'rules', now(), ${hash})
      `
      // The parishioner still sees "received". Staff can see why it was held.
      return NextResponse.json({ ok: true })
    }

    // Store first as pending so a timeout in the AI call can never lose a prayer.
    const inserted = (await sql`
      INSERT INTO prayers (content, season, status, flags, moderation_reason, submitter_hash)
      VALUES (${text}, 'prayer_wall', 'pending', ${rules.flags}::text[], ${rules.reason}, ${hash})
      RETURNING id
    `) as Array<{ id: string }>
    const id = inserted[0]?.id

    // Layer 2: AI, when configured.
    let status: PrayerStatus
    let reason = rules.reason
    let moderatedBy: ModerationSource = 'rules'
    const flags = [...rules.flags]
    const sensitive = flags.includes('pastoral')

    const ai = await moderateWithAi(text, rules.flags)

    if (ai) {
      moderatedBy = 'ai'
      reason = `${ai.category}: ${ai.reason}`
      if (ai.pastoral_flag && !flags.includes('pastoral')) flags.push('pastoral')
      if (ai.verdict === 'approve') status = 'approved'
      else if (ai.verdict === 'reject' && !sensitive) status = 'rejected'
      else status = 'pending'
    } else if (aiModerationEnabled()) {
      // AI is configured but failed: hold for staff rather than guess.
      status = 'pending'
      reason = `${rules.reason}; AI check unavailable`
    } else {
      status = rules.verdict === 'approve' ? 'approved' : 'pending'
    }

    await sql`
      UPDATE prayers
      SET status = ${status},
          flags = ${flags}::text[],
          moderation_reason = ${reason},
          moderated_by = ${moderatedBy},
          reviewed_at = CASE WHEN ${status} = 'pending' THEN NULL ELSE now() END
      WHERE id = ${id}
    `

    return NextResponse.json({ ok: true, id })
  } catch (error) {
    console.error('Error submitting prayer:', error)
    return NextResponse.json({ error: 'Failed to submit prayer' }, { status: 500 })
  }
}
