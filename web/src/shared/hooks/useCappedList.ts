import { useMemo, useState } from 'react'
import { capList, LIST_CAP, sameItems, type Capped } from '@/shared/lib/cap'

export interface CappedList<T> extends Capped<T> {
  showAll: () => void
}

export function useCappedList<T>(
  list: readonly T[],
  { cap = LIST_CAP, keyOf }: { cap?: number; keyOf?: (x: T) => unknown } = {},
): CappedList<T> {
  const [seen, setSeen] = useState(list)
  const [all, setAll] = useState(false)
  if (seen !== list && !sameItems(seen, list, keyOf)) {
    setSeen(list)
    setAll(false)
  }
  const capped = useMemo(() => capList(list, all, cap), [list, all, cap])
  return useMemo(() => ({ ...capped, showAll: () => setAll(true) }), [capped])
}
