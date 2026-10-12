'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import CandleIcon from './CandleIcon'
import { MAX_PRAYER_LENGTH } from '@/lib/moderation'

const THANKS_MS = 5000

export default function PrayerForm() {
  const [prayer, setPrayer] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [phase, setPhase] = useState<'form' | 'sending' | 'thanks'>('form')
  const [error, setError] = useState('')
  const resetTimer = useRef<number | null>(null)

  useEffect(() => () => { if (resetTimer.current) window.clearTimeout(resetTimer.current) }, [])

  const remaining = MAX_PRAYER_LENGTH - prayer.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = prayer.trim()
    if (text.length === 0) { setError('Please type a prayer intention first.'); return }
    if (text.length > MAX_PRAYER_LENGTH) { setError(`Please keep your prayer to ${MAX_PRAYER_LENGTH} characters.`); return }

    setError('')
    setPhase('sending')
    try {
      const res = await fetch('/api/submit-prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prayer: text, website }),
      })
      if (res.ok) {
        setPrayer('')
        setPhase('thanks')
        resetTimer.current = window.setTimeout(() => setPhase('form'), THANKS_MS)
        return
      }
      const data = await res.json().catch(() => ({}))
      setError(
        res.status === 429
          ? 'Please wait a moment and try again.'
          : data.error || 'Something went wrong. Please try again.',
      )
      setPhase('form')
    } catch {
      setError('We could not reach the server. Please try again.')
      setPhase('form')
    }
  }

  return (
    <div className="min-h-screen bg-paper px-4 py-10 text-ink" style={{ minHeight: '100vh' }}>
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 text-center">
          <Image
            src="/images/Saint-Helen-Submark-Black.png"
            alt="Saint Helen"
            width={400}
            height={67}
            className="mx-auto mb-6 h-12 w-auto"
            priority
          />
        </div>

        {phase === 'thanks' ? (
          <div className="rounded-[14px] border border-line bg-white px-8 py-12 text-center" role="status" aria-live="polite">
            <CandleIcon size="lg" className="mx-auto mb-6" />
            <h2 className="font-heading text-3xl font-bold text-navy">Thank you</h2>
            <p className="mt-3 text-lg text-muted">
              Your prayer has been received and will be shared with the parish.
            </p>
          </div>
        ) : (
          <div className="rounded-[14px] border border-line bg-white px-6 py-8 sm:px-8">
            <p className="eyebrow mb-3 text-gold">Saint Helen</p>
            <h1 className="font-heading text-3xl font-bold leading-tight text-navy">
              Share your prayer intention
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted">
              Your intention will be shown on the prayer wall in the church and held in prayer by our parish community.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="prayer" className="sr-only">Prayer intention</label>
                <textarea
                  id="prayer"
                  value={prayer}
                  onChange={e => setPrayer(e.target.value.slice(0, MAX_PRAYER_LENGTH))}
                  maxLength={MAX_PRAYER_LENGTH}
                  required
                  disabled={phase === 'sending'}
                  placeholder="For my mother, who is in the hospital…"
                  className="w-full resize-none rounded-[12px] border border-line bg-white p-4 text-ink placeholder:text-muted/70 outline-none transition focus:border-navy focus:ring-[3px] focus:ring-navy/20"
                  style={{ fontSize: '18px', lineHeight: '1.5', minHeight: '160px', WebkitAppearance: 'none', WebkitTapHighlightColor: 'transparent' }}
                />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className={error ? 'text-rust-solid' : 'text-muted'} aria-live="polite">{error}</span>
                  <span className={`tabular-nums ${remaining < 30 ? 'text-rust-solid' : 'text-muted'}`}>
                    {remaining} left
                  </span>
                </div>
              </div>

              {/* Honeypot: hidden from people, filled by bots. */}
              <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
              </div>

              <button
                type="submit"
                disabled={phase === 'sending'}
                className="btn-primary w-full text-lg"
                style={{ minHeight: '60px', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
              >
                {phase === 'sending' ? 'Sending…' : 'Submit prayer'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-muted">
              Please do not include phone numbers or addresses. Intentions are reviewed before they appear.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
