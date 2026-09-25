import type { Holiday } from '@/data/types'
import { parseUsDate } from '@/shared/lib/format'

export const greeting = (h: number) => (h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening')

export const nextHolidayFrom = (holidays: Holiday[], at: Date) =>
  holidays
    .map((h) => ({ h, dt: parseUsDate(h.d) }))
    .filter((x) => x.dt >= at)
    .sort((a, b) => +a.dt - +b.dt)[0]
