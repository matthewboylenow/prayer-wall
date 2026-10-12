// A traditional votive candle: a flared ruby glass cup with a rim, cream wax
// visible through the glass, and a teardrop flame with a bright core and a
// soft glow. The flame sways and stretches on two different rhythms so the
// motion never reads as a loop. Everything stops under prefers-reduced-motion.

interface CandleIconProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Seconds to offset the animation phase so a row of candles is never in step. */
  delay?: number
}

const HEIGHTS = { sm: 30, md: 62, lg: 96 }

let uid = 0

export default function CandleIcon({ size = 'md', className = '', delay = 0 }: CandleIconProps) {
  const h = HEIGHTS[size]
  const w = Math.round(h * (40 / 64))
  // Gradient ids must be unique per instance or browsers resolve the wrong one.
  const id = `c${(uid = (uid + 1) % 100000)}`
  const origin = { transformOrigin: '20px 27px', transformBox: 'view-box' as const }

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 40 64"
      className={`shrink-0 overflow-visible ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#F2C94C" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#F2C94C" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#F2C94C" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-flame`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#C9842A" />
          <stop offset="45%" stopColor="#E9B13B" />
          <stop offset="100%" stopColor="#F7DC7A" />
        </linearGradient>
        <linearGradient id={`${id}-core`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#F9E7A8" />
          <stop offset="100%" stopColor="#FFFBEA" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E0714D" />
          <stop offset="35%" stopColor="#C8522F" />
          <stop offset="100%" stopColor="#8E3419" />
        </linearGradient>
        <linearGradient id={`${id}-wax`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE9DD" stopOpacity="0.75" />
          <stop offset="55%" stopColor="#FFD9C7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FFD9C7" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* glow */}
      <ellipse
        className="candle-glow"
        style={{ animationDelay: `${-delay}s` }}
        cx="20" cy="17" rx="13" ry="15"
        fill={`url(#${id}-glow)`}
      />

      {/* flame: outer group sways, inner group stretches */}
      <g className="candle-sway" style={{ ...origin, animationDelay: `${-delay}s` }}>
        <g className="candle-stretch" style={{ ...origin, animationDelay: `${-(delay * 0.63)}s` }}>
          <path
            d="M20 4 C16.2 10.8 13.4 14.6 13.4 19.4 C13.4 24 16.3 27 20 27 C23.7 27 26.6 24 26.6 19.4 C26.6 14.6 23.8 10.8 20 4 Z"
            fill={`url(#${id}-flame)`}
          />
          <path
            d="M20 12.5 C18.2 16 17 17.8 17 20.4 C17 23 18.3 24.8 20 24.8 C21.7 24.8 23 23 23 20.4 C23 17.8 21.8 16 20 12.5 Z"
            fill={`url(#${id}-core)`}
          />
        </g>
      </g>

      {/* wick */}
      <path d="M20 26.5 L20 31" stroke="#2B2420" strokeWidth="1.4" strokeLinecap="round" />

      {/* glass cup, flared toward the rim */}
      <path
        d="M7.5 32 L32.5 32 L30.2 57.5 C30 60.5 27.5 62.5 24.5 62.5 L15.5 62.5 C12.5 62.5 10 60.5 9.8 57.5 Z"
        fill={`url(#${id}-glass)`}
      />
      {/* wax seen through the glass */}
      <path
        d="M9.2 36 L30.8 36 L29.6 50 L10.4 50 Z"
        fill={`url(#${id}-wax)`}
      />
      {/* highlight on the glass */}
      <path d="M11.5 36 L11.5 56" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="1.6" strokeLinecap="round" />
      {/* rim */}
      <ellipse cx="20" cy="32" rx="12.5" ry="2.6" fill="#F0A98E" />
      <ellipse cx="20" cy="32" rx="12.5" ry="2.6" fill="none" stroke="#9C3A23" strokeWidth="0.9" />
      <ellipse cx="20" cy="32.4" rx="10.2" ry="1.7" fill="#F8E0D2" />
      {/* base shadow line */}
      <path d="M12 61.5 L28 61.5" stroke="#5E2210" strokeOpacity="0.5" strokeWidth="1" strokeLinecap="round" />
    </svg>
  )
}
