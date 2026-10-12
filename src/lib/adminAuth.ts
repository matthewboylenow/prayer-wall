// Password-protected staff area. One shared password from ADMIN_PASSWORD.
// The session cookie holds an HMAC derived from the password, so changing the
// password in Vercel signs everyone out.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'pw_admin'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function secret(): string | null {
  const pw = process.env.ADMIN_PASSWORD
  return pw && pw.length > 0 ? pw : null
}

export function adminConfigured(): boolean {
  return secret() !== null
}

function sessionToken(): string | null {
  const s = secret()
  if (!s) return null
  return createHmac('sha256', s).update('prayer-wall-admin-session').digest('hex')
}

export function passwordMatches(candidate: unknown): boolean {
  const s = secret()
  if (!s || typeof candidate !== 'string') return false
  const a = Buffer.from(candidate)
  const b = Buffer.from(s)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function isAdminRequest(): Promise<boolean> {
  const expected = sessionToken()
  if (!expected) return false
  const store = await cookies()
  const got = store.get(ADMIN_COOKIE)?.value
  if (!got || got.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(got), Buffer.from(expected))
}

export async function setAdminCookie(): Promise<void> {
  const token = sessionToken()
  if (!token) return
  const store = await cookies()
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

export async function clearAdminCookie(): Promise<void> {
  const store = await cookies()
  store.delete(ADMIN_COOKIE)
}
