import { isValidElement, useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react'
import { Banner } from './Banner'
import { FieldContext } from './fieldContext'
import type { FormAlertState } from './formAlert'
import { bindingOf, type FieldRole } from './naming'
import { cx, type Space } from './style'

export function Form({
  onSubmit,
  children,
  id,
  className,
  style,
}: {
  onSubmit: () => void
  children: ReactNode
  id?: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <form
      noValidate
      id={id}
      className={className}
      style={style}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      {children}
    </form>
  )
}

export function Fields({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="frm" style={style}>
      {children}
    </div>
  )
}

export function FormAlert({
  alert,
  title,
  ...space
}: { alert: Pick<FormAlertState, 'id' | 'fault'>; title?: ReactNode } & Space) {
  const box = useRef<HTMLDivElement>(null)
  const n = alert.fault?.n
  useEffect(() => {
    if (n) box.current?.focus()
  }, [n])
  if (!alert.fault) return null
  return (
    <div id={alert.id} ref={box} role="alert" tabIndex={-1}>
      <Banner kind="d" icon="⚑" title={title} {...space}>
        {alert.fault.message}
      </Banner>
    </div>
  )
}

export type FieldLayout = 'field' | 'bare' | 'wrap'

export function Field({
  label,
  hint,
  children,
  id: given,
  wide,
  as = 'control',
  layout = 'field',
  className,
  style,
  error,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string | undefined
  children: ReactNode
  id?: string
  wide?: boolean
  as?: FieldRole
  layout?: FieldLayout
  className?: string
  style?: CSSProperties
}) {
  const auto = useId()
  const own = isValidElement<{ id?: unknown }>(children) && typeof children.props.id === 'string' ? children.props.id : undefined
  const id = own ?? given ?? auto
  const hintId = hint && layout === 'field' ? `${id}-hint` : undefined
  const binding = bindingOf(as, layout === 'wrap', id, hintId, error)
  const tag = as === 'control' && layout !== 'wrap' ? { htmlFor: id } : as === 'group' ? { id } : {}

  if (layout === 'wrap') {
    return (
      <FieldContext value={binding}>
        <label className={className} style={style}>
          {children}
          {label}
        </label>
      </FieldContext>
    )
  }
  if (layout === 'bare') {
    return (
      <FieldContext value={binding}>
        <label className={className} style={style} {...tag}>
          {label}
        </label>
        {children}
      </FieldContext>
    )
  }
  return (
    <FieldContext value={binding}>
      <div className={cx('fld', className)} style={wide ? { gridColumn: '1/-1', ...style } : style}>
        <label {...tag}>{label}</label>
        {children}
        {hint ? (
          <div className="hint" id={hintId}>
            {hint}
          </div>
        ) : null}
      </div>
    </FieldContext>
  )
}

export function ReadOnly({ children }: { children: ReactNode }) {
  return <div className="ro">{children}</div>
}

export function FormActions({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end', marginTop: 18 }}>
      {children}
    </div>
  )
}
