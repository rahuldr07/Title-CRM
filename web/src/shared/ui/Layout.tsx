import type { CSSProperties, ReactNode } from 'react'
import { cx, textStyle, type Space, type TextSize } from './style'

export function Note({
  size = 'small',
  plain,
  className,
  id,
  children,
  ...s
}: Space & {
  size?: TextSize
  plain?: boolean
  className?: string
  id?: string
  children: ReactNode
}) {
  return (
    <p className={cx(!plain && 'gr', className) || undefined} id={id} style={textStyle(size, s)}>
      {children}
    </p>
  )
}

export function Inline({
  gap,
  align = 'center',
  justify,
  wrap,
  style,
  className,
  children,
}: {
  gap?: number
  align?: CSSProperties['alignItems'] | false
  justify?: CSSProperties['justifyContent']
  wrap?: boolean
  style?: CSSProperties
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        ...(wrap ? { flexWrap: 'wrap' } : {}),
        ...(align ? { alignItems: align } : {}),
        ...(justify ? { justifyContent: justify } : {}),
        ...(gap === undefined ? {} : { gap }),
        ...style,
      }}
    >
      {children}
    </div>
  )
}
