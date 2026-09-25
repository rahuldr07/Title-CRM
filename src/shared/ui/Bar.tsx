import type { CSSProperties, ReactNode } from 'react'

function fill(value: number, max: number) {
  return max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
}

function Fill({ value, max, color }: { value: number; max: number; color?: string | undefined }) {
  return <i style={{ width: `${fill(value, max)}%`, ...(color ? { background: color } : {}) }} />
}

export function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  return (
    <div className="bar">
      <Fill value={value} max={max} color={color} />
    </div>
  )
}

export function BarGrid({
  cols,
  gap = 12,
  padding = '6px 0',
  fontSize,
  children,
}: {
  cols: string
  gap?: number
  padding?: string
  fontSize?: string
  children: ReactNode
}) {
  return (
    <div
      className="barrow"
      style={{ '--barrow-cols': cols, '--barrow-gap': `${gap}px`, padding, ...(fontSize ? { fontSize } : {}) } as CSSProperties}
    >
      {children}
    </div>
  )
}

export function BarRow({
  cols,
  gap = 12,
  padding = '6px 0',
  label,
  labelClass = 'gr',
  value,
  max,
  color,
  title,
  budget,
  right,
  rightClass = 'mono',
  rightStyle,
}: {
  cols: string
  gap?: number
  padding?: string
  label: ReactNode
  labelClass?: string
  value: number
  max: number
  color?: string
  title?: string
  budget?: { value: number; max: number }
  right: ReactNode
  rightClass?: string
  rightStyle?: CSSProperties
}) {
  return (
    <BarGrid cols={cols} gap={gap} padding={padding}>
      <span className={labelClass || undefined}>{label}</span>
      {budget ? (
        <span style={{ position: 'relative', height: 16 }}>
          <span className="bar" style={{ position: 'absolute', inset: 0, height: 16 }}>
            <Fill value={budget.value} max={budget.max} color="var(--brandsoft)" />
          </span>
          <span
            className="bar"
            style={{ position: 'absolute', inset: '4px 0', height: 8, background: 'transparent' }}
          >
            <Fill value={value} max={max} color={color} />
          </span>
        </span>
      ) : (
        <span className="bar" title={title}>
          <Fill value={value} max={max} color={color} />
        </span>
      )}
      <span className={rightClass || undefined} style={{ textAlign: 'right', ...rightStyle }}>
        {right}
      </span>
    </BarGrid>
  )
}
