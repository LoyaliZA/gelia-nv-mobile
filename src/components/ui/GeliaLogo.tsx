import { useId, type CSSProperties } from 'react'

type GeliaLogoVariant = 'default' | 'spin' | 'pulse' | 'float' | 'shatter' | 'sparkle' | 'fluid-fill'

interface PolygonData {
  points: string
  opacity: string
  tx: string
  ty: string
  rot: string
  delay: string
}

interface GeliaLogoProps {
  className?: string
  accentColor?: string
  variant?: GeliaLogoVariant
  progress?: number | null
}

const POLYGON_DATA: PolygonData[] = [
  { points: '30,10 70,10 30,30', opacity: '1.0', tx: '0px', ty: '-30px', rot: '45deg', delay: '0s' },
  { points: '10,30 30,30 10,70', opacity: '1.0', tx: '-30px', ty: '0px', rot: '-45deg', delay: '0.1s' },
  { points: '30,90 30,70 70,90', opacity: '1.0', tx: '0px', ty: '30px', rot: '45deg', delay: '0.2s' },
  { points: '90,70 70,70 90,50', opacity: '1.0', tx: '30px', ty: '30px', rot: '90deg', delay: '0.3s' },
  { points: '70,50 70,70 50,50', opacity: '1.0', tx: '20px', ty: '-20px', rot: '-90deg', delay: '0.4s' },
  { points: '70,10 70,30 30,30', opacity: '0.6', tx: '30px', ty: '-30px', rot: '180deg', delay: '0.1s' },
  { points: '30,30 30,70 10,70', opacity: '0.6', tx: '-20px', ty: '20px', rot: '90deg', delay: '0.2s' },
  { points: '30,70 70,70 70,90', opacity: '0.6', tx: '0px', ty: '40px', rot: '-45deg', delay: '0.3s' },
  { points: '70,70 70,50 90,50', opacity: '0.6', tx: '40px', ty: '0px', rot: '45deg', delay: '0.4s' },
  { points: '70,10 90,30 70,30', opacity: '0.3', tx: '40px', ty: '-20px', rot: '135deg', delay: '0.2s' },
  { points: '30,10 30,30 10,30', opacity: '0.3', tx: '-40px', ty: '-20px', rot: '-135deg', delay: '0.3s' },
  { points: '10,70 30,70 30,90', opacity: '0.3', tx: '-40px', ty: '20px', rot: '-45deg', delay: '0.4s' },
  { points: '70,90 70,70 90,70', opacity: '0.3', tx: '40px', ty: '40px', rot: '45deg', delay: '0.5s' },
]

function variantClass(variant: GeliaLogoVariant) {
  switch (variant) {
    case 'spin': return 'gelia-logo--spin'
    case 'pulse': return 'gelia-logo--pulse'
    case 'float': return 'gelia-logo--float'
    case 'shatter': return 'gelia-logo--shatter'
    case 'sparkle': return 'gelia-logo--sparkle'
    default: return 'gelia-logo--default'
  }
}

export function GeliaLogo({
  className = '',
  accentColor,
  variant = 'default',
  progress = null,
}: GeliaLogoProps) {
  const clipId = useId()
  const fluidY = progress !== null ? 100 - Math.min(100, Math.max(0, progress)) : 0
  const explicitColor = accentColor && accentColor !== 'var(--color-primario)' ? accentColor : undefined

  return (
    <svg
      viewBox="0 0 100 100"
      className={`gelia-logo ${className}`.trim()}
      style={explicitColor ? { color: explicitColor } : undefined}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {variant === 'fluid-fill' ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <rect
                x="0"
                y={fluidY}
                width="100"
                height="100"
                className={progress === null ? 'gelia-logo-fluid-rise' : 'gelia-logo-fluid-static'}
              />
            </clipPath>
          </defs>
          <g fill="#4b5563" className="gelia-logo-bg">
            {POLYGON_DATA.map((polygon, index) => (
              <polygon key={`bg-${index}`} points={polygon.points} opacity={polygon.opacity} />
            ))}
          </g>
          <g fill="currentColor" clipPath={`url(#${clipId})`} className="gelia-logo--fluid-sparkle">
            {POLYGON_DATA.map((polygon, index) => (
              <polygon
                key={`fill-${index}`}
                points={polygon.points}
                opacity={polygon.opacity}
                style={{ '--delay': polygon.delay } as CSSProperties}
              />
            ))}
          </g>
        </>
      ) : (
        <g fill="currentColor" className={variantClass(variant)}>
          {POLYGON_DATA.map((polygon, index) => (
            <polygon
              key={index}
              points={polygon.points}
              opacity={polygon.opacity}
              style={{
                '--tx': polygon.tx,
                '--ty': polygon.ty,
                '--rot': polygon.rot,
                '--delay': polygon.delay,
              } as CSSProperties}
            />
          ))}
        </g>
      )}
    </svg>
  )
}
