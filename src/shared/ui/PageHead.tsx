import type { ReactNode } from 'react'
import { Parent } from './Button'
import { useTitlePart } from '@/shared/hooks/useTitlePart'

export function PageHead({
  title,
  sub,
  actions,
  parent,
}: {
  title: string
  sub?: ReactNode
  actions?: ReactNode
  parent?: { to: string; label: string; search?: Record<string, string> }
}) {
  useTitlePart('page', title)
  return (
    <div className="hd">
      <div style={{ minWidth: 0 }}>
        {parent ? (
          <Parent to={parent.to} search={parent.search}>
            {parent.label}
          </Parent>
        ) : null}
        <h1 className="pg">{title}</h1>
        {sub ? <p className="sub">{sub}</p> : null}
      </div>
      {actions ? <div className="r">{actions}</div> : null}
    </div>
  )
}

export function SectionHead({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 className="sec" id={id}>
      {children}
    </h2>
  )
}

export function SecHead({ sub, actions }: { sub: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ch" style={{ border: 'none', padding: '2px 0 15px', alignItems: 'flex-start' }}>
      <div className="gr" style={{ fontSize: 'var(--t-small)', maxWidth: '70ch' }}>
        {sub}
      </div>
      {actions ? <div className="r">{actions}</div> : null}
    </div>
  )
}

export function EmbedHead({
  title,
  sub,
  actions,
}: {
  title: string
  sub?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="ch" style={{ border: 'none', padding: '2px 0 14px' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 'var(--t-h3)' }}>{title}</h2>
        {sub ? (
          <div className="gr" style={{ fontSize: 'var(--t-small)', marginTop: 3 }}>
            {sub}
          </div>
        ) : null}
      </div>
      {actions ? <div className="r">{actions}</div> : null}
    </div>
  )
}
