import { Children, Fragment, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

const flat = (children: ReactNode, prefix = ''): ReactNode[] =>
  Children.toArray(children).flatMap((c) => {
    if (!isValidElement<{ children?: ReactNode }>(c)) return [c]
    if (c.type === Fragment) return flat(c.props.children, `${prefix}${String(c.key)}`)
    return [prefix ? cloneElement(c, { key: `${prefix}${String(c.key)}` }) : c]
  })

export const labelCells = (children: ReactNode, heads: readonly string[]): ReactNode[] => {
  let col = 0
  return flat(children).map((c) => {
    if (!isValidElement(c)) return c
    const label = heads[col++]
    if (!label) return c
    return typeof c.type === 'string'
      ? cloneElement(c as ReactElement<{ 'data-label'?: string }>, { 'data-label': label })
      : cloneElement(c as ReactElement<{ label?: string }>, { label })
  })
}
