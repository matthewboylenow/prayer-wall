// A quiet, static candle mark. No glow, no flicker.

interface CandleIconProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = { sm: 28, md: 44, lg: 72 }

export default function CandleIcon({ size = 'md', className = '' }: CandleIconProps) {
  const h = SIZES[size]
  const w = Math.round(h * 0.5)
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 24 48"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* flame */}
      <path d="M12 4 C9 10 7 13 7 17 a5 5 0 0 0 10 0 C17 13 15 10 12 4Z" fill="#D4AF37" />
      <path d="M12 11 C10.6 14 10 15.4 10 17.2 a2 2 0 0 0 4 0 C14 15.4 13.4 14 12 11Z" fill="#FAF9F7" opacity="0.85" />
      {/* wick */}
      <rect x="11.25" y="21" width="1.5" height="3" fill="#1f2430" />
      {/* body */}
      <rect x="7" y="24" width="10" height="22" rx="1.5" fill="#F2EFE8" stroke="#E5E1D8" />
    </svg>
  )
}
