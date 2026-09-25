import type { CSSProperties, ReactNode } from 'react'
import { spaced, type Space } from './style'

export function Banner({
  kind = 'b',
  icon,
  title,
  children,
  actions,
  style,
  ...s
}: Space & {
  kind?: 'b' | 'v' | 'r' | 'd' | 'n'
  icon?: string
  title?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  style?: CSSProperties
}) {
  return (
    <div className={`bnr ${kind}`} style={spaced(s, style)}>
      {icon ? <span className="bi">{icon}</span> : null}
      <div>
        {title ? <div className="bt">{title}</div> : null}
        {children}
      </div>
      {actions ? <div className="ba">{actions}</div> : null}
    </div>
  )
}

export function Assumption({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="asm">
      <span className="ai">✎</span>
      <div>
        <b className="at">{title}</b>
        {children}
      </div>
    </div>
  )
}

export function Empty({
  icon = '☰',
  children,
  action,
}: {
  icon?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="ei">{icon}</span>
      <p>{children}</p>
      {action}
    </div>
  )
}
