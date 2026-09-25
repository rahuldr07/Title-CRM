import type { CSSProperties, ReactNode } from 'react'
import { spaced, type Space } from './style'

export function Card({
  children,
  padded,
  className = '',
  style,
  id,
  ...s
}: Space & {
  children: ReactNode
  padded?: boolean
  className?: string
  style?: CSSProperties
  id?: string
}) {
  return (
    <div id={id} className={`card${padded ? ' p' : ''}${className ? ' ' + className : ''}`} style={spaced(s, style)}>
      {children}
    </div>
  )
}

export function CardHead({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ch">
      {typeof title === 'string' ? <h2>{title}</h2> : title}
      {actions ? <div className="r">{actions}</div> : null}
    </div>
  )
}

export function CardBody({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="cb" style={style}>
      {children}
    </div>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="lb">{children}</div>
}
