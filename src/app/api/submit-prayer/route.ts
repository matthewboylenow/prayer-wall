import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Blocked words list (same as client-side)
const BLOCKED_WORDS = [
  'damn', 'hell', 'shit', 'fuck', 'ass', 'bitch', 'crap', 'piss',
  'bastard', 'slut', 'whore', 'dick', 'cock', 'pussy'
].map(word => word.toLowerCase())

const containsBlockedWords = (text: string): boolean => {
  const words = text.toLowerCase().split(/\s+/)
  return words.some(word => BLOCKED_WORDS.includes(word))
}

// Simple in-memory rate limiting (resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX = 5 // Max 5 submissions per minute per IP

const isRateLimited = (ip: string): boolean => {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return true
  }

  record.count++
  return false
}

const MAX_PRAYER_LENGTH = 300

export async function POST(request: Request) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Check rate limit
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { prayer, website } = body

    // Honeypot check - if website field is filled, it's likely a bot
    if (website && website.trim() !== '') {
      // Silently reject but return success to not tip off bots
      return NextResponse.json({ ok: true })
    }

    // Validate prayer exists and is a string
    if (!prayer || typeof prayer !== 'string') {
      return NextResponse.json(
        { error: 'Prayer content is required' },
        { status: 400 }
      )
    }

    // Trim and validate length
    const trimmedPrayer = prayer.trim()

    if (trimmedPrayer.length === 0) {
      return NextResponse.json(
        { error: 'Prayer cannot be empty' },
        { status: 400 }
      )
    }

    if (trimmedPrayer.length > MAX_PRAYER_LENGTH) {
      return NextResponse.json(
        { error: `Prayer must be ${MAX_PRAYER_LENGTH} characters or less` },
        { status: 400 }
      )
    }

    // Check for blocked words
    if (containsBlockedWords(trimmedPrayer)) {
      return NextResponse.json(
        { error: 'Please revise your prayer to remove inappropriate language' },
        { status: 400 }
      )
    }

    // Insert into Supabase (season defaults to 'prayer_wall' via DB default)
    const { data, error } = await supabase
      .from('prayers')
      .insert([{
        content: trimmedPrayer,
        created_at: new Date().toISOString()
      }])
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, id: data?.id })
  } catch (error) {
    console.error('Error submitting prayer:', error)
    return NextResponse.json(
      { error: 'Failed to submit prayer' },
      { status: 500 }
    )
  }
}
