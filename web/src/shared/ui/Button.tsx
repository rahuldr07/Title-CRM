import type { ComponentProps, ReactNode } from 'react'
import { useGo } from '@/shared/hooks/useGo'
import { cx } from './style'

type BtnVariant = 'primary' | 'ghost' | 'danger'

const VARIANT: Record<BtnVariant, string> = { primary: '', ghost: ' g', danger: ' d' }

export function Btn({
  children,
  variant = 'primary',
  small,
  submit,
  className = '',
  ...rest
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  variant?: BtnVariant
  small?: boolean
  submit?: boolean
}) {
  return (
    <button
      type={submit ? 'submit' : 'button'}
      className={`btn${VARIANT[variant]}${small ? ' sm' : ''}${className ? ' ' + className : ''}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export type Spoken = { children: string | number | readonly (string | number)[]; label?: string } | { label: string; children?: ReactNode }

export type ButtonBase = Omit<ComponentProps<'button'>, 'type' | 'children' | 'aria-label'>

export const spoken = (label: string | undefined) => (label ? { 'aria-label': label } : {})

export function Press({ submit, label, ...rest }: ButtonBase & Spoken & { submit?: boolean }) {
  return <button type={submit ? 'submit' : 'button'} {...spoken(label)} {...rest} />
}

export function IconButton({ label, ...rest }: Omit<ComponentProps<'button'>, 'aria-label'> & { label: string }) {
  return <button type="button" aria-label={label} {...rest} />
}

export function LinkButton({ className, label, ...rest }: ButtonBase & Spoken) {
  return <button type="button" className={cx('lnk', className)} {...spoken(label)} {...rest} />
}

export function Pill({
  on,
  urgent,
  count,
  className,
  children,
  ...rest
}: Omit<ComponentProps<'button'>, 'aria-pressed'> & { on?: boolean; urgent?: boolean; count?: ReactNode }) {
  return (
    <button type="button" className={cx('pill', urgent && 'urg', on && 'on', className)} aria-pressed={on} {...rest}>
      {children}
      {count == null ? null : <span className="n">{count}</span>}
    </button>
  )
}

export function Parent({
  to,
  search,
  children,
}: {
  to: string
  search?: Record<string, string> | undefined
  children: ReactNode
}) {
  const navigate = useGo()
  return (
    <button type="button" className="eyebrow" onClick={() => navigate({ to, search })}>
      <i>←</i>
      {children}
    </button>
  )
}
