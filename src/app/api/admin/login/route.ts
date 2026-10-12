import { NextResponse } from 'next/server'
import {
  adminConfigured,
  passwordMatches,
  setAdminCookie,
  clearAdminCookie,
  isAdminRequest,
} from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!adminConfigured()) {
    return NextResponse.json({ configured: false, authenticated: false })
  }
  return NextResponse.json({ configured: true, authenticated: await isAdminRequest() })
}

export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: 'ADMIN_PASSWORD is not set on the server.' },
      { status: 503 },
    )
  }
  const body = await request.json().catch(() => ({}))
  const { password } = body as { password?: unknown }
  if (!passwordMatches(password)) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }
  await setAdminCookie()
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await clearAdminCookie()
  return NextResponse.json({ ok: true })
}
