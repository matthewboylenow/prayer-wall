import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

export const sql = neon(process.env.DATABASE_URL)

export type PrayerStatus = 'approved' | 'pending' | 'rejected'
export type ModerationSource = 'rules' | 'ai' | 'staff' | 'legacy'

export interface PrayerRow {
  id: string
  content: string
  created_at: string
  season: string
  status: PrayerStatus
  flags: string[]
  moderation_reason: string | null
  moderated_by: ModerationSource | null
  reviewed_at: string | null
}
