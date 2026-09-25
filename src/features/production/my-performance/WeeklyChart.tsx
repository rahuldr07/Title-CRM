import { useEffect, useRef, useState } from 'react'
import { fmtDate } from '@/shared/lib/format'
import { linePath, weekTick, type WeekPoint } from './weekly'

const CHART_H = 178

export function WeeklyChart({ weeks }: { weeks: WeekPoint[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(610)

  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const watch = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(200, Math.round(entry.contentRect.width)))
    })
    watch.observe(el)
    return () => watch.disconnect()
  }, [])

  const left = 44
  const right = width - 16
  const top = 14
  const bottom = 122
  const xOf = (i: number) => left + (i / (weeks.length - 1 || 1)) * (right - left)
  const yOf = (avg: number) => bottom - (avg / 5) * (bottom - top)
  const room = Math.max(2, Math.floor((right - left) / 58))
  const labelEvery = Math.max(1, Math.ceil(weeks.length / room))
  const tick = { fontSize: 'var(--t-mini)', fill: 'var(--ink)' }
  const axis = { fontSize: 'var(--t-mini)', fill: 'var(--ink)' }

  return (
    <div ref={box}>
      <svg
        viewBox={`0 0 ${width} ${CHART_H}`}
        width={width}
        height={CHART_H}
        role="img"
        aria-label="Your average quality score by week"
        style={{ display: 'block', maxWidth: '100%' }}
      >
        {[0, 1, 2, 3, 4, 5].map((g) => (
          <g key={g}>
            <line x1={left} x2={right} y1={yOf(g)} y2={yOf(g)} stroke="var(--hair)" strokeWidth={1} />
            <text x={left - 8} y={yOf(g) + 3.5} textAnchor="end" style={tick}>
              {g}
            </text>
          </g>
        ))}
        <line x1={left} x2={left} y1={top} y2={bottom} stroke="var(--ink)" strokeOpacity={0.4} />
        <line x1={left} x2={right} y1={bottom} y2={bottom} stroke="var(--ink)" strokeOpacity={0.4} />
        <path
          d={linePath(weeks.map((w, i) => (w.avg === null ? null : [xOf(i), yOf(w.avg)])))}
          fill="none"
          stroke="var(--brand2)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {weeks.map((w, i) =>
          w.avg === null ? null : (
            <circle key={i} cx={xOf(i)} cy={yOf(w.avg)} r={4} fill="var(--brand2)">
              <title>
                {`${fmtDate(w.from)} – ${fmtDate(w.to)}: ${w.avg.toFixed(2)} from ${w.n} check${w.n === 1 ? '' : 's'}`}
              </title>
            </circle>
          ),
        )}
        {weeks.map((w, i) =>
          i % labelEvery === 0 || i === weeks.length - 1 ? (
            <text key={i} x={xOf(i)} y={140} textAnchor="middle" style={{ ...tick, fontFamily: 'var(--mono)' }}>
              {weekTick(w.to)}
            </text>
          ) : null,
        )}
        <text x={(left + right) / 2} y={166} textAnchor="middle" style={axis}>
          Week ending
        </text>
        <text
          x={13}
          y={(top + bottom) / 2}
          textAnchor="middle"
          transform={`rotate(-90 13 ${(top + bottom) / 2})`}
          style={axis}
        >
          Average score
        </text>
      </svg>
    </div>
  )
}
