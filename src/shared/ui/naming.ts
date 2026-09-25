import type { FieldBinding } from './fieldContext'

export type Named = { label: string; field?: boolean } | { field: true; label?: string }

export interface NameAttrs {
  id: string | undefined
  'aria-label': string | undefined
  'aria-labelledby': string | undefined
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

export const OUTSIDE_FIELD = 'A control marked `field` is named by its <Field>, so it must sit inside one.'

export function nameOf(
  named: { label?: string | undefined; field?: boolean | undefined },
  binding: FieldBinding | null,
  own: { id?: string | undefined; describedBy?: string | undefined; invalid?: boolean | undefined } = {},
): NameAttrs {
  if (named.field && !binding) throw new Error(OUTSIDE_FIELD)
  const bound = named.field ? binding : null
  return {
    id: own.id ?? bound?.id,
    'aria-label': named.label,
    'aria-labelledby': bound?.labelId,
    'aria-describedby': own.describedBy ?? bound?.describedBy,
    'aria-invalid': own.invalid || bound?.invalid || undefined,
  }
}

export type FieldRole = 'control' | 'group' | 'text'

const joinIds = (...ids: (string | undefined)[]): string | undefined => ids.filter(Boolean).join(' ') || undefined

export function bindingOf(as: FieldRole, wraps: boolean, id: string, hintId?: string, errorId?: string): FieldBinding {
  if (as === 'text') return {}
  const fault = errorId ? { invalid: true } : {}
  if (wraps) return errorId ? { describedBy: errorId, ...fault } : {}
  const describedBy = joinIds(hintId, errorId)
  if (as === 'group') return { labelId: id, describedBy, ...fault }
  return { id, describedBy, ...fault }
}
