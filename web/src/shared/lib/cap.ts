export const LIST_CAP = 40

export interface Capped<T> {
  shown: T[]
  total: number
  hidden: number
}

export function capList<T>(list: readonly T[], all: boolean, cap: number = LIST_CAP): Capped<T> {
  const shown = all ? list.slice() : list.slice(0, cap)
  return { shown, total: list.length, hidden: list.length - shown.length }
}

export const sameItems = <T>(a: readonly T[], b: readonly T[], keyOf: (x: T) => unknown = (x) => x): boolean =>
  a.length === b.length && a.every((x, i) => i < b.length && keyOf(x) === keyOf(b[i] as T))
