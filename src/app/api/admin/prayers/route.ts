import { NextResponse } from 'next/server'
import { sql, type PrayerRow, type PrayerStatus } from '@/lib/db'
import { isAdminRequest } from '@/lib/adminAuth'
import { aiModerationEnabled, AI_MODEL } from '@/lib/aiModeration'

export const dynamic = 'force-dynamic'

const STATUSES: PrayerStatus[] = ['pending', 'approved', 'rejected']
const LIST_LIMIT = 200

function isStatus(v: unknown): v is PrayerStatus {
  return typeof v === 'string' && (STATUSES as string[]).includes(v)
}

async function counts() {
  const rows = (await sql`
    SELECT status, COUNT(*)::int AS count
    FROM prayers
    WHERE season = 'prayer_wall'
    GROUP BY status
  `) as Array<{ status: string; count: number }>
  const out: Record<PrayerStatus, number> = { pending: 0, approved: 0, rejected: 0 }
  for (const r of rows) if (isStatus(r.status)) out[r.status] = r.count
  return out
}

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const url = new URL(request.url)
  const status = url.searchParams.get('status') ?? 'pending'
  if (!isStatus(status)) {
    return NextResponse.json({ error: 'Bad status' }, { status: 400 })
  }

  const prayers = (await sql`
    SELECT id, content, created_at, season, status, flags, moderation_reason, moderated_by, reviewed_at
    FROM prayers
    WHERE season = 'prayer_wall' AND status = ${status}
    ORDER BY created_at DESC
    LIMIT ${LIST_LIMIT}
  `) as PrayerRow[]

  return NextResponse.json({
    prayers,
    counts: await counts(),
    ai: { enabled: aiModerationEnabled(), model: AI_MODEL },
  })
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const { id, status } = body as { id?: unknown; status?: unknown }
  if (typeof id !== 'string' || !isStatus(status)) {
    return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
  }

  const rows = (await sql`
    UPDATE prayers
    SET status = ${status},
        moderated_by = 'staff',
        reviewed_at = now()
    WHERE id = ${id}
    RETURNING id, status
  `) as Array<{ id: string; status: PrayerStatus }>

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true, prayer: rows[0], counts: await counts() })
}
