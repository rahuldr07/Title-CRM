import { useCallback, useId, useState } from 'react'
import { faultIdFor, faulted, type Fault, type FormAlertState } from '@/shared/ui/formAlert'

export function useFormAlert<K extends string = never>(): FormAlertState<K> {
  const id = useId()
  const [fault, setFault] = useState<Fault<K> | null>(null)
  const fail = useCallback((message: string, field?: K) => setFault((prev) => faulted(prev, message, field)), [])
  const clear = useCallback(() => setFault(null), [])
  return { id, fault, fail, clear, on: (field: K) => faultIdFor(fault, id, field) }
}
