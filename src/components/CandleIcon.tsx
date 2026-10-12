// A votive candle: rust glass cup, cream wax, gold flame. Static apart from a
// slow opacity breathe on the flame, which is off under reduced-motion.

interface CandleIconProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Seconds to offset the flame's breathe so a row never blinks in unison. */
  delay?: number
}

const HEIGHTS = { sm: 26, md: 56, lg: 76 }

export default function CandleIcon({ size = 'md', className = '', delay = 0 }: CandleIconProps) {
  const h = HEIGHTS[size]
  const w = Math.round(h * (32 / 48))
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 32 48"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <g className="candle-flame" style={{ animationDelay: `${delay}s` }}>
        <path d="M16 2 C12.5 8.5 10 11.5 10 16 a6 6 0 0 0 12 0 C22 11.5 19.5 8.5 16 2Z" fill="#D4AF37" />
        <path d="M16 10 C14.4 13 13.6 14.6 13.6 16.4 a2.4 2.4 0 0 0 4.8 0 C18.4 14.6 17.6 13 16 10Z" fill="#FAF9F7" opacity="0.9" />
      </g>
      <rect x="15.2" y="21" width="1.6" height="3.5" fill="#1F2430" />
      {/* glass cup */}
      <rect x="6" y="23" width="20" height="23" rx="3" fill="#CD5334" />
      <rect x="6" y="23" width="20" height="23" rx="3" fill="none" stroke="#9C3A23" strokeWidth="1" />
      {/* wax surface */}
      <rect x="9" y="25" width="14" height="5" rx="1.5" fill="#F2EFE8" />
      {/* a little light on the glass */}
      <rect x="9" y="32" width="2" height="10" rx="1" fill="#FAF9F7" opacity="0.25" />
    </svg>
  )
}
