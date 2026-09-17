import { useId } from 'react'
import { Chip } from '@/components/ui'
import type { ScoreBand } from '@/lib/quality'

const SIZE = 172
const STROKE = 15
const C = SIZE / 2
const R = C - STROKE / 2 - 6
const LENGTH = 2 * Math.PI * R
const TICKS = 80

/* The untaken part of the ring is drawn as ticks rather than a solid track,
   so an empty ring still reads as a dial with nothing on it yet. A tick that
   would sit under the progress arc's rounded end is left out, or it pokes out
   past the cap. */
const tickClear = (i: number, pct: number) => {
  const deg = (i / TICKS) * 360
  const cap = ((STROKE / 2 + 2) / R) * (180 / Math.PI)
  return pct > 0 && deg <= pct * 3.6 + cap
}

function Bolt({ className }: { className: string }) {
  return (
    <svg width={16} height={22} viewBox="0 0 16 22" aria-hidden="true" className={className}>
      <path d="M9.6 0 0 12.6h6.3L5.2 22 16 8.6H9.4L9.6 0Z" fill="currentColor" />
    </svg>
  )
}

/** A full-circle progress ring with the band's figure and word in the middle. */
export function ScoreRing({ band, label }: { band: ScoreBand | null; label: string }) {
  /* React's ids carry characters that are not valid inside `url(#…)`. */
  const gradient = `ring${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const pct = band?.pct ?? 0
  const tone = band?.tone ?? 'ok'

  return (
    <div
      role="img"
      aria-label={label}
      style={{ position: 'relative', width: SIZE, height: SIZE, margin: '6px auto 12px' }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: `color-mix(in srgb, var(--${tone}) 45%, white)` }} />
            <stop offset="1" style={{ stopColor: `var(--${tone})` }} />
          </linearGradient>
        </defs>
        {Array.from({ length: TICKS }, (_, i) =>
          tickClear(i, pct) ? null : (
            <line
              key={i}
              x1={C}
              y1={C - R - STROKE / 2 + 3}
              x2={C}
              y2={C - R + STROKE / 2 - 3}
              stroke="var(--ink)"
              strokeOpacity={0.22}
              strokeWidth={1.2}
              strokeLinecap="round"
              transform={`rotate(${(i / TICKS) * 360} ${C} ${C})`}
            />
          ),
        )}
        {pct > 0 ? (
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke={`url(#${gradient})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${(LENGTH * pct) / 100} ${LENGTH}`}
            transform={`rotate(-90 ${C} ${C})`}
            style={{
              filter: `drop-shadow(0 3px 6px color-mix(in srgb, var(--${tone}) 35%, transparent))`,
            }}
          />
        ) : null}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        <Bolt className={band ? tone : ''} />
        <div
          style={{
            fontSize: 'var(--t-display)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {band ? `${band.pct}%` : '—'}
        </div>
        {band ? (
          <Chip kind={band.chip} plain>
            {band.label}
          </Chip>
        ) : null}
      </div>
    </div>
  )
}
