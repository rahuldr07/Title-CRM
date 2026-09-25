import type { CSSProperties } from 'react'

export type ClassPart = string | false | null | undefined

export const cx = (...parts: ClassPart[]): string => parts.filter((p): p is string => !!p).join(' ')

export interface Space {
  margin?: number | string
  top?: number
  bottom?: number
}

export const space = ({ margin, top, bottom }: Space): CSSProperties => ({
  ...(margin === undefined ? {} : { margin }),
  ...(top === undefined ? {} : { marginTop: top }),
  ...(bottom === undefined ? {} : { marginBottom: bottom }),
})

export const spaced = (s: Space, style?: CSSProperties): CSSProperties | undefined => {
  const out = { ...space(s), ...style }
  return Object.keys(out).length ? out : undefined
}

export type TextSize = 'mini' | 'eyebrow' | 'label' | 'small' | 'body' | 'lead'

export const textStyle = (size: TextSize, s: Space = {}): CSSProperties => ({ fontSize: `var(--t-${size})`, ...space(s) })
