'use client'
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import Image from 'next/image'
import CandleIcon from './CandleIcon'

interface Prayer {
  id: string
  content: string
  created_at: string
  season?: string
}

interface PrayersResponse {
  wall: Prayer[]
  archiveSample: Prayer[]
  totalWall: number
  totalArchive: number
  litToday: number
  litThisWeek: number
  generatedAt: string
}

const DISPLAY_CONFIG = {
  pageDisplayTime: 18000,
  transitionDuration: 700,
  refetchIntervalMs: 60 * 1000,
  instructionPageFrequency: 10,
  archiveWeight: 0.05,
  /** Height budget per card row; cards per page is derived from this. */
  rowHeight: 200,
  rowGap: 16,
  /** Vertical space inside <main> that is not the grid: padding + eyebrow. */
  mainChrome: 112,
  /** Most candles drawn in the footer rack; the count in words is exact. */
  rackMax: 36,
}

type DisplayStrategy = 'wall' | 'archive' | 'instruction'

/** Text size steps down for long prayers so nothing is ever clipped. */
function prayerFontSize(content: string): number {
  if (content.length > 220) return 20
  if (content.length > 150) return 22
  if (content.length > 80) return 24
  return 27
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

export default function PrayerWallDisplay() {
  const [wallPrayers, setWallPrayers] = useState<Prayer[]>([])
  const [archivePrayers, setArchivePrayers] = useState<Prayer[]>([])
  const [totalWall, setTotalWall] = useState(0)
  const [totalArchive, setTotalArchive] = useState(0)
  const [lit, setLit] = useState({ today: 0, week: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [displayStrategy, setDisplayStrategy] = useState<DisplayStrategy>('wall')
  const [isVisible, setIsVisible] = useState(true)
  const [layout, setLayout] = useState({ columns: 1, rows: 6 })

  const mainRef = useRef<HTMLElement>(null)
  const pageCountRef = useRef(0)
  const wallRef = useRef<Prayer[]>([])
  const archiveRef = useRef<Prayer[]>([])
  const wallPageRef = useRef(0)
  const layoutRef = useRef(layout)
  const newestIdRef = useRef<string | null>(null)
  const jumpToFrontRef = useRef(false)

  useEffect(() => { wallRef.current = wallPrayers }, [wallPrayers])
  useEffect(() => { archiveRef.current = archivePrayers }, [archivePrayers])
  useEffect(() => { layoutRef.current = layout }, [layout])

  // Cards per page from the real size of the content area, so portrait and
  // landscape screens are both filled and nothing is cut off. <main> is
  // always rendered, so this measures on first paint.
  useLayoutEffect(() => {
    const el = mainRef.current
    if (!el) return
    const measure = () => {
      const available = el.getBoundingClientRect().height - DISPLAY_CONFIG.mainChrome
      const columns = window.innerWidth > window.innerHeight ? 2 : 1
      const rows = Math.max(1, Math.floor((available + DISPLAY_CONFIG.rowGap) / (DISPLAY_CONFIG.rowHeight + DISPLAY_CONFIG.rowGap)))
      setLayout(prev => (prev.columns === columns && prev.rows === rows ? prev : { columns, rows }))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchPrayers = async (initial: boolean) => {
      try {
        const response = await fetch('/api/prayers', { cache: 'no-store' })
        if (!response.ok) {
          console.error('Failed to fetch prayers', response.status)
          return
        }
        const data: PrayersResponse = await response.json()
        if (cancelled) return
        const newestId = data.wall[0]?.id ?? null
        if (!initial && newestId && newestId !== newestIdRef.current) {
          // Someone just submitted a prayer. Show the front page next.
          jumpToFrontRef.current = true
        }
        newestIdRef.current = newestId
        setWallPrayers(data.wall)
        setArchivePrayers(data.archiveSample)
        setTotalWall(data.totalWall)
        setTotalArchive(data.totalArchive)
        setLit({ today: data.litToday ?? 0, week: data.litThisWeek ?? 0 })
        if (initial && data.wall.length === 0) setDisplayStrategy('instruction')
      } catch (err) {
        console.error('Error fetching prayers:', err)
        if (initial && !cancelled) setDisplayStrategy('instruction')
      } finally {
        if (initial && !cancelled) setIsLoading(false)
      }
    }

    fetchPrayers(true)
    const interval = setInterval(() => fetchPrayers(false), DISPLAY_CONFIG.refetchIntervalMs)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  useEffect(() => {
    const tick = () => {
      setIsVisible(false)

      setTimeout(() => {
        pageCountRef.current += 1
        const count = pageCountRef.current
        const wall = wallRef.current
        const archive = archiveRef.current
        const perPage = layoutRef.current.columns * layoutRef.current.rows

        if (wall.length === 0) {
          setDisplayStrategy('instruction')
          setCurrentPage(0)
          setIsVisible(true)
          return
        }

        if (jumpToFrontRef.current) {
          jumpToFrontRef.current = false
          wallPageRef.current = 0
          setDisplayStrategy('wall')
          setCurrentPage(0)
          setIsVisible(true)
          return
        }

        if (count % DISPLAY_CONFIG.instructionPageFrequency === 0) {
          setDisplayStrategy('instruction')
          setCurrentPage(0)
          setIsVisible(true)
          return
        }

        if (archive.length > 0 && Math.random() < DISPLAY_CONFIG.archiveWeight) {
          const maxPages = Math.max(1, Math.ceil(archive.length / perPage))
          setDisplayStrategy('archive')
          setCurrentPage(Math.floor(Math.random() * maxPages))
          setIsVisible(true)
          return
        }

        const maxPages = Math.max(1, Math.ceil(wall.length / perPage))
        wallPageRef.current = (wallPageRef.current + 1) % maxPages
        setDisplayStrategy('wall')
        setCurrentPage(wallPageRef.current)
        setIsVisible(true)
      }, DISPLAY_CONFIG.transitionDuration)
    }

    const timer = setInterval(tick, DISPLAY_CONFIG.pageDisplayTime)
    return () => clearInterval(timer)
  }, [])

  const perPage = layout.columns * layout.rows
  const source = displayStrategy === 'archive' ? archivePrayers : wallPrayers
  const displayedPrayers =
    displayStrategy === 'instruction'
      ? []
      : source.slice(currentPage * perPage, currentPage * perPage + perPage)

  const eyebrow =
    displayStrategy === 'archive'
      ? 'From the Jubilee Year of Hope · 2025'
      : 'Prayer intentions of our parish'

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-navy-deep text-cream">
      <header className="shrink-0 border-b border-white/10 px-12 pb-7 pt-9 text-center">
        <Image
          src="/images/Saint-Helen-Submark-White.png"
          alt="Saint Helen"
          width={500}
          height={84}
          className="mx-auto h-auto w-[380px]"
          priority
        />
        <h1 className="mt-5 font-heading text-[56px] font-bold leading-none text-white">Prayer Wall</h1>
      </header>

      <main ref={mainRef} className="flex min-h-0 flex-1 flex-col px-12 py-8">
        {isLoading ? (
          <p className="m-auto font-body text-3xl text-cream/70">Loading prayers…</p>
        ) : displayStrategy === 'instruction' ? (
          <div
            className="flex h-full items-center justify-center transition-opacity ease-in-out"
            style={{ opacity: isVisible ? 1 : 0, transitionDuration: `${DISPLAY_CONFIG.transitionDuration}ms` }}
          >
            <InstructionPage total={totalWall + totalArchive} />
          </div>
        ) : (
          <div
            className="flex min-h-0 flex-1 flex-col transition-opacity ease-in-out"
            style={{ opacity: isVisible ? 1 : 0, transitionDuration: `${DISPLAY_CONFIG.transitionDuration}ms` }}
          >
            <p className="eyebrow mb-5 shrink-0 text-center text-gold">{eyebrow}</p>
            <div
              className="grid min-h-0 flex-1"
              style={{
                gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
                gap: DISPLAY_CONFIG.rowGap,
              }}
            >
              {displayedPrayers.map((prayer, index) => (
                <article
                  key={`${prayer.id}-${currentPage}-${displayStrategy}`}
                  className="flex min-h-0 items-center gap-6 overflow-hidden rounded-[14px] border border-white/10 bg-navy px-7 py-5 text-cream opacity-0 animate-fadeIn"
                  style={{ animationDelay: `${index * 90}ms`, animationFillMode: 'forwards' }}
                >
                  <CandleIcon size="md" delay={(index * 1.3) % 4.1} />
                  <div className="min-w-0 flex-1">
                    <p
                      className="font-heading leading-[1.45]"
                      style={{
                        fontSize: prayerFontSize(prayer.content),
                        display: '-webkit-box',
                        WebkitLineClamp: 6,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {prayer.content}
                    </p>
                    <p className="mt-2 font-body text-[16px] text-cream/55">{formatDate(prayer.created_at)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-white/10 px-12 pb-5 pt-4 text-center">
        <CandleRack today={lit.today} week={lit.week} />
      </footer>
    </div>
  )
}

function InstructionPage({ total }: { total: number }) {
  return (
    <div className="w-full max-w-3xl rounded-[14px] border border-white/10 bg-navy px-14 py-14 text-center text-cream">
      <CandleIcon size="lg" className="mx-auto mb-8" />
      <p className="eyebrow mb-4 text-gold">Saint Helen</p>
      <h2 className="font-heading text-[44px] font-bold leading-tight text-white">
        Light a candle for someone
      </h2>
      <p className="mx-auto mt-6 max-w-xl font-body text-[26px] leading-relaxed text-cream/85">
        Share your prayer intention on the iPad in the church, or visit
      </p>
      <p className="mt-2 font-body text-[30px] font-semibold text-gold">prayerwall.sainthelen.org</p>
      <p className="mt-4 font-body text-[26px] leading-relaxed text-cream/85">on your phone.</p>
      {total > 0 && (
        <p className="mt-10 border-t border-white/10 pt-6 font-body text-[20px] text-cream/60">
          {total.toLocaleString('en-US')} candles lit by our parish
        </p>
      )}
    </div>
  )
}

function CandleRack({ today, week }: { today: number; week: number }) {
  const count = today > 0 ? today : week
  const period = today > 0 ? 'today' : 'this week'
  const drawn = Math.min(count, DISPLAY_CONFIG.rackMax)
  return (
    <div>
      {drawn > 0 && (
        <div className="mb-3 flex items-end justify-center gap-[7px]" aria-hidden="true">
          {Array.from({ length: drawn }, (_, i) => (
            <CandleIcon key={i} size="sm" delay={(i * 1.37) % 4.1} />
          ))}
        </div>
      )}
      <p className="font-body text-[21px] text-cream/70">
        {count > 0 ? (
          <>
            <span className="font-semibold text-white">{count.toLocaleString('en-US')}</span>{' '}
            {count === 1 ? 'candle' : 'candles'} lit {period} · Light yours at{' '}
            <span className="font-semibold text-white">prayerwall.sainthelen.org</span>
          </>
        ) : (
          <>
            Light a candle at <span className="font-semibold text-white">prayerwall.sainthelen.org</span> or on the iPad in the church
          </>
        )}
      </p>
    </div>
  )
}
