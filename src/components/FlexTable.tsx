import { Children, cloneElement, createContext, isValidElement, use, type ReactElement, type ReactNode } from 'react'

/* The column heads, so a row can name each cell for the phone layout, where the
   header row is hidden and a row reads as a card. */
const Heads = createContext<string[]>([])

export function FlexTable({
  cols,
  min,
  head,
  children,
  id,
}: {
  cols: string
  min: number
  head: string[]
  children: ReactNode
  id?: string
}) {
  return (
    <div className="card" id={id}>
      <div className="tsc">
        <div style={{ minWidth: min }}>
          <div className="trow h" style={{ gridTemplateColumns: cols }}>
            {head.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          <div className="tb">
            <Heads value={head}>{children}</Heads>
          </div>
        </div>
      </div>
    </div>
  )
}

export function FlexRow({
  cols,
  children,
  onClick,
}: {
  cols: string
  children: ReactNode
  onClick?: () => void
}) {
  const heads = use(Heads)
  /* Conditional cells render as null and are dropped here, as they are from the
     head, so the two stay aligned. */
  const cells = Children.toArray(children).map((c, i) =>
    isValidElement(c) && c.type === Cell ? cloneElement(c as ReactElement<CellProps>, { label: heads[i] }) : c,
  )
  return (
    <div
      className="trow"
      style={{ gridTemplateColumns: cols, cursor: onClick ? 'pointer' : undefined }}
      {...(onClick
        ? {
            role: 'button',
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            },
          }
        : {})}
    >
      {cells}
    </div>
  )
}

interface CellProps {
  v?: ReactNode
  s?: ReactNode
  mono?: boolean
  tone?: 'ok' | 'warn' | 'bad' | 'gr' | undefined
  label?: string | undefined
  children?: ReactNode
}

export function Cell({
  v,
  s,
  mono,
  tone,
  label,
  children,
}: CellProps) {
  return (
    <div className="cell" data-label={label}>
      {children ?? (
        <>
          <div
            className={`v${mono ? ' mono' : ''}${tone ? ' ' + tone : ''}`}
            style={{ fontSize: 'var(--t-small)' }}
          >
            {v}
          </div>
          {s ? <div className="s">{s}</div> : null}
        </>
      )}
    </div>
  )
}
