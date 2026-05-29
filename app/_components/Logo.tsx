import React from 'react'

interface LogoProps {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
  iconOnly?: boolean
  className?: string
}

const sizes = {
  sm: { height: 32, symbolSize: 21, fontSize: 17, tagSize: 5.5, bracketW: 6, letterY: 22, dotCy: 27.5, dotR: 2 },
  md: { height: 48, symbolSize: 32, fontSize: 26, tagSize: 8,   bracketW: 8, letterY: 33, dotCy: 41,   dotR: 3 },
  lg: { height: 64, symbolSize: 42, fontSize: 34, tagSize: 10,  bracketW: 9, letterY: 44, dotCy: 55,   dotR: 4 },
}

export function Logo({
  variant = 'light',
  size = 'md',
  showTagline = false,
  iconOnly = false,
  className = '',
}: LogoProps) {
  const s = sizes[size]
  const h = s.height
  const bracketColor = variant === 'dark' ? '#60A5FA' : '#178CF2'
  const textColor    = variant === 'dark' ? '#FFFFFF'  : '#0F172A'
  const tagColor     = variant === 'dark' ? '#475569'  : '#94A3B8'
  const symbolWidth  = h + 4
  const totalWidth   = iconOnly ? symbolWidth : symbolWidth + (size === 'lg' ? 232 : size === 'md' ? 174 : 138)

  return (
    <svg
      width={totalWidth}
      height={h}
      viewBox={`0 0 ${totalWidth} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="LANGBracket"
      className={className}
    >
      <title>LANGBracket</title>

      {/* Symbol [ L· ] */}
      <g>
        {/* Bracket lewy */}
        <path d={`M2 2 L2 ${h - 2}`}       stroke={bracketColor} strokeWidth={s.bracketW * 0.5} strokeLinecap="round" fill="none"/>
        <path d={`M2 2 L${h * 0.2} 2`}     stroke={bracketColor} strokeWidth={s.bracketW * 0.5} strokeLinecap="round" fill="none"/>
        <path d={`M2 ${h - 2} L${h * 0.2} ${h - 2}`} stroke={bracketColor} strokeWidth={s.bracketW * 0.5} strokeLinecap="round" fill="none"/>

        {/* L + kropka */}
        <text
          x={symbolWidth / 2}
          y={s.letterY}
          textAnchor="middle"
          fontSize={s.symbolSize}
          fontWeight="500"
          fill={bracketColor}
          fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
        >
          L
        </text>
        <circle cx={symbolWidth / 2} cy={s.dotCy} r={s.dotR} fill={bracketColor} opacity={0.45}/>

        {/* Bracket prawy */}
        <path d={`M${symbolWidth - 2} 2 L${symbolWidth - 2} ${h - 2}`}         stroke={bracketColor} strokeWidth={s.bracketW * 0.5} strokeLinecap="round" fill="none"/>
        <path d={`M${symbolWidth - h * 0.2} 2 L${symbolWidth - 2} 2`}           stroke={bracketColor} strokeWidth={s.bracketW * 0.5} strokeLinecap="round" fill="none"/>
        <path d={`M${symbolWidth - h * 0.2} ${h - 2} L${symbolWidth - 2} ${h - 2}`} stroke={bracketColor} strokeWidth={s.bracketW * 0.5} strokeLinecap="round" fill="none"/>
      </g>

      {/* Wordmark */}
      {!iconOnly && (
        <>
          <text
            x={symbolWidth + 10}
            y={s.letterY}
            fontSize={s.fontSize}
            fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
            letterSpacing="-0.5"
          >
            <tspan fontWeight="700" fill={textColor}>LANG</tspan>
            <tspan fontWeight="400" fill={bracketColor}>Bracket</tspan>
          </text>
          {showTagline && (
            <text
              x={symbolWidth + 11}
              y={h - 4}
              fontSize={s.tagSize}
              fill={tagColor}
              fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
              letterSpacing="1.5"
            >
              YOUR PERSONAL ENGLISH GUIDE
            </text>
          )}
        </>
      )}
    </svg>
  )
}

export default Logo
