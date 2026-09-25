import { createContext, use, useId, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { FieldContext } from './fieldContext'
import { tabAfterKey } from './tabKeys'
import { useTitlePart } from '@/shared/hooks/useTitlePart'

const InsideTabs = createContext(false)

export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
  style,
}: {
  options: readonly (readonly [T, ReactNode])[]
  value: T
  onChange: (v: T) => void
  label?: string
  style?: CSSProperties
}) {
  const labelledBy = use(FieldContext)?.labelId
  const group = label || labelledBy ? { role: 'group', 'aria-label': label, 'aria-labelledby': labelledBy } : {}
  return (
    <div className="seg" style={style} {...group}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          className={v === value ? 'on' : ''}
          aria-pressed={v === value}
          onClick={() => onChange(v)}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  children,
}: {
  tabs: (T | [T, number | null])[]
  value: T
  onChange: (v: T) => void
  children?: ReactNode
}) {
  const base = useId()
  const list = useRef<HTMLDivElement>(null)
  const nested = use(InsideTabs)
  useTitlePart('tab', value, !nested)
  const names = tabs.map((t) => (Array.isArray(t) ? t[0] : t))
  const current = names.indexOf(value)
  const stop = current < 0 ? 0 : current
  const panel = children === undefined ? undefined : `${base}-panel`
  const tabId = (i: number) => `${base}-tab-${i}`

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = tabAfterKey(e.key, current, names.length)
    const name = next === null ? undefined : names[next]
    if (next === null || name === undefined) return
    e.preventDefault()
    list.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus()
    onChange(name)
  }

  return (
    <>
      <div className="tabs" role="tablist" ref={list} onKeyDown={onKeyDown}>
        {tabs.map((t, i) => {
          const [name, badge] = Array.isArray(t) ? t : [t, null]
          return (
            <button
              key={name}
              id={tabId(i)}
              type="button"
              role="tab"
              aria-selected={name === value}
              aria-controls={panel}
              tabIndex={i === stop ? 0 : -1}
              className={name === value ? 'on' : ''}
              onClick={() => onChange(name)}
            >
              {name}
              {badge ? <span className="bdg">{badge}</span> : null}
            </button>
          )
        })}
      </div>
      {panel ? (
        <div role="tabpanel" id={panel} aria-labelledby={current < 0 ? undefined : tabId(current)}>
          <InsideTabs value>{children}</InsideTabs>
        </div>
      ) : null}
    </>
  )
}
