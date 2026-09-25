import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { loadQcLog, type QcEntry } from '@/data/quality'
import { useOrderState } from '@/domain/orders/orders'
import { sessionQcEntries } from '@/domain/orders/ratings'

export function useQcLog(): UseQueryResult<QcEntry[]> {
  const log = useQuery({
    queryKey: ['qc-log'],
    queryFn: loadQcLog,
    staleTime: Infinity,
    gcTime: Infinity,
  })
  useOrderState()
  const made = sessionQcEntries()
  if (!log.data || !made.length) return log
  return { ...log, data: [...log.data, ...made] }
}
