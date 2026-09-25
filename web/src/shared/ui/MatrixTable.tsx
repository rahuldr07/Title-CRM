import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { cx } from './style'
import { spoken, type ButtonBase, type Spoken } from './Button'

export function MatrixTable({
  label,
  min,
  style,
  className,
  children,
}: {
  label: string
  min?: number
  style?: CSSProperties
  className?: string
  children: ReactNode
}) {
  return (
    <table
      className={cx('mat', className)}
      aria-label={label}
      style={min === undefined ? style : { minWidth: min, ...style }}
    >
      {children}
    </table>
  )
}

export function Th({
  num,
  scope = 'col',
  style,
  ...rest
}: Omit<ComponentProps<'th'>, 'scope'> & { num?: boolean; scope?: 'col' | 'row' | 'colgroup' | 'rowgroup' }) {
  return <th scope={scope} style={num ? { textAlign: 'right', ...style } : style} {...rest} />
}

export function CellButton({ style, label, ...rest }: ButtonBase & Spoken) {
  return <button type="button" style={{ font: 'inherit', color: 'inherit', ...style }} {...spoken(label)} {...rest} />
}
