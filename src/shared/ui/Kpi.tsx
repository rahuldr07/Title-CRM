import type { CSSProperties, ReactNode } from 'react'
import { pressable } from './pressable'

export function Kpis({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="kpis" style={style}>
      {children}
    </div>
  )
}

export function Kpi({
  title,
  value,
  valueTone,
  valueSize,
  detail,
  detailTone,
  tone,
  icon,
  hint,
  onClick,
  selected,
  flat,
  chevron,
}: {
  title: string
  value: ReactNode
  valueTone?: 'ok' | 'warn' | 'bad' | undefined
  valueSize?: number | string
  detail?: ReactNode
  detailTone?: 'ok' | 'warn' | 'bad'
  tone?: 'alert' | 'warn' | undefined
  icon?: string
  hint?: string
  onClick?: (() => void) | undefined
  selected?: boolean
  flat?: boolean
  chevron?: boolean
}) {
  const cls = [
    'kpi',
    tone === 'alert' ? 'alert' : tone === 'warn' ? 'warnk' : '',
    flat ? 'stat' : '',
    selected ? 'sel' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const interactive = onClick
    ? {
        ...pressable(onClick),
        title: hint,
        ...(selected === undefined ? {} : { 'aria-pressed': selected }),
      }
    : {}

  return (
    <div className={cls} {...interactive}>
      <div className="t">
        {title}
        {chevron ? (
          <>
            {icon ? (
              <span aria-hidden="true" style={{ opacity: 0.7 }}>
                {icon}
              </span>
            ) : null}
            {onClick ? (
              <span className="i" aria-hidden="true">
                ›
              </span>
            ) : null}
          </>
        ) : icon ? (
          <span className="i">{icon}</span>
        ) : null}
      </div>
      <div
        className={`v${valueTone ? ' ' + valueTone : ''}`}
        style={
          valueSize
            ? { fontSize: `min(${typeof valueSize === 'number' ? `${valueSize}px` : valueSize}, 13cqi)` }
            : undefined
        }
      >
        {value}
      </div>
      {detail ? <div className={`d ${detailTone ?? 'gr'}`}>{detail}</div> : null}
    </div>
  )
}
