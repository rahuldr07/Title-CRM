import type { CSSProperties } from 'react'
import { initials } from '@/shared/lib/format'

export function Avatar({
  name,
  self,
  title,
  onClick,
  style,
}: {
  name?: string | null
  self?: boolean
  title?: string | undefined
  onClick?: ((e: React.MouseEvent) => void) | undefined
  style?: CSSProperties
}) {
  const cls = `ava${name ? '' : ' none'}${self ? ' self' : ''}`
  const text = name ? initials(name) : '·'
  const label = title ?? name ?? 'Unassigned'
  const unnamed = name ? {} : { 'aria-label': label }
  if (onClick) {
    return (
      <button type="button" className={cls} title={label} {...unnamed} onClick={onClick} style={style}>
        {text}
      </button>
    )
  }
  return (
    <span className={cls} title={label} style={style} {...(name ? {} : { role: 'img', ...unnamed })}>
      {text}
    </span>
  )
}
