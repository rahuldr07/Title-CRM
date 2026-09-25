import { use, type ComponentProps, type ReactNode } from 'react'
import { cx } from './style'
import { FieldContext } from './fieldContext'
import { nameOf, type Named } from './naming'

type Own<P> = Omit<P, 'aria-label' | 'aria-labelledby' | 'aria-invalid' | 'className' | 'type'> & { 'aria-invalid'?: boolean }

type TextType = 'text' | 'email' | 'password' | 'search' | 'number' | 'date' | 'tel' | 'color' | 'range'

export type InputProps = Own<ComponentProps<'input'>> &
  Named & {
    type?: TextType
    mono?: boolean
    bare?: boolean
    className?: string
  }

function useName(
  named: { label?: string | undefined; field?: boolean | undefined },
  id?: string,
  describedBy?: string,
  invalid?: boolean,
) {
  return nameOf(named, use(FieldContext), { id, describedBy, invalid })
}

export function Input({ label, field, mono, bare, className, id, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...rest }: InputProps) {
  const name = useName({ label, field }, id, describedBy, invalid)
  return <input className={cx(!bare && 'inp', mono && 'mono', className) || undefined} {...rest} {...name} />
}

export type TextareaProps = Own<ComponentProps<'textarea'>> & Named & { className?: string }

export function Textarea({ label, field, className, id, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...rest }: TextareaProps) {
  const name = useName({ label, field }, id, describedBy, invalid)
  return <textarea className={cx('inp', className)} {...rest} {...name} />
}

type Option<T extends string> = readonly [T, ReactNode]

export type SelectProps<T extends string> = Own<Omit<ComponentProps<'select'>, 'value' | 'onChange' | 'children'>> &
  Named & {
    value: T
    onChange: (value: T) => void
    options?: readonly Option<T>[]
    children?: ReactNode
    mono?: boolean
    className?: string
  }

export function Select<T extends string>({
  label,
  field,
  value,
  onChange,
  options,
  children,
  mono,
  className,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...rest
}: SelectProps<T>) {
  const name = useName({ label, field }, id, describedBy, invalid)
  return (
    <select
      className={cx('inp', mono && 'mono', className)}
      {...rest}
      {...name}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options
        ? options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))
        : children}
    </select>
  )
}

export type CheckProps = Own<ComponentProps<'input'>> & Named & { className?: string }

export function Checkbox({ label, field, className, id, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...rest }: CheckProps) {
  const name = useName({ label, field }, id, describedBy, invalid)
  return <input type="checkbox" className={className} {...rest} {...name} />
}

export function Radio({ label, field, className, id, 'aria-describedby': describedBy, 'aria-invalid': invalid, ...rest }: CheckProps) {
  const name = useName({ label, field }, id, describedBy, invalid)
  return <input type="radio" className={className} {...rest} {...name} />
}
