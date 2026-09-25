import { useSyncExternalStore } from 'react'
import { currentDateFormat, onDateFormat, type DateFormat } from '@/shared/lib/format'

export const useDateFormat = (): DateFormat => useSyncExternalStore(onDateFormat, currentDateFormat, currentDateFormat)
