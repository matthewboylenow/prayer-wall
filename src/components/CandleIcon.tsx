'use client'
import React from 'react';

interface CandleIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CandleIcon({ size = 'md', className = '' }: CandleIconProps) {
  const sizeClasses = {
    sm: 'w-8 h-12',
    md: 'w-12 h-18',
    lg: 'w-20 h-28',
  };

  const flameSizes = {
    sm: { width: 8, height: 12 },
    md: { width: 12, height: 18 },
    lg: { width: 20, height: 28 },
  };

  const flameSize = flameSizes[size];

  return (
    <div className={`relative flex flex-col items-center ${sizeClasses[size]} ${className}`}>
      {/* Flame container */}
      <div className="relative flex-shrink-0" style={{ width: flameSize.width, height: flameSize.height }}>
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full blur-md animate-candle-glow"
          style={{
            background: 'radial-gradient(ellipse at center bottom, rgba(251, 191, 36, 0.4) 0%, transparent 70%)',
            transform: 'scale(2.5)',
          }}
        />

        {/* Main flame */}
        <svg
          viewBox="0 0 24 36"
          className="w-full h-full animate-candle-flicker"
          style={{ filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.6))' }}
        >
          {/* Outer flame (orange/yellow) */}
          <path
            d="M12 2 C12 2 6 12 6 20 C6 26 9 32 12 34 C15 32 18 26 18 20 C18 12 12 2 12 2Z"
            fill="url(#flameGradientOuter)"
            className="origin-bottom"
          />
          {/* Inner flame (white/yellow) */}
          <path
            d="M12 10 C12 10 9 16 9 22 C9 26 10 30 12 32 C14 30 15 26 15 22 C15 16 12 10 12 10Z"
            fill="url(#flameGradientInner)"
            className="origin-bottom"
          />
          <defs>
            <linearGradient id="flameGradientOuter" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="40%" stopColor="#fbbf24" />
              <stop offset="80%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#fef3c7" />
            </linearGradient>
            <linearGradient id="flameGradientInner" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fffbeb" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Wick */}
      <div
        className="bg-gray-800 rounded-full flex-shrink-0"
        style={{
          width: size === 'lg' ? 3 : 2,
          height: size === 'lg' ? 6 : 4,
          marginTop: -2
        }}
      />

      {/* Candle body */}
      <div
        className="rounded-b-sm flex-1"
        style={{
          width: size === 'lg' ? 16 : size === 'md' ? 10 : 6,
          background: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)',
          boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.1), inset 2px 0 4px rgba(255,255,255,0.3)',
          borderRadius: '0 0 2px 2px',
        }}
      />
    </div>
  );
}
