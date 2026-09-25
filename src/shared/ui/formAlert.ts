export interface Fault<K extends string = string> {
  message: string
  field: K | undefined
  n: number
}

export interface FormAlertState<K extends string = string> {
  id: string
  fault: Fault<K> | null
  fail: (message: string, field?: K) => void
  clear: () => void
  on: (field: K) => string | undefined
}

export const faulted = <K extends string>(prev: Fault<K> | null, message: string, field?: K): Fault<K> => ({
  message,
  field,
  n: (prev?.n ?? 0) + 1,
})

export const faultIdFor = <K extends string>(fault: Fault<K> | null, id: string, field: K): string | undefined =>
  fault?.field === field ? id : undefined
