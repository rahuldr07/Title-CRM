import type { CSSProperties, ReactNode } from 'react'

export function KeyValues({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="kv">
      {rows.map(([k, v], i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

export interface TimelineEntry {
  id: string
  when: ReactNode
  who: ReactNode
  what: ReactNode
  current?: boolean
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <div className="tl">
      {entries.map((e) => (
        <div className={`tl-e${e.current ? ' on' : ''}`} key={e.id}>
          <div className="tl-when">{e.when}</div>
          <div className="tl-body">
            <div className="tl-who">{e.who}</div>
            <div className="tl-what">{e.what}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function DetailRow({
  label,
  value,
  last,
  gap,
  padding = '7px 0',
  center,
  labelClass = 'gr',
}: {
  label: ReactNode
  value: ReactNode
  last?: boolean
  gap?: number
  padding?: string
  center?: boolean
  labelClass?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        ...(center ? { alignItems: 'center' } : {}),
        ...(gap === undefined ? {} : { gap }),
        padding,
        fontSize: 'var(--t-body)',
        ...(last ? {} : { borderBottom: '1px solid var(--hair)' }),
      }}
    >
      <span className={labelClass || undefined}>{label}</span>
      <span style={{ textAlign: 'right', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

export function DetailList({ rows, gap }: { rows: [string, ReactNode][]; gap?: number }) {
  return (
    <>
      {rows.map(([label, value]) => (
        <DetailRow key={label} label={label} value={value} {...(gap === undefined ? {} : { gap })} />
      ))}
    </>
  )
}

const BARE: CSSProperties = { border: 'none', borderRadius: 0 }

export function Rows({
  children,
  bare,
  style,
}: {
  children: ReactNode
  bare?: boolean
  style?: CSSProperties
}) {
  return (
    <div className="rows" style={bare ? { ...BARE, ...style } : style}>
      {children}
    </div>
  )
}

export function Row({
  icon,
  title,
  detail,
  right,
  onClick,
}: {
  icon?: ReactNode
  title: ReactNode
  detail?: ReactNode
  right?: ReactNode
  onClick?: () => void
}) {
  const inner = (
    <>
      <span>{icon}</span>
      <span>
        <b>{title}</b>
        {detail ? <div className="sd">{detail}</div> : null}
      </span>
      <span>{right}</span>
    </>
  )
  return onClick ? (
    <button type="button" className="rw" style={{ width: '100%' }} onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className="rw">{inner}</div>
  )
}
