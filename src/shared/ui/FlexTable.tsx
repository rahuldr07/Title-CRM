import { createContext, use, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import { pressable } from './pressable'
import { labelCells } from './labelCells'

interface Frame {
  heads: readonly string[]
  cols: string
}

const Frame = createContext<Frame>({ heads: [], cols: '' })

type DivProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onClick'>

const withClass = (base: string, extra: string | undefined) => (extra ? `${base} ${extra}` : base)

export interface FlexTableProps extends DivProps {
  cols: string
  min: number
  head: readonly string[]
  children: ReactNode
  wrap?: 'card' | 'tbl' | 'none'
  bodyRef?: Ref<HTMLDivElement>
}

export function FlexTable({
  cols,
  min,
  head,
  children,
  wrap = 'card',
  bodyRef,
  className,
  ...rest
}: FlexTableProps) {
  const grid = (
    <div style={{ minWidth: min }}>
      <div className="trow h" style={{ gridTemplateColumns: cols }}>
        {head.map((h, i) => (
          <span key={`${i}-${h}`}>{h}</span>
        ))}
      </div>
      <div className="tb" ref={bodyRef}>
        <Frame value={{ heads: head, cols }}>{children}</Frame>
      </div>
    </div>
  )
  if (wrap === 'none') {
    return (
      <div {...rest} className={withClass('tsc', className)}>
        {grid}
      </div>
    )
  }
  return (
    <div {...rest} className={withClass(wrap, className)}>
      <div className="tsc">{grid}</div>
    </div>
  )
}

export interface FlexRowProps extends DivProps {
  cols?: string | undefined
  children: ReactNode
  onClick?: (() => void) | undefined
  total?: boolean
  whole?: boolean
}

export function FlexRow({ cols, children, onClick, total, whole, className, style, ...rest }: FlexRowProps) {
  const frame = use(Frame)
  return (
    <div
      {...rest}
      className={withClass('trow', className)}
      style={{
        gridTemplateColumns: whole ? '1fr' : (cols ?? frame.cols),
        ...(onClick ? { cursor: 'pointer' } : {}),
        ...(total ? { background: 'var(--tint)' } : {}),
        ...style,
      }}
      {...(onClick ? pressable(onClick) : {})}
    >
      {whole ? children : labelCells(children, frame.heads)}
    </div>
  )
}

interface CellProps extends DivProps {
  v?: ReactNode
  s?: ReactNode
  mono?: boolean
  tone?: 'ok' | 'warn' | 'bad' | 'gr' | undefined
  label?: string | undefined
  children?: ReactNode
  onClick?: HTMLAttributes<HTMLDivElement>['onClick']
}

export function Cell({ v, s, mono, tone, label, children, className, ...rest }: CellProps) {
  const empty = children == null && v == null && s == null
  return (
    <div {...rest} className={withClass('cell', className)} data-label={empty || !label ? undefined : label}>
      {empty
        ? null
        : (children ?? (
            <>
              <div
                className={`v${mono ? ' mono' : ''}${tone ? ' ' + tone : ''}`}
                style={{ fontSize: 'var(--t-small)' }}
              >
                {v}
              </div>
              {s ? <div className="s">{s}</div> : null}
            </>
          ))}
    </div>
  )
}
