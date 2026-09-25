import type { QcEntry } from '@/data/quality'
import { fmtDate } from '@/shared/lib/format'
import { qcAverage } from '@/domain/quality/quality'

export interface WeekPoint {
  from: Date
  to: Date
  avg: number | null
  n: number
}

const MAX_WEEKS = 12

export function weeklyAverages(rows: QcEntry[], from: Date, to: Date): WeekPoint[] {
  const weeks: WeekPoint[] = []
  for (
    let end = new Date(to);
    end >= from;
    end = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 7)
  ) {
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6)
    const lo = start < from ? from : start
    const list = rows.filter((x) => x.d >= lo && x.d <= end)
    weeks.unshift({
      from: lo,
      to: end,
      avg: qcAverage(list),
      n: list.length,
    })
    if (weeks.length >= MAX_WEEKS) break
  }
  return weeks
}

export const weekTick = (d: Date) => fmtDate(d).split('/').slice(0, 2).join('/')

export function linePath(points: (readonly [number, number] | null)[]): string {
  let d = ''
  let started = false
  points.forEach((p) => {
    if (!p) {
      started = false
      return
    }
    d += `${started ? 'L' : 'M'} ${p[0]} ${p[1]} `
    started = true
  })
  return d.trim()
}
