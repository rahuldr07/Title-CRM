// eslint-disable-next-line no-restricted-imports -- the synthetic day is drawn from the seed's counties, so an order's county does not move when coverage is edited
import { COUNTIES } from '@/data/catalog'
import { PRODMIX, CLIENTMIX } from '@/data/production'
import { iso } from '@/shared/lib/format'
import { now } from '@/shared/lib/clock'
import type { TraceStep } from './narrow'

const DAYCOUNT = 5

const dayDate = (i: number) =>
  new Date(now().getFullYear(), now().getMonth(), now().getDate() - (DAYCOUNT - 1 - i))

export interface Arrival {
  id: string
  hr: number
  date: Date
  dk: string
  today: boolean
  recv: Date
  pr: string
  st: string
  cl: string
  co: string
  plan?: Record<string, string>
  trace?: TraceStep[]
}

export interface DayBucket {
  date: Date
  dk: string
  arrivals: { hr: number; orders: Arrival[] }[]
}

export function makeDay(): DayBucket[] {
  const states = ['PA', 'GA', 'CT', 'KY', 'TN', 'AK'] as const
  const cosIn: Record<string, string[]> = {}
  states.forEach((st) => {
    cosIn[st] = COUNTIES.filter((c) => c.st === st).map((c) => c.n)
  })
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17]
  const perDay = [
    [9, 10, 8, 11, 9, 8, 10, 9, 7],
    [10, 11, 9, 12, 10, 9, 11, 10, 8],
    [8, 9, 7, 10, 8, 7, 9, 8, 6],
    [11, 12, 10, 13, 11, 10, 12, 11, 9],
    [10, 11, 9, 12, 10, 9, 11, 10, 8],
  ]
  let n = 0
  const days: DayBucket[] = []
  for (let di = 0; di < DAYCOUNT; di++) {
    const date = dayDate(di)
    const arrivals: DayBucket['arrivals'] = []
    const row = perDay[di] ?? []
    hours.forEach((h, hi) => {
      const list: Arrival[] = []
      for (let i = 0; i < (row[hi] ?? 0); i++, n++) {
        const st = states[n % states.length] ?? states[0]
        const inState = cosIn[st] ?? []
        const pool = inState.length ? inState : ['—']
        list.push({
          id: `4193${String(101 + n).padStart(3, '0')}-1`,
          hr: h,
          date,
          dk: iso(date),
          today: di === DAYCOUNT - 1,
          recv: new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 0),
          pr: PRODMIX[n % PRODMIX.length] ?? '',
          st,
          cl: CLIENTMIX[n % CLIENTMIX.length] ?? '',
          co: pool[n % pool.length] ?? '—',
        })
      }
      arrivals.push({ hr: h, orders: list })
    })
    days.push({ date, dk: iso(date), arrivals })
  }
  return days
}
